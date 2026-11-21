// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 8 — the Gear Screen (Scalable Paper-Doll & Satchel)
//
//  Left: the SELLSWORD on a practice mat ringed by 10 interactive
//  paper-doll slots (click any slot to filter the satchel, hover to
//  inspect). Right: a sortable, filterable, wheel-scrollable Satchel
//  showing 5 compact rows at once with upgrade indicators (↑ / = / ↓),
//  one-click EQUIP BEST, and a live comparison footer.
// ─────────────────────────────────────────────────────────────
import { W, H, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat7 from './beat7.js';
import { setGearPulse, setTileLocked, setGearBadge } from './hud.js';
import * as act from './actors.js';
import * as ui from './ui.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { makeCanvas, crispText, clamp, easeOut, easeOutBack, hash } from './util.js';
import { num } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const TILE = { x: 580, y: 329, w: 26, h: 29 };       // the belt's Gear tile
const inTile = (gx, gy) => gx >= TILE.x && gx < TILE.x + TILE.w && gy >= TILE.y && gy < TILE.y + TILE.h;
const PANW = 424, PANH = 292, PANX = 108, PANY = 28; // the Gear screen itself
const DOLLY = { x: 12, y: 48, w: 152, h: 174 };      // the paper-doll panel
const DOLLFEET = 152;
const SLOTW = 24;
const SLOTS = [
  ['helm', 64, 4], ['amulet', 100, 4],
  ['armor', 4, 34], ['cloak', 124, 34],
  ['weapon', 4, 64], ['shield', 124, 64],
  ['boots', 4, 94], ['trinket', 124, 94],
  ['ring1', 4, 124], ['ring2', 124, 124],
];
const SLOT_LABEL = {
  helm: 'HELM', amulet: 'AMULET', armor: 'ARMOR', cloak: 'CLOAK', weapon: 'WEAPON',
  shield: 'SHIELD', boots: 'BOOTS', trinket: 'TRINKET', ring1: 'RING 1', ring2: 'RING 2', ring: 'RING',
};
const SATX = 172, SATW = 240;
const BAR_Y = 50, BAR_H = 17;
const ROWY0 = 72, ROWH = 28, ROWGAP = 3, ROWS_VIS = 5;
const LISTW = 229, LISTH = ROWS_VIS * ROWH + (ROWS_VIS - 1) * ROWGAP;
const SCROLLR = { x: SATX + SATW - 8, y: ROWY0, w: 8, h: LISTH };
const EQUIPR = { x: LISTW - 48, y: 5, w: 44, h: 18 };
const FOOTR = { x: SATX, y: 228, w: SATW, h: 30 };
const DONER = { x: 352, y: 261, w: 60, h: 24 };
const NUDGE = { pointer: 6, line: 15, pulse: 30 };
const SORTS = ['best', 'slot', 'name'];
const SORT_LBL = { best: 'BEST', slot: 'SLOT', name: 'NAME' };

let D = null, A = null, SPOT8 = null;

// ---------- text on the 2× UI canvas ----------
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
const dynTxt = (key, str, font, col, opts) => {
  const k = `${key}|${str}|${col}`;
  if (!A.dyn.has(k)) A.dyn.set(k, t2(str, font, col, opts));
  return A.dyn.get(k);
};

// ---------- little pixel icons for the spoils ----------
const TINPAL = ['#2a2e3c', '#484e62', '#6e7488', '#969cb2', '#bcc2d4', '#e2e8f4'];
const BERRY = ['#1c1434', '#342458', '#4e3a7e', '#6a52a4', '#8a6ec2'];
const CRUST = ['#4a2810', '#7a4c22', '#a8703a', '#cf9a58', '#ecc080'];
const i0 = (u, v) => Math.round(u * 10) * 31 + Math.round(v * 10) * 7;
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
    ell(15, 7, 2.6, 1.8, () => '#f4efe2');
  }
  return c;
}

// ---------- a 16×16 glyph per slot ----------
function paintGlyph(slot, lit) {
  const [c, x] = makeCanvas(16, 16);
  const F = lit
    ? ['#3a2a18', '#7a5418', '#c4943a', '#e2b75a', '#fff1b8']
    : ['#241812', '#4a3524', '#5d4530', '#6e543a', '#806848'];
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
      fill(F[3], 7, 3, 2, 1); fill(F[1], 3, 13, 10, 1); fill(F[3], 6, 5, 1, 8); fill(F[4], 7, 3, 1, 1);
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
    default:
      px([[8, 2], [8, 3], [7, 6], [8, 6], [9, 6], [2, 8], [3, 8], [6, 7], [6, 8], [6, 9], [10, 7], [10, 8], [10, 9], [13, 8], [14, 8], [7, 10], [8, 10], [9, 10], [8, 13], [8, 14]], 3);
      px([[8, 4], [8, 5], [7, 7], [8, 7], [9, 7], [4, 8], [5, 8], [11, 8], [12, 8], [7, 9], [8, 9], [9, 9], [8, 11], [8, 12]], 2);
      fill(F[4], 8, 7, 1, 2); fill(F[4], 7, 8, 2, 1);
  }
  return c;
}

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
  const TS = { y: B + 3, h: 24 };
  fill(O, B + 2, TS.y, PANW - 2 * B - 4, TS.h);
  for (let j = 0; j < TS.h - 2; j++) for (let i = 0; i < PANW - 2 * B - 6; i++) {
    const n = hash(i * 13 + j * 41, 5);
    fill(LEA[Math.max(0, Math.min(3, 1 + Math.round(Math.sin(i * 0.11) * 0.7 + (n > 0.9 ? 1 : 0) + j * 0.04)))], B + 3 + i, TS.y + 1 + j);
  }
  for (let i = 4; i < PANW - 2 * B - 10; i += 6) { fill('#8a6a4c', B + 3 + i, TS.y + 3, 3, 1); fill('#8a6a4c', B + 3 + i, TS.y + TS.h - 4, 3, 1); }
  fill('rgba(20,10,8,0.5)', B + 2, TS.y + TS.h, PANW - 2 * B - 4, 2);
  return c;
}

function paintCard(sel, worn) {
  const [c, x] = makeCanvas(LISTW, ROWH);
  const O = '#140b0c';
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, LISTW, ROWH);
  fill(sel ? '#c4943a' : '#6e4727', 1, 1, LISTW - 2, ROWH - 2);
  fill(sel ? '#f6d888' : '#875a31', 1, 1, LISTW - 2, 1);
  if (worn) fill('#5a8a3c', 1, ROWH - 2, LISTW - 2, 1);
  for (let j = 0; j < ROWH - 4; j++) for (let i = 0; i < LISTW - 4; i++) {
    const e = Math.min(i, j, LISTW - 5 - i, ROWH - 5 - j);
    const n = hash(i * 17 + j * 29, 23);
    let v = 3.9 + Math.sin(i * 0.07 - j * 0.06) * 0.14 - Math.max(0, 3 - e) * 0.35;
    if (sel) v += 0.35;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], 2 + i, 2 + j);
  }
  fill('rgba(60,30,10,0.28)', 2, 2, LISTW - 4, 1);
  return c;
}

function paintPlate(w, h, pressed = false, green = false) {
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const BR = ['#3e2a0c', '#5c3e12', '#7a5418', '#9a7026', '#c4943a', '#e2b75a', '#f6d888'];
  const WD = green
    ? (pressed ? ['#182c10', '#223e18', '#2d501f', '#386226'] : ['#244218', '#335a22', '#42722c', '#548c38'])
    : (pressed ? ['#1d1208', '#2e1a0f', '#3d2414', '#4a2e18'] : ['#3d2414', '#56361d', '#6e4727', '#875a31']);
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill(O, 0, 0, w, h);
  const bw = h < 19 ? 1 : 2;
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const e = Math.min(i, j, w - 1 - i, h - 1 - j);
    if (e > bw) continue;
    const tl = j < h / 2 || i < w / 2;
    fill(BR[pressed ? (e === 1 ? (tl ? 2 : 4) : tl ? 1 : 3) : (e === 1 ? (tl ? 5 : 2) : tl ? 4 : 1)], i, j);
  }
  for (let j = bw + 1; j < h - bw - 1; j++) for (let i = bw + 1; i < w - bw - 1; i++) {
    const g = Math.sin(i * 0.23 + j * 1.9 + Math.sin(i * 0.06) * 3);
    fill(WD[Math.max(0, Math.min(3, 1 + (g > 0.5 ? 1 : g < -0.6 ? -1 : 0) + (pressed ? 0 : (j < h / 2 ? 1 : 0))))], i, j);
  }
  if (pressed) fill('rgba(10,5,8,0.35)', bw + 1, bw + 1, w - (bw + 1) * 2, h - (bw + 1) * 2);
  else { fill('rgba(255,240,200,0.16)', bw + 1, bw + 1, w - (bw + 1) * 2, 1); fill('rgba(0,0,0,0.25)', bw + 1, h - bw - 2, w - (bw + 1) * 2, 1); }
  return c;
}

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
  const shortName = item.name.length > 21 ? item.name.slice(0, 20) + '…' : item.name;
  const sub = item.hp ? `${item.slot.toUpperCase()} · +${item.hp} max HP` : item.stat && item.stat.startsWith('+') ? `${item.slot.toUpperCase()} · ${item.stat}` : `${item.slot.toUpperCase()} · No stats`;
  A.itemArt[item.id] = {
    icon: paintIcon(item),
    name: t2(shortName, 'bold 12px "Pixelify Sans"', '#3b2418'),
    sub: t2(sub, 'bold 10px "Pixelify Sans"', item.hp || (item.stat && item.stat.startsWith('+')) ? '#2e5a1c' : '#7a5a34'),
    note: t2(item.note || '', '11px "Pixelify Sans"', '#5a3a22'),
  };
}

export function buildBeat8() {
  SPOT8 = cb.buildSpot(16, 18, 1.1);
  A = { panel: paintPanel(), dais: paintDais(),
    card: [paintCard(false, false), paintCard(true, false)], cardWorn: [paintCard(false, true), paintCard(true, true)],
    equip: paintPlate(EQUIPR.w, EQUIPR.h), equipP: paintPlate(EQUIPR.w, EQUIPR.h, true),
    chip: paintPlate(44, BAR_H, false, false), chipOn: paintPlate(44, BAR_H, false, true),
    chipW: paintPlate(54, BAR_H, false, false),
    bestBtn: paintPlate(72, BAR_H, false, true), bestBtnP: paintPlate(72, BAR_H, true, true),
    done: paintPlate(DONER.w, DONER.h), doneP: paintPlate(DONER.w, DONER.h, true),
    gaunt: buildGauntlet(false), gauntP: buildGauntlet(true),
    glyph: {}, itemArt: {}, dyn: new Map(), txt: {} };
  for (const s of ['helm', 'armor', 'cloak', 'weapon', 'shield', 'boots', 'ring1', 'ring2', 'amulet', 'trinket']) {
    A.glyph[s] = { dim: paintGlyph(s, false), lit: paintGlyph(s, true) };
  }
  A.txt.title = t2('GEAR', 'bold 25px "Pixelify Sans"', '#f6d888', { spacing: 3 });
  A.txt.titleSh = t2('GEAR', 'bold 25px "Pixelify Sans"', '#1a0d08', { spacing: 3 });
  A.txt.doll = t2('THE SELLSWORD', 'bold 11px "Pixelify Sans"', '#8a6a3c', { spacing: 2 });
  A.txt.satchel = t2('· THE SATCHEL ·', 'bold 11px "Pixelify Sans"', '#8a5f2e', { spacing: 2 });
  A.txt.equip = t2('EQUIP', 'bold 11px "Pixelify Sans"', '#d8ffb0');
  A.txt.equipSh = t2('EQUIP', 'bold 11px "Pixelify Sans"', '#142008');
  A.txt.worn = t2('WORN', 'bold 11px "Pixelify Sans"', '#ffe9a0');
  A.txt.wornSh = t2('WORN', 'bold 11px "Pixelify Sans"', '#241208');
  A.txt.best = t2('EQUIP BEST', 'bold 10px "Pixelify Sans"', '#e8ffd0');
  A.txt.bestSh = t2('EQUIP BEST', 'bold 10px "Pixelify Sans"', '#142008');
  A.txt.doneLbl = t2('DONE', 'bold 15px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 15px "Pixelify Sans"', '#241208');
  A.txt.hint = t2('G / Esc close · Wheel scroll · Click slot to filter', '12px "Pixelify Sans"', '#8a6a3c');
  A.txt.empty = t2('No matching gear.', '13px "Pixelify Sans"', '#8a6a3c');
  A.txt.upg = t2('↑', 'bold 13px "Pixelify Sans"', '#2e5a1c');
  A.txt.dn = t2('↓', 'bold 12px "Pixelify Sans"', '#9e2a36');
}

// ---------- filtering, sorting & scrolling ----------
function filteredItems() {
  const inv = cb.inventory();
  let list = inv.filter(it => {
    if (D.slotFilter !== 'all' && it.slot !== D.slotFilter) return false;
    if (D.upgradesOnly && (it.equipped || cb.compareItem(it).delta <= 0)) return false;
    return true;
  });
  const cmp = (a, b) => {
    if (D.sort === 'slot') {
      if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
      return cb.itemPower(b) - cb.itemPower(a) || a.name.localeCompare(b.name);
    }
    if (D.sort === 'name') return a.name.localeCompare(b.name);
    // 'best': upgrades first -> equipped -> power -> sequence
    const da = a.equipped ? 0.5 : (cb.compareItem(a).delta > 0 ? 2 : cb.compareItem(a).delta === 0 ? 0 : -1);
    const db = b.equipped ? 0.5 : (cb.compareItem(b).delta > 0 ? 2 : cb.compareItem(b).delta === 0 ? 0 : -1);
    if (da !== db) return db - da;
    const dp = cb.itemPower(b) - cb.itemPower(a);
    if (dp !== 0) return dp;
    return (b.seq || 0) - (a.seq || 0);
  };
  return list.slice().sort(cmp);
}

function clampScroll(list) {
  const maxS = Math.max(0, list.length - ROWS_VIS);
  D.scroll = clamp(D.scroll | 0, 0, maxS);
  return maxS;
}

// ---------- state ----------
export function reset() {
  D = { Eref: cb.E, tNow: 0, line14At: null, nudged: false, chimeAt: 0, pulseShown: false,
        openAt: null, closeAt: null, pressAt: null, pressId: null, selId: null, scroll: 0,
        slotFilter: 'all', upgradesOnly: false, sort: 'best', hoverXY: null,
        lastClickId: null, lastClickAt: -9, bestFeedbackAt: -9, bestCount: 0,
        equippedAt: null, snorted: false, doneAt: null, statsKey: null, statsTxt: null };
  setGearPulse(false); setTileLocked('gear', true); setGearBadge(0);
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
  const list = filteredItems();
  const out = { line14: D.line14At === null ? null : +D.line14At.toFixed(2), pulse: D.pulseShown, open: D.openAt !== null,
    selId: D.selId, scroll: D.scroll, slotFilter: D.slotFilter, sort: D.sort,
    inv: cb.inventory().map(i => ({ id: i.id, equipped: i.equipped })), gear: cb.gearState(),
    equipped: D.equippedAt !== null, snorted: D.snorted, done: D.doneAt === null ? null : +D.doneAt.toFixed(2), tile: { ...TILE } };
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(D.tNow));
    out.panel = { x: px, y: py, w: PANW, h: PANH };
    out.rows = list.slice(D.scroll, D.scroll + ROWS_VIS).map((it, v) => ({
      id: it.id, x: px + SATX, y: py + ROWY0 + v * (ROWH + ROWGAP), w: LISTW, h: ROWH,
      equip: { x: px + SATX + EQUIPR.x, y: py + ROWY0 + v * (ROWH + ROWGAP) + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h },
    }));
    out.slots = {};
    for (const [sl, sx, sy] of SLOTS) out.slots[sl] = { x: px + DOLLY.x + sx, y: py + DOLLY.y + sy, w: SLOTW, h: SLOTW };
    out.equipBestRect = { x: px + SATX + SATW - 72, y: py + BAR_Y, w: 72, h: BAR_H };
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

function openScreen(t) {
  D.openAt = t; D.closeAt = null;
  D.pulseShown = false; setGearPulse(false); setGearBadge(0);
  const inv = cb.inventory();
  for (const it of inv) buildItemArt(it);
  const list = filteredItems();
  const tin = list.find(i => i.id === 'pietin' && !i.equipped);
  D.selId = tin ? tin.id : (list[0] ? list[0].id : null);
  D.scroll = 0;
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
  D.selId = item.id;
  if (item.equipped) {
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
function runEquipBest(t) {
  const s = cb.warp(t);
  D.pressAt = t; D.pressId = 'best';
  const changed = cb.equipBest(s);
  D.bestFeedbackAt = t;
  D.bestCount = changed.length;
  if (changed.some(i => i.id === 'pietin') && D.equippedAt === null) {
    D.equippedAt = t;
    cb.E.live.push({ s: s + 0.18, k: 'chime' }, { s: s + 0.34, k: 'ding' });
  } else if (!changed.length) {
    cb.E.live.push({ s, k: 'paper' });
  }
}

// ---------- toolbar layout helper ----------
function toolbarRects(px, py) {
  const y = py + BAR_Y;
  const hasSlot = D.slotFilter !== 'all';
  const allR = { x: px + SATX, y, w: 28, h: BAR_H };
  const upgR = { x: allR.x + allR.w + 3, y, w: 34, h: BAR_H };
  const slotR = hasSlot ? { x: upgR.x + upgR.w + 3, y, w: 48, h: BAR_H } : null;
  const bestR = { x: px + SATX + SATW - 74, y, w: 74, h: BAR_H };
  const sortR = { x: bestR.x - 45, y, w: 42, h: BAR_H };
  return { allR, upgR, slotR, sortR, bestR };
}

// ---------- input ----------
export function hover(gx, gy) {
  if (!D) return;
  D.hoverXY = gx === null ? null : [gx, gy];
}

export function wheel(deltaY) {
  if (!D || D.openAt === null) return false;
  const list = filteredItems();
  const maxS = Math.max(0, list.length - ROWS_VIS);
  if (maxS <= 0) return true;
  D.scroll = clamp(D.scroll + (deltaY > 0 ? 1 : -1), 0, maxS);
  return true;
}

export function click(gx, gy, t) {
  if (!D) return false;
  if (D.line14At === null) {
    if (inTile(gx, gy)) { D.pressAt = t; const s2 = cb.warp(t); cb.E.live.push({ s: s2, k: 'paper' }, { s: s2 + 0.07, k: 'paper' }); return true; }
    return false;
  }
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(t));
    const list = filteredItems();
    const maxS = clampScroll(list);
    const inR = (r) => r && gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h;

    // toolbar buttons: ALL, UPG, active slot clear, SORT, EQUIP BEST
    const tb = toolbarRects(px, py);
    if (inR(tb.allR)) { D.slotFilter = 'all'; D.upgradesOnly = false; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.upgR)) { D.upgradesOnly = !D.upgradesOnly; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.slotR)) { D.slotFilter = 'all'; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.sortR)) { D.sort = SORTS[(SORTS.indexOf(D.sort) + 1) % SORTS.length]; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.bestR)) { runEquipBest(t); return true; }

    // scrollbar click (page up / page down / jump)
    const sr = { x: px + SCROLLR.x - 2, y: py + SCROLLR.y, w: SCROLLR.w + 4, h: SCROLLR.h };
    if (inR(sr) && maxS > 0) {
      const frac = clamp((gy - sr.y) / sr.h);
      D.scroll = clamp(Math.round(frac * maxS), 0, maxS);
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }

    // satchel rows
    for (let v = 0; v < ROWS_VIS; v++) {
      const i = D.scroll + v; if (i >= list.length) break;
      const it = list[i];
      const X = px + SATX, Y = py + ROWY0 + v * (ROWH + ROWGAP);
      if (gx >= X && gx < X + LISTW && gy >= Y && gy < Y + ROWH) {
        const er = { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h };
        if (inR(er)) { equip(t, it); return true; }
        const dbl = D.lastClickId === it.id && t - D.lastClickAt < 0.42;
        D.lastClickId = it.id; D.lastClickAt = t;
        if (dbl) equip(t, it);
        else { D.selId = it.id; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); }
        return true;
      }
    }

    // paper-doll slots: click filters satchel to that slot (toggle) & selects worn item if any
    for (const [sl, sx, sy] of SLOTS) {
      const X = px + DOLLY.x + sx, Y = py + DOLLY.y + sy;
      if (gx >= X && gx < X + SLOTW && gy >= Y && gy < Y + SLOTW) {
        const fam = cb.slotFamily(sl);
        D.slotFilter = D.slotFilter === fam ? 'all' : fam;
        D.upgradesOnly = false;
        D.scroll = 0;
        const g = cb.gearState();
        if (g[sl]) D.selId = g[sl];
        else {
          const nextList = filteredItems();
          if (nextList.length) D.selId = nextList[0].id;
        }
        cb.E.live.push({ s: cb.warp(t), k: 'paper' });
        return true;
      }
    }

    const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
    const inPanel = gx >= px && gx < px + PANW && gy >= py && gy < py + PANH;
    if (inR(dr) || !inPanel) closeScreen(t);
    return true;
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
    const list = filteredItems();
    const maxS = clampScroll(list);
    const curIdx = Math.max(0, list.findIndex(i => i.id === D.selId));
    if (k === 'ArrowUp' && list.length) {
      const ni = (curIdx + list.length - 1) % list.length;
      D.selId = list[ni].id;
      if (ni < D.scroll) D.scroll = ni; else if (ni >= D.scroll + ROWS_VIS) D.scroll = Math.min(maxS, ni - ROWS_VIS + 1);
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }
    if (k === 'ArrowDown' && list.length) {
      const ni = (curIdx + 1) % list.length;
      D.selId = list[ni].id;
      if (ni < D.scroll) D.scroll = ni; else if (ni >= D.scroll + ROWS_VIS) D.scroll = Math.min(maxS, ni - ROWS_VIS + 1);
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }
    if (k === 'PageUp' && list.length) { D.scroll = clamp(D.scroll - ROWS_VIS, 0, maxS); return true; }
    if (k === 'PageDown' && list.length) { D.scroll = clamp(D.scroll + ROWS_VIS, 0, maxS); return true; }
    if (k === 'Enter' || k === ' ') { const it = list.find(i => i.id === D.selId) || list[0]; if (it) equip(t, it); return true; }
    if (k === 'b' || k === 'B') { runEquipBest(t); return true; }
  }
  return false;
}

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {
    const hard = D.line14At !== null || D.equippedAt !== null;
    D.Eref = cb.E;
    if (hard) reset();
  }
  D.tNow = t;
  const s = cb.warp(t);
  const tinWorn = cb.inventory().some(i => i.id === 'pietin' && i.equipped);

  if (D.line14At === null) {
    const b7 = beat7.debug();
    if (!b7 || b7.done === null || s < b7.done + 0.45 || busyLine(s)) return;
    if (!cb.inventory().length) return;
    setTileLocked('gear', false);
    if (tinWorn) {
      // already equipped directly from the Loot Toast — acknowledge with Elminster's snort cleanly
      D.line14At = s;
      D.equippedAt = t;
      D.snorted = true;
      ui.snort(t); act.addPuff(t);
      say('line14b', s + 0.2);
      return;
    }
    D.line14At = s + 0.1; say('line14', D.line14At);
    return;
  }

  // if the player clicked EQUIP on the Loot Toast while line14 was active, sync seamlessly
  if (tinWorn && D.equippedAt === null) {
    D.equippedAt = t;
    D.pulseShown = false;
    setGearPulse(false);
    setGearBadge(0);
  }

  const tutor = D.openAt === null && D.equippedAt === null;
  const pulse = tutor && s >= D.line14At + NUDGE.pulse;
  if (pulse !== D.pulseShown) { D.pulseShown = pulse; setGearPulse(pulse); }
  if (pulse && s >= D.chimeAt) { cb.E.live.push({ s, k: 'chime' }); D.chimeAt = s + 2.5; }
  if (!D.nudged && tutor && s >= D.line14At + NUDGE.line && !busyLine(s)) {
    D.nudged = true; say('gearNudge', s);
  }

  if (D.closeAt !== null && t > D.closeAt + 0.28) { D.openAt = null; D.closeAt = null; }
  if (D.equippedAt !== null && D.openAt === null && D.closeAt === null && !D.snorted && !busyLine(s)) {
    D.snorted = true;
    ui.snort(t); act.addPuff(t);
    say('line14b', s + 0.25);
  }
  if (D.doneAt === null && D.snorted && s > lineEnd(DIALOGUE.line14b) + 1.1) D.doneAt = s;
}

// ---------- spotlights ----------
export function drawSpot(ctx, p, t) {
  if (!D || D.line14At === null || D.equippedAt !== null || D.openAt !== null) return;
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

function drawBanner(ctx, s) {
  if (D.equippedAt !== null || D.openAt !== null) return;
  const at = DIALOGUE.line14.at;
  if (!isFinite(at) || s < at + 0.4) return;
  const label = 'OPEN THE GEAR SCREEN', w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3));
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
  const pulse = s >= D.line14At + NUDGE.pulse ? Math.abs(Math.sin(s * 3.2)) : 0;
  ctx.globalAlpha = clamp(k);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = pulse > 0.5 ? '#8a5a12' : '#5a3414'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = '#7e4c20'; ctx.fillRect(X, Y, w, 1);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
  const bx = X + 7, by = Y + 7;
  ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 1, by - 2, 3, 5); ctx.fillRect(bx - 2, by - 1, 5, 3);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by - 1, 1, 1);
  num(ctx, label, X + 13, Y + 4, ['#ffe7a0', '#ffffff'], 'l');
  ctx.globalAlpha = 1;
}

function drawPointer(ctx, s) {
  if (D.equippedAt !== null || D.openAt !== null) return;
  const k = easeOut(clamp((s - D.line14At - NUDGE.pointer) / 0.4));
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
function drawScreen(ctx, uctx, t) {
  const k = panelK(t);
  if (k <= 0.02) return;
  const ak = clamp(k * 1.4);
  const [px, py] = panelPos(k);
  const inv = cb.inventory();
  for (const it of inv) buildItemArt(it);
  const list = filteredItems();
  const maxS = clampScroll(list);
  const gear = cb.gearState();

  const hs = cb.hudState(t);
  const sKey = `${hs.hp}/${hs.hpMax}|${gear.hpBonus || 0}`;
  if (D.statsKey !== sKey) {
    D.statsKey = sKey;
    const bonusStr = gear.hpBonus > 0 ? ` (+${gear.hpBonus} HP gear)` : '';
    D.statsTxt = t2(`HP ${hs.hp}/${hs.hpMax} · AC 16${bonusStr}`, 'bold 12px "Pixelify Sans"', '#3b2418');
  }

  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);

  u.globalAlpha = 0.55 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.45)');
  IMG(A.panel, px, py);

  // ---- Left: Paper-doll + interactive slots ----
  const dx = px + DOLLY.x, dy = py + DOLLY.y;
  IMG(A.dais, dx, dy);
  const flashD = D.equippedAt === null ? -1 : t - D.equippedAt;
  act.drawHeroPractice(u, flashD >= 0 && flashD < 0.7 ? 'ready2' : 'ready', dx + DOLLY.w / 2, dy + DOLLFEET, S);
  if (flashD >= 0 && flashD < 0.7) {
    const q = flashD / 0.7, Rr = 6 + q * 40;
    u.globalAlpha = ak * (1 - q) * 0.9;
    for (let i = 0; i < 22; i++) { const a2 = i / 22 * Math.PI * 2; R(dx + DOLLY.w / 2 + Math.cos(a2) * Rr, dy + 76 + Math.sin(a2) * Rr * 0.8, 2, 2, q < 0.3 ? '#fff8dc' : '#ffd25a'); }
    u.globalAlpha = ak;
  }

  let selIt = list.find(i => i.id === D.selId) || inv.find(i => i.id === D.selId) || list[0] || inv[0] || null;
  if (selIt && D.selId !== selIt.id) D.selId = selIt.id;
  const selFam = selIt ? (selIt.slot === 'ring' ? ['ring1', 'ring2'] : [selIt.slot]) : [];
  let hoveredSlot = null;

  for (const [sl, sx, sy] of SLOTS) {
    const X = dx + sx, Y = dy + sy, worn = gear[sl];
    const fam = cb.slotFamily(sl);
    const filtered = D.slotFilter === fam;
    const isHover = D.hoverXY && D.hoverXY[0] >= X && D.hoverXY[0] < X + SLOTW && D.hoverXY[1] >= Y && D.hoverXY[1] < Y + SLOTW;
    if (isHover) hoveredSlot = sl;
    const hot = selFam.includes(sl);
    R(X, Y, SLOTW, SLOTW, filtered ? '#f6d888' : '#140b0c');
    R(X + 1, Y + 1, SLOTW - 2, SLOTW - 2, worn ? '#4a3418' : '#241812');
    R(X + 1, Y + 1, SLOTW - 2, 1, worn ? '#c4943a' : '#3f2c1c');
    if (hot || isHover || filtered) {
      const kp = 0.5 + 0.5 * Math.sin(t * 4.6);
      u.globalAlpha = ak * (filtered || isHover ? 0.95 : 0.35 + 0.4 * kp);
      const col = isHover || filtered ? '#fff1b8' : '#ffd25a';
      R(X - 1, Y - 1, SLOTW + 2, 1, col); R(X - 1, Y + SLOTW, SLOTW + 2, 1, col);
      R(X - 1, Y - 1, 1, SLOTW + 2, col); R(X + SLOTW, Y - 1, 1, SLOTW + 2, col);
      u.globalAlpha = ak;
    }
    if (worn) {
      const wIt = inv.find(i2 => i2.id === worn);
      if (wIt) { buildItemArt(wIt); IMG(A.itemArt[wIt.id].icon, X + 1, Y + 3); }
    } else {
      IMG(A.glyph[sl].dim, X + 4, Y + 4);
    }
  }

  // tooltip pill inside bottom of dais when hovering a slot
  if (hoveredSlot) {
    const wId = gear[hoveredSlot];
    const wIt = wId ? inv.find(i => i.id === wId) : null;
    const tipStr = wIt ? `${SLOT_LABEL[hoveredSlot]}: ${wIt.name}` : `${SLOT_LABEL[hoveredSlot]} · Empty (click filter)`;
    const tipImg = dynTxt('tip', tipStr, 'bold 10px "Pixelify Sans"', '#ffe9a0');
    R(dx + 4, dy + DOLLY.h - 15, DOLLY.w - 8, 12, 'rgba(20,11,12,0.86)');
    put(u, tipImg, dx + DOLLY.w / 2, dy + DOLLY.h - 9, 'c', 'm');
  }

  // ---- Right: Filter / Sort / Equip Best Toolbar ----
  const tb = toolbarRects(px, py);
  const chip = (r, lbl, on) => {
    IMG(paintPlateMemo(r.w, r.h, on), r.x, r.y);
    const tImg = dynTxt('chip', lbl, 'bold 10px "Pixelify Sans"', on ? '#e8ffd0' : '#ffe9a0');
    put(u, tImg, r.x + r.w / 2, r.y + r.h / 2, 'c', 'm');
  };
  chip(tb.allR, 'ALL', D.slotFilter === 'all' && !D.upgradesOnly);
  chip(tb.upgR, 'UPG', D.upgradesOnly);
  if (tb.slotR) chip(tb.slotR, `${SLOT_LABEL[D.slotFilter] || D.slotFilter} ×`, true);
  chip(tb.sortR, SORT_LBL[D.sort], false);

  const bestPressed = D.pressAt !== null && t - D.pressAt < 0.14 && D.pressId === 'best';
  IMG(paintPlateMemo(tb.bestR.w, tb.bestR.h, true, bestPressed), tb.bestR.x, tb.bestR.y + (bestPressed ? 1 : 0));
  const bestShowMsg = t - D.bestFeedbackAt < 1.1;
  const bestLbl = bestShowMsg ? (D.bestCount > 0 ? `+${D.bestCount} WORN` : 'BEST WORN') : 'EQUIP BEST';
  put(u, dynTxt('bestS', bestLbl, 'bold 10px "Pixelify Sans"', '#142008'), tb.bestR.x + tb.bestR.w / 2, tb.bestR.y + tb.bestR.h / 2 + 1 + (bestPressed ? 1 : 0), 'c', 'm');
  put(u, dynTxt('best', bestLbl, 'bold 10px "Pixelify Sans"', '#e8ffd0'), tb.bestR.x + tb.bestR.w / 2, tb.bestR.y + tb.bestR.h / 2 + (bestPressed ? 1 : 0), 'c', 'm');

  // ---- Right: Scrollable Satchel List (5 compact rows) ----
  if (!list.length) {
    put(u, A.txt.empty, px + SATX + LISTW / 2, py + ROWY0 + 54, 'c');
  }
  for (let v = 0; v < ROWS_VIS; v++) {
    const i = D.scroll + v; if (i >= list.length) break;
    const it = list[i], IA = A.itemArt[it.id], sel = selIt && it.id === selIt.id;
    const X = px + SATX, Y = py + ROWY0 + v * (ROWH + ROWGAP);
    u.globalAlpha = ak * (sel ? 1 : 0.92);
    IMG(it.equipped ? A.cardWorn[sel ? 1 : 0] : A.card[sel ? 1 : 0], X, Y);
    u.globalAlpha = ak;
    // small framed icon box
    R(X + 5, Y + 5, 20, 18, '#3b2418');
    R(X + 6, Y + 6, 18, 16, '#c49a64');
    u.drawImage(IA.icon, Math.round((X + 6) * S), Math.round((Y + 6) * S), 18 * S, 16 * S);

    put(u, IA.name, X + 29, Y + 4);
    put(u, IA.sub, X + 29, Y + 15);

    // upgrade delta / worn indicator
    const cmp = cb.compareItem(it);
    if (!it.equipped && cmp.delta > 0) {
      put(u, A.txt.upg, X + EQUIPR.x - 10, Y + ROWH / 2, 'c', 'm');
    } else if (!it.equipped && cmp.delta < 0) {
      put(u, A.txt.dn, X + EQUIPR.x - 10, Y + ROWH / 2, 'c', 'm');
    }

    // single-click EQUIP / WORN plate
    const er = { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h };
    const pressed = D.pressAt !== null && t - D.pressAt < 0.14 && D.pressId === it.id;
    if (!it.equipped && D.equippedAt === null) {
      const kp = 0.5 + 0.5 * Math.sin(t * 4.6);
      u.save(); u.globalCompositeOperation = 'lighter'; u.globalAlpha = ak * (0.12 + 0.18 * kp);
      u.fillStyle = '#ffd25a'; u.fillRect((er.x - 2) * S, (er.y - 2) * S, (er.w + 4) * S, (er.h + 4) * S);
      u.restore();
    }
    u.globalAlpha = ak * (it.equipped ? 0.9 : 1);
    IMG(pressed ? A.equipP : A.equip, er.x, er.y + (pressed ? 1 : 0));
    u.globalAlpha = ak;
    if (!it.equipped) {
      const ax = er.x + 6, ay = er.y + 9 + (pressed ? 1 : 0);
      R(ax - 1, ay - 3, 2, 1, '#142008'); R(ax - 2, ay - 2, 4, 1, '#142008'); R(ax - 1, ay - 1, 2, 4, '#142008');
      R(ax - 1, ay - 3, 2, 1, '#9ae070'); R(ax - 2, ay - 2, 4, 1, '#7ec850'); R(ax - 1, ay - 1, 2, 4, '#7ec850');
    }
    put(u, it.equipped ? A.txt.wornSh : A.txt.equipSh, er.x + er.w / 2 + (it.equipped ? 0 : 4), er.y + er.h / 2 + 1 + (pressed ? 1 : 0), 'c', 'm');
    put(u, it.equipped ? A.txt.worn : A.txt.equip, er.x + er.w / 2 + (it.equipped ? 0 : 4), er.y + er.h / 2 + (pressed ? 1 : 0), 'c', 'm');

    if (D.equippedAt !== null && it.id === 'pietin') {
      const fd = t - D.equippedAt;
      if (fd >= 0 && fd < 1.5) {
        u.globalAlpha = ak * (fd > 0.9 ? 1 - (fd - 0.9) / 0.6 : 1);
        num(u, '+1 MAX HP', (X + LISTW / 2) * S, (Y + 6 - Math.round(fd * 12)) * S, ['#b8f090', '#eaffd0', '#3c6a2a'], 'c', { outline: '#241208', scale: S });
        u.globalAlpha = ak;
      }
    }
  }

  // ---- Brass Scrollbar ----
  const srx = px + SCROLLR.x, sry = py + SCROLLR.y;
  R(srx, sry, SCROLLR.w, SCROLLR.h, '#140b0c');
  R(srx + 1, sry + 1, SCROLLR.w - 2, SCROLLR.h - 2, '#5a3c22');
  if (maxS > 0) {
    const th = Math.max(18, Math.round((ROWS_VIS / list.length) * (SCROLLR.h - 2)));
    const ty = sry + 1 + Math.round((D.scroll / maxS) * (SCROLLR.h - 2 - th));
    R(srx + 1, ty, SCROLLR.w - 2, th, '#c4943a');
    R(srx + 1, ty, SCROLLR.w - 2, 1, '#f6d888');
  } else {
    R(srx + 2, sry + 2, SCROLLR.w - 4, SCROLLR.h - 4, '#7a5634');
  }

  // ---- Comparison & Detail Footer ----
  const fx = px + FOOTR.x, fy = py + FOOTR.y;
  R(fx, fy, FOOTR.w, FOOTR.h, '#140b0c');
  R(fx + 1, fy + 1, FOOTR.w - 2, FOOTR.h - 2, '#d8b988');
  R(fx + 1, fy + 1, FOOTR.w - 2, 1, '#8a5f2e');
  if (selIt) {
    const cmp = cb.compareItem(selIt);
    const cmpStr = selIt.equipped
      ? `Currently equipped in ${SLOT_LABEL[selIt.slot] || selIt.slot}`
      : cmp.worn
        ? `Replaces: ${cmp.worn.name} (${cmp.delta > 0 ? 'Upgrade' : cmp.delta < 0 ? 'Weaker' : 'Sidegrade'})`
        : `${SLOT_LABEL[selIt.slot] || selIt.slot} slot empty — ready to equip`;
    const cmpCol = selIt.equipped ? '#2e5a1c' : cmp.delta > 0 ? '#2e5a1c' : cmp.delta < 0 ? '#7a2820' : '#5a3a22';
    put(u, dynTxt('cmp', cmpStr, 'bold 11px "Pixelify Sans"', cmpCol), fx + 6, fy + 5);
    put(u, A.itemArt[selIt.id].note, fx + 6, fy + 17);
  }

  // ---- Tutorial Gauntlet ----
  const tinIdx = list.findIndex(i2 => i2.id === 'pietin');
  if (D.equippedAt === null && tinIdx >= 0) {
    const inView = tinIdx >= D.scroll && tinIdx < D.scroll + ROWS_VIS;
    const ph = (t % 1.15) / 1.15, press = ph > 0.55 && ph < 0.72;
    const gx2 = inView ? Math.round(px + SATX + EQUIPR.x + EQUIPR.w / 2 + 10) : Math.round(tb.bestR.x + tb.bestR.w / 2 + 8);
    const gy2 = inView ? Math.round(py + ROWY0 + (tinIdx - D.scroll) * (ROWH + ROWGAP) + EQUIPR.y + 12) : Math.round(tb.bestR.y + 12);
    const ox = press ? 0 : 3 + Math.round(Math.sin(ph * Math.PI * 2) * 1), oy = press ? 0 : 5;
    IMG(press ? A.gauntP : A.gaunt, gx2 - GAUNTLET_TIP[0] + ox, gy2 - GAUNTLET_TIP[1] + oy);
  }

  // ---- Header, Stats, Hint & DONE ----
  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  IMG(A.done, dr.x, dr.y);
  put(u, A.txt.titleSh, px + PANW / 2, py + 25.5, 'c', 'm');
  put(u, A.txt.title, px + PANW / 2, py + 24.5, 'c', 'm');
  put(u, A.txt.doll, dx + DOLLY.w / 2, py + 40, 'c');
  put(u, dynTxt('sat', `· SATCHEL (${list.length}/${inv.length}) ·`, 'bold 11px "Pixelify Sans"', '#8a5f2e', { spacing: 1 }), px + SATX, py + 40);
  put(u, A.txt.doneSh, dr.x + dr.w / 2, dr.y + dr.h / 2 + 1, 'c', 'm');
  put(u, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + dr.h / 2, 'c', 'm');
  put(u, A.txt.hint, dr.x - 10, py + 269, 'r');
  put(u, D.statsTxt, dx + DOLLY.w / 2, dy + DOLLY.h + 6, 'c');
  u.globalAlpha = 1;
}

const plateMemo = new Map();
function paintPlateMemo(w, h, green = false, pressed = false) {
  const k = `${w}x${h}|${green ? 1 : 0}|${pressed ? 1 : 0}`;
  if (!plateMemo.has(k)) plateMemo.set(k, paintPlate(w, h, pressed, green));
  return plateMemo.get(k);
}
