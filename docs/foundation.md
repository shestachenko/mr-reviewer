# MR Reviewer

MR Reviewer is a dashboard for reviewing one GitHub pull request in small steps. The reviewer should not have to hold the whole diff in their head. The meaning of the change comes from OpenSpec, not from the diff. Project markdown can add context, but it does not override the spec.

The first version is built from scratch: GitHub, OpenSpec, markdown, both graphs, the unit split, the walkthrough, a relational database, and publishing the review.

## Who is reviewing

Anyone with access to the dashboard can review. It does not matter who opened the pull request or who wrote the code. The reviewer signs in with their own GitHub account, picks a pull request from the list of pull requests they can read, and publishes the review with that same account.

This version has one reviewer for a pull request. A second reviewer on the same pull request is left for later.

The reviewer can leave a review and open another one. Leaving does not publish anything. The step, the verdicts, and the draft comments stay in the database, so the same review can be continued. GitHub is only where the finished review is published.

## When the walkthrough opens

The walkthrough opens only when the diff contains exactly one `openspec/changes/<name>/` folder. A finished change kept under `openspec/changes/archive/<name>/` is still that one folder.

If that folder is missing, the walkthrough does not open. If the diff contains several change folders, that is a bad pull request and the walkthrough does not open either. In both cases the dashboard says why, and it writes nothing to GitHub.

A change with `skip_specs: true` still opens. The folder is there, and the missing behavior contract is intentional. The first step says that plainly.

## The five steps

1. **Meaning.** Why this change exists, taken from the OpenSpec change and from the project's markdown.
2. **Project map.** A graph of the whole project, with the changed part highlighted.
3. **Change map.** A closer graph of this change only.
4. **Units.** One small bundle at a time. On each bundle the reviewer can accept it, reject it, or write a comment.
5. **Finish.** A closing summary and a button that ends the review. The button publishes both a GitHub review, with a status and line comments, and a separate message on the pull request.

Steps 2 and 3 only show where the change sits. The verdict happens on step 4. Nothing is written to GitHub before step 5.

The reviewer may know nothing about the system or this pull request. Step 1 has to teach the change without relying on the author's memory. A claim on step 1 quotes `proposal.md` or a requirement. A claim about code quotes a hunk. A sentence with no quote is marked as a retelling.

The route is prepared before the reviewer starts giving verdicts, and that snapshot is stored with the session. Coming back does not build a new route under them.

## How a unit is cut

A unit is one small, logically connected bundle of changes in this pull request. Its claim is one `### Requirement:` in the change's delta spec.

A capability is not a unit. Capabilities are the map on step 3. A scenario is not a unit either. It stays on the unit card as an example of the same behavior.

The diff does not decide what the unit is about. The hunks are only the code attached to that requirement. The reviewer decides one thing: this bundle does what the requirement says.

The bundles come in this order:

1. Shared code that the later requirements cannot be read without. Those lines appear once, not again inside every unit.
2. The requirements in spec order. `MODIFIED` and `ADDED` each become a bundle. A `REMOVED` requirement is its own bundle: did the behavior go away, and are Reason and Migration present.
3. Hunks that match no requirement. These are bundles marked outside the spec, at the end. A person judges them. The product does not reject them by itself.
4. Noise, such as formatting and mass renames, in its own bundles after that.

If one requirement carries too much diff, it is split by its scenarios or by items in `tasks.md`. Each part still shows the same requirement. The scenario or the task item is only the subtitle. The claim stays the same. The pile of code gets smaller.

`tasks.md`, and the Impact section of `proposal.md` or `design.md`, are used to attach files to a requirement. The attachment is a heuristic. Anything that does not attach is kept and shown as outside the spec.

When `skip_specs: true`, there are no requirements to cut by. The bundles follow the items in `tasks.md`.

For example, a change `add-password-reset` has a requirement "The reset link expires after 15 minutes." That unit shows this requirement and the hunks in the token checker. The email template belongs to a later requirement, so it is not part of this unit.

## Where the meaning comes from

Current behavior lives in `openspec/specs/<capability>/spec.md`.

The change under review is one folder, `openspec/changes/<change>/`. `proposal.md` supplies the first step: Why, What Changes, Capabilities, and Impact. The delta specs under `specs/<capability>/spec.md` supply the requirements the units are cut from: `ADDED`, `MODIFIED`, and `REMOVED`, with their scenarios. `design.md` explains how the change is built and supports step 3. It may be absent. `tasks.md` is the checklist used to split a requirement that is too big, and it is the only cutting axis when `skip_specs: true`. `.openspec.yaml` holds the change metadata, including `skip_specs`.

Project `*.md` files explain how the repository describes itself. Where they disagree with OpenSpec, step 1 follows OpenSpec.

## Not settled

The database engine is not chosen. The working assumption is PostgreSQL.

The GitHub review status is not chosen. The working assumption is: any reject becomes request changes, comments with no reject become a neutral comment, and a clean accept becomes approve. The pull request message is always sent and summarizes the outcome.

How the two graphs are built is not chosen. The working assumption is that step 2 uses capabilities from `openspec/specs/` and modules from the repository tree, highlighting the capabilities and modules this change touches. Step 3 uses the change's capabilities, the decisions in `design.md`, and the diff files grouped into the same units. A verdict is not given from a graph.

The interface language is not chosen. The working assumption is English for the interface, with the OpenSpec and markdown text left in the language of those files.

## Not in this version

The dashboard does not generate or edit code, and it does not merge. One sitting does not cover several pull requests. GitLab, self-hosted GitHub, custom OpenSpec schemas, and project docs other than markdown are out.
