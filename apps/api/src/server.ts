import {build} from './app.js';
import {listPullRequests} from './pulls.js';

const app = await build();

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
