import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export interface GitHubRepository {
  owner: string;
  name: string;
  token: string | undefined;
}

const cacheDirectory = fileURLToPath(new URL('../../../../.cache/github/', import.meta.url));

interface CachedResponse {
  status: number;
  body: string;
}

const pending = new Map<string, Promise<CachedResponse>>();

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

export async function githubFetch(
  repository: GitHubRepository,
  url: string | URL,
  headers: Record<string, string> = githubHeaders(repository.token),
): Promise<Response> {
  const requestUrl = url instanceof URL ? url.toString() : url;
  const cached = await load(cacheKey(requestUrl, headers), requestUrl, headers);

  return new Response(cached.body, {status: cached.status});
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function load(key: string, url: string, headers: Record<string, string>): Promise<CachedResponse> {
  const existing = pending.get(key);

  if (existing) {
    return existing;
  }

  const request = readOrFetch(key, url, headers).finally(() => {
    pending.delete(key);
  });
  pending.set(key, request);

  return request;
}

async function readOrFetch(key: string, url: string, headers: Record<string, string>): Promise<CachedResponse> {
  const cached = await readCache(key);

  if (cached) {
    return cached;
  }

  const response = await fetch(url, {headers});
  const body = await response.text();
  const stored = {status: response.status, body};

  if (response.ok || response.status === 404) {
    await writeCache(key, stored);
  }

  return stored;
}

function cacheKey(url: string, headers: Record<string, string>): string {
  const accept = headers['accept'] ?? '';

  return createHash('sha256').update(`${accept}\n${url}`).digest('hex');
}

function cachePath(key: string): string {
  return join(cacheDirectory, `${key}.txt`);
}

async function readCache(key: string): Promise<CachedResponse | null> {
  try {
    return decodeCache(await readFile(cachePath(key), 'utf8'));
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

async function writeCache(key: string, cached: CachedResponse): Promise<void> {
  await mkdir(cacheDirectory, {recursive: true});
  await writeFile(cachePath(key), `${String(cached.status)}\n${cached.body}`, 'utf8');
}

function decodeCache(text: string): CachedResponse | null {
  const newline = text.indexOf('\n');

  if (newline < 1) {
    return null;
  }

  const status = Number(text.slice(0, newline));
  const body = text.slice(newline + 1);

  if (!Number.isInteger(status) || status < 100 || status > 599) {
    return null;
  }

  return {status, body};
}

function isNotFound(error: unknown): boolean {
  return isRecord(error) && error['code'] === 'ENOENT';
}
