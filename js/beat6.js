// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 6 — the Training Yard (AAA Pixel Art Overhaul)
//
//  All 6 drills visible simultaneously in a clean 2-column grid.
//  Zero pagination, lightning-fast buying, instant visual feedback.
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
const TILE = { x: 552, y: 329, w: 26, h: 29 };
const inTile = (gx, gy) => gx >= TILE.x && gx < TILE.x + TILE.w && gy >= TILE.y && gy < TILE.y + TILE.h;
const PANW = 412, PANH = 276, PANX = 114, PANY = 36;
const CARDW = 188, CARDH = 54;
const CARDX = [12, 212];
const CARDY = [54, 112, 170];
const DONER = { x: 338, y: 242, w: 60, h: 24 };
const NUDGE = { pointer: 6, line: 15, pulse: 30 };

let D = null, A = null, SPOT6 = null;

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

const ICONS = {
  weapon: ['......KK......', '.....CSS......', '.....CSS......', '....CSS.......', '....CSS.......', '...CSS........', '...CSS........', '..CSS.........', '..CSS.........', '.CSS..........', '.CSS..KK......', 'KSS...KBBK....', 'KK...KBBBBK...', '......KBK.KK..', '.KK..KBBK.....', 'KPZK.KBK......', 'KPPKKKK.......', '.KKK..........'],
  armour: ['....KKKKKK....', '..KKSSSSSSKK..', '.KSSSSSSSSSSK.', '.KSSSHHSSSSSK.', 'KSSSSHHSSSSSSK', 'KSSSSHHSSSSSSK', 'KSHHHHHHHHHHSK', 'KSHHHHHHHHHHSK', '.KSSSHHSSSSK.', '.KSSSHHSSSSK.', '..KSSHHSSSK...', '..KSSSSSSSK...', '...KSSSSSK....', '....KSSSK.....', '.....KSK......', '......K.......'],
  footwork: ['..............', '..KKKK........', '.KLLLLK.......', '.KLLLLK..K....', '.KLLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLK......', '..KLLLLLKK....', '..KLLLLLLLLK..', '.KLLLLLLLLLLK.', 'KLLLLLLLLLLLLK', 'KSSSSSSSSSSSSK', 'KKKKKKKKKKKKKK', '..............'],
  tactics: ['.....KK.......', '....KHHK......', '...KHHHHK.....', '..KKHHHHKK....', '..KSSSSSSK....', '.KSSSSSSSSK...', 'KSSSSSSSSSSK..', 'KSSCCSSSSSSK..', 'KSSSSSSSSSSK..', 'KKKKKKKKKKKK..', 'KSSKSSSSKSSK..', 'KSSSSSSSSSSK..', '.KKKKKKKKKK...', '..............'],
  scavenging: ['..............', '.....KKKKK....', '....KRRRRK....', '.....KRRK.....', '...KKKKKKKK...', '..KLLLLLLLLK..', '.KLLKKKKKKLLK.', '.KLLKGGGGKLLK.', 'KLLLKGGGGKLLLK', 'KLLLKGKKKLLLLK', 'KLLLLLLLLLLLLK', 'KLLLLLLLLLLLLK', '.KLLLLLLLLLLK.', '..KKKKKKKKKK..', '..............'],
  conditioning: ['..............', '..KKK..KKK....', '.KHHHKKHHHK...', '.KHWHHHHHHK...', 'KHHHHHHHHHHK..', 'KHHHHHHHHHHK..', 'KHHHHHHHHHHK..', '.KHHHHHHHHK...', '..KHHHHHHK....', '...KHHHHK.....', '....KHHK......', '.....KK.......', '..............'],
};
const ICONCOL = { K: '#140b0c', S: '#b8bcc4', C: '#e8ecf2', B: '#7a4a28', P: '#4d3125', Z: '#2a1a16', L: '#5f3e2e', R: '#8a5a34', G: '#e2b75a', H: '#a3362c', W: '#ffb0a0' };

function paintPanel() {
  const [c, x] = makeCanvas(PANW, PANH);
  const O = '#140b0c';
  const WOOD = ['#2e1a0f', '#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  const LEA = ['#1d1210', '#2a1a16', '#3b251d', '#4d3125'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, PANW, PANH);
  const B = 8;
  for (let j = 1; j < PANH - 1; j++) for (let i = 1; i < PANW - 1; i++) {
    const e = Math.min(i, j, PANW - 1 - i, PANH - 1 - j);
    if (e < 1 || e > B) continue;
    const horiz = Math.min(j, PANH - 1 - j) < Math.min(i, PANW - 1 - i);
    const g = horiz ? Math.sin(i * 0.21 + j * 1.7) : Math.sin(j * 0.21 + i * 1.7);
    let k = 2 + (g > 0.6 ? 1 : g < -0.7 ? -1 : 0);
    const tl = (j < PANH / 2 && j <= i) || (i < PANW / 2 && i < j);
    if (e === 1) k = tl ? 6 : 1; else if (e === B) k = 1;
    fill(WOOD[Math.max(0, Math.min(6, k))], i, j);
  }
  for (const [rx, ry] of [[6, 6], [PANW - 7, 6], [6, PANH - 7], [PANW - 7, PANH - 7]]) {
    fill('#7a5418', rx - 1, ry - 1, 3, 3); fill('#e2b75a', rx, ry, 2, 2); fill('#fff1b8', rx, ry);
  }
  for (let j = B + 2; j < PANH - B - 2; j++) for (let i = B + 2; i < PANW - B - 2; i++) {
    const n = hash(i * 31 + j * 7, 77);
    let v = 4.1 + Math.sin(i * 0.09 + j * 0.05) * 0.16;
    if (n > 0.97) v -= 0.6; else if (n < 0.02) v += 0.5;
    fill(PAR[Math.max(0, Math.min(5, Math.round(v)))], i, j);
  }
  const TS = { y: B + 2, h: 22 };
  fill(O, B + 2, TS.y, PANW - 2 * B - 4, TS.h);
  for (let j = 0; j < TS.h - 2; j++) for (let i = 0; i < PANW - 2 * B - 6; i++) {
    fill(LEA[2], B + 3 + i, TS.y + 1 + j);
  }
  return c;
}

function paintCard(sel) {
  const [c, x] = makeCanvas(CARDW, CARDH);
  const O = '#140b0c';
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, CARDW, CARDH);
  fill(sel ? '#c4943a' : '#6e4727', 1, 1, CARDW - 2, CARDH - 2);
  fill(sel ? '#f6d888' : '#875a31', 1, 1, CARDW - 2, 1);
  for (let j = 0; j < CARDH - 4; j++) for (let i = 0; i < CARDW - 4; i++) {
    fill(PAR[2], 2 + i, 2 + j);
  }
  return c;
}

function paintIcon(id) {
  const [c, x] = makeCanvas(18, 18);
  const O = '#140b0c';
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  for (let j = 0; j < 18; j++) for (let i = 0; i < 18; i++) {
    const r = Math.hypot(i - 9, j - 9);
    if (r > 9) continue;
    fill(r > 8 ? O : r > 6 ? '#d8b25e' : '#f2e2bd', i, j);
  }
  const bm = ICONS[id], s = 1, ox = 3, oy = 3;
  if (bm) for (let j = 0; j < bm.length; j++) for (let i = 0; i < bm[j].length; i++) {
    const col = ICONCOL[bm[j][i]];
    if (col) fill(col, ox + i * s, oy + j * s, s, s);
  }
  return c;
}

function paintSubtabBoard(w, h, locked, active) {
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill(O, 0, 0, w, h);
  fill(active ? '#56361d' : locked ? '#1d1208' : '#3d2414', 1, 1, w - 2, h - 2);
  fill(active ? '#c4943a' : '#875a31', 1, 1, w - 2, 1);
  fill(O, 1, h - 1, w - 2, 1);
  return c;
}

function paintPlate(w, h, pressed = false) {
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const BR = ['#3e2a0c', '#7a5418', '#c4943a', '#e2b75a'];
  const WD = pressed ? ['#1d1208', '#2e1a0f'] : ['#3d2414', '#6e4727'];
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill(O, 0, 0, w, h);
  fill(BR[2], 1, 1, w - 2, h - 2);
  fill(WD[pressed ? 0 : 1], 2, 2, w - 4, h - 4);
  return c;
}

function paintCoin() {
  const [c, x] = makeCanvas(7, 7);
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
    if (Math.hypot(i - 3, j - 3) <= 3) fill(j < 3 ? '#f6d888' : '#e2b75a', i, j);
  }
  fill('#fff1b8', 2, 2);
  return c;
}

function dynText(i) {
  const tr = TRACKS[i], p = D.ranks[i];
  const T = A.tr[i];
  T.rank = t2('Rk ' + p, 'bold 11px "Pixelify Sans"', '#8a5f2e');
  T.fxCur = t2(tr.fx(p), 'bold 11px "Pixelify Sans"', '#3b2418');
  T.buy = t2('BUY · ' + tr.cost(p) + ' cp', 'bold 11px "Pixelify Sans"', '#ffe9a0');
  T.buySh = t2('BUY · ' + tr.cost(p) + ' cp', 'bold 11px "Pixelify Sans"', '#241208');
}
const dynAll = () => { for (let i = 0; i < TRACKS.length; i++) dynText(i); };

export function buildBeat6() {
  SPOT6 = cb.buildSpot(16, 18, 1.1);
  A = { panel: paintPanel(), card: paintCard(false), cardSel: paintCard(true),
    done: paintPlate(DONER.w, DONER.h), doneP: paintPlate(DONER.w, DONER.h, true),
    coin: paintCoin(),
    subtabActive: paintSubtabBoard(186, 16, false, true),
    subtabLocked: paintSubtabBoard(186, 16, true, false),
    icons: {}, tr: [], txt: {} };
  for (const tr of TRACKS) A.icons[tr.id] = paintIcon(tr.id);
  for (const tr of TRACKS) A.tr.push({
    name: t2(tr.name, 'bold 13px "Pixelify Sans"', '#3b2418'),
    kind: t2(tr.kind, '10px "Pixelify Sans"', '#8a6a3c'),
  });
  A.txt.title = t2('TRAINING YARD', 'bold 22px "Pixelify Sans"', '#f6d888', { spacing: 2 });
  A.txt.titleSh = t2('TRAINING YARD', 'bold 22px "Pixelify Sans"', '#1a0d08', { spacing: 2 });
  A.txt.doneLbl = t2('DONE', 'bold 14px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 14px "Pixelify Sans"', '#241208');
  A.txt.martial = t2('Martial Drills (All 6)', 'bold 11px "Pixelify Sans"', '#fbe9c4');
  A.txt.realms = t2('Realms Mastery 🔒 Stg 100', 'bold 10px "Pixelify Sans"', '#8a6a3c');
  A.lock = paintLock();
  dynAll();
}

function paintLock() {
  const [c, x] = makeCanvas(14, 16);
  x.fillStyle = '#c4943a'; x.fillRect(2, 6, 10, 9);
  x.fillStyle = '#65616f'; x.fillRect(4, 1, 6, 6);
  return c;
}

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
const lockedTrack = i => TRACKS[i].id !== 'weapon';
function lockRattle(t) {
  D.pressAt = t;
  const s = cb.warp(t);
  cb.E.live.push({ s, k: 'paper' }, { s: s + 0.07, k: 'paper' });
}
export function debug() {
  if (!D) return null;
  return { line12a: D.line12aAt, open: D.openAt !== null, ranks: [...D.ranks] };
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
  D.pressAt = t; D.lastBuyAt = t; D.lastBuyIdx = i; D.lastCost = cst;
  if (D.boughtAt === null) D.boughtAt = t;
  D.ranks[i]++; D.spent += cst;
  cb.buyCp(cst, s);
  cb.applyTraining(tr.id, D.ranks);
  cb.E.live.push({ s: s + 0.02, k: 'chime' });
  if (tr.id === 'weapon') rebuildNow(D.ranks[i] + 1, tr.cost(D.ranks[i]));
  dynText(i);
}

export function click(gx, gy, t) {
  if (!D) return false;
  if (D.line12aAt === null) {
    if (inTile(gx, gy)) { lockRattle(t); return true; }
    return false;
  }
  if (D.openAt !== null) {
    const [px, py] = panelPos(panelK(t));
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      for (let cIdx = 0; cIdx < 2; cIdx++) {
        const i = rIdx * 2 + cIdx;
        const X = px + CARDX[cIdx], Y = py + CARDY[rIdx];
        if (gx >= X && gx < X + CARDW && gy >= Y && gy < Y + CARDH) {
          if (lockedTrack(i)) { lockRattle(t); return true; }
          if (cb.hudState(t).cp >= TRACKS[i].cost(D.ranks[i])) buy(t, i); else D.pressAt = t;
          return true;
        }
      }
    }
    const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
    const inPanel = gx >= px && gx < px + PANW && gy >= py && gy < py + PANH;
    if ((gx >= dr.x && gx < dr.x + dr.w && gy >= dr.y && gy < dr.y + dr.h) || !inPanel) closeScreen(t);
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
  return false;
}

export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {
    const hard = D.line12aAt !== null || D.ranks.some(r => r > 0);
    D.Eref = cb.E;
    if (hard) reset();
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
  if (s < at + 0.4) return;
  const label = 'OPEN THE TRAINING YARD', w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3));
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
  ctx.globalAlpha = clamp(k);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = '#5a3414'; ctx.fillRect(X, Y, w, h);
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
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(cx - 3, cy, 7, 1);
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

  u.globalAlpha = 0.55 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.45)');
  IMG(A.panel, px, py);

  IMG(A.subtabActive, px + 12, py + 30);
  IMG(A.subtabLocked, px + 212, py + 30);
  put(u, A.txt.martial, px + 12 + 93, py + 30 + 8, 'c', 'm');
  put(u, A.txt.realms, px + 212 + 93, py + 30 + 8, 'c', 'm');

  for (let rIdx = 0; rIdx < 3; rIdx++) {
    for (let cIdx = 0; cIdx < 2; cIdx++) {
      const i = rIdx * 2 + cIdx;
      const tr = TRACKS[i], T = A.tr[i], p = D.ranks[i];
      const cx0 = px + CARDX[cIdx], cy0 = py + CARDY[rIdx];
      const cst = tr.cost(p), afford = st.cp >= cst;
      const locked = lockedTrack(i);

      IMG(A.card, cx0, cy0);
      IMG(A.icons[tr.id], cx0 + 8, cy0 + 8);
      put(u, T.name, cx0 + 32, cy0 + 6);
      put(u, T.kind, cx0 + 32, cy0 + 19);
      put(u, T.rank, cx0 + CARDW - 10, cy0 + 6, 'r');

      if (locked) {
        IMG(A.lock, cx0 + CARDW - 28, cy0 + 30);
      } else {
        const by = cy0 + 31;
        u.globalAlpha = ak * (afford ? 1 : 0.65);
        IMG(A.done, cx0 + 8, by);
        u.globalAlpha = ak;
        put(u, T.buySh, cx0 + CARDW / 2, by + 13, 'c', 'm');
        put(u, T.buy, cx0 + CARDW / 2, by + 12, 'c', 'm');
      }
    }
  }

  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  IMG(A.done, dr.x, dr.y);
  put(u, A.txt.titleSh, px + PANW / 2, py + 22.5, 'c', 'm');
  put(u, A.txt.title, px + PANW / 2, py + 21.5, 'c', 'm');
  put(u, A.txt.doneSh, dr.x + dr.w / 2, dr.y + dr.h / 2 + 1, 'c', 'm');
  put(u, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + dr.h / 2, 'c', 'm');
  u.globalAlpha = 1;
}
