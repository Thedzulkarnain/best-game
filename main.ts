// STARWELL — Gravity Forge: the submission builder (Node 22, stdlib only).
//
// This file hands the finished game to the judge. It does two things:
//   1. Stages a clean copy of the entry — the static files under game/
//      plus the four screenshots — into the output directory.
//   2. Asks the vendored make.fun library (vendor/makefun-game.ts) to
//      build the dossier from that staged copy and writes dossier.json.
//
// The dossier is what the judge actually reads: the game source, the
// screenshots, and the hashes that prove the build reproduces. Running
// this file twice must yield a byte-identical dossier — nothing here
// depends on the clock, the network, or anything outside the repo root
// sitting next to this file.
//
// The game itself is plain static files: game/index.html plus ES modules,
// no build step, no library, no network request. While you work, serve it
// with `node serve.ts` and open http://localhost:8080.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stages the entry somewhere else:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps (reference/gate.json). The text cap shapes the
// dossier; the rest refuse an entry the scorer would refuse outright:
// more than 4 screenshots or one over 256 KiB, more than 993 files in
// game/ or 48 MiB of game files in all, or any game path over 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Where the staged entry lands: /output inside the grader, or wherever
// MAKEFUN_OUTPUT_DIR points when the file is run by hand.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage one top-level directory wholesale, creating its destination
// first. A missing source is skipped instead of crashing the build.
function stageDirectory(name) {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stageDirectory('game');
stageDirectory('screenshots');

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, DOSSIER_LIMITS),
);
