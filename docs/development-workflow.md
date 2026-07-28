# AI-assisted development workflow

This document describes the practical workflow used to move Travel Companion
from a product idea to a reviewed and merged sprint. It complements the
[product vision](product-vision.md), [architecture](architecture.md),
[review process](review-process.md), [sprint template](sprints/template.md), and
[ADR process](decisions/README.md).

## 1. Purpose and principles

The workflow keeps AI-assisted development deliberate, reviewable, and safe:

- Make product decisions before implementation.
- Inspect the repository before changing it.
- Deliver one clearly scoped sprint at a time.
- Prefer small commits that tell an understandable story.
- Keep production data separate from privacy-safe test and review fixtures.
- Use deterministic review states for important phases and edge cases.
- Combine automated verification with human review on a real phone.
- Request an independent pull-request review before merge.
- Resolve concrete findings and reverify before merging.
- Keep documentation, commit history, branches, and ownership boundaries clear.

## 2. Starting a sprint

Start from an updated `main` branch:

```bash
git switch main
git pull
git switch -c codex/sprint-<number>-<name>
```

Run each command separately. This makes failures visible and avoids accidental
command concatenation.

Before continuing, confirm:

```bash
git branch --show-current
git status --short --branch
```

The branch should be based on current `main`, and the working tree should be
clean.

## 3. Planning phase

Codex begins with a read-only planning pass:

1. Inspect the relevant source, tests, configuration, and documentation.
2. Understand the current architecture and data flow.
3. Review the product vision, roadmap, accepted ADRs, sprint documents, and
   existing tests.
4. Propose the sprint goal, user value, scope, and explicit exclusions.
5. Identify product decisions that require approval.
6. Describe data ownership, offline behavior, edge cases, privacy risks, files,
   tests, implementation risks, and commit boundaries.
7. Make no code changes during this phase.

The proposal should be concrete enough for the product owner to evaluate the
experience before implementation details make the direction expensive to
change.

## 4. Product approval

The product owner reviews:

- user value and the decision or action made easier;
- information hierarchy and mobile readability;
- scope size and out-of-scope boundaries;
- privacy and permitted data;
- offline behavior and missing-data treatment;
- canonical data ownership;
- edge cases and deterministic review needs;
- unresolved product or architecture decisions.

Implementation starts only after explicit approval. Approval may refine the
plan, reject unnecessary complexity, or defer unresolved behavior.

## 5. Implementation phase

Implement in small, reviewable layers:

1. Update documentation first when scope or architecture changes.
2. Establish domain contracts and pure selectors before presentation.
3. Add privacy-safe fixtures before integrating real data.
4. Build view models and adapters before UI components.
5. Connect routing and presentation after behavior is tested.
6. Run focused checks after each meaningful step.

Keep commits focused and avoid unrelated refactors or dependencies. Do not push
or merge during implementation.

Typical commit messages include:

```text
docs: define Sprint ...
feat: add ...
feat: connect ...
fix: address ... review findings
```

## 6. Data and privacy rules

- Keep real operational data in one canonical, controlled location.
- Access that data through the approved repository boundary.
- Do not duplicate personal or trip-specific facts in components or tests.
- Use fictional names, places, providers, and dates in tests and review fixtures.
- Never commit passports, identity details, payment data, full booking
  references, private phone numbers, QR codes, barcodes, medical data,
  credentials, account-access links, or unapproved private documents.
- Include a private operational location or accommodation identifier only when
  the product owner explicitly supplies and approves it for offline use. Keep
  it in the canonical trip configuration and do not duplicate it in fixtures,
  components, or general documentation.
- Confirm the GitHub repository is private before adding approved real
  operational data.

If an external reviewer cannot access a private repository, any temporary public
review window must be explicitly approved, tightly controlled, and as short as
possible. Return the repository to private immediately after review. A safer
private review method should replace temporary public exposure when available.

Treat a private repository as though it could still be exposed one day. See
[ADR-002](decisions/ADR-002-trip-data-ownership-and-time.md) for the current trip
data and time-ownership decision.

## 7. Deterministic review states

Query-based review states make time-sensitive UI reproducible:

```text
/home?phase=port-day
/today?state=port-day-late
```

Review states must:

- use privacy-safe fixture data;
- produce deterministic output independent of the current clock;
- remain separate from production data and behavior;
- fall back safely when a value is unsupported;
- be wired end-to-end through the accepted union, parser, fixture, and route;
- have regression tests;
- cover important phases, missing-data cases, boundaries, and time-of-day
  variants.

Creating a fixture is not sufficient: the exact URL used for review must be
tested.

## 8. Automated verification

Run the repository's complete checks before declaring a sprint ready:

```bash
npm test
npx tsc -b --pretty false
npm run lint
npm run build
git diff --check
git status --short --branch
```

Also:

- inspect the generated web manifest and Workbox precache;
- confirm required offline assets are present and dead assets are absent;
- run a scoped privacy scan for prohibited or duplicated real data;
- confirm the working tree is clean after commits.

Report exact test counts, build results, precache results, commit hashes, and
branch status. Results must come from commands that another reviewer can run,
not from assumptions or previous runs.

## 9. Manual mobile review

Review the production build or approved review routes on an actual phone:

- readability without excessive zooming;
- contrast and information hierarchy;
- iPhone safe areas and bottom-navigation spacing;
- scrolling and screen length;
- navigation and touch targets;
- deterministic review-state behavior;
- useful rendering with connectivity unavailable;
- absence of duplicated, stale, or invented information;
- PWA installation, launch, and icon behavior when relevant.

Manual approval happens before push and pull-request creation. Record the device
review outcome in the final implementation report and PR description.

## 10. Push and pull request

After automated and mobile approval:

```bash
git push -u origin codex/sprint-<number>-<name>
```

Open a pull request against `main`. Include:

- sprint summary and user value;
- important architecture and data-ownership changes;
- files or interfaces that deserve focused review;
- automated verification results;
- privacy and PWA results;
- manual mobile-review status;
- known limitations.

Do not merge immediately. Confirm the local branch and origin are synchronized,
the PR head matches the intended commit, and the working tree is clean.

## 11. Independent review

The current independent review is performed by Claude:

1. Compare the PR branch with `main`.
2. Read the sprint brief, relevant ADRs, interfaces, and diff.
3. Run the verification suite independently.
4. Inspect architecture, code, tests, documentation, privacy, mobile UX, and PWA
   behavior.
5. Report each finding with severity, file/location, impact, and recommended
   fix.
6. Conclude with a merge recommendation.

Use the categories and severities in the
[review process](review-process.md). If temporary public access was explicitly
approved for review, make the repository private again immediately afterward.

## 12. Review fixes

- Address only concrete findings from the review.
- Avoid scope expansion, redesign, or opportunistic refactoring.
- Use a focused fix commit.
- Rerun the complete verification suite, PWA checks, and privacy scan.
- Push the fix to the same branch so the existing PR updates.
- Confirm the PR head and checks before merge.

Never merge while blocking findings remain unresolved or while the PR head is
not the verified commit.

## 13. Merge and cleanup

Prefer **Create a merge commit** unless there is a specific reason to preserve a
different history shape. After merge, delete the remote feature branch, then
update and clean the local repository:

```bash
git switch main
git pull
git branch -d codex/sprint-<number>-<name>
```

Use safe branch deletion (`-d`), not forced deletion, so Git can detect an
unmerged branch.

## 14. Starting the next sprint

Begin the next sprint only when:

- the prior PR is merged;
- all review findings are resolved;
- remote and local sprint branches are removed;
- local `main` matches origin;
- the repository is private;
- the working tree is clean.

Then repeat the planning and approval phases rather than carrying assumptions
from the previous sprint directly into implementation.

## 15. Definition of Done

- [ ] Sprint scope and product decisions approved
- [ ] Documentation and ADRs aligned
- [ ] Important behavior and edge cases tested
- [ ] Review fixtures deterministic and privacy-safe
- [ ] Full automated verification green
- [ ] PWA and privacy checks complete
- [ ] Manual phone review approved
- [ ] Pull request independently reviewed
- [ ] Review findings resolved and reverified
- [ ] PR merged
- [ ] Remote and local branches cleaned up
- [ ] Updated `main` and clean working tree confirmed

## 16. Lessons learned

- Run terminal commands separately; accidental concatenation hides which step
  failed and can execute unintended operations.
- Wire review routes end-to-end. A fixture that the parser cannot select is not
  a usable review state.
- iOS may retain an old PWA icon; verifying a replacement can require removing
  and reinstalling the Home Screen shortcut.
- Dead files under `public/` can still enter the Workbox precache even when
  application code no longer references them.
- Run the actual `git diff --check`; do not infer whitespace cleanliness.
- Keep source-controlled production data and review fixtures visibly separate.
- Never infer critical travel facts such as all-aboard, gangway, delay, or shore
  availability.
- One canonical data source prevents components, tests, and screens from
  diverging.
- Manual mobile review catches composition, readability, safe-area, scrolling,
  caching, and hierarchy issues that automated tests cannot.
