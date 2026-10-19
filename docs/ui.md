# UI

Screens follow this design. Colors, fonts, and distances are the custom properties in `apps/web/src/styles.css`. A new screen uses those properties.

## Surface

The page is light paper, `--bg`. A panel is `--surface` with a 1px `--border`. There is no gradient and no shadow.

## Type

UI text is `--text` in `--font`. Secondary text is `--muted`. A hunk, a quote, and a file path use `--mono`.

A page title is 1.5rem and weight 600. A section title is 1.125rem and weight 600. Body is 1rem with line-height 1.5.

## Color

`--accent` is the only accent: the current step, a link, and the one primary button.

`--accept` is only an accept. `--reject` is only a reject. A comment stays `--text`.

The word is there with the color. Color is not the only sign.

## Layout

One column. Prose stays within `--read`. A list and a diff may go to `--wide`.

Distance comes from `--space-1` through `--space-6`.

A list is rows separated by `--border`. It is not a grid of cards.

One primary button on a screen. Its fill is `--accent`, its label is `--surface`, and its corners are `--radius`. Any other action is `--accent` text on no fill.

The interface copy is Russian. OpenSpec and markdown stay in the language of those files.

## States

The current step uses `--accent`. A step not reached yet uses `--muted`. An accept uses `--accept`. A reject uses `--reject`. A blocked walkthrough is an ordinary panel that says why.

A keyboard focus ring is 2px `--accent`, offset by 2px.
