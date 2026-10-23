import type {FastifyReply, FastifyRequest} from 'fastify';

import {pullNumber} from '../domain/pull-request.js';
import {pullMap, PullMapFailed, PullMapNotFound} from '../usecase/pull-map/pull-map.js';
import type {PullMapSource} from '../usecase/pull-map/pull-map.port.js';

interface PullParams {
  number: string;
}

export async function getPullMap(
  source: PullMapSource,
  request: FastifyRequest<{Params: PullParams}>,
  reply: FastifyReply,
) {
  const number = pullNumber(request.params.number);

  if (number === null) {
    return reply.code(400).send({error: 'number'});
  }

  try {
    return await pullMap(source, number);
  } catch (error) {
    if (error instanceof PullMapNotFound) {
      return reply.code(404).send({error: 'pull'});
    }

    if (error instanceof PullMapFailed) {
      request.log.error(error.message);

      return reply.code(502).send({error: 'github'});
    }

    throw error;
  }
}
