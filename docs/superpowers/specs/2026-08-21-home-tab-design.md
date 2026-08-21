# Home Tab — Design

Date: 2026-08-21

## Problem

`/scan` is both the app's default route (the `*` wildcard redirects there) and a page that, whenever a session is already active for today, renders straight into the live camera viewfinder. There is no neutral landing screen — tapping "Scan" (or opening the app fresh, or switching tabs and coming back) always drops the operator into the camera, even when they didn't mean to scan anything.

## Approach

Add a fourth bottom-nav tab, **Home**, and make it the app's default/landing route instead of Scan.

- New `src/pages/HomePage.tsx`: crest + club name, and three link cards (`<Link>` to `/scan`, `/roster`, `/report`). No new data fetching — it's a static landing screen, intentionally minimal (YAGNI: nothing live like "session in progress" unless asked for later).
- `src/App.tsx`: add `<Route path="/" element={<HomePage />} />`; change the `*` wildcard to redirect to `/` instead of `/scan`.
- `src/components/AppShell.tsx`: `NAV_ITEMS` gains a leading `{ to: '/', label: 'Home' }` entry, ordered Home / Scan / Roster / Report.

`ScanPage` itself is unchanged — going there still resumes today's session and shows the camera, which is correct when that's actually what you want. The fix is that you're no longer forced through it just to land somewhere.

## Out of scope

- No change to `ScanPage`'s session-resume behavior or camera logic.
- No live status (e.g. "training session in progress") on the Home screen — pure navigation for now.

## Testing

- New `HomePage.test.tsx`: renders the three link cards with correct hrefs.
- `AppShell.test.tsx`: update the nav-items assertion to include Home, first in order.
- `App.test.tsx`: update the "no login step" test's default-route assertion — root and unknown paths now land on Home instead of Scan.
