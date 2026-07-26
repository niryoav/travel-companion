# Sprint 2: UI foundation

## Goal

Establish a reusable, accessible visual foundation for Travel Companion without
introducing travel data, integrations, or business logic.

## User Value

Travelers receive a calm and predictable mobile shell whose destinations and
visual language remain consistent as later features are introduced.

## Scope

Build the shared design-system primitives and placeholder experience for the
approved navigation: Home, Today, Trip, Documents, and More.

## Deliverables

- Design system foundations
- Responsive app shell
- Safe-area-aware bottom navigation
- Placeholder Home screen
- Placeholder Today screen
- Placeholder Trip screen
- Placeholder Documents screen
- Placeholder More screen
- Reusable components
- Status badges
- Light mode
- Dark mode

## Acceptance Criteria

- [ ] The five approved destinations are reachable through bottom navigation.
- [ ] Home remains approximately one phone-screen height at common mobile sizes.
- [ ] All screens use placeholder content only.
- [ ] Shared visual patterns use reusable components rather than page-specific
      copies.
- [ ] Status badges communicate meaning without relying on color alone.
- [ ] Light and dark modes have readable contrast and equivalent hierarchy.
- [ ] Layouts are mobile-first, responsive, and safe-area aware.
- [ ] Navigation and interactive controls are keyboard accessible and have clear
      accessible names.
- [ ] TypeScript strict mode, existing tests, lint, and production build pass.
- [ ] Appropriate tests cover new reusable components.

## Technical Notes

- Follow `docs/architecture.md` and ADR-001.
- Keep reusable UI in `src/components/` and screen composition in
  `src/features/`.
- Keep components focused on presentation; do not add travel-domain models or
  business rules.
- Do not call browser storage from UI components.
- Existing Sprint 1 theme behavior may be reused, but Sprint 2 adds no new
  persistence.

## UX Notes

- Home is a concise briefing preview, not a complete dashboard.
- Today remains a distinct destination and always represents the current day once
  real data is introduced.
- Use calm hierarchy, large touch targets, restrained cards, and short placeholder
  copy.
- Status must be expressed with text and visual form, not color alone.
- Preserve the approved navigation order: Home, Today, Trip, Documents, More.

## Out of Scope

- AI
- APIs
- Weather integration
- Search
- Notifications
- New persistence
- Expense logic
- Packing logic
- Travel-domain calculations or live trip data

## Testing

- Unit or component tests for reusable components where behavior or variants
  warrant coverage.
- Navigation and theme regression tests.
- Responsive review at representative mobile and wider viewport sizes.
- Keyboard, focus, accessible-name, contrast, and safe-area review.
- Production build verification.

## Review Checklist

- [ ] Only Sprint 2 deliverables are present.
- [ ] Repeated UI patterns use shared components.
- [ ] Home remains concise at mobile height.
- [ ] Light and dark modes are coherent.
- [ ] No live data, integrations, or deferred logic were introduced.
- [ ] Review follows `docs/review-process.md`.

## Definition of Done

- [ ] Acceptance criteria are met.
- [ ] Existing and new tests pass.
- [ ] Lint and production build pass.
- [ ] Mobile, responsive, and accessibility behavior is reviewed.
- [ ] Documentation matches the implementation.
- [ ] Independent review is ready.

## Notes

Sprint 2 establishes presentation and composition only. Later sprints will
introduce real user value incrementally behind the reusable UI foundation.
