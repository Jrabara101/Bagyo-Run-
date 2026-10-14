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
- Next: Phase 1 — extract `GameSimulation` from `client/hooks/useRunnerEngine.ts`, record inputs
  by tick, add a determinism test. Gameplay must stay identical.
- The fake pre-seeded leaderboard runs in `server/db.ts` are still there; they are removed in Phase 6.
