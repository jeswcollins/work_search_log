# PRODUCT_PLAN.md — work_search_log

Draft v2 — 2026-05-20. (v1: 2026-05-19.) Phase 1 **shipped** on branch
`phase-1-react`. See [CHECKLIST.md](CHECKLIST.md) for the live punch list.

This document scopes the development arc of the work-search log app, anchored
in a competitive review, a state-by-state look at work-search rules, a cost
analysis for cloud hosting, and an entity-structure assessment (LLC vs.
nonprofit). It also examines the structural reason this niche is under-served:
in MA and most states, work-search activities are recorded **after** the week
ends, not during it.

---

## 0. Implementation status (2026-05-20)

**Phase 1 is functionally complete** on the `phase-1-react` branch, with
several features beyond the original v1 scope:

| Area | Status |
|---|---|
| SQLite store + node:sqlite migration | ✅ shipped |
| Form-1750-aligned fields, edit/backdate/delete | ✅ shipped |
| Weekly view + CSV export + print CSS | ✅ shipped |
| Partial-UI "called back this week" toggle | ✅ shipped |
| Architecture: React 19 + Vite 6 SPA over JSON API | ✅ shipped (beyond v1 scope) |
| Job List + Network List + many-to-many links | ✅ shipped (beyond v1 scope) |
| Dream / Applied flags with auto-sort | ✅ shipped (beyond v1 scope) |
| Radix Teal + Sage design system, light/dark mode | ✅ shipped (beyond v1 scope) |
| 23/23 integration tests on `node:test` | ✅ green |
| Phase 2 (multi-user, hosting, multi-state, etc.) | ⏳ planned, not started |

The v1 plan called for ~12–18 hours of vanilla SSR. The realized Phase 1
is closer to 40 hours, includes a React SPA, and adds the Network/Link
domain (which wasn't in the v1 scope at all).

---

## 1. Executive summary

- The app **was** a 2018-era personal Node/HTML tool; the rework on
  `phase-1-react` modernizes it to a React SPA with SQLite-backed JSON API,
  fully aligned to MA DUA Form 1750.
- The closest commercial neighbors (Huntr, Teal, Simplify, ApplyArc) are
  general job-application CRMs. **None of them produce a state-shaped
  UI-compliance artifact.** That's still the open niche.
- The "why doesn't this exist already?" question has a real answer:
  state UI systems are deliberately **retrospective** — you certify a week
  after it ends. A tool that helps users *during* the week is a journaling
  layer, not an interface to the state system. That's a legitimate product,
  but the value prop has to be framed that way.
- Phase 1 closed the compliance gap for personal use and added a Network
  domain + many-to-many links that turns the app into a job-search CRM as
  well as a compliance log. Phase 2 (multi-user, hosting, multi-state) is
  unstarted; the architectural choice between server-DB SPA and local-first
  SPA-with-sqlite-wasm is the open question.

---

## 2. Pre-rework state (historical, as of v1 draft 2026-05-19)

### 2.1 Repository inventory (then)

- Canonical local copy: [serverScripts/workSearchLog](C:\Users\jesse\OneDrive\otherProgramming\serverScripts\workSearchLog)
- Public mirror: [github.com/jeswcollins/work_search_log](https://github.com/jeswcollins/work_search_log)
- Active working copy (then-empty, now the Phase 1 home): `c:\Users\jesse\dev\work_search_log`
- Server: [server_log_work_search_by_day.js](C:\Users\jesse\OneDrive\otherProgramming\serverScripts\workSearchLog\server_log_work_search_by_day.js) — plain Node `http`, port 1025, no dependencies, no `package.json`.
- Form: [addForm.html](C:\Users\jesse\OneDrive\otherProgramming\serverScripts\workSearchLog\addForm.html) — DOM-built form, `application/x-www-form-urlencoded` POST.
- Storage: one HTML file per day under `work_search_logs_by_day/`, edited by
  byte-seek over the `</table>` closing tag.
- Last commit on GitHub: 2020-05-05. Last log entry on disk: 2019-02-08.

The legacy code is preserved on the `master` branch of the
`c:\Users\jesse\dev\work_search_log` clone; the rework lives on
`phase-1-react`.

### 2.2 Compliance gap — current fields vs. MA Form 1750

MA's official Work Search Activity Log (Form 1750-rev) and the in-portal entry
form on UI Online capture the following fields:

| MA-required field | App's field | Status |
|---|---|---|
| Date | implicit (filename = today) | **Gap — no backdate or edit** |
| Type (Career Fair, Employer, Workshop, etc.) | — | Missing |
| Name (Employer/Agency) | Organization | OK |
| Person Contacted | Person | OK |
| Contact Method (in-person / phone / email / website / mail) | — (Phone is free-text) | Missing as a structured field |
| Contact Information | folded into "Phone" | Partial |
| Type of Work | — (Description is loose) | Missing |
| Results | — | Missing |

### 2.3 Code/architecture readiness

- Several variables (`todaysDate`, `todaysFile`, `appendFormRS`, `todaysFileWS`)
  are assigned without `let`/`const`/`var`. They leak to global scope and would
  race under concurrent requests.
- Storage rewrites `</table>` by byte offset, which is fragile and makes
  edit/delete/search/export expensive.
- No edit, delete, or backdate — a forgotten Friday entry has no clean recovery.
- No validation, auth, HTTPS, tests, `package.json`, or CI.
- No export to CSV/JSON/PDF — producing what DUA actually wants on audit
  requires manual transcription.
- Form fields, table header, and row builder are duplicated in three places
  and must be kept in sync by hand.

**Readiness for personal use:** functional as a private submission journal,
but does not produce the artifact DUA would expect on audit.

**Readiness as a product:** ~10% of the way there.

---

## 3. Competitive landscape

### 3.1 General job-application trackers
- **[Huntr](https://huntr.co/)** — Kanban + CRM + Chrome autofill. Free up to 40 jobs; $10/mo unlimited.
- **[Teal](https://www.tealhq.com/tools/job-tracker)** — Chrome extension, ATS keyword analysis, document storage. Unlimited free with feature limits.
- **Simplify** — autofills 100+ ATS portals. Free.
- **ApplyArc** — free Kanban + AI generations, no credit card.
- **Reviewed by:** [Prentus](https://prentus.com/blog/we-found-the-5-best-job-tracker-tools-on-the-market), [ApplyArc roundup](https://applyarc.com/blog/best-free-job-tracker-apps-2026).

These all win on UX, autofill, and breadth. None produces a state-specific
UI-compliance artifact. None models partial-UI weeks. Several store your
search history on their servers, which is a privacy concern for some users.

### 3.2 UI-compliance tools
- State PDF templates — [MA Form 1750](https://www.mass.gov/doc/work-search-log-0/download), [TX](https://www.twc.texas.gov/sites/default/files/ui/docs/work-search-log-twc.pdf), [WA](https://esd.wa.gov/media/pdf/1045/esd-job-search-log-251110-accessiblepdf/download?inline=), [NJ](https://www.nj.gov/labor/myunemployment/assets/pdfs/log.pdf), [IL](https://ides.illinois.gov/content/dam/soi/en/web/ides/ides_forms_and_publications/ADJ034F.pdf), AK, MD. Free, official, static.
- **State portals** — MA UI Online, Maryland BEACON, Wisconsin DWD, NC DES.
  These are the real "competitors" for the official record.
- **[pdfFiller](https://worksearch-log.pdffiller.com/)** and similar — fillable-PDF wrappers on state forms.

No dedicated open-source state-aware UI compliance tracker found.

### 3.3 Where this app could uniquely sit
- **Local-first / private** — search history stays on the user's machine.
- **Form-1750-shaped export** — a one-click "produce a printable, signed
  log for week ending Saturday MM/DD" is something none of the above does well.
- **Partial-UI/furlough-aware** — model "called back this week, work-search
  not required" vs. "owe 3 activities" — relevant to Jesse's actual situation
  and likely to many partial-UI claimants.

---

## 4. Why doesn't this product already exist? The retrospective-logging wrinkle

User-raised concern: MA's portal won't accept work-search entries during the
week — only after the week ends. Is there a legal reason, and do other states
do the same?

### 4.1 What MA actually does
MA's UI Online ties work-search entry to the **weekly certification** step.
Per Mass.gov: a benefit week runs Sunday–Saturday, and the weekly claim for
the previous week can be filed Sunday–Saturday of the following week (with a
21-day grace period). The certification is an attestation under penalty of
perjury that you performed the activities — so by construction, the system
accepts them only after they've happened. See
[Mass.gov: file your weekly claim](https://www.mass.gov/info-details/weekly-requirements-to-get-unemployment-assistance).

### 4.2 Is this a legal requirement or a UX choice?
It's a **legal/policy artifact**, not a hard statutory rule.

- **Federal:** The U.S. Department of Labor requires that claimants attest
  weekly to having actively sought work; see
  [DOL: weekly certification](https://www.dol.gov/agencies/eta/ui-modernization/initial-application/weekly-certification).
  Attestations are necessarily backward-looking, so the *certification* must
  happen after the week. But that says nothing about whether activities can be
  recorded prospectively as a journal.
- **State practice:** Some states already decouple the two:
  - **Maryland** has claimants record activities in the [Workforce Exchange
    job-search log](https://labor.maryland.gov/unemployment-insurance/claimants/job-search.shtml)
    throughout the week; entries auto-populate into BEACON at certification.
  - **Wisconsin** allows ongoing entry into its
    [UCB-12-E action log](https://dwd.wisconsin.gov/dwd/forms/ui/ucb-12-e.htm).
  - **Missouri** explicitly allows entries "anytime throughout the week,"
    [per its Labor FAQ](https://labor.mo.gov/faqs/knowledge-base/do-i-need-search-work).
  - **North Carolina** announced a phased rollout of an online work-search
    record-keeping feature in [March 2025](https://www.commerce.nc.gov/news/press-releases/2025/03/21/new-online-work-search-record-keeping-feature-unemployment-claims-being-implemented-phases).
- **Why MA is different:** likely just a legacy UX decision in UI Online,
  combined with fraud-prevention conservatism. Random audits of work-search
  claims are common ([NELP overview](https://www.nelp.org/insights-research/work-search-requirements/)),
  and a system that only accepts retrospective entries has a clean audit
  trail. There's no apparent statutory bar to a prospective-journal feature;
  it just isn't built.

### 4.3 What this means for the product
1. The opportunity is real: many states (MA included) **do not** offer a
   prospective journal, even though logging-as-you-go is the natural UX for
   claimants. A third-party tool that fills that gap is genuinely useful.
2. The product is a **journal, not a submission interface**. It should never
   advertise itself as "filing your work searches" — only as "keep records
   you can transcribe into the portal when you certify, and produce
   Form-1750-shaped backups if audited." This framing also limits liability.
3. Auto-fill / submission via Chrome extension into UI Online is technically
   possible but legally fraught — discussed under §10.

---

## 5. State-by-state readiness assessment

This section answers two related questions: *where does the need exist?* and
*where would a third-party tool actually add value?* The answers differ
because some states already capture work-search activities natively in their
portal — in which case a private log is redundant.

### 5.1 National picture

The U.S. Department of Labor's [Comparison of State UI Laws](https://oui.doleta.gov/unemploy/statelaws.asp)
publishes annual tables (5-14, 5-15) covering work-search rules.

- **All 50 states + DC** require active work search for regular UI in normal
  conditions. Pandemic-era waivers have largely sunset; emergency federal
  flexibility ended September 6, 2021, per
  [Bloomberg Law](https://news.bloomberglaw.com/daily-labor-report/work-search-waivers-for-jobless-aid-may-end-as-states-reopen).
- **Minimum activities per week ranges from 1 to 5.** MA, NJ, CA, IL, MO, NC
  and many others require 3. **Wisconsin requires 4** — one of the highest
  in the country. WA requires 3 plus documentation. DC requires 2
  ([DOES DC](https://unemployment.dc.gov/page/work-search-requirements-0)).
- **In-portal logging vs. on-your-own:**
  - **Portal-required:** MD (BEACON via Workforce Exchange), NC
    (MyNCUIBenefits, rolling out expanded record-keeping in phases since
    March 2025).
  - **Portal-accepted but not required:** MA, WI, MO — claimants can enter
    via the portal at certification, but personal logs are accepted and are
    the audit fallback.
  - **Print-only:** AK and several others still rely primarily on PDF logs.
- **No-work-search states (current):** essentially none for regular UI in
  2026. DC has waived the requirement for furloughed federal employees as of
  January 2026 ([Vigilant Blog](https://www.vigilant.org/employment-law-blog/washington-work-search-requirements-waived-for-unemployment/)),
  and other narrow categorical waivers exist (union-hall workers, WorkShare
  participants, definite-recall claimants). This is a niche carve-out, not a
  market segment.

### 5.2 Audit mechanics in five key states

All five share three traits: random selection, claimant-supplied
documentation, and fraud-grade consequences (denial of benefits, repayment
of overpaid amounts, and potential prosecution for knowing false statements).
The *mechanics* of how audits run differ substantially.

#### Massachusetts (MA)
- **Logging:** No during-week capture in UI Online — activities entered only
  at weekly certification, which happens after the week ends. The official
  paper form is [Form 1750](https://www.mass.gov/doc/work-search-log-0/download).
- **Activities/wk:** 3.
- **Retention:** not specified by DUA in published guidance, but federal
  guidance and good practice suggest at least 2 years.
- **Audit selection:** Random, per [NELP overview](https://www.nelp.org/insights-research/work-search-requirements/).
- **What they ask for:** Documentation of activities — emails, application
  receipts, job postings, fair announcements, networking-event proof.
- **Tool value:** **High.** No during-week portal capture, retrospective-only
  certification, and Form 1750 has a clear shape to export to.

#### Maryland (MD)
- **Logging:** Activities entered into [Workforce Exchange](https://labor.maryland.gov/unemployment-insurance/claimants/job-search.shtml)
  during the week; entries auto-populate into [BEACON](https://beacon.labor.maryland.gov)
  at weekly certification. The state holds the canonical log natively.
- **Activities/wk:** 3.
- **Audit infrastructure:** [UI Benefit Payment Control (BPC)](https://labor.md.gov/employment/uibpcaudit.shtml)
  — a dedicated audit unit.
- **Selection:** Random selection plus cross-match flags. BPC runs the
  [State Directory of New Hires](https://labor.maryland.gov/unemployment-insurance/claimants/audits-and-overpayments/),
  the National Directory of New Hires, and Wage Crossmatch audits comparing
  reported wages against employer-reported wages. Work-search audits sit on
  top of these.
- **What they ask for:** Supporting documentation for reported activities
  (emails, application confirmations, screenshots).
- **Tool value:** **Low.** Maryland already does the during-week logging the
  rest of us want. A third-party tool overlaps the official record.

#### Wisconsin (WI)
- **Logging:** Form [UCB-12-E](https://dwd.wisconsin.gov/dwd/forms/ui/ucb-12-e.htm)
  ("Work Search Action Log") is the claimant-maintained record. The state
  doesn't capture per-activity detail at certification — just the count.
- **Activities/wk:** **4** — among the highest in the U.S. See [UCB-18071-P](https://dwd.wisconsin.gov/dwd/publications/ui/ucb-18071-p.pdf).
- **Retention:** **1 year minimum.**
- **Audit infrastructure:** DWD's UI division; the employer-side
  [audit handbook](https://dwd.wisconsin.gov/ui201/t7201.htm) describes a
  methodology that mirrors claimant audits.
- **Selection:** Random plus triggers (suspicious patterns, anonymous tips,
  prior overpayments).
- **What they ask for:** All columns on the log filled in with **enough
  detail to allow verification** — contact name, contact method, date,
  position, results. Bare/sparse entries get rejected. Wisconsin's standard
  is more explicit than most.
- **Tool value:** **Highest.** 4/week, 1-year retention, claimant-owned log,
  and an explicit "enough detail to verify" standard. A print-to-UCB-12 view
  is genuinely high-value for WI users.

#### Missouri (MO)
- **Logging:** Entered into [UInteract](https://labor.mo.gov/faqs/knowledge-base/do-i-need-search-work),
  either during the week ("Enter Work Search Details") or at weekly request
  for payment.
- **Activities/wk:** 3, with exemptions for approved training, definite
  recall date, and Shared Work participants.
- **Audit infrastructure:** [Unemployment Insurance Auditor I](https://oa.mo.gov/personnel/classification-specifications/0714)
  and [Auditor II](https://oa.mo.gov/personnel/classification-specifications/0715)
  — a formally classified investigator job series. Missouri uses live
  investigators, not just back-office reviewers.
- **Selection:** Random sampling plus referrals from claims examiners.
- **What they ask for:** Documentation **plus claimant interviews** — phone
  or in-person. The interview component is the differentiator.
- **Tool value:** **Medium-high.** UInteract captures during-week activity
  if the user enters it, but many don't. The interview model makes
  defensibility (dated, tamper-evident records) more valuable than a plain
  CSV dump.

#### North Carolina (NC)
- **Logging:** Entries go into [MyNCUIBenefits](https://www.des.nc.gov/individuals/weekly-requirements/your-work-search-responsibilities)
  before weekly certification can be filed. Supporting documents *can* be
  uploaded but aren't required. An expanded record-keeping feature is
  rolling out in [phases since March 2025](https://www.commerce.nc.gov/news/press-releases/2025/03/21/new-online-work-search-record-keeping-feature-unemployment-claims-being-implemented-phases).
- **Activities/wk:** 3 different employer contacts.
- **Retention:** **5 years** — longest of the five.
- **Required fields:** highly structured — contact method (in person / phone
  / email / online / fax), full contact information, and explicit **results**
  (submitted application, second interview, completed activity, not hiring).
  This schema maps almost 1:1 to MA Form 1750.
- **Selection:** Random, plus in-person reviews during the benefit period
  (DES pulls records at scheduled appointments). Audits can also happen
  **after** the user stops filing.
- **Tool value:** **Medium.** State captures the data, so primary
  redundancy is low — but 5-year retention with structured fields is
  exactly what a local-first exportable tool is good at. NC's structured
  result requirement plus MA's compatibility means one template covers
  both.

### 5.3 Comparison summary

| State | State-captured? | Activities/wk | Retention | Audit style | Tool value |
|---|---|---|---|---|---|
| MA | No (portal at cert only) | 3 | (not specified) | Random | **High** |
| MD | **Yes** (BEACON during week) | 3 | n/a (state has it) | Random + cross-match | Low |
| WI | No (paper UCB-12-E) | **4** | **1 year** | Random + tips | **Highest** |
| MO | Partial (UInteract optional) | 3 | (not specified) | Random + live investigator interviews | Medium-high |
| NC | Yes (MyNCUIBenefits) | 3 | **5 years** | Random + in-person + post-claim | Medium |

### 5.4 Implications for Phase-2 release ordering

Revised from the earlier draft of this plan. The right ordering follows
**unmet need** (claimant-owned log + retrospective state portal), not
population size:

1. **MA** — minimum viable audience; aligns with your own situation; Form
   1750 is the shipping template.
2. **WI** — highest unmet need in the country. 4/week + 1-year retention +
   claimant-owned log. Adding a UCB-12-E template is a small change after
   the MA template is generalized.
3. **MO** — interview-driven audits mean defensibility matters. Append-only
   event log + signed weekly PDF are the key features here.
4. **AK and other paper-log states** — small populations, but the static-PDF
   states are the easiest template adds once the MA → WI generalization is
   done.
5. **Skip MD and NC for now** — both states capture work-search data in the
   official portal, so the tool's value is mainly long-term backup. Worth
   adding later but not until 1–3 are stable.

The original "MA → IL → NJ → WA → CA" ordering was based on population, not
audit pressure. The revised ordering targets the states where claimants are
actually most exposed if their personal log is weak.

---

## 6. Phase 1: Personal-use refresh — SHIPPED

**Status:** complete on branch `phase-1-react`. Realized scope exceeded the
v1 plan; see CHECKLIST.md for the full per-feature list.

### 6.1 Originally-planned scope (all done)

1. **Schema migration to SQLite** — done. `node:sqlite` (Node 22.5+
   builtin). Legacy HTML files importable via `migrate.js` (parses both 6-col
   and older 5-col-with-checkbox formats).
2. **Field alignment to Form 1750** — done. All 8 fields captured with
   structured dropdowns for Type / Contact Method / Results.
3. **Edit + backdate + delete** — done. Each entry has edit/delete; date is
   a `<input type=date>` so backdate is one picker.
4. **Weekly export view** — done. `/week/:start` renders the week; CSV at
   `/week/:start.csv`. Print stylesheet hides controls.
5. **Light server tightening** — done. `package.json`, Node engine pinned,
   23/23 integration tests on `node:test`, scoped variables, npm scripts
   for `start`, `dev:server`, `dev:client`, `build`, `migrate`, `test`.
6. **Partial-UI flag** — done. `week_meta` table; per-week toggle drives
   a banner ("Called back this week — 0 activities expected" vs. "X of 3
   activities logged").

### 6.2 Beyond original scope (also shipped)

The v1 plan called for vanilla SSR. After comparing architectures, the
decision was **SPA + JSON API** (Vite 6 + React 19 + react-router 7,
Node JSON backend). See §8 "Frontend architecture" for the rationale.

Additional features that emerged during build:

- **Job List + Network List** — a `kind` column (`'job' | 'network'`) lets
  network contacts coexist with job entries. Cards on each page use a
  visual style suited to that kind (Job = teal briefcase, Network = warm
  clay users icon).
- **Many-to-many Link Contact** — `entry_links(job_id, network_id)`
  junction table with `ON DELETE CASCADE`. Each Job card has a "Link
  Contact" button that opens a modal picker (search + "+ Create new
  contact" mode). Linked entries display as colored chips on both sides.
- **Dream / Applied flags** — `is_dream` (idea not yet a real activity) and
  `applied` (whether the user has applied). Job List auto-sorts:
  active → dreams-not-applied → dreams-applied. Both toggles live on
  each Job card.
- **MA-aligned TYPES vocabulary** — dropdown values match the MA DUA work-
  search categories: Application, Interview, Job Search, Networking,
  Career Fair, Workshop, MassHire Service, Union Hall, Other.
- **Modernized design** — Radix Teal (accent) + Radix Sage (neutral) +
  warm-clay secondary for Network. Tokens for spacing/type/radius/shadow.
  Light + dark mode via `prefers-color-scheme`. Sticky nav with brand
  document icon. Visible URL chips on every card.
- **Visible-link chip** — when an entry has a `link`, the URL is shown as
  a small monospace chip below the headline (cleaned domain + path).
- **Dev launchers** — `start-dev-fe-be.sh` (bash) and `start-dev-fe-be.ps1`
  (PowerShell) run the Vite dev server and the Node API together with
  color-prefixed output. VS Code task does the same via `Ctrl+Shift+B`.

**Out of scope (still):** auth, multi-user, hosting, Chrome extension,
multi-state, public sharing.

**Actual effort:** ~40 hours, vs. v1 estimate of ~12–18.

---

## 7. Phase 2: Product direction

**Goal:** other people in MA (and eventually other states) can use it.

**Open architectural question (carried from §8):** Phase 1 shipped as a
server-backed SPA. Phase 2 has to decide whether to (a) keep the SPA + JSON
API and add multi-user on a hosted DB, or (b) pivot to local-first with
sqlite-wasm in the browser and the server reduced to a static-asset host
plus optional sync. The local-first path keeps VM cost effectively zero
and reinforces the privacy story, but requires reshaping the data layer.

**Scope:**

1. **Multi-user (only if needed)** — accounts, encryption at rest for PII,
   password reset. Auth provider: probably [Clerk](https://clerk.com/) or
   [Supabase Auth](https://supabase.com/auth) over rolling our own.
   Skip entirely if local-first is chosen.
2. **Per-state templates.** Abstract the field schema so the MA template,
   WI UCB-12-E, NJ, WA, etc. live in JSON. The existing TYPES /
   CONTACT_METHODS / RESULTS arrays are the seeds of this registry.
3. **Audit-ready export.** A signed PDF for each week, with a stable hash
   so the user can show "this is exactly what I had on date X." Especially
   important for MO (interview-driven audits) and NC (5-year retention).
4. **Privacy-first posture.** No selling data, no analytics on activity
   content, public privacy policy, prominent "we are not the state of MA"
   disclaimer on every page.
5. **Optional Chrome extension** — *fills* entries into UI Online at
   certification time, user clicks Submit. Highest-value, highest-risk;
   see §10.
6. **Onboarding flow** — picks user's state and configures templates /
   activity-count requirements accordingly.
7. **Phase 1 features that should harden for multi-user**:
   - Linked entries (entry_links) needs a user_id scope
   - Week_meta needs user_id scope
   - PATCH endpoint validation tightens (currently accepts any field)
   - Append-only history table for audit defensibility

**Estimated effort:** months, not weekends. Probably ~150–300 hours of
focused work to a public beta.

---

## 8. Cloud hosting and cost model

For a Node app with a small SQLite or Postgres database, sensible options in
2026:

| Platform | Free tier | Cheapest paid | Notes |
|---|---|---|---|
| [Render](https://render.com/) | 750 hr/mo web service, sleeps after 15 min | Starter $7/mo | Predictable pricing; good for solo. Cold starts on free are 10–30s. |
| [Railway](https://railway.app/) | $5 trial credit; $1/mo afterward, capped | Hobby $5/mo minimum usage | Usage-based; pay-for-idle is zero. |
| [Fly.io](https://fly.io/) | No free tier for new users | ~$2/mo for tiny VM | Card required. Good if multi-region matters later. |
| [Vercel](https://vercel.com/) | Generous free | Pro $20/mo | Best for serverless / Next.js front. |
| Static + Backblaze B2 + Cloudflare Workers | Mostly free | Pennies/mo | If product is "client-side app + state-portable file" — see §10. |

Comparison reviews: [Railway vs Render 2026](https://thesoftwarescout.com/railway-vs-render-2026-best-platform-for-deploying-apps/),
[Render's "real free tier" list](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026),
[Northflank's comparison](https://northflank.com/blog/railway-vs-render).

### Frontend architecture and its VM-cost implications

The architecture choice affects per-VM capacity by an order of magnitude.
Phase 1 stays vanilla; Phase 2 is where this decision matters.

| Architecture | Server CPU per request | Bandwidth | $/user effect |
|---|---|---|---|
| Vanilla SSR (current Phase 1: HTML strings + SQLite) | Low | Low | Baseline |
| **SPA + JSON API** (Vite + React + Node) | **Lower** than baseline (no HTML rendering) | Higher first load, lower steady state | **Cheaper per user** |
| **SSR React** (Next.js, Remix) | **2–10× baseline** (React rendering server-side) | Same as baseline | **More expensive per user** |
| **Local-first SPA** (React + [sqlite-wasm](https://sqlite.org/wasm/doc/trunk/index.md) or IndexedDB) | ~0 (static-asset hosting on CDN) | First load only | **Near zero** |

**Recommendation for Phase 2:** local-first SPA. It is the only option that
(a) keeps VM cost effectively zero, (b) leans into the privacy story
("your data never leaves your device") that differentiates this from
Huntr/Teal, and (c) makes offline use trivial — relevant for a tool people
log into while in transit between job-search activities. SSR React is the
worst-of-both-worlds option here: more expensive per user *and* less private
than the vanilla Phase 1 server.

This shifts the §7 Phase 2 scope: instead of "accounts + Postgres + Render
Starter," the architecture becomes "static site on Cloudflare Pages + an
optional sync endpoint." Accounts only become necessary if/when users want
to sync across devices.

### Cost projections (Phase 2, year 1)
Assuming <500 users, ~1 KB/entry, ~12 entries/week/user:

- Render Starter: **$7/mo** = $84/yr.
- Database: Render Postgres free (1 GB) or Supabase free (500 MB) — fine
  at this scale, $0.
- Email (password reset, weekly summary): [Resend](https://resend.com/) free
  3K/mo, $0.
- Domain: ~$12/yr.
- **Total: ~$100/yr** at <500 users. Survivable on donations or a small
  monthly grant.

### Open / sustainable funding
- **GitHub Sponsors / Open Collective** — visible, simple, no entity needed.
- **MassHire/MA partnership** — long shot but plausible: a state careers
  office might link to it from a resource page if it's clearly not pretending
  to be official.
- **Donate-what-you-want** — common pattern for civic-adjacent tools.

---

## 9. Entity structure: LLC vs. non-profit

Jesse's lean: non-profit. Quick assessment of when each fits.

### 9.1 What each gives you
Both LLCs and non-profits provide personal liability protection
([LiveAbout overview](https://www.liveabout.com/are-llcs-different-than-nonprofits-4590145),
[Wagenmaker law](https://www.wagenmakerlaw.com/blog/llcs-and-nonprofits)).
They differ in purpose and tax treatment:

- **LLC:** profit-seeking. Owners (members) can take distributions. Lower
  compliance overhead. State filing fee + simple annual report.
- **Non-profit (typically 501(c)(3)):** must serve a charitable, educational,
  scientific, or public-interest mission. No private owners. Donations are
  tax-deductible to donors. Annual 990 filing. Federal tax-exempt. Board of
  directors required.

### 9.2 Fit for a UI-compliance tool

- **Mission fit:** Helping people retain unemployment benefits is plausibly
  a charitable/educational purpose under 501(c)(3) (relieves poverty,
  combats community deterioration). Past examples: legal aid orgs, financial
  literacy non-profits.
- **Funding fit:** civic tech tools usually do better on grants and donations
  than on subscriptions. Donors and small foundations prefer giving to a
  501(c)(3) (deductible).
- **Liability fit:** roughly equivalent. Both provide a corporate veil.
- **Speed-to-launch:** LLC wins. MA LLC formation is ~$500 + ~$500/yr annual
  report. 501(c)(3) requires Articles of Incorporation, IRS Form 1023 or
  1023-EZ ($275–$600 filing fee), 6–12 month IRS review, and ongoing 990
  filings.
- **Reversibility:** going LLC first and converting later is feasible but
  awkward (you'd typically dissolve the LLC and start fresh, or convert to a
  benefit corp first). Going non-profit first and pivoting commercial is
  near-impossible without dissolving.

### 9.3 Hybrid options worth knowing
- **Fiscal sponsorship** — a category-matched 501(c)(3) "hosts" your project
  for an admin fee (typically 5–10% of incoming donations). Lets you accept
  tax-deductible donations without forming a non-profit yourself. Examples:
  [Open Collective Foundation](https://www.opencollective.com/), [Software in the Public Interest](https://www.spi-inc.org/).
  **This is probably the right answer for Phase 1 / early Phase 2.**
- **Public Benefit LLC / B-Corp** — LLC with a mission requirement; cleaner
  than nonprofit if revenue might grow but slower than plain LLC.
- **L3C (Low-profit LLC)** — a middle ground; not available in MA.

### 9.4 Recommendation
1. **Phase 1 (personal use):** no entity. Don't form anything.
2. **Phase 2 early (public beta, <100 users):** fiscal sponsorship via Open
   Collective or similar. Lets you accept donations to cover hosting without
   the 501(c)(3) overhead.
3. **Phase 2 mature (sustained users, real funding):** form a Massachusetts
   non-profit corporation and apply for 501(c)(3) status. Mission language
   centered on financial security / public-interest legal compliance access.

Avoid LLC unless you decide you want to charge users — and even then,
consider whether the math actually works at the scale you'd hit.

---

## 10. Open questions and risks

1. **Auto-fill into UI Online** — the most useful feature also carries the
   most risk. If a Chrome extension submits entries on behalf of a user and
   something is wrong (wrong week, wrong employer, missing attestation), DUA
   could treat it as fraud. Posture: **don't automate submission; automate
   transcription**. The extension fills the fields but the user clicks Submit.
2. **Liability disclaimers** — every page must clearly say "we are not
   affiliated with the Massachusetts Department of Unemployment Assistance.
   Your state portal is the official record." Add a terms-of-use page.
3. **Privacy** — work-search logs contain employer names, contact info, and
   inferentially the user's UI claimant status. Encrypt at rest; never sell
   or share; minimize analytics.
4. **Data portability** — every user should be able to download all their
   data in JSON and CSV at any time. Default to local-first if technically
   possible; sync via the user's own cloud (Drive, Dropbox) before doing
   server-side storage.
5. **Audit defensibility** — store an append-only event log so the user can
   prove "I entered this activity on this date" if DUA disputes.
6. **Multi-state schema drift** — state forms change. Build the state
   template registry so updates are data-only, not code changes.

---

## 11. Immediate next steps

Phase 1 is shipped. The next moves, in order:

1. **Live-fire test** — run the app for at least one full benefit week.
   Capture friction notes that aren't visible in code review.
2. **Polish pass** — the small items in
   [CHECKLIST.md](CHECKLIST.md) under "Phase 1 follow-ups". None are
   blocking; they're paper cuts.
3. **Decide on Phase 2 architecture** — server-backed SPA (extend current)
   vs. local-first SPA with sqlite-wasm. See §8 "Frontend architecture."
   Worth a focused 1-day spike of sqlite-wasm to feel the tradeoffs.
4. **Decide on entity timing** — no entity needed for personal use.
   Fiscal sponsorship (Open Collective) before Phase 2 launch. 501(c)(3)
   only if/when there's real user traction.
5. **Phase 2 scoping doc** — fork a v3 of this plan only after the
   architecture decision in (3) is made, since it materially affects the
   §7 scope.

For the full live punch list, see [CHECKLIST.md](CHECKLIST.md).

---

## Sources

- [Mass.gov — file your weekly unemployment claim](https://www.mass.gov/info-details/weekly-requirements-to-get-unemployment-assistance)
- [Mass.gov — work search log (Form 1750 download)](https://www.mass.gov/doc/work-search-log-0/download)
- [Mass.gov — FAQs about UI for workers](https://www.mass.gov/info-details/faqs-about-unemployment-insurance-for-workers)
- [Mass.gov — partial unemployment / WorkShare](https://www.mass.gov/info-details/apply-for-unemployment-benefits-as-a-federal-employee)
- [Massachusetts Legal Help — applying for UI](https://www.masslegalhelp.org/employment-unemployment/unemployment-insurance/how-apply-unemployment-insurance-massachusetts)
- [Mass Legal Services — UI claims process](https://www.masslegalservices.org/book/export/html/28001)
- [U.S. Dept. of Labor — weekly certification](https://www.dol.gov/agencies/eta/ui-modernization/initial-application/weekly-certification)
- [U.S. Dept. of Labor — Comparison of State UI Laws](https://oui.doleta.gov/unemploy/statelaws.asp)
- [NELP — work search requirements](https://www.nelp.org/insights-research/work-search-requirements/)
- [Bloomberg Law — pandemic waivers ending](https://news.bloomberglaw.com/daily-labor-report/work-search-waivers-for-jobless-aid-may-end-as-states-reopen)
- [DC DOES — work search requirements](https://unemployment.dc.gov/page/work-search-requirements-0)
- [Maryland Labor — job search log](https://labor.maryland.gov/unemployment-insurance/claimants/job-search.shtml), [BEACON portal](https://beacon.labor.maryland.gov), [BPC audits](https://labor.md.gov/employment/uibpcaudit.shtml), [overpayments and audits](https://labor.maryland.gov/unemployment-insurance/claimants/audits-and-overpayments/)
- [Wisconsin DWD — UCB-12-E log](https://dwd.wisconsin.gov/dwd/forms/ui/ucb-12-e.htm), [UCB-18071-P work-search requirements](https://dwd.wisconsin.gov/dwd/publications/ui/ucb-18071-p.pdf), [audit handbook (employer-side, methodology similar)](https://dwd.wisconsin.gov/ui201/t7201.htm)
- [Missouri Labor — work search FAQ](https://labor.mo.gov/faqs/knowledge-base/do-i-need-search-work), [UI Auditor I classification](https://oa.mo.gov/personnel/classification-specifications/0714), [UI Auditor II classification](https://oa.mo.gov/personnel/classification-specifications/0715)
- [NC DES — online work search record-keeping rollout](https://www.commerce.nc.gov/news/press-releases/2025/03/21/new-online-work-search-record-keeping-feature-unemployment-claims-being-implemented-phases), [NC DES — your work-search responsibilities](https://www.des.nc.gov/individuals/weekly-requirements/your-work-search-responsibilities)
- [TX work-search log](https://www.twc.texas.gov/sites/default/files/ui/docs/work-search-log-twc.pdf), [WA log](https://esd.wa.gov/media/pdf/1045/esd-job-search-log-251110-accessiblepdf/download?inline=), [NJ log](https://www.nj.gov/labor/myunemployment/assets/pdfs/log.pdf), [IL log (ADJ034F)](https://ides.illinois.gov/content/dam/soi/en/web/ides/ides_forms_and_publications/ADJ034F.pdf)
- [Huntr](https://huntr.co/), [Teal](https://www.tealhq.com/tools/job-tracker), [Prentus roundup](https://prentus.com/blog/we-found-the-5-best-job-tracker-tools-on-the-market), [ApplyArc free-tracker review](https://applyarc.com/blog/best-free-job-tracker-apps-2026)
- [Railway vs Render 2026](https://thesoftwarescout.com/railway-vs-render-2026-best-platform-for-deploying-apps/), [Render free tier list](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026), [Northflank comparison](https://northflank.com/blog/railway-vs-render)
- [LLC vs nonprofit overview (LiveAbout)](https://www.liveabout.com/are-llcs-different-than-nonprofits-4590145), [Wagenmaker Law: LLCs and nonprofits](https://www.wagenmakerlaw.com/blog/llcs-and-nonprofits), [Bizee: LLC vs nonprofit](https://bizee.com/articles/legal/llc-vs-nonprofit), [Open Collective](https://www.opencollective.com/)
