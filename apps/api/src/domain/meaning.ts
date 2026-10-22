export interface ProposalSections {
  why: string | null;
  whatChanges: string | null;
  capabilities: string | null;
  impact: string | null;
}

export interface BlockedMeaning {
  status: 'blocked';
  reason: 'missing' | 'several';
  changes: string[];
}

export interface OpenMeaning {
  status: 'open';
  change: string;
  proposal: string;
  skipSpecs: boolean;
  sections: ProposalSections;
}

export interface ChangeHit {
  name: string;
  root: string;
}

export type PullMeaning = BlockedMeaning | OpenMeaning;

const emptySections: ProposalSections = {
  why: null,
  whatChanges: null,
  capabilities: null,
  impact: null,
};

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

export function openMeaning(change: ChangeHit, proposal: string | null, yaml: string | null): OpenMeaning {
  return {
    status: 'open',
    change: change.name,
    proposal: changeFile(change.root, 'proposal.md'),
    skipSpecs: yaml !== null && changeSkipsSpecs(yaml),
    sections: proposal === null ? emptySections : proposalSections(proposal),
  };
}

export function proposalSections(markdown: string): ProposalSections {
  const sections: ProposalSections = {...emptySections};
  let current: keyof ProposalSections | null = null;
  let lines: string[] = [];

  const flush = () => {
    if (current === null) {
      lines = [];

      return;
    }

    const text = lines.join('\n').trim();
    sections[current] = text.length > 0 ? text : null;
    lines = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);

    if (heading) {
      flush();
      current = sectionName(heading[1] ?? '');
      continue;
    }

    if (current !== null) {
      lines.push(line);
    }
  }

  flush();

  return sections;
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

function sectionName(title: string): keyof ProposalSections | null {
  switch (title) {
    case 'Why':
      return 'why';
    case 'What Changes':
      return 'whatChanges';
    case 'Capabilities':
      return 'capabilities';
    case 'Impact':
      return 'impact';
    default:
      return null;
  }
}
