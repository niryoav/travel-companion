# AGENTS.md

## Purpose

This file gives coding agents shared instructions for working on **Travel Companion**.

Travel Companion is a mobile-first progressive web application for its travelers. Its purpose is not merely to store travel information, but to help them understand:

- what is happening now;
- what is happening next;
- what needs to be prepared;
- what should not be missed;
- which information or document is needed at the right moment.

The current first trip is the **Oceania Marina 2026 cruise**, but the application must be reusable for future trips.

---

## Product-owner principle

The product owner is Yoav Nir.

Agents may propose improvements, but must not make major product, architecture, privacy, or design decisions without making the change explicit.

Every feature must answer these questions:

1. What user problem does this solve?
2. What information does it require?
3. What action or decision does it make easier?
4. How will we know that it works?

Do not add a feature only because it is technically interesting.

---

## Core product principles

- Mobile use is the primary experience.
- Essential information must remain available with poor or no connectivity.
- The interface must be calm, clear and glanceable.
- Show the most relevant next action before secondary information.
- Prefer useful recommendations over raw data.
- Avoid unnecessary screens, settings and complexity.
- Trip-specific content must remain separate from the reusable application shell.
- The application should feel personal, premium and dependable.
- Accessibility, readable text and large touch targets are required.
- Privacy takes priority over convenience.

---

## Initial product scope

The first useful version should focus on:

- splash and trip countdown;
- Mission Control dashboard;
- Today;
- Tomorrow Briefing;
- trip timeline and itinerary;
- ship information;
- ports and excursions;
- document index;
- packing checklist;
- simple expense capture;
- notes;
- emergency information;
- offline access to essential trip data.

Advanced AI, synchronization and automation should be introduced only after the basic product is stable and useful.

---

## Architecture principles

Use a layered structure:

1. **User interface**
   - screens;
   - navigation;
   - cards;
   - forms;
   - visual states.

2. **Application logic**
   - current and next event;
   - preparation recommendations;
   - tomorrow briefing;
   - readiness state;
   - reminders and alerts.

3. **Trip data**
   - itinerary;
   - ports;
   - reservations;
   - packing items;
   - ship information;
   - personal notes.

4. **Storage and synchronization**
   - local storage first;
   - optional synchronization later;
   - clear ownership of data;
   - predictable conflict handling.

5. **External services**
   - weather;
   - maps;
   - notifications;
   - AI services;
   - official travel-provider portals.

Keep these layers separate. UI components should not directly contain business rules or service-specific code.

---

## Reusable app shell and trip configuration

The application must distinguish between:

- the reusable **app shell**; and
- individual **trip configurations**.

The app shell contains navigation, layout, reusable components, storage logic and generic travel-advisor behaviour.

A trip configuration contains the data and settings for one trip.

Example:

```text
src/
  app/
  components/
  features/
  services/
  styles/

trips/
  oceania-marina-2026/
    trip.json
    events.json
    ports.json
    packing.json
```

Do not hard-code Oceania-specific content into generic components.

---

## Data modelling

Prefer clear structured data over content embedded in UI files.

Useful core concepts include:

- `Trip`
- `Traveler`
- `Event`
- `PortDay`
- `Reservation`
- `DocumentReference`
- `PackingItem`
- `ExpenseEntry`
- `Note`
- `AdvisorRecommendation`

A `PortDay` should remain distinct from a generic `Event`, because it has domain-specific information such as arrival, departure, all-aboard time, local transport, weather and excursions.

Data models should be documented before becoming complex.

---

## Technical direction

Until an architecture decision says otherwise:

- use TypeScript;
- build a mobile-first PWA;
- prefer a small number of well-supported dependencies;
- avoid adding a backend before it is clearly necessary;
- keep essential trip data locally available;
- use semantic HTML;
- support current versions of Safari on iPhone and Chrome on Android;
- keep components focused and reusable;
- write tests for important application logic.

Do not introduce a large framework, database, cloud service or authentication system without documenting the reason and trade-offs.

---

## Design and UX rules

- Use fixed, predictable primary navigation.
- Keep primary actions within easy thumb reach.
- Present one clear priority per screen.
- Use progressive disclosure rather than showing everything at once.
- Do not rely on colour alone to communicate status.
- Use readable typography and sufficient contrast.
- Keep animations subtle and functional.
- Avoid visual clutter, excessive badges and decorative effects.
- Always design loading, empty, error and offline states.
- Do not imitate the generated mock-up blindly; treat it as visual direction, not a final specification.

Before implementing a new screen, describe:

- its user purpose;
- its primary action;
- its information hierarchy;
- its empty, loading, error and offline states.

---

## Privacy and security

Never commit real sensitive information to the repository, including:

- passport details;
- identity-card details;
- payment-card information;
- passwords;
- access tokens;
- private API keys;
- complete booking references;
- medical information;
- private travel documents.

Use anonymised examples and placeholders in source-controlled data.

Secrets must be kept outside the repository and documented through example environment files such as `.env.example`.

The repository is private, but it must still be treated as if its contents could one day be exposed.

---

## Agent workflow

Before changing code:

1. Read this file.
2. Read the relevant product and architecture documentation.
3. Inspect the current implementation.
4. State any assumptions.
5. Prefer the smallest change that solves the requested problem.

For each meaningful task:

- work on a dedicated branch;
- keep the task focused;
- avoid unrelated refactoring;
- update documentation when behaviour or architecture changes;
- add or update tests;
- run the available checks;
- summarize what changed;
- mention known limitations and follow-up work.

Do not write directly to `main` unless the product owner explicitly approves it.

Suggested branch naming:

```text
codex/mission-control
codex/tomorrow-briefing
claude/architecture-review
claude/offline-storage-review
```

---

## Collaboration between agents

Codex and Claude may work on the same repository, but should not modify the same feature simultaneously unless explicitly coordinated.

Typical division:

- Codex: implementation, tests, incremental feature work;
- Claude: review, architecture analysis, refactoring proposals, risk identification;
- ChatGPT conversation: product definition, UX decisions, acceptance criteria and review with the product owner.

Agents must respect existing decisions unless they clearly explain why a change is needed.

---

## Review governance

Meaningful sprint deliverables should receive an independent review before
merge. Follow `docs/review-process.md` for the review package, categories,
severity levels, score, merge recommendation, and archive convention.

Reviewers must check relevant accepted ADRs in `docs/decisions/`. A review should
evaluate the approved scope and identify risks; it should not expand the sprint
or redesign accepted work without making that proposal explicit.

The product owner makes the final merge decision.

---

## Definition of done

A task is not complete merely because the code runs.

A feature is done when:

- the user problem is clearly addressed;
- acceptance criteria are met;
- important logic is tested;
- mobile behaviour is checked;
- loading, empty, error and offline states are considered;
- accessibility basics are respected;
- no sensitive information is committed;
- documentation is updated where needed;
- the implementation does not create unjustified complexity.

---

## Architectural decisions

For significant technical choices, follow the lightweight ADR process in
`docs/decisions/README.md` and create a record in:

```text
docs/decisions/
```

Examples of decisions that require an ADR:

- choosing the front-end framework;
- adding a backend;
- selecting a synchronization service;
- introducing authentication;
- changing the main data model;
- adding an AI provider;
- selecting a document-storage approach.

---

## Quality guardrails

Avoid:

- premature optimization;
- unnecessary abstractions;
- duplicated business rules;
- giant components;
- hidden side effects;
- hard-coded trip data in generic UI;
- dependencies without clear value;
- sweeping rewrites;
- unreviewed changes to architecture;
- claiming a feature works without testing it.

Prefer:

- simple code;
- explicit data flow;
- small modules;
- clear names;
- documented decisions;
- testable business logic;
- incremental delivery.

---

## Current project status

**Sprint 1: PWA Foundation is complete.** Sprint 2 has not started.

The approved Sprint 1 foundation includes:

- the React, TypeScript, Vite, and Tailwind CSS foundation;
- an installable mobile-first PWA shell;
- five placeholder navigation destinations;
- light and dark themes;
- a repository abstraction with simple local preference storage;
- Vercel deployment readiness.

Travel-domain models and behavior, itinerary logic, briefings, recommendations,
Travel Brain implementation, AI, synchronization, authentication, document
management, and notifications remain deferred until later sprints.
