export interface FoundCommit {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
}

export interface FoundPull {
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
  commit: FoundCommit;
}

export interface PullLookup {
  find(number: number): Promise<FoundPull | null>;
}

export class PullLookupError extends Error {}
