// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 7 — Snikkit (and the pie-heist of the age)
//
//  Quota 9/10. One last goblin vaults the dry-stone wall — but this
//  one wears Mistress Jhaele's pie tin for a helm and clutches the
//  pie itself, held high like a trophy. SNIKKIT (named Goblin Minion,
//  ~10 HP, AC 12): he runs in last, plants himself, and crows:
//
//      "PIE IS MINE! FAT WIZARD CANT CATCH SNIKKIT!"
//
//  Elminster is unimpressed: "…That is Mistress Jhaele's blueberry
//  pie. From the Old Skull Inn. Fetch it back."
//
//  Snikkit turns tail for the wall, but the pie is heavy and his
//  nerve is short: every couple of seconds he stumbles, sprawling
//  back within reach of the hero's sword (a Command Strike staggers
//  him too — the gauntlet pointer says "tap him"). He can never
//  quite make it over the wall. Stage 1 still completes for an idle
//  player: the stumbles do the work.
//
//  When he falls, the pie tin spins into the air and lands in the
//  grass along with the pie, beside 25 cp of stolen copper (5 coins
//  of 5). Tap the tin and the pie and the loot card pops:
//  SNIKKIT'S PIE TIN — Helm, Common, +1 max HP (equipping it is
//  Beat 8's business), with the Half-Eaten Blueberry Pie trinket
//  noted alongside.
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, lineEnd } from './timeline.js';
import { F, off } from './world.js';
import * as cb from './combat.js';
import * as beat6 from './beat6.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { mulberry, clamp, inv, easeOut, easeOutBack, hash, makeCanvas, crispText } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const DT = 1 / 120;
const TAUNT = 2.6;                  // how long the bubble hangs over him
const FLEE_SPEED = 26;              // the pie is heavy
const WALL_X = 556;                 // the dry-stone wall he can never quite climb

let D = null, A = null;

// ---------- built art ----------
function t2(str, font, col, opts = {}) {
  const c = crispText(str, font, col, { threshold: 105, ...opts });
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x1 = 0, y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  c.inkW = Math.max(1, x1 - 4 + 1); c.inkTop = y0 === c.height ? 0 : y0;
  return c;
}

// the pie tin on its own: fluted, shallow, berry-stained (spin frames for the toss)
function tinFrame(phase) {
  const [c, x] = makeCanvas(13, 8);
  const TIN = ['#2a2e3c', '#484e62', '#6e7488', '#969cb2', '#bcc2d4', '#e2e8f4'];
  const el = (cx, cy, rx, ry, col) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 13; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } };
  if (phase === 'flat') {                                  // edge-on, mid-spin
    x.fillStyle = TIN[2]; x.fillRect(0, 3, 13, 2);
    x.fillStyle = TIN[4]; x.fillRect(0, 3, 13, 1);
    x.fillStyle = TIN[3]; x.fillRect(5, 1, 4, 2);
  } else if (phase === 'under') {                          // the dark underside
    el(6, 4, 6, 2.6, TIN[1]); el(6, 3.6, 5.4, 2.0, TIN[0]);
  } else {                                                 // 'dome': the lootable face
    el(6, 4, 6.2, 3.0, TIN[2]); el(6, 3.4, 5.2, 2.3, TIN[3]); el(6, 2.9, 4.2, 1.7, TIN[4]);
    for (let i = 1; i < 12; i += 3) { x.fillStyle = TIN[1]; x.fillRect(i, 5, 1, 1); }   // crimps
    x.fillStyle = TIN[5]; x.fillRect(4, 1, 1, 1); x.fillRect(5, 1, 1, 1);               // sheen
    x.fillStyle = '#4a2a62'; x.fillRect(8, 3, 2, 1); x.fillStyle = '#2e1a42'; x.fillRect(9, 4, 1, 1); // the stain
  }
  return c;
}

// the rescued pie: lattice crust, berry dome, one heroic bite already taken
function pieFrame() {
  const [c, x] = makeCanvas(12, 9);
  const el = (cx, cy, rx, ry, col) => { for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } };
  el(5.5, 6.6, 5.4, 1.9, '#6e7488');                        // the tin dish
  el(5.5, 6.2, 5.0, 1.6, '#969cb2');
  el(5.5, 4.6, 4.8, 3.4, '#4a2a62');                        // the berry mound
  el(4.6, 4.0, 3.6, 2.4, '#6a3a82');
  for (let i = -4; i <= 4; i += 3) {                        // lattice, both ways
    for (let k = 0; k < 5; k++) { x.fillStyle = '#e2b878'; x.fillRect(Math.round(5.5 + i + k * 0.8), Math.round(6.4 - k * 0.9), 1, 1); x.fillRect(Math.round(5.5 + i + k * 0.8), Math.round(2.6 + k * 0.9), 1, 1); }
  }
  x.fillStyle = '#2e1a42'; x.fillRect(9, 2, 3, 2); x.fillRect(10, 1, 2, 2); x.fillRect(10, 4, 2, 1);  // the bite
  x.fillStyle = '#8a50a0'; x.fillRect(9, 3, 1, 1);
  x.fillStyle = '#f4d8a0'; x.fillRect(2, 3, 1, 1); x.fillRect(3, 2, 1, 1);                            // crust highlights
  return c;
}

// a brass-edged wooden plate for the card's DONE button (same cut as the Training Yard's)
function paintPlate(w, h) {
  const [c, x] = makeCanvas(w, h);
  const BR = ['#3e2a0c', '#5c3e12', '#7a5418', '#9a7026', '#c4943a', '#e2b75a', '#f6d888'];
  const WD = ['#3d2414', '#56361d', '#6e4727', '#875a31'];
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill('#140b0c', 0, 0, w, h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const e = Math.min(i, j, w - 1 - i, h - 1 - j);
    if (e > 2) continue;
    const tl = j < h / 2 || i < w / 2;
    fill(BR[e === 1 ? (tl ? 5 : 2) : tl ? 4 : 1], i, j);
  }
  for (let j = 3; j < h - 3; j++) for (let i = 3; i < w - 3; i++) {
    const g = Math.sin(i * 0.23 + j * 1.9 + Math.sin(i * 0.06) * 3);
    fill(WD[Math.max(0, Math.min(3, 1 + (g > 0.5 ? 1 : g < -0.6 ? -1 : 0) + (j < h / 2 ? 1 : 0)))], i, j);
  }
  fill('rgba(255,240,200,0.16)', 3, 3, w - 6, 1); fill('rgba(0,0,0,0.25)', 3, h - 4, w - 6, 1);
  return c;
}

// the loot card: a parchment panel with the tin in pride of place
const CARDW = 240, CARDH = 158;
function paintCard() {
  const [c, x] = makeCanvas(CARDW, CARDH);
  const O = '#140b0c';
  const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, CARDW, CARDH);
  for (let j = 1; j < CARDH - 1; j++) for (let i = 1; i < CARDW - 1; i++) {
    const e = Math.min(i, j, CARDW - 1 - i, CARDH - 1 - j);
    if (e < 1 || e > 8) continue;
    const horiz = Math.min(j, CARDH - 1 - j) < Math.min(i, CARDW - 1 - i);
    const g = horiz ? Math.sin(i * 0.21 + j * 1.7 + Math.sin(i * 0.05) * 3) : Math.sin(j * 0.21 + i * 1.7 + Math.sin(j * 0.05) * 3);
    let k = 2 + (g > 0.6 ? 1 : g < -0.7 ? -1 : 0);
    const tl = (j < CARDH / 2 && j <= i) || (i < CARDW / 2 && i < j);
    if (e === 1) k = tl ? 6 : 1; else if (e === 2) k = tl ? 5 : k; else if (e === 7) k = tl ? 1 : 5; else if (e === 8) k = 1;
    fill(WOOD[Math.max(0, Math.min(6, k))], i, j);
  }
  for (const [rx, ry] of [[5, 5], [CARDW - 6, 5], [5, CARDH - 6], [CARDW - 6, CARDH - 6]]) {
    fill('#7a5418', rx - 1, ry - 1, 3, 3); fill('#e2b75a', rx, ry, 2, 2); fill('#fff1b8', rx, ry);
  }
  for (let j = 10; j < CARDH - 10; j++) for (let i = 10; i < CARDW - 10; i++) {
    const e = Math.min(i - 10, j - 10, CARDW - 11 - i, CARDH - 11 - j);
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.1 + Math.sin(i * 0.09 + j * 0.05) * 0.16 - Math.max(0, 5 - e) * 0.4 - (j / CARDH) * 0.25;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], i, j);
  }
  fill('#8a5f1e', 14, 112, CARDW - 28, 1);
  for (let i = 0; i < CARDW - 28; i += 8) fill('#e8c068', 14 + i, 112, 3, 1);
  return c;
}

export function buildBeat7() {
  A = {
    tin: ['dome', 'flat', 'under'].map(tinFrame), pie: pieFrame(),
    card: paintCard(), plate: paintPlate(64, 24),
    gaunt: buildGauntlet(false), gauntP: buildGauntlet(true), txt: {},
  };
  A.txt.loot = t2('LOOT!', 'bold 30px "Pixelify Sans"', '#b0602c', { spacing: 4 });
  A.txt.lootSh = t2('LOOT!', 'bold 30px "Pixelify Sans"', '#241208', { spacing: 4 });
  A.txt.name = t2("Snikkit's Pie Tin", 'bold 21px "Pixelify Sans"', '#3b2418');
  A.txt.kind = t2('HELM · COMMON', 'bold 13px "Pixelify Sans"', '#6a6a72', { spacing: 2 });
  A.txt.stat = t2('+1 max HP', 'bold 17px "Pixelify Sans"', '#2e5a1c');
  A.txt.note = t2('It smells faintly of blueberries. And victory.', '14px "Pixelify Sans"', '#8a6a3c');
  A.txt.also = t2('Also found: Half-Eaten Blueberry Pie', '14px "Pixelify Sans"', '#5a3a22');
  A.txt.trinket = t2('TRINKET', 'bold 11px "Pixelify Sans"', '#6a3a82', { spacing: 2 });
  A.txt.doneLbl = t2('TAKE IT', 'bold 15px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('TAKE IT', 'bold 15px "Pixelify Sans"', '#241208');
}

// ---------- state ----------
export function reset(seed = 91) {
  D = { seed, rng: mulberry(seed), s: null, lastS: null, startAt: null, snik: null, phase: 'idle',
        tauntAt: null, fleeAt: null, staggerUntil: -9, nextStumble: 0, round: null, struck: false,
        line13: false, dieNoted: null, loot: [], cardAt: null, cardK: 0, doneAt: null };
}
reset();

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function started() { return !!D && D.startAt !== null; }
export function cardOpen() { return !!D && D.cardAt !== null; }
export function finished(t) { return !!D && D.doneAt !== null && cb.warp(t) > D.doneAt + 0.5; }
export function wantsPointer() {
  return !!D && (D.cardAt !== null || D.loot.some(l => l.state === 'rest'));
}
export function debug() {
  if (!D) return null;
  const out = { phase: D.phase, start: D.startAt, line13: D.line13, struck: D.struck, card: D.cardAt !== null,
    done: D.doneAt === null ? null : +D.doneAt.toFixed(2),
    loot: D.loot.map(l => ({ kind: l.kind, state: l.state, x: Math.round(l.x1), y: Math.round(l.gy1) })) };
  if (D.snik) {
    out.hp = cb.E && cb.E.rats.includes(D.snik) && D.s !== null ? cb.ratHP(D.snik, D.s) : '?';
    out.dead = D.snik.dieAt !== undefined;
    if (D.s !== null && !out.dead) {
      const og = off(1, F.ground), st = cb.gobState(D.snik, D.s, og);
      if (st) out.xy = { x: Math.round(st.x - 2), y: Math.round(st.gy - 16) };
    }
  }
  return out;
}

// ---------- the setup: he vaults the wall like his betters, pie and all ----------
function startBeat(s) {
  D.startAt = s;
  const g = cb.addGoblin({ tel: s + 0.25, wallX: 552, landX: 544, leap: s + 0.8, coins: 5, coinV: 5, depth: 1, snik: true, hp0: 10, holdCoins: true });
  g.meleeAt = Infinity;                                  // he is NOT here to fight
  D.snik = g;
  cb.moveRat(g, g.landT + 0.05, 356, { speed: 165 });    // he runs in close to jeer up at the hero
  D.phase = 'enter';
}

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  const s = cb.warp(t);
  if (D.startAt !== null && (!cb.E || !cb.E.rats.includes(D.snik))) reset(D.seed);   // the store was rebuilt under us
  D.lastS = s;
  if (D.startAt === null) {
    const b6 = beat6.debug();
    if (!b6 || b6.done === null || b6.open || s < b6.done + 2.0 || busyLine(s)) return;
    startBeat(s);
    return;
  }
  if (D.s === null) D.s = D.startAt;
  if (s < D.s) return;
  while (D.s + DT <= s) { D.s += DT; tick(D.s); }
  if (D.cardPending !== null && D.cardPending !== undefined && D.cardAt === null) { D.cardAt = t; D.cardPending = null; }
  D.cardK = D.cardAt === null ? 0 : clamp((t - D.cardAt) / 0.3);
}

function tick(s) {
  const g = D.snik, og = off(1, F.ground);
  // his copper is loot, not litter: no fuse on Snikkit's coins
  for (const c of cb.E.coins) if (c.rat === g.id) { c.armed = true; c.expire = Infinity; }

  if (D.phase === 'enter' && s >= g.landT + 0.9 && !cb.baseX(g, s).moving) {
    D.phase = 'taunt'; D.tauntAt = s;
    cb.E.live.push({ s, k: 'squeak', pan: 0.4 }, { s: s + 0.4, k: 'squeak', pan: 0.45 });
  }
  if (D.phase === 'taunt') {
    if (!D.line13 && s >= D.tauntAt + 0.9 && !busyLine(s)) { D.line13 = true; say('line13', s); }
    if (s >= D.tauntAt + TAUNT) {
      D.phase = 'flee'; D.fleeAt = s; D.nextStumble = s + 2.2;
      flee(g, s);
    }
  }
  if (D.phase === 'flee' || D.phase === 'dither') fleeTick(g, s);
  stumbleTick(g, s);
  strikeWatch(g, s);
  heroTurn(s);

  // he falls: the tin and the pie arc clear of the puff and rest in the grass
  if (g.dieAt !== undefined && D.dieNoted === null) {
    D.dieNoted = g.dieAt;
    D.phase = 'dead';
    const st = cb.gobState(g, g.dieAt, og);
    const gy = st ? st.gy : cb.ratGroundY(g.deathX, og, g.depth);
    const t0 = g.dieAt + 0.08;
    D.loot = [
      { kind: 'tin', x0: g.deathX, y0: gy - 30, x1: g.deathX + 34, gy1: cb.ratGroundY(g.deathX + 34, og, g.depth) - 4, t0, land: t0 + 0.85, h: 42, state: 'arc' },
      { kind: 'pie', x0: g.deathX - 2, y0: gy - 24, x1: g.deathX + 52, gy1: cb.ratGroundY(g.deathX + 52, og, g.depth) - 4, t0: t0 + 0.12, land: t0 + 0.12 + 0.72, h: 30, state: 'arc' },
    ];
    cb.E.live.push({ s: D.loot[0].land, k: 'clang', v: 0.7, pan: 0.4 }, { s: D.loot[1].land, k: 'tink', i: 2 });
  }
  for (const l of D.loot) {
    if (l.state === 'arc' && s >= l.land) { l.state = 'rest'; }
    if (l.state === 'fly' && s >= l.arrive) { l.state = 'gone'; lootArrived(l, s); }
  }
  // the card pops once both treasures are pocketed (once — it stays pocketed)
  if (D.doneAt === null && D.cardAt === null && D.cardPending == null && D.loot.length && D.loot.every(l => l.state === 'gone')) {
    D.cardPending = s;
    cb.E.live.push({ s, k: 'paper' }, { s: s + 0.1, k: 'chime' });
  }
}

// the great escape, such as it is: waddle right, never quite climb, stumble back into reach
function flee(g, s) {
  const b = cb.baseX(g, s);
  if (b.x >= WALL_X) { D.phase = 'dither'; cb.moveRat(g, s, WALL_X - 6, { speed: 40 }); return; }
  D.phase = 'flee';
  cb.moveRat(g, s, Math.min(WALL_X, b.x + 60), { speed: FLEE_SPEED });
}
function fleeTick(g, s) {
  if (s < D.staggerUntil) return;                        // staggered by a Command Strike: he stands and wobbles
  const b = cb.baseX(g, s);
  if (!b.moving) {
    if (D.phase === 'dither' || b.x >= WALL_X - 1) {
      // at the wall: he hops at the coping, pie first, and cannot make it
      const hop = Math.sin(s * 9) > 0.4;
      if (hop && !b.moving) cb.moveRat(g, s, b.x - 2, { dur: 0.12 });
      if (s >= D.nextStumble) doStumble(g, s);
      return;
    }
    flee(g, s);
  }
  if (s >= D.nextStumble) doStumble(g, s);
}
function doStumble(g, s) {
  D.phase = 'stumble';
  D.stumbleUntil = s + 1.35;
  // he trips and tumbles all the way back to the hero's feet, pie held miraculously high
  const at = cb.moveRat(g, s, cb.SLOT[0] + 20, { speed: 330, kind: 'dash' });
  g.meleeAt = at;                                      // sprawled within reach of the blade
  cb.E.live.push({ s, k: 'squeak', pan: 0.35 });
  D.nextStumble = Infinity;
}
function stumbleTick(g, s) {
  if (D.phase !== 'stumble') return;
  if (s >= D.stumbleUntil) {
    g.meleeAt = Infinity;                              // up again, and off
    D.nextStumble = s + 2.4;
    D.phase = 'flee';
    flee(g, s);
  }
  if (!D.round && isFinite(g.meleeAt) && g.meleeAt <= s + 0.2) { D.round = { t0: s, full: s + 0.75, at: s + 0.75 }; cb.E.rounds.push(D.round); }
}
// a Command Strike staggers him mid-waddle ("Tap to focus!" the pointer says)
function strikeWatch(g, s) {
  for (const cs of cb.E.strikes) {
    if (cs.rat !== g.id || cs.snikSeen) continue;
    cs.snikSeen = true; D.struck = true;
    if (g.dieAt !== undefined) return;
    if (D.phase === 'flee' || D.phase === 'dither') {
      const b = cb.baseX(g, cs.at);
      cb.moveRat(g, cs.at, b.x - 6, { dur: 0.1 });     // knocked a step back toward the hero
      D.staggerUntil = cs.at + 0.9;
      D.nextStumble = Math.min(D.nextStumble, cs.at + 1.4);
    }
  }
}

// the hero's turn (by the book; Snikkit only matters when he's sprawled in reach)
function heroTurn(s) {
  const rd = D.round; if (!rd) return;
  if (!rd.sw && s >= rd.at - 0.62) {
    const g = D.snik;
    if (g.dieAt !== undefined || !isFinite(g.meleeAt)) { rd.at = s; D.round = null; return; }
    if (!(g.meleeAt <= rd.at - 0.05)) { rd.at = Math.max(rd.at, g.meleeAt + 0.3); return; }
    const roll = 1 + Math.floor(D.rng() * 20);
    const dice = Array.from({ length: roll === 20 ? 4 : 2 }, () => 1 + Math.floor(D.rng() * 6));
    rd.sw = cb.addSwing({ at: rd.at, rat: -1, roll, dice, live: true });
  }
  const sw = rd.sw; if (!sw) return;
  if (sw.rat < 0 && !sw.void && s >= sw.at - 0.3) {
    sw.rat = cb.chooseTarget(s, sw.at);
    if (sw.rat < 0) cb.voidSwing(sw);
    else sw.lunge = clamp(cb.baseX(cb.E.rats[sw.rat], sw.at).x - cb.SLOT[0], 0, 30);
  }
  if (!sw.applied && s >= sw.at) {
    sw.applied = true;
    if (!sw.void) {
      const r = cb.E.rats[sw.rat];
      if (!r || r.dieAt !== undefined) { const n = cb.chooseTarget(s, sw.at); if (n >= 0) sw.rat = n; else cb.voidSwing(sw); }
      if (!sw.void && sw.hit) cb.damageRat(cb.E.rats[sw.rat], sw.at, sw.dmg, { kind: 'swing', sw });
    }
    D.round = null;
    const g = D.snik;
    if (g.dieAt === undefined && isFinite(g.meleeAt) && g.meleeAt <= s + 0.3) { D.round = { t0: sw.at, full: sw.at + cb.RULES.round, at: sw.at + cb.RULES.round }; cb.E.rounds.push(D.round); }
  }
}

function lootArrived(l, s) {
  cb.E.live.push({ s, k: 'chime' });
  // pocketed loot becomes inventory: the tin is a helm, the pie a trinket
  if (l.kind === 'tin') cb.addItem({ id: 'pietin', name: "Snikkit's Pie Tin", slot: 'helm', kind: 'HELM · COMMON', stat: '+1 max HP', note: 'It smells faintly of blueberries. And victory.', hp: 1, icon: 'tin' });
  else cb.addItem({ id: 'pie', name: 'Half-Eaten Blueberry Pie', slot: 'trinket', kind: 'TRINKET', stat: 'No stats. It is pie.', note: 'Half of it is missing. Nobody asks where it went.', icon: 'pie' });
}

// ---------- input ----------
export function click(gx, gy, t) {
  if (!D || D.startAt === null) return false;
  const s = cb.warp(t);
  if (D.cardAt !== null) { D.cardAt = null; D.doneAt = s; cb.E.live.push({ s, k: 'paper' }); return true; }  // any tap pockets the card
  const og = off(1, F.ground);
  for (const l of D.loot) {
    if (l.state !== 'rest') continue;
    const y = l.gy1 - 4;
    if (Math.abs(gx - l.x1) < 11 && Math.abs(gy - y) < 10) {
      l.state = 'fly'; l.fly0 = s; l.arrive = s + 0.6;
      l.fx0 = { x: l.x1, y };
      cb.E.live.push({ s, k: 'clink', i: 3 });
      return true;
    }
  }
  return false;
}
export function key(k, t) {
  if (!D || D.cardAt === null) return false;
  if (k === 'Escape' || k === 'Enter' || k === ' ') { D.cardAt = null; D.doneAt = cb.warp(t); return true; }
  return false;
}

// ---------- overlays ----------
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.startAt === null) return;
  const s = cb.warp(t), og = off(p, F.ground);
  drawBubble(ctx, s, og);
  drawBanner(ctx, s);
  drawGauntlet(ctx, s, og);
  drawLoot(ctx, s);
  if (D.cardAt !== null) drawCard(uctx, t, s);
}

// his own words, in his own little bubble: "PIE IS MINE! FAT WIZARD CANT CATCH SNIKKIT!"
function drawBubble(ctx, s, og) {
  if (D.phase !== 'taunt' || D.tauntAt === null) return;
  const st = cb.gobState(D.snik, s, og); if (!st) return;
  const k = easeOutBack(clamp((s - D.tauntAt) / 0.25));
  const out = clamp((s - D.tauntAt - TAUNT + 0.25) / 0.2);
  const a = k * (1 - out);
  if (a <= 0) return;
  const L1 = 'PIE IS MINE!', L2 = 'FAT WIZARD CANT', L3 = 'CATCH SNIKKIT!';
  const w = Math.max(numWidth(L1), numWidth(L2), numWidth(L3)) + 12, h = 30;
  const bx = Math.round(clamp(st.x - w / 2, 8, 632 - w)), by = Math.round(st.gy - 66 - (1 - k) * 6);
  ctx.globalAlpha = a;
  ctx.fillStyle = '#140b0c'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
  ctx.fillStyle = '#f8edd2'; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#e9d3a6'; ctx.fillRect(bx, by + h - 3, w, 3);
  // the tail, down toward his jeering mouth
  const tx = Math.round(clamp(st.x - 8, bx + 6, bx + w - 12));
  ctx.fillStyle = '#140b0c'; ctx.fillRect(tx - 1, by + h, 8, 2); ctx.fillRect(tx, by + h + 2, 6, 2); ctx.fillRect(tx + 1, by + h + 4, 4, 1);
  ctx.fillStyle = '#f8edd2'; ctx.fillRect(tx, by + h, 6, 2); ctx.fillRect(tx + 1, by + h + 2, 4, 2); ctx.fillRect(tx + 2, by + h + 4, 2, 1);
  num(ctx, L1, bx + 6, by + 4, ['#7a2820', '#b84a3a'], 'l', { outline: null, shadow: false });
  num(ctx, L2, bx + 6, by + 13, ['#3b2418', '#5a3a22'], 'l', { outline: null, shadow: false });
  num(ctx, L3, bx + 6, by + 22, ['#3b2418', '#5a3a22'], 'l', { outline: null, shadow: false });
  ctx.globalAlpha = 1;
}

// the objective tag under Elminster's box
function drawBanner(ctx, s) {
  let label = null;
  if (D.phase === 'taunt' || D.phase === 'flee' || D.phase === 'dither' || D.phase === 'stumble') label = 'STOP SNIKKIT!';
  else if (D.phase === 'dead' && D.loot.some(l => l.state === 'rest' || l.state === 'arc')) label = 'COLLECT THE LOOT!';
  if (!label) return;
  const at = D.phase === 'dead' ? D.dieNoted : D.tauntAt;
  if (s < at + 0.4) return;
  const w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3));
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
  ctx.globalAlpha = clamp(k);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = '#5a2a14'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = '#7a4020'; ctx.fillRect(X, Y, w, 1);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
  const bx = X + 7, by = Y + 7;
  ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 1, by - 2, 3, 5); ctx.fillRect(bx - 2, by - 1, 5, 3);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by - 1, 1, 1);
  num(ctx, label, X + 13, Y + 4, ['#ffe7a0', '#ffffff'], 'l');
  ctx.globalAlpha = 1;
}

// the gauntlet hovers over Snikkit, tapping, until the player lands a strike
function drawGauntlet(ctx, s, og) {
  if (D.struck || D.snik.dieAt !== undefined) return;
  if (D.phase !== 'flee' && D.phase !== 'dither' && D.phase !== 'stumble' && D.phase !== 'taunt') return;
  if (D.phase === 'taunt' && s < D.tauntAt + TAUNT * 0.6) return;
  const st = cb.gobState(D.snik, s, og); if (!st) return;
  const ph = (s % 1.15) / 1.15, press = ph > 0.55 && ph < 0.72;
  const gx = Math.round(st.x + 14), gy = Math.round(st.gy - 20);
  const ox = press ? 0 : 3 + Math.round(Math.sin(ph * Math.PI * 2) * 1), oy = press ? 0 : 5;
  ctx.drawImage(press ? A.gauntP : A.gaunt, gx - GAUNTLET_TIP[0] + ox, gy - GAUNTLET_TIP[1] + oy);
  if (ph > 0.55 && ph < 0.95) {
    const q = (ph - 0.55) / 0.4, R = 3 + q * 9;
    ctx.globalAlpha = 1 - q; ctx.fillStyle = '#fff2b0';
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.fillRect(Math.round(gx + Math.cos(a) * R), Math.round(gy + Math.sin(a) * R * 0.7), 1, 1); }
    ctx.globalAlpha = 1;
  }
}

// the spoils: tin and pie arc, bounce, rest and glint; tapped, they fly to the purse
function drawLoot(ctx, s) {
  for (const l of D.loot) {
    if (l.state === 'gone') continue;
    let X, Y, fr = 0;
    if (l.state === 'arc') {
      const k = clamp((s - l.t0) / (l.land - l.t0));
      X = l.x0 + (l.x1 - l.x0) * easeOut(k);
      Y = l.y0 + (l.gy1 - l.y0) * k - Math.sin(Math.PI * k) * l.h;
      fr = ((Math.floor((s - l.t0) * 11) % 3) + 3) % 3;
    } else if (l.state === 'rest') {
      X = l.x1; Y = l.gy1;
    } else {                                            // fly: up to the purse, dwindling
      const k = easeOut(clamp((s - l.fly0) / (l.arrive - l.fly0)));
      X = l.fx0.x + (592 - l.fx0.x) * k; Y = l.fx0.y + (16 - l.fx0.y) * k * k;
    }
    if (l.kind === 'tin') {
      const img = A.tin[l.state === 'arc' ? fr : 0];
      if (l.state === 'fly') { const sc = 1 - 0.6 * easeOut(clamp((s - l.fly0) / 0.6)); drawScaled(ctx, img, X, Y, sc); }
      else ctx.drawImage(img, Math.round(X - 6), Math.round(Y - 4));
    } else {
      const img = A.pie;
      if (l.state === 'fly') { const sc = 1 - 0.6 * easeOut(clamp((s - l.fly0) / 0.6)); drawScaled(ctx, img, X, Y, sc); }
      else ctx.drawImage(img, Math.round(X - 6), Math.round(Y - 5));
    }
    if (l.state === 'rest') {                           // the glint that says "tap me"
      const glint = (s * 0.9 + (l.kind === 'pie' ? 0.5 : 0)) % 2.2;
      if (glint < 0.35) {
        const q = glint / 0.35;
        ctx.globalAlpha = 1 - q;
        const gx2 = Math.round(X + 3), gy2 = Math.round(Y - 6);
        ctx.fillStyle = '#fff6d8';
        ctx.fillRect(gx2 - 2, gy2, 5, 1); ctx.fillRect(gx2, gy2 - 2, 1, 5);
        ctx.fillRect(gx2 - 1, gy2 - 1, 1, 1); ctx.fillRect(gx2 + 1, gy2 + 1, 1, 1);
        ctx.globalAlpha = 1;
      }
    }
  }
}
function drawScaled(ctx, img, X, Y, sc) {
  const w = Math.max(2, Math.round(img.width * sc)), h = Math.max(2, Math.round(img.height * sc));
  ctx.drawImage(img, Math.round(X - w / 2), Math.round(Y - h / 2), w, h);
}

// the loot card, on the 2× UI canvas with the world dimmed behind
function drawCard(uctx, t, s) {
  const k = easeOutBack(D.cardK), S = 2;
  const cw = CARDW, ch = CARDH;
  const cx = Math.round(320 - cw / 2), cy = Math.round(96 + (1 - k) * 30);
  const put = (img, gx, gy, align = 'l') => {
    let X = gx * S - 4;
    if (align === 'c') X = Math.round(gx * S - img.inkW / 2) - 4;
    uctx.drawImage(img, Math.round(X), Math.round(gy * S - img.inkTop));
  };
  uctx.globalAlpha = 0.5 * clamp(k * 1.5);
  uctx.fillStyle = '#0a0610'; uctx.fillRect(0, 0, 1280, 720);
  uctx.globalAlpha = 1;
  uctx.fillStyle = 'rgba(8,4,10,0.45)'; uctx.fillRect((cx + 4) * S, (cy + 6) * S, cw * S, ch * S);
  uctx.drawImage(A.card, cx * S, cy * S, cw * S, ch * S);
  // the tin, centre-left, at 3×
  const tin = A.tin[0];
  uctx.imageSmoothingEnabled = false;
  uctx.drawImage(tin, (cx + 24) * S, (cy + 44) * S, tin.width * 3, tin.height * 3);
  uctx.drawImage(A.pie, (cx + 26) * S, (cy + 76) * S, A.pie.width * 3, A.pie.height * 3);
  put(A.txt.lootSh, cx + cw / 2, cy + 16.5, 'c');
  put(A.txt.loot, cx + cw / 2, cy + 15.5, 'c');
  put(A.txt.name, cx + 74, cy + 42);
  put(A.txt.kind, cx + 74, cy + 56);
  put(A.txt.stat, cx + 74, cy + 68);
  put(A.txt.note, cx + 74, cy + 84);
  put(A.txt.also, cx + 74, cy + 98);
  put(A.txt.trinket, cx + 74 + Math.ceil(A.txt.also.inkW / S) + 8, cy + 99);
  const dr = { x: cx + cw / 2 - 32, y: cy + ch - 32, w: 64, h: 24 };
  uctx.drawImage(A.plate, dr.x * S, dr.y * S, 64 * S, 24 * S);
  put(A.txt.doneSh, dr.x + 32, dr.y + 6.5, 'c');
  put(A.txt.doneLbl, dr.x + 32, dr.y + 5.5, 'c');
  uctx.globalAlpha = 1;
}
