export interface ChangeTree {
  paths: string[];
  read(path: string): Promise<string | null>;
}

export interface PullMeaningSource {
  read(number: number): Promise<ChangeTree | null>;
}

export class PullMeaningSourceError extends Error {}
