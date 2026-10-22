import type {FastifyReply, FastifyRequest} from 'fastify';

import {pullNumber} from '../domain/pull-request.js';
import {pullMeaning, PullMeaningFailed, PullMeaningNotFound} from '../usecase/pull-meaning/pull-meaning.js';
import type {PullMeaningSource} from '../usecase/pull-meaning/pull-meaning.port.js';

interface PullParams {
  number: string;
}

export async function getPullMeaning(
  source: PullMeaningSource,
  request: FastifyRequest<{Params: PullParams}>,
  reply: FastifyReply,
) {
  const number = pullNumber(request.params.number);

  if (number === null) {
    return reply.code(400).send({error: 'number'});
  }

  try {
    return await pullMeaning(source, number);
  } catch (error) {
    if (error instanceof PullMeaningNotFound) {
      return reply.code(404).send({error: 'pull'});
    }

    if (error instanceof PullMeaningFailed) {
      request.log.error(error.message);

      return reply.code(502).send({error: 'github'});
    }

    throw error;
  }
}
