import {checkHealth} from '../usecase/health/health.js';
import type {HealthPort} from '../usecase/health/health.port.js';

export function getHealth(health: HealthPort) {
  return checkHealth(health);
}
