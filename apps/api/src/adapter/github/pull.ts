import {type FoundCommit, type FoundPull, type PullLookup, PullLookupError} from '../../usecase/find-pull.port.js';

interface GitHubRepository {
  owner: string;
  name: string;
  token: string | undefined;
}

interface GitHubPull {
  number: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed';
  draft: boolean;
  mergedAt: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  base: string;
  head: string;
  headSha: string;
}

export function createGitHubPullLookup(repository: GitHubRepository): PullLookup {
  return {
    async find(number) {
      const pull = await fetchPull(repository, number);

      if (!pull) {
        return null;
      }

      const commit = await fetchCommit(repository, pull.headSha);

      return toFoundPull(pull, commit);
    },
  };
}

async function fetchPull(repository: GitHubRepository, number: number): Promise<GitHubPull | null> {
  const response = await githubFetch(repository, `pulls/${String(number)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new PullLookupError(`GitHub responded ${String(response.status)}.`);
  }

  const pull = readPull(await response.json());

  if (!pull) {
    throw new PullLookupError('GitHub returned a pull request the page cannot read.');
  }

  return pull;
}

async function fetchCommit(repository: GitHubRepository, sha: string): Promise<FoundCommit> {
  const response = await githubFetch(repository, `commits/${sha}`);

  if (!response.ok) {
    throw new PullLookupError(`GitHub responded ${String(response.status)}.`);
  }

  const commit = readCommit(await response.json());

  if (!commit) {
    throw new PullLookupError('GitHub returned a commit the page cannot read.');
  }

  return commit;
}

function githubFetch(repository: GitHubRepository, path: string): Promise<Response> {
  return fetch(githubUrl(repository, path), {headers: githubHeaders(repository.token)});
}

function githubUrl(repository: GitHubRepository, path: string): string {
  return `https://api.github.com/repos/${repository.owner}/${repository.name}/${path}`;
}

function githubHeaders(token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'mr-reviewer',
    'x-github-api-version': '2022-11-28',
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
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
  const createdAt = value['created_at'];
  const updatedAt = value['updated_at'];
  const base = readRef(value['base']);
  const head = readHead(value['head']);

  if (typeof number !== 'number' || !Number.isInteger(number)) {
    return null;
  }

  if (typeof title !== 'string' || typeof htmlUrl !== 'string') {
    return null;
  }

  if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') {
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

  if (!base || !head) {
    return null;
  }

  return {
    number,
    title,
    htmlUrl,
    state,
    draft,
    mergedAt,
    author: readAuthor(value['user']),
    createdAt,
    updatedAt,
    base,
    head: head.ref,
    headSha: head.sha,
  };
}

function readHead(value: unknown): {ref: string; sha: string} | null {
  if (!isRecord(value)) {
    return null;
  }

  const ref = value['ref'];
  const sha = value['sha'];

  if (typeof ref !== 'string' || ref.length === 0) {
    return null;
  }

  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/i.test(sha)) {
    return null;
  }

  return {ref, sha};
}

function readRef(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const ref = value['ref'];

  if (typeof ref !== 'string' || ref.length === 0) {
    return null;
  }

  return ref;
}

function readCommit(value: unknown): FoundCommit | null {
  if (!isRecord(value)) {
    return null;
  }

  const sha = value['sha'];
  const commit = value['commit'];

  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/i.test(sha) || !isRecord(commit)) {
    return null;
  }

  const message = commit['message'];
  const author = commit['author'];

  if (typeof message !== 'string' || !isRecord(author)) {
    return null;
  }

  const committedAt = author['date'];
  const name = author['name'];

  if (typeof committedAt !== 'string' || committedAt.length === 0) {
    return null;
  }

  const gitName = typeof name === 'string' && name.length > 0 ? name : null;

  return {
    sha,
    message,
    author: readAuthor(value['author']) ?? gitName,
    committedAt,
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

function toFoundPull(pull: GitHubPull, commit: FoundCommit): FoundPull {
  return {
    number: pull.number,
    title: pull.title,
    url: pull.htmlUrl,
    draft: pull.draft,
    merged: pull.mergedAt !== null,
    closed: pull.state === 'closed',
    author: pull.author,
    createdAt: pull.createdAt,
    updatedAt: pull.updatedAt,
    base: pull.base,
    head: pull.head,
    commit,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
