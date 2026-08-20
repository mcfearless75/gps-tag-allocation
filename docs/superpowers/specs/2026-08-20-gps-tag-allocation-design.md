# GPS Tag Allocation App — Design

Date: 2026-08-20

## Problem

15 StatSports/PlayerTek GPS trackers ("tags") need to be handed out to players before every training session and match. Today this is manual: the coach writes down each tag's serial number by hand, matches it to a player from memory/notes, transcribes everything into a spreadsheet after the fact, and builds a weekly report from that spreadsheet. This is slow, error-prone (mismatched tag/player pairings corrupt the GPS data attribution), and gives no visibility into tag utilization or missing hardware until it's too late.

## Goal

A phone-friendly web app where a staff member scans a tag's printed QR code, picks the player it's going to, and has that logged instantly to a database — replacing the handwritten log and the spreadsheet. At the end of the week, a rich report (allocation log, anomalies, utilization, export) is available with no manual collation.

## Context: existing platform

This is not a greenfield system. It plugs into an existing, live Supabase project, **`tranmeretracker`** (project ref `avpdwutgtsurddvfxhmh`), which already runs a broader academy management platform (courses/BTEC coursework, attendance, wellbeing surveys, match/training logs, GPS session metrics imported from StatSports, etc.) for real players and staff today.

Relevant existing tables (untouched except as noted):
- `public.users` — 35 rows with `role = 'student'` are the players (name, position, date_of_birth, height/weight, dominant_foot, etc. already present). 2 rows with `role = 'admin'` are staff. **We add one nullable column, `shirt_number smallint`, to this table** — no other change.
- `public.gps_sessions` — post-processed GPS metrics per player per session, imported from StatSports exports (distance, sprints, HR, player load, zones, etc.). This table is a read/reference point only; this project does not write to it. A future project could use tag allocation data to auto-attribute incoming StatSports exports to the right player by tag serial, but `gps_sessions` has no tag-serial column today, so that integration is explicitly out of scope here (see below).

Staff authenticate with the **same Supabase Auth** users as the main platform — no separate login system.

## Approach

Build a small, standalone web app (this `gps_zapper` project) that talks to the same Supabase project via a handful of new tables, rather than building inside the existing academy platform's codebase. This avoids any risk to a live, multi-purpose production system for what is fundamentally a coach-facing utility, while still reusing the existing player roster and staff logins (no duplicate data entry, no second account system).

## Data model (new tables)

```
gps_tags
  id            uuid pk
  tag_code      text, unique, not null   -- decoded QR/barcode value
  label         text, nullable           -- optional friendly name, e.g. "Tag 03"
  status        text, not null, default 'active'  -- active | retired | lost
  created_at    timestamptz, default now()

gps_tag_sessions
  id              uuid pk
  session_date    date, not null
  session_type    text, not null   -- training | match | gym | other
  notes           text, nullable
  created_by      uuid, references users(id), not null
  created_at      timestamptz, default now()

gps_tag_allocations
  id                uuid pk
  session_id        uuid, references gps_tag_sessions(id), not null
  tag_id            uuid, references gps_tags(id), not null
  player_id         uuid, references users(id), not null
  scanned_out_by    uuid, references users(id), not null
  scanned_out_at    timestamptz, default now()
  scanned_in_by     uuid, references users(id), nullable
  scanned_in_at     timestamptz, nullable
  created_at        timestamptz, default now()

  constraint: unique (session_id, tag_id)     -- a tag allocated once per session
  constraint: unique (session_id, player_id)  -- a player holds one tag per session
```

`users.shirt_number smallint` — new nullable column, editable via a simple settings screen in this app; everything else about a player row remains owned by the main platform.

## Core workflows

1. **Start a session** — staff picks a date (defaults to today) and session type (Training/Match/Gym/Other), creating a `gps_tag_session` row.
2. **Scan-out** — camera opens (browser-based QR/barcode reader), staff scans a tag. The app looks up `tag_code` in `gps_tags` (auto-creating the tag record the first time a given code is seen), then staff picks the player from a searchable list of the 35 active players (surfacing each player's usual/last shirt number as a hint). An allocation row is written immediately. Repeats until all tags in use for the session are handed out.
3. **Scan-in (optional)** — at any point, re-scanning a tag looks up its open allocation for the current session and marks it returned (`scanned_in_by`, `scanned_in_at`). Not required — skipping it has no consequence, but returned tags feed the utilization/anomaly views.
4. **Roster/shirt-number management** — a simple settings screen lists the 35 players and lets staff set/edit `shirt_number`. No other player-editing capability is added; player identity, position, etc. stay owned by the main platform.

## Weekly report

For a selected week (Mon–Sun), one screen with four sections:
- **Allocation log** — full table: date, session type, tag, player, shirt #, staff who allocated it, scan-out/scan-in times. This is the direct replacement for the spreadsheet.
- **Anomalies** — allocations where the tag differs from that player's usual tag (mode of `tag_id` per `player_id` over a trailing window, e.g. last 4 weeks); players with zero allocations in the week (missed sessions or a hand-off slipped through).
- **Utilization** — sessions-used count per tag over the week, most/least used tags, tags idle for N+ days (useful for battery/wear rotation across the 15-tag pool).
- **Export** — one-click CSV and Excel download of the above tables, for emailing or folding into existing reporting.

## Tech stack

- Frontend: React + Vite, mobile-first, deployed to Vercel (already connected via MCP).
- Camera scanning: a browser QR/barcode library (e.g. `html5-qrcode`) — no native app, works on any phone/tablet browser.
- Backend: Supabase — the existing `tranmeretracker` project's Postgres + Auth (new tables + one new column only, as above).
- No offline mode: connectivity at the training ground/pitch is reliable, confirmed by the user.

## Out of scope (YAGNI, can revisit later)

- Auto-matching future StatSports GPS data imports to players via tag serial number (would require adding a tag-serial column to `gps_sessions` and is a separate integration effort).
- Native mobile app — the browser-based scanner is sufficient given reliable connectivity and no offline requirement.
- Multi-team/multi-squad support — this is scoped to the one squad's 15 tags and its player roster.
- Required scan-in / hard enforcement of tag returns — kept optional per user decision; can be tightened later if lost-hardware incidents become a problem.

## Open questions for implementation planning

None outstanding — user has confirmed each section of this design.
