import type {FastifyReply, FastifyRequest} from 'fastify';

import {listPullRequests, ListPullsFailed} from '../usecase/list-pulls/list-pulls.js';
import type {PullSource} from '../usecase/list-pulls/list-pulls.port.js';

export async function listPulls(source: PullSource, request: FastifyRequest, reply: FastifyReply) {
  try {
    return await listPullRequests(source);
  } catch (error) {
    if (error instanceof ListPullsFailed) {
      request.log.error(error.message);

      return reply.code(502).send({error: 'github'});
    }

    throw error;
  }
}
