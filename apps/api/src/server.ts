import cors from '@fastify/cors';
import Fastify from 'fastify';

import {listPullRequests} from './pulls.js';

const app = Fastify({logger: true});

await app.register(cors, {
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
});

app.get('/health', () => ({ok: true}));

app.get('/pulls', async (_request, reply) => {
  try {
    return await listPullRequests();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub request failed.';
    app.log.error(message);

    return reply.code(502).send({error: 'github'});
  }
});

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '::';

await app.listen({port, host});
