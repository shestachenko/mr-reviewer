# mr-reviewer

MR Reviewer is a dashboard for reviewing one GitHub pull request in small steps.

## Run

```bash
npm install
npm run dev
```

The UI listens on http://localhost:4200. The API listens on http://localhost:3000.

The first screen lists every pull request in `shestachenko/openspec-run`. A click opens that pull request and its first unit.

Code style is in `docs/code-style.md`. Check it with `npm run lint`.

The UI design is in `docs/ui.md`.

Architecture is in `docs/architecture.md`.
