import {type ListedPull, type PullSource, PullSourceError} from '../../usecase/list-pulls.port.js';

import {githubHeaders, type GitHubRepository, isRecord} from './client.js';

const perPage = 100;

interface GitHubPull {
  number: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed';
  draft: boolean;
  mergedAt: string | null;
  author: string | null;
  updatedAt: string;
}

export function createGitHubPullSource(repository: GitHubRepository): PullSource {
  return {
    async list() {
      const pulls: ListedPull[] = [];
      let page = 1;

      for (;;) {
        const batch = await fetchPage(repository, page);
        pulls.push(...batch.map(toListedPull));

        if (batch.length < perPage) {
          break;
        }

        page += 1;
      }

      return {
        repository: `${repository.owner}/${repository.name}`,
        pulls,
      };
    },
  };
}

async function fetchPage(repository: GitHubRepository, page: number): Promise<GitHubPull[]> {
  const response = await fetch(pageUrl(repository, page), {headers: githubHeaders(repository.token)});

  if (!response.ok) {
    throw new PullSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return readPulls(await response.json());
}

function pageUrl(repository: GitHubRepository, page: number): string {
  const url = new URL(
    `https://api.github.com/repos/${repository.owner}/${repository.name}/pulls`,
  );
  url.searchParams.set('state', 'all');
  url.searchParams.set('sort', 'created');
  url.searchParams.set('direction', 'desc');
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));

  return url.toString();
}

function readPulls(value: unknown): GitHubPull[] {
  if (!Array.isArray(value)) {
    throw new PullSourceError('GitHub did not return a list.');
  }

  return value.map((item) => {
    const pull = readPull(item);

    if (!pull) {
      throw new PullSourceError('GitHub returned a pull request the list cannot read.');
    }

    return pull;
  });
}

function readPull(value: unknown): GitHubPull | null {
  if (!isRecord(value)) {
    return null;
  }

  const number = value['number'];
  const title = value['title'];
  const htmlUrl = value['html_url'];
  const state = value['state'];
  const draft = value['draft'];
  const mergedAt = value['merged_at'];
  const updatedAt = value['updated_at'];
  const user = value['user'];

  if (typeof number !== 'number' || !Number.isInteger(number)) {
    return null;
  }

  if (typeof title !== 'string' || typeof htmlUrl !== 'string' || typeof updatedAt !== 'string') {
    return null;
  }

  if (state !== 'open' && state !== 'closed') {
    return null;
  }

  if (typeof draft !== 'boolean') {
    return null;
  }

  if (mergedAt !== null && typeof mergedAt !== 'string') {
    return null;
  }

  return {
    number,
    title,
    htmlUrl,
    state,
    draft,
    mergedAt,
    author: readAuthor(user),
    updatedAt,
  };
}

function readAuthor(user: unknown): string | null {
  if (!isRecord(user)) {
    return null;
  }

  const login = user['login'];

  if (typeof login !== 'string' || login.length === 0) {
    return null;
  }

  return login;
}

function toListedPull(pull: GitHubPull): ListedPull {
  return {
    number: pull.number,
    title: pull.title,
    url: pull.htmlUrl,
    draft: pull.draft,
    merged: pull.mergedAt !== null,
    closed: pull.state === 'closed',
    author: pull.author,
    updatedAt: pull.updatedAt,
  };
}
