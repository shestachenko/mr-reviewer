# Architecture

This is Clean Architecture. Dependencies point inward. A handler calls a usecase. A usecase calls a port. An adapter implements that port. Domain code has no HTTP and no database.

The API lives in `apps/api`. The `src/` tree below is `apps/api/src/`. The entry files there are `server.ts` and `app.ts`, the names in this layout.

The web app is Angular. Its entry stays `apps/web/src/main.ts`. Its composition stays in `apps/web/src/app/app.config.ts`. The web app is not this layout.

## Handler

The handler accepts the HTTP request, checks its shape, normalizes the data, and passes a plain object to one usecase. One handler calls one usecase. The handler maps the usecase result back to a status and JSON, including errors. A missing entity comes back from the usecase as its own error. The handler turns that error into 404.

## Usecase

A usecase performs one application action. It calls ports, assembles the result, and returns it. It does not know the HTTP framework.

The usecase and its port share one folder, `usecase/<action>/`. The files are `<action>.ts` and `<action>.port.ts`.

## Port and adapter

The port is the interface the usecase owns. The adapter is the only code that knows SQL, an HTTP client, or the shape of a remote API. Several usecases may call the same port and then share one adapter.

The GitHub client stores a successful response, and a not-found response, in `.cache/github`. The next call reads that file. The file stays until it is deleted. A rate limit or another failure is not stored, so the next call tries GitHub again.

## Domain

Domain is the core: entities and rules. It does not import the HTTP framework, a database client, or an HTTP client.

## Composition

`apps/api/src/app.ts` is the composition root. It creates config, the logger, connections, and adapters, passes them inward, and calls `http/router.ts`. `apps/api/src/server.ts` only listens. `app.ts` does not contain an action and does not register a route.

`http/router.ts` registers every route. A file in `http/` is the handler for one route in that router. A file with no route does not belong in `http/`.

The `:number` check is `pullNumber` in `domain/pull-request.ts`. The handlers for `GET /pulls/:number` and `GET /pulls/:number/meaning` use it. It stays out of `http/` because it is not a route.

`GET /health` is `http/health.ts`, `usecase/health/health.ts`, `usecase/health/health.port.ts`, and `adapter/health.ts`. The health adapter reports that the process is up.

`GET /pulls` is `http/list-pulls.ts`, `usecase/list-pulls/list-pulls.ts`, `usecase/list-pulls/list-pulls.port.ts`, and `adapter/github/pulls.ts`. The usecase asks the port for the list and sets each pull's state in `domain/pull-request.ts`. The adapter reads GitHub. A GitHub failure comes back from the usecase as its own error. The handler turns that error into 502.

`GET /pulls/:number` is `http/pull.ts`, `usecase/pull/pull.ts`, `usecase/pull/pull.port.ts`, and `adapter/github/pull.ts`. The usecase asks the port for that pull and sets its state in `domain/pull-request.ts`. A missing pull comes back from the usecase as its own error. The handler turns that error into 404. A GitHub failure comes back from the usecase as its own error. The handler turns that error into 502. A number that is not a pull request number comes back as 400.

`GET /pulls/:number/meaning` is `http/pull-meaning.ts`, `usecase/pull-meaning/pull-meaning.ts`, `usecase/pull-meaning/pull-meaning.port.ts`, and `adapter/github/pull-meaning.ts`. The usecase asks the port for the changed paths and the OpenSpec files in the one change folder, including a change kept under `openspec/changes/archive/<name>/`. `domain/meaning.ts` decides whether the walkthrough opens and quotes the task, the requirement names, the scenario criteria, and any assumptions section from that change. A missing pull comes back from the usecase as its own error. The handler turns that error into 404. A GitHub failure comes back from the usecase as its own error. The handler turns that error into 502. A number that is not a pull request number comes back as 400. No change folder, or several, comes back as 200 and says why the walkthrough stays closed.


## Shared code

Shared code is a port or a domain service that more than one usecase uses. A shared folder appears only when that code exists. The test is the dependency direction: shared code still points inward.

## Layout

One action adds a route in `http/router.ts` and four files: handler, usecase, port, adapter. The handler file is added because that route exists. Use this shape, with `order` as the example of one action:

```
src/
  server.ts
  app.ts
  http/
    router.ts
    order.ts
  usecase/
    order/
      order.ts
      order.port.ts
  domain/
    order.ts
  adapter/
    db/
      order-sql.ts
```

A folder appears with the first file that belongs in it.
