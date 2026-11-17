# Chaos Core Arena v0.2

A seeded, autonomous six-fighter physics arena built with TypeScript, Canvas 2D, and Vite.

## Play

```sh
npm install
npm run dev
```

Choose both challengers above the arena, or use **Random matchup**. Changing a challenger replays the current seed with that fighter. New battle changes the seed; Replay seed reproduces the selected pairing. Pause and 1×/2×/4× playback controls are available.

| Fighter | Combat identity | Ultimate |
|---|---|---|
| Inferno | Fireballs and lingering burn | Supernova |
| Singularity | Random nearby gravity wells; orbiting projectiles | Event Horizon |
| Volt | Speed-generated static, dash, lightning discharge | Thunderstorm |
| Glacier | Ice armor, shard fans, chill and shatter | Absolute Zero |
| Venom | Poison stacks that bypass direct-hit shields | Plague Bloom |
| Aegis | Renewable shield, absorbed energy, counterattack | Divine Reckoning |

All fighters start with 250 HP. Each successful attack/cast evolves once, up to level 8. Additional shard hits or ongoing ticks from the same cast do not grant extra evolution. Ultimate charge triggers automatically at 100%. Damage numbers match the attacker. Level changes appear in stats; only fight/ultimate/result announcements appear over the arena.

## Simulation and balance

```sh
npm run balance -- --all --count=100 --out=reports/roster-latest.json
npm run balance -- --left=glacier --right=volt --count=100 --start=3001
npm test
npm run build
```

Each 100-game pairing runs 50 seeds in both starting orientations. `--count` must be even. The all-roster run covers 15 pairings / 1,500 games. Reports contain actual damage by source, absorbed shield damage, levels, ultimates, duration, wins/losses, timeout results, and every battle record. `--power` accepts a JSON object of temporary offensive multipliers for experiments without editing the live roster.

The final tuning and fresh-seed validation comprise 3,000 battles: overall win rates 45.3–55.5%, mean duration 58.9 seconds at 1× speed, and impacts 8.8% of damage. Strong counter matchups remain intentional. See [the roster report](reports/roster-balance.md) for the full matrix, methods, limitations, and tuning notes. Earlier two-fighter reports are historical.

## Code

- `src/engine.ts`: roster definitions, seeded spawning, physics, ability/status interactions, evolution, and combat telemetry. Used directly by both browser and batch simulations.
- `src/main.ts`: matchup controls, live stats, event-driven presentation, and arena rendering.
- `src/effects.ts`: fighter auras and ultimate effects. Separate visual randomness keeps rendering from changing outcomes.
- `scripts/balance.mjs`: side-swapped tournaments using the actual engine.
- `scripts/engine.test.mjs`: replay and combat interaction tests.

The arena currently uses original custom circle physics and Canvas effects. It does not depend on Matter.js or PixiJS, and does not yet export videos. Future work could add replay export, sound, arena events, and tournament brackets.

Latest tuning: see [ability cadence results](reports/cadence-balance.md). Evolution now shortens special intervals; gravity uses whole-number damage pulses. The final 3,000-game sample averages 57 seconds with overall roster win rates of 48.0–51.9%. Earlier numbers above describe the previous roster tuning.

Latest features and balance: [spectator interactions](reports/spectator-features.md). Use Vertical layout for a 9:16 screen-capture frame and Auto finish replay for the last five seconds at half speed. No video encoding is included.

## v0.3 changes (November 2026)

- Inferno wall fire persists until opponent collision or ice-projectile extinguishing. Wall collision applies 1.4 direct burn damage plus 1.1 burn stacks. Animated flames are rendered at each patch.
- Aegis now has three rotating shield plates and a forward-facing shield during its dash. Shield Slam telegraphs, winds up, dashes, knocks back and produces a distinct impact burst.
- `npm run balance -- --count=100` tests all 15 pairings using side-swapped seeded battles (1,500 fights), writing `reports/balance.json`.
- **Balance is not yet 40–60% for every matchup.** Initial testing showed Inferno dominated several matchups; roster multipliers were adjusted and retested. Some counter matchups remain heavily skewed. See `reports/balance.json` for actual results. Durations are simulated seconds at 1× speed.

To run: `npm install && npm run dev`. To verify TypeScript and bundle: `npm run build`.


## v0.4 experimental matchup tuning

Added `MATCHUP_BALANCE` in `src/engine.ts`, a symmetric, seeded matchup-specific offensive multiplier. This is a balance-assist approach, not pure roster balance. The current 1,500-battle validation is in `reports/balance.json`: 10/15 matchups within 40–60%, mean match duration ~53 seconds. Some counters remain pronounced. Re-run `npm run balance -- --count=100`. Calibration experiment: `node scripts/calibrate.mjs --count=20` (small samples are noisy). The game has not been browser-visual-tested in this revision.

## TikTok video exporter (v0.5)

Click **Record TikTok video**. The app restarts the selected seed, composites a 720×1280 vertical frame with fighter HP, ultimate charge, arena, timer, and winner, and automatically downloads a WebM when the battle finishes. Keep the browser tab foregrounded while recording; the browser's MediaRecorder captures in real time, so a 60-second fight takes about 60 seconds to record. The export is **silent** and records at up to 30 FPS (actual frame rate depends on browser load). Chrome/Edge are recommended.

For a widely compatible H.264 MP4, install FFmpeg and run:

```sh
ffmpeg -i chaos-core-inferno-vs-singularity-seed-1.webm -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium -movflags +faststart chaos-core-tiktok.mp4
```

Do not use 2×/4× speed or pause while recording. The recording button resets speed to 1× and disables auto finish replay to avoid recording the replay. No copyrighted soundtrack is included. Add licensed music/sound effects before publishing. This is a **real-time browser exporter**, not yet a headless batch MP4 pipeline.

## v0.6: Original synthesized sound effects

The arena now has procedural Web Audio sound effects for hits, each fighter's special, evolutions, shield slams, arcs, fire ignition, ultimates and the winner. Click **Enable sound** to hear them during ordinary play, and adjust the volume slider. **Record TikTok video** unlocks audio and includes the synthesized sound track in the exported WebM. Audio is generated in the browser without third-party samples or music. The sound mix is recorded through a `MediaStreamAudioDestinationNode` combined with the 9:16 canvas stream. Browser permission/audio behavior may vary; Chrome or Edge recommended. FFmpeg conversion to MP4 should preserve audio using `-c:a aac`.

## v0.8 — Adaptive soundtrack

An original Web Audio synth score adds bass, kick, and rhythmic layers as fighters lose health or the match passes 22/48 seconds. Ultimates briefly duck the music. Use **Enable sound** to unlock browser audio, then **Dynamic music** and **Music** volume controls to customize it. The same master output is used for live playback and recorded WebM audio. No external licensed music is needed. Music scheduling follows real-world playback time (so 2×/4× simulations do not speed up the soundtrack).

## v0.9 — Auto-generated 3-second intro

Click **Record TikTok video**. The recorded arena canvas now begins with a 3-second matchup title card generated from the two selected fighters (colors, names, icons), a synchronized **3 → 2 → 1** countdown with original synthesized beeps, and a brief **FIGHT!** overlay and sound at the start of the simulation. The physics simulation remains paused during the intro, so the battle seed and outcomes are unchanged. The existing arena-only 720×720 WebM recording, game sound effects, adaptive music, and death animations remain intact. The intro is in the actual recording canvas; no external editor is needed.

To make a portrait 1080×1920 MP4 from a recording, use FFmpeg with a background or padding; the browser recording itself remains square.
