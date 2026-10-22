import cors from '@fastify/cors';
import type {FastifyInstance} from 'fastify';
import Fastify from 'fastify';

import {createHealthAdapter} from './adapter/health.js';
import {registerHealth} from './http/health.js';
import {listPullRequests} from './pulls.js';

function createConfig() {
  return {
    port: Number(process.env['PORT'] ?? 3000),
    host: process.env['HOST'] ?? '::',
    corsOrigins: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  };
}

export async function build() {
  const config = createConfig();
  const app = Fastify({logger: true});

  await app.register(cors, {
    origin: config.corsOrigins,
  });

  registerHealth(app, createHealthAdapter());
  registerPulls(app);

  return {app, config};
}

function registerPulls(app: FastifyInstance) {
  app.get('/pulls', async (_request, reply) => {
    try {
      return await listPullRequests();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub request failed.';
      app.log.error(message);

      return reply.code(502).send({error: 'github'});
    }
  });
}
