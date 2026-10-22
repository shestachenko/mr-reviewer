export interface PullCommit {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
}

export interface PullRecord {
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
  commit: PullCommit;
}

export interface PullSource {
  read(number: number): Promise<PullRecord | null>;
}

export class PullSourceError extends Error {}
