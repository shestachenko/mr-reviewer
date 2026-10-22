import type {FastifyReply, FastifyRequest} from 'fastify';

import {pullNumber} from '../domain/pull-request.js';
import {pull, PullFailed, PullNotFound} from '../usecase/pull/pull.js';
import type {PullSource} from '../usecase/pull/pull.port.js';

interface PullParams {
  number: string;
}

export async function getPull(
  source: PullSource,
  request: FastifyRequest<{Params: PullParams}>,
  reply: FastifyReply,
) {
  const number = pullNumber(request.params.number);

  if (number === null) {
    return reply.code(400).send({error: 'number'});
  }

  try {
    return await pull(source, number);
  } catch (error) {
    if (error instanceof PullNotFound) {
      return reply.code(404).send({error: 'pull'});
    }

    if (error instanceof PullFailed) {
      request.log.error(error.message);

      return reply.code(502).send({error: 'github'});
    }

    throw error;
  }
}
