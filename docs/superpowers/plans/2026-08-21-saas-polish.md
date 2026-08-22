# SaaS Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the already-built, already-branded app more visual depth and breathing room — addressing direct user feedback that the live app "looks weak" and needs more spacing and a "SaaS" feel.

**Architecture:** A single CSS-only rewrite of `src/App.css` — new shadow tokens, softer/larger radii, warmer muted-text tone, more generous spacing, a gradient treatment on the header/primary button, and a small-caps label style. No component or markup changes anywhere.

**Tech Stack:** Same as the existing app. No new dependencies.

## Global Constraints

- No JSX/component file is touched — this is `src/App.css` only.
- No accessible label, role, or text content changes anywhere — CSS-only, so the existing 51 tests must stay green with zero test-file changes.
- No new npm dependencies.

---

## File Structure

```
src/App.css   (modified — full rewrite, same file, no new files)
```

---

### Task 1: Rewrite `src/App.css` with the polish pass

**Files:**
- Modify: `src/App.css` (full rewrite)

**Interfaces:**
- Produces: new CSS custom properties (`--shadow-card`, `--shadow-header`, `--shadow-btn`, `--shadow-btn-accent`, `--shadow-nav`), updated values for `--radius` (18px), `--radius-sm` (10px), `--color-bg` (#F4F2EF), `--color-text-muted` (#6f6a63). Every existing class name (`.card`, `.action-btn`, `.app-header`, `.bottom-nav-item`, `.toggle-group`, `.viewfinder`, `.roster-row`, `.roster-row-label`, `.player-picker-list`, `.shirt-badge`, `.stat-row`, `.stat-tile`, `.stat-tile-num`, `.stat-tile-label`, `.anomaly-item`) is preserved — only their rules change, not their names, so no component needs updating.

This is a pure-CSS change with no logic — verification is "the full suite stays green and the production build is clean," not red/green TDD, consistent with the earlier design-tokens task in this project's history.

- [ ] **Step 1: Replace `src/App.css` with the full polished stylesheet**

```css
/* src/App.css */

/* ---- Design tokens ---- */
:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, sans-serif;

  --color-primary: #C8102E;
  --color-primary-dark: #96001f;
  --color-accent: #FFD100;
  --color-text: #1a1a1a;
  --color-text-muted: #6f6a63;
  --color-bg: #F4F2EF;
  --color-surface: #ffffff;
  --color-surface-alt: #fafaf9;
  --color-border: #e5e1dc;
  --color-warning-bg: #FFF7E0;
  --color-warning-border: #FFD100;

  --radius: 18px;
  --radius-sm: 10px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  --shadow-card: 0 4px 20px rgba(20, 20, 20, 0.08), 0 1px 3px rgba(20, 20, 20, 0.06);
  --shadow-header: 0 2px 12px rgba(200, 16, 46, 0.25);
  --shadow-btn: 0 4px 14px rgba(200, 16, 46, 0.35);
  --shadow-btn-accent: 0 4px 14px rgba(255, 209, 0, 0.35);
  --shadow-nav: 0 -2px 10px rgba(0, 0, 0, 0.04);
}

/* ---- Base ---- */
body {
  margin: 0;
  padding: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

main {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
  padding-bottom: calc(var(--space-6) + 56px); /* keep content clear of the fixed bottom nav */
}

h1 {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0 0 var(--space-5);
}

h2 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 var(--space-3);
}

h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary-dark);
  margin: var(--space-3) 0 var(--space-2);
}

label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

button {
  font-size: 1rem;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.action-btn {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #fff;
  width: 100%;
  padding: var(--space-4);
  margin-top: var(--space-2);
  margin-bottom: var(--space-2);
  box-shadow: var(--shadow-btn);
  letter-spacing: 0.01em;
}

.action-btn.accent {
  background: var(--color-accent);
  color: var(--color-text);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-btn-accent);
}

input, select {
  font-size: 1rem;
  font-weight: 400;
  text-transform: none;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface-alt);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  text-align: left;
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

/* ---- App shell ---- */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #fff;
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  box-shadow: var(--shadow-header);
}

.app-header-crest {
  width: 34px;
  height: 34px;
  object-fit: contain;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border-radius: 50%;
}

.app-header-title {
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.app-content {
  flex: 1;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-nav);
}

.bottom-nav-item {
  flex: 1;
  text-align: center;
  padding: var(--space-3) var(--space-1) 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;
}

.bottom-nav-item.active {
  color: var(--color-primary);
  border-top: 2px solid var(--color-primary);
  margin-top: -1px;
  padding-top: 11px;
}

/* ---- Cards ---- */
.card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: var(--space-6) var(--space-5);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-card);
}

/* ---- Scan toggle ---- */
.toggle-group {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.toggle-group button {
  flex: 1;
  border-radius: var(--radius-sm);
}

.toggle-group button[aria-pressed="true"] {
  background: var(--color-primary);
  color: #fff;
}

.toggle-group button[aria-pressed="false"] {
  background: var(--color-surface);
  color: var(--color-primary);
}

/* ---- Viewfinder ---- */
.viewfinder {
  border: 3px dashed var(--color-accent);
  border-radius: var(--radius);
  overflow: hidden;
  background: #111;
  min-height: 160px;
}

/* ---- Roster rows / shirt badge ---- */
.roster-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  margin: 0;
  border-bottom: 1px solid var(--color-border);
  list-style: none;
}

.roster-row:last-child {
  border-bottom: none;
}

.roster-row-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-right: var(--space-2);
}

.player-picker-list {
  padding: 0;
  margin: 0;
}

.shirt-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* ---- Report stat tiles ---- */
.stat-row {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.stat-tile {
  flex: 1;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  text-align: center;
  box-shadow: var(--shadow-card);
}

.stat-tile-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-primary);
}

.stat-tile-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* ---- Anomaly chips ---- */
.anomaly-item {
  background: var(--color-warning-bg);
  border-left: 3px solid var(--color-warning-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  list-style: none;
}
```

- [ ] **Step 2: Verify the suite is unaffected**

Run: `npm run test`
Expected: all existing test files/tests passing, unchanged count (CSS-only change; no test queries by class name, shadow, or color).

- [ ] **Step 3: Verify the production build is clean**

Run: `npm run build`
Expected: builds successfully, no CSS syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.css
git commit -m "style: add depth, spacing, and typography polish per user feedback"
```

---

## Self-Review Notes

- **Spec coverage:** spacing (main/card/toggle-group/stat-row padding and margins increased), depth (`--shadow-card`/`--shadow-header`/`--shadow-btn`/`--shadow-nav` added and applied), typography (bolder headings, small-caps muted labels), nav (active-tab treatment kept as-is per spec) — all covered in one task.
- **Placeholder scan:** no TBD/TODO; full CSS content given.
- **Type consistency:** every existing class name referenced by `AppShell.tsx`, `ScanPage.tsx`, `RosterPage.tsx`, `ReportPage.tsx`, `LoginPage.tsx` (now deleted — N/A), and `PlayerPicker.tsx` is preserved unchanged in this stylesheet — verified against the current file before writing this plan (no class renamed or removed).
