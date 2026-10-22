import type {FastifyInstance} from 'fastify';

import {findPull, FindPullFailed, PullNotFound} from '../usecase/find-pull.js';
import type {PullLookup} from '../usecase/find-pull.port.js';

interface PullParams {
  number: string;
}

export function registerFindPull(app: FastifyInstance, lookup: PullLookup) {
  app.get<{Params: PullParams}>('/pulls/:number', async (request, reply) => {
    const number = pullNumber(request.params.number);

    if (number === null) {
      return reply.code(400).send({error: 'number'});
    }

    try {
      return await findPull(lookup, number);
    } catch (error) {
      if (error instanceof PullNotFound) {
        return reply.code(404).send({error: 'pull'});
      }

      if (error instanceof FindPullFailed) {
        app.log.error(error.message);

        return reply.code(502).send({error: 'github'});
      }

      throw error;
    }
  });
}

function pullNumber(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number)) {
    return null;
  }

  return number;
}
