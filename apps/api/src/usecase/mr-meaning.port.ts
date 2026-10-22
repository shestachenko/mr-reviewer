export interface ChangeTree {
  paths: string[];
  read(path: string): Promise<string | null>;
}

export interface MrMeaningSource {
  read(number: number): Promise<ChangeTree | null>;
}

export class MrMeaningSourceError extends Error {}
