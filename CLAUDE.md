# Takbo! Bagyo Run

Entry for **DOST Level Up 3.0 Esports Game Dev Challenge** (NSTW 2026), Professional
category, solo developer. Forked from my own "Neon Chasm" endless runner (`Game\Endless Runner`
in 100-days-of-Code); never entered in any other competition.

**Read `ARCHITECTURE.md` first.** It holds the design, the folder layout, the data shapes and
the day-by-day phase plan.

## Deadlines

| Date | What |
|---|---|
| 2026-10-21 | Everything visible in the videos must work |
| 2026-10-25 | Submission: Forms 01–03, 500-word synopsis, 1–2 min trailer .mp4, 3–5 min gameplay .mp4 |
| 2026-11-09 | Finalists announced |
| 2026-11-26/27 | Finals, General Santos City |

Rules PDF: Google Drive file `1eRej7Y229y23TAtHdZGH8x-geAVOZBiV`.

## Decisions already made

- Fixed course (~2.5 km, 2–3 min) to the evacuation center, 3 hearts. Not endless.
- Every player-facing string and quiz question in **English and Filipino** (toggle).
- Themes: Disaster Risk Reduction and Management + Education, with Philippine culture throughout.
- All game rules live in `shared/sim` as a deterministic simulation. The server replays the input
  log to compute the authoritative score.

## Rules for working in this repo

- `shared/` must stay pure: no `Math.random`, `Date`, `performance.now`, DOM or Node APIs.
  Randomness only from the seeded `Mulberry32` in `shared/sim/rng.ts`.
- Theme content (areas, hazards, items, questions, text) goes in `shared/content/`, not in engine code.
- No third-party image or audio files. Art and sound are generated in code (competition
  originality and asset-rights rules).
- Every quiz question cites its source (PAGASA, NDRRMC, DepEd…).
- Keep git history meaningful: organizers may ask for version-control records. Commit per phase.
- AI assistance must be listed in Form 03; keep a note of what it was used for.

## Commands

```
npm run dev        # server (tsx, port 3002) + client (Vite, port 5174)
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## Status

- Phase 0 (setup and restructure) — done 2026-10-14.
- Phase 1 (sim extraction) — done 2026-10-14. Rules in `shared/sim/simulation.ts`, loop in
  `client/game/GameController.ts`, React bridge `client/game/useGame.ts`. Runs submit `inputLog`
  + `ticks`; `shared/sim/replay.ts` reproduces them. Server still verifies with `antiCheat.ts`
  (legacy telemetry) until Phase 6. `/ws` relay is disconnected on the client until Phase 2.
- Phase 2 (new rules) — done 2026-10-14. Fixed 2.5 km course (`shared/content/areas.ts`),
  Signal 1→5 pace and density (`signals.ts`), 3 hearts, 8 Go-Bag items, score formula
  (`shared/sim/scoring.ts`). Jump retuned in `shared/sim/constants.ts` (the original jump could
  never clear a low barrier or a hole). Server replay verification (`server/verify.ts`) was
  pulled forward from Phase 6 and `antiCheat.ts` deleted; the schema change and removing the
  fake runs are still Phase 6.
- Art direction chosen 2026-10-17: the "TAKBO!" samples (jeepney sign-paint, banig trim, Bungee font):
  https://claude.ai/artifact/CMXHz71xEg78xw8YfCdciD
- Phase 3 (quiz gates) — done 2026-10-17. 37 bilingual questions with sources in
  `shared/content/questions.ts` (all `reviewed: false` until checked against the source).
  `shared/sim/quiz.ts` places 2 seeded gates per area at `Area.gatesAtM`, keeps 60 m before /
  30 m after each gate free of hazards, and answers by the lane the player is in when crossing.
  Quiz banner, EN/FIL toggle (header), lessons on the results screen. AI use is logged in `AI_USAGE.md`.
- Phase 4 (art) — done 2026-10-17. New renderer in `client/render/` (`Renderer.ts`, `view.ts`
  perspective, `art/` per subject) replaces `client/engine/canvasRenderer.ts`. Four areas painted per
  4 m road band, sky/ground blended near area edges, rain/wind/lightning from `Signal.rain/wind`,
  one drawing per hazard id, Go-Bag item icons, bamboo quiz gate, finish at the school, kid in a
  yellow raincoat. Title screen shows the TAKBO! lockup over a dusk barangay.
- Phase 5 (audio + UI) — done 2026-10-18. `client/audio/AudioEngine.ts` (Web Audio only):
  kulintang-style loop whose tempo follows the signal, rain/wind bed, siren on SIGNAL_UP, effects
  per event, footsteps/splashes. All UI text in `shared/content/i18n.ts` (`UI`), with a test that
  every string has both languages. Screens: Title menu, How to Play (hazard/item thumbnails drawn
  by the game's art functions), Practice run (seed `PRACTICE`, coach tips, never submitted),
  Credits (`shared/content/credits.ts`: put the developer name there), Settings/Pause, Results.
  HUD and all dialogs restyled (`.hp`, `.sheet`, `.btn-jeep` in `client/index.css`). Settings,
  language and mute persist in localStorage.
- Phase 6 (server) — done 2026-10-18. `server/app.ts` (routes, testable with `inject`),
  `db.ts` (schema v2; v1 tables renamed `legacy_v1_*`, not dropped; no fake runs), `store.ts`,
  `verify.ts` (returns a `VerifyCode`, translated on the client). API: `GET /api/daily`,
  `POST /api/runs`, `GET /api/leaderboard?seed=`, `GET /api/runs/:id/ghost` (ghost = server replay
  of the stored inputs). Daily challenge is pure (`shared/sim/daily.ts`, Manila date, storm names
  in `shared/content/storms.ts`), so the client knows today's seed offline; Play uses it by
  default. `RULES_VERSION` in `shared/sim/constants.ts`: **bump it whenever a rules/content change
  alters replays**; the board only lists the current version. Offline: runs are kept on the
  device (`client/game/localRuns.ts`) and the leaderboard falls back to them. Runner name is a
  setting. `server/websocket.ts` is parked (not registered) until the finals phase.
- Weather + graphics — 2026-10-24, branch `weather-and-graphics`. Rules in `shared/sim/weather.ts`
  (content in `shared/content/weather.ts`): wind gusts with a direction per area (crouch/slide as it
  hits to hold the lane, +300; otherwise shoved a lane), flooded stretches (two deep lanes slow the
  run 30% and block jumping; the high-ground lane is hazard-free with supplies), and the
  `lightning_strike` hazard (change lanes). `RULES_VERSION` is 2. Renderer effects in
  `client/render/art/weather.ts`; they scale down on slow machines (`Renderer.quality`). Dev builds
  expose `window.__takbo` (the GameController) for checking the art from the console.
- Harder course — 2026-10-24, same branch. Hazard groups at random gaps (min 12 m,
  `MIN_HAZARD_GAP_M` in `shared/sim/course.ts`), 3→7 groups per chunk by signal, a `stormPinch`
  pattern (lane blocker + jump/slide hazard), power lines and lightning in every area, up to 8 gusts
  (they may blow across a flood). `RULES_VERSION` is 3. 15 harder questions added (52 in all) on
  thunderstorms, lightning, wind, floods and RA 10821; all `reviewed: false`.
- Next: Phase 7 — bug fixing from playtests, recording the trailer and gameplay videos.
