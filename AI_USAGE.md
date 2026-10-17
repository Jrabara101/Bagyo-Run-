# AI assistance log (for Form 03)

AI assistant: Claude (Anthropic), via Claude Code. All output reviewed and committed by the developer.

| Phase | Commit | What AI was used for |
|---|---|---|
| 1 Sim extraction | `8828025` | Refactoring the game rules into a deterministic `GameSimulation`, replay, tests; fixing a dev-server ws proxy error and a first-run freeze |
| 2 New rules | `c703c44` | Course, signals, hearts, Go-Bag, scoring and server replay verification code; tests; retuning the jump |
| 2 Art samples | — | Five procedural background mock-ups (art direction reference only, not in the game) |
| 3 Quiz gates | `8e2d460` | Gate placement and answering code, quiz HUD, results lessons, tests; **first drafts of the 37 quiz questions, lessons and Filipino translations** |
| 4 Art | `c9aabde` | Porting the chosen procedural art samples into the game renderer (scenery, hazards, items, kid, weather), title screen lockup and its Filipino text |
| 5 Audio + UI | `dced14e` | Procedural audio engine and music loop, bilingual UI string table and Filipino translations, How to Play / Practice / Credits / Results screens, HUD restyle |
| 6 Server | Phase 6 commit | Server restructure, schema migration, replay-based ghosts, daily challenge and storm names, offline leaderboard, server tests |

## Quiz content review

The questions in `shared/content/questions.ts` were drafted with AI from public guidance by
PAGASA, NDRRMC/OCD, DOH, DepEd, DSWD, DENR-MGB, DA, NEA, BFP and the laws cited. Each has
`reviewed: false` until the developer checks the fact against the cited source and the Filipino
wording, then sets it to `true`.
