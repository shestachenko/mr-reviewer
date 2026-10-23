# mr-reviewer

MR Reviewer is a dashboard for reviewing one GitHub pull request in small steps.

## Run

```bash
npm install
npm run dev
```

The UI listens on http://localhost:4200. The API listens on http://localhost:3000. It sends `GITHUB_TOKEN` to GitHub. Without that variable GitHub allows 60 requests an hour, and after that the pull request page does not load.

A GitHub response is written to `.cache/github` and the next call reads that file. Delete the folder when the responses should be fetched again.

The first screen lists every pull request in `shestachenko/openspec-run`. A click opens that pull request on the meaning step. That step quotes the task, the expected behavior, and the acceptance criteria. Recorded assumptions stay separate, and the step can be collapsed. The next step is the project map: each HTTP route, then its handler, usecase, and adapter. A part this change touches says changed.

Code style is in `docs/code-style.md`. Check it with `npm run lint`.

The UI design is in `docs/ui.md`.

Architecture is in `docs/architecture.md`.
