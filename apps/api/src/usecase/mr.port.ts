export interface MrCommit {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
}

export interface MrRecord {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  merged: boolean;
  closed: boolean;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  base: string;
  head: string;
  commit: MrCommit;
}

export interface MrSource {
  read(number: number): Promise<MrRecord | null>;
}

export class MrSourceError extends Error {}
