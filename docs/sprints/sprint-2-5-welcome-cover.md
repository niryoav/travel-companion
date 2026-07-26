# Sprint 2.5: Welcome cover

## Goal

Create the pre-trip welcome cover for the current cruise and establish the first
ocean-blue visual direction for Travel Companion.

## Scope

- Add a full-screen welcome route separate from the existing app shell.
- Present the approved family, trip, ship, date, and countdown text.
- Use a compact frosted-glass card anchored near the bottom.
- Navigate to the existing Home screen through `Enter trip`.
- Use the approved local Oceania Marina hero image.
- Preserve every existing Sprint 2 route and component.

## Out of Scope

- Remembering that the cover was dismissed
- Automatic trip-phase routing
- Business or itinerary logic
- APIs, weather, search, notifications, expenses, packing, or AI
- Changes to the technical platform splash
- Remote production image URLs

## Acceptance Criteria

- [ ] The root route displays the welcome cover.
- [ ] The cover contains all approved trip text and a dynamic days-to-go value.
- [ ] The cover uses the compact bottom-card layout and local hero asset.
- [ ] Bottom navigation and the regular app header are absent on the cover.
- [ ] `Enter trip` opens the existing Home screen.
- [ ] Existing primary navigation works after entry.
- [ ] The cover is mobile-first, responsive, safe-area aware, and keyboard
      accessible.
- [ ] Text remains readable without backdrop-filter support.
- [ ] Reduced-motion preferences are respected.
- [ ] Tests, TypeScript, ESLint, production build, and `git diff --check` pass.

## Files Changed

Expected implementation areas:

- `docs/design-language.md`
- `docs/sprints/sprint-2-5-welcome-cover.md`
- `public/images/oceania-marina-welcome.webp`
- `src/app/App.tsx`
- `src/features/welcome/`
- `src/styles/index.css`
- relevant test files

## Verification Checklist

- [ ] Welcome content test
- [ ] No bottom-navigation test
- [ ] Enter-trip navigation test
- [ ] Existing primary-navigation regression test
- [ ] TypeScript check
- [ ] ESLint
- [ ] Unit tests
- [ ] Production PWA build
- [ ] `git diff --check`
- [ ] Manual mobile, dark/light system, safe-area, image-crop, contrast, and
      keyboard-focus review
