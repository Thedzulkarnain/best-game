# STARWELL — Gravity Forge

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Thedzulkarnain/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Thedzulkarnain/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)


**STARWELL: throw wells that drag whole swarms together, then detonate; 2 realms, branching road, 2 bosses, 16 upgrades, 12 relics, a permanent workshop**

You are Nova, a skiff defending a newborn star at the heart of a dark nebula. Void creatures crawl in to eat the star. Fire plasma to thin the swarm — but the well is the weapon: throw a gravity well and it drags whole clusters together, then detonates them. Hex Crabs wear bolt-proof armour (plasma does 10%), so only a well kills them. Defend the star **and** your hull — lose either, lose the run.

## How to play

| Key | Action |
| --- | --- |
| WASD / Arrows | Fly Nova the skiff |
| Mouse + Left-click (hold) | Aim and fire plasma |
| Right-click / E | Throw a gravity well at the cursor |
| Shift | Dash (brief invulnerability) |
| 1 / 2 / 3 | Pick an upgrade between waves |
| 4 / 5 / 6 | Pick a road between waves |
| P | Pause |
| M | Mute |
| R | Restart after win / loss |
| T | Back to title after win / loss |
| Enter | Start (or click PLAY) |

Between waves you pick **one upgrade and one road**: the road changes the next wave (Safe, Rich, or Ember) and grants one relic. The run ends when you slay THE HOLLOW SUN (wave 7) or when the star or your hull hits 0.

## Features

- **7 waves** across **2 realms**: the Nebula Reach (waves 1–4) and the Ember Deep (waves 5–7, where foes are 10% faster and wells hit 10% harder)
- **2 bosses**: VOIDMAW (wave 4) and THE HOLLOW SUN (wave 7, 3 phases with named attacks)
- **7 enemy kinds**: Shardling, Spitter Orb, Hex Crab, Void Serpent, Darter, Drain Leech, Splitter
- **16 upgrades**, pick 1 of 3 between waves (Wide Well, Nova Burst, Twin Wells, Hot Plasma, Split Cannon, Overclock, Aegis Hull, Chain Nova, Star Siphon, Event Horizon, Long Fuse, Solar Flare, Nanoweave, Hot Streak, Slipstream, Bounty)
- **12 relics**, one granted by each road card (Ember Core, Star Lens, Swift Fins, Magnet Coil, Iron Hull, Chain Spark, Void Anchor, Plasma Coil, Bulwark, Coin Purse, Salvage, Starward)
- **3 difficulties**: Easy, Normal, Hard (foe HP/damage/speed and hull 150/120/100)
- **Branching road** between waves, with a road map (wave rail) in the HUD
- **Rank** (S/A/B/C), stats grid, and 6 achievements on the victory screen
- **Workshop**: 4 permanent unlocks earned by past runs, saved in localStorage
- Combo chains with big callouts, damage numbers, pickups, dash, and a quiet generative soundtrack (all sound is code-generated WebAudio — no audio files)

## How to run locally

```sh
node serve.ts
```

Then open <http://localhost:8080>. The game is plain static files under `game/` (index.html + ES modules, no build step, no network requests) and plays at 1280×720.

To build the submission dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Entry

An original game written for the Make.fun "Make the best game" bounty (best-game-01). All art is drawn in code; all sound is generated in code. No starter, tutorial, or other entry was copied.

SPDX-License-Identifier: MIT

---

<sub>Entered on [make.fun](https://make.fun/?ref=ezh2mbnf&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
