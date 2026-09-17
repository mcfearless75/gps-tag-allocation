# GPS Tag Allocation App

Scans a GPS tracker tag's QR code, allocates it to a player for that session (GPS numbers change every game), and prints a Catapult-style sheet — see
[docs/superpowers/specs/2026-08-20-gps-tag-allocation-design.md](docs/superpowers/specs/2026-08-20-gps-tag-allocation-design.md)
for the full design and
[docs/superpowers/plans/2026-08-20-gps-tag-allocation.md](docs/superpowers/plans/2026-08-20-gps-tag-allocation.md)
for the implementation plan.

Live: https://gps-tag-allocation.vercel.app

Production deploys from the Git branch set under Vercel → Settings → Git (prefer `master`).

## Local setup

This app reuses the existing Supabase project `tranmeretracker` (ref `avpdwutgtsurddvfxhmh`) rather than
a project of its own. Before running locally, create a `.env` file in the project root (not committed)
with:

```
VITE_SUPABASE_URL=https://avpdwutgtsurddvfxhmh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from the Supabase dashboard's API settings for that project>
```

Then:

```bash
npm install
npm run test
npm run dev
```
