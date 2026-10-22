import cors from '@fastify/cors';
import Fastify from 'fastify';

import {createGitHubPullLookup} from './adapter/github/pull.js';
import {createGitHubPullSource} from './adapter/github/pulls.js';
import {createHealthAdapter} from './adapter/health.js';
import {registerFindPull} from './http/find-pull.js';
import {registerHealth} from './http/health.js';
import {registerListPulls} from './http/list-pulls.js';

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
  registerFindPull(app, createGitHubPullLookup(config.github));

  return {app, config};
}
