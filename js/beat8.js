// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 8 — the first equip (the Gear screen)
//
//  Snikkit is looted and the purse is heavy. Elminster, amused:
//  "A helmet. Of sorts. Wear it. Gear changes thee, outside and
//  in." The Gear tab pulses gold under a spotlight until the
//  player opens it (click or G).
//
//  The GEAR screen fills most of the stage; the meadow waits,
//  dimmed, behind it — the same cut as the Training Yard. Left:
//  the SELLSWORD himself on a little dais, ringed by the ten
//  paper-doll slots — helm, armour, cloak, weapon, shield,
//  boots, two rings, amulet, trinket — worn pieces shown in
//  gold, empty slots a dim silhouette of what could go there.
//  Right: the SATCHEL, a paged list of every treasure, three
//  cards to a page, each with a green-arrowed EQUIP plate. A
//  worn piece's plate reads WORN and takes it off again.
//
//  Equip the tin and the world changes: the hero's sprite wears
//  it, his HP bar reads 13/13, "+1 MAX HP" floats off the card,
//  and the screen takes its bow. Elminster's portrait shifts to
//  pipe-puff and lets out a single snort: "…It suits thee,
//  sellsword. Gods help thee."
// ─────────────────────────────────────────────────────────────
import { W, H, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat7 from './beat7.js';
import { setGearPulse, setTileLocked } from './hud.js';
import * as act from './actors.js';
import * as ui from './ui.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { makeCanvas, crispText, clamp, easeOut, easeOutBack, hash } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const TILE = { x: 580, y: 329, w: 26, h: 29 };       // the belt's Gear tile (hud.js BELT + TILES[1])
const inTile = (gx, gy) => gx >= TILE.x && gx < TILE.x + TILE.w && gy >= TILE.y && gy < TILE.y + TILE.h;
const PANW = 380, PANH = 280, PANX = 130, PANY = 34; // the Gear screen itself
const DOLLY = { x: 12, y: 44, w: 152, h: 172 };      // the paper-doll panel
const DOLLFEET = 156;                                // doll-panel-relative y of the hero's feet
const SLOTW = 24;                                    // one equipment slot chip
const SLOTS = [                                      // doll-panel-relative: [slot, x, y]
  ['helm', 64, 4], ['amulet', 100, 4],
  ['armor', 4, 34], ['cloak', 124, 34],
  ['weapon', 4, 64], ['shield', 124, 64],
  ['boots', 4, 94], ['trinket', 124, 94],
  ['ring1', 4, 124], ['ring2', 124, 124]];
const SATX = 172, SATW = 196;                        // the satchel column
const ROWH = 44, ROWGAP = 5, ROWY0 = 58, ROWS = 3;   // satchel rows per page
const PAGER = { y: 206, h: 20, w: 26 };              // the satchel's page plates
const NOTEY = 232;                                   // the selected item's flavour line
const DONER = { x: 306, y: 252, w: 60, h: 26 };      // panel-relative
const EQUIPR = { x: 140, y: 14, w: 48, h: 16 };      // the row's equip plate, row-relative

let D = null, A = null, SPOT8 = null;

// ---------- text on the 2× UI canvas (same conventions as beat6/hud) ----------
function t2(str, font, col, opts = {}) {
  const c = crispText(str, font, col, { threshold: 105, ...opts });
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x1 = 0, y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  c.inkW = Math.max(1, x1 - 4 + 1); c.inkTop = y0 === c.height ? 0 : y0;
  return c;
}
const put = (u, img, gx, gy, align = 'l') => {
  let X = gx * S - 4;
  if (align === 'c') X = Math.round(gx * S - img.inkW / 2) - 4;
  else if (align === 'r') X = Math.round(gx * S - img.inkW) - 4;
  u.drawImage(img, Math.round(X), Math.round(gy * S - img.inkTop));
};

// ---------- little pixel icons for the spoils ----------
const TINPAL = ['#2a2e3c', '#484e62', '#6e7488', '#969cb2', '#bcc2d4', '#e2e8f4'];
const BERRY = ['#1c1434', '#342458', '#4e3a7e', '#6a52a4', '#8a6ec2'];
const CRUST = ['#4a2810', '#7a4c22', '#a8703a', '#cf9a58', '#ecc080'];
function paintSpoil(kind) {
  const [c, x] = makeCanvas(22, 18);
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const ell = (cx, cy, rx, ry, fn) => {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const u = (i - cx) / rx, v = (j - cy) / ry;
      if (u * u + v * v <= 1) { const col = fn(u, v, i, j); if (col) fill(col, i, j); }
    }
  };
  if (kind === 'tin') {
    ell(11, 8, 8.4, 4.6, (u, v) => TINPAL[Math.max(0, Math.min(5, Math.round(2.8 - v * 2.2 - u * 0.4 + (hash(i0(u, v), 3) - 0.5))))]);
    ell(11, 12.4, 10.4, 2.6, (u, v) => TINPAL[Math.max(0, Math.min(5, Math.round(2.2 - v * 1.8)))]);
    for (let i = -9; i <= 9; i += 3) fill(TINPAL[1], 11 + i, 11);
    fill(TINPAL[5], 7, 5); fill(TINPAL[4], 8, 4);
    fill(BERRY[1], 15, 7); fill(BERRY[0], 16, 8);
  } else {
    ell(11, 12.6, 9.6, 2.6, (u, v) => TINPAL[Math.max(0, Math.min(5, Math.round(2.2 - v * 1.8)))]);
    ell(11, 9.4, 8.6, 4.6, (u, v, i, j) => BERRY[Math.max(0, Math.min(4, Math.round(2.4 - v * 2 + (hash(i * 7 + j * 13, 5) > 0.8 ? 1 : 0))))]);
    for (let i = -6; i <= 6; i += 4) { fill(CRUST[3], 11 + i, 6); fill(CRUST[3], 11 + i + 1, 7); fill(CRUST[2], 11 + i + 2, 8); }
    ell(15, 7, 2.6, 1.8, () => '#f4efe2');                  // the missing slice… someone started early
  }
  return c;
}
const i0 = (u, v) => Math.round(u * 10) * 31 + Math.round(v * 10) * 7;

// ---------- a 16×16 glyph per slot: dim silhouette when empty, worn gear when lit ----------
function paintGlyph(slot, lit) {
  const [c, x] = makeCanvas(16, 16);
  const F = lit
    ? ['#3a2a18', '#7a5418', '#c4943a', '#e2b75a', '#fff1b8']    // worn: brass and gold
    : ['#241812', '#4a3524', '#5d4530', '#6e543a', '#806848'];   // empty: a brown shadow of the idea
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const px = (pts, k) => { for (const [X, Y] of pts) fill(F[k], X, Y); };
  switch (slot) {
    case 'helm':
      for (let j = 0; j < 6; j++) { const w = [5, 7, 8, 9, 9, 9][j]; fill(F[2], 8 - (w >> 1), 3 + j, w); }
      fill(F[3], 5, 4, 3, 1); fill(F[1], 3, 9, 10, 2); fill(F[3], 3, 9, 10, 1); fill(F[4], 6, 4, 1, 1);
      break;
    case 'armor':
      fill(F[2], 4, 3, 8, 9); fill(F[2], 3, 4, 10, 3); fill(F[3], 4, 3, 8, 1); fill(F[1], 4, 11, 8, 1);
      fill(F[1], 7, 5, 2, 6); fill(F[3], 5, 5, 1, 5); fill(F[3], 10, 5, 1, 5); fill(F[4], 5, 3, 2, 1);
      break;
    case 'cloak':
      for (let j = 0; j < 10; j++) { const w = 3 + j; fill(F[2], 8 - (w >> 1), 4 + j, w); }
      fill(F[3], 7, 3, 2, 1); fill(F[1], 8 - 5, 13, 10, 1); fill(F[3], 6, 5, 1, 8); fill(F[4], 7, 3, 1, 1);
      break;
    case 'weapon':
      px([[10, 2], [9, 3], [8, 4], [7, 5], [6, 6], [5, 7], [4, 8]], 3);
      px([[11, 3], [10, 4], [9, 5], [8, 6], [7, 7], [6, 8], [5, 9]], 2);
      px([[3, 8], [6, 11]], 4); px([[2, 9], [7, 10]], 1); px([[3, 10], [2, 11], [4, 11], [3, 12]], 1);
      break;
    case 'shield':
      for (let j = 0; j < 9; j++) { const w = [10, 10, 10, 10, 8, 8, 6, 4, 2][j]; fill(F[2], 8 - (w >> 1), 3 + j, w); }
      fill(F[3], 3, 3, 10, 1); fill(F[3], 8, 4, 1, 7); fill(F[1], 3, 6, 1, 3); fill(F[4], 4, 4, 2, 1);
      break;
    case 'boots':
      fill(F[2], 4, 3, 4, 7); fill(F[2], 4, 10, 8, 3); fill(F[1], 4, 12, 8, 1); fill(F[3], 4, 3, 4, 1); fill(F[3], 5, 4, 1, 5);
      break;
    case 'ring1': case 'ring2':
      for (const [X, Y] of [[5, 4], [10, 4], [4, 5], [11, 5], [4, 6], [11, 6], [4, 7], [11, 7], [4, 8], [11, 8], [5, 9], [10, 9], [6, 10], [9, 10], [7, 10], [8, 10], [6, 3], [9, 3], [7, 3], [8, 3]]) fill(F[2], X, Y);
      fill(F[4], 7, 1, 2, 2); fill(F[3], 6, 2, 4, 1); fill(F[4], 6, 5, 1, 1);
      break;
    case 'amulet':
      px([[5, 2], [10, 2], [4, 3], [11, 3], [4, 4], [11, 4], [5, 5], [10, 5], [6, 6], [9, 6], [7, 7], [8, 7]], 1);
      fill(F[3], 6, 8, 4, 4); fill(F[4], 7, 9, 2, 2); fill(F[2], 6, 11, 4, 1);
      break;
    default: // trinket: a little four-point star
      px([[8, 2], [8, 3], [7, 6], [8, 6], [9, 6], [2, 8], [3, 8], [6, 7], [6, 8], [6, 9], [10, 7], [10, 8], [10, 9], [13, 8], [14, 8], [7, 10], [8, 10], [9, 10], [8, 13], [8, 14]], 3);
      px([[8, 4], [8, 5], [7, 7], [8, 7], [9, 7], [4, 8], [5, 8], [11, 8], [12, 8], [7, 9], [8, 9], [9, 9], [8, 11], [8, 12]], 2);
      fill(F[4], 8, 7, 1, 2); fill(F[4], 7, 8, 2, 1);
  }
  return c;
}

// a satchel row's icon: bespoke art for known treasures, the slot's glyph otherwise
function paintIcon(item) {
  if (item.icon === 'tin' || item.icon === 'pie') return paintSpoil(item.icon);
  const [c, x] = makeCanvas(22, 18);
  x.drawImage(paintGlyph(item.slot === 'ring' ? 'ring1' : item.slot, true), 3, 1);
  return c;
}

// ---------- built art ----------
function paintPanel() {
  const [c, x] = makeCanvas(PANW, PANH);
  const O = '#140b0c';
  const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const LEA = ['#1d1210', '#2a1a16', '#3b251d', '#4d3125'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, PANW, PANH);
  const B = 10;
  for (let j = 1; j < PANH - 1; j++) for (let i = 1; i < PANW - 1; i++) {
    const e = Math.min(i, j, PANW - 1 - i, PANH - 1 - j);
    if (e < 1 || e > B) continue;
    const horiz = Math.min(j, PANH - 1 - j) < Math.min(i, PANW - 1 - i);
    const g = horiz ? Math.sin(i * 0.21 + j * 1.7 + Math.sin(i * 0.05) * 3) : Math.sin(j * 0.21 + i * 1.7 + Math.sin(j * 0.05) * 3);
    let k = 2 + (g > 0.6 ? 1 : g < -0.7 ? -1 : 0);
    const tl = (j < PANH / 2 && j <= i) || (i < PANW / 2 && i < j);
    if (e === 1) k = tl ? 6 : 1;
    else if (e === 2) k = tl ? 5 : k;
    else if (e === B - 1) k = tl ? 1 : 5;
    else if (e === B) k = 1;
    fill(WOOD[Math.max(0, Math.min(6, k))], i, j);
  }
  for (const [rx, ry] of [[6, 6], [PANW - 7, 6], [6, PANH - 7], [PANW - 7, PANH - 7], [PANW >> 1, 6], [PANW >> 1, PANH - 7]]) {
    fill('#7a5418', rx - 1, ry - 1, 3, 3); fill('#e2b75a', rx, ry, 2, 2); fill('#fff1b8', rx, ry);
  }
  for (let j = B + 2; j < PANH - B - 2; j++) for (let i = B + 2; i < PANW - B - 2; i++) {
    const e = Math.min(i - B - 2, j - B - 2, PANW - B - 3 - i, PANH - B - 3 - j);
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.1 + Math.sin(i * 0.09 + j * 0.05) * 0.16 - Math.max(0, 5 - e) * 0.4 - (j / PANH) * 0.25;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], i, j);
  }
  const TS = { y: B + 3, h: 25 };
  fill(O, B + 2, TS.y, PANW - 2 * B - 4, TS.h);
  for (let j = 0; j < TS.h - 2; j++) for (let i = 0; i < PANW - 2 * B - 6; i++) {
    const n = hash(i * 13 + j * 41, 5);
    fill(LEA[Math.max(0, Math.min(3, 1 + Math.round(Math.sin(i * 0.11) * 0.7 + (n > 0.9 ? 1 : 0) + j * 0.04)))], B + 3 + i, TS.y + 1 + j);
  }
  for (let i = 4; i < PANW - 2 * B - 10; i += 6) { fill('#8a6a4c', B + 3 + i, TS.y + 3, 3, 1); fill('#8a6a4c', B + 3 + i, TS.y + TS.h - 4, 3, 1); }
  fill('rgba(20,10,8,0.5)', B + 2, TS.y + TS.h, PANW - 2 * B - 4, 2);
  return c;
}

// one satchel row: thin wood edge, deeper parchment, a green wink when worn
function paintCard(sel, worn) {
  const [c, x] = makeCanvas(SATW, ROWH);
  const O = '#140b0c';
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, SATW, ROWH);
  fill(sel ? '#c4943a' : '#6e4727', 1, 1, SATW - 2, ROWH - 2);
  fill(sel ? '#f6d888' : '#875a31', 1, 1, SATW - 2, 1);
  if (worn) { fill('#5a8a3c', 1, ROWH - 2, SATW - 2, 1); }
  for (let j = 0; j < ROWH - 4; j++) for (let i = 0; i < SATW - 4; i++) {
    const e = Math.min(i, j, SATW - 5 - i, ROWH - 5 - j);
    const n = hash(i * 17 + j * 29, 23);
    let v = 3.9 + Math.sin(i * 0.07 - j * 0.06) * 0.14 - Math.max(0, 4 - e) * 0.35;
    if (sel) v += 0.35;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], 2 + i, 2 + j);
  }
  fill('rgba(60,30,10,0.3)', 2, 2, SATW - 4, 1);
  return c;
}

// a brass-edged wooden button plate (DONE / EQUIP), same cut as the Training Yard's
function paintPlate(w, h, pressed = false) {
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const BR = ['#3e2a0c', '#5c3e12', '#7a5418', '#9a7026', '#c4943a', '#e2b75a', '#f6d888'];
  const WD = pressed ? ['#1d1208', '#2e1a0f', '#3d2414', '#4a2e18'] : ['#3d2414', '#56361d', '#6e4727', '#875a31'];
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill(O, 0, 0, w, h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const e = Math.min(i, j, w - 1 - i, h - 1 - j);
    if (e > 2) continue;
    const tl = j < h / 2 || i < w / 2;
    fill(BR[pressed ? (e === 1 ? (tl ? 2 : 4) : tl ? 1 : 3) : (e === 1 ? (tl ? 5 : 2) : tl ? 4 : 1)], i, j);
  }
  for (let j = 3; j < h - 3; j++) for (let i = 3; i < w - 3; i++) {
    const g = Math.sin(i * 0.23 + j * 1.9 + Math.sin(i * 0.06) * 3);
    fill(WD[Math.max(0, Math.min(3, 1 + (g > 0.5 ? 1 : g < -0.6 ? -1 : 0) + (pressed ? 0 : (j < h / 2 ? 1 : 0))))], i, j);
  }
  if (pressed) fill('rgba(10,5,8,0.35)', 3, 3, w - 6, h - 6);
  else { fill('rgba(255,240,200,0.16)', 3, 3, w - 6, 1); fill('rgba(0,0,0,0.25)', 3, h - 4, w - 6, 1); }
  return c;
}

// the doll panel's dais: a worn practice-mat of packed straw and leather
function paintDais() {
  const [c, x] = makeCanvas(DOLLY.w, DOLLY.h);
  const PAR = ['#a87f4e', '#bd9663', '#d0ac79', '#dfc08f', '#e9d3a6'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill('#140b0c', 0, 0, DOLLY.w, DOLLY.h);
  for (let j = 1; j < DOLLY.h - 1; j++) for (let i = 1; i < DOLLY.w - 1; i++) {
    const n = hash(i * 37 + j * 11, 41);
    let v = 2.6 + Math.sin(i * 0.16) * 0.3 - (j / DOLLY.h) * 0.7;
    if (n > 0.96) v -= 0.5; else if (n < 0.03) v += 0.4;
    fill(PAR[Math.max(0, Math.min(4, Math.round(v)))], i, j);
  }
  fill('#6e4727', 1, 1, DOLLY.w - 2, 1); fill('#875a31', 1, DOLLY.h - 2, DOLLY.w - 2, 1);
  // the straw mat he stands on
  for (let j = 0; j < 12; j++) for (let i = 0; i < 96; i++) {
    const u = (i - 48) / 48, v = (j - 6) / 6;
    if (u * u + v * v > 1) continue;
    const g = Math.sin(i * 0.8 + j * 2.4);
    fill(Math.abs(v) > 0.7 ? '#8a6a34' : g > 0.4 ? '#d8b25e' : g < -0.5 ? '#a8863e' : '#c4a050', 28 + i, DOLLFEET - 6 + j);
  }
  return c;
}

function buildItemArt(item) {
  if (A.itemArt[item.id]) return;
  A.itemArt[item.id] = {
    icon: paintIcon(item),
    name: t2(item.name, 'bold 14px "Pixelify Sans"', '#3b2418'),
    kind: t2(item.kind, 'bold 9px "Pixelify Sans"', '#8a6a3c', { spacing: 2 }),
    stat: t2(item.stat, 'bold 12px "Pixelify Sans"', item.stat.startsWith('+') ? '#2e5a1c' : '#7a5a34'),
    note: t2(item.note, '12px "Pixelify Sans"', '#5a3a22'),
  };
}

export function buildBeat8() {
  SPOT8 = cb.buildSpot(16, 18, 1.1);                 // a tight hole over the Gear tile
  A = { panel: paintPanel(), dais: paintDais(),
    card: [paintCard(false, false), paintCard(true, false)], cardWorn: [paintCard(false, true), paintCard(true, true)],
    equip: paintPlate(EQUIPR.w, EQUIPR.h), equipP: paintPlate(EQUIPR.w, EQUIPR.h, true),
    page: paintPlate(PAGER.w, PAGER.h), pageP: paintPlate(PAGER.w, PAGER.h, true),
    done: paintPlate(DONER.w, DONER.h), doneP: paintPlate(DONER.w, DONER.h, true),
    gaunt: buildGauntlet(false), gauntP: buildGauntlet(true),
    glyph: {}, itemArt: {}, txt: {} };
  for (const s of ['helm', 'armor', 'cloak', 'weapon', 'shield', 'boots', 'ring1', 'ring2', 'amulet', 'trinket']) {
    A.glyph[s] = { dim: paintGlyph(s, false), lit: paintGlyph(s, true) };
  }
  A.txt.title = t2('GEAR', 'bold 27px "Pixelify Sans"', '#f6d888', { spacing: 3 });
  A.txt.titleSh = t2('GEAR', 'bold 27px "Pixelify Sans"', '#1a0d08', { spacing: 3 });
  A.txt.doll = t2('THE SELLSWORD', 'bold 11px "Pixelify Sans"', '#8a6a3c', { spacing: 2 });
  A.txt.satchel = t2('· THE SATCHEL ·', 'bold 12px "Pixelify Sans"', '#8a5f2e', { spacing: 2 });
  A.txt.equip = t2('EQUIP', 'bold 12px "Pixelify Sans"', '#d8ffb0');
  A.txt.equipSh = t2('EQUIP', 'bold 12px "Pixelify Sans"', '#142008');
  A.txt.worn = t2('WORN', 'bold 12px "Pixelify Sans"', '#ffe9a0');
  A.txt.wornSh = t2('WORN', 'bold 12px "Pixelify Sans"', '#241208');
  A.txt.doneLbl = t2('DONE', 'bold 16px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 16px "Pixelify Sans"', '#241208');
  A.txt.hint = t2('G · close', '15px "Pixelify Sans"', '#8a6a3c');
  A.txt.empty = t2('The satchel is empty.', '13px "Pixelify Sans"', '#8a6a3c');
}

// ---------- state ----------
export function reset() {
  D = { Eref: cb.E, tNow: 0, line14At: null, nudged: false, pulseShown: false,
        openAt: null, closeAt: null, pressAt: null, pressId: null, sel: 0, page: 0,
        equippedAt: null, snorted: false, doneAt: null, statsKey: null, statsTxt: null };
  setGearPulse(false); setTileLocked('gear', true);
}
reset();

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function started() { return !!D && D.line14At !== null; }
export function gearOpen() { return !!D && D.openAt !== null; }
export function wantsPointer() { return !!D && D.line14At !== null && (D.openAt !== null || (D.equippedAt === null && cb.inventory().length > 0)); }
export function finished(t) {
  if (!D || D.doneAt === null) return false;
  return cb.warp(t) > D.doneAt + 0.5;
}
export function debug() {
  if (!D) return null;
  const out = { line14: D.line14At === null ? null : +D.line14At.toFixed(2), pulse: D.pulseShown, open: D.openAt !== null,
    sel: D.sel, page: D.page, inv: cb.inventory().map(i => ({ id: i.id, equipped: i.equipped })), gear: cb.gearState(),
    equipped: D.equippedAt !== null, snorted: D.snorted, done: D.doneAt === null ? null : +D.doneAt.toFixed(2), tile: { ...TILE } };
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(D.tNow));
    out.panel = { x: px, y: py, w: PANW, h: PANH };
    const p0 = D.page * ROWS;
    out.rows = cb.inventory().slice(p0, p0 + ROWS).map((it, v) => ({ id: it.id, x: px + SATX, y: py + ROWY0 + v * (ROWH + ROWGAP), w: SATW, h: ROWH,
      equip: { x: px + SATX + EQUIPR.x, y: py + ROWY0 + v * (ROWH + ROWGAP) + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h } }));
    out.slots = {};
    for (const [sl, sx, sy] of SLOTS) out.slots[sl] = { x: px + DOLLY.x + sx, y: py + DOLLY.y + sy, w: SLOTW, h: SLOTW };
    out.pager = { prev: { x: px + SATX, y: py + PAGER.y, w: PAGER.w, h: PAGER.h }, next: { x: px + SATX + SATW - PAGER.w, y: py + PAGER.y, w: PAGER.w, h: PAGER.h } };
    out.doneRect = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  }
  return out;
}

// ---------- open / close / equip ----------
const panelK = t => {
  if (!D || D.openAt === null) return 0;
  let k = easeOutBack(clamp((t - D.openAt) / 0.35));
  if (D.closeAt !== null) k *= 1 - easeOut(clamp((t - D.closeAt) / 0.24));
  return k;
};
const panelPos = k => [PANX, Math.round(PANY + (1 - k) * 44)];
const pageCount = () => Math.max(1, Math.ceil(cb.inventory().length / ROWS));

function openScreen(t) {
  D.openAt = t; D.closeAt = null;
  D.pulseShown = false; setGearPulse(false);
  for (const it of cb.inventory()) buildItemArt(it);
  const tinIdx = cb.inventory().findIndex(i => i.id === 'pietin' && !i.equipped);
  D.sel = tinIdx >= 0 ? tinIdx : 0;
  D.page = Math.floor(D.sel / ROWS);
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}
function closeScreen(t) {
  if (D.closeAt !== null) return;
  D.closeAt = t;
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}
function equip(t, item) {
  const s = cb.warp(t);
  D.pressAt = t; D.pressId = item.id;
  if (item.equipped) {                                // a worn piece's plate takes it off again
    const g = cb.gearState();
    const slot = Object.keys(g).find(k2 => g[k2] === item.id);
    if (slot) cb.unequipSlot(slot, s);
    return;
  }
  cb.equipItem(item.id, s);
  if (item.id === 'pietin' && D.equippedAt === null) {
    D.equippedAt = t;
    cb.E.live.push({ s: s + 0.18, k: 'chime' }, { s: s + 0.34, k: 'ding' });
  }
}
function select(t, i) {
  D.sel = i; D.page = Math.floor(i / ROWS);
  D.pressAt = t; D.pressId = null;
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}

// ---------- input ----------
export function click(gx, gy, t) {
  if (!D) return false;
  if (D.line14At === null) {                      // the tile is still chained: a rattle, not a lesson
    if (inTile(gx, gy)) { D.pressAt = t; const s2 = cb.warp(t); cb.E.live.push({ s: s2, k: 'paper' }, { s: s2 + 0.07, k: 'paper' }); return true; }
    return false;
  }
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(t));
    const inv = cb.inventory();
    // the satchel rows
    const p0 = D.page * ROWS;
    for (let v = 0; v < ROWS; v++) {
      const i = p0 + v; if (i >= inv.length) break;
      const X = px + SATX, Y = py + ROWY0 + v * (ROWH + ROWGAP);
      if (gx >= X && gx < X + SATW && gy >= Y && gy < Y + ROWH) {
        const er = { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h };
        if (gx >= er.x && gx < er.x + er.w && gy >= er.y && gy < er.y + er.h) { equip(t, inv[i]); return true; }
        if (i === D.sel) equip(t, inv[i]);            // a second tap on the selected row equips it, quick-fingered
        else select(t, i);
        return true;
      }
    }
    // the pager
    if (gy >= py + PAGER.y && gy < py + PAGER.y + PAGER.h) {
      if (gx >= px + SATX && gx < px + SATX + PAGER.w && D.page > 0) { D.page--; D.sel = D.page * ROWS; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
      if (gx >= px + SATX + SATW - PAGER.w && gx < px + SATX + SATW && D.page < pageCount() - 1) { D.page++; D.sel = D.page * ROWS; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    }
    // the doll's slots: a worn slot sheds its piece; an empty one finds a match in the satchel
    for (const [sl, sx, sy] of SLOTS) {
      const X = px + DOLLY.x + sx, Y = py + DOLLY.y + sy;
      if (gx >= X && gx < X + SLOTW && gy >= Y && gy < Y + SLOTW) {
        const g = cb.gearState();
        if (g[sl]) { cb.unequipSlot(sl, cb.warp(t)); D.pressAt = t; D.pressId = g[sl]; }
        else {
          const fam = sl === 'ring1' || sl === 'ring2' ? 'ring' : sl;
          const j = inv.findIndex(it2 => it2.slot === fam && !it2.equipped);
          if (j >= 0) { select(t, j); }
          else { D.pressAt = t; D.pressId = null; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); }
        }
        return true;
      }
    }
    const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
    const inPanel = gx >= px && gx < px + PANW && gy >= py && gy < py + PANH;
    if ((gx >= dr.x && gx < dr.x + dr.w && gy >= dr.y && gy < dr.y + dr.h) || !inPanel) closeScreen(t);
    return true;                                        // modal: the world waits behind the screen
  }
  if (inTile(gx, gy)) { openScreen(t); return true; }
  return false;
}
export function key(k, t) {
  if (!D || D.line14At === null) return false;
  if (k === 'Escape') { if (D.openAt !== null) { closeScreen(t); return true; } return false; }
  if (k === 'g' || k === 'G') {
    if (D.openAt !== null) closeScreen(t); else openScreen(t);
    return true;
  }
  if (D.openAt !== null) {
    const inv = cb.inventory();
    if (k === 'ArrowUp') { if (inv.length) select(t, (D.sel + inv.length - 1) % inv.length); return true; }
    if (k === 'ArrowDown') { if (inv.length) select(t, (D.sel + 1) % inv.length); return true; }
    if (k === 'ArrowLeft') { if (D.page > 0) { D.page--; D.sel = D.page * ROWS; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); } return true; }
    if (k === 'ArrowRight') { if (D.page < pageCount() - 1) { D.page++; D.sel = D.page * ROWS; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); } return true; }
    if (k === 'Enter' || k === ' ') { if (inv[D.sel]) equip(t, inv[D.sel]); return true; }
    if (k >= '1' && k <= '9' && +k - 1 < inv.length) { select(t, +k - 1); return true; }
  }
  return false;
}

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {                                // the store was rebuilt under us (replay)
    const hard = D.line14At !== null || D.equippedAt !== null;
    D.Eref = cb.E;
    if (hard) reset();
  }
  D.tNow = t;
  const s = cb.warp(t);
  if (D.line14At === null) {
    const b7 = beat7.debug();
    if (!b7 || b7.done === null || s < b7.done + 1.2 || busyLine(s)) return;
    if (!cb.inventory().length) return;                 // no spoils, no lesson
    D.line14At = s + 0.1; say('line14', D.line14At); setTileLocked('gear', false);
    return;
  }
  // the tab pulses until the tin sits on the hero's head
  const pulse = D.openAt === null && D.equippedAt === null;
  if (pulse !== D.pulseShown) { D.pulseShown = pulse; setGearPulse(pulse); }
  if (!D.nudged && D.openAt === null && D.equippedAt === null && s > lineEnd(DIALOGUE.line14) + 9 && !busyLine(s)) {
    D.nudged = true; say('gearNudge', s);
  }
  // the equip lands: the screen takes its bow (only for the session the equip happened in),
  // then Elminster snorts his verdict
  if (D.equippedAt !== null && D.openAt !== null && D.openAt < D.equippedAt && D.closeAt === null && t > D.equippedAt + 1.6) closeScreen(t);
  if (D.closeAt !== null && t > D.closeAt + 0.28) { D.openAt = null; D.closeAt = null; }
  if (D.equippedAt !== null && D.openAt === null && D.closeAt === null && !D.snorted && !busyLine(s)) {
    D.snorted = true;
    ui.snort(t); act.addPuff(t);
    say('line14b', s + 0.25);
  }
  if (D.doneAt === null && D.snorted && s > lineEnd(DIALOGUE.line14b) + 1.1) D.doneAt = s;
}

// ---------- spotlights (before the dialogue box, like Beats 4 & 6) ----------
export function drawSpot(ctx, p, t) {
  if (!D || !D.pulseShown || D.openAt !== null) return;
  const s = cb.warp(t);
  const k = easeOut(clamp((s - D.line14At) / 0.5));
  if (k <= 0) return;
  ctx.globalAlpha = 0.62 * k;
  ctx.drawImage(SPOT8, Math.round(TILE.x + 13 - 640), Math.round(TILE.y + 14 - 360));
  ctx.globalAlpha = 1;
}

// ---------- overlays ----------
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.line14At === null) return;
  const s = cb.warp(t);
  drawBanner(ctx, s);
  drawPointer(ctx, s);
  if (D.openAt !== null) drawScreen(ctx, uctx, t, s);
}

// the objective tag under Elminster's box: OPEN THE GEAR SCREEN, until it's open
function drawBanner(ctx, s) {
  if (!D.pulseShown || D.openAt !== null) return;
  const at = DIALOGUE.line14.at;
  if (s < at + 0.4) return;
  const label = 'OPEN THE GEAR SCREEN', w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3));
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
  ctx.globalAlpha = clamp(k);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = '#5a3414'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = '#7e4c20'; ctx.fillRect(X, Y, w, 1);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
  const bx = X + 7, by = Y + 7;
  ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 1, by - 2, 3, 5); ctx.fillRect(bx - 2, by - 1, 5, 3);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by - 1, 1, 1);
  num(ctx, label, X + 13, Y + 4, ['#ffe7a0', '#ffffff'], 'l');
  ctx.globalAlpha = 1;
}

// a gold chevron bobbing over the pulsing Gear tile
function drawPointer(ctx, s) {
  if (!D.pulseShown || D.openAt !== null) return;
  const k = easeOut(clamp((s - D.line14At - 0.3) / 0.4));
  if (k <= 0) return;
  const bob = Math.round(Math.sin(s * 4.4) * 1.5);
  const cx = TILE.x + 13, cy = TILE.y - 11 + bob;
  ctx.globalAlpha = k;
  for (let r = 0; r < 4; r++) {
    ctx.fillStyle = '#140b0c'; ctx.fillRect(cx - 4 + r, cy + r - 1, 9 - r * 2, 1);
    ctx.fillStyle = r === 3 ? '#fff3b0' : '#e8a838'; ctx.fillRect(cx - 3 + r, cy + r, 7 - r * 2, 1);
  }
  ctx.globalAlpha = 1;
}

// ---------- the Gear screen ----------
function drawScreen(ctx, uctx, t, s) {
  const k = panelK(t);
  if (k <= 0.02) return;
  const ak = clamp(k * 1.4);
  const [px, py] = panelPos(k);
  const inv = cb.inventory();
  for (const it of inv) buildItemArt(it);
  const gear = cb.gearState();
  // the stats line under the doll, rebuilt only when the numbers move
  const hs = cb.hudState(t);
  const sKey = `${hs.hp}/${hs.hpMax}`;
  if (D.statsKey !== sKey) { D.statsKey = sKey; D.statsTxt = t2(`HP ${hs.hp}/${hs.hpMax} · AC 16`, 'bold 13px "Pixelify Sans"', '#3b2418'); }
  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);
  u.globalAlpha = 0.55 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.45)');
  IMG(A.panel, px, py);

  // ---- the doll panel: the Sellsword on his mat, wearing whatever is worn ----
  const dx = px + DOLLY.x, dy = py + DOLLY.y;
  u.globalAlpha = ak;
  IMG(A.dais, dx, dy);
  const flashD = D.equippedAt === null ? -1 : t - D.equippedAt;
  act.drawHeroPractice(u, flashD >= 0 && flashD < 0.7 ? 'ready2' : 'ready', dx + DOLLY.w / 2, dy + DOLLFEET, S);
  if (flashD >= 0 && flashD < 0.7) {                  // the equip flash: a ring of gold off the doll
    const q = flashD / 0.7, Rr = 6 + q * 40;
    u.globalAlpha = ak * (1 - q) * 0.9;
    for (let i = 0; i < 22; i++) { const a2 = i / 22 * Math.PI * 2; R(dx + DOLLY.w / 2 + Math.cos(a2) * Rr, dy + 76 + Math.sin(a2) * Rr * 0.8, 2, 2, q < 0.3 ? '#fff8dc' : '#ffd25a'); }
    u.globalAlpha = ak;
  }
  // the ten slots, ringed around him — worn pieces glow, empty ones keep their silhouette
  const selIt = inv[D.sel];
  const selFam = selIt ? (selIt.slot === 'ring' ? ['ring1', 'ring2'] : [selIt.slot]) : [];
  for (const [sl, sx, sy] of SLOTS) {
    const X = dx + sx, Y = dy + sy, worn = gear[sl];
    const hot = selFam.includes(sl);
    R(X, Y, SLOTW, SLOTW, '#140b0c');
    R(X + 1, Y + 1, SLOTW - 2, SLOTW - 2, worn ? '#4a3418' : '#241812');
    R(X + 1, Y + 1, SLOTW - 2, 1, worn ? '#c4943a' : '#3f2c1c');
    if (hot) {                                        // the selected row's slot breathes gold
      const kp = 0.5 + 0.5 * Math.sin(t * 4.6);
      u.globalAlpha = ak * (0.35 + 0.4 * kp);
      R(X - 1, Y - 1, SLOTW + 2, 1, '#ffd25a'); R(X - 1, Y + SLOTW, SLOTW + 2, 1, '#ffd25a');
      R(X - 1, Y - 1, 1, SLOTW + 2, '#ffd25a'); R(X + SLOTW, Y - 1, 1, SLOTW + 2, '#ffd25a');
      u.globalAlpha = ak;
    }
    if (worn) {
      const wIt = inv.find(i2 => i2.id === worn);
      if (wIt) { buildItemArt(wIt); IMG(A.itemArt[wIt.id].icon, X + 1, Y + 3); }
      for (let m = 0; m < 3; m++) R(X + 3 + Math.floor(hash(m, sl.length * 7) * (SLOTW - 7)), Y + 3 + ((m * 7 + sl.length * 3) % (SLOTW - 7)), 1, 1, 'rgba(255,240,190,0.55)');
    } else {
      IMG(A.glyph[sl].dim, X + 4, Y + 4);
    }
  }

  // ---- the satchel: a paged row per treasure ----
  const pages = pageCount();
  if (D.page >= pages) D.page = pages - 1;
  const p0 = D.page * ROWS;
  if (!inv.length) put(uctx, A.txt.empty, px + SATX + SATW / 2, py + ROWY0 + 30, 'c');
  for (let v = 0; v < ROWS; v++) {
    const i = p0 + v; if (i >= inv.length) break;
    const it = inv[i], IA = A.itemArt[it.id], sel = i === D.sel;
    const X = px + SATX, Y = py + ROWY0 + v * (ROWH + ROWGAP) - (sel ? 1 : 0);
    u.globalAlpha = ak * (sel ? 1 : 0.92);
    IMG(it.equipped ? A.cardWorn[sel ? 1 : 0] : A.card[sel ? 1 : 0], X, Y);
    u.globalAlpha = ak;
    IMG(IA.icon, X + 8, Y + 13);
    // the equip plate, green arrow and all — the design plan's spotlighted ↑
    const er = { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h };
    const pressed = D.pressAt !== null && t - D.pressAt < 0.14 && D.pressId === it.id;
    if (!it.equipped && D.equippedAt === null) {      // a soft gold pulse behind it until the lesson lands
      const kp = 0.5 + 0.5 * Math.sin(t * 4.6);
      u.save(); u.globalCompositeOperation = 'lighter'; u.globalAlpha = ak * (0.12 + 0.18 * kp);
      u.fillStyle = '#ffd25a'; u.fillRect((er.x - 2) * S, (er.y - 2) * S, (er.w + 4) * S, (er.h + 4) * S);
      u.restore();
    }
    u.globalAlpha = ak * (it.equipped ? 0.9 : 1);
    IMG(pressed ? A.equipP : A.equip, er.x, er.y + (pressed ? 1 : 0));
    u.globalAlpha = ak;
    if (!it.equipped) {                               // the green ↑ the plan asks a spotlight for
      const ax = er.x + 5, ay = er.y + 8 + (pressed ? 1 : 0);
      R(ax - 1, ay - 4, 2, 1, '#142008'); R(ax - 2, ay - 3, 4, 1, '#142008'); R(ax - 3, ay - 2, 6, 1, '#142008'); R(ax - 1, ay - 1, 2, 4, '#142008');
      R(ax - 1, ay - 4, 2, 1, '#9ae070'); R(ax - 2, ay - 3, 4, 1, '#7ec850'); R(ax - 3, ay - 2, 6, 1, '#7ec850'); R(ax - 1, ay - 1, 2, 4, '#7ec850');
    }
    put(uctx, it.equipped ? A.txt.wornSh : A.txt.equipSh, er.x + er.w / 2 + (it.equipped ? 0 : 5), er.y + 4.5 + (pressed ? 1 : 0), 'c');
    put(uctx, it.equipped ? A.txt.worn : A.txt.equip, er.x + er.w / 2 + (it.equipped ? 0 : 5), er.y + 3.5 + (pressed ? 1 : 0), 'c');
    // the row's words
    put(uctx, IA.name, X + 36, Y + 5);
    put(uctx, IA.kind, X + 36, Y + 17);
    put(uctx, IA.stat, X + 36, Y + 27);
    // the equip flourish: the stat floats up off the row
    if (D.equippedAt !== null && it.id === 'pietin') {
      const fd = t - D.equippedAt;
      if (fd >= 0 && fd < 1.5) {
        u.globalAlpha = ak * (fd > 0.9 ? 1 - (fd - 0.9) / 0.6 : 1);
        num(u, '+1 MAX HP', (X + SATW / 2) * S, (Y + 12 - Math.round(fd * 12)) * S, ['#b8f090', '#eaffd0', '#3c6a2a'], 'c', { outline: '#241208', scale: S });
        u.globalAlpha = ak;
      }
    }
  }
  // the pager: brass chevrons and a page count, only when there's more than one page
  if (pages > 1) {
    for (const [n, can] of [[0, D.page > 0], [1, D.page < pages - 1]]) {
      const X = px + (n === 0 ? SATX : SATX + SATW - PAGER.w), Y = py + PAGER.y;
      u.globalAlpha = ak * (can ? 1 : 0.4);
      IMG(A.page, X, Y);
      const ccx = X + PAGER.w / 2, ccy = Y + PAGER.h / 2;
      for (let q = 0; q < 5; q++) {
        const dy2 = q - 2, o = 2 - Math.abs(dy2);
        const X2 = n === 0 ? ccx - o : ccx + o - 2;
        R(X2 - 1, ccy + dy2, 4, 1, '#140b0c');
        R(X2, ccy + dy2, 2, 1, '#ffe9a0');
      }
    }
    u.globalAlpha = ak;
    num(u, `${D.page + 1}/${pages}`, (px + SATX + SATW / 2) * S, (py + PAGER.y + 6) * S, ['#8a5f2e', '#caa060'], 'c', { outline: null, scale: S });
  }
  // the selected treasure's flavour line
  if (selIt) put(uctx, A.itemArt[selIt.id].note, px + SATX + SATW / 2, py + NOTEY, 'c');

  // the gauntlet hovers at the pie tin's plate until it's worn
  const tinIdx = inv.findIndex(i2 => i2.id === 'pietin');
  if (D.equippedAt === null && tinIdx >= 0 && Math.floor(tinIdx / ROWS) === D.page) {
    const Y = py + ROWY0 + (tinIdx - p0) * (ROWH + ROWGAP);
    const ph = (t % 1.15) / 1.15, press = ph > 0.55 && ph < 0.72;
    const gx2 = Math.round(px + SATX + EQUIPR.x + EQUIPR.w / 2 + 10), gy2 = Math.round(Y + EQUIPR.y + 12);
    const ox = press ? 0 : 3 + Math.round(Math.sin(ph * Math.PI * 2) * 1), oy = press ? 0 : 5;
    IMG(press ? A.gauntP : A.gaunt, gx2 - GAUNTLET_TIP[0] + ox, gy2 - GAUNTLET_TIP[1] + oy);
    if (ph > 0.55 && ph < 0.95) {
      const q = (ph - 0.55) / 0.4, Rr = 3 + q * 9;
      u.globalAlpha = ak * (1 - q);
      for (let i2 = 0; i2 < 14; i2++) { const a2 = i2 / 14 * Math.PI * 2; R(gx2 + Math.cos(a2) * Rr, gy2 + Math.sin(a2) * Rr * 0.7, 1, 1, '#fff2b0'); }
      u.globalAlpha = ak;
    }
  }

  // ---- the panel's own text ----
  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  IMG(A.done, dr.x, dr.y);
  put(uctx, A.txt.titleSh, px + PANW / 2, py + 16.5, 'c');
  put(uctx, A.txt.title, px + PANW / 2, py + 15.5, 'c');
  put(uctx, A.txt.doll, dx + DOLLY.w / 2, py + 40, 'c');
  put(uctx, A.txt.satchel, px + SATX + SATW / 2, py + 44, 'c');
  put(uctx, A.txt.doneSh, dr.x + dr.w / 2, dr.y + 7.5, 'c');
  put(uctx, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + 6.5, 'c');
  put(uctx, A.txt.hint, dr.x - 10, py + 257, 'r');
  put(uctx, D.statsTxt, dx + DOLLY.w / 2, dy + DOLLY.h + 6, 'c');
  uctx.globalAlpha = 1;
}
