# Design reference

Travel Companion should feel calm, premium, personal, and dependable. This is a
working reference for consistent UI decisions, not a fixed visual specification.

## Experience direction

- Design mobile-first, then let layouts breathe on wider screens.
- Keep Home close to one phone-screen height and prioritize the briefing over
  secondary detail.
- Use the fixed primary navigation labels: Home, Today, Trip, Documents, More.
- Present one clear purpose and hierarchy on every screen.
- Use progressive disclosure instead of dense dashboards.
- Keep touch targets at least 44 by 44 CSS pixels.
- Respect device safe areas and reduced-motion preferences.
- Use semantic HTML, visible focus states, readable text, and strong contrast.

## Visual language

- Warm, restrained neutrals with a deep green accent.
- Comfortable spacing, rounded surfaces, and subtle elevation.
- Strong typography and structure rather than decorative effects.
- Equivalent hierarchy and contrast in light and dark modes.
- Status expressed through text and shape as well as color.
- Motion used only to clarify a state or transition.

## Reusable patterns

Prefer shared primitives for page headings, content cards, section headings,
status badges, and placeholder states. A pattern should become reusable when it
has the same meaning and behavior in more than one destination; avoid abstractions
created only for visual similarity.

## Placeholder content

Sprint 2 uses clearly labeled, non-sensitive placeholders. Placeholders should
communicate the future purpose of a screen without suggesting that live trip
data, integrations, or business logic already exist.

## Required states

Future functional screens must consider loading, empty, error, stale, and offline
states. Sprint 2 establishes the visual patterns only; it does not implement
feature data or connectivity behavior.
