# Tranmere-Branded Redesign — Design

Date: 2026-08-20

## Problem

The GPS tag allocation app (already built and deployed at https://gps-tag-allocation.vercel.app) is functionally complete but visually bare-bones — default form controls, no branding, plain top navigation links. The single user (a Tranmere Rovers academy coach) wants it to look properly designed and carry the club's identity, and wants the login screen out of day-to-day use.

## Scope

Visual/structural redesign only. No new business logic, no new database fields, no changes to `lib/api/*`, `lib/reportCalculations.ts`, `lib/csvExport.ts`, `lib/excelExport.ts`, or the Supabase schema.

## Login removal — resolved without a code change

Investigated first: Supabase Auth sessions persist in the browser (localStorage) indefinitely by default and refresh automatically, so a user who signs in once on their device will not see the login screen again unless they explicitly sign out or clear browser data. The user chose this approach (over removing authentication entirely, which would expose the shared academy database's player data to anyone with the URL) explicitly to keep the database's existing `role = 'admin'` RLS protection intact.

**Action:** the user signs in once, manually, on their own device. No code changes to `AuthProvider`, `ProtectedRoute`, or `LoginPage`'s auth logic.

## Hard constraint

Every existing accessible label, role, and text content that the current 51 tests query for (button text like "Scan Out"/"Scan In"/"Start session"/"Export CSV", `aria-label`s like "Shirt number for {name}", player-row text like "Alex Jones (#7)", headings like "Weekly Report") must remain **exactly** unchanged. This redesign wraps new visual structure around existing semantics; it does not rename, remove, or restructure anything a test currently queries by role/label/text. Every task in the implementation plan ends with the full suite passing, zero regressions.

## Design tokens & branding

- The user-provided crest (`Tranmere_Rovers_FC_crest.svg.webp`, currently at the project root) moves to `src/assets/tranmere-crest.webp` and is used as a real `<img>` in the app header — no placeholder badge.
- A small set of CSS custom properties added to `src/App.css`, sourced from the crest's own colours:
  - `--color-primary: #C8102E` (crest crimson)
  - `--color-accent: #FFD100` (crest gold)
  - `--color-text: #1a1a1a`
  - `--color-bg: #F7F5F2`
  - `--color-surface: #ffffff`
  - `--radius: 14px`
  - `--space-1` through `--space-6` (a simple spacing scale)
- These tokens are the only source of colour/spacing in the redesigned CSS — no hard-coded hex values scattered through component styles.

## App shell

A new `AppShell` component (`src/components/AppShell.tsx`) replaces the current inline `Nav` function in `App.tsx`:
- A header bar (`--color-primary` background) showing the crest image and a page title, shown on every screen including the login screen.
- A bottom tab bar (Scan / Roster / Report, using `react-router-dom`'s `Link`) shown **only when signed in** — mirroring the current `Nav`'s `if (!session) return null` gating, just moved into `AppShell` and rendered at the bottom of the viewport instead of a top link row.
- `AppShell` wraps the routed page content; `App.tsx`'s `<Routes>` render inside it.

## Page-level changes

- **`LoginPage`**: visual restyle only (card container, token colours). Same fields (`Email`, `Password`), same button text (`Sign in`), same `role="alert"` error element.
- **`ScanPage`**: the existing session-type/date display becomes a header card; the existing Scan Out/Scan In buttons (same `role="group" aria-label="Scan mode"`, same `aria-pressed` attributes, same text) get a segmented-control visual treatment via CSS only; `QrScanner`'s container gets a bordered "viewfinder" frame class; `PlayerPicker`'s existing rows (same `Alex Jones (#7)`-style button text) get a card-list treatment with a small shirt-number badge.
- **`RosterPage`**: the current `<table>` becomes a styled list of rows (same player name text, same `aria-label="Shirt number for {name}"` input, same error alert) — table semantics aren't tested, so this is a safe structural change; each row gets the same shirt-number badge style used on Scan.
- **`ReportPage`**: adds a row of three stat tiles above the existing sections — total allocations, anomaly count (mismatches + zero-allocation players), tags used this week — computed inline from arrays already present on the page (no new `lib/reportCalculations.ts` function). Each existing section (`Allocation Log`, `Anomalies`, `Utilization`) becomes a card; anomaly list items get an amber warning-chip style; `Export CSV`/`Export Excel` buttons become the primary/accent action-button style.

## Testing

Each page's restyle is verified by running the full suite (51 tests) after the change — the hard constraint above means no test text should need to change. Two small pieces of genuinely new behavior get their own tests:
- `AppShell` shows the bottom tab bar only when a session exists, and not on `/login`.
- `ReportPage`'s new stat tiles show the correct computed numbers for a given set of mock data.

## Out of scope

- Any change to authentication, RLS, or the database schema.
- Any change to business logic in `lib/*` or `lib/api/*`.
- Native app / offline support (unchanged from the original design).
- Further screens beyond the four already built (Login, Scan, Roster, Report).
