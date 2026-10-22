export interface HealthPort {
  check(): {ok: boolean};
}
