import type {FastifyInstance} from 'fastify';

import {checkHealth} from '../usecase/health.js';

export function registerHealth(app: FastifyInstance) {
  app.get('/health', () => checkHealth());
}
