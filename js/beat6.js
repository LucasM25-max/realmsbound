// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 6 — the Training Yard (the first purchase)
//
//  The goblins are thumped and the purse holds thirteen copper.
//  Elminster: "Thou hast coin. Spend it!" — the Train tab pulses
//  gold under a spotlight until the player opens it (click or T).
//
//  The TRAINING YARD screen fills most of the stage; the meadow
//  waits, dimmed and paused, behind it. All six drills of design
//  plan §5.6 are on the board — Weapon, Armour, Footwork, Tactics,
//  Scavenging, Conditioning — two cards to a page. Every drill
//  climbs ~10% dearer a rank (the plan's 8–12% band); Weapon
//  Drills opens at 10 cp because the purse holds 13 at this point.
//
//  Buying pops the rank pip, spills the copper clink by clink, and
//  floats the drill's gain off the card. Crossing a milestone rank
//  (×2 damage at 10, coins that pick themselves up at Scavenging
//  5, and so on) explodes a gold stamp across the card and earns a
//  word from Elminster once the yard is closed.
//
//  The yard stays open for business afterwards: T (or the tile)
//  reopens it, and the tab gives a brief gold hop whenever some
//  drill is freshly affordable. Arrows / 1–6 pick a drill; the
//  chevron plates (or the other card) turn the page.
// ─────────────────────────────────────────────────────────────
import { W, H, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat5 from './beat5.js';
import { setTrainPulse, setTrainingOpen, rebuildNow, setTileLocked } from './hud.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { makeCanvas, crispText, clamp, easeOut, easeOutBack, hash } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const TRACKS = cb.TRACKS;
const TILE = { x: 552, y: 329, w: 26, h: 29 };       // the belt's Train tile (hud.js BELT + TILES[0])
const inTile = (gx, gy) => gx >= TILE.x && gx < TILE.x + TILE.w && gy >= TILE.y && gy < TILE.y + TILE.h;
const PANW = 380, PANH = 280, PANX = 130, PANY = 34; // the Training screen itself
const CARDW = 166, CARDH = 176, CARDY = 44;          // one drill card
const CARDX = [14, 200];                             // the two page slots
const DONER = { x: 306, y: 252, w: 60, h: 26 };      // panel-relative
const NAVR = [{ x: 14, y: 252, w: 30, h: 26 }, { x: 48, y: 252, w: 30, h: 26 }]; // PREV / NEXT
const PIP0 = { x: 40, y: 41 };                       // first rank pip, card-relative
const BUYROW = { y: 138, h: 30 };                    // the buy strip, card-relative
const NUDGE = { pointer: 6, line: 15, pulse: 30 };

let D = null, A = null, SPOT6 = null;

// ---------- text on the 2× UI canvas (same conventions as hud.js) ----------
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

// ---------- little pixel icons, one per drill (20×20 bitmaps) ----------
const ICONS = {
  weapon: ['......KK......', '.....CSS......', '.....CSS......', '....CSS.......', '....CSS.......', '...CSS........', '...CSS........', '..CSS.........', '..CSS.........', '.CSS..........', '.CSS..KK......', 'KSS...KBBK....', 'KK...KBBBBK...', '......KBK.KK..', '.KK..KBBK.....', 'KPZK.KBK......', 'KPPKKKK.......', '.KKK..........'],
  armour: ['....KKKKKK....', '..KKSSSSSSKK..', '.KSSSSSSSSSSK.', '.KSSSHHSSSSSK.', 'KSSSSHHSSSSSSK', 'KSSSSHHSSSSSSK', 'KSHHHHHHHHHHSK', 'KSHHHHHHHHHHSK', '.KSSSHHSSSSK.', '.KSSSHHSSSSK.', '..KSSHHSSSK...', '..KSSSSSSSK...', '...KSSSSSK....', '....KSSSK.....', '.....KSK......', '......K.......'],
  footwork: ['..............', '..KKKK........', '.KLLLLK.......', '.KLLLLK..K....', '.KLLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLLKK....', '..KLLLLLLLLK..', '.KLLLLLLLLLLK.', 'KLLLLLLLLLLLLK', 'KSSSSSSSSSSSSK', 'KKKKKKKKKKKKKK', '..............'],
  tactics: ['.....KK.......', '....KHHK......', '...KHHHHK.....', '..KKHHHHKK....', '..KSSSSSSK....', '.KSSSSSSSSK...', 'KSSSSSSSSSSK..', 'KSSCCSSSSSSK..', 'KSSSSSSSSSSK..', 'KKKKKKKKKKKK..', 'KSSKSSSSKSSK..', 'KSSSSSSSSSSK..', '.KKKKKKKKKK...', '..............'],
  scavenging: ['..............', '.....KKKKK....', '....KRRRRK....', '.....KRRK.....', '...KKKKKKKK...', '..KLLLLLLLLK..', '.KLLKKKKKKLLK.', '.KLLKGGGGKLLK.', 'KLLLKGGGGKLLLK', 'KLLLKGKKKLLLLK', 'KLLLLLLLLLLLLK', 'KLLLLLLLLLLLLK', '.KLLLLLLLLLLK.', '..KKKKKKKKKK..', '..............'],
  conditioning: ['..............', '..KKK..KKK....', '.KHHHKKHHHK...', '.KHWHHHHHHK...', 'KHHHHHHHHHHK..', 'KHHHHHHHHHHK..', 'KHHHHHHHHHHK..', '.KHHHHHHHHK...', '..KHHHHHHK....', '...KHHHHK.....', '....KHHK......', '.....KK.......', '..............'],
};
const ICONCOL = { K: '#140b0c', S: '#b8bcc4', C: '#e8ecf2', B: '#7a4a28', P: '#4d3125', Z: '#2a1a16', L: '#5f3e2e', R: '#8a5a34', G: '#e2b75a', H: '#a3362c', W: '#ffb0a0' };

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
  // carved oak frame, bevel lit from the top-left
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
  // brass rivets
  for (const [rx, ry] of [[6, 6], [PANW - 7, 6], [6, PANH - 7], [PANW - 7, PANH - 7], [PANW >> 1, 6], [PANW >> 1, PANH - 7]]) {
    fill('#7a5418', rx - 1, ry - 1, 3, 3); fill('#e2b75a', rx, ry, 2, 2); fill('#fff1b8', rx, ry);
  }
  // the parchment field
  for (let j = B + 2; j < PANH - B - 2; j++) for (let i = B + 2; i < PANW - B - 2; i++) {
    const e = Math.min(i - B - 2, j - B - 2, PANW - B - 3 - i, PANH - B - 3 - j);
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.1 + Math.sin(i * 0.09 + j * 0.05) * 0.16 - Math.max(0, 5 - e) * 0.4 - (j / PANH) * 0.25;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], i, j);
  }
  // title strip: a band of dark leather with stitching
  const TS = { y: B + 3, h: 25 };
  fill(O, B + 2, TS.y, PANW - 2 * B - 4, TS.h);
  for (let j = 0; j < TS.h - 2; j++) for (let i = 0; i < PANW - 2 * B - 6; i++) {
    const n = hash(i * 13 + j * 41, 5);
    fill(LEA[Math.max(0, Math.min(3, 1 + Math.round(Math.sin(i * 0.11) * 0.7 + (n > 0.9 ? 1 : 0) + j * 0.04)))], B + 3 + i, TS.y + 1 + j);
  }
  for (let i = 4; i < PANW - 2 * B - 10; i += 6) { fill('#8a6a4c', B + 3 + i, TS.y + 3, 3, 1); fill('#8a6a4c', B + 3 + i, TS.y + TS.h - 4, 3, 1); }
  fill('rgba(20,10,8,0.5)', B + 2, TS.y + TS.h, PANW - 2 * B - 4, 2);
  // the footer divider: brass dashes either side of a label
  const FY = 238, lblW = 120;
  for (let i = B + 4; i < PANW - 2 * B - 8 + B + 4; i += 8) {
    if (i > PANW / 2 - lblW / 2 - 6 && i < PANW / 2 + lblW / 2) continue;
    fill('#8a5f1e', i, FY, 4, 1); fill('#e8c068', i, FY, 3, 1);
  }
  return c;
}

// one drill card: thin wood edge, deeper parchment, the drill's painted mark
function paintCard(sel) {
  const [c, x] = makeCanvas(CARDW, CARDH);
  const O = '#140b0c';
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, CARDW, CARDH);
  fill(sel ? '#c4943a' : '#6e4727', 1, 1, CARDW - 2, CARDH - 2);
  fill(sel ? '#f6d888' : '#875a31', 1, 1, CARDW - 2, 1);
  for (let j = 0; j < CARDH - 4; j++) for (let i = 0; i < CARDW - 4; i++) {
    const e = Math.min(i, j, CARDW - 5 - i, CARDH - 5 - j);
    const n = hash(i * 17 + j * 29, 23);
    let v = 3.9 + Math.sin(i * 0.07 - j * 0.06) * 0.14 - Math.max(0, 4 - e) * 0.35;
    if (sel) v += 0.35;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], 2 + i, 2 + j);
  }
  fill('rgba(60,30,10,0.3)', 2, 2, CARDW - 4, 1);
  // the divider under the header
  fill('#8a5f1e', 8, 52, CARDW - 16, 1);
  for (let i = 0; i < CARDW - 16; i += 8) fill('#e8c068', 8 + i, 52, 3, 1);
  return c;
}

// the drill's painted mark: a 22×22 straw disc with the track's glyph on it
function paintIcon(id) {
  const [c, x] = makeCanvas(22, 22);
  const O = '#140b0c';
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) {
    const r = Math.hypot(i - 10.5, j - 10.5);
    if (r > 10.5) continue;
    fill(r > 9.5 ? O : r > 7.5 ? '#d8b25e' : r > 5.5 ? '#a3362c' : '#f2e2bd', i, j);
  }
  const bm = ICONS[id], s = 1, ox = 4, oy = 4;
  for (let j = 0; j < bm.length; j++) for (let i = 0; i < bm[j].length; i++) {
    const col = ICONCOL[bm[j][i]];
    if (col) fill(col, ox + i * s, oy + j * s, s, s);
  }
  fill('rgba(255,255,255,0.3)', 3, 3, 3, 2);
  return c;
}

// a brass-edged wooden button plate (DONE / the page chevrons)
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

// the padlock that seals the untaught paths: iron shackle, brass body, a keyhole that fits no key here
function paintLock() {
  const [c, x] = makeCanvas(18, 20);
  const IR = ['#1c1b22', '#33313d', '#4b4856', '#65616f', '#878394'];
  const BR = ['#3e2a0c', '#5c3e12', '#7a5418', '#9a7026', '#c4943a', '#e2b75a', '#f6d888'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  // the shackle: an iron arch standing proud of the body
  for (const [X, Y] of [[5, 1], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 1],
    [4, 2], [5, 1], [12, 1], [13, 2], [4, 3], [13, 3], [4, 4], [13, 4], [4, 5], [13, 5], [4, 6], [13, 6], [4, 7], [13, 7]]) fill(IR[3], X, Y);
  for (const [X, Y] of [[6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [5, 2], [12, 2]]) fill(IR[1], X, Y);
  fill(IR[4], 5, 1, 2, 1); fill(IR[4], 4, 2, 1, 3);
  // the body, brass with a lit top and a worn base
  fill('#140b0c', 2, 8, 14, 11);
  for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) {
    const n = hash(i * 7 + j * 13, 31);
    fill(BR[Math.max(0, Math.min(6, Math.round(3.2 - j * 0.22 - i * 0.05 + (n - 0.5))))], 3 + i, 9 + j);
  }
  fill(BR[5], 3, 9, 12, 1); fill(BR[1], 3, 17, 12, 1);
  // the keyhole
  fill('#140b0c', 8, 11, 2, 2); fill('#140b0c', 8, 13, 1, 3);
  fill('#241208', 9, 13, 1, 3);
  return c;
}

// the buy strip: a long wood-and-brass plate the width of a card
function paintBuyStrip(pressed = false) {
  const w = CARDW - 16, h = BUYROW.h;
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const WD = pressed ? ['#1d1208', '#2e1a0f', '#3d2414', '#4a2e18'] : ['#3d2414', '#56361d', '#6e4727', '#875a31'];
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill(O, 0, 0, w, h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const g = Math.sin(i * 0.21 + j * 1.7 + Math.sin(i * 0.05) * 3);
    fill(WD[Math.max(0, Math.min(3, 1 + (g > 0.5 ? 1 : g < -0.6 ? -1 : 0)))], i, j);
  }
  fill(pressed ? '#5c3e12' : '#c4943a', 1, 1, w - 2, 1);
  fill(pressed ? '#7a5418' : '#9a7026', 1, h - 2, w - 2, 1);
  if (pressed) fill('rgba(10,5,8,0.35)', 1, 1, w - 2, h - 2);
  else fill('rgba(255,240,200,0.13)', 1, 1, w - 2, 1);
  return c;
}

function paintCoin() {
  const [c, x] = makeCanvas(7, 7);
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
    const r = Math.hypot(i - 3, j - 3);
    if (r > 3.2) continue;
    fill(r > 2.2 ? '#7a5418' : j < 3 ? '#f6d888' : '#e2b75a', i, j);
  }
  fill('#fff1b8', 2, 2);
  return c;
}

// rank-dependent text (rebuilt after every purchase of that drill)
function dynText(i) {
  const tr = TRACKS[i], p = D.ranks[i];
  const T = A.tr[i];
  T.rank = t2('RANK ' + p, 'bold 12px "Pixelify Sans"', '#8a5f2e');
  T.fxCur = t2(tr.fx(p), 'bold 17px "Pixelify Sans"', '#3b2418');
  T.fxNext = t2(tr.fx(p + 1), 'bold 17px "Pixelify Sans"', '#2e5a1c');
  T.note2 = t2(cb.nextMile(tr, p), '13px "Pixelify Sans"', '#8a6a3c');
  T.buy = t2('BUY · RANK ' + (p + 1), 'bold 15px "Pixelify Sans"', '#ffe9a0');
  T.buySh = t2('BUY · RANK ' + (p + 1), 'bold 15px "Pixelify Sans"', '#241208');
}
const dynAll = () => { for (let i = 0; i < TRACKS.length; i++) dynText(i); };

export function buildBeat6() {
  SPOT6 = cb.buildSpot(16, 18, 1.1);                 // a tight hole over the Train tile
  A = { panel: paintPanel(), card: paintCard(false), cardSel: paintCard(true),
    strip: paintBuyStrip(false), stripP: paintBuyStrip(true),
    done: paintPlate(DONER.w, DONER.h), doneP: paintPlate(DONER.w, DONER.h, true),
    navP: paintPlate(NAVR[0].w, NAVR[0].h), navPP: paintPlate(NAVR[0].w, NAVR[0].h, true),
    coin: paintCoin(), gaunt: buildGauntlet(false), gauntP: buildGauntlet(true),
    icons: {}, tr: [], txt: {} };
  for (const tr of TRACKS) A.icons[tr.id] = paintIcon(tr.id);
  for (const tr of TRACKS) A.tr.push({
    name: t2(tr.name, 'bold 16px "Pixelify Sans"', '#3b2418'),
    kind: t2(tr.kind, '12px "Pixelify Sans"', '#8a6a3c'),
    d1: t2(tr.d1, '14px "Pixelify Sans"', '#5a3a22'),
    d2: t2(tr.d2, '14px "Pixelify Sans"', '#5a3a22'),
    fxLbl: t2('EFFECT', 'bold 11px "Pixelify Sans"', '#8a6a3c', { spacing: 2 }),
    fxName: t2(tr.fxName, 'bold 17px "Pixelify Sans"', '#3b2418'),
  });
  A.txt.title = t2('TRAINING YARD', 'bold 27px "Pixelify Sans"', '#f6d888', { spacing: 3 });
  A.txt.titleSh = t2('TRAINING YARD', 'bold 27px "Pixelify Sans"', '#1a0d08', { spacing: 3 });
  A.txt.six = t2('· THE SIX DRILLS ·', 'bold 12px "Pixelify Sans"', '#e8c068', { spacing: 2 });
  A.txt.short = t2('Thy purse is short.', '13px "Pixelify Sans"', '#a3362c');
  A.txt.cp = t2('cp', '14px "Pixelify Sans"', '#ffe9a0');
  A.txt.hint = t2('T · close', '15px "Pixelify Sans"', '#8a6a3c');
  A.txt.doneLbl = t2('DONE', 'bold 16px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 16px "Pixelify Sans"', '#241208');
  A.txt.locked = t2('LOCKED', 'bold 13px "Pixelify Sans"', '#e8e4da', { spacing: 2 });
  A.txt.lockedSh = t2('LOCKED', 'bold 13px "Pixelify Sans"', '#14101c', { spacing: 2 });
  A.lock = paintLock();
  dynAll();
}

// ---------- state ----------
export function reset() {
  D = { Eref: cb.E, tNow: 0, line12aAt: null, nudged: false, chimeAt: 0, pulseShown: false, pulseKind: null,
        openAt: null, closeAt: null, pressAt: null, boughtAt: null, lastBuyAt: null, lastBuyIdx: 0, lastCost: 0,
        ranks: TRACKS.map(() => 0), sel: 0, spent: 0, mile: null, quips: [],
        line12said: false, doneAt: null, wasAfford: false, hintUntil: -1 };
  setTrainPulse(false); setTrainingOpen(false); setTileLocked('train', true);
  rebuildNow(1, TRACKS[0].cost(0));
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
const cheapest = () => Math.min(...TRACKS.map((tr, i) => tr.cost(D.ranks[i])));
// Stage 1 teaches only Weapon Drills; the other five paths sit behind chains and a padlock
const lockedTrack = i => TRACKS[i].id !== 'weapon';
function lockRattle(t) {
  D.pressAt = t;
  const s = cb.warp(t);
  cb.E.live.push({ s, k: 'paper' }, { s: s + 0.07, k: 'paper' });
}
export function debug() {
  if (!D) return null;
  const out = { line12a: D.line12aAt === null ? null : +D.line12aAt.toFixed(2), pulse: D.pulseShown, open: D.openAt !== null,
    sel: D.sel, ranks: [...D.ranks], spent: D.spent, cheapest: cheapest(), dmgMult: cb.E ? cb.E.dmgMult : 1,
    stats: cb.E ? cb.trainingStats() : null,
    bought: D.boughtAt !== null, line12: D.line12said, mile: D.mile ? { ...D.mile } : null,
    done: D.doneAt === null ? null : +D.doneAt.toFixed(2), tile: { ...TILE },
    cp: D.tNow ? cb.hudState(D.tNow).cp : null, b5done: (beat5.debug() || {}).done ?? null, busy: busyLine(cb.warp(D.tNow || 0)) };
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(D.tNow));
    out.panel = { x: px, y: py, w: PANW, h: PANH };
    out.cards = CARDX.map((cx, v) => ({ x: px + cx, y: py + CARDY, w: CARDW, h: CARDH, track: Math.min(TRACKS.length - 1, selPage() * 2 + v) }));
    out.buy = out.cards[selView()];
    out.doneRect = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
    out.nav = NAVR.map(r => ({ x: px + r.x, y: py + r.y, w: r.w, h: r.h }));
  }
  return out;
}

// ---------- open / close / buy ----------
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
  D.pressAt = t; D.lastBuyAt = t; D.lastBuyIdx = i; D.lastCost = cst;
  if (D.boughtAt === null) D.boughtAt = t;
  D.ranks[i]++; D.spent += cst;
  cb.buyCp(cst, s);                                     // the purse spills, clink by clink
  cb.applyTraining(tr.id, D.ranks);
  // a milestone rank crossed? the stamp explodes and Elminster has a word
  const tier = tr.miles.findIndex(([r]) => r === p + 1);
  if (tier >= 0) {
    D.mile = { t, idx: i, label: tr.miles[tier][1], rank: p + 1 };
    D.quips.push(`mq_${tr.id}_${Math.min(tier, 1)}`);
    cb.E.live.push({ s: s + 0.3, k: 'chime' }, { s: s + 0.42, k: 'chime' });
  }
  cb.E.live.push({ s: s + 0.02, k: 'chime' });
  if (tr.id === 'weapon') rebuildNow(D.ranks[i] + 1, tr.cost(D.ranks[i]));  // the NOW tag points at the next rank
  dynText(i);
}

// ---------- input ----------
function nav(t, d) {
  D.sel = (D.sel + d + TRACKS.length) % TRACKS.length;
  D.pressNavAt = t;
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}
export function click(gx, gy, t) {
  if (!D) return false;
  if (D.line12aAt === null) {                       // the tile is still chained: a rattle, not a lesson
    if (inTile(gx, gy)) { lockRattle(t); return true; }
    return false;
  }
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(t));
    // the two cards on the page: clicking the selected one buys; the other one selects it
    for (let v = 0; v < 2; v++) {
      const i = vCardTrack(v);
      const X = px + CARDX[v], Y = py + CARDY;
      if (gx >= X && gx < X + CARDW && gy >= Y && gy < Y + CARDH) {
        if (lockedTrack(i)) { lockRattle(t); return true; }      // chains, not copper
        if (i === D.sel) {
          if (cb.hudState(t).cp >= TRACKS[i].cost(D.ranks[i])) buy(t, i); else D.pressAt = t;
        } else {
          D.sel = i; D.pressNavAt = t;
          cb.E.live.push({ s: cb.warp(t), k: 'paper' });
        }
        return true;
      }
    }
    for (let n = 0; n < 2; n++) {
      const r = { x: px + NAVR[n].x, y: py + NAVR[n].y, w: NAVR[n].w, h: NAVR[n].h };
      if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) { nav(t, n === 0 ? -1 : 1); return true; }
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
  if (!D || D.line12aAt === null) return false;
  if (k === 'Escape') { if (D.openAt !== null) { closeScreen(t); return true; } return false; }
  if (k === 't' || k === 'T') {
    if (D.openAt !== null) closeScreen(t); else openScreen(t);
    return true;
  }
  if (D.openAt !== null) {
    if (k === 'ArrowLeft') { nav(t, -1); return true; }
    if (k === 'ArrowRight') { nav(t, 1); return true; }
    if (k >= '1' && k <= '6') { D.sel = Math.min(TRACKS.length - 1, +k - 1); D.pressNavAt = t; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
  }
  return false;
}

// which drill sits in each visible card slot (the selection "pages" the pair)
const selPage = () => D.sel >> 1;
const vCardTrack = v => Math.min(TRACKS.length - 1, selPage() * 2 + v);
const selView = () => D.sel - selPage() * 2;

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {                                // the store was rebuilt under us (replay)
    const hard = D.line12aAt !== null || D.ranks.some(r => r > 0);
    D.Eref = cb.E;
    if (hard) reset();
  }
  D.tNow = t;
  const s = cb.warp(t);
  if (D.line12aAt === null) {
    const b5 = beat5.debug();
    if (!b5 || b5.done === null || s < b5.done + 1.2 || busyLine(s)) return;
    if (cb.hudState(t).cp < TRACKS[0].cost(0)) return;  // the copper wandered off — wait for the purse
    D.line12aAt = s + 0.1; say('line12a', D.line12aAt); setTileLocked('train', false);
    return;
  }
  // nudges while waiting on first purchase (6s pointer, 15s quip, 30s gold pulse + chime),
  // plus a brief gold hop whenever some drill is freshly affordable afterwards
  const tutor = D.openAt === null && D.boughtAt === null;
  const tutorPulse = tutor && s >= D.line12aAt + NUDGE.pulse;
  const afford = cb.hudState(t).cp >= cheapest();
  if (afford && !D.wasAfford && D.boughtAt !== null) D.hintUntil = t + 2.5;
  D.wasAfford = afford;
  const pulse = D.openAt === null && (tutorPulse || (D.boughtAt !== null && afford && t < D.hintUntil));
  if (pulse !== D.pulseShown) { D.pulseShown = pulse; setTrainPulse(pulse); }
  D.pulseKind = D.boughtAt === null ? 'tutor' : 'hint';
  if (tutorPulse && s >= D.chimeAt) { cb.E.live.push({ s, k: 'chime' }); D.chimeAt = s + 2.5; }
  if (!D.nudged && tutor && s >= D.line12aAt + NUDGE.line && !busyLine(s)) {
    D.nudged = true; say('trainNudge', s);
  }
  if (D.closeAt !== null && t > D.closeAt + 0.28) { D.openAt = null; D.closeAt = null; }
  if (D.boughtAt !== null && D.openAt === null && D.closeAt === null && !D.line12said && !busyLine(s)) {
    D.line12said = true; say('line12', s + 0.3);
  }
  if (D.doneAt === null && D.line12said && s > lineEnd(DIALOGUE.line12) + 1.1) D.doneAt = s;
  // milestone quips queue up until the yard is closed and Elminster has a quiet moment
  if (D.line12said && D.quips.length && D.openAt === null && !busyLine(s)) {
    say(D.quips.shift(), s + 0.2);
  }
}

// ---------- spotlights (before the dialogue box, like Beat 4) ----------
export function drawSpot(ctx, p, t) {
  if (!D || D.line12aAt === null || D.boughtAt !== null || D.openAt !== null) return;
  const s = cb.warp(t);
  const k = easeOut(clamp((s - D.line12aAt) / 0.5));
  if (k <= 0) return;
  ctx.globalAlpha = 0.62 * k;
  ctx.drawImage(SPOT6, Math.round(TILE.x + 13 - 640), Math.round(TILE.y + 14 - 360));
  ctx.globalAlpha = 1;
}

// ---------- overlays ----------
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.line12aAt === null) return;
  const s = cb.warp(t);
  drawBanner(ctx, s);
  drawPointer(ctx, s);
  if (D.openAt !== null) drawScreen(ctx, uctx, t, s);
}

// the objective tag under Elminster's box: OPEN THE TRAINING YARD, until it's bought
function drawBanner(ctx, s) {
  if (D.boughtAt !== null || D.openAt !== null) return;
  const at = DIALOGUE.line12a.at;
  if (s < at + 0.4) return;
  const label = 'OPEN THE TRAINING YARD', w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3));
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
  const pulse = s >= D.line12aAt + NUDGE.pulse ? Math.abs(Math.sin(s * 3.2)) : 0;
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

// a gold chevron bobbing over the Train tile after 6s
function drawPointer(ctx, s) {
  if (D.boughtAt !== null || D.openAt !== null) return;
  const k = easeOut(clamp((s - D.line12aAt - NUDGE.pointer) / 0.4));
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

// ---------- the Training screen ----------
// Everything draws on the 2× UI canvas: the dim must cover the dialogue box's
// portrait and text, which live up there — so the panel and its contents do too.
function drawScreen(ctx, uctx, t, s) {
  const k = panelK(t);
  if (k <= 0.02) return;
  const ak = clamp(k * 1.4);
  const [px, py] = panelPos(k);
  const st = cb.hudState(t);
  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);
  // the paused world, dimmed behind the screen (covers the world, the HUD and the dialogue box)
  u.globalAlpha = 0.55 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.45)');
  IMG(A.panel, px, py);

  const page = selPage();
  for (let v = 0; v < 2; v++) {
    const i = Math.min(TRACKS.length - 1, page * 2 + v);
    const tr = TRACKS[i], T = A.tr[i], p = D.ranks[i];
    const sel = i === D.sel;
    const cx0 = px + CARDX[v], cy0 = py + CARDY - (sel ? 1 : 0);
    const cst = tr.cost(p), afford = st.cp >= cst;
    u.globalAlpha = ak * (sel ? 1 : 0.92);
    IMG(sel ? A.cardSel : A.card, cx0, cy0);
    IMG(A.icons[tr.id], cx0 + 11, cy0 + 11);
    u.globalAlpha = ak;

    // rank pips: ten sockets, filled gold as ranks are bought; the newest one pops
    const popD = (D.lastBuyAt === null || D.lastBuyIdx !== i) ? -1 : t - D.lastBuyAt;
    for (let q = 0; q < 10; q++) {
      const X = cx0 + PIP0.x + q * 11, Y = cy0 + PIP0.y;
      R(X - 1, Y - 1, 9, 9, '#140b0c');
      if (q < p) {
        const flash = q === p - 1 && popD >= 0 && popD < 0.5;
        R(X, Y, 7, 7, flash && popD < 0.18 ? '#fff8dc' : '#c4943a');
        R(X, Y, 7, 2, flash && popD < 0.18 ? '#ffffff' : '#f6d888');
        R(X, Y + 6, 7, 1, '#7a5418');
      } else {
        R(X, Y, 7, 7, '#2a1a12');
        R(X, Y, 7, 1, '#3b251d');
      }
    }
    // a little chevron over the next pip: "this one is next"
    if (p < 10) {
      const bob = Math.round(Math.sin(t * 4.2) * 1);
      const ccx = cx0 + PIP0.x + p * 11 + 3, ccy = cy0 + PIP0.y - 6 + bob;
      for (let r = 0; r < 3; r++) {
        R(ccx - 3 + r, ccy + r - 1, 7 - r * 2, 1, '#140b0c');
        R(ccx - 2 + r, ccy + r, 5 - r * 2, 1, r === 2 ? '#fff3b0' : '#e8a838');
      }
    }

    // the pixel arrow from the current effect to the next rank's
    const ax = cx0 + 16 + Math.ceil(T.fxName.inkW / S) + 8 + Math.ceil(T.fxCur.inkW / S) + 7, ay = cy0 + 103;
    R(ax, ay + 3, 10, 2, '#8a5f2e'); R(ax + 7, ay + 1, 2, 6, '#8a5f2e'); R(ax + 9, ay + 2, 2, 4, '#8a5f2e'); R(ax + 11, ay + 3, 2, 2, '#8a5f2e');

    // the buy strip (pressed just after a click; dimmed when the purse is short)
    const pressed = D.pressAt !== null && t - D.pressAt < 0.14 && (D.lastBuyIdx === i || D.sel === i);
    const by = cy0 + BUYROW.y;
    u.globalAlpha = ak * (afford ? 1 : 0.62);
    IMG(pressed ? A.stripP : A.strip, cx0 + 8, by + (pressed ? 1 : 0));
    u.globalAlpha = ak;
    const costStr = String(cst);
    const cw = 7 + 3 + numWidth(costStr) + 3 + Math.ceil(A.txt.cp.inkW / S);
    const ccx0 = Math.round(cx0 + CARDW - 12 - cw);
    IMG(A.coin, ccx0, by + 12);
    num(u, costStr, (ccx0 + 10) * S, (by + 12) * S, afford ? ['#ffe9a0', '#fff8dc'] : ['#e06a50', '#ffb0a0'], 'l', { outline: '#241208', scale: S });

    // ---- the card's text ----
    put(uctx, T.name, cx0 + 40, cy0 + 10);
    put(uctx, T.kind, cx0 + 40, cy0 + 23);
    put(uctx, T.rank, cx0 + CARDW - 14, cy0 + 10, 'r');
    put(uctx, T.d1, cx0 + 14, cy0 + 60);
    put(uctx, T.d2, cx0 + 14, cy0 + 71);
    put(uctx, T.fxLbl, cx0 + 14, cy0 + 86);
    put(uctx, T.fxName, cx0 + 16, cy0 + 97);
    put(uctx, T.fxCur, cx0 + 16 + Math.ceil(T.fxName.inkW / S) + 8, cy0 + 97);
    put(uctx, T.fxNext, ax + 17, cy0 + 97);
    put(uctx, T.note2, cx0 + 14, cy0 + 114);
    if (!afford) put(uctx, A.txt.short, cx0 + 14, cy0 + 125);
    put(uctx, T.buySh, cx0 + CARDW / 2 - 8, by + BUYROW.h / 2 + 1 + (pressed ? 1 : 0), 'c', 'm');
    put(uctx, T.buy, cx0 + CARDW / 2 - 8, by + BUYROW.h / 2 + (pressed ? 1 : 0), 'c', 'm');
    put(uctx, A.txt.cp, ccx0 + 10 + numWidth(costStr) + 3, by + BUYROW.h / 2, 'l', 'm');

    // the purchase flourish: the drill's gain floats up off the card
    if (popD >= 0 && popD < 1.8) {
      if (popD < 0.3) {
        const q = popD / 0.3, Rr = 2 + q * 9;
        u.globalAlpha = ak * (1 - q);
        for (let q2 = 0; q2 < 12; q2++) { const a2 = q2 / 12 * Math.PI * 2; R(cx0 + 22 + Math.cos(a2) * Rr, cy0 + 22 + Math.sin(a2) * Rr * 0.7, 1, 1, '#fff2b0'); }
        u.globalAlpha = ak;
      }
      const fy = cy0 + 38 - Math.round(popD * 10);
      const fa = popD > 1.2 ? 1 - (popD - 1.2) / 0.5 : 1;
      u.globalAlpha = ak * clamp(fa);
      num(u, tr.float, (cx0 + CARDW / 2) * S, fy * S, tr.id === 'scavenging' ? ['#ffe9a0', '#fff8dc', '#7a5418'] : ['#b8f090', '#eaffd0', '#3c6a2a'], 'c', { outline: '#241208', scale: S });
      u.globalAlpha = ak;
      // the cost, spilled in red
      if (popD < 1.3) {
        u.globalAlpha = ak * (popD > 0.9 ? 1 - (popD - 0.9) / 0.4 : 1);
        num(u, '-' + D.lastCost, (ccx0 + 4) * S, (by - 10 - Math.round(popD * 6)) * S, ['#a3362c', '#d86a50'], 'l', { outline: null, scale: S });
        u.globalAlpha = ak;
      }
      // gold motes off the fresh pip
      if (popD >= 0.1 && popD < 1.1 && p > 0) {
        const d = popD - 0.1;
        for (let q2 = 0; q2 < 9; q2++) {
          const mx = cx0 + PIP0.x + (p - 1) * 11 + 3 + Math.round((hash(q2, 7) - 0.5) * 14) + Math.round(Math.sin(d * 5 + q2) * 2);
          const my = cy0 + PIP0.y + 2 - Math.round(d * (12 + hash(q2, 3) * 10));
          u.globalAlpha = ak * (1 - d) * 0.9;
          R(mx, my, 1, 1, q2 % 2 ? '#ffe9a0' : '#c4943a');
        }
        u.globalAlpha = ak;
      }
    }

    // the milestone stamp explodes across the card, then settles
    if (D.mile && D.mile.idx === i) {
      const d = t - D.mile.t;
      if (d < 1.8) {
        const kIn = easeOut(clamp(d / 0.22)), sc = S * (3.4 - 1.6 * kIn);
        const mcx = cx0 + CARDW / 2, mcy = cy0 + 74;
        u.globalAlpha = ak * (d < 1.15 ? 1 : 1 - (d - 1.15) / 0.65);
        for (let q2 = 0; q2 < 12; q2++) {
          const a2 = q2 / 12 * Math.PI * 2 + 0.3, r0 = 14 + kIn * 34;
          for (let q3 = 0; q3 < 3; q3++) R(mcx + Math.cos(a2) * (r0 + q3 * 3), mcy + Math.sin(a2) * (r0 + q3 * 3) * 0.75, 2, 2, q3 ? '#e8a838' : '#fff3b0');
        }
        num(u, D.mile.label, mcx * S, (mcy - 6) * S, ['#ffd25a', '#fff8dc', '#7a3a10'], 'c', { outline: '#241208', scale: sc });
        num(u, 'RANK ' + D.mile.rank, mcx * S, (mcy + 8) * S, ['#ffe9a0', '#fff8dc'], 'c', { outline: '#241208', scale: S });
        u.globalAlpha = ak;
      } else D.mile = null;
    }

    // the locked paths: greyed out and padlocked — the Yard teaches only the sword, for now
    if (lockedTrack(i)) {
      u.globalAlpha = ak * 0.6;
      R(cx0 + 2, cy0 + 2, CARDW - 4, CARDH - 4, '#43404e');
      u.globalAlpha = ak;
      const lcx = cx0 + CARDW / 2, lcy = cy0 + CARDH / 2;
      IMG(A.lock, lcx - 9, lcy - 12);
      // the buy strip reads the verdict
      u.globalAlpha = ak * 0.88;
      R(cx0 + 9, cy0 + BUYROW.y + 1, CARDW - 18, BUYROW.h - 2, '#221c28');
      u.globalAlpha = ak;
      put(uctx, A.txt.lockedSh, lcx, cy0 + BUYROW.y + BUYROW.h / 2 + 1, 'c', 'm');
      put(uctx, A.txt.locked, lcx, cy0 + BUYROW.y + BUYROW.h / 2, 'c', 'm');
    }
  }

  // the page chevrons and the DONE plate
  for (let n = 0; n < 2; n++) {
    const r = NAVR[n];
    IMG(A.navP, px + r.x, py + r.y);
    const ccx = px + r.x + r.w / 2, ccy = py + r.y + r.h / 2;
    for (let q = 0; q < 5; q++) {                     // a gold ‹ or ›
      const dy = q - 2, o = 2 - Math.abs(dy);
      const X = n === 0 ? ccx - o : ccx + o - 2;
      R(X - 1, ccy + dy, 4, 1, '#140b0c');
      R(X, ccy + dy, 2, 1, '#ffe9a0');
    }
  }
  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  IMG(A.done, dr.x, dr.y);

  // the gauntlet hovers at the selected card's buy strip while a rank is affordable
  const selI = D.sel, selTr = TRACKS[selI], selAfford = !lockedTrack(selI) && st.cp >= selTr.cost(D.ranks[selI]);
  if (selAfford && (D.lastBuyAt === null || t - D.lastBuyAt > 1.8)) {
    const scx = px + CARDX[selView()], scy = py + CARDY - 1;
    const ph = (t % 1.15) / 1.15, press = ph > 0.55 && ph < 0.72;
    const gx2 = Math.round(scx + CARDW / 2 + 24), gy2 = Math.round(scy + BUYROW.y + 16);
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
  put(uctx, A.txt.titleSh, px + PANW / 2, py + 26.5, 'c', 'm');
  put(uctx, A.txt.title, px + PANW / 2, py + 25.5, 'c', 'm');
  put(uctx, A.txt.six, px + PANW / 2, py + 232, 'c');
  put(uctx, A.txt.doneSh, dr.x + dr.w / 2, dr.y + dr.h / 2 + 1, 'c', 'm');
  put(uctx, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + dr.h / 2, 'c', 'm');
  put(uctx, A.txt.hint, dr.x - 10, py + 257, 'r');
  uctx.globalAlpha = 1;
}
