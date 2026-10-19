import cors from '@fastify/cors';
import Fastify from 'fastify';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
});

app.get('/health', async () => ({ ok: true }));

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '::';

await app.listen({ port, host });
