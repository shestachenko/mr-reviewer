import {type MrMeaningSource, MrMeaningSourceError} from '../../usecase/mr-meaning.port.js';

import {githubHeaders, type GitHubRepository, githubRepoUrl, isRecord} from './client.js';

const perPage = 100;

interface GitHubChangedFile {
  filename: string;
  previousFilename: string | null;
}

export function createGitHubMrMeaning(repository: GitHubRepository): MrMeaningSource {
  return {
    async read(number) {
      const sha = await fetchHeadSha(repository, number);

      if (!sha) {
        return null;
      }

      const paths = await listPaths(repository, number);

      return {
        paths,
        read(path) {
          return readText(repository, sha, path);
        },
      };
    },
  };
}

async function fetchHeadSha(repository: GitHubRepository, number: number): Promise<string | null> {
  const response = await fetch(githubRepoUrl(repository, `pulls/${String(number)}`), {
    headers: githubHeaders(repository.token),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new MrMeaningSourceError(`GitHub responded ${String(response.status)}.`);
  }

  const sha = readHeadSha(await response.json());

  if (!sha) {
    throw new MrMeaningSourceError('GitHub returned a pull request the page cannot read.');
  }

  return sha;
}

async function listPaths(repository: GitHubRepository, number: number): Promise<string[]> {
  const paths: string[] = [];
  let page = 1;

  for (;;) {
    const files = await fetchFiles(repository, number, page);
    paths.push(...files.flatMap(filePaths));

    if (files.length < perPage) {
      break;
    }

    page += 1;
  }

  return paths;
}

async function fetchFiles(repository: GitHubRepository, number: number, page: number): Promise<GitHubChangedFile[]> {
  const url = new URL(githubRepoUrl(repository, `pulls/${String(number)}/files`));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));

  const response = await fetch(url, {headers: githubHeaders(repository.token)});

  if (!response.ok) {
    throw new MrMeaningSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return readFiles(await response.json());
}

async function readText(repository: GitHubRepository, sha: string, path: string): Promise<string | null> {
  const encoded = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const url = new URL(githubRepoUrl(repository, `contents/${encoded}`));
  url.searchParams.set('ref', sha);
  const headers = githubHeaders(repository.token);
  headers.accept = 'application/vnd.github.raw';

  const response = await fetch(url, {headers});

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new MrMeaningSourceError(`GitHub responded ${String(response.status)}.`);
  }

  return response.text();
}

function readHeadSha(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const head = value['head'];

  if (!isRecord(head)) {
    return null;
  }

  const sha = head['sha'];

  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/i.test(sha)) {
    return null;
  }

  return sha;
}

function readFiles(value: unknown): GitHubChangedFile[] {
  if (!Array.isArray(value)) {
    throw new MrMeaningSourceError('GitHub did not return a list.');
  }

  return value.map((item) => {
    const file = readFile(item);

    if (!file) {
      throw new MrMeaningSourceError('GitHub returned a file the page cannot read.');
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

  const previousFilename = typeof previous === 'string' && previous.length > 0 ? previous : null;

  return {filename, previousFilename};
}

function filePaths(file: GitHubChangedFile): string[] {
  if (file.previousFilename) {
    return [file.filename, file.previousFilename];
  }

  return [file.filename];
}
