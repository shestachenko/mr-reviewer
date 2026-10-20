import cors from '@fastify/cors';
import Fastify from 'fastify';

import {registerHealth} from './http/health.js';

export async function build() {
  const app = Fastify({logger: true});

  await app.register(cors, {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  });

  registerHealth(app);

  return app;
}
