import {type ChangeMap, changeMap,type ChangeSpec} from '../../domain/change-map.js';
import {changeFile, changeSkipsSpecs, onlyChange, specPaths} from '../../domain/meaning.js';

import {type ChangeTree, type PullChangeSource, PullChangeSourceError} from './pull-change.port.js';

export class PullChangeNotFound extends Error {}

export class PullChangeFailed extends Error {}

export async function pullChange(source: PullChangeSource, number: number): Promise<ChangeMap> {
  try {
    const project = await source.read(number);

    if (!project) {
      throw new PullChangeNotFound();
    }

    const change = onlyChange(project.paths);

    if ('status' in change) {
      return change;
    }

    const specList = specPaths(change.root, project.paths);
    const [proposal, design, tasks, yaml, deltas] = await Promise.all([
      project.read(changeFile(change.root, 'proposal.md')),
      project.read(changeFile(change.root, 'design.md')),
      project.read(changeFile(change.root, 'tasks.md')),
      project.read(changeFile(change.root, '.openspec.yaml')),
      readDeltas(project, change.root, specList),
    ]);
    const current = await readCurrent(project, deltas);

    return changeMap({
      change: change.name,
      skipSpecs: yaml !== null && changeSkipsSpecs(yaml),
      proposal,
      design,
      tasks,
      deltas,
      current,
      files: project.files.filter((file) => !file.path.startsWith(`${change.root}/`)),
    });
  } catch (error) {
    if (error instanceof PullChangeNotFound) {
      throw error;
    }

    if (error instanceof PullChangeSourceError) {
      throw new PullChangeFailed(error.message);
    }

    throw error;
  }
}

async function readDeltas(project: ChangeTree, root: string, paths: readonly string[]): Promise<ChangeSpec[]> {
  const specs: ChangeSpec[] = [];

  for (const path of paths) {
    const capability = capabilityName(root, path);
    const text = await project.read(path);

    if (capability === null || text === null) {
      continue;
    }

    specs.push({capability, text});
  }

  return specs;
}

async function readCurrent(project: ChangeTree, deltas: readonly ChangeSpec[]): Promise<ChangeSpec[]> {
  const names: string[] = [];

  for (const delta of deltas) {
    if (!names.includes(delta.capability)) {
      names.push(delta.capability);
    }
  }

  const specs: ChangeSpec[] = [];

  for (const capability of names) {
    const text = await project.readBase(`openspec/specs/${capability}/spec.md`);

    if (text !== null) {
      specs.push({capability, text});
    }
  }

  return specs;
}

function capabilityName(root: string, path: string): string | null {
  const prefix = `${root}/specs/`;
  const suffix = '/spec.md';

  if (!path.startsWith(prefix) || !path.endsWith(suffix)) {
    return null;
  }

  const name = path.slice(prefix.length, path.length - suffix.length);

  if (name.length === 0 || name.split('/').some((segment) => segment.length === 0)) {
    return null;
  }

  return name;
}
