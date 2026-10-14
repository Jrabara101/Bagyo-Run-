# Takbo! Bagyo Run — Architecture

Working title. Level Up 3.0 entry (Professional, solo). Re-theme and re-architecture of
"Neon Chasm" Endless Runner. Submission deadline: 2026-10-25. Finals: 2026-11-26/27.

---

## 1. The game in one paragraph

A Filipino kid runs from home to the barangay evacuation center as a typhoon rises from
PAGASA Signal 1 to Signal 5. Three lanes; jump, slide, switch lanes. Dodge storm hazards,
collect supplies, complete the **Go-Bag checklist**, and answer **quiz gates** by running
through the lane holding the right answer. Each match is a fixed course (~2.5 km, about
2–3 minutes) on a shared daily seed, so every player faces the same storm and the highest
score wins.

### How it maps to the judging criteria

| Criterion | Where it comes from |
|---|---|
| Theme relevance (DRRM + Education) | Signal levels, real hazards, Go-Bag, PAGASA/NDRRMC quiz gates, lessons recap on results |
| Originality / Philippine culture | Barangay, estero, palayan zones; jeepney, sari-sari, tanod, bayanihan; Filipino/English text |
| Esports potential | Same seed for everyone, finite matches, server-verified replays, local 1v1 versus (phase 2) |
| Modern tech | Deterministic procedural generation, server-side replay verification, procedural art and audio |
| Completeness | Tutorial run, How-to-Play, results screen, offline fallback |

---

## 2. Gameplay rules (logic changes from the current game)

| Area | Current | New |
|---|---|---|
| Match length | Endless, ends on first hit | Fixed course to the evacuation center. Ends at the finish or at 0 hearts |
| Failure | Instant death | **3 hearts**. A hit costs one heart and 1.5 s invulnerability. At 0: "Na-rescue ka!" (run ends, score kept, no finish bonus) |
| Difficulty | Distance tiers 0–3 | **PAGASA Signal 1→5** across the course. Drives speed, hazard density, rain and wind visuals |
| Areas | neon_city / sky_bridge / magma_vault | **Barangay street → Estero → Palayan → Evacuation center** (finish) |
| Coins | Coins | **Supplies** (canned goods, rice, water) for points |
| Special pickups | none | **Go-Bag items**: 8 fixed items, each spawned once per course. All 8 = completion bonus |
| Power-ups | magnet, shield, overdrive, 2x | **Life vest** (shield), **Tanod whistle** (magnet), **Bayanihan** (overdrive: neighbors carry you, invincible), **Radio** (hint on the next quiz gate) |
| Near-miss | Charges overdrive | Kept. Charges the Bayanihan meter |
| New | — | **Quiz gates**: 2 per area. The question shows ~5 s ahead, the lanes hold A/B/C. Right: points × signal + Bayanihan charge. Wrong: lose the bonus, and the correct answer is shown and listed in the results "lessons" |

### Hazards

| Hazard | Avoid by | Replaces |
|---|---|---|
| Debris pile / fallen branch | Jump | barrier_low |
| Sagging power line / torn tarpaulin | Slide | barrier_high |
| Open manhole / flood hole | Jump | pitfall |
| Swept-away jeepney / floating debris | Change lane | moving_train |
| (phase 2) Deep flood lane | Slows you down | new |

### Score (computed only inside the simulation, so the server can recompute it)

```
distance points
+ supplies × combo
+ correct gates × 500 × signal level
+ near-miss combo
+ Go-Bag complete bonus (all 8 items)
+ finish bonus + 1,000 per heart remaining
```

Winner of a match = highest score. Ties go to fewer hits, then the earlier submission.

---

## 3. Core principle: one deterministic simulation, used everywhere

Today the rules live inside `useRunnerEngine.ts` and call the renderer and audio directly.
The new design moves every rule into a **headless simulation** that has no DOM, no React,
no Node and no clock:

```
            inputs per tick                 SimEvents
 Keyboard ─┐   {tick, action}   ┌────────────────────┐   ┌─► Renderer (canvas)
 Touch ────┼──────────────────► │   GameSimulation   │ ──┼─► AudioEngine
 Gamepad ──┘                    │  (shared/, pure)   │   └─► HUD (React, ~15 Hz)
                                └─────────┬──────────┘
                                          │ seed + input log
                                          ▼
                     Server: replay(seed, inputs) ─► authoritative score ─► leaderboard
```

The rules for `shared/sim`:

1. No `Math.random`, `Date`, `performance.now` or DOM. All randomness comes from `Mulberry32(seed)`.
2. Fixed 60 Hz step. Time is a **tick count**, not milliseconds.
3. `step(inputs)` mutates state and **returns events** (`ITEM_COLLECTED`, `HAZARD_HIT`,
   `NEAR_MISS`, `GATE_ANSWERED`, `SIGNAL_UP`, `FINISHED`, `RESCUED`). It never calls audio or rendering.
4. Inputs are recorded as `{tick, action}`. The same seed and inputs always give the same score.

What this buys:
- **Real anti-cheat.** The server re-runs the match from the input log and stores its own
  score, not the client's. This replaces the current heuristic checks.
- **Local versus for free.** Two `GameSimulation` instances on the same seed, rendered side by side.
- **Spectator / ghost replays.** Any stored run can be replayed exactly.
- **Testable.** Determinism and scoring can be unit-tested without a browser.

---

## 4. Folder layout

```
bagyo-run/
├── shared/                      # Pure TypeScript. Runs in browser AND server.
│   ├── sim/
│   │   ├── constants.ts         # Physics and tuning (from kinematicController.ts)
│   │   ├── types.ts             # State, entities, inputs, events
│   │   ├── rng.ts               # Mulberry32 (unchanged)
│   │   ├── course.ts            # generateSegment(seed, index): areas, signal, finish line
│   │   ├── patterns.ts          # Hazard pattern table (single, pinch, hole, oncoming…)
│   │   ├── player.ts            # Lanes, jump buffer, coyote time, slide (from KinematicController)
│   │   ├── collision.ts         # Hit / near-miss / pickup checks
│   │   ├── quiz.ts              # Gate placement and seeded question selection, answer resolution
│   │   ├── scoring.ts           # The score formula above
│   │   ├── simulation.ts        # GameSimulation: owns state, step(inputs) → SimEvent[]
│   │   └── replay.ts            # replay(seed, inputLog) → RunResult
│   └── content/                 # The theme lives here as data, not in engine code
│       ├── areas.ts             # Barangay, Estero, Palayan, Evacuation center: length, palette id, hazard weights
│       ├── signals.ts           # Signal 1–5: speed, density, rain, wind
│       ├── hazards.ts           # id, avoid action, EN/FIL labels, results text
│       ├── items.ts             # Supplies, 8 Go-Bag items, power-ups
│       ├── questions.ts         # Quiz bank with source (PAGASA / NDRRMC / DepEd) per question
│       └── i18n.ts              # English / Filipino strings
├── client/
│   ├── main.tsx, App.tsx        # Screen router only
│   ├── game/
│   │   ├── GameController.ts    # rAF loop, fixed-step accumulator, feeds events to render/audio
│   │   ├── useGame.ts           # Thin React bridge: throttled HUD snapshot
│   │   └── input/               # keyboard.ts, touch.ts (swipe), bindings for 2 players
│   ├── render/
│   │   ├── Renderer.ts          # Camera, projection, layer order (from canvasRenderer.ts)
│   │   ├── layers/              # sky, rain, scenery, track, entities, player, fx
│   │   └── art/                 # palette.ts + one procedural draw function per hazard/item/character
│   ├── audio/
│   │   └── AudioEngine.ts       # Web Audio synth: rain/wind bed, siren, SFX, kulintang-style loop
│   └── ui/
│       ├── screens/             # Title, ModeSelect, HowToPlay, Tutorial, Results(+lessons), Leaderboard, Settings, Credits
│       └── hud/                 # HUD, SignalMeter, GoBagChecklist, QuizGateBanner, Hearts
├── server/
│   ├── index.ts                 # Fastify setup and static hosting of the built client
│   ├── db.ts                    # SQLite schema (no fake seeded runs)
│   ├── routes/                  # runs.ts, daily.ts, leaderboard.ts
│   ├── verify.ts                # Uses shared/sim/replay.ts
│   └── relay.ts                 # (phase 2) live race / spectator WebSocket
└── tests/
    ├── determinism.test.ts      # same seed + inputs → identical result
    ├── replay.test.ts           # client result === server replay
    └── course.test.ts           # every course is passable, gates never overlap hazards
```

### What happens to the existing files

| Existing file | Fate |
|---|---|
| `src/engine/prng.ts` | Kept as `shared/sim/rng.ts` |
| `src/engine/kinematicController.ts` | Split into `player.ts`, `collision.ts`, `constants.ts` |
| `src/engine/chunkGenerator.ts` | Rewritten as `course.ts` + `patterns.ts`, driven by `content/` |
| `src/hooks/useRunnerEngine.ts` | Rules → `simulation.ts`; loop → `GameController.ts`; React → `useGame.ts` |
| `src/engine/canvasRenderer.ts` | Projection and camera kept; all art rewritten in `render/art` and `layers/` |
| `src/engine/audio.ts` | Synth approach kept; sounds redesigned |
| `server/antiCheat.ts` | Replaced by `verify.ts` (replay-based) |
| `server/seedDirector.ts` | Kept, moved to `routes/daily.ts`, titles re-themed ("Bagyong …") |
| `server/db.ts` | Kept, **fake pre-seeded runs and ghosts removed**, schema adds `input_log`, `hearts_left`, `gates_correct`, `finished` |
| `server/websocket.ts` | Parked until phase 2 (`relay.ts`) |
| `src/components/*` | Rebuilt as `ui/screens` and `ui/hud` |
| `prototype.html`, `dist/`, `data/runner.sqlite` | Not carried over |

---

## 5. Key data shapes

```ts
type Action = 'LEFT' | 'RIGHT' | 'JUMP' | 'SLIDE' | 'BAYANIHAN';
interface InputEvent { tick: number; action: Action }

type SimEvent =
  | { type: 'ITEM_COLLECTED'; itemId: string; goBag: boolean }
  | { type: 'HAZARD_HIT'; hazardId: string; heartsLeft: number }
  | { type: 'NEAR_MISS'; combo: number }
  | { type: 'GATE_SHOWN'; questionId: string }
  | { type: 'GATE_ANSWERED'; questionId: string; correct: boolean }
  | { type: 'SIGNAL_UP'; level: 1 | 2 | 3 | 4 | 5 }
  | { type: 'AREA_ENTERED'; areaId: string }
  | { type: 'FINISHED' } | { type: 'RESCUED' };

interface Question {
  id: string;
  prompt: { en: string; fil: string };
  choices: [Choice, Choice, Choice];   // shuffled by seed into lanes
  answer: 0 | 1 | 2;
  lesson: { en: string; fil: string }; // shown on results
  source: string;                      // e.g. "PAGASA Tropical Cyclone Wind Signals"
  minSignal: 1 | 2 | 3 | 4 | 5;
}

interface RunResult {
  seed: string; score: number; distance: number; finished: boolean;
  heartsLeft: number; gatesCorrect: number; goBagCount: number;
  ticks: number; wrongQuestionIds: string[];
}
```

Submitting a run sends `{ seed, playerName, inputLog }`. The server computes the `RunResult` itself.

---

## 6. Server API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/daily` | Today's seed and storm name |
| POST | `/api/runs` | `{seed, playerName, inputLog}` → replay → store → `{result, rank}` |
| GET | `/api/leaderboard?seed=` | Top runs for a seed (daily or tournament) |
| GET | `/api/runs/:id/replay` | Input log for ghost or spectator playback |
| POST | `/api/tournament` | (phase 2) Create an event code = a fixed seed for the finals |
| WS | `/ws/live` | (phase 2) Live standings for a big-screen spectator view |

**Offline-first.** The game must be fully playable with no server (screening judges, venue
Wi-Fi). Without a server, the leaderboard falls back to local storage and shows "offline".

---

## 7. Phases against the calendar

Videos are judged at screening, so everything visible in them must exist by **2026-10-21**.
Finals are a month after submission, which leaves time for phase 2.

| Phase | Dates | Work | Done when |
|---|---|---|---|
| 0 Setup | Oct 14 | New folder, fresh git repo, move to `shared/` `client/` `server/`, add Vitest | Still builds and plays as before |
| 1 Sim extraction | Oct 14–15 | `GameSimulation` + events, input log by tick, `GameController` | Plays the same; determinism test passes |
| 2 New rules | Oct 15–16 | Course with areas, signals, finish, hearts, Go-Bag, scoring | Full 2.5 km match to the finish |
| 3 Quiz gates | Oct 16–17 | `quiz.ts`, question bank (30–40), gate HUD, results lessons | Gates answerable by lane, lessons shown |
| 4 Art | Oct 17–19 | All procedural art, rain/wind, 4 areas, kid character | Screenshot-ready |
| 5 Audio + UI | Oct 19–20 | Ambience, siren, music loop, Title/HowTo/Tutorial/Results/Credits | New player can learn without help |
| 6 Server | Oct 20 | Replay verification, new schema, daily seed | Server score === client score |
| 7 Polish + record | Oct 21–23 | Bug fixing, trailer and gameplay video | Videos exported |
| 8 Paperwork | Oct 24 | Forms 01–03, synopsis | Submitted by Oct 25 |
| Phase 2 (finals) | Oct 26 – Nov 25 | Local 1v1 split-screen, tournament codes, spectator view, deep flood lanes | Live demo ready |

If time runs short, cut in this order: Radio power-up → phase-2 items → Filipino translation
of results text. Never cut: quiz gates, tutorial, Go-Bag, sound.

---

## 8. Competition compliance notes

- Keep the git history: organizers may ask for development logs or version-control records.
- All art and sound are generated in code, so there are no third-party asset files to license.
- Fonts come from Google Fonts (open licence). List them in Form 03 with React, Fastify,
  Tailwind, better-sqlite3 and lucide-react.
- Declare AI assistance (design, code, debugging) in Form 03.
- Every quiz question cites its source in `questions.ts`.
