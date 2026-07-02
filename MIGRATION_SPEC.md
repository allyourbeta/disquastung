# MIGRATION_SPEC.md — Disquastung: Flask/PythonAnywhere → static Vite app on Vercel (Supabase-ready)

You are Claude Code, running unattended overnight. The owner (Ashish) is asleep and cannot
answer questions. This spec makes every decision for you. Where it is silent, choose the most
conservative option that keeps all gates green, and record the choice in PROGRESS.md.

There is no time pressure. Work slowly, verify constantly, commit often.

---

## 0. Context

**The app.** A chess-visualization trainer with three drills: square color, knight path
length, bishop path length. Flask + Jinja + vanilla JS, currently live on PythonAnywhere at
disquastung.com. A recent refactor made gameplay a no-reload SPA: `app/static/js/game.js`
drives everything via JSON endpoints in `app/routes.py` (`/api/color/new`,
`/api/color/check`, and knight/bishop equivalents). The old HTML GET/POST routes remain as a
no-JS fallback.

**Recent, precious work — do not break it:**
- `app/static/js/speech.js`: opt-in "Speak" toggle on the color drill. Plays pre-recorded
  clips (`app/static/audio/squares/*.m4a`, 64 files, voice "Tessa (Enhanced)", text like
  "A 1 is dark") via Web Audio, with browser-TTS fallback. `LEAD_MS = 400`. iOS-specific
  warm-up on first tap. `game.js` hands correct color answers to
  `ChessSpeech.onColorCorrect(data, autoAdvance, nextBtn)`.
- Vocabulary is **light/dark** everywhere (spoken AND displayed). Do not change wording.
- `app/static/js/keyboard-input.js`: keys W/L = light, B/D = dark, plus knight/bishop keys.
- iOS Safari AudioContext handling (including the `"interrupted"` state) in `game.js` — the
  real audio engine is `game.js`, NOT `sounds.js` (`sounds.js` is dead code; ignore it).

**Known codebase rules:**
- Before editing any JS file, grep which templates/pages load it.
- Max 300 lines per file for anything new or modified. `auto-advance.js` (324 lines) is a
  pre-existing violation: port it AS-IS, do not refactor it, note it in MORNING_REPORT.md.

**Tonight's goal.** On a branch, rebuild this as a fully static site (no backend): the Flask
logic becomes a client-side engine, stats + weighted square selection are added behind a
storage interface (localStorage tonight; Supabase adapter written but dormant), everything is
tested, and the result is deployed to a NEW Vercel project URL. The live PythonAnywhere site
and disquastung.com must be completely unaffected.

---

## 1. Non-negotiable guardrails

1. All work on a new branch: `vercel-migration`. Never commit to `main`. Never push `main`.
2. Never delete Flask code. On the branch, `git mv` the Flask app into `legacy/` (see Phase 1)
   so history is preserved and the new app lives at repo root.
3. **No DNS or domain operations of any kind.** Do not touch disquastung.com.
4. Do not create any cloud resources EXCEPT one new Vercel project via `vercel deploy --yes`.
   Do NOT create a Supabase project. Do NOT run `supabase login` or any Supabase CLI command
   that touches an account.
5. No `git push --force`, no history rewriting, no commands outside the repo directory, no
   `sudo`, no global installs (local devDependencies only).
6. Allowed new dependencies (devDependencies unless noted): `vite`, `vitest`,
   `@playwright/test`, `vite-plugin-pwa` (Phase 6 only), and `@supabase/supabase-js`
   (runtime dep). Nothing else without logging the reason in PROGRESS.md.
7. Commit at every phase gate (and at meaningful sub-steps) with clear messages prefixed by
   phase, e.g. `P2: engine passes golden-master tests`.
8. Stuck rule: after 3 genuinely different attempts at one problem, write it up in
   BLOCKED.md (what you tried, error output, your best hypothesis), then continue with any
   work that doesn't depend on it. Never loop on one failure for hours.
9. Resume protocol: maintain PROGRESS.md at repo root — current phase, what's done, what's
   next, decisions made, gotchas discovered. If your context is compacted or you restart,
   re-read PROGRESS.md + this spec first, then continue. Keep entries terse.
10. Token discipline: read files once and record what matters in PROGRESS.md instead of
    re-reading. Prefer `grep`/targeted reads over whole-file reads. Don't regenerate
    unchanged files.
11. Push the branch to origin (`git push -u origin vercel-migration`) at Phase 1, 3, 5
    gates and at the end. SSH auth is already configured.

---

## 2. Target architecture

Vite **vanilla JavaScript** multi-page app (NOT React, NOT TypeScript — this is a port; the
existing JS is vanilla and must move with minimal diffs).

```
/                          repo root (branch: vercel-migration)
├── index.html             home (from templates/index.html)
├── color.html             from templates/color_game.html
├── knight.html            from templates/knight_game.html
├── bishop.html            from templates/bishop_game.html
├── vite.config.js         multi-page: rollupOptions.input for all four pages
├── package.json
├── public/
│   ├── audio/squares/*.m4a    the 64 clips, copied byte-identical from legacy
│   ├── icons/                 copied from legacy
│   └── styles (css files)     copied; keep <link> paths working
├── src/
│   ├── engine/            PURE functions, no DOM, no storage imports
│   │   ├── board.js       squareColor(sq) -> 'light'|'dark'; randomSquare(); constants
│   │   ├── knight.js      knightMoves(a, b) -> integer (BFS shortest path count)
│   │   ├── bishop.js      bishopMoves(a, b) -> integer or -1 ("not possible")
│   │   ├── messages.js    attempt-count error messages, ported verbatim from routes.py
│   │   └── select.js      weightedRandomSquare(stats) — see Phase 4
│   ├── api/               ALL persistence goes through here
│   │   ├── storage.js     interface + adapter chooser (env-based)
│   │   ├── localAdapter.js
│   │   └── supabaseAdapter.js   dormant unless VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│   ├── backend.js         in-browser replacement for the Flask JSON API (Phase 3)
│   └── ui/                ported legacy JS: game.js, speech.js, keyboard-input.js,
│                          chessboard.js, auto-advance.js, tooltip.js
├── supabase/migrations/0001_square_stats.sql
├── scripts/generate_golden.py
├── tests/
│   ├── golden/            JSON fixtures produced by the Python script
│   ├── unit/              vitest
│   └── e2e/               playwright
├── legacy/                the entire old Flask app (git mv'd, untouched thereafter)
├── PROGRESS.md, BLOCKED.md (if needed), MORNING_REPORT.md
```

**DOM contract:** the ported JS finds elements by the same IDs/classes/body classes as today
(`game-page game-color`, `data-correct`, `.navigation-section`, `.result-next`,
`#chessboard-container`, form buttons with `value="light"`/`value="dark"`, etc.). The new
HTML pages must preserve that contract exactly. When in doubt, diff against the Jinja
template and keep the rendered structure identical.

---

## 3. Phases and gates

Run phases strictly in order. A phase's gate must be fully green before the next begins.

### Phase 0 — Recon + golden master
1. `git checkout -b vercel-migration`. Create PROGRESS.md.
2. Read: `app/routes.py`, `app/utils.py`, all four templates, all six JS files,
   `app/__init__.py`. Record in PROGRESS.md: every JSON endpoint's request/response shape
   (field names matter — e.g. color check returns `correct`, `correct_color`, `square`,
   wrong answers return `message`), session keys used, and which page loads which JS.
3. Write `scripts/generate_golden.py`: create a venv (`python3 -m venv .golden-venv`),
   `pip install flask`, then import the app's logic directly (or use Flask's `test_client`)
   to dump JSON fixtures into `tests/golden/`:
   - `colors.json`: all 64 squares -> correct color.
   - `knight.json`: at least 300 seeded-random square pairs -> correct move count, plus
     edge cases (same square, corners a1/h8, adjacent squares).
   - `bishop.json`: at least 300 seeded-random pairs -> move count INCLUDING the
     opposite-color "-1 / not possible" cases; plus same-square and same-diagonal cases.
   - `messages.json`: the exact error-message strings per attempt count for each drill.
   The script must be deterministic (fixed random seed) and re-runnable.
4. **Gate:** fixtures exist, are non-trivial (spot-print a few), committed. The venv itself
   is NOT committed (add `.golden-venv/` to `.gitignore`).

### Phase 1 — Scaffold + port static shell
1. `git mv` the Flask app (`app/`, `run.py`, `requirements.txt`, `DEPLOY.md`, `*.bak`,
   testing docs) into `legacy/`. Keep `scripts/` at root (the audio-generation scripts stay
   live). From here on, `legacy/` is read-only reference.
2. Scaffold Vite vanilla at root; configure the four pages as a multi-page build.
3. Convert each Jinja template to static HTML: strip Jinja syntax, inline what the template
   engine provided. Anything that came from server-rendered variables (e.g. the initial
   square, `data-correct`) becomes a placeholder the JS fills on load — game.js's SPA flow
   already fetches a fresh question on load via `/api/*/new`, so initial server-rendered
   values can be empty/neutral; verify against game.js's boot sequence and adapt minimally.
4. Copy CSS, icons, and the 64 clips into `public/` (verify: `ls public/audio/squares |
   wc -l` == 64; spot-check one file is byte-identical with `cmp`).
5. **speech.js path fix (required):** it currently derives the clip URL from its own
   `<script src>`; under Vite, source files are bundled and that derivation breaks. Change
   `AUDIO_BASE` to the constant `"/audio/squares/"` (public/ assets keep stable root paths).
   This is the ONLY permitted change to speech.js in this phase.
6. Keep the Google Analytics gtag snippet as-is in the HTML.
7. **Gate:** `npm run build` succeeds; `vite preview` serves all four pages; a minimal
   Playwright smoke test loads each page with zero console errors (JS will fail to fetch
   `/api/...` — that's expected and allowed ONLY in this phase's smoke test; assert pages
   render their static shell).

### Phase 2 — Engine (pure functions) + golden-master tests
1. Port the logic from `legacy/app/routes.py` / `utils.py` into `src/engine/` as pure
   functions. Port faithfully — do not "improve" the algorithms.
2. Vitest unit tests that load `tests/golden/*.json` and assert the JS engine matches the
   Python outputs **100%** — all 64 colors, every knight fixture, every bishop fixture,
   every message string.
3. **Gate:** `npx vitest run` fully green. If any fixture mismatches, the JS is wrong (the
   Python behavior is the definition of correct) — fix the JS, never the fixture.

### Phase 3 — Wire the UI to the engine
1. Write `src/backend.js`: exports functions that return Promises with the **exact same JSON
   shapes** as the Flask endpoints (record shapes came from Phase 0). Attempt counters that
   lived in the Flask session become module-level state here. Route it through the engine
   and (Phase 4) the stats recorder.
2. Modify `src/ui/game.js` minimally: replace its `fetch('/api/...')` calls with calls to
   `backend.js`. If game.js has a single fetch helper, swap inside it; otherwise change each
   call site surgically. Preserve everything else byte-for-byte where possible, especially
   all audio/AudioContext code and the `ChessSpeech.onColorCorrect` handoff.
3. Port keyboard-input.js, chessboard.js, auto-advance.js, tooltip.js with zero logic
   changes (path/import adjustments only). Grep the new HTML pages to confirm each script is
   loaded exactly where its legacy template loaded it.
4. Playwright E2E (run against `vite preview`), all three drills:
   - color: answer wrong then right; verify feedback text, verdict, next-question flow;
     verify the 3rd-wrong message matches `messages.json` ("a1 is a dark square...").
   - color keyboard: W/L and B/D all work; Enter/Space advances.
   - knight and bishop: complete a full correct round each (drive answers using the engine
     from the test to know ground truth); bishop must include a "not possible" case.
   - toggles: Auto toggle works; Speak toggle renders on color page only, flips and
     persists across reload (localStorage `chess-speak`).
   - audio: with Speak ON, answering correctly must issue a network request for
     `/audio/squares/<square>.m4a` (assert via Playwright request interception; do not
     assert actual sound).
   - zero uncaught console errors anywhere.
5. **Gate:** full Playwright suite green, `npm run build` green.

### Phase 4 — Stats + weighted selection (localStorage live, Supabase dormant)
1. `src/api/storage.js` interface: `recordAnswer({square, drill, correct, attempts})`,
   `getSquareStats() -> {square: {seen, misses, lastMissAt}}`, `resetStats()`. Adapter
   chosen at load: Supabase iff `import.meta.env.VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` are set, else localStorage. Storage failures must never break
   gameplay (catch, log, continue).
2. `localAdapter.js`: single JSON blob under key `disquastung-stats`, coarse per-square
   counters. Cap stored history (counters only, no per-answer log).
3. `src/engine/select.js` — `weightedRandomSquare(stats)` for the COLOR drill only:
   `weight(sq) = 1 + centerBoost + missBoost` where `centerBoost = 0.5` for the 16 central
   squares (files c–f, ranks 3–6), and `missBoost = min(1.5, 0.5 * misses(sq))` using the
   miss counter from stats. Deliberately coarse per the owner's request. Every square must
   always have weight ≥ 1 (no starvation). Wire `backend.js`'s color "new question" path to
   use it. Knight/bishop keep uniform random.
4. Unit tests: with empty stats, distribution over 20k draws shows central squares ~1.5x
   corner frequency (assert loose bounds, e.g. ratio between 1.25 and 1.75); with an
   artificially high miss count on one square, its frequency rises; all 64 squares appear.
5. `supabaseAdapter.js`: uses `@supabase/supabase-js`, Supabase **anonymous sign-in**
   (`signInAnonymously`), upserts per-square counters keyed by user id. Must import cleanly
   and no-op safely when env vars are absent (unit test exactly that). Do NOT attempt any
   live connection tonight.
6. `supabase/migrations/0001_square_stats.sql`: table
   `square_stats(user_id uuid references auth.users, square text check (square ~ '^[a-h][1-8]$'),
   drill text, seen int default 0, misses int default 0, updated_at timestamptz,
   primary key (user_id, square, drill))` with RLS enabled and policies restricting
   select/insert/update to `auth.uid() = user_id`.
7. E2E addition: play several color rounds, reload the page, assert stats persisted
   (localStorage) and that a deliberately-missed square appears again within a bounded
   number of subsequent draws is NOT required (too flaky) — instead assert the stats blob
   contents directly.
8. **Gate:** vitest + Playwright fully green; build green; no file over 300 lines
   (`wc -l` check on src/** — enforce, split if needed).

### Phase 5 — Deploy to a NEW Vercel project
1. Add `.vercel/` to `.gitignore`. Ensure `vercel.json` (if needed) marks this as a static
   Vite build (framework preset should auto-detect; output `dist/`).
2. Non-interactive deploy: `vercel deploy --yes` (creates a new project named after the
   directory), then `vercel deploy --prod --yes`. This "prod" refers only to the NEW
   project's own `*.vercel.app` URL — the real domain is untouched (guardrail 3).
3. Run the Playwright smoke subset (page loads, one color round, clip request fires)
   against the deployed URL.
4. **Gate:** deployed URL recorded in PROGRESS.md and MORNING_REPORT.md; smoke green
   against it. If `vercel` isn't authenticated or fails twice, log in BLOCKED.md and skip
   to Phase 6 — deployment can be done in the morning; everything else must not depend
   on it.

### Phase 6 — STRETCH: PWA (only if Phases 0–5 are green, excluding a BLOCKED Phase 5)
1. `vite-plugin-pwa`, `registerType: 'autoUpdate'`. Manifest: name "Disquastung", short_name
   "Disquastung", standalone display, theme/background colors sampled from the existing CSS,
   icons from `public/icons` (generate the required sizes from the 512px icon if needed).
2. Precache the app shell AND all 64 clips (add `public/audio/squares/*.m4a` to the
   workbox `globPatterns` / `includeAssets`). Total precache will be a few MB — acceptable.
3. E2E: service worker registers; manifest is served; after first load, clip requests are
   served from cache (Playwright: check `navigator.serviceWorker.ready` resolves and a
   second page load works with network route-blocking of `/audio/**`).
4. Re-deploy (`vercel deploy --prod --yes`) and re-run the deployed smoke test.
5. **Gate:** all tests green. If this phase misbehaves and burns the stuck rule, REVERT the
   phase cleanly (git) so the morning state is the green Phase 5 build, and document.

### Phase 7 — Morning report (always do this, even if earlier phases blocked)
Write MORNING_REPORT.md:
- Phase-by-phase status table (green / blocked / skipped) with commit hashes.
- The deployed URL and one-line "try it on your phone" instructions.
- Exact morning steps to activate Supabase (see §4 below — copy it in, customized).
- Anything in BLOCKED.md, with your best diagnosis.
- Pre-existing issues noticed but deliberately not fixed (e.g. auto-advance.js 324 lines,
  hardcoded Flask SECRET_KEY in legacy/, sounds.js dead code).
- Suggested next session: DNS cutover checklist (documented only — NOT performed).
Final commits pushed to `origin/vercel-migration`.

---

## 4. Morning manual steps (write these into the report; do not perform them)

1. supabase.com → New project (free tier) → name `disquastung`.
2. Dashboard → SQL editor → run `supabase/migrations/0001_square_stats.sql`.
3. Authentication → Providers → enable Anonymous sign-ins.
4. Project Settings → API → copy URL + anon key.
5. `vercel env add VITE_SUPABASE_URL production` (paste), same for
   `VITE_SUPABASE_ANON_KEY`; then `vercel deploy --prod --yes`.
6. Verify stats now write to Supabase (Table editor shows rows after a few answers).

## 5. Definition of done

- [ ] Branch `vercel-migration` pushed; `main` untouched; live site unaffected.
- [ ] `npm run build` green; vitest green; full Playwright suite green locally.
- [ ] Golden-master parity: engine matches Python on every fixture.
- [ ] Color/knight/bishop fully playable; keyboard shortcuts work; Auto + Speak toggles
      work; clips requested on correct color answers; light/dark vocabulary unchanged.
- [ ] Stats persist via localStorage; weighted selection live on color drill; Supabase
      adapter + SQL migration present and dormant.
- [ ] Deployed to a new `*.vercel.app` URL with a green smoke test (or BLOCKED with
      diagnosis).
- [ ] No new/modified file over 300 lines. Legacy files preserved under `legacy/`.
- [ ] PROGRESS.md coherent; MORNING_REPORT.md complete.
