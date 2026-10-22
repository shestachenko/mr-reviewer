export type PullState = 'open' | 'draft' | 'merged' | 'closed';

export const pullStateLabel: Record<PullState, string> = {
  draft: 'черновик',
  open: 'открыт',
  merged: 'влит',
  closed: 'закрыт',
};
