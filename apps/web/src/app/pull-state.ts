export type PullState = 'open' | 'draft' | 'merged' | 'closed';

export const pullStateLabel: Record<PullState, string> = {
  draft: 'draft',
  open: 'open',
  merged: 'merged',
  closed: 'closed',
};
