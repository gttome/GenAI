# Phase 1 — Interactive Professional Skills Portfolio

A **static, offline-capable** HTML5 application built against the **October 15, 2026, version 1.1** Reusable Skills Opportunity Catalog, with the source-faithful 13-domain presentation.

## Features

1. **Solution Studio:** Choose one of six *illustrative* workflows, add/reorder/remove catalog skills, edit an intended result, inspect each skill's acceptance condition, export Markdown and JSON blueprints.
2. **Skills Relationship Map:** Browse all 101 catalog skill nodes, select one, filter by domain, adjust zoom, and examine eight source-defined shared-method groups or six *illustrative* workflow sequences. **These relationships are not certified technical prerequisites.**
3. **Readiness & Evidence:** Filter the 101-entry evidence register by domain, search term and catalog status; examine domain distribution and export CSV. Status is **100 PROPOSED / 1 DOCUMENTED ONLY (S-11)**; no tested/implemented/verified skill status is asserted.

## Run

Open [index.html](index.html) in any recent browser. The application also works under static hosting, including GitHub Pages if that hosting is configured for this repository. No build, server, npm dependencies, API tokens, paid APIs or network calls are required.

Node 20+ can run **both** catalog validation and DOM-simulated interaction tests locally, **without installing packages or contacting any service**:

    cd skills-portfolio
    npm test

Or without npm:

    node --test tests/*.test.mjs

The DOM smoke tests verify application state, controls, filters, downloads and node selection. They do **not** replace real browser rendering/accessibility testing.

## Source discipline

- **Canonical data:** [catalog.json](catalog.json). Browser mirror: [data.js](data.js). Both are generated from the proposal and contain exact skill IDs, names, outcomes and acceptance criteria.
- **Evidence:** The catalog is the source for titles, ratings, statuses, priorities and reuse groups. It is **not evidence of runtime readiness, implemented skills, actual dependencies or live application health**.
- **Display split:** The original 18-skill HTML5 family becomes presentation Domains 12 (S-84–S-90) and 13 (S-91–S-101); all 101 IDs are unchanged.
- **Special case:** S-11 is marked DOCUMENTED ONLY, because the catalog describes an existing written proposal, not an installed or verified skill.
- **Book apps:** 27 intended launch positions correspond to 25 unique embedded URLs, and no live health is certified here.
- See [SOURCE.md](SOURCE.md) for detailed provenance.

## Security, accessibility and authorization

- User-provided blueprint goals are rendered via text nodes; no HTML execution from input.
- Blueprint export occurs in the browser, locally. No telemetry, account access, scheduled actions, paid APIs, or repository mutation occurs when using the web app.
- The SVG network has keyboard-selectable skill nodes and an accessible relationship list; filters, tabs, buttons and forms have labels and visible focus states.
- **No skill has been installed or activated by this project.** Launching or executing an eventual skill, changing repositories or publishing anything requires separate authorization and verification.

## Deployment scope

**This package lives only in** \`skills-portfolio/\` of \`gttome/GenAI\`. Existing GenAI content and all Daily AI Brief repositories and automation are unchanged. Merge to main / GitHub Pages deployment must be verified separately; do not infer a live URL from the branch or PR.

## Acceptance / smoke checks

- Source: 101 unique IDs, 13 counts, correct 12 rankings, no invented affiliations.
- Solution: six templates; loaded/editable skill steps; goal editing; local Markdown/JSON exports with proposal-only disclaimers.
- Map: all 101 selectable; eight shared-method groups; six illustrative workflows; domain and zoom controls; keyboard focus.
- Readiness: 100 proposed, 1 documented only, 0 evidenced tested, 0 implemented, 0 verified; filters and CSV export.
- Responsive: desktop and mobile layouts, no forced external assets, no horizontal overflow when collapsed.
- Browser review: use current Chrome/Firefox/Safari (or Playwright) after GitHub checkout before release.
