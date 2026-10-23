export interface ProjectTree {
  paths: string[];
  patches: string[];
  tree: string[];
  read(path: string): Promise<string | null>;
}

export interface PullMapSource {
  read(number: number): Promise<ProjectTree | null>;
}

export class PullMapSourceError extends Error {}
