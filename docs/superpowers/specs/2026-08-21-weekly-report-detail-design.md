# Weekly Report — More Detail, Print/PDF — Design

Date: 2026-08-21

## Problem

`ReportPage` today shows three summary stat tiles, a flat allocation-log table, an anomalies list, and a tag-utilization table — enough for a quick on-screen check, but not enough to hand to peers as a document: no per-player view, no sense of whether this week is better or worse than last week, the log isn't grouped in a way that reads like a session record, and there's no way to print or save it as a PDF.

## Approach

Enhance `ReportPage` in place rather than building a separate print-only view — a `@media print` stylesheet reformats the same content for paper, so there's one page and one data-fetch to maintain, and the browser's print preview doubles as a "detailed view" preview before committing to print/save.

### Data layer — no new API calls

`ReportPage` already fetches a 28-day history window (`historyStart` = `weekStart - 28d` through `weekEnd`) to compute each player's "usual tag." That window already contains last week's sessions and allocations — they just aren't kept separately today. The only state change needed is also keeping `historySessions` (currently only `historyAllocations` is stored), so both can be filtered by date client-side:

```
prevWeekStart = weekStart - 7d, prevWeekEnd = weekStart - 1d
prevWeekSessions = historySessions filtered to [prevWeekStart, prevWeekEnd]
prevWeekAllocations = historyAllocations filtered to those session ids
```

Three new pure functions in `src/lib/reportCalculations.ts`, each unit-tested like the existing ones (`computeUsualTagPerPlayer`, `findTagMismatches`, etc.):

- **`buildPlayerBreakdown(players, allocations, sessionsById, tagsById, mismatches)`** → one entry per *active* roster player (including zero-session ones, so absentees are visible), each with `{ playerId, name, shirtNumber, sessionCount, hasAnomaly, entries: [{ date, sessionType, tagCode, scannedOutAt, scannedInAt }] }`.
- **`groupAllocationsBySession(allocations, sessionsById, playersById, tagsById)`** → allocations bucketed by session, sorted by date, each bucket `{ session, rows: [{ tagCode, playerName, shirtNumber, scannedOutAt, scannedInAt }] }`. Replaces today's flat table.
- **`weekOverWeekDelta(current, previous)`** → given `{ allocationsCount, anomaliesCount, tagsUsedCount }` for each week, returns the same shape plus `delta` (current − previous) per field. `ReportPage` computes the `previous` inputs by re-running the *existing* calc functions (`findTagMismatches`, `computeTagUtilization`) against the filtered prior-week slice — no new calculation logic needed there, just applied twice.

### UI layer — split into focused components

`ReportPage.tsx` is ~215 lines already; adding three sections in place would push it well past a readable size. New components under `src/components/report/`:

- **`WeekComparisonStats.tsx`** — replaces the current inline `stat-row` markup. Same three tiles (Allocations, Anomalies, Tags used), each now with a small ↑/↓/— delta vs. last week beneath the number.
- **`SessionLogSection.tsx`** — renders `groupAllocationsBySession`'s output: a subheading per session (date + type) with its allocation rows underneath, instead of one long flat table.
- **`PlayerBreakdownSection.tsx`** — renders `buildPlayerBreakdown`'s output: one row/card per active player, showing session count, tags used, and an anomaly flag; players with `sessionCount === 0` are visually distinguished (e.g. muted, "No sessions this week").

`ReportPage.tsx` stays the orchestrator: fetch, compute (including the new calc calls), and render — existing Anomalies and Utilization cards and the CSV/Excel export buttons are unchanged and stay where they are.

### Print / PDF

New `@media print` block in `src/App.css`:

- `.no-print` (applied to `.app-header`, `.bottom-nav`, all action buttons, and the week `<input type="date">`) → `display: none` in print.
- `.print-only` (a new header block in `ReportPage`, containing the crest, "Weekly Report", and the resolved date range as plain text — a date input's value doesn't print meaningfully) → `display: none` on screen, `display: block` in print.
- `main { max-width: none }`, cards lose their box-shadow/rounded corners in print (flat, ink-friendly).
- `thead { display: table-header-group }` and `tr { break-inside: avoid }` so table headers repeat and rows don't split across a page break.

A **"Print / Save as PDF"** button (`action-btn`, next to the existing export buttons) calls `window.print()`. No new dependency — the user picks "Save as PDF" in the browser's own print dialog, which is what "print to pdf for peers" actually needs.

## Out of scope

- No PDF-generation library (e.g. jsPDF) — browser print-to-PDF covers the stated need with zero new dependencies.
- No multi-week trend/sparkline — comparison is against last week only, per product decision.
- No team/year-group filtering on the player breakdown — matches the roster's current academy-wide scope; the `year_group` column mentioned as "coming soon" can be layered in later without restructuring these functions.
- CSV/Excel export logic (`buildExportRows`, `csvExport.ts`, `excelExport.ts`) is unchanged.

## Testing

- New tests in `reportCalculations.test.ts` for `buildPlayerBreakdown`, `groupAllocationsBySession`, `weekOverWeekDelta` — including the zero-allocation-player and zero-previous-week edge cases.
- New `WeekComparisonStats.test.tsx`, `SessionLogSection.test.tsx`, `PlayerBreakdownSection.test.tsx` for each new component's rendering.
- `ReportPage.test.tsx` updated: assert the new sections render with fetched data, and that clicking "Print / Save as PDF" calls a mocked `window.print`.
