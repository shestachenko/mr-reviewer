# Architecture

This is Clean Architecture. Dependencies point inward. A handler calls a usecase. A usecase calls a port. An adapter implements that port. Domain code has no HTTP and no database.

The API lives in `apps/api`. The `src/` tree below is `apps/api/src/`. The entry files there are `server.ts` and `app.ts`, the names in this layout.

The web app is Angular. Its entry stays `apps/web/src/main.ts`. Its composition stays in `apps/web/src/app/app.config.ts`. The web app is not this layout.

## Handler

The handler accepts the HTTP request, checks its shape, normalizes the data, and passes a plain object to one usecase. One handler calls one usecase. The handler maps the usecase result back to a status and JSON, including errors. A missing entity comes back from the usecase as its own error. The handler turns that error into 404.

## Usecase

A usecase performs one application action. It calls ports, assembles the result, and returns it. It does not know the HTTP framework.

## Port and adapter

The port is the interface the usecase owns. The adapter is the only code that knows SQL, an HTTP client, or the shape of a remote API. Several usecases may call the same port and then share one adapter.

## Domain

Domain is the core: entities and rules. It does not import the HTTP framework, a database client, or an HTTP client.

## Composition

`apps/api/src/app.ts` is the composition root. It creates config, the logger, connections, and adapters, passes them inward, and registers handlers. `apps/api/src/server.ts` only listens. `app.ts` does not contain an action.

`GET /health` is `http/health.ts`, `usecase/health.ts`, `usecase/health.port.ts`, and `adapter/health.ts`. The health adapter reports that the process is up.

`GET /pulls` is `http/list-pulls.ts`, `usecase/list-pulls.ts`, `usecase/list-pulls.port.ts`, and `adapter/github/pulls.ts`. The usecase asks the port for the list and sets each pull's state in `domain/pull-request.ts`. The adapter reads GitHub. A GitHub failure comes back from the usecase as its own error. The handler turns that error into 502.

`GET /pulls/:number` is `http/find-pull.ts`, `usecase/find-pull.ts`, `usecase/find-pull.port.ts`, and `adapter/github/pull.ts`. The usecase asks the port for that pull and sets its state in `domain/pull-request.ts`. A missing pull comes back from the usecase as its own error. The handler turns that error into 404. A GitHub failure comes back from the usecase as its own error. The handler turns that error into 502. A number that is not a pull request number comes back as 400.

## Shared code

Shared code is a port or a domain service that more than one usecase uses. A shared folder appears only when that code exists. The test is the dependency direction: shared code still points inward.

## Layout

One action adds four files: handler, usecase, port, adapter. Use this shape, with `find-order` as the example of one action:

```
src/
  server.ts
  app.ts
  http/
    find-order.ts
  usecase/
    find-order.ts
    find-order.port.ts
  domain/
    order.ts
  adapter/
    db/
      order-sql.ts
```

A folder appears with the first file that belongs in it.
