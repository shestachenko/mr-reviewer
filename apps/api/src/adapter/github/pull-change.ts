import {type PullChangeSource, PullChangeSourceError} from '../../usecase/pull-change/pull-change.port.js';

import {githubFetch, githubHeaders, type GitHubRepository, githubRepoUrl, isRecord} from './client.js';

const perPage = 100;

interface GitHubChangedFile {
  filename: string;
  previousFilename: string | null;
  patch: string | null;
}

interface PullRefs {
  head: string;
  base: string;
}

export function createGitHubPullChange(repository: GitHubRepository): PullChangeSource {
  return {
    async read(number) {
      const refs = await fetchRefs(repository, number);

      if (!refs) {
        return null;
      }

      const files = await listFiles(repository, number);

      return {
        paths: files.flatMap(filePaths),
        files: files.map((file) => ({path: file.filename, previous: file.previousFilename, patch: file.patch})),
        read(path) {
          return readText(repository, refs.head, path);
        },
        readBase(path) {
          return readText(repository, refs.base, path);
        },
      };
    },
  };
}

async function fetchRefs(repository: GitHubRepository, number: number): Promise<PullRefs | null> {
  const response = await githubFetch(repository, githubRepoUrl(repository, `pulls/${String(number)}`));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new PullChangeSourceError(`GitHub responded ${String(response.status)}.`);
  }

  const refs = readRefs(await response.json());

  if (!refs) {
    throw new PullChangeSourceError('GitHub returned a pull request the page cannot read.');
  }

  return refs;
}

async function listFiles(repository: GitHubRepository, number: number): Promise<GitHubChangedFile[]> {
  const files: GitHubChangedFile[] = [];
  let page = 1;

  for (;;) {
    const batch = await fetchFiles(repository, number, page);
    files.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return files;
}

async function readText(repository: GitHubRepository, sha: string, path: string): Promise<string | null> {
  const encoded = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const url = new URL(githubRepoUrl(repository, `contents/${encoded}`));
  url.searchParams.set('ref', sha);
  const headers = githubHeaders(repository.token);
  headers.accept = 'application/vnd.github.raw';

  const response = await githubFetch(repository, url, headers);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new PullChangeSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return response.text();
}

async function fetchFiles(repository: GitHubRepository, number: number, page: number): Promise<GitHubChangedFile[]> {
  const url = new URL(githubRepoUrl(repository, `pulls/${String(number)}/files`));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));

  const response = await githubFetch(repository, url);

  if (!response.ok) {
    throw new PullChangeSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return readFiles(await response.json());
}

function readRefs(value: unknown): PullRefs | null {
  if (!isRecord(value)) {
    return null;
  }

  const head = readRefSha(value['head']);
  const base = readRefSha(value['base']);

  if (!head || !base) {
    return null;
  }

  return {head, base};
}

function readRefSha(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return readSha(value['sha']);
}

function readSha(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/i.test(value)) {
    return null;
  }

  return value;
}

function readFiles(value: unknown): GitHubChangedFile[] {
  if (!Array.isArray(value)) {
    throw new PullChangeSourceError('GitHub did not return a list.');
  }

  return value.map((item) => {
    const file = readFile(item);

    if (!file) {
      throw new PullChangeSourceError('GitHub returned a file the page cannot read.');
    }

    return file;
  });
}

function readFile(value: unknown): GitHubChangedFile | null {
  if (!isRecord(value)) {
    return null;
  }

  const filename = value['filename'];
  const previous = value['previous_filename'];

  if (typeof filename !== 'string' || filename.length === 0) {
    return null;
  }

  if (previous !== undefined && previous !== null && typeof previous !== 'string') {
    return null;
  }

  const patch = value['patch'];

  if (patch !== undefined && patch !== null && typeof patch !== 'string') {
    return null;
  }

  const previousFilename = typeof previous === 'string' && previous.length > 0 ? previous : null;

  return {filename, previousFilename, patch: typeof patch === 'string' ? patch : null};
}

function filePaths(file: GitHubChangedFile): string[] {
  if (file.previousFilename) {
    return [file.filename, file.previousFilename];
  }

  return [file.filename];
}
