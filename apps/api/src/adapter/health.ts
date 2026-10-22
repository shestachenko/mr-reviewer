import type {HealthPort} from '../usecase/health.port.js';

export function createHealthAdapter(): HealthPort {
  return {
    check() {
      return {ok: true};
    },
  };
}
