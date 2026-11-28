// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 7 — Snikkit (and the pie-heist of the age)
//
//  Quota 9/10. One last goblin vaults the dry-stone wall — wearing
//  Mistress Jhaele's pie tin for a helm and clutching the pie itself.
//  When he falls, the pie tin and pie drop beside 25 cp of copper.
//  Clicking either coins or loot sweeps up everything nearby; loot
//  arcs straight into the Gear pack on the action belt and slides in
//  a compact, non-blocking Loot Toast with a one-tap EQUIP button.
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import { F, off } from './world.js';
import * as cb from './combat.js';
import * as beat6 from './beat6.js';
import * as beat8 from './beat8.js';
import { flashGearTile, addGearBadge } from './hud.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { mulberry, clamp, easeOut, easeOutBack, hash, makeCanvas, crispText } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const DT = 1 / 120;
const TAUNT = 2.6;                  // how long the bubble hangs over him
const FLEE_SPEED = 26;              // the pie is heavy
const WALL_X = 556;                 // the dry-stone wall he can never quite climb
const GEAR_TILE = { x: 593, y: 343 }; // centre of the Gear tile on the bottom belt
const TOAST_X = 442, TOAST_Y = 50, TOAST_W = 194, TOAST_H = 36, TOAST_GAP = 4;
const TOAST_LIFE = 5.5;

let D = null, A = null;

// ---------- built art ----------
function t2(str, font, col, opts = {}) {
  const c = crispText(str, font, col, { threshold: 105, ...opts });
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x1 = 0, y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  c.inkW = Math.max(1, x1 - 4 + 1); c.inkTop = y0 === c.height ? 0 : y0; c.inkH = y1 >= y0 ? y1 - y0 + 1 : 0;
  return c;
}
const put = (u, img, gx, gy, align = 'l', valign = 't') => {
  let X = gx * S - 4;
  if (align === 'c') X = Math.round(gx * S - img.inkW / 2) - 4;
  else if (align === 'r') X = Math.round(gx * S - img.inkW) - 4;
  const Y = valign === 'm' ? gy * S - img.inkTop - img.inkH / 2 : gy * S - img.inkTop;
  u.drawImage(img, Math.round(X), Math.round(Y));
};

// the pie tin on its own: fluted, shallow, berry-stained (spin frames for the toss)
function tinFrame(phase) {
  const [c, x] = makeCanvas(13, 8);
  const TIN = ['#2a2e3c', '#484e62', '#6e7488', '#969cb2', '#bcc2d4', '#e2e8f4'];
  const el = (cx, cy, rx, ry, col) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 13; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } };
  if (phase === 'flat') {
    x.fillStyle = TIN[2]; x.fillRect(0, 3, 13, 2);
    x.fillStyle = TIN[4]; x.fillRect(0, 3, 13, 1);
    x.fillStyle = TIN[3]; x.fillRect(5, 1, 4, 2);
  } else if (phase === 'under') {
    el(6, 4, 6, 2.6, TIN[1]); el(6, 3.6, 5.4, 2.0, TIN[0]);
  } else {
    el(6, 4, 6.2, 3.0, TIN[2]); el(6, 3.4, 5.2, 2.3, TIN[3]); el(6, 2.9, 4.2, 1.7, TIN[4]);
    for (let i = 1; i < 12; i += 3) { x.fillStyle = TIN[1]; x.fillRect(i, 5, 1, 1); }
    x.fillStyle = TIN[5]; x.fillRect(4, 1, 1, 1); x.fillRect(5, 1, 1, 1);
    x.fillStyle = '#4a2a62'; x.fillRect(8, 3, 2, 1); x.fillStyle = '#2e1a42'; x.fillRect(9, 4, 1, 1);
  }
  return c;
}

// the rescued pie: lattice crust, berry dome, one heroic bite already taken
function pieFrame() {
  const [c, x] = makeCanvas(12, 9);
  const el = (cx, cy, rx, ry, col) => { for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } };
  el(5.5, 6.6, 5.4, 1.9, '#6e7488');
  el(5.5, 6.2, 5.0, 1.6, '#969cb2');
  el(5.5, 4.6, 4.8, 3.4, '#4a2a62');
  el(4.6, 4.0, 3.6, 2.4, '#6a3a82');
  for (let i = -4; i <= 4; i += 3) {
    for (let k = 0; k < 5; k++) { x.fillStyle = '#e2b878'; x.fillRect(Math.round(5.5 + i + k * 0.8), Math.round(6.4 - k * 0.9), 1, 1); x.fillRect(Math.round(5.5 + i + k * 0.8), Math.round(2.6 + k * 0.9), 1, 1); }
  }
  x.fillStyle = '#2e1a42'; x.fillRect(9, 2, 3, 2); x.fillRect(10, 1, 2, 2); x.fillRect(10, 4, 2, 1);
  x.fillStyle = '#8a50a0'; x.fillRect(9, 3, 1, 1);
  x.fillStyle = '#f4d8a0'; x.fillRect(2, 3, 1, 1); x.fillRect(3, 2, 1, 1);
  return c;
}

function paintPlate(w, h, green = false) {
  const [c, x] = makeCanvas(w, h);
  const BR = ['#3e2a0c', '#5c3e12', '#7a5418', '#9a7026', '#c4943a', '#e2b75a', '#f6d888'];
  const WD = green ? ['#1d3414', '#2a4a1c', '#376025', '#467630'] : ['#3d2414', '#56361d', '#6e4727', '#875a31'];
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill('#140b0c', 0, 0, w, h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const e = Math.min(i, j, w - 1 - i, h - 1 - j);
    if (e > 1) continue;
    const tl = j < h / 2 || i < w / 2;
    fill(BR[tl ? 5 : 2], i, j);
  }
  for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
    const g = Math.sin(i * 0.23 + j * 1.9 + Math.sin(i * 0.06) * 3);
    fill(WD[Math.max(0, Math.min(3, 1 + (g > 0.5 ? 1 : g < -0.6 ? -1 : 0) + (j < h / 2 ? 1 : 0)))], i, j);
  }
  fill('rgba(255,240,200,0.16)', 2, 2, w - 4, 1); fill('rgba(0,0,0,0.25)', 2, h - 3, w - 4, 1);
  return c;
}

// compact wood-and-parchment Loot Toast panel
function paintToast() {
  const [c, x] = makeCanvas(TOAST_W, TOAST_H);
  const O = '#140b0c';
  const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f'];
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, TOAST_W, TOAST_H);
  for (let j = 1; j < TOAST_H - 1; j++) for (let i = 1; i < TOAST_W - 1; i++) {
    const e = Math.min(i, j, TOAST_W - 1 - i, TOAST_H - 1 - j);
    if (e < 1 || e > 3) continue;
    const tl = j < TOAST_H / 2 || i < TOAST_W / 2;
    fill(WOOD[e === 1 ? (tl ? 5 : 1) : e === 2 ? (tl ? 4 : 2) : 1], i, j);
  }
  fill('#c4943a', 1, 1, TOAST_W - 2, 1);
  for (let j = 4; j < TOAST_H - 4; j++) for (let i = 4; i < TOAST_W - 4; i++) {
    const e = Math.min(i - 4, j - 4, TOAST_W - 5 - i, TOAST_H - 5 - j);
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.0 + Math.sin(i * 0.09 + j * 0.05) * 0.14 - Math.max(0, 3 - e) * 0.35;
    if (n > 0.97) v -= 0.5; else if (n < 0.02) v += 0.4;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], i, j);
  }
  // recessed icon slot on the left
  fill(O, 7, 6, 24, 24);
  fill('#4a3418', 8, 7, 22, 22);
  fill('#c4943a', 8, 7, 22, 1);
  return c;
}

export function buildBeat7() {
  A = {
    tin: ['dome', 'flat', 'under'].map(tinFrame), pie: pieFrame(),
    toast: paintToast(),
    equipBtn: paintPlate(42, 16, false), equipBtnLit: paintPlate(42, 16, true),
    gaunt: buildGauntlet(false), gauntP: buildGauntlet(true),
    toastCache: {}, txt: {},
  };
  A.txt.equip = t2('EQUIP', 'bold 11px "Pixelify Sans"', '#d8ffb0');
  A.txt.equipSh = t2('EQUIP', 'bold 11px "Pixelify Sans"', '#142008');
  A.txt.worn = t2('WORN', 'bold 11px "Pixelify Sans"', '#e8ffd0');
  A.txt.wornSh = t2('WORN', 'bold 11px "Pixelify Sans"', '#142008');
  A.txt.close = t2('×', 'bold 12px "Pixelify Sans"', '#7a5a34');
}

function toastArt(item) {
  if (!A.toastCache[item.id]) {
    const shortName = item.name.length > 21 ? item.name.slice(0, 20) + '…' : item.name;
    const sub = item.hp ? `${item.slot.toUpperCase()} · +${item.hp} HP` : item.stat && item.stat.startsWith('+') ? `${item.slot.toUpperCase()} · ${item.stat}` : `${item.slot.toUpperCase()} · NO STATS`;
    const subCol = item.hp || (item.stat && item.stat.startsWith('+')) ? '#2e5a1c' : '#7a5a34';
    A.toastCache[item.id] = {
      name: t2(shortName, 'bold 12px "Pixelify Sans"', '#3b2418'),
      sub: t2(sub, 'bold 10px "Pixelify Sans"', subCol),
    };
  }
  return A.toastCache[item.id];
}

// ---------- state ----------
export function reset(seed = 91) {
  D = { seed, rng: mulberry(seed), s: null, lastS: null, lastT: null, startAt: null, snik: null, phase: 'idle',
        tauntAt: null, fleeAt: null, staggerUntil: -9, nextStumble: 0, round: null, struck: false,
        line13: false, dieNoted: null, loot: [], toasts: [], hoverXY: null, doneAt: null };
}
reset();

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function started() { return !!D && D.startAt !== null; }
export function cardOpen() { return false; }
export function finished(t) { return !!D && D.doneAt !== null && cb.warp(t) > D.doneAt + 0.15; }
export function dismissToasts(t) { if (D) for (const tr of D.toasts) if (tr.dismissAt === null) tr.dismissAt = t; }
export function wantsPointer() {
  return !!D && (D.loot.some(l => l.state === 'rest') || D.toasts.length > 0);
}
export function debug() {
  if (!D) return null;
  const out = { phase: D.phase, start: D.startAt, line13: D.line13, struck: D.struck, toasts: D.toasts.length,
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

// sweeps any resting loot items within splash radius (called both by loot clicks and coin clicks)
export function collectLootNear(gx, gy, s, radius = 44) {
  if (!D || !D.loot.length) return 0;
  let n = 0;
  for (const l of D.loot) {
    if (l.state !== 'rest') continue;
    const ly = l.gy1 - 4;
    if (Math.hypot(l.x1 - gx, (ly - gy) * 1.4) <= radius) {
      l.state = 'fly';
      l.fly0 = s + n * 0.05;
      l.arrive = l.fly0 + 0.52;
      l.fx0 = { x: l.x1, y: ly };
      cb.E.live.push({ s: l.fly0, k: 'clink', i: 3 + n });
      n++;
    }
  }
  return n;
}

// ---------- the setup: he vaults the wall like his betters, pie and all ----------
function startBeat(s) {
  D.startAt = s;
  const g = cb.addGoblin({ tel: s + 0.25, wallX: 552, landX: 544, leap: s + 0.8, coins: 5, coinV: 5, depth: 1, snik: true, hp0: 10, holdCoins: true });
  g.meleeAt = Infinity;
  D.snik = g;
  cb.moveRat(g, g.landT + 0.05, 356, { speed: 165 });
  D.phase = 'enter';
}

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  const s = cb.warp(t);
  if (D.startAt !== null && (!cb.E || !cb.E.rats.includes(D.snik))) reset(D.seed);
  // tick non-blocking loot toasts (pause timer while hovered)
  const dt = D.lastT !== null ? Math.max(0, t - D.lastT) : 0;
  D.lastT = t;
  for (let i = 0; i < D.toasts.length; i++) {
    const tr = D.toasts[i];
    if (tr.dismissAt !== null) continue;
    if (isHoverToast(i)) tr.pausedSec += dt;
    else if (t - tr.createdAt - tr.pausedSec >= TOAST_LIFE) tr.dismissAt = t;
  }
  D.toasts = D.toasts.filter(tr => tr.dismissAt === null || t - tr.dismissAt < 0.26);

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
}

function tick(s) {
  const g = D.snik, og = off(1, F.ground);
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
  if (D.round && !D.round.sw && (g.dieAt !== undefined || !isFinite(g.meleeAt) || g.meleeAt > s + 0.05)) {
    D.round.t0 += DT; D.round.full += DT; D.round.at += DT;
  }
  heroTurn(s);

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
    if (l.state === 'arc' && s >= l.land) l.state = 'rest';
    if (l.state === 'rest' && cb.E.autoCollect && s >= l.land + 0.2) {
      l.state = 'fly'; l.fly0 = s; l.arrive = s + 0.52; l.fx0 = { x: l.x1, y: l.gy1 - 4 };
    }
    if (l.state === 'fly' && s >= l.arrive) { l.state = 'gone'; lootArrived(l, s); }
  }
  // once both spoils reach the Gear pack, Beat 7 completes seamlessly without blocking gameplay
  if (D.doneAt === null && D.loot.length && D.loot.every(l => l.state === 'gone')) {
    D.doneAt = s;
  }
}

function flee(g, s) {
  const b = cb.baseX(g, s);
  if (b.x >= WALL_X) { D.phase = 'dither'; cb.moveRat(g, s, WALL_X - 6, { speed: 40 }); return; }
  D.phase = 'flee';
  cb.moveRat(g, s, Math.min(WALL_X, b.x + 60), { speed: FLEE_SPEED });
}
function fleeTick(g, s) {
  if (s < D.staggerUntil) return;
  const b = cb.baseX(g, s);
  if (!b.moving) {
    if (D.phase === 'dither' || b.x >= WALL_X - 1) {
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
  const at = cb.moveRat(g, s, cb.SLOT[0] + 20, { speed: 330, kind: 'dash' });
  D.stumbleUntil = at + 1.45;
  g.meleeAt = at;
  cb.E.live.push({ s, k: 'squeak', pan: 0.35 });
  D.nextStumble = Infinity;
}
function stumbleTick(g, s) {
  if (D.phase !== 'stumble') return;
  if (g.dieAt === undefined && isFinite(g.meleeAt) && g.meleeAt <= s + 0.3) {
    if (g.nextBite === undefined) g.nextBite = g.meleeAt + 0.8;
    if (s >= g.nextBite - 0.3) {
      const at = g.nextBite;
      cb.addBite({ at, rat: g.id, roll: 1 + Math.floor(D.rng() * 20), dmg: 2 });
      g.nextBite = at + cb.RULES.snikRound;
    }
  }
  if (s >= D.stumbleUntil) {
    g.meleeAt = Infinity;
    D.nextStumble = s + 2.4;
    D.phase = 'flee';
    flee(g, s);
  }
  if (!D.round && isFinite(g.meleeAt) && g.meleeAt <= s + 0.05 && g.dieAt === undefined) {
    const rd = cb.RULES.round * (cb.E.roundMult || 1);
    D.round = { t0: s, full: s + rd, at: s + rd };
    cb.E.rounds.push(D.round);
  }
}
function strikeWatch(g, s) {
  for (const cs of cb.E.strikes) {
    if (cs.rat !== g.id || cs.snikSeen) continue;
    cs.snikSeen = true; D.struck = true;
    if (g.dieAt !== undefined) return;
    if (D.phase === 'flee' || D.phase === 'dither') {
      const b = cb.baseX(g, cs.at);
      cb.moveRat(g, cs.at, b.x - 6, { dur: 0.1 });
      D.staggerUntil = cs.at + 0.9;
      D.nextStumble = Math.min(D.nextStumble, cs.at + 1.4);
    } else if (D.phase === 'stumble') {
      D.stumbleUntil += 0.25;
    }
  }
}

function heroTurn(s) {
  const rd = D.round; if (!rd) return;
  if (!rd.sw && s >= rd.at - 0.62) {
    const g = D.snik;
    if (g.dieAt !== undefined || !isFinite(g.meleeAt)) { rd.at = s; D.round = null; return; }
    if (!(g.meleeAt <= rd.at - 0.05)) { rd.at = Math.max(rd.at, g.meleeAt + 0.3); return; }
    const roll = 1 + Math.floor(D.rng() * 20);
    const dice = Array.from({ length: roll >= (cb.E.critRange || 20) ? 4 : 2 }, () => 1 + Math.floor(D.rng() * 6));
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
    if (g.dieAt === undefined && isFinite(g.meleeAt) && g.meleeAt <= s + 0.3) {
      const roundDur = cb.RULES.round * (cb.E.roundMult || 1);
      D.round = { t0: sw.at, full: sw.at + roundDur, at: sw.at + roundDur };
      cb.E.rounds.push(D.round);
    }
  }
}

function lootArrived(l, s) {
  cb.E.live.push({ s, k: 'chime' });
  flashGearTile();
  addGearBadge(1);
  const item = l.kind === 'tin'
    ? { id: 'pietin', name: "Snikkit's Pie Tin", slot: 'helm', kind: 'HELM · COMMON', stat: '+1 max HP', note: 'It smells faintly of blueberries. And victory.', hp: 1, icon: 'tin' }
    : { id: 'pie', name: 'Half-Eaten Blueberry Pie', slot: 'trinket', kind: 'TRINKET', stat: 'No stats. It is pie.', note: 'Half of it is missing. Nobody asks where it went.', icon: 'pie' };
  cb.addItem(item);
  const tNow = D.lastT ?? cb.unwarp(s);
  D.toasts.push({ id: item.id, item, createdAt: tNow, pausedSec: 0, equipped: false, equipAt: null, dismissAt: null });
}

function toastRect(idx) {
  return { x: TOAST_X, y: TOAST_Y + idx * (TOAST_H + TOAST_GAP), w: TOAST_W, h: TOAST_H };
}
function isHoverToast(idx) {
  if (!D.hoverXY) return false;
  const r = toastRect(idx), [gx, gy] = D.hoverXY;
  return gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h;
}

// ---------- input ----------
export function hover(gx, gy) {
  if (!D) return;
  D.hoverXY = gx === null ? null : [gx, gy];
}

export function click(gx, gy, t) {
  if (!D || D.startAt === null) return false;
  const s = cb.warp(t);
  // 1. Check non-blocking loot toasts (quick inline EQUIP or dismiss; clicks outside pass straight through!)
  for (let i = 0; i < D.toasts.length; i++) {
    const tr = D.toasts[i];
    if (tr.dismissAt !== null) continue;
    const r = toastRect(i);
    if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) {
      const er = { x: r.x + TOAST_W - 50, y: r.y + 10, w: 42, h: 16 };
      if (!tr.equipped && !tr.item.equipped && gx >= er.x && gx < er.x + er.w && gy >= er.y && gy < er.y + er.h) {
        cb.equipItem(tr.item.id, s);
        tr.equipped = true;
        tr.equipAt = t;
        tr.dismissAt = t + 0.9;
        cb.E.live.push({ s: s + 0.14, k: 'chime' });
        return true;
      }
      tr.dismissAt = t;
      cb.E.live.push({ s, k: 'paper' });
      return true;
    }
  }
  // 2. Clicking resting loot sweeps nearby loot AND nearby coins
  let hit = null, best = 1e9;
  for (const l of D.loot) {
    if (l.state !== 'rest') continue;
    const y = l.gy1 - 4;
    if (Math.abs(gx - l.x1) < 13 && Math.abs(gy - y) < 12) {
      const d = Math.hypot(gx - l.x1, gy - y);
      if (d < best) { best = d; hit = l; }
    }
  }
  if (hit) {
    collectLootNear(hit.x1, hit.gy1 - 4, s, 44);
    cb.collectCoinsNear(hit.x1, hit.gy1 - 4, s, off(1, F.ground), 44);
    return true;
  }
  return false;
}
export function key() { return false; }

// ---------- overlays ----------
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.startAt === null) return;
  const s = cb.warp(t), og = off(p, F.ground);
  drawBubble(ctx, s, og);
  drawBanner(ctx, s);
  drawGauntlet(ctx, s, og);
  drawLoot(ctx, s);
  if (D.toasts.length && !beat6.trainingOpen() && !beat8.gearOpen()) drawToasts(uctx, t);
}

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
  const tx = Math.round(clamp(st.x - 8, bx + 6, bx + w - 12));
  ctx.fillStyle = '#140b0c'; ctx.fillRect(tx - 1, by + h, 8, 2); ctx.fillRect(tx, by + h + 2, 6, 2); ctx.fillRect(tx + 1, by + h + 4, 4, 1);
  ctx.fillStyle = '#f8edd2'; ctx.fillRect(tx, by + h, 6, 2); ctx.fillRect(tx + 1, by + h + 2, 4, 2); ctx.fillRect(tx + 2, by + h + 4, 2, 1);
  num(ctx, L1, bx + 6, by + 4, ['#7a2820', '#b84a3a'], 'l', { outline: null, shadow: false });
  num(ctx, L2, bx + 6, by + 13, ['#3b2418', '#5a3a22'], 'l', { outline: null, shadow: false });
  num(ctx, L3, bx + 6, by + 22, ['#3b2418', '#5a3a22'], 'l', { outline: null, shadow: false });
  ctx.globalAlpha = 1;
}

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

// the spoils: tin and pie arc, bounce, rest and glint; swept up, they arc into the Gear pack
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
    } else {
      const k = easeOut(clamp((s - l.fly0) / (l.arrive - l.fly0)));
      const cx = (l.fx0.x + GEAR_TILE.x) * 0.5, cy = Math.min(l.fx0.y, GEAR_TILE.y) - 24;
      X = (1 - k) * (1 - k) * l.fx0.x + 2 * (1 - k) * k * cx + k * k * GEAR_TILE.x;
      Y = (1 - k) * (1 - k) * l.fx0.y + 2 * (1 - k) * k * cy + k * k * GEAR_TILE.y;
    }
    if (l.kind === 'tin') {
      const img = A.tin[l.state === 'arc' ? fr : 0];
      if (l.state === 'fly') { const sc = 1 - 0.55 * easeOut(clamp((s - l.fly0) / (l.arrive - l.fly0))); drawScaled(ctx, img, X, Y, sc); }
      else ctx.drawImage(img, Math.round(X - 6), Math.round(Y - 4));
    } else {
      const img = A.pie;
      if (l.state === 'fly') { const sc = 1 - 0.55 * easeOut(clamp((s - l.fly0) / (l.arrive - l.fly0))); drawScaled(ctx, img, X, Y, sc); }
      else ctx.drawImage(img, Math.round(X - 6), Math.round(Y - 5));
    }
    if (l.state === 'rest') {
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

// non-blocking stacked Loot Toasts in the top-right corner
function drawToasts(uctx, t) {
  uctx.imageSmoothingEnabled = false;
  for (let i = 0; i < D.toasts.length; i++) {
    const tr = D.toasts[i];
    const inK = easeOutBack(clamp((t - tr.createdAt) / 0.24));
    const outK = tr.dismissAt !== null ? easeOut(clamp((t - tr.dismissAt) / 0.26)) : 0;
    const alpha = clamp(inK * 1.4) * (1 - outK);
    if (alpha <= 0.01) continue;
    const r = toastRect(i);
    const tx = Math.round(r.x + (1 - inK) * 44 + outK * 24), ty = r.y;
    const art = toastArt(tr.item);

    uctx.save();
    uctx.globalAlpha = alpha;
    uctx.fillStyle = 'rgba(8,4,10,0.42)';
    uctx.fillRect((tx + 2) * S, (ty + 3) * S, TOAST_W * S, TOAST_H * S);
    uctx.drawImage(A.toast, tx * S, ty * S, TOAST_W * S, TOAST_H * S);

    // icon inside left slot
    const ic = tr.item.icon === 'tin' ? A.tin[0] : A.pie;
    const iw = ic.width * S, ih = ic.height * S;
    uctx.drawImage(ic, Math.round((tx + 19) * S - iw / 2), Math.round((ty + 18) * S - ih / 2), iw, ih);

    // name & stat line
    put(uctx, art.name, tx + 35, ty + 7);
    put(uctx, art.sub, tx + 35, ty + 20);

    // inline EQUIP / WORN button
    const er = { x: tx + TOAST_W - 50, y: ty + 10, w: 42, h: 16 };
    const wornNow = tr.equipped || tr.item.equipped;
    uctx.drawImage(wornNow ? A.equipBtnLit : A.equipBtn, er.x * S, er.y * S, er.w * S, er.h * S);
    put(uctx, wornNow ? A.txt.wornSh : A.txt.equipSh, er.x + er.w / 2, er.y + er.h / 2 + 1, 'c', 'm');
    put(uctx, wornNow ? A.txt.worn : A.txt.equip, er.x + er.w / 2, er.y + er.h / 2, 'c', 'm');

    // subtle dismiss mark
    put(uctx, A.txt.close, tx + TOAST_W - 7, ty + 3, 'c');
    uctx.restore();
  }
  uctx.globalAlpha = 1;
}
