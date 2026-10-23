import {type PullMapSource, PullMapSourceError} from '../../usecase/pull-map/pull-map.port.js';

import {githubFetch, githubHeaders, type GitHubRepository, githubRepoUrl, isRecord} from './client.js';

const perPage = 100;

interface GitHubChangedFile {
  filename: string;
  previousFilename: string | null;
  patch: string | null;
}

export function createGitHubPullMap(repository: GitHubRepository): PullMapSource {
  return {
    async read(number) {
      const sha = await fetchHeadSha(repository, number);

      if (!sha) {
        return null;
      }

      const [files, tree] = await Promise.all([listFiles(repository, number), listTree(repository, sha)]);

      return {
        paths: files.flatMap(filePaths),
        patches: files.flatMap(filePatch),
        tree,
        read(path) {
          return readText(repository, sha, path);
        },
      };
    },
  };
}

async function fetchHeadSha(repository: GitHubRepository, number: number): Promise<string | null> {
  const response = await githubFetch(repository, githubRepoUrl(repository, `pulls/${String(number)}`));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new PullMapSourceError(`GitHub responded ${String(response.status)}.`);
  }

  const sha = readHeadSha(await response.json());

  if (!sha) {
    throw new PullMapSourceError('GitHub returned a pull request the page cannot read.');
  }

  return sha;
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
    throw new PullMapSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return response.text();
}

async function fetchFiles(repository: GitHubRepository, number: number, page: number): Promise<GitHubChangedFile[]> {
  const url = new URL(githubRepoUrl(repository, `pulls/${String(number)}/files`));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));

  const response = await githubFetch(repository, url);

  if (!response.ok) {
    throw new PullMapSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return readFiles(await response.json());
}

async function listTree(repository: GitHubRepository, commitSha: string): Promise<string[]> {
  const treeSha = await fetchTreeSha(repository, commitSha);
  const url = new URL(githubRepoUrl(repository, `git/trees/${treeSha}`));
  url.searchParams.set('recursive', '1');

  const response = await githubFetch(repository, url);

  if (!response.ok) {
    throw new PullMapSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return readTree(await response.json());
}

async function fetchTreeSha(repository: GitHubRepository, commitSha: string): Promise<string> {
  const response = await githubFetch(repository, githubRepoUrl(repository, `git/commits/${commitSha}`));

  if (!response.ok) {
    throw new PullMapSourceError(`GitHub responded ${String(response.status)}.`);
  }

  const sha = readTreeSha(await response.json());

  if (!sha) {
    throw new PullMapSourceError('GitHub returned a commit the page cannot read.');
  }

  return sha;
}

function readHeadSha(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const head = value['head'];

  if (!isRecord(head)) {
    return null;
  }

  return readSha(head['sha']);
}

function readTreeSha(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const tree = value['tree'];

  if (!isRecord(tree)) {
    return null;
  }

  return readSha(tree['sha']);
}

function readSha(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/i.test(value)) {
    return null;
  }

  return value;
}

function readFiles(value: unknown): GitHubChangedFile[] {
  if (!Array.isArray(value)) {
    throw new PullMapSourceError('GitHub did not return a list.');
  }

  return value.map((item) => {
    const file = readFile(item);

    if (!file) {
      throw new PullMapSourceError('GitHub returned a file the page cannot read.');
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

function filePatch(file: GitHubChangedFile): string[] {
  if (file.patch) {
    return [file.patch];
  }

  return [];
}

function filePaths(file: GitHubChangedFile): string[] {
  if (file.previousFilename) {
    return [file.filename, file.previousFilename];
  }

  return [file.filename];
}

function readTree(value: unknown): string[] {
  if (!isRecord(value)) {
    throw new PullMapSourceError('GitHub did not return a tree.');
  }

  if (value['truncated'] === true) {
    throw new PullMapSourceError('GitHub truncated the repository tree.');
  }

  const tree = value['tree'];

  if (!Array.isArray(tree)) {
    throw new PullMapSourceError('GitHub did not return a tree.');
  }

  const paths: string[] = [];

  for (const item of tree) {
    const path = readBlobPath(item);

    if (path) {
      paths.push(path);
    }
  }

  return paths;
}

function readBlobPath(value: unknown): string | null {
  if (!isRecord(value)) {
    throw new PullMapSourceError('GitHub returned a tree entry the page cannot read.');
  }

  const type = value['type'];
  const path = value['path'];

  if ((type !== 'blob' && type !== 'tree' && type !== 'commit') || typeof path !== 'string') {
    throw new PullMapSourceError('GitHub returned a tree entry the page cannot read.');
  }

  if (type !== 'blob' || path.length === 0) {
    return null;
  }

  return path;
}
