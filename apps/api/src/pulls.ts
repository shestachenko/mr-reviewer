const repository = {
  owner: 'shestachenko',
  name: 'openspec-run',
};

const perPage = 100;

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'draft' | 'merged' | 'closed';
  author: string | null;
  updatedAt: string;
}

export interface PullList {
  repository: string;
  pulls: PullRequest[];
}

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

export async function listPullRequests(): Promise<PullList> {
  const pulls: PullRequest[] = [];
  let page = 1;

  for (;;) {
    const batch = await fetchPage(page);
    pulls.push(...batch.map(toPullRequest));

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return {
    repository: `${repository.owner}/${repository.name}`,
    pulls,
  };
}

async function fetchPage(page: number): Promise<GitHubPull[]> {
  const response = await fetch(pageUrl(page), {headers: githubHeaders()});

  if (!response.ok) {
    throw new Error(`GitHub responded ${String(response.status)}.`);
  }

  return readPulls(await response.json());
}

function pageUrl(page: number): string {
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

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'mr-reviewer',
    'x-github-api-version': '2022-11-28',
  };
  const token = process.env['GITHUB_TOKEN'];

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

function readPulls(value: unknown): GitHubPull[] {
  if (!Array.isArray(value)) {
    throw new Error('GitHub did not return a list.');
  }

  return value.map((item) => {
    const pull = readPull(item);

    if (!pull) {
      throw new Error('GitHub returned a pull request the list cannot read.');
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

function toPullRequest(pull: GitHubPull): PullRequest {
  return {
    number: pull.number,
    title: pull.title,
    url: pull.htmlUrl,
    state: pullState(pull),
    author: pull.author,
    updatedAt: pull.updatedAt,
  };
}

function pullState(pull: GitHubPull): PullRequest['state'] {
  if (pull.mergedAt !== null) {
    return 'merged';
  }

  if (pull.draft && pull.state === 'open') {
    return 'draft';
  }

  if (pull.state === 'open') {
    return 'open';
  }

  return 'closed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
