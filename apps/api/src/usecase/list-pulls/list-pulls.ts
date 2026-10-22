import {type PullRequest, pullState} from '../../domain/pull-request.js';

import {type ListedPull, type PullSource, PullSourceError} from './list-pulls.port.js';

export interface PullList {
  repository: string;
  pulls: PullRequest[];
}

export class ListPullsFailed extends Error {}

export async function listPullRequests(source: PullSource): Promise<PullList> {
  try {
    const listed = await source.list();

    return {
      repository: listed.repository,
      pulls: listed.pulls.map(toPullRequest),
    };
  } catch (error) {
    if (error instanceof PullSourceError) {
      throw new ListPullsFailed(error.message);
    }

    throw error;
  }
}

function toPullRequest(pull: ListedPull): PullRequest {
  return {
    number: pull.number,
    title: pull.title,
    url: pull.url,
    state: pullState(pull),
    author: pull.author,
    updatedAt: pull.updatedAt,
  };
}
