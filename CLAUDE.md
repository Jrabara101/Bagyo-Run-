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
- Renderer and UI still use the old neon art with placeholder palettes per area (Phase 4/5).
  Art direction samples: https://claude.ai/artifact/CMXHz71xEg78xw8YfCdciD
- Phase 3 (quiz gates) — done 2026-10-17. 37 bilingual questions with sources in
  `shared/content/questions.ts` (all `reviewed: false` until checked against the source).
  `shared/sim/quiz.ts` places 2 seeded gates per area at `Area.gatesAtM`, keeps 60 m before /
  30 m after each gate free of hazards, and answers by the lane the player is in when crossing.
  Quiz banner, EN/FIL toggle (header), lessons on the results screen. AI use is logged in `AI_USAGE.md`.
- Next: Phase 4 — art.
- The fake pre-seeded leaderboard runs in `server/db.ts` are still there; they are removed in Phase 6.
