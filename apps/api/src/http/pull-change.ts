import type {FastifyReply, FastifyRequest} from 'fastify';

import {pullNumber} from '../domain/pull-request.js';
import {pullChange, PullChangeFailed, PullChangeNotFound} from '../usecase/pull-change/pull-change.js';
import type {PullChangeSource} from '../usecase/pull-change/pull-change.port.js';

interface PullParams {
  number: string;
}

export async function getPullChange(
  source: PullChangeSource,
  request: FastifyRequest<{Params: PullParams}>,
  reply: FastifyReply,
) {
  const number = pullNumber(request.params.number);

  if (number === null) {
    return reply.code(400).send({error: 'number'});
  }

  try {
    return await pullChange(source, number);
  } catch (error) {
    if (error instanceof PullChangeNotFound) {
      return reply.code(404).send({error: 'pull'});
    }

    if (error instanceof PullChangeFailed) {
      request.log.error(error.message);

      return reply.code(502).send({error: 'github'});
    }

    throw error;
  }
}
