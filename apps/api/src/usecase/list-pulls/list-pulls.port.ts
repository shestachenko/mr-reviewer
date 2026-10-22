export interface ListedPull {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  merged: boolean;
  closed: boolean;
  author: string | null;
  updatedAt: string;
}

export interface ListedPulls {
  repository: string;
  pulls: ListedPull[];
}

export interface PullSource {
  list(): Promise<ListedPulls>;
}

export class PullSourceError extends Error {}
