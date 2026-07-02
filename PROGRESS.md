# PROGRESS.md — vercel-migration

Overnight unattended run per MIGRATION_SPEC.md. Update this file at every phase gate and
meaningful sub-step. Terse entries only.

## Status
- Current phase: 7 (morning report) — DONE, all phases green
- See MORNING_REPORT.md for the owner-facing summary.
- Branch: `vercel-migration` (created from `main`)
- Deployed URL: https://disquastung.vercel.app (Vercel project
  `futuressobrights-projects/disquastung`, scope `futuressobrights-projects`
  -- the only scope available on this account/CLI session). disquastung.com
  and the PythonAnywhere site were not touched (guardrail 3).

## Recon notes (Phase 0.2)

### JSON endpoint shapes (app/routes.py)
- `GET /api/color/new` -> `{square}`. Sets session correct_color/square/color_attempts=0.
  Color rule: `file_index + rank_index` (0-based) even -> `dark`, else `light`.
- `POST /api/color/check` body `{answer}` (string "light"/"dark", trimmed) ->
  - correct: `{correct: true, square, correct_color}`
  - wrong: `{correct: false, attempts: n, message}` (n = running wrong-attempt counter)
- `GET /api/knight/new` -> `{square_a, square_b}`. path = BFS shortest path (list of squares
  incl. start+end); `correct_moves = len(path)-1`.
- `POST /api/knight/check` body `{answer}` (int, else 400 `{error:'invalid'}`) ->
  - correct: `{correct: true, piece:'Knight', path, square_a, square_b}`
  - wrong: `{correct: false, attempts: n, message}`
- `GET /api/bishop/new` -> `{square_a, square_b}`. Uses `_fresh_two_bishop` (rejects
  orthogonally-adjacent pairs so bishop answer is never a trivial same-square-adjacent N/A).
  `file_diff==rank_diff>0` -> 1 move, path=[a,b]. `(file_diff+rank_diff)%2==0` (same color,
  not on a diagonal) -> 2 moves, path=[a,mid,b] (mid = first (c,r) scan-order match).
  Else (opposite color) -> `-1`, path=null.
- `POST /api/bishop/check` body `{answer}` (int, else 400) ->
  - correct: `{correct: true, piece:'Bishop', path, square_a, square_b}`
  - wrong: `{correct: false, attempts: n, message}`
- Attempt-count hint messages (verbatim, n = 1-indexed wrong-attempt count, defined twice
  in routes.py as inline blocks in HTML routes AND as `_knight_hint`/`_bishop_hint`/
  `_color_hint` helpers used by the JSON API — identical text, JSON API is canonical for the
  SPA we're porting):
  - n=1: "Incorrect. Try again."
  - n=2 knight: "Still incorrect. Think about the knight's L-shaped moves."
  - n=2 bishop: "Still incorrect. Think about diagonal movement patterns."
  - n=2 color: "Still incorrect. Think about the checkerboard pattern."
  - n=3 knight: "Not quite right. Remember, knights move in an L: 2 squares in one direction, 1 in perpendicular."
  - n=3 bishop: "Not quite right. Bishops only move diagonally and can't change square colors."
  - n=3 color: "Not quite right. Remember: a1 is a dark square, pattern alternates from there."
  - n>=4 knight: "Incorrect attempt #{n}. Keep trying - you've got this."
  - n>=4 bishop: "Incorrect attempt #{n}. Consider the diagonal paths."
  - n>=4 color: "Incorrect attempt #{n}. Visualize the board pattern."
- Session also tracks `recent_squares` (last 20 picks) to avoid immediate repeats
  (`_fresh_square`/`_fresh_two`/`_fresh_two_bishop` in routes.py). This is server session
  state; client engine will need equivalent module-level "recent" memory in backend.js.
- `app/utils.py` has a second, unused-by-routes copy of square_color/knight_moves/
  bishop_moves (col letters A-H uppercase keyed dict) — same math, dead code, NOT wired into
  any route. Ignore for porting (routes.py's inline functions are canonical, confirmed by
  grep: utils functions are never imported/called anywhere).

### Page -> JS script loads (grep of app/templates/*.html)
- `index.html`: tooltip.js only.
- `color_game.html`: chessboard.js, game.js, speech.js. body class `game-page game-color`,
  `data-correct="{{correct_color}}"` (unused by SPA path — game.js fetches fresh via API).
- `knight_game.html`: chessboard.js, game.js. body class `game-page game-knight`.
- `bishop_game.html`: chessboard.js, game.js. body class `game-page game-bishop`.
- `result.html`: chessboard.js, keyboard-input.js, auto-advance.js. This is the legacy
  no-JS-fallback POST-redirect result page. It is NOT part of the SPA flow — game.js never
  navigates to it; it inlines an equivalent result view itself (verdict div + boardWrap +
  `.result-next` button, plus its own Enter/Space keydown handling and its own "Auto" toggle
  duplicate logic). **Decision (conservative, per spec silence):** port keyboard-input.js and
  auto-advance.js into `src/ui/` verbatim (guardrail: never delete/lose code) but do NOT wire
  a `<script>` tag for them into any of the 4 new HTML pages, since no legacy template that
  loads them has an equivalent page in the new architecture — this exactly preserves today's
  reachability (they are unreachable in the current SPA flow too, since result.html is never
  rendered client-side). Documented here per spec instruction to log silent-spec judgment
  calls. `base.html` is an unused/unextended template — not ported.
- `app/static/js/sounds.js` — confirmed dead code per spec context; NOT ported (spec says
  "ignore it"; real audio engine is inline in game.js).

### DOM contract details
- `.square-display` divs inside `.squares-container` hold the square text (1 for color, 2
  for knight/bishop). `.question-section` holds the answer buttons `.option-button`
  (`value="light"/"dark"` for color; `value="1".."6"` knight; `value="-1"/"1"/"2"` bishop).
  `.navigation-section` holds the back-to-menu link; game.js appends the Auto toggle here,
  speech.js appends the Speak toggle here (color page only, inserted before Auto toggle).
- `#chessboard-container` — MiniChessboard reads `data-piece`, `data-start`, `data-end`,
  `data-path` (comma-joined) from this element's dataset.
- speech.js AUDIO_BASE currently derived from `document.currentScript.src` — spec-mandated
  fix in Phase 1: hardcode to `"/audio/squares/"`.

## Golden master
- Script: `scripts/generate_golden.py`. Uses a venv (`.golden-venv/`, gitignored) with
  Flask installed, imports `legacy/app` route helper functions directly (no HTTP), fixed
  seed `random.seed(20260702)`.
- Fixtures written to `tests/golden/{colors,knight,bishop,messages}.json`.

## Decisions log
- (see DOM contract section above re: keyboard-input.js / auto-advance.js wiring)
- generate_golden.py: put `legacy/` on sys.path (not just repo root) since
  `legacy/app/__init__.py` does `from app import routes` (absolute, assumes
  "app" is top-level importable) — works pre- and post- git-mv unchanged.
- chessboard.js: added one line `window.MiniChessboard = MiniChessboard;` —
  required because Vite bundles each `<script type="module">` with its own
  scope, whereas the old classic `<script>` tags shared one global lexical
  scope (so game.js's separate-file `new MiniChessboard(...)` call, wrapped
  in a try/catch that silently swallows ReferenceError, would otherwise
  silently stop rendering every result board). Not a logic change.
- New pages use `<script type="module" src="/src/ui/...">` for all ported
  JS (required for Vite to bundle them into dist/ at build time — a plain
  non-module `<script src="/src/ui/...">` is not processed by Vite's HTML
  asset graph and would 404 in the production build).
- `.square-display` divs render empty in the new HTML (no server session to
  source an initial square from). game.js does not currently auto-fetch on
  page load — that boot-fetch will be added surgically in Phase 3 alongside
  the fetch -> backend.js rewiring (documented there).
- Home links changed from Jinja `url_for` to `/`, `/color.html`, `/knight.html`,
  `/bishop.html` (Vite multi-page build output paths).
- npm audit reports 5 vulnerabilities (3 moderate/1 high/1 critical) in
  devDependency transitive deps (vite/vitest/playwright toolchain, not
  shipped to production). Not addressed — out of scope, dev-only tooling,
  `--force` fix risks breaking pinned versions overnight with no one able to
  verify. Flagged for morning review.

- vitest picks up any `*.test.js` under the repo by default, which collided
  with Playwright's `tests/e2e/smoke.spec.js` (Playwright's `test()` isn't
  the same symbol as vitest's). Added `vitest.config.js` scoping vitest to
  `tests/unit/**/*.test.js` only.
- src/engine/knight.js and bishop.js return full paths (`knightPath`,
  `bishopPath`) in addition to the `*Moves` count functions the spec's tree
  names explicitly -- Phase 3's backend.js needs the path array for its
  `path` field in the correct-answer JSON shape, and re-deriving it from a
  bare integer isn't possible, so the count functions are now thin wrappers
  over the path functions (`knightMoves = knightPath(...).length - 1`; single
  source of truth, no duplicated branching logic).
- chessboard.js's added `window.MiniChessboard = ...` line (from Phase 1)
  pushed it to 301 lines, over the 300 max for modified files (only
  auto-advance.js has a spec-granted exception). Trimmed the comment by one
  line to land at 299.

- Phase 3: `src/backend.js` mirrors routes.py's JSON shapes exactly (verified
  against Phase 0 recon notes), with module-level state standing in for
  Flask's session (fresh per page load, same as a fresh GET). Ported
  `_fresh_square`/`_fresh_two`/`_fresh_two_bishop`/`_is_orthogonal_adjacent`
  faithfully including the exact pathological-fallback shape (bishop's
  200-attempt loop keeps the LAST `b` tried, not a brand-new pick).
- game.js changes (surgical, both fetch() call sites only): added
  `import * as backend from "../backend.js"` at the top; `loadNext()` now
  calls `backend.newQuestion(GAME)` instead of `fetch(...)`; `answer()` now
  calls `backend.checkAnswer(GAME, value)` instead of `fetch(...)`. Added
  ONE new line at the very end of the IIFE: `loadNext();` to boot the first
  question, since there's no more server-rendered initial square (this is
  the "adapt minimally" boot-sequence fix anticipated in Phase 1 of the
  spec). The network-failure `.catch()` fallback (native form.submit()) is
  now unreachable dead code (backend.js never rejects) — left as-is per
  "preserve everything else byte-for-byte," noted for MORNING_REPORT.
- Playwright E2E (17 tests, all green): color wrong x3 hint text verified
  verbatim against tests/golden/messages.json, correct-answer verdict +
  board render, next-question flow; all 4 keyboard keys (w/l/b/d) plus
  Enter/Space advance; knight and bishop full correct rounds (ground truth
  computed by importing src/engine/*.js directly into the Node-side test,
  not hardcoded); bishop "not possible" (-1) case found by reloading until
  hit (bounded 60 attempts) since square pairs are randomized; Auto toggle
  flips on all 3 pages; Speak toggle present on color only, persists via
  localStorage across reload; Speak-ON correct answer triggers a network
  request for the answered square's `.m4a` clip (captured via
  `page.on('request')`, matched against the boot-time preload sweep --
  speech.js preloads all 64 clips on mount when enabled, so this test
  confirms the pipeline is wired rather than asserting a *new* fetch fires
  exactly at answer-time). Zero console errors across every test.

- Phase 4: `src/api/storage.js` is the sole persistence entry point; chooses
  `SupabaseAdapter` iff both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  are set at build/dev time (Vite static-replaces `import.meta.env.*`), else
  `LocalAdapter`. Every method catches and logs, never throws to the caller
  (gameplay must never break on a storage failure).
- `recordAnswer({square, drill, correct, attempts})` is drill-generic per
  spec's declared interface. Decision (spec silent on knight/bishop): since
  those questions involve TWO squares and weighted selection only reads
  stats for the color drill, backend.js credits BOTH squares equally on a
  knight/bishop check (`recordPairAnswer`) rather than picking one
  arbitrarily. Low-risk either way since it doesn't affect the color drill's
  weighting; documented here per spec's "record silent-spec judgment calls"
  instruction.
- `src/engine/select.js`'s `weightedRandomSquare` matches the spec's exact
  formula (`1 + centerBoost(0.5) + missBoost(min(1.5, 0.5*misses))`).
  backend.js's `pickColorSquare` reuses the same "avoid last 20 recent
  squares" retry loop as the uniform picker, just drawing from
  `weightedRandomSquare(stats)` instead of `randomSquare()` -- recent-avoidance
  and weighting are orthogonal and spec doesn't say to drop the former.
- `supabase/migrations/0001_square_stats.sql` only grants select/insert/update
  RLS policies, exactly as spec section 4.6 specifies. `SupabaseAdapter.resetStats()`
  issues a `delete`, which will fail RLS once a real Supabase project exists
  (no delete policy was requested) -- dormant tonight either way; noted for
  MORNING_REPORT since it's a real gap for whoever wires Supabase up later.
- Unit tests: `select.test.js` (all 64 squares drawn over 20k samples; center
  vs. corner ratio in [1.25, 1.75]; a manually-elevated miss count raises a
  square's frequency; no starvation). `local-adapter.test.js` shims the tiny
  slice of `localStorage` the adapter needs (a `Map`-backed global) instead
  of adding a jsdom/happy-dom dependency -- avoids a new devDependency for a
  three-method interface. `supabase-adapter.test.js` confirms clean import
  and full no-op behavior with no env vars set (the "dormant" contract).
- E2E `stats.spec.js`: plays a wrong-then-right round plus a second correct
  round, asserts the `disquastung-stats` localStorage blob directly (miss
  count, total seen count) rather than relying on redraw frequency (spec
  explicitly calls the frequency-based assertion too flaky), then reloads
  and asserts the blob is unchanged.

- Phase 5: `vercel deploy --yes` required `--scope futuressobrights-projects`
  (the CLI refuses to guess a default team in non-interactive mode; this
  account only has that one team). Vercel auto-detected Vite, linked a NEW
  project named `disquastung` under that scope, and connected it to the
  `allyourbeta/disquastung` GitHub repo. The very first `deploy --yes` (no
  `--prod` flag) already landed as `target: "production"` and got aliased
  to `disquastung.vercel.app` -- ran the explicit `vercel deploy --prod
  --yes` too anyway (spec's literal 2-step), which is idempotent and
  re-confirmed the same alias. Added `tests/e2e/prod-smoke.spec.js` (page
  loads x4 + one full color round + audio clip request, relative paths
  only so it runs against either target) and `playwright.prod.config.js`
  (baseURL override, no local webServer) -- ran green against the deployed
  URL. Full local suite (23 Playwright + 79 vitest) still green afterward.

- Phase 6 (stretch): `vite-plugin-pwa`, `registerType: 'autoUpdate'`.
  Generated `public/icons/icon-192.png` from the existing 512px
  `apple-touch-icon-512.png` via macOS `sips` (no new dependency -- a
  system tool, not a package); `icon-512.png` is a plain copy of the same
  source for manifest naming clarity. theme_color `#d4af37` / background_color
  `#1a1a1a` sampled from `premium-chess-styles.css`'s `--accent-gold` /
  `--primary-dark` CSS variables. `workbox.globPatterns` includes `m4a` so
  all 64 clips precache up front at SW install (not just the app shell),
  per spec 6.2 -- confirmed via `/workflows` prod build: 86 precache
  entries, ~746 KiB. `injectRegister: 'auto'` (the plugin default) added
  the manifest link + registerSW.js script tag to all 4 HTML pages
  automatically; no manual HTML edits needed.
- PWA E2E (`tests/e2e/pwa.spec.js`, 3 tests): manifest served with expected
  fields; `navigator.serviceWorker.ready` resolves with an active worker,
  zero console errors; offline-cache test blocks all `/audio/squares/**`
  network requests via `context.route(...).abort()` then reloads and does
  a raw `fetch()` from the page for a clip -- it resolves `ok` purely from
  the SW's precache, never touching the network. Gotcha: workbox's
  precache keys carry a `?__WB_REVISION__=...` query it adds itself, so an
  exact-URL `cache.match()` from test code fails to find entries even once
  precached -- match by `new URL(r.url).pathname` instead when polling
  Cache Storage directly (the SW's own `fetch` handler does this
  URL-stripping internally, which is why the real `fetch()` in the last
  assertion works even though a raw `cache.match()` wouldn't).
- Re-deployed (`vercel deploy --prod --yes --scope futuressobrights-projects`)
  with PWA support; re-ran `playwright.prod.config.js` smoke subset against
  https://disquastung.vercel.app -- green. Verified `/manifest.webmanifest`,
  `/sw.js`, `/icons/icon-512.png` all return 200 via curl.
- Full local suite after Phase 6: 26/26 Playwright + 79/79 vitest green,
  `npm run build` green, no file over 300 lines (same auto-advance.js
  exception).

## Phase checklist
- [x] Phase 0 — golden master
- [x] Phase 1 — scaffold
- [x] Phase 2 — engine (69/69 golden-master assertions green)
- [x] Phase 3 — UI wiring (17/17 Playwright + 69/69 vitest green)
- [x] Phase 4 — stats (18/18 Playwright + 79/79 vitest green, all files <=300
      lines except the spec-approved auto-advance.js exception)
- [x] Phase 5 — deployed to https://disquastung.vercel.app, smoke green
- [x] Phase 6 (stretch) — PWA installed + precached, redeployed, smoke green
- [x] Phase 7 — MORNING_REPORT.md written, final push done
- [ ] Phase 3 — UI wiring
- [ ] Phase 4 — stats
- [ ] Phase 5 — deploy
- [ ] Phase 6 — PWA (stretch)
- [ ] Phase 7 — morning report
