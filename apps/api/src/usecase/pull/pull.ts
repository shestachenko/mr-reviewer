import {type PullDetails, pullState} from '../../domain/pull-request.js';

import {type PullCommit, type PullRecord, type PullSource, PullSourceError} from './pull.port.js';

export class PullNotFound extends Error {}

export class PullFailed extends Error {}

export async function pull(source: PullSource, number: number): Promise<PullDetails> {
  try {
    const record = await source.read(number);

    if (!record) {
      throw new PullNotFound();
    }

    return toPullDetails(record);
  } catch (error) {
    if (error instanceof PullNotFound) {
      throw error;
    }

    if (error instanceof PullSourceError) {
      throw new PullFailed(error.message);
    }

    throw error;
  }
}

function toPullDetails(record: PullRecord): PullDetails {
  return {
    number: record.number,
    title: record.title,
    url: record.url,
    state: pullState(record),
    author: record.author,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    base: record.base,
    head: record.head,
    commit: toCommit(record.commit),
  };
}

function toCommit(commit: PullCommit): PullDetails['commit'] {
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
