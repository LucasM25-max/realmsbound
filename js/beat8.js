// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 8 — the Gear & Armoury Screen
//
//  Hanging wooden board sub-tabs (Paper Doll active; The Smithy,
//  Bag & Filter, and Glamour greyed & padlocked with unlock stages),
//  interactive 10-slot Sellsword Paper Doll on a carved dais,
//  Loadouts strip, sortable/filterable Satchel with upgrade arrows
//  and EQUIP BEST, plus smart Comparison & Flavor footer.
// ─────────────────────────────────────────────────────────────
import { W, H, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat7 from './beat7.js';
import { setGearPulse, setTileLocked, setGearBadge } from './hud.js';
import * as act from './actors.js';
import * as ui from './ui.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { makeCanvas, crispText, clamp, easeOut, easeOutBack, hash } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const TILE = { x: 580, y: 329, w: 26, h: 29 };
const inTile = (gx, gy) => gx >= TILE.x && gx < TILE.x + TILE.w && gy >= TILE.y && gy < TILE.y + TILE.h;

const PANW = 468, PANH = 304, PANX = 86, PANY = 28;
const DOLLY = { x: 12, y: 58, w: 164, h: 178 };
const DOLLFEET = 152;
const SLOTW = 24;
const SLOTS = [
  ['helm', 52, 6], ['amulet', 88, 6],
  ['armor', 5, 38], ['cloak', 135, 38],
  ['weapon', 5, 68], ['shield', 135, 68],
  ['boots', 5, 98], ['trinket', 135, 98],
  ['ring1', 5, 128], ['ring2', 135, 128],
];
const SLOT_LABEL = {
  helm: 'HELM', amulet: 'AMULET', armor: 'ARMOR', cloak: 'CLOAK', weapon: 'WEAPON',
  shield: 'SHIELD', boots: 'BOOTS', trinket: 'TRINKET', ring1: 'RING 1', ring2: 'RING 2', ring: 'RING',
};
const SUBTABS = [
  { id: 'doll', label: 'Paper Doll', x: 12, w: 107, stage: 1 },
  { id: 'smithy', label: 'Smithy · Stg 10', x: 124, w: 107, stage: 10 },
  { id: 'bag', label: 'Bag · Stg 15', x: 236, w: 107, stage: 15 },
  { id: 'glamour', label: 'Glamour · Stg 25', x: 348, w: 107, stage: 25 },
];
const SATX = 186, SATW = 270;
const BAR_Y = 58, BAR_H = 18;
const ROWY0 = 81, ROWH = 27, ROWGAP = 3, ROWS_VIS = 5;
const LISTW = 258, LISTH = ROWS_VIS * ROWH + (ROWS_VIS - 1) * ROWGAP;
const SCROLLR = { x: SATX + 262, y: ROWY0, w: 8, h: LISTH };
const EQUIPR = { x: LISTW - 50, y: 4, w: 45, h: 19 };
const FOOTR = { x: SATX, y: 233, w: SATW, h: 34 };
const DONER = { x: PANW - 76, y: 270, w: 64, h: 24 };
const NUDGE = { pointer: 6, line: 15, pulse: 30 };
const SORTS = ['best', 'slot', 'name'];
const SORT_LBL = { best: 'BEST', slot: 'SLOT', name: 'NAME' };

let D = null, A = null, SPOT8 = null;

function t2(str, font, col, opts = {}) {
  const c = crispText(str.replace(/f(?=[ilft])/g, 'f\u200C'), font, col, { threshold: 115, ...opts });
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  let x1 = 0, y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) {
    if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  c.inkW = Math.max(1, x1 - 4 + 1);
  c.inkTop = y0 === c.height ? 0 : y0;
  c.inkH = y1 >= y0 ? y1 - y0 + 1 : 0;
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

// ---------- pixel item & slot art ----------
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
    ell(11, 8, 8.4, 4.6, (u, v) => TINPAL[clamp(Math.round(2.8 - v * 2.2 - u * 0.4), 0, 5)]);
    ell(11, 12.2, 10.2, 2.8, (u, v) => v < 0 ? TINPAL[3] : TINPAL[1]);
    ell(11, 11.4, 8.8, 1.8, (u) => TINPAL[clamp(Math.round(3 - u * 1.2), 1, 5)]);
    for (let i = 2; i < 20; i += 3) fill(TINPAL[0], i, 12);
    fill('#ffffff', 7, 5, 2, 1); fill(TINPAL[5], 6, 6);
    fill(BERRY[1], 14, 7, 3, 2); fill(BERRY[3], 15, 7);
  } else {
    ell(11, 12.6, 10.0, 2.8, () => TINPAL[2]);
    ell(11, 12.0, 9.2, 2.1, () => TINPAL[4]);
    ell(11, 9.2, 8.6, 4.5, (u, v) => BERRY[clamp(Math.round(2.5 - v * 1.6 - u * 0.4), 0, 4)]);
    for (let s = -7; s <= 7; s += 3) {
      for (let k = 0; k < 7; k++) {
        const px = Math.round(11 + s + k * 0.65), py = Math.round(6 + k * 0.85);
        if (px >= 3 && px <= 18 && py >= 5 && py <= 12) fill(CRUST[3], px, py);
        const px2 = Math.round(11 + s - k * 0.65);
        if (px2 >= 3 && px2 <= 18 && py >= 5 && py <= 12) fill(CRUST[2], px2, py);
      }
    }
    fill(CRUST[4], 4, 8); fill(CRUST[4], 7, 6);
    // Heroic missing bite at upper right
    x.clearRect(15, 5, 5, 4); x.clearRect(16, 4, 4, 2);
    fill(BERRY[0], 14, 7); fill(BERRY[0], 15, 8);
  }
  return c;
}

function paintGlyph(slot, lit) {
  const [c, x] = makeCanvas(16, 16);
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const F = lit
    ? ['#140b0c', '#7a5418', '#c4943a', '#e2b75a', '#fff1b8']
    : ['#181210', '#382a20', '#503d2e', '#685240', '#7e6650'];
  const drawMap = (rows, pal = F) => {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch !== '.') fill(pal[parseInt(ch, 10)], i, j);
    }
  };
  const MAPS = {
    helm: [
      '.....000000.....',
      '...0034443200...',
      '..034433322220..',
      '.03433222221120.',
      '.03322222211120.',
      '.02200002200000.',
      '.02201102201100.',
      '.02222233222210.',
      '..022233432210..',
      '..022200002210..',
      '...0220..0210...',
      '....00....00....',
    ],
    armor: [
      '..000......000..',
      '.03430000003430.',
      '0343322222233210',
      '0332223332222110',
      '.02223443322110.',
      '..022233322110..',
      '..022222222110..',
      '..022332233110..',
      '..022222222110..',
      '..012222221110..',
      '...0111111110...',
      '....00000000....',
    ],
    cloak: [
      '.....000000.....',
      '....03433220....',
      '...0332222120...',
      '..032223221120..',
      '..022233221110..',
      '.02222322211120.',
      '.02222222111110.',
      '.01222221111110.',
      '.0122122112110..',
      '..01101100110...',
      '......00..00....',
    ],
    weapon: [
      '...........000..',
      '..........04320.',
      '.........04320..',
      '........04320...',
      '.......04320....',
      '......04320.....',
      '..00.04320......',
      '..0304320.......',
      '...03430........',
      '..020320........',
      '.0210.00........',
      '.000............',
    ],
    shield: [
      '..000000000000..',
      '.03443332222120.',
      '.03433223322110.',
      '.03322234432110.',
      '.03222233322110.',
      '.02222222221110.',
      '..022222221110..',
      '..022222211110..',
      '...0122211110...',
      '....01211110....',
      '.....011110.....',
      '......0000......',
    ],
    boots: [
      '..0000....0000..',
      '.034320..034320.',
      '.033220..033220.',
      '.022210..022210.',
      '.022210..022210.',
      '.022210..022210.',
      '.023220..023220.',
      '0343220.0343220.',
      '0222220.0222220.',
      '0111110.0111110.',
      '.000000..000000.',
    ],
    ring1: [
      '......0000......',
      '....00344300....',
      '...0344003320...',
      '...0330..0210...',
      '..0320....0110..',
      '..0220....0110..',
      '...0210..0110...',
      '...011100110....',
      '....00111100....',
      '......0000......',
    ],
    amulet: [
      '...00......00...',
      '..0200....0020..',
      '...0200..0020...',
      '....02000020....',
      '.....034430.....',
      '....03433220....',
      '....03344210....',
      '....02233110....',
      '.....011110.....',
      '......0000......',
    ],
    trinket: [
      '....00000000....',
      '...0344433220...',
      '...0343322110...',
      '....02222110....',
      '.....022110.....',
      '......0320......',
      '......0210......',
      '.....033210.....',
      '....03432210....',
      '....00000000....',
    ],
  };
  const key = slot === 'ring2' ? 'ring1' : slot;
  const rows = MAPS[key] || MAPS.trinket;
  const oy = Math.floor((16 - rows.length) / 2);
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const ch = rows[j][i];
    if (ch !== '.') fill(F[parseInt(ch, 10)], i, oy + j);
  }
  return c;
}

function paintIcon(item) {
  if (item.icon === 'tin' || item.icon === 'pie') return paintSpoil(item.icon);
  const [c, x] = makeCanvas(22, 18);
  x.drawImage(paintGlyph(item.slot === 'ring' ? 'ring1' : item.slot, true), 3, 1);
  return c;
}

function paintPanel() {
  const [c, x] = makeCanvas(PANW, PANH);
  const O = '#140b0c';
  const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };

  fill(O, 0, 0, PANW, PANH);
  const B = 7;
  for (let j = 1; j < PANH - 1; j++) for (let i = 1; i < PANW - 1; i++) {
    const e = Math.min(i - 1, j - 1, PANW - 2 - i, PANH - 2 - j);
    if (e >= B) continue;
    const horiz = Math.min(j - 1, PANH - 2 - j) < Math.min(i - 1, PANW - 2 - i);
    const g = horiz ? Math.sin(i * 0.21 + j * 1.7 + Math.sin(i * 0.05) * 3) : Math.sin(j * 0.21 + i * 1.7 + Math.sin(j * 0.05) * 3);
    let k = 2 + (g > 0.6 ? 1 : g < -0.7 ? -1 : 0);
    const tl = (j - 1 === e && j < PANH / 2) || (i - 1 === e && i < PANW / 2);
    if (e === 0) k = tl ? 6 : 1;
    else if (e === 1) k = tl ? 5 : k - 1;
    else if (e === B - 2) k = tl ? 1 : 4;
    else if (e === B - 1) k = 0;
    fill(WOOD[Math.max(0, Math.min(6, k))], i, j);
  }
  const gi = 3;
  fill('#8a5f1e', gi, gi, PANW - gi * 2, 1); fill('#8a5f1e', gi, PANH - gi - 1, PANW - gi * 2, 1);
  fill('#8a5f1e', gi, gi, 1, PANH - gi * 2); fill('#8a5f1e', PANW - gi - 1, gi, 1, PANH - gi * 2);
  for (let i = 0; i < PANW - gi * 2; i += 8) { fill('#e8c068', gi + i, gi); fill('#e8c068', gi + i + 3, PANH - gi - 1); }

  const px0 = B + 1, py0 = B + 1, pw = PANW - px0 * 2, ph = PANH - py0 * 2;
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
    const e = Math.min(i, j, pw - 1 - i, ph - 1 - j);
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.15 + Math.sin(i * 0.09 + j * 0.05) * 0.14 - Math.max(0, 4 - e) * 0.38 - (j / ph) * 0.2;
    if (n > 0.968) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], px0 + i, py0 + j);
  }

  // Carved oak header beam (y = 8..29)
  fill(O, px0, 8, pw, 22);
  for (let j = 9; j < 29; j++) for (let i = px0; i < px0 + pw; i++) {
    const g = Math.sin(i * 0.18 + j * 1.4);
    let k = j === 9 ? 5 : j === 10 ? 4 : j === 28 ? 0 : j === 27 ? 1 : (2 + (g > 0.65 ? 1 : g < -0.65 ? -1 : 0));
    fill(WOOD[k], i, j);
  }
  fill('#8a5f1e', px0 + 2, 27, pw - 4, 1);

  // Dark leather strip behind the hanging sub-tab boards (y = 30..54)
  for (let j = 30; j < 55; j++) for (let i = px0; i < px0 + pw; i++) {
    const n = hash(i * 11 + j * 53, 21);
    fill(j === 30 ? '#140b0c' : j === 54 ? '#56361d' : n > 0.92 ? '#362116' : n < 0.08 ? '#23140e' : '#2c1b12', i, j);
  }
  fill('#140b0c', px0, 55, pw, 1);
  fill('#a87e48', px0, 56, pw, 1);

  // Brass corner caps with sapphires
  for (const [cx, cy] of [[0, 0], [PANW - 10, 0], [0, PANH - 10], [PANW - 10, PANH - 10]]) {
    fill(O, cx, cy, 10, 10);
    fill('#9a7026', cx + 1, cy + 1, 8, 8);
    fill('#d9a948', cx + 2, cy + 2, 6, 6);
    fill('#f6d888', cx + 2, cy + 2, 6, 1); fill('#f6d888', cx + 2, cy + 2, 1, 6);
    fill('#3f86c4', cx + 4, cy + 4, 2, 2); fill('#9fd4ff', cx + 4, cy + 4, 1, 1);
  }
  return c;
}

function paintHangingBoard(w, h, active, locked) {
  const totalH = h + 5;
  const [c, x] = makeCanvas(w, totalH);
  const O = '#140b0c';
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  const WOOD = active
    ? ['#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#c4943a']
    : ['#1d1c22', '#2a2830', '#36343e', '#45424e', '#585564'];

  for (const rx of [10, w - 13]) {
    fill(O, rx - 1, 0, 5, 1);
    fill(locked ? '#9e9aa8' : '#f6d888', rx, 0, 3, 1);
    for (let y = 1; y < 5; y++) {
      fill(O, rx - 1, y, 4, 1);
      fill(locked ? ((y % 2) ? '#9e9aa8' : '#4b4856') : ((y % 2) ? '#f6d888' : '#9a7026'), rx, y, 2, 1);
    }
    fill(O, rx - 2, 4, 6, 4);
    fill(locked ? '#747080' : '#c4943a', rx - 1, 5, 4, 2);
    fill(locked ? '#d2ceda' : '#fff1b8', rx - 1, 5, 2, 1);
  }
  fill('rgba(10,6,12,0.45)', 2, 7, w - 2, h);
  const py = 5;
  fill(O, 0, py, w, h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const g = Math.sin(i * 0.22 + j * 1.5);
    let k = active ? 2 : 1;
    if (g > 0.65) k++; else if (g < -0.7) k--;
    if (j === 1) k = active ? 5 : 4;
    else if (j === h - 2) k = 0;
    else if (j === Math.floor(h / 2)) k = Math.max(0, k - 1);
    fill(WOOD[Math.max(0, Math.min(WOOD.length - 1, k))], i, py + j);
  }
  for (const [nx, ny] of [[3, py + 3], [w - 5, py + 3], [3, py + h - 5], [w - 5, py + h - 5]]) {
    fill(locked ? '#4b4856' : '#c4943a', nx, ny, 2, 2);
    fill(locked ? '#878394' : '#fff1b8', nx, ny);
  }
  if (active) fill('#f6d888', 5, py + h - 2, w - 10, 1);
  return c;
}

function paintDais() {
  const [c, x] = makeCanvas(DOLLY.w, DOLLY.h);
  const O = '#140b0c';
  const PAR = ['#a87f4e', '#bd9663', '#d0ac79', '#dfc08f', '#e9d3a6'];
  const STO = ['#3a363e', '#56505c', '#746d7a', '#968e9c', '#b8b0be'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };

  fill(O, 0, 0, DOLLY.w, DOLLY.h);
  fill('#56361d', 1, 1, DOLLY.w - 2, DOLLY.h - 2);
  fill('#a1703f', 1, 1, DOLLY.w - 2, 1);
  fill(O, 2, 2, DOLLY.w - 4, DOLLY.h - 4);
  for (let j = 3; j < DOLLY.h - 3; j++) for (let i = 3; i < DOLLY.w - 3; i++) {
    const e = Math.min(i - 3, j - 3, DOLLY.w - 4 - i, DOLLY.h - 4 - j);
    const n = hash(i * 23 + j * 13, 41);
    let k = 3 - Math.max(0, 3 - e) * 0.45 - (j / DOLLY.h) * 0.4;
    if (n > 0.95) k -= 0.7; else if (n < 0.03) k += 0.6;
    fill(PAR[clamp(Math.round(k), 0, 4)], i, j);
  }
  // Faint radial sun-arch behind hero
  const cx = DOLLY.w / 2, cy = DOLLFEET - 24;
  for (let j = 28; j < DOLLFEET; j++) for (let i = 32; i < DOLLY.w - 32; i++) {
    const d = Math.hypot((i - cx) * 1.15, j - cy);
    if (d < 46 && hash(i * 7 + j * 19, 5) > 0.3) fill('rgba(255,244,210,0.22)', i, j);
  }
  // Carved stone & brass dais pedestal under hero boots
  const rx = 44, ry = 9, dc = DOLLY.w / 2, dy = DOLLFEET + 2;
  for (let j = -ry - 2; j <= ry + 6; j++) for (let i = -rx - 2; i <= rx + 2; i++) {
    const px = Math.round(dc + i), py = Math.round(dy + j);
    const topD = (i / rx) ** 2 + (j / ry) ** 2;
    const baseD = (i / rx) ** 2 + ((j - 5) / ry) ** 2;
    if (topD <= 1.08 && topD >= 0.96) fill(O, px, py);
    else if (topD < 0.96) {
      const n = hash(px * 17 + py * 31, 9);
      const k = 3 - (j > 0 ? 1 : 0) + (n > 0.92 ? -1 : n < 0.06 ? 1 : 0);
      fill(STO[clamp(k, 0, 4)], px, py);
      if (topD > 0.80 && j < 2) fill('#d9a948', px, py);
    } else if (j > 0 && baseD <= 1.05 && Math.abs(i) <= rx) {
      if (baseD >= 0.92 || Math.abs(i) >= rx - 1) fill(O, px, py);
      else fill(i < 0 ? '#7a5418' : '#5c3e12', px, py);
    }
  }
  return c;
}

function paintCard(sel, worn) {
  const [c, x] = makeCanvas(LISTW, ROWH);
  const O = '#140b0c';
  const PAR = ['#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, LISTW, ROWH);
  fill(sel ? '#d9a948' : worn ? '#4a7a32' : '#6e4727', 1, 1, LISTW - 2, ROWH - 2);
  fill(sel ? '#fff1b8' : worn ? '#88c85a' : '#a1703f', 1, 1, LISTW - 2, 1);
  fill(sel ? '#8a5f1e' : worn ? '#284a18' : '#3d2414', 1, ROWH - 2, LISTW - 2, 1);
  for (let j = 2; j < ROWH - 2; j++) for (let i = 2; i < LISTW - 2; i++) {
    const n = hash(i * 19 + j * 41, worn ? 12 : 4);
    let k = j < 10 ? 3 : j > 19 ? 1 : 2;
    if (n > 0.94) k++; else if (n < 0.06) k--;
    fill(PAR[clamp(k, 0, 4)], i, j);
  }
  return c;
}

function paintPlate(w, h, kind = 'oak', pressed = false) {
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  const palettes = {
    oak:    { b: ['#3e2a0c', '#c4943a', '#f6d888'], bg: pressed ? ['#24150c', '#362012'] : ['#4e311a', '#6e4727'] },
    green:  { b: ['#1d3414', '#c4943a', '#ffe9a0'], bg: pressed ? ['#1e3814', '#2e5420'] : ['#2e5820', '#42782e'] },
    gold:   { b: ['#5a3e10', '#d9a948', '#fff1b8'], bg: pressed ? ['#6e4816', '#8a5f1e'] : ['#8a5f1e', '#a8742a'] },
    locked: { b: ['#16151b', '#4b4856', '#65616f'], bg: ['#26242e', '#32303c'] },
  };
  const p = palettes[kind];
  fill(O, 0, 0, w, h);
  fill(p.b[1], 1, 1, w - 2, h - 2);
  fill(pressed ? p.b[0] : p.b[2], 1, 1, w - 2, 1);
  fill(pressed ? p.b[2] : p.b[0], 1, h - 2, w - 2, 1);
  for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
    fill(j < h / 2 ? p.bg[1] : p.bg[0], i, j);
  }
  return c;
}

function paintLockSmall() {
  const [c, x] = makeCanvas(7, 8);
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill('#140b0c', 1, 0, 5, 4);
  fill('#878394', 2, 0, 3, 1); fill('#878394', 1, 1, 1, 3); fill('#878394', 5, 1, 1, 3);
  x.clearRect(2, 1, 3, 2);
  fill('#140b0c', 0, 3, 7, 5);
  fill('#c4943a', 1, 4, 5, 3);
  fill('#f6d888', 1, 4, 5, 1);
  fill('#140b0c', 3, 5, 1, 2);
  return c;
}

function buildItemArt(item) {
  if (A.itemArt[item.id]) return;
  const shortName = item.name.length > 26 ? item.name.slice(0, 25) + '…' : item.name;
  const statCol = item.hp || (item.stat && item.stat.startsWith('+')) ? '#1d5e14' : '#7a5a34';
  const sub = item.hp
    ? `${item.slot.toUpperCase()} · +${item.hp} max HP`
    : item.stat && item.stat.startsWith('+')
      ? `${item.slot.toUpperCase()} · ${item.stat}`
      : `${item.slot.toUpperCase()} · Keepsake`;
  A.itemArt[item.id] = {
    icon: paintIcon(item),
    name: t2(shortName, 'bold 18px "Pixelify Sans"', '#3b2418'),
    sub: t2(sub, '16px "Pixelify Sans"', statCol),
    note: t2(item.note || '', '16px "Pixelify Sans"', '#5a3a22'),
  };
}

export function buildBeat8() {
  SPOT8 = cb.buildSpot(16, 18, 1.1);
  A = {
    panel: paintPanel(),
    dais: paintDais(),
    card: [paintCard(false, false), paintCard(true, false)],
    cardWorn: [paintCard(false, true), paintCard(true, true)],
    equip: paintPlate(EQUIPR.w, EQUIPR.h, 'green', false),
    equipP: paintPlate(EQUIPR.w, EQUIPR.h, 'green', true),
    worn: paintPlate(EQUIPR.w, EQUIPR.h, 'gold', false),
    wornP: paintPlate(EQUIPR.w, EQUIPR.h, 'gold', true),
    chip: paintPlate(44, BAR_H, 'oak', false),
    chipOn: paintPlate(44, BAR_H, 'green', false),
    chipAll: paintPlate(28, BAR_H, 'oak', false),
    chipAllOn: paintPlate(28, BAR_H, 'green', false),
    chipUpg: paintPlate(32, BAR_H, 'oak', false),
    chipUpgOn: paintPlate(32, BAR_H, 'green', false),
    chipSlot: paintPlate(54, BAR_H, 'gold', false),
    chipSort: paintPlate(66, BAR_H, 'oak', false),
    bestBtn: paintPlate(78, BAR_H, 'green', false),
    bestBtnP: paintPlate(78, BAR_H, 'green', true),
    loadOn: paintPlate(58, 18, 'gold', false),
    loadLock: paintPlate(50, 18, 'locked', false),
    done: paintPlate(DONER.w, DONER.h, 'oak', false),
    doneP: paintPlate(DONER.w, DONER.h, 'oak', true),
    boardActive: paintHangingBoard(107, 19, true, false),
    boardLocked: paintHangingBoard(107, 19, false, true),
    lockSm: paintLockSmall(),
    gaunt: buildGauntlet(false),
    gauntP: buildGauntlet(true),
    glyph: {},
    itemArt: {},
    dyn: new Map(),
    txt: {},
  };
  for (const s of ['helm', 'armor', 'cloak', 'weapon', 'shield', 'boots', 'ring1', 'ring2', 'amulet', 'trinket']) {
    A.glyph[s] = { dim: paintGlyph(s, false), lit: paintGlyph(s, true) };
  }
  A.txt.title = t2('GEAR & ARMOURY', 'bold 24px "Pixelify Sans"', '#ffe39a', { spacing: 2 });
  A.txt.titleSh = t2('GEAR & ARMOURY', 'bold 24px "Pixelify Sans"', '#1a0d08', { spacing: 2 });
  A.txt.equip = t2('EQUIP', 'bold 16px "Pixelify Sans"', '#d8ffb0');
  A.txt.equipSh = t2('EQUIP', 'bold 16px "Pixelify Sans"', '#142008');
  A.txt.worn = t2('WORN', 'bold 16px "Pixelify Sans"', '#fff6d8');
  A.txt.wornSh = t2('WORN', 'bold 16px "Pixelify Sans"', '#241208');
  A.txt.best = t2('EQUIP BEST', 'bold 16px "Pixelify Sans"', '#d8ffb0');
  A.txt.bestSh = t2('EQUIP BEST', 'bold 16px "Pixelify Sans"', '#142008');
  A.txt.doneLbl = t2('DONE', 'bold 18px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 18px "Pixelify Sans"', '#241208');
  A.txt.hint = t2('Click slot to filter · Dbl-click to equip · [G] close', '16px "Pixelify Sans"', '#6a4a2a');
  A.txt.empty = t2('No matching items in satchel.', '16px "Pixelify Sans"', '#7a5a34');
  A.txt.upg = t2('↑', 'bold 18px "Pixelify Sans"', '#1d5e14');
  A.txt.dn = t2('↓', 'bold 18px "Pixelify Sans"', '#9e2a36');
  A.txt.l1 = t2('Loadout 1', '16px "Pixelify Sans"', '#fff6d8');
  A.txt.l2 = t2('L2 (40)', '16px "Pixelify Sans"', '#c8c4d2');
  A.txt.l3 = t2('L3 (250)', '16px "Pixelify Sans"', '#c8c4d2');
}

function filteredItems() {
  const inv = cb.inventory();
  const list = inv.filter(it => {
    if (D.slotFilter !== 'all' && it.slot !== D.slotFilter) return false;
    if (D.upgradesOnly && (it.equipped || cb.compareItem(it).delta <= 0)) return false;
    return true;
  }).slice();
  list.sort((a, b) => {
    if (D.sort === 'best') {
      const ae = a.equipped ? 1 : 0, be = b.equipped ? 1 : 0;
      if (ae !== be) return be - ae;
      const ad = cb.compareItem(a).delta, bd = cb.compareItem(b).delta;
      if (ad !== bd) return bd - ad;
      return cb.itemPower(b) - cb.itemPower(a) || (a.seq || 0) - (b.seq || 0);
    }
    if (D.sort === 'slot') return a.slot.localeCompare(b.slot) || cb.itemPower(b) - cb.itemPower(a);
    return a.name.localeCompare(b.name);
  });
  return list;
}

function clampScroll(list) {
  const maxS = Math.max(0, list.length - ROWS_VIS);
  D.scroll = clamp(D.scroll | 0, 0, maxS);
  return maxS;
}

export function reset() {
  D = {
    Eref: cb.E, tNow: 0, line14At: null, nudged: false, chimeAt: 0, pulseShown: false,
    openAt: null, closeAt: null, pressAt: null, pressId: null, selId: null, scroll: 0,
    slotFilter: 'all', upgradesOnly: false, sort: 'best', hoverXY: null,
    lastClickId: null, lastClickAt: -9, bestFeedbackAt: -9, bestCount: 0,
    equippedAt: null, snorted: false, doneAt: null, statsKey: null, statsTxt: null,
    statusMsg: '', statusUntil: -1,
  };
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

function lockRattle(t, id, msg) {
  D.pressAt = t; D.pressId = id;
  if (msg) { D.statusMsg = msg; D.statusUntil = t + 2.2; }
  const s = cb.warp(t);
  cb.E.live.push({ s, k: 'paper' }, { s: s + 0.07, k: 'paper' });
}

export function debug() {
  if (!D) return null;
  const px = PANX, py = PANY;
  const list = filteredItems();
  const tb = toolbarRects(px, py);
  return {
    line14: D.line14At,
    pulse: D.pulseShown,
    open: D.openAt !== null,
    selId: D.selId,
    scroll: D.scroll,
    slotFilter: D.slotFilter,
    sort: D.sort,
    inv: cb.inventory().map(i => ({ id: i.id, name: i.name, slot: i.slot, equipped: !!i.equipped })),
    gear: cb.gearState(),
    equipped: D.equippedAt !== null,
    snorted: D.snorted,
    done: D.doneAt,
    tile: { ...TILE },
    panel: { x: px, y: py, w: PANW, h: PANH },
    rows: list.slice(D.scroll, D.scroll + ROWS_VIS).map((it, v) => {
      const X = px + SATX, Y = py + ROWY0 + v * (ROWH + ROWGAP);
      return {
        id: it.id, equipped: !!it.equipped,
        x: X, y: Y, w: LISTW, h: ROWH,
        equipRect: { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h },
      };
    }),
    slots: SLOTS.map(([sl, sx, sy]) => ({ slot: sl, x: px + DOLLY.x + sx, y: py + DOLLY.y + sy, w: SLOTW, h: SLOTW })),
    equipBestRect: tb.bestR,
    doneRect: { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h },
  };
}

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
  beat7.dismissToasts(t);
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
    D.statusMsg = `Removed ${item.name}.`;
    D.statusUntil = t + 1.8;
    return;
  }
  cb.equipItem(item.id, s);
  D.statusMsg = `Equipped ${item.name}!`;
  D.statusUntil = t + 1.8;
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
  D.statusMsg = changed.length ? `Equipped ${changed.length} best item${changed.length > 1 ? 's' : ''}!` : 'Best available gear already worn.';
  D.statusUntil = t + 2.0;
  if (changed.some(i => i.id === 'pietin') && D.equippedAt === null) {
    D.equippedAt = t;
    cb.E.live.push({ s: s + 0.18, k: 'chime' }, { s: s + 0.34, k: 'ding' });
  }
}

function toolbarRects(px, py) {
  const y = py + BAR_Y;
  const hasSlot = D.slotFilter !== 'all';
  const allR = { x: px + SATX, y, w: 28, h: BAR_H };
  const upgR = { x: allR.x + allR.w + 3, y, w: 32, h: BAR_H };
  const slotR = hasSlot ? { x: upgR.x + upgR.w + 3, y, w: 54, h: BAR_H } : null;
  const bestR = { x: px + SATX + SATW - 78, y, w: 78, h: BAR_H };
  const sortR = { x: bestR.x - 69, y, w: 66, h: BAR_H };
  return { allR, upgR, slotR, sortR, bestR };
}

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
    if (inTile(gx, gy)) { lockRattle(t, 'tile'); return true; }
    return false;
  }
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(t));
    const inR = (r) => r && gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h;

    // Hanging wooden board sub-tabs
    const subY = py + 28, subH = 24;
    if (gy >= subY && gy < subY + subH) {
      for (const tab of SUBTABS) {
        if (gx >= px + tab.x && gx < px + tab.x + tab.w) {
          if (tab.stage <= (cb.E?.stage || 1)) {
            cb.E.live.push({ s: cb.warp(t), k: 'paper' });
          } else {
            const fullName = tab.id === 'smithy' ? 'The Smithy' : tab.id === 'bag' ? 'Bag & Filter' : 'Glamour & Heraldry';
            lockRattle(t, `tab_${tab.id}`, `${fullName} unlocks at Stage ${tab.stage}!`);
          }
          return true;
        }
      }
    }

    // Loadout pills under Hero stats
    if (gy >= py + 266 && gy < py + 284 && gx >= px + 12 && gx < px + 176) {
      if (gx >= px + 73 && gx < px + 123) { lockRattle(t, 'load2', 'Loadout 2 unlocks at Stage 40!'); return true; }
      if (gx >= px + 126 && gx < px + 176) { lockRattle(t, 'load3', 'Loadout 3 unlocks at Stage 250!'); return true; }
      cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true;
    }

    const list = filteredItems();
    const maxS = clampScroll(list);

    const tb = toolbarRects(px, py);
    if (inR(tb.allR)) { D.slotFilter = 'all'; D.upgradesOnly = false; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.upgR)) { D.upgradesOnly = !D.upgradesOnly; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.slotR)) { D.slotFilter = 'all'; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.sortR)) { D.sort = SORTS[(SORTS.indexOf(D.sort) + 1) % SORTS.length]; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.bestR)) { runEquipBest(t); return true; }

    // Scrollbar click
    if (maxS > 0 && gx >= px + SCROLLR.x - 1 && gx < px + SCROLLR.x + SCROLLR.w + 1 && gy >= py + SCROLLR.y && gy < py + SCROLLR.y + SCROLLR.h) {
      const frac = clamp((gy - (py + SCROLLR.y)) / SCROLLR.h);
      D.scroll = Math.round(frac * maxS);
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }

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

    for (const [sl, sx, sy] of SLOTS) {
      const X = px + DOLLY.x + sx, Y = py + DOLLY.y + sy;
      if (gx >= X && gx < X + SLOTW && gy >= Y && gy < Y + SLOTW) {
        const fam = cb.slotFamily(sl);
        D.slotFilter = D.slotFilter === fam ? 'all' : fam;
        D.upgradesOnly = false; D.scroll = 0;
        const g = cb.gearState();
        if (g[sl]) D.selId = g[sl];
        cb.E.live.push({ s: cb.warp(t), k: 'paper' });
        return true;
      }
    }

    const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
    const inPanel = gx >= px && gx < px + PANW && gy >= py && gy < py + PANH;
    if (inR(dr) || !inPanel) { D.pressAt = t; D.pressId = 'done'; closeScreen(t); }
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
  if (D.openAt === null) return false;
  if (k === 'b' || k === 'B') { runEquipBest(t); return true; }
  const list = filteredItems();
  if (!list.length) return false;
  const idx = Math.max(0, list.findIndex(i => i.id === D.selId));
  if (k === 'ArrowDown') {
    const ni = Math.min(list.length - 1, idx + 1);
    D.selId = list[ni].id;
    if (ni >= D.scroll + ROWS_VIS) D.scroll = ni - ROWS_VIS + 1;
    return true;
  }
  if (k === 'ArrowUp') {
    const ni = Math.max(0, idx - 1);
    D.selId = list[ni].id;
    if (ni < D.scroll) D.scroll = ni;
    return true;
  }
  if (k === 'Enter' || k === ' ') {
    const it = list[idx];
    if (it) equip(t, it);
    return true;
  }
  return false;
}

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
      D.line14At = s; D.equippedAt = t; D.snorted = true;
      ui.snort(t); act.addPuff(t);
      say('line14b', s + 0.2);
      return;
    }
    D.line14At = s + 0.1; say('line14', D.line14At);
    return;
  }

  if (tinWorn && D.equippedAt === null) {
    D.equippedAt = t; D.pulseShown = false; setGearPulse(false); setGearBadge(0);
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
    D.snorted = true; ui.snort(t); act.addPuff(t);
    say('line14b', s + 0.25);
  }
  if (D.doneAt === null && D.snorted && s > lineEnd(DIALOGUE.line14b) + 1.1) D.doneAt = s;
}

export function drawSpot(ctx, p, t) {
  if (!D || D.line14At === null || D.equippedAt !== null || D.openAt !== null) return;
  const s = cb.warp(t);
  const k = easeOut(clamp((s - D.line14At) / 0.5));
  if (k <= 0) return;
  ctx.globalAlpha = 0.62 * k;
  ctx.drawImage(SPOT8, Math.round(TILE.x + 13 - 640), Math.round(TILE.y + 14 - 360));
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.line14At === null) return;
  const s = cb.warp(t);
  drawBanner(ctx, s);
  drawPointer(ctx, s);
  if (D.openAt !== null) drawScreen(ctx, uctx, t);
}

function drawBanner(ctx, s) {
  if (D.equippedAt !== null || D.openAt !== null) return;
  const at = DIALOGUE.line14.at;
  if (!isFinite(at) || s < at + 0.4) return;
  const label = 'OPEN THE GEAR SCREEN', w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3));
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
  ctx.globalAlpha = clamp(k);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = '#5a3414'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = '#7a4820'; ctx.fillRect(X, Y, w, 1);
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
  for (let r = 0; r < 3; r++) {
    ctx.fillStyle = '#140b0c'; ctx.fillRect(cx - 3 + r, cy + r - 1, 7 - r * 2, 2);
  }
  for (let r = 0; r < 3; r++) {
    ctx.fillStyle = r === 0 ? '#fff3b0' : '#f2b84a';
    ctx.fillRect(cx - 2 + r, cy + r, 5 - r * 2, 1);
  }
  ctx.globalAlpha = 1;
}

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
  const bld = cb.heroBuild()?.bonuses || {};
  const ac = cb.RULES.heroAC + (bld.acBonus || 0);
  const dmgB = cb.RULES.dmgBonus + (bld.dmgBonus || 0);
  const sKey = `L${hs.level}|${hs.hp}/${hs.hpMax}|AC${ac}|+${dmgB}|${gear.hpBonus || 0}`;
  if (D.statsKey !== sKey) {
    D.statsKey = sKey;
    D.statsTxt = t2(`LV ${hs.level} · HP ${hs.hp}/${hs.hpMax} · AC ${ac} · 2d6+${dmgB}`, '16px "Pixelify Sans"', gear.hpBonus ? '#1d5e14' : '#3b2418');
  }

  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);

  u.globalAlpha = 0.60 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.48)');
  IMG(A.panel, px, py);

  // Title
  put(u, A.txt.titleSh, px + PANW / 2, py + 19.5, 'c', 'm');
  put(u, A.txt.title, px + PANW / 2, py + 18.5, 'c', 'm');

  // 4 Hanging Wooden Board Sub-Tabs
  const stg = cb.E?.stage || 1;
  for (const tab of SUBTABS) {
    const locked = tab.stage > stg;
    const shake = D.pressId === `tab_${tab.id}` && D.pressAt !== null && t - D.pressAt < 0.22
      ? Math.round(Math.sin((t - D.pressAt) * 80) * 1.5) : 0;
    const tx = px + tab.x + shake;
    IMG(locked ? A.boardLocked : A.boardActive, tx, py + 28);
    if (!locked) {
      put(u, dynTxt('subOnS', tab.label, 'bold 16px "Pixelify Sans"', '#241208'), tx + tab.w / 2, py + 43.5, 'c', 'm');
      put(u, dynTxt('subOn', tab.label, 'bold 16px "Pixelify Sans"', '#ffe9a0'), tx + tab.w / 2, py + 42.5, 'c', 'm');
    } else {
      IMG(A.lockSm, tx + 5, py + 38);
      put(u, dynTxt('subLk', tab.label, '16px "Pixelify Sans"', '#c8c4d2'), tx + 14, py + 42.5, 'l', 'm');
    }
  }

  // Left: Paper Doll Dais + Hero + 10 Slots
  const dx = px + DOLLY.x, dy = py + DOLLY.y;
  IMG(A.dais, dx, dy);
  const celebrate = D.equippedAt !== null && t - D.equippedAt < 1.6;
  act.drawHeroPractice(u, celebrate ? 'ready2' : 'ready', dx + DOLLY.w / 2, dy + DOLLFEET, S);
  if (celebrate) {
    const d = t - D.equippedAt;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + d * 2.5, rad = 16 + d * 18;
      R(dx + DOLLY.w / 2 + Math.cos(a) * rad, dy + DOLLFEET - 38 + Math.sin(a) * rad * 0.7, 2, 2, i % 2 ? '#fff6d8' : '#ffd25a');
    }
  }

  let hoveredSlot = null;
  for (const [sl, sx, sy] of SLOTS) {
    const X = dx + sx, Y = dy + sy, worn = gear[sl];
    const fam = cb.slotFamily(sl);
    const activeFilt = D.slotFilter === fam;
    const isHov = D.hoverXY && D.hoverXY[0] >= X && D.hoverXY[0] < X + SLOTW && D.hoverXY[1] >= Y && D.hoverXY[1] < Y + SLOTW;
    if (isHov) hoveredSlot = { sl, X, Y, worn };

    R(X, Y, SLOTW, SLOTW, '#140b0c');
    const rim = isHov ? '#fff1b8' : activeFilt ? '#f6d888' : worn ? '#d9a948' : '#5c4632';
    R(X + 1, Y + 1, SLOTW - 2, SLOTW - 2, rim);
    R(X + 2, Y + 2, SLOTW - 4, SLOTW - 4, worn ? '#463018' : '#241812');
    R(X + 2, Y + 2, SLOTW - 4, 1, worn ? '#6e4727' : '#18100c');

    if (worn) {
      const wIt = inv.find(i2 => i2.id === worn);
      if (wIt) {
        buildItemArt(wIt);
        IMG(A.itemArt[wIt.id].icon, X + 1, Y + 3);
      }
    } else {
      const gl = A.glyph[sl];
      if (gl) IMG(isHov || activeFilt ? gl.lit : gl.dim, X + 4, Y + 4);
    }
  }

  // Hero stats plaque & Loadouts below dais
  const stY = dy + DOLLY.h + 3;
  R(dx, stY, DOLLY.w, 22, '#140b0c');
  R(dx + 1, stY + 1, DOLLY.w - 2, 20, '#875a31');
  R(dx + 2, stY + 2, DOLLY.w - 4, 18, '#f2e2bd');
  put(u, D.statsTxt, dx + DOLLY.w / 2, stY + 11, 'c', 'm');

  const ldY = stY + 25;
  IMG(A.loadOn, dx, ldY);
  put(u, A.txt.l1, dx + 29, ldY + 9, 'c', 'm');
  const s2 = D.pressId === 'load2' && D.pressAt !== null && t - D.pressAt < 0.22 ? Math.round(Math.sin((t - D.pressAt) * 80)) : 0;
  const s3 = D.pressId === 'load3' && D.pressAt !== null && t - D.pressAt < 0.22 ? Math.round(Math.sin((t - D.pressAt) * 80)) : 0;
  IMG(A.loadLock, dx + 61 + s2, ldY);
  IMG(A.lockSm, dx + 63 + s2, ldY + 5);
  put(u, A.txt.l2, dx + 72 + s2, ldY + 9, 'l', 'm');
  IMG(A.loadLock, dx + 114 + s3, ldY);
  IMG(A.lockSm, dx + 116 + s3, ldY + 5);
  put(u, A.txt.l3, dx + 125 + s3, ldY + 9, 'l', 'm');

  // Right: Toolbar + Satchel
  let selIt = list.find(i => i.id === D.selId) || inv.find(i => i.id === D.selId) || list[0] || inv[0] || null;
  if (selIt && D.selId !== selIt.id) D.selId = selIt.id;

  const tb = toolbarRects(px, py);
  const allOn = D.slotFilter === 'all' && !D.upgradesOnly;
  IMG(allOn ? A.chipAllOn : A.chipAll, tb.allR.x, tb.allR.y);
  put(u, dynTxt('tb', 'ALL', '16px "Pixelify Sans"', allOn ? '#d8ffb0' : '#ffe9a0'), tb.allR.x + tb.allR.w / 2, tb.allR.y + tb.allR.h / 2, 'c', 'm');

  IMG(D.upgradesOnly ? A.chipUpgOn : A.chipUpg, tb.upgR.x, tb.upgR.y);
  put(u, dynTxt('tb', 'UPG', '16px "Pixelify Sans"', D.upgradesOnly ? '#d8ffb0' : '#ffe9a0'), tb.upgR.x + tb.upgR.w / 2, tb.upgR.y + tb.upgR.h / 2, 'c', 'm');

  if (tb.slotR) {
    IMG(A.chipSlot, tb.slotR.x, tb.slotR.y);
    put(u, dynTxt('tbS', `${SLOT_LABEL[D.slotFilter] || D.slotFilter.toUpperCase()} ×`, '16px "Pixelify Sans"', '#fff6d8'), tb.slotR.x + tb.slotR.w / 2, tb.slotR.y + tb.slotR.h / 2, 'c', 'm');
  }

  IMG(A.chipSort, tb.sortR.x, tb.sortR.y);
  put(u, dynTxt('tbSort', `SORT:${SORT_LBL[D.sort]}`, '16px "Pixelify Sans"', '#ffe9a0'), tb.sortR.x + tb.sortR.w / 2, tb.sortR.y + tb.sortR.h / 2, 'c', 'm');

  const bestPressed = D.pressAt !== null && t - D.pressAt < 0.14 && D.pressId === 'best';
  IMG(bestPressed ? A.bestBtnP : A.bestBtn, tb.bestR.x, tb.bestR.y + (bestPressed ? 1 : 0));
  put(u, A.txt.bestSh, tb.bestR.x + tb.bestR.w / 2, tb.bestR.y + tb.bestR.h / 2 + 1 + (bestPressed ? 1 : 0), 'c', 'm');
  put(u, A.txt.best, tb.bestR.x + tb.bestR.w / 2, tb.bestR.y + tb.bestR.h / 2 + (bestPressed ? 1 : 0), 'c', 'm');

  if (t - D.bestFeedbackAt < 1.8) {
    const fbTxt = D.bestCount > 0 ? `+${D.bestCount} WORN` : 'ALL BEST';
    R(tb.bestR.x + 8, tb.bestR.y - 11, 62, 10, '#140b0c');
    R(tb.bestR.x + 9, tb.bestR.y - 10, 60, 8, '#3a6620');
    put(u, dynTxt('bf', fbTxt, '16px "Pixelify Sans"', '#fff6d8'), tb.bestR.x + 39, tb.bestR.y - 6, 'c', 'm');
  }

  // Satchel rows
  if (!list.length) {
    R(px + SATX, py + ROWY0, LISTW, LISTH, '#e9d3a6');
    put(u, A.txt.empty, px + SATX + LISTW / 2, py + ROWY0 + LISTH / 2, 'c', 'm');
  }
  for (let v = 0; v < ROWS_VIS; v++) {
    const i = D.scroll + v; if (i >= list.length) break;
    const it = list[i], IA = A.itemArt[it.id], sel = selIt && it.id === selIt.id;
    const cmp = cb.compareItem(it);
    const X = px + SATX, Y = py + ROWY0 + v * (ROWH + ROWGAP);
    u.globalAlpha = ak * (sel ? 1 : 0.94);
    IMG(it.equipped ? A.cardWorn[sel ? 1 : 0] : A.card[sel ? 1 : 0], X, Y);
    u.globalAlpha = ak;

    // Icon well
    R(X + 4, Y + 4, 24, 19, '#140b0c');
    R(X + 5, Y + 5, 22, 17, '#3b2418');
    u.drawImage(IA.icon, Math.round((X + 5) * S), Math.round((Y + 5) * S), 22 * S, 18 * S);

    // Name + Upgrade arrow + Slot/stat line
    put(u, IA.name, X + 32, Y + 4);
    if (!it.equipped && cmp.delta > 0) {
      put(u, A.txt.upg, X + 32 + Math.ceil(IA.name.inkW / S) + 4, Y + 3.5);
    } else if (!it.equipped && cmp.delta < 0) {
      put(u, A.txt.dn, X + 32 + Math.ceil(IA.name.inkW / S) + 4, Y + 3.5);
    }
    put(u, IA.sub, X + 32, Y + 15);

    // Inline EQUIP / WORN button
    const er = { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h };
    const eqPressed = D.pressId === it.id && D.pressAt !== null && t - D.pressAt < 0.14;
    const btnImg = it.equipped ? (eqPressed ? A.wornP : A.worn) : (eqPressed ? A.equipP : A.equip);
    IMG(btnImg, er.x, er.y + (eqPressed ? 1 : 0));
    put(u, it.equipped ? A.txt.wornSh : A.txt.equipSh, er.x + er.w / 2, er.y + er.h / 2 + 1 + (eqPressed ? 1 : 0), 'c', 'm');
    put(u, it.equipped ? A.txt.worn : A.txt.equip, er.x + er.w / 2, er.y + er.h / 2 + (eqPressed ? 1 : 0), 'c', 'm');
  }

  // Brass Scrollbar
  R(px + SCROLLR.x, py + SCROLLR.y, SCROLLR.w, SCROLLR.h, '#140b0c');
  R(px + SCROLLR.x + 1, py + SCROLLR.y + 1, SCROLLR.w - 2, SCROLLR.h - 2, '#3d2414');
  const thumbH = maxS <= 0 ? SCROLLR.h - 4 : Math.max(18, Math.round((ROWS_VIS / list.length) * (SCROLLR.h - 4)));
  const thumbY = maxS <= 0 ? py + SCROLLR.y + 2 : py + SCROLLR.y + 2 + Math.round((D.scroll / maxS) * (SCROLLR.h - 4 - thumbH));
  R(px + SCROLLR.x + 2, thumbY, SCROLLR.w - 4, thumbH, maxS > 0 ? '#d9a948' : '#7a5418');
  R(px + SCROLLR.x + 2, thumbY, SCROLLR.w - 4, 2, maxS > 0 ? '#fff1b8' : '#9a7026');

  // Comparison & Detail Footer
  const fx = px + FOOTR.x, fy = py + FOOTR.y;
  R(fx, fy, FOOTR.w, FOOTR.h, '#140b0c');
  R(fx + 1, fy + 1, FOOTR.w - 2, FOOTR.h - 2, '#875a31');
  R(fx + 2, fy + 2, FOOTR.w - 4, FOOTR.h - 4, '#f2e2bd');
  if (t < D.statusUntil && D.statusMsg && (D.pressId?.startsWith('tab') || D.pressId?.startsWith('load'))) {
    put(u, dynTxt('stMsg', D.statusMsg, 'bold 16px "Pixelify Sans"', '#8a2020'), fx + 6, fy + 8);
    put(u, dynTxt('stSub', 'Greyed & padlocked options preview upcoming stages.', '16px "Pixelify Sans"', '#5a3a22'), fx + 6, fy + 20);
  } else if (selIt) {
    const cmp = cb.compareItem(selIt);
    let cmpStr, cmpCol;
    if (selIt.equipped) {
      cmpStr = `Currently equipped (${SLOT_LABEL[selIt.slot] || selIt.slot.toUpperCase()}) · Click WORN to remove`;
      cmpCol = '#1d5e14';
    } else if (cmp.delta > 0 && !cmp.worn) {
      cmpStr = `▲ Upgrade: ${selIt.stat} (${SLOT_LABEL[selIt.slot] || selIt.slot.toUpperCase()} slot empty)`;
      cmpCol = '#1d5e14';
    } else if (cmp.delta > 0 && cmp.worn) {
      cmpStr = `▲ Upgrade (+${cmp.delta} power) · Replaces: ${cmp.worn.name}`;
      cmpCol = '#1d5e14';
    } else if (cmp.delta < 0) {
      cmpStr = `▼ Downgrade (${cmp.delta} power) · Worn: ${cmp.worn.name}`;
      cmpCol = '#9e2a36';
    } else {
      cmpStr = cmp.worn ? `Replaces: ${cmp.worn.name} (Even)` : `${SLOT_LABEL[selIt.slot] || selIt.slot.toUpperCase()} slot · Keepsake`;
      cmpCol = '#5a3a22';
    }
    put(u, dynTxt('cmp', cmpStr, '16px "Pixelify Sans"', cmpCol), fx + 6, fy + 6);
    if (A.itemArt[selIt.id]) put(u, A.itemArt[selIt.id].note, fx + 6, fy + 19);
  }

  // Hint + DONE button
  put(u, A.txt.hint, px + SATX, py + 279);
  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  const dPressed = D.pressId === 'done' && D.pressAt !== null && t - D.pressAt < 0.14;
  IMG(dPressed ? A.doneP : A.done, dr.x, dr.y + (dPressed ? 1 : 0));
  put(u, A.txt.doneSh, dr.x + dr.w / 2, dr.y + dr.h / 2 + 1 + (dPressed ? 1 : 0), 'c', 'm');
  put(u, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + dr.h / 2 + (dPressed ? 1 : 0), 'c', 'm');

  // Hover Tooltip over Paper Doll slot
  if (hoveredSlot) {
    const { sl, X, Y, worn } = hoveredSlot;
    const wIt = worn ? inv.find(i2 => i2.id === worn) : null;
    const tipTxt = wIt
      ? `${SLOT_LABEL[sl]}: ${wIt.name} (${wIt.stat})`
      : `${SLOT_LABEL[sl]}: Empty · Click to filter`;
    const tipImg = dynTxt('tip', tipTxt, '16px "Pixelify Sans"', '#fff6d8');
    const tw = Math.ceil(tipImg.inkW / S) + 12, th = 15;
    const tx = clamp(X + SLOTW / 2 - tw / 2, px + 8, px + PANW - tw - 8);
    const ty = Y > py + DOLLY.y + 30 ? Y - th - 3 : Y + SLOTW + 3;
    R(tx, ty, tw, th, '#140b0c');
    R(tx + 1, ty + 1, tw - 2, th - 2, '#4e311a');
    R(tx + 1, ty + 1, tw - 2, 1, '#c4943a');
    put(u, tipImg, tx + 6, ty + 7.5, 'l', 'm');
  }

  // Tutorial steel gauntlet pointing at Snikkit's Pie Tin EQUIP button until worn
  if (D.equippedAt === null && D.openAt !== null && t > D.openAt + 0.45) {
    const vIdx = list.slice(D.scroll, D.scroll + ROWS_VIS).findIndex(it => it.id === 'pietin' && !it.equipped);
    if (vIdx >= 0) {
      const ph = (t % 1.1) / 1.1, press = ph > 0.55 && ph < 0.72;
      const gx = px + SATX + EQUIPR.x + EQUIPR.w / 2 + (press ? 0 : 2);
      const gy = py + ROWY0 + vIdx * (ROWH + ROWGAP) + EQUIPR.y + EQUIPR.h - 2 + (press ? 2 : Math.round(Math.sin(ph * Math.PI * 2) * 2));
      IMG(press ? A.gauntP : A.gaunt, gx - GAUNTLET_TIP[0], gy - GAUNTLET_TIP[1]);
    }
  }

  u.globalAlpha = 1;
}
