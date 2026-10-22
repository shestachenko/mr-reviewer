import {type PullCommit, type PullDetails, pullState} from '../domain/pull-request.js';

import {type FoundCommit, type FoundPull, type PullLookup, PullLookupError} from './find-pull.port.js';

export class PullNotFound extends Error {}

export class FindPullFailed extends Error {}

export async function findPull(lookup: PullLookup, number: number): Promise<PullDetails> {
  try {
    const found = await lookup.find(number);

    if (!found) {
      throw new PullNotFound();
    }

    return toPullDetails(found);
  } catch (error) {
    if (error instanceof PullNotFound) {
      throw error;
    }

    if (error instanceof PullLookupError) {
      throw new FindPullFailed(error.message);
    }

    throw error;
  }
}

function toPullDetails(pull: FoundPull): PullDetails {
  return {
    number: pull.number,
    title: pull.title,
    url: pull.url,
    state: pullState(pull),
    author: pull.author,
    createdAt: pull.createdAt,
    updatedAt: pull.updatedAt,
    base: pull.base,
    head: pull.head,
    commit: toCommit(pull.commit),
  };
}

function toCommit(commit: FoundCommit): PullCommit {
  return {
    sha: commit.sha,
    message: subject(commit.message),
    author: commit.author,
    committedAt: commit.committedAt,
  };
}

function subject(message: string): string {
  const [line] = message.split('\n');
  const trimmed = line?.trim() ?? '';

  if (trimmed.length > 0) {
    return trimmed;
  }

  return message.trim();
}
