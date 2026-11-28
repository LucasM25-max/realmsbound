// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 6 — the Training Yard
//
//  Hanging wooden board sub-tabs (Martial Drills active, Realms
//  Mastery greyed & padlocked to Stage 100), Buy Multiplier rack
//  (×1 active, ×10/×25/Next ×2 padlocked), and all 6 Martial Drills
//  visible at once in a crisp carved-oak & parchment 2×3 layout.
// ─────────────────────────────────────────────────────────────
import { W, H, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat5 from './beat5.js';
import { setTrainPulse, setTrainingOpen, rebuildNow, setTileLocked, inNowQuickBuy, inNowTag, flashNowBuy, getNowRects } from './hud.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { makeCanvas, crispText, clamp, easeOut, easeOutBack, hash } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';
import { TRACK_UNLOCK_STAGE, cheapestUnlockedTrack } from './progression.js';

const TRACKS = cb.TRACKS;
const TILE = { x: 552, y: 329, w: 26, h: 29 };
const inTile = (gx, gy) => gx >= TILE.x && gx < TILE.x + TILE.w && gy >= TILE.y && gy < TILE.y + TILE.h;

const PANW = 460, PANH = 304, PANX = 90, PANY = 28;
const CARDW = 212, CARDH = 63;
const CARDX = [12, 236];
const CARDY = [60, 128, 196];
const BUYR = { x: 114, y: 41, w: 92, h: 17 };
const DONER = { x: PANW - 76, y: 268, w: 64, h: 24 };
const NUDGE = { pointer: 6, line: 15, pulse: 30 };

// Progressive disclosure unlock stages per Freeplay-Plan.md & UI-overview.md
const TRACK_UNLOCK = TRACK_UNLOCK_STAGE;
const MULT_DEFS = [
  { id: 'x1', label: '×1', stage: 1, x: 318, w: 24 },
  { id: 'x10', label: '×10', stage: 5, x: 345, w: 34 },
  { id: 'x25', label: '×25', stage: 25, x: 382, w: 34 },
  { id: 'x2m', label: '×2', stage: 50, x: 419, w: 30 },
];

let D = null, A = null, SPOT6 = null;

function t2(str, font, col, opts = {}) {
  const c = crispText(str.replace(/f(?=[ilft])/g, 'f\u200C'), font, col, { threshold: 146, ...opts });
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

// ---------- pixel icons (14x14 inside 20x20 brass/iron medallion) ----------
const ICONS = {
  weapon: ['......KK......', '.....CSS......', '.....CSS......', '....CSS.......', '....CSS.......', '...CSS........', '...CSS........', '..CSS.........', '..CSS.........', '.CSS..........', '.CSS..KK......', 'KSS...KBBK....', 'KK...KBBBBK...', '......KBK.KK..', '.KK..KBBK.....', 'KPZK.KBK......', 'KPPKKKK.......', '.KKK..........'],
  armour: ['....KKKKKK....', '..KKSSSSSSKK..', '.KSSSSSSSSSSK.', '.KSSSHHSSSSSK.', 'KSSSSHHSSSSSSK', 'KSSSSHHSSSSSSK', 'KSHHHHHHHHHHSK', 'KSHHHHHHHHHHSK', '.KSSSHHSSSSK.', '.KSSSHHSSSSK.', '..KSSHHSSSK...', '..KSSSSSSSK...', '...KSSSSSK....', '....KSSSK.....', '.....KSK......', '......K.......'],
  footwork: ['..............', '..KKKK........', '.KLLLLK.......', '.KLLLLK..K....', '.KLLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLLKK....', '..KLLLLLLLLK..', '.KLLLLLLLLLLK.', 'KLLLLLLLLLLLLK', 'KSSSSSSSSSSSSK', 'KKKKKKKKKKKKKK', '..............'],
  tactics: ['.....KK.......', '....KHHK......', '...KHHHHK.....', '..KKHHHHKK....', '..KSSSSSSK....', '.KSSSSSSSSK...', 'KSSSSSSSSSSK..', 'KSSCCSSSSSSK..', 'KSSSSSSSSSSK..', 'KKKKKKKKKKKK..', 'KSSKSSSSKSSK..', 'KSSSSSSSSSSK..', '.KKKKKKKKKK...', '..............'],
  scavenging: ['..............', '.....KKKKK....', '....KRRRRK....', '.....KRRK.....', '...KKKKKKKK...', '..KLLLLLLLLK..', '.KLLKKKKKKLLK.', '.KLLKGGGGKLLK.', 'KLLLKGGGGKLLLK', 'KLLLKGKKKLLLLK', 'KLLLLLLLLLLLLK', 'KLLLLLLLLLLLLK', '.KLLLLLLLLLLK.', '..KKKKKKKKKK..', '..............'],
  conditioning: ['..............', '..KKK..KKK....', '.KHHHKKHHHK...', '.KHWHHHHHHK...', 'KHHHHHHHHHHK..', 'KHHHHHHHHHHK..', 'KHHHHHHHHHHK..', '.KHHHHHHHHK...', '..KHHHHHHK....', '...KHHHHK.....', '....KHHK......', '.....KK.......', '..............'],
};
const ICONCOL = { K: '#140b0c', S: '#b8bcc4', C: '#e8ecf2', B: '#7a4a28', P: '#4d3125', Z: '#2a1a16', L: '#5f3e2e', R: '#8a5a34', G: '#e2b75a', H: '#a3362c', W: '#ffb0a0' };
const ICONCOL_LOCK = { K: '#1c1a20', S: '#7e7d86', C: '#9a99a2', B: '#5c5860', P: '#46434a', Z: '#2c2a30', L: '#524f58', R: '#646068', G: '#88848c', H: '#6e5e62', W: '#9c9296' };

function paintIcon(id, locked = false) {
  const [c, x] = makeCanvas(20, 20);
  const O = '#140b0c';
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) {
    const r = Math.hypot(i - 9.5, j - 9.5);
    if (r > 9.5) continue;
    if (locked) fill(r > 8.4 ? O : r > 6.8 ? '#585562' : '#96908c', i, j);
    else fill(r > 8.4 ? O : r > 6.8 ? (i + j < 19 ? '#e2b75a' : '#9a7026') : '#f6ead0', i, j);
  }
  const bm = ICONS[id], pal = locked ? ICONCOL_LOCK : ICONCOL;
  const ox = 3, oy = 3;
  if (bm) for (let j = 0; j < bm.length; j++) for (let i = 0; i < bm[j].length; i++) {
    const col = pal[bm[j][i]];
    if (col) fill(col, ox + i, oy + j);
  }
  return c;
}

// ---------- AAA Pixel Art Panel, Hanging Boards & Controls ----------
function paintPanel() {
  const [c, x] = makeCanvas(PANW, PANH);
  const O = '#140b0c';
  const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };

  // Carved oak outer frame (with subtle chamfer)
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
  // Gold filigree inlay around frame
  const gi = 3;
  fill('#8a5f1e', gi, gi, PANW - gi * 2, 1); fill('#8a5f1e', gi, PANH - gi - 1, PANW - gi * 2, 1);
  fill('#8a5f1e', gi, gi, 1, PANH - gi * 2); fill('#8a5f1e', PANW - gi - 1, gi, 1, PANH - gi * 2);
  for (let i = 0; i < PANW - gi * 2; i += 8) { fill('#e8c068', gi + i, gi); fill('#e8c068', gi + i + 3, PANH - gi - 1); }

  // Warm parchment interior with toasted edges
  const px0 = B + 1, py0 = B + 1, pw = PANW - px0 * 2, ph = PANH - py0 * 2;
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
    const e = Math.min(i, j, pw - 1 - i, ph - 1 - j);
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.15 + Math.sin(i * 0.09 + j * 0.05) * 0.14 - Math.max(0, 4 - e) * 0.38 - (j / ph) * 0.2;
    if (n > 0.968) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], px0 + i, py0 + j);
  }

  // Carved oak header beam (y = 8..29) for Title & Purse + hanging tab anchor rail
  fill(O, px0, 8, pw, 22);
  for (let j = 9; j < 29; j++) for (let i = px0; i < px0 + pw; i++) {
    const g = Math.sin(i * 0.18 + j * 1.4);
    let k = j === 9 ? 5 : j === 10 ? 4 : j === 28 ? 0 : j === 27 ? 1 : (2 + (g > 0.65 ? 1 : g < -0.65 ? -1 : 0));
    fill(WOOD[k], i, j);
  }
  fill('#8a5f1e', px0 + 2, 27, pw - 4, 1);

  // Subtle recessed dark leather strip behind hanging boards & multipliers (y = 30..56)
  fill('#2b1a12', px0, 30, pw, 26);
  for (let j = 30; j < 56; j++) for (let i = px0; i < px0 + pw; i++) {
    const n = hash(i * 11 + j * 53, 19);
    fill(j === 30 ? '#140b0c' : j === 55 ? '#56361d' : n > 0.92 ? '#362116' : n < 0.08 ? '#23140e' : '#2c1b12', i, j);
  }
  fill('#140b0c', px0, 56, pw, 1);
  fill('#a87e48', px0, 57, pw, 1);

  // Purse inset badge on right side of header
  const prx = PANW - 92, pry = 11, prw = 80, prh = 15;
  fill(O, prx, pry, prw, prh);
  fill('#23140e', prx + 1, pry + 1, prw - 2, prh - 2);
  fill('#8a5f1e', prx + 1, pry + 1, prw - 2, 1);

  // Brass corner caps with sapphire accents
  for (const [cx, cy] of [[0, 0], [PANW - 10, 0], [0, PANH - 10], [PANW - 10, PANH - 10]]) {
    fill(O, cx, cy, 10, 10);
    fill('#9a7026', cx + 1, cy + 1, 8, 8);
    fill('#d9a948', cx + 2, cy + 2, 6, 6);
    fill('#f6d888', cx + 2, cy + 2, 6, 1); fill('#f6d888', cx + 2, cy + 2, 1, 6);
    fill('#3f86c4', cx + 4, cy + 4, 2, 2); fill('#9fd4ff', cx + 4, cy + 4, 1, 1);
  }

  // Bottom footer divider line
  fill('#b58d58', px0 + 4, 263, pw - 8, 1);
  fill('#f8edd2', px0 + 4, 264, pw - 8, 1);
  return c;
}

// Hanging wooden board sub-tab (smaller sibling of hud.js buildSign)
function paintHangingBoard(w, h, active, locked) {
  const totalH = h + 5; // 5px top chains/ropes
  const [c, x] = makeCanvas(w, totalH);
  const O = '#140b0c';
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  const WOOD = active
    ? ['#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#c4943a']
    : locked
      ? ['#1d1c22', '#2a2830', '#36343e', '#45424e', '#585564']
      : ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31'];

  // Two hanging ropes/chains at left and right with crisp metallic links
  for (const rx of [12, w - 15]) {
    fill(O, rx - 1, 0, 5, 1);
    fill(locked ? '#9e9aa8' : '#f6d888', rx, 0, 3, 1);
    for (let y = 1; y < 5; y++) {
      fill(O, rx - 1, y, 4, 1);
      if (locked) {
        fill((y % 2) ? '#9e9aa8' : '#4b4856', rx, y, 2, 1);
      } else {
        fill((y % 2) ? '#f6d888' : '#9a7026', rx, y, 2, 1);
      }
    }
    // Iron/brass bracket clamp on top edge of plank
    fill(O, rx - 2, 4, 6, 4);
    fill(locked ? '#747080' : '#c4943a', rx - 1, 5, 4, 2);
    fill(locked ? '#d2ceda' : '#fff1b8', rx - 1, 5, 2, 1);
  }

  // Drop shadow behind board
  fill('rgba(10,6,12,0.45)', 2, 7, w - 2, h);

  // Wooden plank body
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
  // Corner rivets
  for (const [nx, ny] of [[3, py + 3], [w - 5, py + 3], [3, py + h - 5], [w - 5, py + h - 5]]) {
    fill(locked ? '#4b4856' : '#c4943a', nx, ny, 2, 2);
    fill(locked ? '#878394' : '#fff1b8', nx, ny);
  }
  if (active) {
    // Subtle gold indicator strip along bottom edge
    fill('#f6d888', 6, py + h - 2, w - 12, 1);
  }
  return c;
}

function paintCard(state /* 'norm' | 'sel' | 'locked' */) {
  const [c, x] = makeCanvas(CARDW, CARDH);
  const O = '#140b0c';
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill('rgba(20,10,8,0.22)', 2, 2, CARDW - 1, CARDH - 1);
  fill(O, 0, 0, CARDW, CARDH);
  if (state === 'locked') {
    fill('#4b4856', 1, 1, CARDW - 2, CARDH - 2);
    fill('#726e7c', 1, 1, CARDW - 2, 1);
    fill('#2c2a34', 1, CARDH - 2, CARDW - 2, 1);
    for (let j = 2; j < CARDH - 2; j++) for (let i = 2; i < CARDW - 2; i++) {
      const diag = ((i + j) % 8 === 0) ? -1 : 0;
      const shade = j < 20 ? 1 : j > 39 ? -1 : 0;
      const P = ['#958e88', '#a39c94', '#b0a9a0', '#bdb6ac'];
      fill(P[clamp(2 + shade + diag, 0, 3)], i, j);
    }
    fill('#7e7874', 3, 39, CARDW - 6, 1);
  } else {
    const sel = state === 'sel';
    fill(sel ? '#d9a948' : '#6e4727', 1, 1, CARDW - 2, CARDH - 2);
    fill(sel ? '#fff1b8' : '#a1703f', 1, 1, CARDW - 2, 1);
    fill(sel ? '#8a5f1e' : '#3d2414', 1, CARDH - 2, CARDW - 2, 1);
    const PAR = ['#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
    for (let j = 2; j < CARDH - 2; j++) for (let i = 2; i < CARDW - 2; i++) {
      const n = hash(i * 19 + j * 41, sel ? 9 : 3);
      let k = j < 18 ? 3 : j > 40 ? 1 : 2;
      if (n > 0.94) k++; else if (n < 0.06) k--;
      fill(PAR[clamp(k, 0, 4)], i, j);
    }
    fill('#cba571', 3, 39, CARDW - 6, 1);
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
    dim:    { b: ['#1e1c24', '#5c5866', '#878394'], bg: pressed ? ['#24222c', '#2e2b36'] : ['#322f3a', '#423e4c'] },
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

function paintCoin() {
  const [c, x] = makeCanvas(7, 7);
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const pal = ['#4a2210', '#7e3e1c', '#b0602c', '#d98b47', '#f4b77a', '#ffe0b8'];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
    const d = Math.hypot(i - 3, j - 3);
    if (d > 3.5) continue;
    if (d > 2.6) fill('#140b0c', i, j);
    else fill(pal[i + j < 5 ? 4 : i + j > 7 ? 1 : 3], i, j);
  }
  fill('#ffe0b8', 2, 2);
  return c;
}

function paintLock(small = false) {
  const w = small ? 7 : 9, h = small ? 8 : 11;
  const [c, x] = makeCanvas(w, h);
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  if (small) {
    // shackle
    fill('#140b0c', 1, 0, 5, 4);
    fill('#878394', 2, 0, 3, 1); fill('#878394', 1, 1, 1, 3); fill('#878394', 5, 1, 1, 3);
    fill('#000000', 2, 1, 3, 2); x.clearRect(2, 1, 3, 2);
    // body
    fill('#140b0c', 0, 3, 7, 5);
    fill('#c4943a', 1, 4, 5, 3);
    fill('#f6d888', 1, 4, 5, 1);
    fill('#140b0c', 3, 5, 1, 2);
  } else {
    fill('#140b0c', 2, 0, 5, 5);
    fill('#b2afbd', 3, 1, 3, 1); fill('#878394', 2, 2, 1, 3); fill('#878394', 6, 2, 1, 3);
    x.clearRect(3, 2, 3, 3);
    fill('#140b0c', 0, 4, 9, 7);
    fill('#9a7026', 1, 5, 7, 5);
    fill('#e2b75a', 1, 5, 6, 4);
    fill('#fff1b8', 1, 5, 6, 1);
    fill('#140b0c', 4, 6, 1, 3);
  }
  return c;
}

// ---------- text cache builder (2x UI canvas: 16px+ native Pixelify Sans grid) ----------
function dynText(i) {
  const tr = TRACKS[i], p = D.ranks[i];
  const T = A.tr[i];
  const unlocked = !lockedTrack(i);
  const nxt = tr.miles.find(([r]) => r > p);
  T.rank = t2(`Rk ${p}`, '16px "Pixelify Sans"', unlocked ? '#f6d888' : '#b2afbd');
  T.fxLine = t2(`${tr.fxName}: ${tr.fx(p)}`, '16px "Pixelify Sans"', unlocked ? '#3b2418' : '#423c40');
  T.fxDelta = t2(`→ ${tr.fx(p + 1)}`, 'bold 16px "Pixelify Sans"', '#1d5e14');
  T.mile = t2(nxt ? `Next: Rk ${nxt[0]} (${nxt[1]})` : 'Max milestones!', '16px "Pixelify Sans"', unlocked ? '#7a5426' : '#4e4850');
  T.cost = t2(`${tr.cost(p)} cp`, '16px "Pixelify Sans"', unlocked ? '#ffe9a0' : '#d2ceda');
  T.costDim = t2(`${tr.cost(p)} cp`, '16px "Pixelify Sans"', '#c8b2a2');
}
const dynAll = () => { for (let i = 0; i < TRACKS.length; i++) dynText(i); };

const LOCK_PREVIEW = {
  armour: '+Max HP & Flat Reduction',
  scavenging: '+2% Gold per Rank',
  footwork: 'Faster Attack Rounds',
  conditioning: '+5% Regen & Potions',
  tactics: '+10% Cmd · +2% Crit DMG',
};
const LOCK_NOTE = {
  armour: 'Rk 10/25/50: ×2 HP Milestones',
  scavenging: 'Rk 5: Auto-Collect Coins',
  footwork: 'Milestones: Extra Strikes',
  conditioning: 'Milestones: +1 Potion Cap',
  tactics: 'Rk 250/500: +1 Crit Range',
};

export function buildBeat6() {
  SPOT6 = cb.buildSpot(16, 18, 1.1);
  A = {
    panel: paintPanel(),
    card: paintCard('norm'),
    cardSel: paintCard('sel'),
    cardLocked: paintCard('locked'),
    boardActive: paintHangingBoard(112, 19, true, false),
    boardLocked: paintHangingBoard(156, 19, false, true),
    buyOk: paintPlate(BUYR.w, BUYR.h, 'green', false),
    buyOkP: paintPlate(BUYR.w, BUYR.h, 'green', true),
    buyDim: paintPlate(BUYR.w, BUYR.h, 'dim', false),
    lockBar: paintPlate(198, 17, 'locked', false),
    multOn: paintPlate(24, 17, 'green', false),
    multLock: paintPlate(34, 17, 'locked', false),
    multLockSm: paintPlate(30, 17, 'locked', false),
    done: paintPlate(DONER.w, DONER.h, 'oak', false),
    doneP: paintPlate(DONER.w, DONER.h, 'oak', true),
    coin: paintCoin(),
    lock: paintLock(false),
    lockSm: paintLock(true),
    gaunt: buildGauntlet(false),
    gauntP: buildGauntlet(true),
    icons: {},
    iconsLocked: {},
    tr: [],
    txt: {},
    dyn: new Map(),
  };
  for (const tr of TRACKS) {
    A.icons[tr.id] = paintIcon(tr.id, false);
    A.iconsLocked[tr.id] = paintIcon(tr.id, true);
    A.tr.push({
      name: t2(tr.name, 'bold 18px "Pixelify Sans"', '#3b2418'),
      nameLocked: t2(tr.name, 'bold 18px "Pixelify Sans"', '#322e36'),
      preview: t2(LOCK_PREVIEW[tr.id] || tr.d2, '16px "Pixelify Sans"', '#2f2932'),
      lockNote: t2(LOCK_NOTE[tr.id] || '', '16px "Pixelify Sans"', '#4e4850'),
      unlockLbl: t2(`UNLOCKS STAGE ${TRACK_UNLOCK[tr.id]}`, '16px "Pixelify Sans"', '#e2dfe8'),
    });
  }
  A.txt.title = t2('TRAINING YARD', 'bold 24px "Pixelify Sans"', '#ffe39a', { spacing: 2 });
  A.txt.titleSh = t2('TRAINING YARD', 'bold 24px "Pixelify Sans"', '#1a0d08', { spacing: 2 });
  A.txt.subMartial = t2('Martial Drills', 'bold 16px "Pixelify Sans"', '#ffe9a0');
  A.txt.subMartialSh = t2('Martial Drills', 'bold 16px "Pixelify Sans"', '#241208');
  A.txt.subRealms = t2('Realms Mastery · Stg 100', '16px "Pixelify Sans"', '#c8c4d2');
  A.txt.buyLbl = t2('BUY:', '16px "Pixelify Sans"', '#d9c098');
  A.txt.train = t2('TRAIN', 'bold 16px "Pixelify Sans"', '#d8ffb0');
  A.txt.trainSh = t2('TRAIN', 'bold 16px "Pixelify Sans"', '#142008');
  A.txt.doneLbl = t2('DONE', 'bold 18px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 18px "Pixelify Sans"', '#241208');
  A.txt.short = t2('Purse short', '16px "Pixelify Sans"', '#9e2228');
  A.txt.ready = t2('Ready', 'bold 16px "Pixelify Sans"', '#1d5e14');
  dynAll();
}

const currentStage = () => (cb.E ? cb.E.stage || 1 : 1);
const lockedTrack = i => TRACK_UNLOCK[TRACKS[i].id] > currentStage();
const cheapestInfo = () => cheapestUnlockedTrack(TRACKS, D.ranks, currentStage());
const cheapest = () => {
  const best = cheapestInfo();
  return best ? best.cost : Infinity;
};
function syncNowTag() {
  if (!D) return;
  const best = cheapestInfo();
  if (!best) return;
  D.nowSynced = rebuildNow(`${best.track.name} R${best.nextRank}`, best.cost, best.track.id) !== false;
}

export function reset() {
  D = {
    Eref: cb.E, tNow: 0, line12aAt: null, nudged: false, chimeAt: 0,
    pulseShown: false, pulseKind: null,
    openAt: null, closeAt: null, pressAt: null, pressId: null,
    boughtAt: null, lastBuyAt: null, lastBuyIdx: 0, lastCost: 0,
    ranks: TRACKS.map(() => 0), sel: 0, spent: 0, mile: null, quips: [],
    line12said: false, doneAt: null, wasAfford: false, hintUntil: -1,
    statusMsg: '', statusUntil: -1, lastStage: null, nowSynced: false,
  };
  setTrainPulse(false); setTrainingOpen(false); setTileLocked('train', true);
  syncNowTag();
  cb.applyTraining('reset', D.ranks);
  if (A) dynAll();
}
reset();

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function started() { return !!D && D.line12aAt !== null; }
export function trainingOpen() { return !!D && D.openAt !== null; }
export function wantsPointer() { return !!D && D.line12aAt !== null && (D.openAt !== null || D.boughtAt === null); }
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
  const ranks = [...D.ranks], stats = cb.trainingStats();
  const best = cheapestInfo();
  const px = PANX, py = PANY;
  return {
    line12a: D.line12aAt,
    line12: D.line12said,
    pulse: D.pulseShown,
    open: D.openAt !== null,
    sel: D.sel,
    bought: D.boughtAt !== null,
    done: D.doneAt,
    ranks,
    spent: D.spent,
    cheapest: cheapest(),
    cheapestTrack: best ? { id: best.track.id, name: best.track.name, nextRank: best.nextRank, cost: best.cost } : null,
    dmgMult: stats.dmgMult,
    stats,
    mile: D.mile ? { id: TRACKS[D.mile.i].id, tag: D.mile.tag } : null,
    quips: [...D.quips],
    tile: { ...TILE },
    panel: { x: px, y: py, w: PANW, h: PANH },
    cards: TRACKS.map((_, i) => {
      const cIdx = i % 2, rIdx = Math.floor(i / 2);
      return { id: TRACKS[i].id, x: px + CARDX[cIdx], y: py + CARDY[rIdx], w: CARDW, h: CARDH, locked: lockedTrack(i), unlockStage: TRACK_UNLOCK[TRACKS[i].id] };
    }),
    buy: TRACKS.map((_, i) => {
      const cIdx = i % 2, rIdx = Math.floor(i / 2);
      return { id: TRACKS[i].id, x: px + CARDX[cIdx] + BUYR.x, y: py + CARDY[rIdx] + BUYR.y, w: BUYR.w, h: BUYR.h };
    }),
    doneRect: { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h },
    nowRects: getNowRects(),
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
  D.pulseShown = false; setTrainPulse(false); setTrainingOpen(true);
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}
function closeScreen(t) {
  if (D.closeAt !== null) return;
  D.closeAt = t; setTrainingOpen(false);
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}

function buy(t, i) {
  const s = cb.warp(t), tr = TRACKS[i], p = D.ranks[i], cst = tr.cost(p);
  D.pressAt = t; D.pressId = `buy:${i}`; D.sel = i;
  D.lastBuyAt = t; D.lastBuyIdx = i; D.lastCost = cst;
  if (D.boughtAt === null) D.boughtAt = t;
  D.ranks[i]++; D.spent += cst;
  cb.buyCp(cst, s);
  cb.applyTraining(tr.id, D.ranks);
  const newR = D.ranks[i];
  const m = tr.miles.find(([r]) => r === newR);
  if (m) {
    D.mile = { i, tag: m[1], note: m[2], at: t };
    cb.E.live.push({ s: s + 0.04, k: 'ding' });
    const qKey = tr.id === 'scavenging'
      ? (newR === 5 ? 'mq_scavenging_1' : 'mq_scavenging_0')
      : `mq_${tr.id}_${newR >= 25 ? 1 : 0}`;
    if (DIALOGUE[qKey] && !D.quips.includes(qKey) && !busyLine(s)) {
      D.quips.push(qKey);
      say(qKey, s + 0.25);
    }
  } else {
    cb.E.live.push({ s: s + 0.02, k: 'chime' });
  }
  D.statusMsg = `${tr.name} Rank ${newR}! (${tr.fxName} ${tr.fx(newR)})`;
  D.statusUntil = t + 2.0;
  syncNowTag();
  dynText(i);
}

export function quickBuyCheapest(t) {
  if (!D || D.line12aAt === null || D.openAt !== null) return false;
  const best = cheapestInfo();
  if (!best) return false;
  if (cb.hudState(t).cp >= best.cost) {
    buy(t, best.index);
    const shortName = best.track.name.replace(/\s*Drills?$/i, '').toUpperCase();
    flashNowBuy(`+1 ${shortName} R${best.nextRank}!`);
    return true;
  }
  lockRattle(t, 'now', `Need ${best.cost} cp for ${best.track.name}.`);
  return true;
}

export function clickNow(gx, gy, t) {
  if (!D || D.openAt !== null) return false;
  if (D.line12aAt === null) {
    if (inNowQuickBuy(gx, gy) || inNowTag(gx, gy)) {
      lockRattle(t, 'tile');
      return true;
    }
    return false;
  }
  if (inNowQuickBuy(gx, gy)) return quickBuyCheapest(t);
  if (inNowTag(gx, gy)) { openScreen(t); return true; }
  return false;
}

export function click(gx, gy, t) {
  if (!D) return false;
  if (D.line12aAt === null) {
    if (inTile(gx, gy)) { lockRattle(t, 'tile'); return true; }
    return false;
  }
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(t));
    // Sub-tab boards
    const tabY = py + 28, tabH = 24;
    if (gy >= tabY && gy < tabY + tabH) {
      if (gx >= px + 14 && gx < px + 126) { cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
      if (gx >= px + 132 && gx < px + 284) {
        lockRattle(t, 'tab_realms', 'Realms Mastery unlocks at Stage 100!');
        return true;
      }
      // Buy Multiplier buttons
      for (const m of MULT_DEFS) {
        const mx = px + m.x, my = py + 35;
        if (gx >= mx && gx < mx + m.w && gy >= my && gy < my + 17) {
          if (m.stage > currentStage()) {
            lockRattle(t, `mult_${m.id}`, `Buy ${m.label} unlocks at Stage ${m.stage}!`);
          } else {
            cb.E.live.push({ s: cb.warp(t), k: 'paper' });
          }
          return true;
        }
      }
    }

    // 6 Drill Cards
    for (let i = 0; i < TRACKS.length; i++) {
      const cIdx = i % 2, rIdx = Math.floor(i / 2);
      const X = px + CARDX[cIdx], Y = py + CARDY[rIdx];
      if (gx >= X && gx < X + CARDW && gy >= Y && gy < Y + CARDH) {
        D.sel = i;
        if (lockedTrack(i)) {
          lockRattle(t, `card_${i}`, `${TRACKS[i].name} unlocks at Stage ${TRACK_UNLOCK[TRACKS[i].id]}!`);
          return true;
        }
        const cst = TRACKS[i].cost(D.ranks[i]);
        if (cb.hudState(t).cp >= cst) {
          buy(t, i);
        } else {
          lockRattle(t, `short_${i}`, `Thy purse is short — need ${cst} cp for ${TRACKS[i].name}.`);
        }
        return true;
      }
    }

    const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
    const inPanel = gx >= px && gx < px + PANW && gy >= py && gy < py + PANH;
    if ((gx >= dr.x && gx < dr.x + dr.w && gy >= dr.y && gy < dr.y + dr.h) || !inPanel) {
      D.pressAt = t; D.pressId = 'done';
      closeScreen(t);
    }
    return true;
  }
  if (inTile(gx, gy)) { openScreen(t); return true; }
  return false;
}

export function key(k, t) {
  if (!D || D.line12aAt === null) return false;
  if (k === 'Escape') { if (D.openAt !== null) { closeScreen(t); return true; } return false; }
  if (k === 't' || k === 'T') {
    if (D.openAt !== null) closeScreen(t); else openScreen(t);
    return true;
  }
  if (D.openAt === null) return false;
  if (k >= '1' && k <= '6') {
    const idx = parseInt(k, 10) - 1;
    D.sel = idx;
    if (lockedTrack(idx)) lockRattle(t, `card_${idx}`, `${TRACKS[idx].name} unlocks at Stage ${TRACK_UNLOCK[TRACKS[idx].id]}!`);
    else if (cb.hudState(t).cp >= TRACKS[idx].cost(D.ranks[idx])) buy(t, idx);
    else lockRattle(t, `short_${idx}`, `Need ${TRACKS[idx].cost(D.ranks[idx])} cp.`);
    return true;
  }
  if (k === 'ArrowRight') { D.sel = (D.sel + 1) % TRACKS.length; return true; }
  if (k === 'ArrowLeft') { D.sel = (D.sel + TRACKS.length - 1) % TRACKS.length; return true; }
  if (k === 'ArrowDown') { D.sel = (D.sel + 2) % TRACKS.length; return true; }
  if (k === 'ArrowUp') { D.sel = (D.sel + TRACKS.length - 2) % TRACKS.length; return true; }
  if (k === 'Enter' || k === ' ') {
    const idx = D.sel;
    if (lockedTrack(idx)) lockRattle(t, `card_${idx}`, `${TRACKS[idx].name} unlocks at Stage ${TRACK_UNLOCK[TRACKS[idx].id]}!`);
    else if (cb.hudState(t).cp >= TRACKS[idx].cost(D.ranks[idx])) buy(t, idx);
    else lockRattle(t, `short_${idx}`, `Need ${TRACKS[idx].cost(D.ranks[idx])} cp.`);
    return true;
  }
  return false;
}

export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {
    const hard = D.line12aAt !== null || D.ranks.some(r => r > 0);
    D.Eref = cb.E;
    if (hard) reset();
  }
  const stg = currentStage();
  if (D.lastStage !== stg || !D.nowSynced) {
    const stageChanged = D.lastStage !== stg;
    D.lastStage = stg;
    syncNowTag();
    if (stageChanged && A) dynAll();
  }
  D.tNow = t;
  const s = cb.warp(t);
  if (D.line12aAt === null) {
    const b5 = beat5.debug();
    if (!b5 || b5.done === null || s < b5.done + 1.2 || busyLine(s)) return;
    if (cb.hudState(t).cp < TRACKS[0].cost(0)) return;
    D.line12aAt = s + 0.1; say('line12a', D.line12aAt); setTileLocked('train', false);
    return;
  }
  const tutor = D.openAt === null && D.boughtAt === null;
  const tutorPulse = tutor && s >= D.line12aAt + NUDGE.pulse;
  const afford = cb.hudState(t).cp >= cheapest();
  if (afford && !D.wasAfford && D.boughtAt !== null) D.hintUntil = t + 2.5;
  D.wasAfford = afford;
  const pulse = D.openAt === null && (tutorPulse || (D.boughtAt !== null && afford && t < D.hintUntil));
  if (pulse !== D.pulseShown) { D.pulseShown = pulse; setTrainPulse(pulse); }
  if (tutorPulse && s >= D.chimeAt) { cb.E.live.push({ s, k: 'chime' }); D.chimeAt = s + 2.5; }
  if (!D.nudged && tutor && s >= D.line12aAt + NUDGE.line && !busyLine(s)) {
    D.nudged = true; say('trainNudge', s);
  }
  if (D.closeAt !== null && t > D.closeAt + 0.28) { D.openAt = null; D.closeAt = null; }
  if (D.boughtAt !== null && D.openAt === null && D.closeAt === null && !D.line12said && !busyLine(s)) {
    D.line12said = true; say('line12', s + 0.3);
  }
  if (D.doneAt === null && D.line12said && s > lineEnd(DIALOGUE.line12) + 1.1) D.doneAt = s;
}

export function drawSpot(ctx, p, t) {
  if (!D || D.line12aAt === null || D.boughtAt !== null || D.openAt !== null) return;
  const s = cb.warp(t);
  const k = easeOut(clamp((s - D.line12aAt) / 0.5));
  if (k <= 0) return;
  ctx.globalAlpha = 0.62 * k;
  ctx.drawImage(SPOT6, Math.round(TILE.x + 13 - 640), Math.round(TILE.y + 14 - 360));
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.line12aAt === null) return;
  const s = cb.warp(t);
  drawBanner(ctx, s);
  drawPointer(ctx, s);
  if (D.openAt !== null) drawScreen(ctx, uctx, t, s);
}

function drawBanner(ctx, s) {
  if (D.boughtAt !== null || D.openAt !== null) return;
  const at = DIALOGUE.line12a.at;
  if (!isFinite(at) || s < at + 0.4) return;
  const label = 'OPEN THE TRAINING YARD', w = numWidth(label) + 20, h = 15;
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
  if (D.boughtAt !== null || D.openAt !== null) return;
  const k = easeOut(clamp((s - D.line12aAt - NUDGE.pointer) / 0.4));
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

function drawScreen(ctx, uctx, t, s) {
  const k = panelK(t);
  if (k <= 0.02) return;
  const ak = clamp(k * 1.4);
  const [px, py] = panelPos(k);
  const st = cb.hudState(t);
  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);

  u.globalAlpha = 0.60 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.48)');
  IMG(A.panel, px, py);

  // Title + live Purse readout inside header
  put(u, A.txt.titleSh, px + PANW / 2, py + 19.5, 'c', 'm');
  put(u, A.txt.title, px + PANW / 2, py + 18.5, 'c', 'm');
  const prx = px + PANW - 92, pry = py + 11;
  IMG(A.coin, prx + 6, pry + 4);
  put(u, dynTxt('purse', `${st.cp} cp`, 'bold 16px "Pixelify Sans"', '#ffe7b0'), prx + 74, pry + 7.5, 'r', 'm');

  // Hanging Wooden Board Sub-Tabs (suspended on chains from y = 28)
  const rattleTab = D.pressId === 'tab_realms' && D.pressAt !== null && t - D.pressAt < 0.22
    ? Math.round(Math.sin((t - D.pressAt) * 80) * 1.5) : 0;
  IMG(A.boardActive, px + 14, py + 28);
  put(u, A.txt.subMartialSh, px + 14 + 56, py + 43.5, 'c', 'm');
  put(u, A.txt.subMartial, px + 14 + 56, py + 42.5, 'c', 'm');

  IMG(A.boardLocked, px + 130 + rattleTab, py + 28);
  IMG(A.lockSm, px + 136 + rattleTab, py + 38);
  put(u, A.txt.subRealms, px + 146 + rattleTab, py + 42.5, 'l', 'm');

  // Buy Multipliers Rack
  put(u, A.txt.buyLbl, px + 291, py + 43.5, 'l', 'm');
  for (const m of MULT_DEFS) {
    const mx = px + m.x, my = py + 35;
    const locked = m.stage > currentStage();
    const shake = D.pressId === `mult_${m.id}` && D.pressAt !== null && t - D.pressAt < 0.22
      ? Math.round(Math.sin((t - D.pressAt) * 80) * 1) : 0;
    if (!locked) {
      IMG(A.multOn, mx, my);
      put(u, dynTxt('mulOn', m.label, 'bold 16px "Pixelify Sans"', '#ffe9a0'), mx + m.w / 2, my + 8.5, 'c', 'm');
    } else {
      IMG(m.w >= 34 ? A.multLock : A.multLockSm, mx + shake, my);
      IMG(A.lockSm, mx + 2 + shake, my + 4);
      put(u, dynTxt('mulLk', m.label, '16px "Pixelify Sans"', '#c8c4d2'), mx + 11 + shake, my + 8.5, 'l', 'm');
    }
  }

  // 6 Martial Drills (2x3)
  for (let i = 0; i < TRACKS.length; i++) {
    const cIdx = i % 2, rIdx = Math.floor(i / 2);
    const tr = TRACKS[i], T = A.tr[i], pRank = D.ranks[i];
    const cx0 = px + CARDX[cIdx], cy0 = py + CARDY[rIdx];
    const cst = tr.cost(pRank), afford = st.cp >= cst;
    const locked = lockedTrack(i);
    const sel = !locked && D.sel === i;

    IMG(locked ? A.cardLocked : (sel ? A.cardSel : A.card), cx0, cy0);
    IMG(locked ? A.iconsLocked[tr.id] : A.icons[tr.id], cx0 + 7, cy0 + 7);
    put(u, locked ? T.nameLocked : T.name, cx0 + 31, cy0 + 6);

    if (locked) {
      // Stage badge top-right
      R(cx0 + CARDW - 44, cy0 + 5, 38, 12, '#140b0c');
      R(cx0 + CARDW - 43, cy0 + 6, 36, 10, '#36343e');
      put(u, dynTxt('stg', `STG ${TRACK_UNLOCK[tr.id]}`, '16px "Pixelify Sans"', '#f6d888'), cx0 + CARDW - 25, cy0 + 11, 'c', 'm');
      put(u, T.preview, cx0 + 31, cy0 + 18);
      put(u, T.lockNote, cx0 + 31, cy0 + 29);

      // Clean recessed lock bar across card footer — zero overlapping ghost text
      const shake = D.pressId === `card_${i}` && D.pressAt !== null && t - D.pressAt < 0.22
        ? Math.round(Math.sin((t - D.pressAt) * 80) * 1.5) : 0;
      IMG(A.lockBar, cx0 + 7 + shake, cy0 + 41);
      IMG(A.lockSm, cx0 + 12 + shake, cy0 + 45);
      put(u, T.unlockLbl, cx0 + 22 + shake, cy0 + 49.5, 'l', 'm');
      IMG(A.coin, cx0 + CARDW - 50, cy0 + 46);
      put(u, T.cost, cx0 + CARDW - 11, cy0 + 49.5, 'r', 'm');
    } else {
      // Rank pill top-right
      R(cx0 + CARDW - 40, cy0 + 5, 34, 12, '#140b0c');
      R(cx0 + CARDW - 39, cy0 + 6, 32, 10, '#4d3125');
      put(u, T.rank, cx0 + CARDW - 23, cy0 + 11, 'c', 'm');

      // Current -> Next Effect + Next Milestone
      put(u, T.fxLine, cx0 + 31, cy0 + 18);
      put(u, T.fxDelta, cx0 + 31 + Math.ceil(T.fxLine.inkW / S) + 4, cy0 + 18);
      put(u, T.mile, cx0 + 31, cy0 + 29);

      // 10-rank Milestone Pips bottom-left
      const nxt = tr.miles.find(([r]) => r > pRank);
      const prevM = [...tr.miles].reverse().find(([r]) => r <= pRank);
      const baseR = prevM ? prevM[0] : 0;
      const span = nxt ? nxt[0] - baseR : 10;
      const prog = nxt ? Math.min(10, Math.floor(((pRank - baseR) / span) * 10)) : 10;
      for (let pk = 0; pk < 10; pk++) {
        const pxp = cx0 + 8 + pk * 10, pyp = cy0 + 42;
        R(pxp, pyp, 9, 5, '#140b0c');
        if (pk < prog) {
          R(pxp + 1, pyp + 1, 7, 3, '#e2a83a');
          R(pxp + 1, pyp + 1, 7, 1, '#fff1b8');
        } else if (pk === prog && afford) {
          const g = Math.floor(t * 4) % 2;
          R(pxp + 1, pyp + 1, 7, 3, g ? '#8a6a34' : '#4a341c');
        } else {
          R(pxp + 1, pyp + 1, 7, 3, '#2e1d10');
        }
      }
      put(u, afford ? A.txt.ready : A.txt.short, cx0 + 8, cy0 + 50);

      // Buy Button bottom-right: TRAIN + coin icon + cost (NO '+' sign!)
      const bx = cx0 + BUYR.x, by = cy0 + BUYR.y;
      const pressed = D.pressId === `buy:${i}` && D.pressAt !== null && t - D.pressAt < 0.14;
      const btnImg = afford ? (pressed ? A.buyOkP : A.buyOk) : A.buyDim;
      IMG(btnImg, bx, by + (pressed ? 1 : 0));
      const pyText = by + 8.5 + (pressed ? 1 : 0);
      put(u, A.txt.trainSh, bx + 6, pyText + 1, 'l', 'm');
      put(u, A.txt.train, bx + 6, pyText, 'l', 'm');
      IMG(A.coin, bx + 46, by + 5 + (pressed ? 1 : 0));
      put(u, afford ? T.cost : T.costDim, bx + BUYR.w - 6, pyText, 'r', 'm');
    }
  }

  // Purchase floating feedback (+DAMAGE)
  if (D.lastBuyAt !== null && t - D.lastBuyAt < 0.9) {
    const d = t - D.lastBuyAt, tr = TRACKS[D.lastBuyIdx];
    const cIdx = D.lastBuyIdx % 2, rIdx = Math.floor(D.lastBuyIdx / 2);
    const fx = px + CARDX[cIdx] + BUYR.x + BUYR.w / 2;
    const fy = py + CARDY[rIdx] + BUYR.y - 6 - d * 18;
    u.globalAlpha = ak * clamp(1 - d / 0.9);
    put(u, dynTxt('flt', tr.float, 'bold 18px "Pixelify Sans"', '#ffe9a0'), fx, fy, 'c', 'm');
    u.globalAlpha = ak;
  }

  // Milestone Banner celebration
  if (D.mile && t - D.mile.at < 2.2) {
    const d = t - D.mile.at;
    u.globalAlpha = ak * clamp(1 - Math.max(0, d - 1.6) / 0.6);
    R(px + 90, py + 266, 270, 22, '#140b0c');
    R(px + 91, py + 267, 268, 20, '#3a6620');
    R(px + 91, py + 267, 268, 1, '#a8e878');
    put(u, dynTxt('mile', `MILESTONE ${D.mile.tag} ${D.mile.note}`, 'bold 16px "Pixelify Sans"', '#fff6d8'), px + 225, py + 277, 'c', 'm');
    u.globalAlpha = ak;
  } else {
    // Footer summary / status message
    const stats = cb.trainingStats();
    const showStatus = t < D.statusUntil && D.statusMsg;
    const msg = showStatus
      ? D.statusMsg
      : `DMG ×${stats.dmgMult.toFixed(1)} · Click card or [1-6] to train · [T] close`;
    const col = showStatus && (D.pressId?.startsWith('tab') || D.pressId?.startsWith('card') || D.pressId?.startsWith('mult') || D.pressId?.startsWith('short'))
      ? '#8a2020'
      : '#4d3125';
    put(u, dynTxt('foot', msg, '16px "Pixelify Sans"', col), px + 14, py + 280, 'l', 'm');
  }

  // DONE Button
  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  const dPress = D.pressId === 'done' && D.pressAt !== null && t - D.pressAt < 0.14;
  IMG(dPress ? A.doneP : A.done, dr.x, dr.y + (dPress ? 1 : 0));
  put(u, A.txt.doneSh, dr.x + dr.w / 2, dr.y + dr.h / 2 + 1 + (dPress ? 1 : 0), 'c', 'm');
  put(u, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + dr.h / 2 + (dPress ? 1 : 0), 'c', 'm');

  // Tutorial steel gauntlet pointing at Weapon Drills TRAIN button until first rank bought
  if (D.boughtAt === null && D.openAt !== null && t > D.openAt + 0.45) {
    const ph = (t % 1.1) / 1.1, press = ph > 0.55 && ph < 0.72;
    const gx = px + CARDX[0] + BUYR.x + BUYR.w / 2 + (press ? 0 : 2);
    const gy = py + CARDY[0] + BUYR.y + BUYR.h - 2 + (press ? 2 : Math.round(Math.sin(ph * Math.PI * 2) * 2));
    IMG(press ? A.gauntP : A.gaunt, gx - GAUNTLET_TIP[0], gy - GAUNTLET_TIP[1]);
  }

  u.globalAlpha = 1;
}
