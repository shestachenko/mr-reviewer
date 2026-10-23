import type {BlockedMeaning} from './meaning.js';

export interface ChangeSpec {
  capability: string;
  text: string;
}

export interface ChangeFile {
  path: string;
  previous: string | null;
}

export interface ChangeInput {
  change: string;
  skipSpecs: boolean;
  proposal: string | null;
  design: string | null;
  tasks: string | null;
  deltas: readonly ChangeSpec[];
  current: readonly ChangeSpec[];
  files: readonly ChangeFile[];
}

export interface ChangeNode {
  id: string;
  name: string;
  role: string;
  mark: string;
  quote: string;
}

export interface ChangeLink {
  from: string;
  to: string;
}

export interface OpenChangeMap {
  status: 'open';
  change: string;
  nodes: ChangeNode[];
  links: ChangeLink[];
}

export type ChangeMap = BlockedMeaning | OpenChangeMap;

type RequirementKind = 'added' | 'modified' | 'removed' | 'renamed';

interface Scenario {
  name: string;
  text: string;
}

interface Step {
  id: string;
  capability: string;
  name: string;
  role: string;
  mark: string;
  quote: string;
  files: string[];
}

interface Decision {
  id: string;
  title: string;
  text: string;
  targets: string[];
  files: string[];
}

interface TaskItem {
  heading: string | null;
  text: string;
  title: string;
}

interface ParsedRequirement {
  kind: RequirementKind;
  name: string;
  text: string;
  scenarios: Scenario[];
  reason: string | null;
  migration: string | null;
}

interface RequirementDraft {
  kind: RequirementKind | null;
  current: ParsedRequirement | null;
  scenario: Scenario | null;
  lines: string[];
  requirements: ParsedRequirement[];
}

const nameLimit = 32;

export function changeMap(input: ChangeInput): OpenChangeMap {
  const impact = [markdownSection(input.proposal, 'Impact'), markdownSection(input.design, 'Impact')]
    .filter((text) => text !== null)
    .join('\n');
  const decisions = readDecisions(input.design);
  const steps = input.skipSpecs ? taskSteps(input, impact) : requirementSteps(input, impact);

  return linkGraph(input.change, input.skipSpecs, steps, decisions, input.files);
}

function requirementSteps(input: ChangeInput, impact: string): Step[] {
  const items = taskItems(input.tasks);
  const steps: Step[] = [];

  for (const delta of input.deltas) {
    const current = input.current.find((spec) => spec.capability === delta.capability) ?? null;

    for (const requirement of parseDelta(delta.text)) {
      const prior = requirement.kind === 'modified' ? namedBody(current?.text ?? null, requirement.name) : null;
      const files = filesForRequirement(requirement, items, impact, input.files);

      steps.push({
        id: `requirement:${delta.capability}:${requirement.kind}:${requirement.name}`,
        capability: delta.capability,
        name: requirement.name,
        role: requirement.kind,
        mark: requirementMark(requirement, prior),
        quote: requirementQuote(requirement, prior),
        files,
      });
    }
  }

  return steps;
}

function taskSteps(input: ChangeInput, impact: string): Step[] {
  return taskItems(input.tasks).map((item, index) => {
    const files = filesForTask(item, impact, input.files);

    return {
      id: `task:${String(index)}`,
      capability: input.change,
      name: item.title,
      role: 'task',
      mark: snippet(item.title),
      quote: item.text,
      files,
    };
  });
}

function linkGraph(
  change: string,
  skipSpecs: boolean,
  steps: readonly Step[],
  decisions: readonly {title: string; text: string}[],
  files: readonly ChangeFile[],
): OpenChangeMap {
  const nodes: ChangeNode[] = [];
  const links: ChangeLink[] = [];
  const linked = decisions.map((decision, index) => ({
    id: `decision:${String(index)}`,
    title: decision.title,
    text: decision.text,
    targets: decisionTargets(decision, steps),
    files: mentionedFiles(`${decision.title}\n${decision.text}`, files),
  }));

  if (steps.length === 0) {
    const only = decisionsOnly(change, skipSpecs, linked);

    return {status: 'open', change, nodes: only.nodes, links: only.links};
  }

  const seenDecisions = new Set<string>();
  const seenFiles = new Set<string>();

  for (const capability of capabilitiesOf(steps)) {
    const group = steps.filter((step) => step.capability === capability);
    const rootId = skipSpecs ? 'tasks' : `capability:${capability}`;
    nodes.push({
      id: rootId,
      name: capability,
      role: skipSpecs ? 'tasks' : 'capability',
      mark: '',
      quote: capability,
    });

    for (const decision of linked) {
      const namedHere = decision.targets.some((id) => group.some((step) => step.id === id));
      const wholeChange = decision.targets.length === 0 && !seenDecisions.has(decision.id);

      if (!namedHere && !wholeChange) {
        continue;
      }

      if (!seenDecisions.has(decision.id)) {
        seenDecisions.add(decision.id);
        nodes.push(decisionNode(decision));
        linkFiles(nodes, links, seenFiles, decision.id, decision.files, steps, linked);
      }

      links.push({from: rootId, to: decision.id});
    }

    for (const step of group) {
      nodes.push({id: step.id, name: step.name, role: step.role, mark: step.mark, quote: step.quote});
      linkStep(links, rootId, step, linked);

      linkFiles(nodes, links, seenFiles, step.id, step.files, steps, linked);
    }
  }

  return {status: 'open', change, nodes, links};
}

function decisionsOnly(
  change: string,
  skipSpecs: boolean,
  decisions: readonly Decision[],
): {nodes: ChangeNode[]; links: ChangeLink[]} {
  if (decisions.length === 0) {
    return {nodes: [], links: []};
  }

  const rootId = skipSpecs ? 'tasks' : `capability:${change}`;
  const nodes: ChangeNode[] = [
    {id: rootId, name: change, role: skipSpecs ? 'tasks' : 'capability', mark: '', quote: change},
  ];
  const links: ChangeLink[] = [];
  const seenFiles = new Set<string>();

  for (const decision of decisions) {
    nodes.push(decisionNode(decision));
    links.push({from: rootId, to: decision.id});
    linkFiles(nodes, links, seenFiles, decision.id, decision.files, [], decisions);
  }

  return {nodes, links};
}

function decisionNode(decision: Decision): ChangeNode {
  return {
    id: decision.id,
    name: decision.title,
    role: 'decision',
    mark: snippet(decision.text),
    quote: decision.text.length > 0 ? `${decision.title}\n\n${decision.text}` : decision.title,
  };
}

function linkStep(links: ChangeLink[], rootId: string, step: Step, decisions: readonly Decision[]): void {
  const incoming = decisions.filter((decision) => decision.targets.includes(step.id));

  if (incoming.length === 0) {
    links.push({from: rootId, to: step.id});

    return;
  }

  for (const decision of incoming) {
    links.push({from: decision.id, to: step.id});
  }
}

function capabilitiesOf(steps: readonly Step[]): string[] {
  const names: string[] = [];

  for (const step of steps) {
    if (!names.includes(step.capability)) {
      names.push(step.capability);
    }
  }

  return names;
}

function decisionTargets(decision: {title: string; text: string}, steps: readonly Step[]): string[] {
  const text = `${decision.title}\n${decision.text}`;
  const named = steps.filter((step) => mentions(text, step.name));

  if (named.length > 0) {
    return named.map((step) => step.id);
  }

  return [];
}

function fileRole(path: string, steps: readonly Step[], decisions: readonly Decision[]): 'file' | 'shared' {
  const count =
    steps.filter((step) => step.files.includes(path)).length +
    decisions.filter((decision) => decision.files.includes(path)).length;

  return count > 1 ? 'shared' : 'file';
}

function linkFiles(
  nodes: ChangeNode[],
  links: ChangeLink[],
  seen: Set<string>,
  from: string,
  paths: readonly string[],
  steps: readonly Step[],
  decisions: readonly Decision[],
): void {
  for (const path of paths) {
    const fileId = `file:${path}`;

    if (!seen.has(path)) {
      seen.add(path);
      nodes.push({id: fileId, name: path, role: fileRole(path, steps, decisions), mark: '', quote: path});
    }

    links.push({from, to: fileId});
  }
}

function filesForRequirement(
  requirement: ParsedRequirement,
  items: readonly TaskItem[],
  impact: string,
  files: readonly ChangeFile[],
): string[] {
  const found = new Set<string>();
  const own = [requirement.name, requirement.text, ...requirement.scenarios.flatMap((scenario) => [scenario.name, scenario.text])].join(
    '\n',
  );
  addMentioned(found, own, files);

  for (const item of items) {
    const headed = item.heading !== null && sameName(item.heading, requirement.name);
    const named = mentions(item.text, requirement.name) || (item.heading !== null && mentions(item.heading, requirement.name));

    if (!headed && !named) {
      continue;
    }

    addMentioned(found, `${item.heading ?? ''}\n${item.text}`, files);
  }

  for (const line of impact.split(/\r?\n/)) {
    if (!mentions(line, requirement.name)) {
      continue;
    }

    addMentioned(found, line, files);
  }

  return [...found].sort((left, right) => left.localeCompare(right));
}

function filesForTask(item: TaskItem, impact: string, files: readonly ChangeFile[]): string[] {
  const found = new Set<string>();
  addMentioned(found, `${item.heading ?? ''}\n${item.text}`, files);

  for (const line of impact.split(/\r?\n/)) {
    if (!mentions(line, item.title)) {
      continue;
    }

    addMentioned(found, line, files);
  }

  return [...found].sort((left, right) => left.localeCompare(right));
}

function mentionedFiles(text: string, files: readonly ChangeFile[]): string[] {
  const found = new Set<string>();
  addMentioned(found, text, files);

  return [...found].sort((left, right) => left.localeCompare(right));
}

function addMentioned(found: Set<string>, text: string, files: readonly ChangeFile[]): void {
  for (const file of files) {
    if (mentionsPath(text, file.path) || (file.previous !== null && mentionsPath(text, file.previous))) {
      found.add(file.path);
    }
  }
}

function parseDelta(markdown: string): ParsedRequirement[] {
  const draft: RequirementDraft = {kind: null, current: null, scenario: null, lines: [], requirements: []};

  for (const line of markdown.split(/\r?\n/)) {
    readRequirementLine(draft, line);
  }

  finishRequirement(draft);

  return draft.requirements;
}

function readRequirementLine(draft: RequirementDraft, line: string): void {
  const delta = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/.exec(line);
  const word = delta?.[1];

  if (word) {
    finishRequirement(draft);
    draft.kind = kindOf(word);

    return;
  }

  if (/^##\s+/.test(line)) {
    finishRequirement(draft);
    draft.kind = null;

    return;
  }

  const requirement = /^###\s+Requirement:\s*(.*?)\s*$/.exec(line);
  const requirementName = requirement?.[1]?.trim() ?? '';

  if (requirement && draft.kind && requirementName.length > 0) {
    finishRequirement(draft);
    draft.current = {
      kind: draft.kind,
      name: requirementName,
      text: '',
      scenarios: [],
      reason: null,
      migration: null,
    };

    return;
  }

  const scenario = /^####\s+Scenario:\s*(.*?)\s*$/.exec(line);
  const scenarioName = scenario?.[1]?.trim() ?? '';

  if (scenario && draft.current && scenarioName.length > 0) {
    startScenario(draft, scenarioName);

    return;
  }

  if (draft.current) {
    draft.lines.push(line);
  }
}

function startScenario(draft: RequirementDraft, name: string): void {
  const current = draft.current;

  if (!current) {
    return;
  }

  if (!draft.scenario) {
    current.text = takeLines(draft);
  } else {
    draft.scenario.text = takeLines(draft);
    current.scenarios.push(draft.scenario);
  }

  draft.scenario = {name, text: ''};
}

function finishRequirement(draft: RequirementDraft): void {
  const current = draft.current;

  if (!current) {
    draft.lines = [];

    return;
  }

  if (!draft.scenario) {
    current.text = takeLines(draft);
  } else {
    draft.scenario.text = takeLines(draft);
    current.scenarios.push(draft.scenario);
    draft.scenario = null;
  }

  const reason = takeLabel(current.text, 'Reason');
  const migration = takeLabel(reason.body, 'Migration');
  current.text = migration.body;
  current.reason = reason.value;
  current.migration = migration.value;
  draft.requirements.push(current);
  draft.current = null;
}

function takeLines(draft: RequirementDraft): string {
  const text = draft.lines.join('\n').trim();
  draft.lines = [];

  return text;
}

function kindOf(word: string): RequirementKind | null {
  if (word === 'ADDED') {
    return 'added';
  }

  if (word === 'MODIFIED') {
    return 'modified';
  }

  if (word === 'REMOVED') {
    return 'removed';
  }

  if (word === 'RENAMED') {
    return 'renamed';
  }

  return null;
}

function namedBody(markdown: string | null, name: string): string | null {
  if (markdown === null) {
    return null;
  }

  const lines = markdown.split(/\r?\n/);
  const body: string[] = [];
  let taking = false;

  for (const line of lines) {
    const heading = /^###\s+Requirement:\s*(.*?)\s*$/.exec(line);

    if (heading) {
      if (taking) {
        return emptyToNull(body.join('\n').trim());
      }

      taking = (heading[1]?.trim() ?? '') === name;
      continue;
    }

    if (taking && (/^##\s+/.test(line) || /^####\s+/.test(line))) {
      return emptyToNull(body.join('\n').trim());
    }

    if (taking) {
      body.push(line);
    }
  }

  if (!taking) {
    return null;
  }

  return emptyToNull(body.join('\n').trim());
}

function takeLabel(body: string, label: string): {body: string; value: string | null} {
  const pattern = new RegExp(`^\\s*(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*(.*)$`, 'i');
  const kept: string[] = [];
  const values: string[] = [];
  let taking = false;

  for (const line of body.split(/\r?\n/)) {
    const match = pattern.exec(line);

    if (match) {
      taking = true;
      const rest = match[1]?.trim() ?? '';

      if (rest.length > 0) {
        values.push(rest);
      }

      continue;
    }

    if (taking && /^\s+\S/.test(line)) {
      values.push(line.trim());
      continue;
    }

    taking = false;
    kept.push(line);
  }

  return {body: kept.join('\n').trim(), value: emptyToNull(values.join('\n').trim())};
}

function readDecisions(design: string | null): {title: string; text: string}[] {
  const section = markdownSection(design, 'Decisions');

  if (section === null) {
    return [];
  }

  const headed = splitDecisions(section);

  if (headed.length > 0) {
    return headed;
  }

  return [{title: 'Decisions', text: section}];
}

function splitDecisions(section: string): {title: string; text: string}[] {
  const decisions: {title: string; text: string}[] = [];
  let title: string | null = null;
  let body: string[] = [];

  for (const line of section.split(/\r?\n/)) {
    const heading = /^###\s+(.+?)\s*$/.exec(line);
    const bullet = /^\s*(?:[-*]|\d+\.)\s+(?:\*\*)?Decision(?:\*\*)?\s*:\s*(.+?)\s*$/i.exec(line);
    const next = heading?.[1]?.trim() || bullet?.[1]?.trim() || '';

    if (next.length > 0) {
      if (title !== null) {
        decisions.push({title, text: body.join('\n').trim()});
      }

      title = next;
      body = [];
      continue;
    }

    if (title !== null) {
      body.push(line);
    }
  }

  if (title !== null) {
    decisions.push({title, text: body.join('\n').trim()});
  }

  return decisions;
}

function taskItems(markdown: string | null): TaskItem[] {
  if (markdown === null) {
    return [];
  }

  const items: TaskItem[] = [];
  let heading: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const head = /^#{2,3}\s+(.+?)\s*$/.exec(line);

    if (head?.[1]) {
      heading = head[1].trim();
      continue;
    }

    const item = /^\s*(?:[-*]\s+\[[ xX]\]|[-*]|\d+\.)\s+(.+?)\s*$/.exec(line);
    const title = item?.[1]?.trim() ?? '';

    if (title.length === 0) {
      continue;
    }

    items.push({heading, text: line.trim(), title});
  }

  return items;
}

function requirementQuote(requirement: ParsedRequirement, prior: string | null): string {
  const parts = [requirement.name, requirement.text];

  if (prior) {
    parts.push(`Prior:\n${prior}`);
  }

  if (requirement.reason) {
    parts.push(`Reason:\n${requirement.reason}`);
  }

  if (requirement.migration) {
    parts.push(`Migration:\n${requirement.migration}`);
  }

  for (const scenario of requirement.scenarios) {
    const text = scenario.text.length > 0 ? `${scenario.name}\n${scenario.text}` : scenario.name;
    parts.push(text);
  }

  return parts.filter((part) => part.trim().length > 0).join('\n\n');
}

function requirementMark(requirement: ParsedRequirement, prior: string | null): string {
  if (requirement.kind === 'modified' && prior) {
    return snippet(`prior: ${firstLine(prior)}`);
  }

  if (requirement.kind === 'removed' && requirement.reason) {
    return snippet(requirement.reason);
  }

  return snippet(requirement.text);
}

function markdownSection(markdown: string | null, title: string): string | null {
  if (markdown === null) {
    return null;
  }

  const lines: string[] = [];
  let current = false;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);

    if (!heading) {
      if (current) {
        lines.push(line);
      }

      continue;
    }

    if (current) {
      break;
    }

    current = heading[1] === title;
  }

  return emptyToNull(lines.join('\n').trim());
}

function mentions(text: string, phrase: string): boolean {
  const haystack = text.toLowerCase();
  const needle = phrase.trim().toLowerCase();

  if (needle.length === 0) {
    return false;
  }

  let from = 0;

  for (;;) {
    const index = haystack.indexOf(needle, from);

    if (index < 0) {
      return false;
    }

    const before = index === 0 ? '' : (haystack[index - 1] ?? '');
    const after = haystack[index + needle.length] ?? '';

    if (!/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after)) {
      return true;
    }

    from = index + needle.length;
  }
}

function mentionsPath(text: string, path: string): boolean {
  let from = 0;

  for (;;) {
    const index = text.indexOf(path, from);

    if (index < 0) {
      return false;
    }

    const before = index === 0 ? '' : (text[index - 1] ?? '');
    const after = text[index + path.length] ?? '';

    if (!/[A-Za-z0-9._/-]/.test(before) && !/[A-Za-z0-9._/-]/.test(after)) {
      return true;
    }

    from = index + path.length;
  }
}

function sameName(left: string, right: string): boolean {
  return stripIndex(left).toLowerCase() === stripIndex(right).toLowerCase();
}

function stripIndex(value: string): string {
  return value.trim().replace(/^\d+(?:\.\d+)*\.?\s+/, '');
}

function snippet(text: string): string {
  const line = firstLine(text);

  if (line.length <= nameLimit) {
    return line;
  }

  return `${line.slice(0, nameLimit - 1)}…`;
}

function firstLine(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('```'));

  return (line ?? '').replace(/\s+/g, ' ');
}

function emptyToNull(text: string): string | null {
  return text.length > 0 ? text : null;
}
