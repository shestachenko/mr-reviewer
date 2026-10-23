import cors from '@fastify/cors';
import Fastify from 'fastify';

import {createGitHubPull} from './adapter/github/pull.js';
import {createGitHubPullMap} from './adapter/github/pull-map.js';
import {createGitHubPullMeaning} from './adapter/github/pull-meaning.js';
import {createGitHubPullSource} from './adapter/github/pulls.js';
import {createHealthAdapter} from './adapter/health.js';
import {router} from './http/router.js';

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

  router(app, {
    health: createHealthAdapter(),
    pulls: createGitHubPullSource(config.github),
    pull: createGitHubPull(config.github),
    map: createGitHubPullMap(config.github),
    meaning: createGitHubPullMeaning(config.github),
  });

  return {app, config};
}
