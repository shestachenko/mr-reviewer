export interface GitHubRepository {
  owner: string;
  name: string;
  token: string | undefined;
}

export function githubHeaders(token: string | undefined): Record<string, string> {
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

export function githubRepoUrl(repository: GitHubRepository, path: string): string {
  return `https://api.github.com/repos/${repository.owner}/${repository.name}/${path}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
