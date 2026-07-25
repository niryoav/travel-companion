# Travel Companion

Travel Companion is a private, mobile-first planning and guidance app for the Nir-Buysse family. It is designed to help the family understand what matters now, what comes next, and what needs preparation during a trip.

## Who it is for
This project is for the Nir-Buysse family and is intended to support shared travel planning and trip awareness in a calm, practical format.

## Current project status
Sprint 1 establishes the reusable application foundation. It includes a React,
TypeScript, Vite, and Tailwind CSS PWA shell with five placeholder destinations,
light and dark themes, local preference persistence behind a repository boundary,
and Vercel deployment configuration.

Travel features and the richer domain model remain intentionally deferred.

## Local development

Node.js 22 or newer is required.

```bash
npm install
npm run dev
```

The local address is printed by Vite. Other useful commands are:

```bash
npm run build
npm test
npm run lint
npm run preview
```

The production build is written to `dist/`. The included `vercel.json` routes
client-side URLs back to the application entry point for React Router.

## Intended architecture
The long-term structure is a layered app with:
- a reusable app shell;
- trip-specific data kept separate from the shell;
- local-first storage for essential trip information;
- optional future integrations only after the core experience is stable.

UI code must access browser persistence through repository interfaces. The
Sprint 1 implementation uses this boundary for theme preferences and contains no
travel-domain or itinerary logic.

## Collaboration guidance
Codex and Claude should keep changes focused on the current sprint, avoid unnecessary scope expansion, and document decisions when architecture or product direction changes. The work should stay small, practical, and privacy-aware.

## Privacy note
This is a private family project. Real sensitive travel information must not be added to the repository. Any personal, booking, or identity details should remain outside source control.
