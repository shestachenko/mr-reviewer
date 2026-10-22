import cors from '@fastify/cors';
import Fastify from 'fastify';

import {createGitHubMr} from './adapter/github/mr.js';
import {createGitHubMrMeaning} from './adapter/github/mr-meaning.js';
import {createGitHubPullSource} from './adapter/github/pulls.js';
import {createHealthAdapter} from './adapter/health.js';
import {registerHealth} from './http/health.js';
import {registerListPulls} from './http/list-pulls.js';
import {registerMr} from './http/mr.js';
import {registerMrMeaning} from './http/mr-meaning.js';

function createConfig() {
  return {
    port: Number(process.env['PORT'] ?? 3000),
    host: process.env['HOST'] ?? '::',
    corsOrigins: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    github: {
      owner: 'shestachenko',
      name: 'openspec-run',
      token: process.env['GITHUB_TOKEN'],
    },
  };
}

export async function build() {
  const config = createConfig();
  const app = Fastify({logger: true});

  await app.register(cors, {
    origin: config.corsOrigins,
  });

  registerHealth(app, createHealthAdapter());
  registerListPulls(app, createGitHubPullSource(config.github));
  registerMr(app, createGitHubMr(config.github));
  registerMrMeaning(app, createGitHubMrMeaning(config.github));

  return {app, config};
}
