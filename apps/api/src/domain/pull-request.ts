export type PullState = 'open' | 'draft' | 'merged' | 'closed';

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: PullState;
  author: string | null;
  updatedAt: string;
}

export function pullState(pull: {draft: boolean; merged: boolean; closed: boolean}): PullState {
  if (pull.merged) {
    return 'merged';
  }

  if (pull.draft && !pull.closed) {
    return 'draft';
  }

  if (!pull.closed) {
    return 'open';
  }

  return 'closed';
}
