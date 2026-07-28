# Travel Companion

Travel Companion is a private, mobile-first planning and guidance app. It helps
travelers understand what matters now, what comes next, and what needs
preparation during a trip.

## Who it is for

This project supports shared travel planning and trip awareness in a calm,
practical format.

## Current project status

Sprints 1–8 establish the reusable PWA shell, structured offline trip data,
phase-based Home, operational Today, the complete chronological Trip view,
offline documents, and release-readiness foundations. The app uses one Ocean
Day appearance and keeps trip-specific facts and editorial content behind
repository boundaries.

Complete door-to-door journey details remain intentionally deferred until the
technical foundation has completed independent review.

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

The application uses a layered structure with:

- a reusable app shell;
- canonical trip data and editorial content kept separate from the shell;
- repositories as the ownership boundary for bundled and local data;
- pure selectors for operational and time-zone-aware derived state;
- offline precaching for the shell, approved images, and reduced documents;
- optional future integrations only after the offline core is stable.

UI code must access browser persistence through repository interfaces. See
`docs/architecture.md` for the current boundaries and
`docs/development-workflow.md` for the delivery process.

## Collaboration guidance
Codex and Claude should keep changes focused on the current sprint, avoid unnecessary scope expansion, and document decisions when architecture or product direction changes. The work should stay small, practical, and privacy-aware.

## Privacy note
This is a private travel project. Sensitive identity, payment, medical,
contact, and complete booking information must remain outside source control.
Only approved reduced operational documents belong in the offline bundle.
