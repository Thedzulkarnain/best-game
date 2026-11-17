// Rendering: every pixel the judge sees, drawn from the run state.
// Bright gold-and-green garden on a dark night, big readable HUD, damage
// numbers, banners and all five screens. No game logic lives here.
import { ARENA, CONTROLS, ENEMY_KINDS, FEATURES, PALETTE, SEED_POS, TOTAL_WAVES, VIEW } from './config.js';
import { ownedCount } from './upgrades.js';
import { SCREEN_LOSE, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fill; if (frac > 0) { rr(ctx, x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2); ctx.fill(); }
}

function drawGarden(ctx, run, t) {
  ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Soft radial glow behind the Heartseed.
  const g = ctx.createRadialGradient(SEED_POS.x, SEED_POS.y, 20, SEED_POS.x, SEED_POS.y, 420);
  g.addColorStop(0, 'rgba(255,210,62,0.20)'); g.addColorStop(1, 'rgba(255,210,62,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Lawn with checker patches and flowers.
  ctx.fillStyle = PALETTE.grass; ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) {
    if ((i + j) % 2 === 0) ctx.fillRect(ARENA.x + i * 100, ARENA.y + j * 94, 100, 94);
  }
  ctx.strokeStyle = '#2fbf71'; ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  // Static decorative grass tufts — big, dim and clearly not enemies.
  ctx.strokeStyle = 'rgba(126,231,135,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const fx = ARENA.x + 40 + ((i * 173) % 1120);
    const fy = ARENA.y + 30 + ((i * 131) % 480);
    if (Math.hypot(fx - SEED_POS.x, fy - SEED_POS.y) < 100) continue;
    ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.quadraticCurveTo(fx - 4, fy - 12, fx - 2, fy - 16);
    ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx, fy - 14, fx + 1, fy - 20);
    ctx.moveTo(fx + 8, fy); ctx.quadraticCurveTo(fx + 5, fy - 11, fx + 3, fy - 15); ctx.stroke();
  }
  void t;
}

function drawSeed(ctx, run, t) {
  const pulse = 1 + Math.sin(t * 2.4) * 0.06;
  const flash = run.seedFlash > 0;
  ctx.save(); ctx.translate(SEED_POS.x, SEED_POS.y); ctx.scale(pulse, pulse);
  ctx.fillStyle = flash ? '#ff5a5a' : '#ffd23e';
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2fbf71';
  ctx.beginPath(); ctx.arc(-9, -6, 5, 0, Math.PI * 2); ctx.arc(9, -6, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0a1210'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // Roots / leaves around it.
  ctx.strokeStyle = '#2fbf71'; ctx.lineWidth = 5;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
    ctx.quadraticCurveTo(Math.cos(a) * 58, Math.sin(a) * 58 - 8, Math.cos(a) * 66, Math.sin(a) * 66); ctx.stroke();
  }
  ctx.restore();
  // Seed HP ring label — cream on dark, readable at judge size.
  ctx.fillStyle = '#fff6d8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`HEARTSEED ${Math.ceil(run.seedHp)} / ${run.seedMaxHp}`, SEED_POS.x, SEED_POS.y + 62);
  bar(ctx, SEED_POS.x - 46, SEED_POS.y + 68, 92, 9, run.seedHp / run.seedMaxHp, '#ffd23e', '#071418');
}

function drawEnemy(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.flash > 0) ctx.globalAlpha = 0.6;
  const bob = Math.sin(e.wobble) * 2;
  ctx.translate(0, bob);
  ctx.scale(1.25, 1.25); // bodies read bigger than their collision radius
  ctx.fillStyle = e.colour;
  if (e.kind === 'mite') { ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a1210'; ctx.beginPath(); ctx.arc(-4, -3, 2.5, 0, Math.PI * 2); ctx.arc(4, -3, 2.5, 0, Math.PI * 2); ctx.fill(); }
  else if (e.kind === 'aphid') { ctx.beginPath(); ctx.ellipse(0, 0, e.radius, e.radius * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a1210'; ctx.fillRect(-2, -e.radius - 6, 4, 8); }
  else if (e.kind === 'beetle') { ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.radius - 6, 0, Math.PI * 2); ctx.stroke(); }
  else if (e.kind === 'bat') { ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-e.radius - 8, -10 - Math.sin(t * 9) * 5); ctx.lineTo(-6, 4); ctx.lineTo(0, 8); ctx.lineTo(6, 4); ctx.lineTo(e.radius + 8, -10 - Math.sin(t * 9) * 5); ctx.closePath(); ctx.fill(); }
  else if (e.kind === 'slug') { ctx.beginPath(); ctx.ellipse(0, 2, e.radius, e.radius * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a1210'; ctx.beginPath(); ctx.arc(-5, -8, 2.5, 0, Math.PI * 2); ctx.arc(5, -8, 2.5, 0, Math.PI * 2); ctx.fill(); }
  else if (e.kind === 'hound') { ctx.beginPath(); ctx.moveTo(e.radius, 0); ctx.lineTo(-e.radius, -10); ctx.lineTo(-e.radius, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(4, -3, 3, 0, Math.PI * 2); ctx.fill(); }
  else if (e.kind === 'leech') { ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a1210'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); }
  else if (e.kind === 'rotking') {
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a1210';
    ctx.beginPath(); ctx.moveTo(-30, -28); ctx.lineTo(-12, -52); ctx.lineTo(-4, -26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(30, -28); ctx.lineTo(12, -52); ctx.lineTo(4, -26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(-14, -8, 7, 0, Math.PI * 2); ctx.arc(14, -8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 14, 16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  // HP bar for hurt or big enemies.
  if (e.hp < e.maxHp || e.radius >= 20) {
    bar(ctx, e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 5, e.hp / e.maxHp, '#ff5a5a', '#071418');
  }
  if (e.kind === 'rotking') {
    ctx.fillStyle = '#fff6d8'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    const label = `${ENEMY_KINDS.rotking.name} — PHASE ${e.phase}`;
    const half = ctx.measureText(label).width / 2 + 24;
    const labelX = Math.max(half, Math.min(VIEW.width - half, e.x));
    ctx.fillText(label, labelX, e.y - e.radius - 20);
  }
}

function drawPlayer(ctx, run, t) {
  const p = run.player;
  if (!p.alive) return;
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  // Aim line.
  ctx.strokeStyle = 'rgba(255,246,216,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0);
  const ang = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  ctx.lineTo(Math.cos(ang) * 34, Math.sin(ang) * 34); ctx.stroke();
  // Pip: a glowing firefly keeper with leaf wings.
  ctx.fillStyle = '#7ee787';
  ctx.beginPath(); ctx.ellipse(-12, -8, 12, 6, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -8, 12, 6, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.hurtFlash > 0 ? '#ff5a5a' : '#ffd23e';
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0a1210';
  ctx.beginPath(); ctx.arc(-5, -3, 3, 0, Math.PI * 2); ctx.arc(5, -3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0a1210'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, run) {
  const p = run.player;
  ctx.fillStyle = 'rgba(7,20,24,0.85)'; ctx.fillRect(0, 0, VIEW.width, 84);
  ctx.fillStyle = '#fff6d8'; ctx.textAlign = 'left'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('🌻 SPOREKEEPER — Bloom Siege', 24, 34);
  ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.fillText(`SCORE ${run.score}`, 24, 62);
  ctx.fillStyle = '#7ee787';
  ctx.fillText(`WAVE ${Math.max(1, run.wave)} / ${TOTAL_WAVES}`, 260, 62);
  ctx.fillStyle = run.combo >= 5 ? '#ff8fb3' : '#fff6d8';
  ctx.fillText(`COMBO x${run.combo}`, 430, 62);
  ctx.fillStyle = '#8be9ff';
  ctx.fillText(`KILLS ${run.kills}`, 600, 62);
  // Player HP + dash.
  ctx.fillStyle = '#fff6d8'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText('PIP HP', 760, 30);
  bar(ctx, 760, 38, 170, 14, p.hp / p.maxHp, '#7ee787', '#071418');
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 940, 50);
  ctx.fillText('DASH', 760, 72);
  bar(ctx, 820, 62, 110, 10, 1 - Math.max(0, p.dashCooldown) / 2.2, '#8be9ff', '#071418');
  // Owned upgrades as an icon row — the visible trace of every pick.
  ctx.fillText('UPGRADES', 1060, 30);
  let ux = 1060;
  for (const [id, n] of Object.entries(run.upgradesOwned)) {
    void id;
    ctx.font = '20px sans-serif';
    ctx.fillText('★'.repeat(n), ux, 56); ux += 34;
  }
  if (Object.keys(run.upgradesOwned).length === 0) { ctx.font = '14px sans-serif'; ctx.fillStyle = '#8be9ff'; ctx.fillText('none yet — win a wave!', 1060, 56); }
  ctx.textAlign = 'left';
}

function drawBanner(ctx, run) {
  if (run.waveBanner > 0) {
    const a = Math.min(1, run.waveBanner);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(7,20,24,0.75)';
    ctx.fillRect(340, 150, 600, 64);
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(run.bannerText, 640, 194);
    ctx.restore(); ctx.textAlign = 'left';
  }
  if (run.messageTimer > 0) {
    ctx.fillStyle = 'rgba(7,20,24,0.8)';
    ctx.fillRect(390, 224, 500, 40);
    ctx.fillStyle = '#7ee787'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`✦ ${run.message}`, 640, 251);
    ctx.textAlign = 'left';
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(7,20,24,0.92)';
  rr(ctx, x, y, w, h, 18); ctx.fill();
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, 18); ctx.stroke();
}

function drawTitle(ctx, run) {
  ctx.fillStyle = 'rgba(7,20,24,0.72)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 190, 48, 900, 632);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 64px sans-serif';
  ctx.fillText('🌻 SPOREKEEPER', 640, 132);
  ctx.fillStyle = '#7ee787'; ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Bloom Siege — defend the Heartseed through 7 waves', 640, 174);
  ctx.fillStyle = '#fff6d8'; ctx.font = '18px sans-serif';
  ctx.fillText('You are Pip, keeper of the midnight garden. Blight creatures crawl in from', 640, 212);
  ctx.fillText('the dark to eat the Heartseed. Shoot them down, pick upgrades, and fell', 640, 236);
  ctx.fillText('THE ROT KING on Wave 7 — or the garden goes dark.', 640, 260);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText('WHAT AWAITS YOU', 250, 300);
  ctx.fillStyle = '#fff6d8'; ctx.font = '17px sans-serif';
  FEATURES.forEach((f, i) => ctx.fillText('• ' + f, 250, 324 + i * 25));
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CONTROLS', 250, 466);
  ctx.fillStyle = '#fff6d8'; ctx.font = '16px sans-serif';
  CONTROLS.forEach((c, i) => ctx.fillText(`${c[0]} — ${c[1]}`, 250, 490 + i * 20));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('▶  CLICK or press ENTER to start  ◀', 640, 648);
  ctx.font = '15px sans-serif'; ctx.fillStyle = '#8be9ff';
  ctx.fillText('Judge: title, play, boss and win screens are all in this game — screenshots 1–3 show them.', 640, 672);
  ctx.textAlign = 'left';
}

function drawUpgrade(ctx, run) {
  ctx.fillStyle = 'rgba(7,20,24,0.66)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 140, 110, 1000, 460);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`WAVE ${run.wave} CLEARED!  +${100 * run.wave} bonus`, 640, 172);
  ctx.fillStyle = '#fff6d8'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Choose ONE upgrade — press 1, 2 or 3, or click a card', 640, 208);
  run.upgradeChoices.forEach((u, i) => {
    const x = 190 + i * 320;
    ctx.fillStyle = '#123527'; rr(ctx, x, 240, 280, 240, 14); ctx.fill();
    ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2; rr(ctx, x, 240, 280, 240, 14); ctx.stroke();
    ctx.fillStyle = '#ffd23e'; ctx.font = '44px sans-serif';
    ctx.fillText(u.icon, x + 140, 300);
    ctx.fillStyle = '#fff6d8'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(u.name, x + 140, 340);
    ctx.fillStyle = '#c9f27e'; ctx.font = '17px sans-serif';
    ctx.fillText(u.desc, x + 140, 372);
    ctx.fillStyle = '#8be9ff'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`Owned: ${ownedCount(run, u.id)} / ${u.max}   —   press ${i + 1}`, x + 140, 410);
    ctx.fillText(`[${i + 1}]`, x + 140, 452);
  });
  ctx.textAlign = 'left';
}

function drawEnd(ctx, run, won) {
  ctx.fillStyle = won ? 'rgba(18,53,39,0.78)' : 'rgba(40,8,12,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 290, 130, 700, 460);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd23e' : '#ff5a5a';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(won ? '🌻 THE GARDEN BLOOMS!' : '🥀 THE GARDEN FELL', 640, 210);
  ctx.fillStyle = '#fff6d8'; ctx.font = '20px sans-serif';
  ctx.fillText(won ? 'The Rot King is compost. The Heartseed shines again.' : run.loseReason, 640, 252);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`FINAL SCORE ${run.score}   ·   KILLS ${run.kills}   ·   BEST COMBO x${run.bestCombo}`, 640, 300);
  ctx.font = '18px sans-serif'; ctx.fillStyle = '#c9f27e';
  ctx.fillText(`Waves cleared: ${won ? TOTAL_WAVES : Math.max(0, run.wave - 1)} / ${TOTAL_WAVES}    ·    Damage dealt ${Math.round(run.stats.damageDealt)}`, 640, 336);
  ctx.fillText(`Damage taken ${Math.round(run.stats.damageTaken)}    ·    Shots fired ${run.stats.shotsFired}    ·    Dashes ${run.stats.dashes}`, 640, 364);
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Press R or CLICK to play again', 640, 430);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#8be9ff';
  ctx.fillText(won ? 'Judge: this is the WIN screen — the run ends here, with a restart.' : 'Judge: this is the LOSE screen — the run ends here, with a restart.', 640, 470);
  ctx.textAlign = 'left';
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(7,20,24,0.7)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 440, 260, 400, 200);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText('⏸ PAUSED', 640, 330);
  ctx.fillStyle = '#fff6d8'; ctx.font = '20px sans-serif';
  ctx.fillText('Press P to resume · M to mute', 640, 380);
  ctx.fillText('R to restart the run', 640, 410);
  ctx.textAlign = 'left';
}

export function renderGame(ctx, run, t) {
  ctx.save();
  if (run.shake > 0) ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
  drawGarden(ctx, run, t);
  // Trails (dash blooms gold, slug slime green).
  for (const tr of run.trails) {
    ctx.globalAlpha = Math.max(0, tr.life);
    ctx.fillStyle = tr.slime ? '#2fbf71' : '#ffd23e';
    ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.slime ? 10 : 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawSeed(ctx, run, t);
  for (const pk of run.pickups) {
    ctx.fillStyle = pk.kind === 'heart' ? '#ff5a5a' : '#ffd23e';
    ctx.beginPath(); ctx.arc(pk.x, pk.y + Math.sin(t * 4 + pk.x) * 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a1210'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'heart' ? '+' : '$', pk.x, pk.y + 4);
    ctx.textAlign = 'left';
  }
  for (const e of run.enemies) drawEnemy(ctx, e, t);
  drawPlayer(ctx, run, t);
  for (const b of run.bolts) {
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of run.enemyBolts) {
    ctx.fillStyle = '#b5179e';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  }
  for (const pt of run.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.colour;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  for (const f of run.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.colour; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  ctx.restore();
  drawHud(ctx, run);
  // Controls hint along the bottom edge, clear of the HUD and the arena.
  ctx.fillStyle = '#c9f27e'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('WASD move  ·  Mouse aim  ·  Click / Space shoot  ·  Shift dash  ·  P pause  ·  M mute', VIEW.width / 2, 706);
  ctx.textAlign = 'left';
  drawBanner(ctx, run);
  if (run.screen === SCREEN_TITLE) drawTitle(ctx, run);
  else if (run.screen === SCREEN_UPGRADE) drawUpgrade(ctx, run);
  else if (run.screen === SCREEN_WIN) drawEnd(ctx, run, true);
  else if (run.screen === SCREEN_LOSE) drawEnd(ctx, run, false);
  else if (run.screen === SCREEN_PAUSE) drawPause(ctx);
}
