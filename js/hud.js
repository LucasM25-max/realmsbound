// ─────────────────────────────────────────────────────────────
//  Game HUD — arrives with Beat 1, when Elminster's lines move into
//  the dialogue box (bottom-left).  Look & feel only: nothing here is
//  interactive yet.
//
//  Layout (native 640×360 grid):
//    top-left    HERO PLATE   portrait medallion, level shield, HP, XP
//                 └ SOON tag  next level + what it unlocks
//    top-centre  STAGE SIGN   hanging board: stage medallion, name, kill quota
//                 └ route     stage nodes to the next boss (the "horizon" goal)
//    top-right   PURSE        coin count, speed / auto / sound toggles
//    right edge  NEXT STAGE   bookmark tab, padlocked until the quota is full
//    bottom-right ACTION BELT ability sockets [1][2] · Train / Gear / Hero [T][G][H]
//                 └ NOW tag   the cheapest useful purchase
//
//  Materials match the dialogue box: oiled oak, dark leather, brass, iron,
//  parchment.  Every panel is painted once into an offscreen canvas at the
//  native pixel grid; per frame we only blit those and draw the moving bits.
//  Text lives on the 2× UI canvas (hard-thresholded pixel font); keycaps
//  use a hand-made 3×5 pixel font so they stay razor sharp at 1×.
// ─────────────────────────────────────────────────────────────
import { T, UI_SCALE as S } from './timeline.js';
import { makeCanvas, crispText, clamp, inv, easeOut, easeOutBack, hash, noise2 } from './util.js';
import { C, P, Raster, ramp, mixC } from './pix.js';
import { heroAnchor } from './actors.js';
import { easeInOut } from './util.js';
import { num, numWidth } from './pixfont.js';
import { hudState, RULES } from './combat.js';

// ---------- palette ----------
const O = '#140b0c';
const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
const LEATHER = ['#1d1210', '#2a1a16', '#3b251d', '#4d3125', '#5f3e2e', '#76503a'];
const BRASS = ['#3e2a0c', '#5c3e12', '#7a5418', '#9a7026', '#c4943a', '#e2b75a', '#f6d888', '#fff1b8'];
const IRON = ['#16151b', '#24232b', '#36343f', '#4b4856', '#65616f', '#878394', '#b2afbd'];
const PARCH = ['#8f6a3e', '#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd'];
const CREAM = '#fbe9c4', MUTED = '#d2b98e', INK = '#3b2418', SHADOW = '#120809';

// ---------- timing: panels land one after another, just after the dialogue box ----------
const T0 = T.hudIn[0];
export const HUD_TIMES = {
  plate: T0 + 0.60, sign: T0 + 0.70, purse: T0 + 0.80, belt: T0 + 0.90, next: T0 + 1.05,
  soon: T0 + 1.20, route: T0 + 1.30, now: T0 + 1.42,
};

const Hd = {};          // build-once assets
let muted = false;
export function setHudMuted(m) { muted = m; }
// Beat 6: the Train tile pulses gold until the yard is opened; the NOW tag retargets after each rank
let trainPulse = false, trainOpen = false;
export function setTrainPulse(on) { trainPulse = on; }
export function setTrainingOpen(on) { trainOpen = on; }
let gearPulse = false, gearBadge = 0, gearFlashAt = -9;
export function setGearPulse(on) { gearPulse = on; }
export function flashGearTile() { gearFlashAt = performance.now() / 1000; }
export function setGearBadge(n) { gearBadge = Math.max(0, n | 0); }
export function addGearBadge(n = 1) { gearBadge = Math.max(0, (gearBadge + n) | 0); }
// the Train/Gear/Hero tiles and Second Wind socket sit behind padlocks until unlocked
const tileLock = { train: true, gear: true, hero: true };
export function setTileLocked(k, on) { tileLock[k] = on; }
let windLocked = true;
export function setWindLocked(on) { windLocked = on; }
export function rebuildNow(rank, cp) {
  if (!Hd.text) return;                       // before buildHUD, the boot-time reset has nothing to rebuild
  Hd.text.now = tx('Weapon Drills R' + rank, 16, INK, { sh: null });
  Hd.now = buildNow(String(cp));
}

// ============================================================
//  small painting helpers (2D context, native pixels)
// ============================================================
const fill = (x, c, X, Y, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
const pick = (pal, t) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(t * (pal.length - 1))))];

// shape test helper: paint every pixel in a box for which inside(x,y) is true
function shade(x, X, Y, w, h, fn) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = fn(i, j); if (c) fill(x, c, X + i, Y + j); }
}

// chamfered box (corners cut by k px); returns an inside() test in local coords
const chamfer = (w, h, k) => (i, j) => {
  if (i < 0 || j < 0 || i >= w || j >= h) return false;
  const ci = Math.min(i, w - 1 - i), cj = Math.min(j, h - 1 - j);
  return ci + cj >= k;
};

// a framed panel: dark outline, 1px bevel (light top-left / dark bottom-right), material fill
function panel(x, X, Y, w, h, { k = 2, mat = 'wood', seed = 1, bevel = true } = {}) {
  const inside = chamfer(w, h, k);
  shade(x, X, Y, w, h, (i, j) => {
    if (!inside(i, j)) return null;
    const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
    if (edge) return O;
    const e2 = !inside(i - 2, j) || !inside(i, j - 2), e3 = !inside(i + 2, j) || !inside(i, j + 2);
    if (mat === 'wood') {
      const g = Math.sin(i * 0.23 + Math.sin(i * 0.05 + seed) * 3 + j * 1.9) + (noise2(i / 9, j / 2, seed) - 0.5) * 1.2;
      let t = 3 + (g > 0.75 ? 1 : g < -0.85 ? -1 : 0);
      if (hash(i * 31 + j * 977, seed) > 0.985) t = 1;                       // knots / pores
      if (bevel && e2) t = 5; else if (bevel && e3) t = 1;
      return WOOD[t];
    }
    if (mat === 'leather') {
      const n = hash(i * 7 + j * 131, seed);
      let t = 2 + (n > 0.93 ? 1 : n < 0.06 ? -1 : 0) + (noise2(i / 7, j / 5, seed) > 0.62 ? 1 : 0);
      if (bevel && e2) t = 4; else if (bevel && e3) t = 0;
      return LEATHER[t];
    }
    if (mat === 'parch') {
      const n = hash(i * 13 + j * 71, seed);
      let t = 4 + (n > 0.95 ? -1 : 0);
      if (e2) t = 5; else if (e3) t = 2;
      return PARCH[t];
    }
    if (mat === 'iron') {
      let t = 2 + (hash(i * 5 + j * 17, seed) > 0.9 ? 1 : 0);
      if (e2) t = 4; else if (e3) t = 1;
      return IRON[t];
    }
    return null;
  });
  return inside;
}

// leather stitching a couple of pixels inside the edge
function stitches(x, X, Y, w, h, inset = 2, col = '#8a6a4c') {
  for (let i = inset + 1; i < w - inset - 1; i += 3) { fill(x, col, X + i, Y + inset); fill(x, col, X + i, Y + h - 1 - inset); }
}

function rivet(x, X, Y) { fill(x, BRASS[2], X, Y, 2, 2); fill(x, BRASS[6], X, Y); fill(x, BRASS[1], X + 1, Y + 1); }

// circular ring: outline + brass band + outline; inner returns test
function ring(x, cx, cy, r, band = 2, pal = BRASS) {
  for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
    const d = Math.hypot(i + 0.5 - 0.5, j + 0.5 - 0.5);
    const X = Math.floor(cx + i), Y = Math.floor(cy + j);
    if (d > r + 0.5) continue;
    if (d > r - 0.5) { fill(x, O, X, Y); continue; }
    if (d > r - 0.5 - band) {
      const lit = -(i + j) / (Math.hypot(i, j) || 1);                         // light from the top-left
      fill(x, pal[Math.max(1, Math.min(pal.length - 1, Math.round(3.5 + lit * 2.4)))], X, Y);
      continue;
    }
    if (d > r - 1.5 - band) { fill(x, O, X, Y); continue; }
  }
}

// ---------- 3×5 pixel font for keycaps and tiny labels ----------
const GLYPH = {
  '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '0': '010101101101010', 'T': '111010010010010', 'G': '011100101101011', 'H': '101101111101101', 'L': '100100100100111',
  'V': '101101101101010', 'v': '000101101101010', 'x': '000101010101000', 'A': '010101111101101', 'U': '101101101101111',
  'O': '010101101101010', 'K': '101101110101101', 'S': '011100010001110', 'E': '111100110100111', 'X': '101101010101101',
  'P': '110101110100100', 'N': '101111111111101', 'B': '110101110101110', 'C': '011100100100011', 'R': '110101110101101',
  ' ': '000000000000000', '/': '001001010100100',
};
function glyphs(x, str, X, Y, col) {
  let px = X;
  for (const ch of str) { const g = GLYPH[ch]; if (g) for (let k = 0; k < 15; k++) if (g[k] === '1') fill(x, col, px + (k % 3), Y + Math.floor(k / 3)); px += 4; }
  return px - X - 1;
}
// a keycap: little stone tablet with a letter
function keycap(x, X, Y, ch) {
  fill(x, O, X, Y, 7, 8);
  fill(x, IRON[2], X + 1, Y + 1, 5, 6); fill(x, IRON[4], X + 1, Y + 1, 5, 1); fill(x, IRON[1], X + 1, Y + 6, 5, 1);
  glyphs(x, ch, X + 2, Y + 1, '#f2e2bd');
}


// ---------- chunky 5×7 numerals, drawn on the native grid (outlined + drop shadow) ----------
// Pixelify Sans' 5 reads as S and its 2 as Z at small sizes; numbers are the most-read thing on
// an idle HUD, so they get their own hand-made glyphs.

// ============================================================
//  pixel icons (Rasters), shaded by hand-picked ramps
// ============================================================
const R2C = r => r.toCanvas();
// pad by 1px so the outline is never clipped, then outline
function OL(r, col = O) { const q = new Raster(r.w + 2, r.h + 2); q.blit(r, 1, 1); return q.outline(C(col)).toCanvas(); }
const D0 = 0;                                     // no dithering on icons

function iconHeart() {
  const r = new Raster(9, 8), P1 = P(['#4a0f16', '#8e1b26', '#c8303a', '#ef5a4e', '#ffb09a']);
  const m = ['011000110', '111101111', '111111111', '111111111', '011111110', '001111100', '000111000', '000010000'];
  m.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') r.set(i, j, ramp(P1, clamp(0.75 - j * 0.09 + (i < 4 ? 0.05 : -0.08)), i, j, D0)); }));
  r.set(1, 1, P1[4]); r.set(2, 1, P1[4]); r.set(1, 2, P1[3]);
  return OL(r);
}
function iconCoin(kind = 'cp') {
  const pal = { cp: ['#4a2210', '#7e3e1c', '#b0602c', '#d98b47', '#f4b77a', '#ffe0b8'],
    sp: ['#30323c', '#5a5e6c', '#8c91a2', '#b9bfcd', '#dde1ea', '#ffffff'],
    gp: ['#5a3510', '#8a5a1a', '#c4943a', '#e5b84d', '#f8de86', '#fff5c8'] }[kind];
  const r = new Raster(7, 7), Pc = P(pal);
  r.ellipse(3.5, 3.5, 3.5, 3.5, (x, y, u, v) => ramp(Pc, clamp(0.62 - (u + v) * 0.3), x, y, D0));
  r.ellipse(3.5, 3.5, 2, 2, (x, y, u, v) => ramp(Pc, clamp(0.4 - (u + v) * 0.2), x, y, D0));
  r.set(2, 1, Pc[5]); r.set(1, 2, Pc[4]);
  return OL(r);
}
function iconPouch() {
  const r = new Raster(16, 17), L1 = P(['#2a1a10', '#4a2e18', '#6e4524', '#8e5e32', '#ad7a44', '#c99a5c', '#e2bc80']), G = P(BRASS);
  r.ellipse(8, 11, 7, 5.6, (x, y, u, v) => ramp(L1, clamp(0.62 - u * 0.25 - v * 0.3 + (Math.sin(x * 1.7) > 0.8 ? -0.12 : 0)), x, y, D0));
  r.poly([[5, 2], [11, 2], [10, 6], [6, 6]], (x, y) => ramp(L1, clamp(0.55 - (x - 5) * 0.04), x, y, D0));   // gathered neck
  for (const [x, y] of [[4, 1], [5, 0], [11, 1], [10, 0], [7, 1], [9, 1]]) r.set(x, y, L1[3]);                // frilled top
  r.hline(5, 11, 6, G[3]); r.hline(5, 11, 7, G[1]); r.set(6, 6, G[6]); r.set(12, 7, G[4]); r.set(13, 8, G[3]);   // drawstring
  r.set(4, 9, L1[6]); r.set(5, 8, L1[6]); r.set(4, 10, L1[5]);                                                     // sheen
  // a coin peeking out of the neck
  r.set(8, 1, G[6]); r.set(9, 2, G[5]); r.set(8, 2, G[4]);
  return OL(r);
}
function iconSkull() {
  const r = new Raster(9, 9), B = P(['#5e5468', '#8f8598', '#c9c1cf', '#efe9f0']);
  r.ellipse(4.5, 3.8, 4, 3.6, (x, y, u, v) => ramp(B, clamp(0.75 - (u + v) * 0.25), x, y, D0));
  r.rect(2, 6, 5, 2, (x, y) => ramp(B, 0.5 - (x - 2) * 0.05, x, y, D0));
  r.set(2, 4, C('#1a1020')); r.set(3, 4, C('#1a1020')); r.set(5, 4, C('#1a1020')); r.set(6, 4, C('#1a1020')); r.set(3, 5, C('#2a1830')); r.set(5, 5, C('#2a1830'));
  r.set(4, 6, B[0]); r.set(3, 8, B[1]); r.set(5, 8, B[1]);
  return OL(r);
}
function iconLock(small = false) {
  const r = new Raster(7, 9), I = P(IRON), G = P(BRASS);
  for (const [x, y] of [[2, 0], [3, 0], [4, 0], [1, 1], [5, 1], [1, 2], [5, 2], [1, 3], [5, 3]]) r.set(x, y, I[5]);
  r.rect(0, 4, 7, 5, (x, y) => ramp(G, clamp(0.7 - y * 0.06 - x * 0.03), x, y, D0));
  r.set(3, 5, C(O)); r.set(3, 6, C(O)); r.set(0, 4, G[6]);
  return OL(r);
}
function iconStarUp() {                                  // "level up" chevron
  const r = new Raster(9, 9), G = P(['#2a4f8a', '#3f7fc8', '#7fc0f0', '#d6f0ff']);
  for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) { r.set(4 - i, 2 + i + k * 3, G[2 - k]); r.set(4 + i, 2 + i + k * 3, G[2 - k]); r.set(4 - i, 3 + i + k * 3, G[1 - k + 1]); r.set(4 + i, 3 + i + k * 3, G[1]); }
  r.set(4, 1, G[3]); r.set(4, 2, G[3]);
  return OL(r);
}

function iconWind() {                                   // Second Wind: a heart caught up in a rising gust
  const r = new Raster(15, 14);
  const H = P(['#5a0f18', '#9e1e2a', '#d6383c', '#f6685a', '#ffb8a0']);
  const G = P(['#1f6e43', '#3fa860', '#86dc8e', '#e0ffd8']);
  // gust streaks sweeping up from the lower left, curling over the top
  const streak = (pts, k) => { for (let i = 0; i < pts.length - 1; i++) r.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], G[k]); };
  streak([[0, 12], [4, 12], [8, 11]], 1);
  streak([[0, 8], [2, 7]], 2);
  streak([[1, 4], [4, 2], [8, 1], [11, 1], [13, 2], [14, 4], [13, 5], [11, 5]], 2);
  r.set(9, 1, G[3]); r.set(10, 1, G[3]); r.set(12, 2, G[3]);
  // heart
  const m = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  m.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') r.set(4 + i, 5 + j, ramp(H, clamp(0.78 - j * 0.12 + (i > 3 ? -0.06 : 0.04)), i, j, 0)); }));
  r.set(5, 6, H[4]); r.set(5, 7, H[3]); r.set(6, 5, H[4]);
  return OL(r);
}
function iconPotion() {                                 // an empty flask — none in the pack yet
  const r = new Raster(12, 14);
  const GL = P(['#3a3c4c', '#5c6074', '#8a90a6', '#c4cad8', '#eef2fa']);
  r.ellipse(6, 9, 5, 4.6, (x, y, u, v) => { const d = u * u + v * v; return d > 0.62 ? ramp(GL, clamp(0.55 - (u + v) * 0.3), x, y, 0) : ramp(GL, clamp(0.12 - v * 0.08), x, y, 0); });
  r.rect(4, 2, 4, 3, (x) => GL[x === 4 ? 3 : 1]);
  r.rect(3, 0, 6, 2, (x, y) => ramp(P(['#3a2414', '#6e4727', '#a1703f']), 0.7 - (x - 3) * 0.1, x, y, 0));
  r.set(3, 7, GL[4]); r.set(3, 8, GL[4]); r.set(4, 6, GL[3]); r.hline(4, 8, 12, GL[1]);
  return OL(r);
}
function iconTraining() {                               // a sword struck into a straw target
  const r = new Raster(20, 20);
  const ST = P(['#5a3a10', '#8a6420', '#c4943a', '#e8c46a', '#fbe6a0']), RED = P(['#5a0f16', '#9e2228', '#d4483e']);
  r.ellipse(8.5, 11, 7, 7, (x, y, u, v) => {
    const d = Math.hypot(u, v);
    if (d < 0.33) return ramp(RED, 0.8 - v * 0.3, x, y, D0);
    if (d > 0.55 && d < 0.75) return ramp(RED, 0.55 - v * 0.3, x, y, D0);
    return ramp(ST, clamp(0.62 - (u + v) * 0.25 + (((x + y) % 3) === 0 ? -0.15 : 0)), x, y, D0);
  });
  r.outline(C(O));
  const BL = P(['#3d4357', '#808aa0', '#d3dae7', '#ffffff']);
  for (let i = 0; i < 9; i++) { r.set(8 + i, 9 - i, BL[2]); r.set(8 + i, 10 - i, BL[1]); }      // blade
  r.set(16, 1, BL[3]); r.set(17, 0, BL[3]);
  for (let i = -2; i <= 2; i++) r.set(8 + i, 9 + i, ST[3]);                                       // crossguard
  r.set(6, 12, C('#4f311f')); r.set(7, 11, C('#6d462c')); r.set(5, 13, ST[2]);                    // hilt (in the target)
  return R2C(r);
}
function iconHelm() {
  const r = new Raster(16, 16), I = P(['#262a38', '#3d4357', '#5b6379', '#808aa0', '#a9b2c6', '#d3dae7', '#f4f7fb']);
  r.ellipse(8, 8, 7, 7, (x, y, u, v) => (v < 0.55 ? ramp(I, clamp(0.62 - u * 0.25 - v * 0.35), x, y, D0) : 0));
  r.rect(1, 9, 14, 5, (x, y) => ramp(I, clamp(0.5 - (x - 8) * 0.03 - (y - 9) * 0.05), x, y, D0));
  r.hline(3, 12, 9, C(O)); r.hline(3, 12, 10, I[0]);                 // eye slit
  r.vline(8, 11, 14, I[1]); r.vline(7, 11, 14, I[4]);               // nose guard
  r.vline(8, 1, 8, I[5]);                                           // ridge
  for (const [x, y] of [[3, 12], [12, 12], [4, 4]]) r.set(x, y, I[6]);
  const d = new Raster(16, 16); d.blit(r, 0, 0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (d.has(x, y) && y > 13) d.d[y * 16 + x] = 0;
  return OL(d);
}
function iconSheet() {                                  // the hero's character sheet with a wax seal
  const r = new Raster(16, 17), PA = P(PARCH);
  r.poly([[2, 1], [13, 1], [14, 15], [3, 16]], (x, y) => ramp(PA, clamp(0.72 - (x - 2) * 0.02 - y * 0.012), x, y, D0));
  r.rect(4, 3, 4, 5, C('#9a7a56')); r.rect(5, 4, 2, 2, C('#e2a483')); r.rect(4, 6, 4, 2, C('#2f5e34'));   // portrait box
  for (const y of [4, 6, 9, 11, 13]) r.hline(y < 8 ? 9 : 5, 12, y, C('#7a5a3c'));
  r.ellipse(12, 14, 2.6, 2.6, (x, y, u, v) => ramp(P(['#5a0f16', '#9e2228', '#e05a4a']), clamp(0.6 - (u + v) * 0.3), x, y, D0));
  return OL(r);
}
function iconSpeed() { const r = new Raster(9, 7); for (let k = 0; k < 2; k++) for (let j = 0; j < 7; j++) for (let i = 0; i <= 3 - Math.abs(j - 3); i++) r.set(k * 4 + i, j, C(i === 0 && j < 3 ? '#fff1b8' : '#f6d888')); return OL(r); }
function iconRat() {                                   // the quota's quarry: a giant rat's head, side-on
  const r = new Raster(11, 8), F = P(['#3a2a30', '#5e4650', '#86707a', '#b29ca2', '#e0d0d0']), PK = P(['#a8505e', '#e88a96']);
  r.ellipse(5, 4.5, 4.6, 3.2, (x, y, u, v) => ramp(F, clamp(0.6 - v * 0.3 - u * 0.1), x, y, D0));
  r.poly([[6, 2], [11, 4.5], [6, 7]], (x, y) => ramp(F, 0.55 - (y - 2) * 0.06, x, y, D0));   // snout
  r.ellipse(2.5, 1.5, 1.8, 1.8, (x, y) => F[2]); r.set(2, 1, PK[0]); r.set(3, 1, PK[1]);      // ear
  r.set(10, 4, PK[1]); r.set(6, 3, C('#1a0a10')); r.set(7, 3, C('#ff5a4a'));                  // nose, beady red eye
  r.set(8, 6, F[4]); r.set(9, 6, F[4]);                                                        // incisors
  return OL(r);
}
function iconSurgeMini() {
  const r = new Raster(9, 9), F = P(['#5a1a08', '#a8361a', '#e8642a', '#ffa64a', '#ffe7a0']);
  for (let i = 0; i < 4; i++) for (let w = 0; w < 2; w++) { r.set(i + w, i + 0.5, F[3]); r.set(i + w, 8 - i, F[2]); r.set(i + w + 4, i + 0.5, F[4]); r.set(i + w + 4, 8 - i, F[3]); }
  r.set(4, 4, F[2]); r.set(8, 4, F[4]);
  return OL(r);
}
function iconAuto() {
  const r = new Raster(9, 9);
  for (let a = 0; a < 36; a++) { if (a % 18 > 13) continue; const an = a / 36 * Math.PI * 2; r.set(Math.round(4 + Math.cos(an) * 3.6), Math.round(4 + Math.sin(an) * 3.6), C('#f6d888')); }
  r.set(8, 3, C('#f6d888')); r.set(7, 2, C('#f6d888')); r.set(0, 5, C('#f6d888')); r.set(1, 6, C('#f6d888'));
  return OL(r);
}
function iconSound(off = false) {
  const r = new Raster(10, 9), c = C('#f6d888');
  r.rect(0, 3, 2, 3, c); for (let j = 0; j < 9; j++) for (let i = 2; i < 5; i++) if (Math.abs(j - 4) <= i - 1) r.set(i, j, c);
  if (off) { for (let k = 0; k < 4; k++) { r.set(6 + k, 2 + k, C('#ef5a4e')); r.set(9 - k, 2 + k, C('#ef5a4e')); } }
  else { r.set(6, 3, c); r.set(6, 4, c); r.set(6, 5, c); r.set(8, 1, c); r.set(9, 2, c); r.set(9, 3, c); r.set(9, 4, c); r.set(9, 5, c); r.set(9, 6, c); r.set(8, 7, c); }
  return OL(r);
}
function iconArrow() {
  const r = new Raster(10, 11), G = P(BRASS);
  r.poly([[0, 3], [5, 3], [5, 0], [10, 5.5], [5, 11], [5, 8], [0, 8]], (x, y) => ramp(G, clamp(0.75 - y * 0.05 - x * 0.02), x, y, D0));
  return OL(r);
}

// The hero's own portrait for the medallion: hood up, three-quarter, facing right (toward the
// fight), lit by the low sun on the right — matches the sprite (green hood, brown fringe, blue eyes).
export function heroPortrait() {
  const N = 30, r = new Raster(N, N);
  const BG = P(['#2a1d4a', '#3b2860', '#563877', '#7a4a88', '#a65e8c', '#d4808a', '#f0a888']);
  const HOOD = P(['#0c1d12', '#14301c', '#1f4628', '#2b5d33', '#3a7640', '#4f904c', '#6aa85c', '#8cc070']);
  const SK = P(['#3e1c16', '#6a3424', '#94523a', '#bd7452', '#dd9a70', '#f2be92', '#ffdcb6']);
  const HAIR = P(['#1e100a', '#341c12', '#52301d', '#70452a', '#8f5d37']);
  const LEA = P(['#24140c', '#3d2414', '#5a361d', '#7a4c28', '#9c6636', '#bc844a']);
  const MAIL = P(['#22242f', '#4f5366', '#7d8296', '#aab0c2', '#d0d5e2']);
  const GOLD = P(['#8a5a1a', '#c4943a', '#f0c860']);
  // dusk sky, brighter toward the sun (right)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) r.set(x, y, ramp(BG, clamp(0.18 + (x / N) * 0.55 + (y / N) * 0.12), x, y, 0.6));
  const F = new Raster(N, N);
  // shoulders: leather pauldron (near, left), mail at the chest, green collar wrap
  F.poly([[0, 30], [0, 24], [5, 21], [11, 21], [16, 23], [24, 23], [30, 26], [30, 30]], (x, y) => ramp(MAIL, clamp(0.45 + (x - 14) * 0.03 + ((x + y) % 2 ? 0.08 : -0.06)), x, y, 0));
  F.ellipse(5.5, 26, 7, 5.5, (x, y, u, v) => ramp(LEA, clamp(0.62 - v * 0.35 + u * 0.12 + (y === 23 ? 0.15 : 0)), x, y, 0));
  for (let x = 0; x < 12; x++) { const y = Math.round(26 + Math.pow((x - 5.5) / 7, 2) * 4.6 - 0.2); if (F.has(x, y)) F.set(x, y, GOLD[1]); }   // pauldron trim
  F.line(13, 30, 21, 23, LEA[2], 2); F.line(14, 30, 22, 23, LEA[4]);                                                          // baldric
  // hood: big rounded cowl, falling to a scarf at the neck
  F.ellipse(13.5, 12.5, 10.5, 11, (x, y, u, v) => ramp(HOOD, clamp(0.5 + u * 0.28 - v * 0.12 + (Math.sin(x * 0.7 - y * 0.5) > 0.82 ? -0.14 : 0)), x, y, 0));
  F.poly([[6, 19], [20, 18], [24, 22], [16, 24], [8, 23]], (x, y) => ramp(HOOD, clamp(0.42 + (x - 14) * 0.03 - (y - 18) * 0.04), x, y, 0));       // scarf
  F.hline(9, 22, 22, HOOD[1]); F.set(15, 21, HOOD[6]); F.set(16, 20, HOOD[6]);
  // face opening (the hood's inside is in deep shadow)
  F.ellipse(17.5, 13, 6.8, 8, (x, y) => HOOD[0]);
  // the face: jaw and cheek lit from the right
  const face = (x, y) => { const u = (x + 0.5 - 18.2) / 5.6, v = (y + 0.5 - 13.6) / 6.6; return u * u + v * v <= 1 || (y >= 13 && y <= 18 && x >= 18 && x <= 23 - Math.max(0, y - 16)); };
  for (let y = 6; y < 22; y++) for (let x = 10; x < 25; x++) if (face(x, y)) {
    const lit = clamp(0.48 + (x - 16) * 0.07 - Math.max(0, 9 - y) * 0.06 - (y > 17 ? 0.08 : 0));
    F.set(x, y, ramp(SK, lit, x, y, 0));
  }
  // nose (profile edge), brow ridge, eyes, mouth, chin, ear
  F.set(24, 13, SK[5]); F.set(24, 14, SK[4]); F.set(23, 15, SK[3]); F.set(22, 16, SK[2]); F.set(23, 12, SK[5]);
  F.hline(18, 21, 10, SK[2]); F.hline(14, 16, 10, SK[1]);                         // brows' shadow
  F.hline(18, 21, 9, HAIR[2]); F.hline(14, 16, 9, HAIR[1]);                       // brows
  F.set(19, 11, C('#1a1020')); F.set(20, 11, C('#3d78c8')); F.set(21, 11, C('#f3efe6'));   // far eye, looking right
  F.set(14, 11, C('#1a1020')); F.set(15, 11, C('#3d78c8')); F.set(16, 11, C('#e8dfd0'));   // near eye
  F.set(19, 12, SK[3]); F.set(15, 12, SK[2]);                                     // lower lids
  F.hline(19, 21, 17, SK[1]); F.set(22, 17, SK[2]); F.set(20, 18, SK[3]);          // mouth
  for (const [x, y] of [[16, 18], [17, 19], [19, 19], [21, 19], [15, 17], [18, 20], [20, 20]]) if (F.has(x, y)) F.set(x, y, mixC(F.get(x, y), C('#3a2418'), 0.35));   // stubble
  F.set(12, 13, SK[2]); F.set(12, 14, SK[3]); F.set(13, 14, SK[1]); F.set(12, 15, SK[1]);   // ear
  // hair: a brown fringe under the hood, sweeping right
  for (let x = 11; x <= 22; x++) { const h = 2 + ((x * 7) % 3 === 0 ? 1 : 0) - (x > 20 ? 1 : 0); for (let k = 0; k < h; k++) F.set(x, 6 + k + (x < 13 ? 2 : 0), HAIR[clamp(2 + (x > 17 ? 1 : 0) - k, 0, 4) | 0]); }
  F.set(22, 8, HAIR[3]); F.set(23, 8, HAIR[2]); F.set(11, 10, HAIR[1]); F.set(11, 11, HAIR[1]); F.set(11, 12, HAIR[0]);
  // hood rim casts a soft shadow on the forehead
  for (let x = 12; x <= 23; x++) if (F.has(x, 5)) F.set(x, 5, HOOD[0]);
  F.outline(C('#0b140c'));
  F.rim(1, 0, (c) => mixC(c, C('#ffd6a0'), 0.4));
  r.blit(F, 0, 0);
  return r.toCanvas();
}

// ============================================================
//  text sprites (UI canvas, 2×)
// ============================================================
const tcache = new Map();
function tx(str, size = 16, color = CREAM, { bold = false, sh = SHADOW, spacing = 0 } = {}) {
  const key = [str, size, color, bold, sh, spacing].join('|');
  if (tcache.has(key)) return tcache.get(key);
  const font = `${bold ? 'bold ' : ''}${size}px "Pixelify Sans"`;
  const s = str.replace(/f(?=[ilft])/g, 'f\u200C');
  const a = crispText(s, font, color, { threshold: 110, spacing });
  let out = a;
  if (sh) {
    const b = crispText(s, font, sh, { threshold: 110, spacing });
    const [c, x] = makeCanvas(a.width + 2, a.height + 2);
    x.drawImage(b, 2, 2); x.drawImage(b, 1, 2); x.drawImage(b, 2, 1); x.drawImage(a, 0, 0);
    out = c;
  }
  // measure the inked width (crispText pads 4px left)
  const d = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  let x1 = 0, y0 = a.height, y1 = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) if (d[(y * a.width + x) * 4 + 3]) { if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  out.inkW = x1 - 4 + 1; out.inkTop = y0; out.inkH = y1 - y0 + 1;
  tcache.set(key, out);
  return out;
}
// draw text so its ink's top-left lands at native (gx, gy); align: 'l' | 'c' | 'r'
function putText(u, img, gx, gy, align = 'l', valign = 't') {
  let X = gx * S - 4;
  if (align === 'c') X = Math.round(gx * S - img.inkW / 2) - 4;
  if (align === 'r') X = gx * S - img.inkW - 4;
  const Y = valign === 'm' ? gy * S - img.inkTop - img.inkH / 2 : gy * S - img.inkTop;
  u.drawImage(img, Math.round(X), Math.round(Y));
}

// ============================================================
//  build: paint every static panel once
// ============================================================
export function buildHUD() {
  Hd.icons = {
    heart: iconHeart(), cp: iconCoin('cp'), pouch: iconPouch(), skull: iconSkull(), lock: iconLock(), rat: iconRat(),
    surgeMini: iconSurgeMini(), wind: iconWind(), potion: iconPotion(),
    train: iconTraining(), helm: iconHelm(), sheet: iconSheet(), speed: iconSpeed(),
    sound: iconSound(false), soundOff: iconSound(true), arrow: iconArrow(),
  };
  Hd.portrait = heroPortrait();
  // text first: some panels size themselves to it
  const t = Hd.text = {};
  t.name = tx('Sellsword', 16, CREAM, { bold: true });
  t.cls = tx('Fighter', 14, MUTED);
  t.soon = tx('Action Surge', 16, INK, { sh: null });
  t.stageLbl = tx('STAGE', 10, '#f6d888', { sh: '#3a0c14', spacing: 1 });
  t.title = tx('Old Skull Meadow', 16, CREAM, { bold: true });
  t.boss = tx('Boss in', 14, '#f2e2bd');
  t.cp = tx('cp', 16, '#e8a878');
  t.auto = tx('Auto', 12, '#b2afbd');
  t.now = tx('Weapon Drills', 16, INK, { sh: null });
  t.train = tx('Train', 12, CREAM);
  t.gear = tx('Gear', 12, CREAM);
  t.hero = tx('Hero', 12, CREAM);
  Hd.plate = buildPlate();
  Hd.sign = buildSign();
  Hd.purse = buildPurse();
  Hd.belt = buildBelt();
  Hd.next = buildNext();
  Hd.route = buildRoute();
  Hd.routeActive = buildRouteActive();
  Hd.soon = buildSoon();
  Hd.now = buildNow('10');
}

// ---------- HERO PLATE  (canvas 172×38, placed at 4,4) ----------
const PLATE = { x: 4, y: 4, w: 172, h: 40 };
const HPX = 45, HPW = 90;
function buildPlate() {
  const [c, x] = makeCanvas(PLATE.w, PLATE.h);
  panel(x, 22, 5, 146, 31, { k: 4, mat: 'leather', seed: 3 });
  stitches(x, 22, 5, 146, 31, 2);
  const well = (X, Y, w, h) => { fill(x, O, X, Y, w, h); fill(x, '#0c0607', X + 1, Y + 1, w - 2, h - 2); fill(x, '#2a1a16', X + 1, Y + h - 2, w - 2, 1); };
  well(HPX - 1, 18, HPW + 2, 8);         // HP
  well(HPX - 1, 28, HPW + 2, 5);         // XP
  // XP track: faint quarter ticks so an empty bar still reads as a bar
  for (let i = 1; i < 4; i++) fill(x, '#1c2a44', HPX + Math.round(i * HPW / 4), 29, 1, 3);
  x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(19, 19, 16, 0, Math.PI * 2); x.fill(); x.restore();
  ring(x, 19, 19, 18, 3);
  // level shield, overlapping the medallion's lower right
  const sx = 27, sy = 24;
  const shield = (i, j) => { if (i < 0 || i > 12 || j < 0 || j > 13) return false; if (j < 8) return true; const half = 6 - (j - 8) * 1.1; return Math.abs(i - 6) <= half; };
  shade(x, sx - 1, sy - 1, 15, 16, (i, j) => {
    const a = shield(i - 1, j - 1); if (!a) return null;
    const e = !shield(i - 2, j - 1) || !shield(i, j - 1) || !shield(i - 1, j - 2) || !shield(i - 1, j);
    if (e) return O;
    const e2 = !shield(i - 3, j - 1) || !shield(i - 1, j - 3);
    if (!shield(i - 3, j - 1) || !shield(i + 1, j - 1) || !shield(i - 1, j - 3) || !shield(i - 1, j + 1)) return e2 ? BRASS[6] : BRASS[3];
    return j < 6 ? '#9e2a36' : '#7b2030';
  });
  return c;
}
function drawPlate(c, u, ox, oy, t, st) {
  const X = PLATE.x + ox, Y = PLATE.y + oy;
  dropShadow(c, Hd.plate, X, Y);
  c.save(); c.beginPath(); c.arc(X + 19, Y + 19, 15, 0, Math.PI * 2); c.clip();
  c.drawImage(Hd.portrait, X + 4, Y + 4); c.restore();
  c.drawImage(Hd.plate, X, Y);
  // HP: lit top, deep base, one notch per hit point, a glint that travels along it.
  // Damage leaves a pale "ghost" that drains away a moment later.
  const hpW = Math.round(HPW * st.hp / st.hpMax), ds = st.s - st.hpAt;
  if (ds >= 0 && ds < 0.75) {
    const lost = Math.min(HPW - hpW, Math.round(HPW * (st.hpLost || 0) / st.hpMax)), ghost = Math.round(lost * (1 - clamp((ds - 0.25) / 0.5)));
    fill(c, ds < 0.12 ? '#ffd8c8' : '#e8a898', X + HPX + hpW, Y + 19, Math.min(lost, ghost), 6);
    fill(c, '#fff0e6', X + HPX + hpW, Y + 19, Math.min(lost, ghost), 1);
  }
  fill(c, '#a8222e', X + HPX, Y + 19, hpW, 6); fill(c, '#d83a3e', X + HPX, Y + 19, hpW, 3); fill(c, '#ff9a7e', X + HPX, Y + 19, hpW, 1);
  fill(c, '#6e1420', X + HPX, Y + 24, hpW, 1);
  for (let i = 1; i < st.hpMax; i++) fill(c, i * HPW / st.hpMax < hpW ? '#7e1824' : '#1a0c0e', X + HPX + Math.round(i * HPW / st.hpMax), Y + 20, 1, 4);
  // the hit: a warm sheen across the red (the fill stays readable) and a bright edge where the chunk broke off
  if (ds >= 0 && ds < 0.12) { fill(c, '#ffb8a8', X + HPX, Y + 19, hpW, 2); fill(c, '#ffffff', X + HPX + hpW - 1, Y + 18, 2, 8); }
  const dh = st.s - (st.healAt ?? -9);                         // healing: a green sheen sweeps the bar
  if (dh >= 0 && dh < 0.45) { const gx = Math.round(hpW * dh / 0.45); fill(c, '#a8f0a0', X + HPX + Math.max(0, gx - 6), Y + 19, Math.min(6, gx), 2); fill(c, '#e8ffe0', X + HPX + hpW - 1, Y + 19, 1, 6); }
  const g = ((t * 0.35) % 1.8) * HPW;
  if (g < hpW - 3) { fill(c, '#ffd8c8', X + HPX + Math.floor(g), Y + 19, 3, 1); fill(c, '#ff8a80', X + HPX + Math.floor(g) + 1, Y + 20, 2, 2); }
  c.drawImage(Hd.icons.heart, X + 37, Y + 16);
  // XP: fills toward Lv 2; each kill's orb lands with a bright tick. A blue mote keeps the track alive.
  const xpW = Math.round(HPW * st.xp / RULES.lvl2XP);
  if (xpW > 0) { fill(c, '#2f68b8', X + HPX, Y + 29, xpW, 3); fill(c, '#7fc0f0', X + HPX, Y + 29, xpW, 1); fill(c, '#1d3f7a', X + HPX, Y + 31, xpW, 1); fill(c, '#d8f0ff', X + HPX + xpW - 1, Y + 29, 1, 3); }
  const dx = st.s - st.xpAt;
  if (dx >= 0 && dx < 0.35) { c.globalAlpha = 1 - dx / 0.35; fill(c, '#ffffff', X + HPX, Y + 29, xpW, 3); fill(c, '#bfe6ff', X + HPX + xpW - 3, Y + 27, 5, 7); c.globalAlpha = 1; }
  const s = (t * 0.45) % 1.5;
  if (s < 1 && s * HPW > xpW + 1) { fill(c, '#7fc0f0', X + HPX + Math.floor(s * HPW), Y + 29, 1, 3); fill(c, '#2c4f86', X + HPX + Math.floor(s * HPW) - 1, Y + 30, 1, 1); }
  putText(u, Hd.text.name, X + 44, Y + 8.5);
  putText(u, Hd.text.cls, X + 44 + Math.ceil(Hd.text.name.inkW / S) + 4, Y + 10);
  num(c, `${st.hp}/${st.hpMax}`, X + 164, Y + 18 - (ds >= 0 && ds < 0.1 ? 1 : 0), ds >= 0 && ds < 0.5 ? ['#ff8a72', '#ffd0c0'] : ['#fbe9c4', '#ffffff'], 'r');
  num(c, String(st.level || 1), X + 33, Y + 26, ['#fff1c8', '#ffffff'], 'c', { outline: '#3a0c14' });
  twinkle(c, X + 7, Y + 7, t, 4.3, 0.2);
}

// a four-point star glint, flashed briefly every `period` seconds
function twinkle(c, X, Y, t, period, phase = 0) {
  const k = ((t / period + phase) % 1) * period;
  if (k > 0.3) return;
  const r = k < 0.1 ? 1 : k < 0.2 ? 2 : 1;
  fill(c, '#fff8dc', X, Y); for (let i = 1; i <= r; i++) { fill(c, i === r ? '#f6d888' : '#fff8dc', X - i, Y); fill(c, i === r ? '#f6d888' : '#fff8dc', X + i, Y); fill(c, i === r ? '#f6d888' : '#fff8dc', X, Y - i); fill(c, i === r ? '#f6d888' : '#fff8dc', X, Y + i); }
}

// ---------- SOON tag: what Level 2 unlocks ----------
function slip(w, h, chipCol) {
  const [c, x] = makeCanvas(w, h + 1);
  panel(x, 0, 0, w, h, { k: 1, mat: 'parch', seed: w });
  fill(x, 'rgba(40,20,8,0.35)', 2, h, w - 3, 1);
  fill(x, O, 0, 0, 14, h); fill(x, chipCol[0], 1, 1, 12, h - 2); fill(x, chipCol[1], 1, 1, 12, 1); fill(x, chipCol[2], 1, h - 2, 12, 1);
  return [c, x];
}
function buildSoon() {
  const tw = Math.ceil(Hd.text.soon.inkW / S);
  const w = 14 + 4 + tw + 5 + 12, h = 14;
  const [c, x] = slip(w, h, ['#3a1c14', '#5a2e1c', '#24100a']);
  x.drawImage(Hd.icons.surgeMini, 1, 2);
  // "unlocks at Lv 2" — a little crimson level shield, same as the plate's
  const bx = w - 13;
  fill(x, O, bx, 1, 11, 12); fill(x, '#9e2a36', bx + 1, 2, 9, 6); fill(x, '#7b2030', bx + 1, 8, 9, 3); fill(x, O, bx, 12, 1, 1); fill(x, O, bx + 10, 12, 1, 1);
  fill(x, 'rgba(0,0,0,0)', bx, 12, 1, 1);
  fill(x, BRASS[5], bx + 1, 2, 9, 1);
  num(x, '2', bx + 5.5, 4, ['#fff1c8', '#ffffff'], 'c', { outline: '#3a0c14', shadow: false });
  c.tw = tw; return c;
}

// ---------- STAGE SIGN ----------
const SIGN = { x: 228, y: 0, w: 184, h: 34 };
const SEG0 = 40, SEGW = 9;
function buildSign() {
  const [c, x] = makeCanvas(SIGN.w, SIGN.h);
  for (const rx of [30, 154]) for (let y = 0; y < 6; y++) { fill(x, O, rx - 1, y, 4, 1); fill(x, (y % 2) ? '#c9a46a' : '#8a6a3e', rx, y, 2, 1); fill(x, (y % 2) ? '#8a6a3e' : '#c9a46a', rx + (y % 2), y, 1, 1); }
  panel(x, 10, 4, 172, 28, { k: 2, mat: 'wood', seed: 11 });
  for (let i = 12; i < 180; i++) fill(x, i % 9 === 0 ? WOOD[0] : WOOD[1], i, 17);
  for (let i = 12; i < 180; i++) fill(x, WOOD[4], i, 18);
  for (const [nx, ny] of [[176, 7], [176, 27]]) { fill(x, IRON[1], nx, ny, 2, 2); fill(x, IRON[5], nx, ny); }
  for (const rx of [30, 154]) { fill(x, O, rx - 2, 4, 6, 4); fill(x, '#b08a54', rx - 1, 5, 4, 2); fill(x, '#e0c08a', rx - 1, 5, 2, 1); }
  // stage medallion overlapping the left end
  ring(x, 14, 17, 15, 3, IRON.concat(['#d8d4e0']));
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const d = Math.hypot(i, j); if (d < 11.5) fill(x, d > 10 ? '#5a1520' : (j < -3 ? '#a42c38' : '#7b2030'), 14 + i, 17 + j); }
  // quota track: ten sunken pockets
  fill(x, O, SEG0 - 2, 20, SEGW * 10 + 3, 9);
  for (let i = 0; i < 10; i++) { fill(x, '#0c0607', SEG0 + i * SEGW, 21, SEGW - 1, 7); fill(x, '#24140e', SEG0 + i * SEGW, 27, SEGW - 1, 1); }
  x.drawImage(Hd.icons.rat, SEG0 + SEGW * 10 + 3, 19);
  return c;
}
function drawSign(c, u, ox, oy, t, st) {
  const quota = st.quota, dq = st.s - st.quotaAt;
  const X = SIGN.x + ox, Y = SIGN.y + oy;
  dropShadow(c, Hd.sign, X, Y);
  c.drawImage(Hd.sign, X, Y);
  for (let i = 0; i < quota; i++) { const sx = X + SEG0 + i * SEGW; fill(c, '#d8782a', sx, Y + 21, SEGW - 1, 7); fill(c, '#ffc45a', sx, Y + 21, SEGW - 1, 2); fill(c, '#a04a1a', sx, Y + 27, SEGW - 1, 1); }
  // the next empty pocket breathes: "fill me"
  if (quota < 10) { const a = 0.10 + 0.10 * (0.5 + 0.5 * Math.sin(t * 4)); c.fillStyle = `rgba(255,196,90,${a.toFixed(3)})`; c.fillRect(X + SEG0 + quota * SEGW, Y + 21, SEGW - 1, 7); }
  putText(u, Hd.text.stageLbl, X + 14, Y + 7, 'c');
  num(c, String(st.stage || 1), X + 14, Y + 13, ['#fff1c8', '#ffffff', '#f6d0a0'], 'c', { outline: '#3a0c14', scale: 2 });
  putText(u, Hd.text.title, X + 96, Y + 11, 'c', 'm');
  if (dq >= 0 && dq < 0.4 && quota > 0) {       // the pocket just filled flares white, then settles to amber
    const sx = X + SEG0 + (quota - 1) * SEGW; c.globalAlpha = 1 - dq / 0.4; fill(c, '#fff6d8', sx - 1, Y + 20, SEGW + 1, 9); c.globalAlpha = 1;
  }
  num(c, `${quota}/10`, X + 178, Y + 21 - (dq >= 0 && dq < 0.1 ? 1 : 0), dq >= 0 && dq < 0.4 ? ['#ffd877', '#ffffff'] : ['#fbe9c4', '#ffffff'], 'r');
  twinkle(c, X + 5, Y + 7, t, 5.1, 0.55);
}

// ---------- ROUTE to the boss (under the sign) ----------
const ROUTE = { x: 268, y: 35, w: 120, h: 14 };
const routeNodes = () => {
  const cadence = RULES.bossCadence || 5;
  return Array.from({ length: cadence }, (_, i) => 6 + i * 14);
};
function buildRouteActive() {
  const [c, x] = makeCanvas(13, 13);
  ring(x, 6, 6, 5, 1.5);
  fill(x, '#c8303a', 5, 5, 2, 2); fill(x, '#ff8a72', 5, 5, 1, 1);
  return c;
}
function buildRoute() {
  const nodes = routeNodes(), last = nodes.length - 1;
  const w = Math.max(ROUTE.w, nodes[last] + 58);
  const [c, x] = makeCanvas(w, ROUTE.h);
  for (let i = 0; i < last; i++) for (let px = nodes[i] + 4; px < nodes[i + 1] - 3; px += 2) { fill(x, O, px, 6, 1, 3); fill(x, '#e9d3a6', px, 7, 1, 1); }
  for (const n of nodes.slice(0, last)) { fill(x, O, n - 2, 5, 5, 5); fill(x, '#a99a86', n - 1, 6, 3, 3); fill(x, '#e9dcc4', n - 1, 6, 1, 1); }
  const bx = nodes[last] - 7;
  fill(x, O, bx, 0, 14, 14); fill(x, '#3a1a2a', bx + 1, 1, 12, 12); fill(x, '#5a2a40', bx + 1, 1, 12, 1);
  x.drawImage(Hd.icons.skull, bx + 1, 2);
  return c;
}
function drawRoute(c, u, ox, oy, t, st) {
  const nodes = routeNodes(), cadence = nodes.length;
  const stage = st ? (st.stage || 1) : 1;
  const pos = (stage - 1) % cadence, bossIn = cadence - 1 - pos;
  const X = ROUTE.x + ox, Y = ROUTE.y + oy;
  dropShadow(c, Hd.route, X, Y);
  c.drawImage(Hd.route, X, Y);
  for (let i = 0; i < pos && i < cadence - 1; i++) {
    const nx = nodes[i];
    fill(c, O, X + nx - 2, Y + 5, 5, 5); fill(c, '#d89b38', X + nx - 1, Y + 6, 3, 3); fill(c, '#fff1b8', X + nx - 1, Y + 6, 1, 1);
  }
  if (pos < cadence - 1) {
    const ax = nodes[pos];
    c.drawImage(Hd.routeActive, X + ax - 6, Y + 1);
    if ((t % 2.4) < 0.25) { fill(c, '#fff1b8', X + ax - 3, Y + 3, 2, 1); fill(c, '#fff1b8', X + ax - 4, Y + 4, 1, 2); }
  } else {
    const bx = X + nodes[cadence - 1] - 7;
    fill(c, '#c8303a', bx, Y, 14, 1); fill(c, '#c8303a', bx, Y + 13, 14, 1);
    fill(c, '#c8303a', bx, Y, 1, 14); fill(c, '#c8303a', bx + 13, Y, 1, 14);
  }
  const tx = X + nodes[cadence - 1] + 11;
  if (u) {
    if (bossIn > 0) {
      putText(u, Hd.text.boss, tx, Y + 4);
      num(c, String(bossIn), tx + 2 + Math.ceil(Hd.text.boss.inkW / S) + 3, Y + 4, ['#fbe9c4', '#ffffff']);
    } else {
      num(c, 'BOSS!', tx + 1, Y + 4, ['#ff8a72', '#ffe9a0']);
    }
  }
}

// ---------- PURSE + toggles (top-right) ----------
const PURSE = { x: 548, y: 4, w: 88, h: 40 };
function buildPurse() {
  const [c, x] = makeCanvas(PURSE.w, PURSE.h);
  panel(x, 34, 2, 54, 18, { k: 3, mat: 'leather', seed: 5 });
  stitches(x, 34, 2, 54, 18, 2);
  x.drawImage(Hd.icons.pouch, 22, 1);
  x.drawImage(Hd.icons.cp, 43, 6);
  // toggles: speed (on: oak), auto (off: iron), sound
  panel(x, 14, 22, 24, 15, { k: 1, mat: 'wood', seed: 14 });
  panel(x, 40, 22, 26, 15, { k: 1, mat: 'iron', seed: 40 });
  panel(x, 68, 22, 20, 15, { k: 1, mat: 'wood', seed: 68 });
  x.drawImage(Hd.icons.speed, 16, 25);
  fill(x, O, 43, 27, 4, 4); fill(x, '#1f3a26', 44, 28, 2, 2);          // auto's lamp: unlit
  return c;
}
function drawPurse(c, u, ox, oy, t, st) {
  const dc = st.s - st.cpAt;
  const X = PURSE.x + ox, Y = PURSE.y + oy;
  dropShadow(c, Hd.purse, X, Y);
  c.drawImage(Hd.purse, X, Y);
  c.drawImage(muted ? Hd.icons.soundOff : Hd.icons.sound, X + 72, Y + 25);
  if ((t % 3.1) < 0.18) { fill(c, '#fff4e0', X + 46, Y + 8); fill(c, '#fff4e0', X + 45, Y + 9); fill(c, '#fff4e0', X + 47, Y + 7); }
  if (dc >= 0 && dc < 0.2) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - dc / 0.2; c.drawImage(Hd.icons.cp, X + 43, Y + 6); c.restore(); }
  const w = num(c, String(st.cp), X + 54, Y + 7 - (dc >= 0 && dc < 0.09 ? 1 : 0), dc >= 0 && dc < 0.3 ? ['#ffffff', '#ffffff', '#ffd49a'] : ['#ffe7b0', '#ffffff']);
  putText(u, Hd.text.cp, X + 54 + w + 3, Y + 9);
  num(c, '1×', X + 34, Y + 26, ['#fbe9c4', '#ffffff'], 'r');
  putText(u, Hd.text.auto, X + 49, Y + 26.5);
}

// ---------- NEXT STAGE bookmark on the right edge ----------
const NEXT = { x: 614, y: 146, w: 28, h: 52 };
function buildNext() {
  const [c, x] = makeCanvas(NEXT.w, NEXT.h);
  panel(x, 0, 4, 32, 40, { k: 3, mat: 'wood', seed: 21 });
  const a = Hd.icons.arrow; x.globalAlpha = 0.5; x.drawImage(a, 8, 11); x.globalAlpha = 1;
  for (let i = 0; i < 26; i += 3) { fill(x, O, 1 + i, 27, 3, 3); fill(x, IRON[4], 2 + i, 28, 1, 1); }
  return c;
}
function drawNext(c, u, ox, oy, t) {
  const X = NEXT.x + ox, Y = NEXT.y + oy;
  dropShadow(c, Hd.next, X - 2, Y);
  c.drawImage(Hd.next, X, Y);
  const sw = Math.round(Math.sin(t * 1.6) * 0.8);
  c.drawImage(Hd.icons.lock, X + 9 + sw, Y + 29);
}

// ---------- ACTION BELT (bottom-right) ----------
const BELT = { x: 484, y: 314, w: 154, h: 46 };
const SOCKETS = [16, 42], TILES = [68, 96, 124], SY = 30;
function buildBelt() {
  const [c, x] = makeCanvas(BELT.w, BELT.h);
  panel(x, 0, 13, 154, 33, { k: 4, mat: 'leather', seed: 9 });
  stitches(x, 0, 13, 154, 33, 2);
  fill(x, O, 0, 18, 6, 22); fill(x, BRASS[3], 1, 19, 4, 20); fill(x, BRASS[6], 1, 19, 4, 1); fill(x, BRASS[1], 1, 38, 4, 1);
  for (const sx of SOCKETS) {
    ring(x, sx, SY, 12, 2);
    for (let j = -10; j <= 10; j++) for (let i = -10; i <= 10; i++) { const d = Math.hypot(i, j); if (d < 9.6) fill(x, d > 8.4 ? IRON[0] : (j < -2 ? IRON[3] : IRON[2]), sx + i, SY + j); }
  }
  // [1] Second Wind — ready;  [2] Potion — none yet
  x.drawImage(Hd.icons.wind, SOCKETS[0] - 8, SY - 8);
  x.drawImage(Hd.icons.potion, SOCKETS[1] - 7, SY - 8);
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) if (Math.hypot(i, j) < 9.4) { x.fillStyle = 'rgba(14,10,18,0.3)'; x.fillRect(SOCKETS[1] + i, SY + j, 1, 1); }
  // potion count badge
  fill(x, O, SOCKETS[1] + 4, SY + 3, 9, 11); fill(x, IRON[2], SOCKETS[1] + 5, SY + 4, 7, 9); fill(x, IRON[4], SOCKETS[1] + 5, SY + 4, 7, 1);
  num(x, '0', SOCKETS[1] + 8.5, SY + 5, ['#b2afbd', '#d8d4e0'], 'c', { outline: null });
  ['1', '2'].forEach((k, i) => keycap(x, SOCKETS[i] - 13, 36, k));
  fill(x, O, 56, 15, 5, 29); fill(x, BRASS[3], 57, 16, 3, 27); fill(x, BRASS[5], 57, 16, 1, 27);
  rivet(x, 57, 19); rivet(x, 57, 38);
  TILES.forEach((tx0, i) => {
    panel(x, tx0, 15, 26, 29, { k: 2, mat: 'wood', seed: 30 + i });
    fill(x, 'rgba(20,10,8,0.5)', tx0 + 2, 34, 22, 8);
    const ic = [Hd.icons.train, Hd.icons.helm, Hd.icons.sheet][i];
    x.drawImage(ic, tx0 + 13 - Math.floor(ic.width / 2), 16 + Math.floor((18 - ic.height) / 2));
    keycap(x, tx0 - 2, 13, ['T', 'G', 'H'][i]);
  });
  return c;
}
function drawBelt(c, u, ox, oy, t) {
  const X = BELT.x + ox;
  // Beat 6: until the yard is opened the belt gives a little hop and the Train tile pulses gold
  const cyc = t % 1.2, hop = trainPulse && cyc < 0.3 ? -Math.round(Math.sin(cyc / 0.3 * Math.PI) * 3) : 0;
  const Y = BELT.y + oy + hop;
  dropShadow(c, Hd.belt, X - 1, BELT.y + oy - 3);
  c.drawImage(Hd.belt, X, Y);
  if (trainPulse) {
    const k = 0.5 + 0.5 * Math.sin(t * 4.6);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.30 + 0.45 * k;
    const gx = X + TILES[0], gy = Y + 15;
    fill(c, '#ffd25a', gx - 1, gy - 1, 28, 1); fill(c, '#ffd25a', gx - 1, gy + 29, 28, 1);
    fill(c, '#ffd25a', gx - 1, gy - 1, 1, 31); fill(c, '#ffd25a', gx + 26, gy - 1, 1, 31);
    c.globalAlpha = 0.14 + 0.20 * k;
    fill(c, '#ffdf7a', gx - 2, gy - 2, 30, 1); fill(c, '#ffdf7a', gx - 2, gy + 30, 30, 1);
    fill(c, '#ffdf7a', gx - 2, gy - 2, 1, 33); fill(c, '#ffdf7a', gx + 27, gy - 2, 1, 33);
    c.restore();
    twinkle(c, gx + 2, gy + 2, t, 2.1, 0.2);
    twinkle(c, gx + 24, gy + 26, t, 1.7, 0.7);
  }
  if (gearPulse) {                                     // Beat 8: the Gear tile pulses until the tin is worn
    const k = 0.5 + 0.5 * Math.sin(t * 4.6);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.30 + 0.45 * k;
    const gx = X + TILES[1], gy = Y + 15;
    fill(c, '#ffd25a', gx - 1, gy - 1, 28, 1); fill(c, '#ffd25a', gx - 1, gy + 29, 28, 1);
    fill(c, '#ffd25a', gx - 1, gy - 1, 1, 31); fill(c, '#ffd25a', gx + 26, gy - 1, 1, 31);
    c.globalAlpha = 0.14 + 0.20 * k;
    fill(c, '#ffdf7a', gx - 2, gy - 2, 30, 1); fill(c, '#ffdf7a', gx - 2, gy + 30, 30, 1);
    fill(c, '#ffdf7a', gx - 2, gy - 2, 1, 33); fill(c, '#ffdf7a', gx + 27, gy - 2, 1, 33);
    c.restore();
    twinkle(c, gx + 2, gy + 2, t, 2.1, 0.5);
    twinkle(c, gx + 24, gy + 26, t, 1.7, 1.0);
  }
  if (windLocked) {
    for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) if (Math.hypot(i, j) < 9.6) fill(c, 'rgba(30,28,38,0.66)', X + SOCKETS[0] + i, Y + SY + j);
    c.drawImage(Hd.icons.lock, X + SOCKETS[0] - 4, Y + SY - 5);
  } else {
    // Second Wind is ready: its bezel breathes green-gold
    const a = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3.2));
    c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter';
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const d = Math.hypot(i, j); if (d > 9.6 && d < 11.6) fill(c, d > 10.6 ? '#3a6a20' : '#5aa040', X + SOCKETS[0] + i, Y + SY + j); }
    c.restore();
    twinkle(c, X + SOCKETS[0] - 7, Y + SY - 7, t, 2.7, 0.3);
  }
  ['train', 'gear', 'hero'].forEach((k, i) => putText(u, Hd.text[k], X + TILES[i] + 13, Y + 35.5, 'c'));
  // the locked tiles: greyed out, chained, a little padlock where the keycap sits
  TILES.forEach((tx0, i) => {
    if (!tileLock[['train', 'gear', 'hero'][i]]) return;
    const gx = X + tx0, gy = Y + 15;
    fill(c, 'rgba(30,28,38,0.66)', gx + 1, gy + 1, 24, 27);
    for (const dir of [1, -1]) for (let q = 0; q <= 5; q++) {
      const f = q / 5, lx = gx + 4 + f * 18, ly = gy + (dir > 0 ? 3 + f * 23 : 26 - f * 23);
      if (q % 2 === 0) { fill(c, '#22222a', lx - 2, ly - 1, 5, 2); fill(c, '#65616f', lx - 1, ly, 3, 1); }
      else { fill(c, '#22222a', lx - 1, ly - 2, 2, 5); fill(c, '#65616f', lx, ly - 1, 1, 3); }
    }
    c.drawImage(Hd.icons.lock, gx + 9, gy + 8);
  });
  // loot arrival flash + unread loot count pip on the Gear tile
  const gf = performance.now() / 1000 - gearFlashAt;
  if (gf >= 0 && gf < 0.45) {
    const gx = X + TILES[1], gy = Y + 15, q = 1 - gf / 0.45;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7 * q;
    fill(c, '#ffe7a0', gx + 1, gy + 1, 24, 27);
    c.restore();
  }
  if (gearBadge > 0) {
    const bx = X + TILES[1] + 19, by = Y + 12;
    fill(c, O, bx, by, 9, 9);
    fill(c, '#b82824', bx + 1, by + 1, 7, 7);
    fill(c, '#ef5a4e', bx + 1, by + 1, 7, 1);
    num(c, gearBadge > 9 ? '9+' : String(gearBadge), bx + 4.5, by + 1.5, ['#fff8dc', '#ffffff'], 'c', { outline: null, shadow: false });
  }
}

// ---------- NOW tag: the next thing worth buying ----------
function buildNow(costStr = '10') {
  const tw = Math.ceil(Hd.text.now.inkW / S);
  const w = 14 + 4 + tw + 6 + 9 + numWidth(costStr) + 4, h = 14;
  const [c, x] = slip(w, h, ['#5a3414', '#7e4c20', '#3a200c']);
  fill(x, '#5a3414', 1, 1, 12, h - 2); fill(x, '#7e4c20', 1, 1, 12, 1); fill(x, '#3a200c', 1, h - 2, 12, 1);
  // a tiny crossed-swords mark for "Training"
  const sw = [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [10, 2], [9, 3], [8, 4], [7, 5], [5, 7], [4, 8]];
  for (const [i, j] of sw) fill(x, '#e3e6ee', i + 1, j + 1);
  fill(x, '#e5b84d', 3, 9, 2, 1); fill(x, '#e5b84d', 9, 9, 2, 1); fill(x, '#6d462c', 2, 10, 1, 2); fill(x, '#6d462c', 11, 10, 1, 2);
  const cx = 14 + 4 + tw + 5;
  x.drawImage(Hd.icons.cp, cx - 1, 2);
  num(x, costStr, cx + 9, 3, ['#4a2412', '#7a3f22'], 'l', { outline: null });
  c.tw = tw; return c;
}

// ============================================================
//  per-frame
// ============================================================
function arrive(t, at, dur = 0.45) { return easeOutBack(clamp(inv(at, at + dur, t))); }
// soft contact shadow under a panel so it lifts off the busy scene
const shadows = new Map();
function dropShadow(c, img, X, Y) {
  let sh = shadows.get(img);
  if (!sh) { const [s2, x] = makeCanvas(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(16,6,14,0.42)'; x.fillRect(0, 0, img.width, img.height); sh = s2; shadows.set(img, sh); }
  c.drawImage(sh, X + 1, Y + 2);
}
// a white-hot flash when a panel lands, like a hit
function landFlash(c, img, X, Y, t, at, dur) {
  const land = at + dur * 0.55, k = (t - land) / 0.16;
  if (k < 0 || k > 1) return;
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 * (1 - k); c.drawImage(img, X, Y); c.restore();
}

// ---------- in-world gauge under the hero: HP + the 6-second round ----------
function drawHeroGauge(c, t, at, st) {
  if (t < at) return;
  const a = heroAnchor(easeInOut(inv(T.pan[0], T.pan[1], t)), t); if (!a) return;
  const k = easeOutBack(clamp(inv(at, at + 0.35, t)));
  const w = Math.max(2, Math.round(24 * k)), X = a.x - Math.floor(w / 2) - 1, Y = a.y + 5;
  const hw = Math.round(w * st.hp / st.hpMax), ds = st.s - st.hpAt;
  fill(c, O, X, Y, w + 2, 5);
  fill(c, '#3a1418', X + 1, Y + 1, w, 2);
  if (ds >= 0 && ds < 0.6) fill(c, '#f0b0a0', X + 1 + hw, Y + 1, Math.min(w - hw, Math.round(w * (st.hpLost || 0) / st.hpMax * (1 - clamp((ds - 0.2) / 0.4)))), 2);
  fill(c, '#d83a3e', X + 1, Y + 1, hw, 2); fill(c, ds >= 0 && ds < 0.12 ? '#ffd0c0' : '#ff9a7e', X + 1, Y + 1, hw, 1);
  if (ds >= 0 && ds < 0.12) fill(c, '#ffffff', X + hw, Y, 1, 4);
  fill(c, '#0c0607', X + 1, Y + 3, w, 1);
  // round pips: the 2.4 s round fills left to right; all six flash when the swing goes off
  if (k > 0.9) {
    const lit = st.combat ? Math.floor(st.round * 6 + 1e-6) : 0, dsw = st.s - st.swingAt, flash = dsw >= 0 && dsw < 0.14;
    for (let i = 0; i < 6; i++) fill(c, flash ? '#fff6d8' : i < lit ? (i === 5 ? '#ffe9a0' : '#e2a83a') : '#4a3a2e', X + 1 + i * 4, Y + 3, 3, 1);
  }
}

export function drawGameHUD(c, u, t) {
  if (t < HUD_TIMES.plate) return;
  const D = { plate: 0.45, sign: 0.5, purse: 0.45, belt: 0.45, next: 0.4 };
  const kp = arrive(t, HUD_TIMES.plate, D.plate), ks = arrive(t, HUD_TIMES.sign, D.sign), kpu = arrive(t, HUD_TIMES.purse, D.purse);
  const kb = arrive(t, HUD_TIMES.belt, D.belt), kn = arrive(t, HUD_TIMES.next, D.next);

  const px = Math.round((1 - kp) * -190), sy = Math.round((1 - ks) * -46), pux = Math.round((1 - kpu) * 100), by = Math.round((1 - kb) * 56), nx = Math.round((1 - kn) * 40);
  const st = hudState(t);
  drawPlate(c, u, px, 0, t, st);       landFlash(c, Hd.plate, PLATE.x + px, PLATE.y, t, HUD_TIMES.plate, D.plate);
  drawSign(c, u, 0, sy, t, st);        landFlash(c, Hd.sign, SIGN.x, SIGN.y + sy, t, HUD_TIMES.sign, D.sign);
  drawPurse(c, u, pux, 0, t, st);      landFlash(c, Hd.purse, PURSE.x + pux, PURSE.y, t, HUD_TIMES.purse, D.purse);
  if ((st.level || 1) < 2) drawNext(c, u, nx, 0, t);           // Beat 9: once level 2 lands, the "next" preview has served its turn
  drawHeroGauge(c, t, HUD_TIMES.next, st);
  drawBelt(c, u, 0, by, t);        landFlash(c, Hd.belt, BELT.x, BELT.y + by, t, HUD_TIMES.belt, D.belt);

  // goals pop in last, each with a little drop + settle
  const tag = (img, X, Y, at, text) => {
    if (t < at) return false;
    const k = arrive(t, at, 0.3), yy = Math.round((1 - k) * -6);
    c.globalAlpha = clamp(k * 1.5); dropShadow(c, img, X, Y + yy); c.drawImage(img, X, Y + yy); c.globalAlpha = 1;
    if (k > 0.6) putText(u, text, X + 18, Y + yy + 7, 'l', 'm');
    return true;
  };
  if ((st.level || 1) < 2) tag(Hd.soon, PLATE.x + 44, PLATE.y + 38, HUD_TIMES.soon, Hd.text.soon);
  if (t >= HUD_TIMES.route) {
    const k = clamp(inv(HUD_TIMES.route, HUD_TIMES.route + 0.3, t));
    c.globalAlpha = k; drawRoute(c, k > 0.5 ? u : null, 0, Math.round((1 - easeOut(k)) * -5), t, st); c.globalAlpha = 1;
  }
  const bob = t > HUD_TIMES.now + 0.4 ? Math.round(Math.sin(t * 2.6) * 0.75) : 0;
  const hopN = trainPulse && (t % 1.2) < 0.3 ? -Math.round(Math.sin((t % 1.2) / 0.3 * Math.PI) * 3) : 0;
  const nowX = BELT.x + BELT.w - Hd.now.width + 1, nowY = BELT.y - 6 + bob + hopN;
  if (!trainOpen && tag(Hd.now, nowX, nowY, HUD_TIMES.now, Hd.text.now) && t >= HUD_TIMES.now + 0.3) {
    const X = BELT.x + TILES[0] + 13, Y = nowY + 14;     // pointer down to the Train tile
    fill(c, O, X - 3, Y, 7, 1); fill(c, O, X - 2, Y + 1, 5, 1); fill(c, O, X - 1, Y + 2, 3, 1);
    fill(c, PARCH[3], X - 2, Y, 5, 1); fill(c, PARCH[3], X - 1, Y + 1, 3, 1); fill(c, PARCH[3], X, Y + 2, 1, 1);
  }
}
