export interface ChangedFile {
  path: string;
  previous: string | null;
  patch: string | null;
}

export interface ChangeTree {
  paths: string[];
  files: ChangedFile[];
  read(path: string): Promise<string | null>;
  readBase(path: string): Promise<string | null>;
}

export interface PullChangeSource {
  read(number: number): Promise<ChangeTree | null>;
}

export class PullChangeSourceError extends Error {}
