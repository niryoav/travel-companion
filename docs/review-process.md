# Review process

Independent review helps Travel Companion remain dependable as it evolves. Its
purpose is to find risks, inconsistencies, and unintended scope growth before a
change is merged—not to add ceremony or redesign approved work.

The reviewer should not be the primary author of the change. The reviewer may be
a person or a separate coding agent with enough context to assess the work
without defending its implementation.

Use this process for sprint deliverables and other meaningful changes. Small
documentation corrections do not need a formal archived review.

## Review package

The author provides:

- the Git diff against the target branch;
- the sprint brief or acceptance criteria;
- new, changed, or relevant Architecture Decision Records (ADRs);
- relevant interfaces touched by the change, including storage, service, domain,
  and component boundaries;
- verification results and known limitations.

The package should be sufficient for a reviewer to understand intent without
reconstructing it from commit history.

## Review categories

Review only the categories relevant to the change, while checking each one for
possible impact:

1. **Consistency with Architecture Decisions** — follows accepted ADRs; any
   departure is explicit and documented.
2. **Architecture** — preserves clear boundaries, data ownership, and dependency
   direction without premature abstraction.
3. **Code Quality** — code is readable, focused, testable, and free from avoidable
   duplication or hidden side effects.
4. **Mobile UX** — primary actions, navigation, accessibility, responsive layout,
   and loading, empty, error, and offline states work on a phone.
5. **PWA** — installation, service-worker updates, caching, deep links, and
   offline behavior remain predictable.
6. **Performance** — bundle size, rendering, storage, network use, and perceived
   responsiveness are proportionate to the feature.
7. **Security** — privacy, secrets, dependencies, input handling, and sensitive
   data exposure have been considered.
8. **Sprint Discipline** — the change meets the brief without pulling later-sprint
   work forward.
9. **Technical Debt Trends** — the change does not repeat workarounds, weaken
   boundaries, or create a pattern that will become expensive over time.

## Finding severity

- **🔴 Blocking** — correctness, security, privacy, data-loss, accessibility, or
  architectural issue that must be resolved before merge.
- **🟡 Recommended** — meaningful improvement that should normally be addressed
  now; it may be deferred only with an owner and a clear reason.
- **🔵 Optional** — non-essential suggestion or future improvement that does not
  affect acceptance.

Findings should identify the evidence, impact, and smallest practical remedy.

## Review score

Score each relevant category from 0 to 4:

| Score | Meaning |
| --- | --- |
| 4 | Strong: complete, clear, and well verified |
| 3 | Good: merge-ready with minor observations |
| 2 | Adequate: notable recommended improvements |
| 1 | Weak: substantial change required |
| 0 | Unacceptable or not demonstrated |

Report the earned score over the maximum for relevant categories and mark
non-relevant categories `N/A`. The score is a summary, not a substitute for
findings: one blocking issue prevents approval regardless of the total.

## Merge recommendation

- **Approve** — no blocking findings; the change is ready to merge.
- **Approve with follow-up** — no blocking findings; documented recommended work
  may follow after merge.
- **Changes requested** — one or more blocking findings must be resolved and
  reviewed again.

The product owner makes the final merge decision.

## Review archive

Archive a completed sprint review at:

```text
docs/reviews/sprint-xx.md
```

Use two digits, such as `sprint-02.md`. Record the reviewed branch or commit,
scope, verification evidence, findings by severity, category scores, merge
recommendation, and accepted follow-ups. Create the archive only when a review
has actually taken place.
