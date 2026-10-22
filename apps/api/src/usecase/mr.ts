import {type PullCommit, type PullDetails, pullState} from '../domain/pull-request.js';

import {type MrCommit, type MrRecord, type MrSource, MrSourceError} from './mr.port.js';

export class MrNotFound extends Error {}

export class MrFailed extends Error {}

export async function mr(source: MrSource, number: number): Promise<PullDetails> {
  try {
    const record = await source.read(number);

    if (!record) {
      throw new MrNotFound();
    }

    return toPullDetails(record);
  } catch (error) {
    if (error instanceof MrNotFound) {
      throw error;
    }

    if (error instanceof MrSourceError) {
      throw new MrFailed(error.message);
    }

    throw error;
  }
}

function toPullDetails(record: MrRecord): PullDetails {
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

function toCommit(commit: MrCommit): PullCommit {
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
