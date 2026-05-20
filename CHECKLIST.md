# CHECKLIST.md — work_search_log

Living checklist of what's done, what's queued, and what's exploratory.
Companion to [PRODUCT_PLAN.md](PRODUCT_PLAN.md).

Last reviewed: 2026-05-20.

---

## Phase 1 — Shipped (branch: `phase-1-react`)

### Foundation
- [x] SQLite (`node:sqlite`) store with `entries`, `week_meta`, `entry_links` tables
- [x] Defensive `ALTER TABLE` migrations for schema evolution (`is_dream`, `kind`, `applied`)
- [x] Migration script for legacy daily HTML logs (67 files → 179 rows from 2018–2019)
- [x] 23/23 integration tests on `node:test`
- [x] `package.json` with Node engine pin (>= 22.5.0)
- [x] `.gitignore` for `data/`, `node_modules/`, `client/dist/`, `logs/`

### Field alignment (MA Form 1750)
- [x] All structured fields captured: date, type, employer_name, person, contact_method, contact_info, type_of_work, results, link, description
- [x] `TYPES` dropdown aligned to MA DUA categories (Application, Interview, Job Search, Networking, Career Fair, Workshop, MassHire Service, Union Hall, Other)
- [x] `CONTACT_METHODS` dropdown
- [x] `RESULTS` dropdown

### CRUD + weekly workflow
- [x] Create, edit, delete entries
- [x] Backdate via `<input type=date>`
- [x] Weekly view at `/week/:start` with prev/current/next navigation
- [x] CSV export at `/week/:start.csv`
- [x] Print stylesheet (hides nav, form, action buttons)
- [x] Partial-UI "Called back this week" toggle per week
- [x] Activity-count banner: green when satisfied, amber when short

### Information architecture
- [x] `kind` column (`'job' | 'network'`)
- [x] `is_dream` flag for job ideas not yet acted on
- [x] `applied` flag with auto-sort (active → dreams-not-applied → dreams-applied)
- [x] Today's Log page (`/`)
- [x] Week's Log page (`/week/:start`)
- [x] Job List page (`/jobs`) with All/Logged/Dreams filter pills
- [x] Network List page (`/network`)
- [x] Dream + Applied toggles on every Job card
- [x] `/dreams` (legacy URL) → redirects to `/jobs`

### Many-to-many links
- [x] `entry_links(job_id, network_id)` junction table with `ON DELETE CASCADE`
- [x] `LinkContactsModal` with search + "+ Create new contact" inline flow
- [x] `LinkChips` shown on Job cards, Network cards, and Edit page
- [x] `POST /api/entries/:id/links` and `DELETE /api/entries/:id/links/:other_id`
- [x] Cascade delete: deleting an entry removes its links automatically

### Visual + UX
- [x] React 19 + Vite 6 + react-router-dom 7
- [x] Radix Teal (accent) + Radix Sage (neutral) design tokens
- [x] Warm-clay secondary accent for Network
- [x] Light + dark mode via `prefers-color-scheme`
- [x] Sticky nav with brand mark (document icon)
- [x] Briefcase / Users / Link / Close icons (inline SVG, Lucide style)
- [x] Visible URL chip on cards (cleaned domain + path, full URL on hover)
- [x] Inline hints aligned with label titles (form rows don't drift)
- [x] Job + Network forms harmonized (operative fields first, Date last)

### Dev experience
- [x] `start-dev-fe-be.sh` (bash) — Vite + Node side by side, color-prefixed
- [x] `start-dev-fe-be.ps1` (PowerShell) — same for PowerShell users
- [x] VS Code task: `Ctrl+Shift+B` → "dev: fe + be" runs both in split panes
- [x] CSS imported from JS so Vite dev server picks it up via HMR

---

## Phase 1 — Follow-ups / polish

### Small bugs and rough edges
- [ ] One-shot SQL migration that maps old TYPE values ("Employer", "Career Counseling", "Application Submitted", "Networking Event") to the new MA-aligned vocabulary
- [ ] Make the weekly view's printable layout actually look like Form 1750 (currently a generic table that prints cleanly, but not the official template)
- [ ] Auto-resize notes textarea instead of fixed `rows={2}`
- [ ] Visual cue when a Dream is also Applied (e.g., chip border color shift) — currently the card sinks to the bottom but doesn't visually signal the combination
- [ ] Optional: replace `confirm()` with a typed-confirmation modal for delete on entries with linked contacts
- [ ] Keyboard shortcuts: `n` = new entry, `/` = focus search

### Documentation
- [ ] Update README's "load on startup" instructions to reference the new dev scripts
- [ ] Add a screenshot of the modernized UI to README
- [ ] Decide on a license — `package.json` currently says `UNLICENSED`; before sharing, pick MIT / Apache-2.0 / AGPL based on Phase 2 intent
- [ ] CONTRIBUTING.md (only if external contributors arrive)

### Testing
- [ ] Add Playwright (or similar) for end-to-end browser tests — current 23 tests cover the API but not React behavior
- [ ] Visual regression test for the print stylesheet
- [ ] Run all tests in CI (GitHub Actions) on push

---

## Phase 2 — Product direction

### Architectural decisions (TBD)
- [ ] Confirm or pivot: SPA + JSON API (current Phase 1) vs. local-first SPA with sqlite-wasm
- [ ] If multi-device sync is needed: user's own cloud (Drive / Dropbox) vs. server sync
- [ ] Decide on auth provider (Clerk, Supabase Auth, or skip if local-first)

### Multi-user (only if needed)
- [ ] User accounts table + auth middleware
- [ ] Add `user_id` scope to `entries`, `week_meta`, `entry_links`
- [ ] Encryption at rest for PII (employer names, contact info)
- [ ] Password reset flow
- [ ] Per-user data export ("download my data" button)

### Hosting + ops
- [ ] Choose platform (Render, Railway, Fly, Cloudflare Pages)
- [ ] Register domain
- [ ] SSL / TLS (free via platform)
- [ ] Daily DB backups
- [ ] Uptime + error monitoring
- [ ] Privacy policy page
- [ ] Terms of use page
- [ ] "Not affiliated with MA DUA" disclaimer on every page

### Multi-state
- [ ] State template registry (JSON config per state)
- [ ] Onboarding picks user's state and adjusts dropdowns / required activity count / weekly log shape
- [ ] WI UCB-12-E template (highest-need state per §5.4)
- [ ] MO UInteract-compatible template
- [ ] Per-state print-as-PDF layout

### Compliance defensibility
- [ ] Append-only event log (so user can prove when something was entered)
- [ ] Signed weekly PDF with stable content hash
- [ ] Per-entry audit-trail view (history of edits)

### Chrome extension (high-risk, high-value)
- [ ] Phase 2.1 — read-only mode: detect a UI Online certification page, suggest entries from local DB
- [ ] Phase 2.2 — fill mode: populate fields, user clicks Submit (we don't)
- [ ] Sandbox tests against UI Online dev/staging if available
- [ ] Explicit disclaimer on first use

### Entity / legal
- [ ] Decide entity timing (no entity → fiscal sponsorship → 501(c)(3))
- [ ] If fiscal sponsorship: apply to Open Collective Foundation or similar
- [ ] Plain-language privacy policy
- [ ] Plain-language terms of use

### Funding
- [ ] GitHub Sponsors profile
- [ ] Open Collective listing
- [ ] Outreach to MassHire about an "unofficial tool" link from their resources page

---

## Stretch / future / "someday maybe"

### From [PRODUCT_BRAINSTORM.md](PRODUCT_BRAINSTORM.md)
- [ ] Career-notebook mode — capture half-formed ideas before they become applications
- [ ] Email draft assistant — turn notes into a professional email
- [ ] "Maybe someday" file separate from Dreams (longer time horizon)

### Mobile / accessibility
- [ ] Real mobile-responsive pass (basic responsiveness only right now)
- [ ] PWA: installable, offline-capable
- [ ] Voice notes via Web Speech API for quick capture during commutes
- [ ] WCAG AA audit (probably passes already on color contrast; verify on keyboard nav)

### Integrations
- [ ] LinkedIn URL paste → auto-fill a Network entry
- [ ] Calendar export (.ics) for interviews from `Results=Interview` rows
- [ ] iCal subscription URL for weekly compliance reminders
- [ ] Email-in: forward a job posting, get a draft Job entry

### Reports
- [ ] Weekly summary email (or printable)
- [ ] Monthly "what did I do" report
- [ ] Cross-type aggregate view

### Multi-language
- [ ] Spanish UI for MA Spanish-speaking claimants

### Research questions
- [ ] Does MA's UI Online have any public/semi-public API?
- [ ] How fast does Form 1750 change in practice? (affects per-state template update cadence)
- [ ] What's the actual audit rate in MA? (NELP / FOIA?)
- [ ] If you're partial-UI for a week (called back), does that week count toward your 26/30-week max?
