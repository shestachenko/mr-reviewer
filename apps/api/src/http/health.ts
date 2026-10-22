import type {FastifyInstance} from 'fastify';

import {checkHealth} from '../usecase/health.js';
import type {HealthPort} from '../usecase/health.port.js';

export function registerHealth(app: FastifyInstance, health: HealthPort) {
  app.get('/health', () => checkHealth(health));
}
