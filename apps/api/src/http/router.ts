import type {FastifyInstance} from 'fastify';

import type {HealthPort} from '../usecase/health/health.port.js';
import type {PullSource} from '../usecase/list-pulls/list-pulls.port.js';
import type {PullSource as PullRead} from '../usecase/pull/pull.port.js';
import type {PullMapSource} from '../usecase/pull-map/pull-map.port.js';
import type {PullMeaningSource} from '../usecase/pull-meaning/pull-meaning.port.js';

import {getHealth} from './health.js';
import {listPulls} from './list-pulls.js';
import {getPull} from './pull.js';
import {getPullMap} from './pull-map.js';
import {getPullMeaning} from './pull-meaning.js';

export interface HttpDeps {
  health: HealthPort;
  pulls: PullSource;
  pull: PullRead;
  map: PullMapSource;
  meaning: PullMeaningSource;
}

export function router(app: FastifyInstance, deps: HttpDeps) {
  app.get('/health', () => getHealth(deps.health));

  app.get('/pulls', (request, reply) => listPulls(deps.pulls, request, reply));

  app.get<{Params: {number: string}}>('/pulls/:number', (request, reply) =>
    getPull(deps.pull, request, reply),
  );

  app.get<{Params: {number: string}}>('/pulls/:number/meaning', (request, reply) =>
    getPullMeaning(deps.meaning, request, reply),
  );

  app.get<{Params: {number: string}}>('/pulls/:number/map', (request, reply) =>
    getPullMap(deps.map, request, reply),
  );
}
