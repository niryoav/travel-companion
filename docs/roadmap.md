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

## Sprint 7: Operational travel logic
- Add reusable timezone-aware current-status and event-timing derivations.
- Surface verified All Aboard separately from ship departure.
- Add leave-by guidance, return-buffer planning, daily priorities, and a concise
  Prepare for tomorrow briefing.
- Keep incomplete production data explicitly pending or unavailable.
- Preserve deterministic offline operation without live services or new
  persistence.

## Later
- Shared operational snapshot work now includes domain contracts, IndexedDB
  accepted-cache storage, private Vercel Blob reads, conditional writes, local
  revision/sync metadata, Yoav-only editing controls, truthful save status,
  explicit legacy sharing, and one-shot manual retry. Pending queues, automatic
  retry scheduling, merging, and realtime synchronization remain out of scope.
- Separate shared trip context from traveler-owned preferences and actions, and
  define synchronization and conflict behavior before adding cloud services.
- Add carefully scoped live weather, provider status, and travel-timing
  integrations with visible freshness and useful cached states.
- Introduce actionable notifications and explicit offline/freshness status only
  after their product workflows and data sources are defined.
- Introduce AI only where it improves an already useful core experience.
- Add expenses and memories incrementally after the travel foundation is stable.
- Daily Love Messages are currently fixed bundled content. Any future authoring,
  mutable storage, traveler-specific visibility, or optional photo support
  requires separate product and privacy review.
