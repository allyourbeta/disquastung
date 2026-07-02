# PROGRESS.md — vercel-migration

Overnight unattended run per MIGRATION_SPEC.md. Update this file at every phase gate and
meaningful sub-step. Terse entries only.

## Status
- Current phase: 2 (engine + golden-master tests) — GREEN
- Branch: `vercel-migration` (created from `main`)

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

## Phase checklist
- [x] Phase 0 — golden master
- [x] Phase 1 — scaffold
- [x] Phase 2 — engine (69/69 golden-master assertions green)
- [ ] Phase 3 — UI wiring
- [ ] Phase 4 — stats
- [ ] Phase 5 — deploy
- [ ] Phase 6 — PWA (stretch)
- [ ] Phase 7 — morning report
