import type {FastifyInstance} from 'fastify';

import {listPullRequests, ListPullsFailed} from '../usecase/list-pulls.js';
import type {PullSource} from '../usecase/list-pulls.port.js';

export function registerListPulls(app: FastifyInstance, source: PullSource) {
  app.get('/pulls', async (_request, reply) => {
    try {
      return await listPullRequests(source);
    } catch (error) {
      if (error instanceof ListPullsFailed) {
        app.log.error(error.message);

        return reply.code(502).send({error: 'github'});
      }

      throw error;
    }
  });
}
