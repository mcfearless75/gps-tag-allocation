# SaaS Visual Polish — Design

Date: 2026-08-21

## Problem

User feedback on the live, deployed app (screenshot of the Start Session screen): "need to be spaced out more and it looks weak - get some saas look in there." The current design (from the earlier Tranmere-branded redesign) is flat and tightly spaced — no elevation/depth cues, thin type, plain gray labels.

## Approach

CSS-only refinement of `src/App.css` — no component/JSX changes, since every page already renders through the existing `.card`, `.action-btn`, and `<label>`-wraps-text-and-control markup. Confirmed via mockup comparison (shown to and approved by the user) that the following changes address the feedback:

1. **Spacing:** larger card padding; more margin between label/control/button; more room around the header and bottom nav.
2. **Depth:** `box-shadow` on `.card` so it lifts off the page background instead of sitting flush; a subtle linear-gradient + shadow on `.app-header` and `.action-btn` instead of flat fills.
3. **Typography:** bolder, tighter `h1`/`h2` headings; `label` restyled to small, uppercase, muted text (common SaaS pattern) instead of plain default text — achieved purely via the `label` selector plus `text-transform: none` on `input`/`select` to stop the uppercase from inheriting into form control text.
4. **Nav:** keep the existing active-tab top-accent-border treatment; no change needed there.

## Out of scope

- No new components, no markup changes to any page.
- No change to color tokens (crimson/gold palette stays), only spacing/shadow/typography tokens and rules.
- No change to business logic, tests should be unaffected (no test queries by CSS class or visual styling).

## Testing

Run the full suite after the change — expect zero test changes needed, since no accessible text/role/label content changes, only visual CSS.
