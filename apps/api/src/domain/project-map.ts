import {type BlockedMeaning, onlyChange} from './meaning.js';

export interface SourceFile {
  path: string;
  text: string;
}

export interface FlowNode {
  name: string;
  role: string;
  changed: boolean;
}

export interface FlowRoute {
  name: string;
  changed: boolean;
  columns: FlowNode[][];
}

export interface OpenMap {
  status: 'open';
  change: string;
  routes: FlowRoute[];
}

export type ProjectMap = BlockedMeaning | OpenMap;

interface Route {
  method: string;
  path: string;
}

export function codePaths(tree: readonly string[]): string[] {
  return tree.filter(isSource).sort();
}

const flowOrder = ['handler', 'service', 'usecase', 'helper', 'adapter'];

export function projectMap(
  paths: readonly string[],
  patches: readonly string[],
  files: readonly SourceFile[],
  specs: readonly string[],
): ProjectMap {
  const change = onlyChange(paths);

  if ('status' in change) {
    return change;
  }

  return {
    status: 'open',
    change: change.name,
    routes: routeNodes(paths, files, addedLines(patches), specs),
  };
}

function routeNodes(
  paths: readonly string[],
  files: readonly SourceFile[],
  added: readonly string[],
  specs: readonly string[],
): FlowRoute[] {
  const found = new Map<string, {route: Route; file: string}>();
  const sorted = [...files].sort((left, right) => compareNames(left.path, right.path));

  for (const file of sorted) {
    for (const route of readRoutes(file.text)) {
      const name = routeName(route);

      if (!found.has(name)) {
        found.set(name, {route, file: file.path});
      }
    }
  }

  const changed = new Set(paths);

  return [...found.values()]
    .sort((left, right) => compareNames(routeName(left.route), routeName(right.route)))
    .map(({route, file}) => ({
      name: routeName(route),
      changed: routeTouched(route, added, specs),
      columns: flowColumns(file, files, changed),
    }));
}

function readRoutes(text: string): Route[] {
  const routes: Route[] = [];
  const routeCall = /\.(get|post|put|patch|delete|head|options)\(\s*(['"`])(\/[^'"`]*)\2/gi;

  for (const match of text.matchAll(routeCall)) {
    const method = match[1]?.toUpperCase();
    const path = match[3];

    if (method && path) {
      routes.push({method, path});
    }
  }

  return routes;
}

function routeTouched(route: Route, added: readonly string[], specs: readonly string[]): boolean {
  if (added.some((line) => lineRegisters(line, route))) {
    return true;
  }

  return specs.some((spec) => specNames(spec, route));
}

function lineRegisters(line: string, route: Route): boolean {
  const call = `.${route.method.toLowerCase()}(`;

  if (!line.toLowerCase().includes(call)) {
    return false;
  }

  return line.includes(`'${route.path}'`) || line.includes(`"${route.path}"`) || line.includes(`\`${route.path}\``);
}

function specNames(spec: string, route: Route): boolean {
  const named = routeName(route);
  let from = 0;

  while (from < spec.length) {
    const at = spec.indexOf(named, from);

    if (at === -1) {
      return false;
    }

    const next = spec[at + named.length];

    if (next !== '/' && next !== ':') {
      return true;
    }

    from = at + named.length;
  }

  return false;
}

function addedLines(patches: readonly string[]): string[] {
  const lines: string[] = [];

  for (const patch of patches) {
    for (const line of patch.split(/\r?\n/)) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        lines.push(line.slice(1));
      }
    }
  }

  return lines;
}

function routeName(route: Route): string {
  return `${route.method} ${route.path}`;
}

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function flowColumns(start: string, files: readonly SourceFile[], changed: ReadonlySet<string>): FlowNode[][] {
  const role = roleOf(start);

  if (!role || !flowOrder.includes(role)) {
    return [];
  }

  const byPath = new Map(files.map((file) => [file.path, file]));
  const seen = new Set<string>();
  const queue = [start];
  const drawn = new Map<string, FlowNode & {role: string}>();
  const ports = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || seen.has(current)) {
      continue;
    }

    seen.add(current);
    const file = byPath.get(current);

    if (!file) {
      continue;
    }

    const currentRole = roleOf(current);

    if (currentRole === 'port') {
      ports.add(current);
    } else if (currentRole && flowOrder.includes(currentRole)) {
      drawn.set(current, stepNode(file, currentRole, changed));
    }

    for (const next of localImports(file, byPath)) {
      if (roleOf(next)) {
        queue.push(next);
      }
    }
  }

  for (const file of files) {
    if (roleOf(file.path) !== 'adapter' || drawn.has(file.path)) {
      continue;
    }

    if (localImports(file, byPath).some((path) => ports.has(path))) {
      drawn.set(file.path, stepNode(file, 'adapter', changed));
    }
  }

  return flowOrder
    .map((stepRole) =>
      [...drawn.values()]
        .filter((node) => node.role === stepRole)
        .sort((left, right) => compareNames(left.name, right.name))
        .map(({name, role, changed: nodeChanged}) => ({name, role, changed: nodeChanged})),
    )
    .filter((column) => column.length > 0);
}

function stepNode(file: SourceFile, role: string, changed: ReadonlySet<string>): FlowNode & {role: string} {
  return {name: stepName(file.path), role, changed: changed.has(file.path)};
}

function localImports(file: SourceFile, files: ReadonlyMap<string, SourceFile>): string[] {
  const dir = file.path.split('/').slice(0, -1);
  const specs = [...file.text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((match) => match[1] ?? '');

  return specs.flatMap((spec) => {
    const parts = [...dir];

    for (const segment of spec.split('/')) {
      if (segment === '.' || segment.length === 0) {
        continue;
      }

      if (segment === '..') {
        parts.pop();
      } else {
        parts.push(segment);
      }
    }

    const joined = parts.join('/');
    const candidates = [joined, `${joined}.ts`, `${joined}.js`, `${joined}/index.ts`, `${joined}/index.js`];
    const hit = candidates.find((candidate) => files.has(candidate));

    return hit ? [hit] : [];
  });
}

function roleOf(path: string): string | null {
  const file = path.split('/').pop() ?? '';

  if (file.endsWith('.port.ts') || file.endsWith('.port.js')) {
    return 'port';
  }

  for (const part of path.split('/')) {
    const name = part.toLowerCase();

    if (name === 'http' || name === 'handlers' || name === 'handler' || name === 'controllers' || name === 'controller') {
      return 'handler';
    }

    if (name === 'services' || name === 'service') {
      return 'service';
    }

    if (name === 'usecases' || name === 'usecase' || name === 'use-cases' || name === 'use-case') {
      return 'usecase';
    }

    if (name === 'helpers' || name === 'helper' || name === 'utils' || name === 'util') {
      return 'helper';
    }

    if (name === 'adapters' || name === 'adapter') {
      return 'adapter';
    }

    if (name === 'domain') {
      return 'domain';
    }
  }

  return null;
}

function stepName(path: string): string {
  const file = path.split('/').pop() ?? path;

  return file.replace(/\.port\.(ts|js)$/, '').replace(/\.(ts|js)$/, '');
}

function isSource(path: string): boolean {
  if (path.startsWith('.') || path.includes('/.') || path.includes('node_modules/')) {
    return false;
  }

  return path.endsWith('.ts') || path.endsWith('.js');
}
