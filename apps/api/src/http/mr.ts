import type {FastifyInstance} from 'fastify';

import {mr, MrFailed, MrNotFound} from '../usecase/mr.js';
import type {MrSource} from '../usecase/mr.port.js';

import {pullNumber} from './pull-number.js';

interface MrParams {
  number: string;
}

export function registerMr(app: FastifyInstance, source: MrSource) {
  app.get<{Params: MrParams}>('/pulls/:number', async (request, reply) => {
    const number = pullNumber(request.params.number);

    if (number === null) {
      return reply.code(400).send({error: 'number'});
    }

    try {
      return await mr(source, number);
    } catch (error) {
      if (error instanceof MrNotFound) {
        return reply.code(404).send({error: 'pull'});
      }

      if (error instanceof MrFailed) {
        app.log.error(error.message);

        return reply.code(502).send({error: 'github'});
      }

      throw error;
    }
  });
}
