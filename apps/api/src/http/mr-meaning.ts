import type {FastifyInstance} from 'fastify';

import {mrMeaning, MrMeaningFailed, MrMeaningNotFound} from '../usecase/mr-meaning.js';
import type {MrMeaningSource} from '../usecase/mr-meaning.port.js';

import {pullNumber} from './pull-number.js';

interface PullParams {
  number: string;
}

export function registerMrMeaning(app: FastifyInstance, source: MrMeaningSource) {
  app.get<{Params: PullParams}>('/pulls/:number/meaning', async (request, reply) => {
    const number = pullNumber(request.params.number);

    if (number === null) {
      return reply.code(400).send({error: 'number'});
    }

    try {
      return await mrMeaning(source, number);
    } catch (error) {
      if (error instanceof MrMeaningNotFound) {
        return reply.code(404).send({error: 'pull'});
      }

      if (error instanceof MrMeaningFailed) {
        app.log.error(error.message);

        return reply.code(502).send({error: 'github'});
      }

      throw error;
    }
  });
}
