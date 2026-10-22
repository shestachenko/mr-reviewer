export interface MeaningScenario {
  name: string;
  text: string;
}

export interface MeaningRequirement {
  name: string;
  text: string;
  scenarios: MeaningScenario[];
}

export interface MeaningSources {
  proposal: string | null;
  yaml: string | null;
  design: string | null;
  specs: readonly string[];
}

export interface BlockedMeaning {
  status: 'blocked';
  reason: 'missing' | 'several';
  changes: string[];
}

export interface OpenMeaning {
  status: 'open';
  change: string;
  skipSpecs: boolean;
  task: string | null;
  requirements: MeaningRequirement[];
  assumptions: string | null;
}

export interface ChangeHit {
  name: string;
  root: string;
}

export type PullMeaning = BlockedMeaning | OpenMeaning;

export function onlyChange(paths: readonly string[]): ChangeHit | BlockedMeaning {
  const changes = changeHits(paths);

  if (changes.length === 0) {
    return {status: 'blocked', reason: 'missing', changes: []};
  }

  if (changes.length > 1) {
    return {status: 'blocked', reason: 'several', changes: changes.map((change) => change.name)};
  }

  return changes[0] ?? {status: 'blocked', reason: 'missing', changes: []};
}

export function changeFile(root: string, name: string): string {
  return `${root}/${name}`;
}

export function specPaths(root: string, paths: readonly string[]): string[] {
  const prefix = `${root}/specs/`;

  return paths.filter((path) => path.startsWith(prefix) && path.endsWith('/spec.md')).sort();
}

export function openMeaning(change: ChangeHit, sources: MeaningSources): OpenMeaning {
  return {
    status: 'open',
    change: change.name,
    skipSpecs: sources.yaml !== null && changeSkipsSpecs(sources.yaml),
    task: sources.proposal === null ? null : taskText(sources.proposal),
    requirements: sources.specs.flatMap((spec) => specRequirements(spec)),
    assumptions: assumptions(sources.design, sources.proposal),
  };
}

export function changeSkipsSpecs(yaml: string): boolean {
  for (const line of yaml.split(/\r?\n/)) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }

    const match = /^skip_specs:\s*(.*?)\s*(?:#.*)?$/.exec(line);

    if (!match) {
      continue;
    }

    const raw = match[1]?.trim() ?? '';
    const unquoted = raw.replace(/^(['"])(.*)\1$/, '$2');

    return unquoted.toLowerCase() === 'true';
  }

  return false;
}

function assumptions(design: string | null, proposal: string | null): string | null {
  const fromDesign = design === null ? null : markdownSection(design, 'Assumptions');

  if (fromDesign !== null) {
    return fromDesign;
  }

  if (proposal === null) {
    return null;
  }

  return markdownSection(proposal, 'Assumptions');
}

function taskText(markdown: string): string | null {
  const section = markdownSection(markdown, 'What Changes');

  if (section === null) {
    return null;
  }

  const lines = section.split(/\r?\n/);
  const cut = lines.findIndex((line) => /^(?:вне скоупа|out of scope|non-goals)\s*:?\s*$/i.test(line.trim()));
  const text = (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim();

  return text.length > 0 ? text : null;
}

function markdownSection(markdown: string, title: string): string | null {
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

  const text = lines.join('\n').trim();

  return text.length > 0 ? text : null;
}

function criterionText(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^-\s+\*\*(?:WHEN|THEN|AND)\*\*/i.test(line));

  if (lines.length === 0) {
    return text;
  }

  return lines.join('\n');
}

interface RequirementDraft {
  requirements: MeaningRequirement[];
  current: MeaningRequirement | null;
  scenario: MeaningScenario | null;
  lines: string[];
  inDelta: boolean;
}

function specRequirements(markdown: string): MeaningRequirement[] {
  const draft: RequirementDraft = {requirements: [], current: null, scenario: null, lines: [], inDelta: false};

  for (const line of markdown.split(/\r?\n/)) {
    readRequirementLine(draft, line);
  }

  finishRequirement(draft);

  return draft.requirements;
}

function readRequirementLine(draft: RequirementDraft, line: string): void {
  const delta = /^##\s+(?:ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/.exec(line);

  if (delta) {
    finishRequirement(draft);
    draft.inDelta = true;

    return;
  }

  const heading = /^##\s+/.exec(line);

  if (heading) {
    finishRequirement(draft);
    draft.inDelta = false;

    return;
  }

  const requirement = /^###\s+Requirement:\s*(.*?)\s*$/.exec(line);
  const requirementName = requirement?.[1]?.trim() ?? '';

  if (requirement && draft.inDelta && requirementName.length > 0) {
    finishRequirement(draft);
    draft.current = {name: requirementName, text: '', scenarios: []};

    return;
  }

  const scenario = /^####\s+Scenario:\s*(.*?)\s*$/.exec(line);
  const scenarioName = scenario?.[1]?.trim() ?? '';

  if (scenario && draft.current !== null && scenarioName.length > 0) {
    startScenario(draft, scenarioName);

    return;
  }

  if (draft.current !== null) {
    draft.lines.push(line);
  }
}

function startScenario(draft: RequirementDraft, name: string): void {
  const current = draft.current;

  if (current === null) {
    return;
  }

  if (draft.scenario === null) {
    current.text = takeLines(draft);
  } else {
    draft.scenario.text = criterionText(takeLines(draft));
    current.scenarios.push(draft.scenario);
  }

  draft.scenario = {name, text: ''};
}

function finishRequirement(draft: RequirementDraft): void {
  const current = draft.current;

  if (current === null) {
    draft.lines = [];

    return;
  }

  if (draft.scenario === null) {
    current.text = takeLines(draft);
  } else {
    draft.scenario.text = criterionText(takeLines(draft));
    current.scenarios.push(draft.scenario);
    draft.scenario = null;
  }

  draft.requirements.push(current);
  draft.current = null;
}

function takeLines(draft: RequirementDraft): string {
  const text = draft.lines.join('\n').trim();
  draft.lines = [];

  return text;
}

function changeHits(paths: readonly string[]): ChangeHit[] {
  const changes: ChangeHit[] = [];

  for (const path of paths) {
    const change = changeHit(path);

    if (!change || changes.some((item) => item.root === change.root)) {
      continue;
    }

    changes.push(change);
  }

  return changes;
}

function changeHit(path: string): ChangeHit | null {
  const archived = /^openspec\/changes\/archive\/([^/]+)\//.exec(path);
  const archivedName = archived?.[1];

  if (archivedName && isChangeName(archivedName)) {
    return {name: archivedName, root: `openspec/changes/archive/${archivedName}`};
  }

  const active = /^openspec\/changes\/([^/]+)\//.exec(path);
  const activeName = active?.[1];

  if (!activeName || !isChangeName(activeName) || activeName === 'archive') {
    return null;
  }

  return {name: activeName, root: `openspec/changes/${activeName}`};
}

function isChangeName(name: string): boolean {
  return name !== '.' && name !== '..';
}
