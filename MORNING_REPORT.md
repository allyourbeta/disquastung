# MORNING_REPORT.md — vercel-migration

Overnight unattended run, executed per `MIGRATION_SPEC.md`. All phases (0-6,
including the PWA stretch goal) are green. Nothing hit the 3-attempts "stuck
rule" — there is no `BLOCKED.md`. Full detail/rationale for every judgment
call is in `PROGRESS.md`; this file is the summary + morning action items.

## Phase status

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 0 — Recon + golden master | 🟢 green | `e824b4b` | JSON endpoint shapes, DOM contract, 4 golden fixture files |
| 1 — Scaffold + static shell | 🟢 green | `09436e6` | `git mv` to `legacy/`, Vite multi-page, assets copied byte-identical |
| 2 — Engine + golden-master tests | 🟢 green | `3ce4205` | 69/69 assertions match Python 100% |
| 3 — Wire UI to engine | 🟢 green | `b9f49ba` | 17 Playwright tests |
| 4 — Stats + weighted selection | 🟢 green | `178d805` | 18 Playwright + 79 vitest |
| 5 — Deploy to new Vercel project | 🟢 green | `d3a5c16` | see URL below |
| 6 — PWA (stretch) | 🟢 green | `302f8ab` | 26 Playwright + 79 vitest after this commit |
| 7 — This report | — | (this commit) | |

Final state: `npm run build` green, `npx vitest run` green (79/79),
`npx playwright test` green (26/26 local), `playwright.prod.config.js`
green against the deployed URL. No file over 300 lines except the one
spec-approved pre-existing exception (`src/ui/auto-advance.js`, 324 lines,
ported byte-for-byte, not refactored).

Branch `vercel-migration` is pushed to `origin`. `main` was never touched or
pushed to from this session. The live PythonAnywhere site and
disquastung.com were not touched in any way.

## Deployed URL

**https://disquastung.vercel.app**

Try it on your phone: open that URL in Safari/Chrome, tap "Light or Dark?",
answer a few squares. To install as an app: Safari → Share → "Add to Home
Screen" (iOS) or Chrome's "Install app" prompt (Android) — the PWA manifest
and service worker are live, so it installs and the 64 audio clips work
offline after the first load.

Vercel project: `futuressobrights-projects/disquastung` (scope
`futuressobrights-projects` — the only team available on this account/CLI
session). Connected to the `allyourbeta/disquastung` GitHub repo.

## Morning steps: activating Supabase

Everything below is written but dormant. `localStorage` stats work today
with zero setup; do this only when/if you want cross-device stats sync.

1. supabase.com → New project (free tier) → name `disquastung`.
2. Dashboard → SQL editor → run `supabase/migrations/0001_square_stats.sql`.
3. Authentication → Providers → enable Anonymous sign-ins.
4. Project Settings → API → copy the Project URL + anon public key.
5. `vercel env add VITE_SUPABASE_URL production` (paste the URL), then
   `vercel env add VITE_SUPABASE_ANON_KEY production` (paste the anon key) —
   run these from this repo directory so they land on the
   `futuressobrights-projects/disquastung` project; then
   `vercel deploy --prod --yes --scope futuressobrights-projects`.
6. Verify stats now write to Supabase (Table editor → `square_stats` shows
   rows after a few answers on the color drill).

**Known gap to fix when you do this:** the SQL migration only grants
select/insert/update RLS policies (per spec). `SupabaseAdapter.resetStats()`
issues a `delete`, which will fail RLS as written — add a delete policy
(`auth.uid() = user_id`) to the migration first if you want the reset
button/flow to work against Supabase. Harmless tonight since the adapter
never got exercised against a real project.

## Pre-existing issues noticed, deliberately not fixed

These predate tonight's migration and were out of scope (spec: port
faithfully, don't "improve" along the way):

- `src/ui/auto-advance.js` — 324 lines, over the 300-line max. Pre-existing
  in the legacy app; ported byte-for-byte per spec instruction, not
  refactored. (Note: this file — and `src/ui/keyboard-input.js` — are
  ported source but not wired into any of the 4 new HTML pages; see below.)
- `legacy/app/__init__.py` has a hardcoded Flask `SECRET_KEY = 'ssecret-key'`.
  Irrelevant to the new static site (no Flask session anymore) but worth
  knowing if `legacy/` is ever run again for reference.
- `legacy/app/static/js/sounds.js` is dead code (confirmed unreferenced by
  any template even before tonight); not ported at all, per spec ("ignore
  it" — `game.js` is the real audio engine).
- The bishop engine has a faithful-but-odd quirk carried over from the
  Flask app: asking "how many moves from a square to itself" answers **2**
  (with a go-out-and-back path), not 0 or "N/A" — this can never actually
  happen in play (the square-pair generator never offers a square paired
  with itself), but it's baked into `src/engine/bishop.js` and covered by a
  golden-master fixture, so don't "fix" it without also checking whether
  the live Flask app's behavior should change first.

## New judgment calls this session (full rationale in PROGRESS.md)

- `keyboard-input.js` and `auto-advance.js` were ported into `src/ui/` (spec
  requires porting all 6 legacy JS files) but are **not** wired into any of
  the 4 new pages. Their only legacy host, `result.html`, has no equivalent
  in the new SPA-only architecture (the SPA already inlines its own result
  view + keyboard handling in `game.js`), and both files were already
  unreachable in the current live app too (their own `window.location.pathname.
  includes('_game')` boot-guards never matched the SPA's URLs). Wiring them
  up would be new functionality, not a port.
- `game.js` gained one new line (`loadNext();` at boot) since there's no
  more server-rendered initial square — this was anticipated by the spec's
  Phase 1 instructions but needed an actual code change to make true.
- Knight/bishop answer checks now record stats for *both* squares in the
  pair (the interface is drill-generic per spec, but weighted selection
  only reads it for the color drill either way — see PROGRESS.md).

## Suggested next session: DNS cutover checklist (documented only, NOT performed)

When ready to actually replace the PythonAnywhere site with this one at
`disquastung.com`:

1. Merge or otherwise promote this branch once you're satisfied — this repo
   currently has no `main`-branch changes from tonight to review/merge.
2. In Vercel: Project Settings → Domains → add `disquastung.com` (and
   `www.disquastung.com` if used) to the `disquastung` project.
3. At your DNS provider: point `disquastung.com` to Vercel per the records
   Vercel's domain UI shows (typically an A record to Vercel's anycast IP,
   or a CNAME for the `www` subdomain) — Vercel will validate once DNS
   propagates.
4. Decide the migration order for PythonAnywhere: either cut DNS over first
   (brief downtime while propagating) or run both in parallel behind
   different hostnames until you're confident, then cut over.
5. Once traffic is confirmed flowing to the new Vercel deployment, decommission
   the PythonAnywhere app (or leave it as a cold backup for a while).
6. Nothing above was executed tonight — guardrail 3 forbade any DNS/domain
   operation, and disquastung.com was not touched.
