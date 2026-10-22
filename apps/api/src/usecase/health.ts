import type {HealthPort} from './health.port.js';

export function checkHealth(health: HealthPort) {
  return health.check();
}
