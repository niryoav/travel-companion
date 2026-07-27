# Roadmap

## Sprint 0: Foundation
- Define product vision, architecture, UX principles, and design direction.
- Create the repository structure and documentation baseline.
- Keep the scope limited to planning and scaffolding.

## Sprint 1: PWA foundation
- Establish the React, TypeScript, Vite, and Tailwind CSS application foundation.
- Add the installable PWA shell and Vercel deployment configuration.
- Add mobile-first navigation for Home, Today, Trip, Documents, and More.
- Support light and dark themes.
- Introduce a repository boundary with local preference storage.
- Keep all five destinations as placeholders and defer travel-domain logic.

## Sprint 2: UI foundation
- Establish the shared design system and reusable presentation components.
- Adopt the approved navigation: Home, Today, Trip, Documents, and More.
- Refine the responsive app shell, bottom navigation, and safe-area behavior.
- Create placeholder compositions for all five destinations.
- Add reusable status badges and coherent light and dark modes.
- Keep AI, APIs, weather, search, notifications, new persistence, expenses, and
  packing outside the sprint.

## Sprint 3: Phase-based Home foundation
- Introduce a concise, phase-aware Home briefing using typed demo data.
- Support pre-trip, departure day, port day, sea day, and final travel day views.
- Add a local traveler-profile preference and reusable Home briefing components.

## Sprint 4: Real trip data
- Replace demo Home content with structured trip data.
- Evolve the minimum trip model from concrete Home and Today needs.

## Sprint 5: Today experience
- Replace the Today placeholder with the complete operational view of the
  current travel day.
- Derive a readable chronological timeline, next event, and verified critical
  information from bundled trip data.
- Keep the experience read-only, mobile-first, offline-first, and deterministic.

## Sprint 6: Full Trip experience
- Replace the Trip placeholder with the complete chronological journey.
- Show every configured travel day with explicit past, today, and upcoming
  status.
- Add accessible day details for verified events, transport, port context, and
  document references.
- Keep the experience read-only, repository-backed, mobile-first, and fully
  available offline.

## Sprint 7: Shared and personal profiles/data
- Separate shared trip context from traveler-owned preferences and actions.
- Define synchronization and conflict behavior before adding cloud services.

## Later
- Add carefully scoped live weather, provider status, and travel-timing
  integrations with visible freshness and useful cached states.
- Introduce actionable notifications and explicit offline/freshness status only
  after their product workflows and data sources are defined.
- Introduce AI only where it improves an already useful core experience.
- Add expenses and memories incrementally after the travel foundation is stable.
- Add **Daily Love Messages** as a private personal-experience feature after
  Home, Today, Trip, Documents, and More are stable. It may show Isabel one
  different offline-first message per honeymoon day on Home, written in advance
  by Yoav, with a subtle love symbol. Future storage, privacy, traveler-specific
  visibility, authoring under More, and optional photo support require product
  review before implementation.
