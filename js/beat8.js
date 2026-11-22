// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 8 — the Gear Screen (AAA Pixel Art Overhaul)
//
//  Left: Sellsword paper-doll with 10 interactive slots.
//  Right: Toolbar + 5-row scrollable satchel with upgrade indicators
//  and one-click EQUIP BEST.
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
const PANW = 424, PANH = 292, PANX = 108, PANY = 28;
const DOLLY = { x: 12, y: 52, w: 152, h: 170 };
const DOLLFEET = 146;
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
const BAR_Y = 52, BAR_H = 17;
const ROWY0 = 74, ROWH = 28, ROWGAP = 3, ROWS_VIS = 5;
const LISTW = 229, LISTH = ROWS_VIS * ROWH + (ROWS_VIS - 1) * ROWGAP;
const SCROLLR = { x: SATX + SATW - 8, y: ROWY0, w: 8, h: LISTH };
const EQUIPR = { x: LISTW - 48, y: 5, w: 44, h: 18 };
const FOOTR = { x: SATX, y: 226, w: SATW, h: 30 };
const DONER = { x: 352, y: 258, w: 60, h: 24 };
const NUDGE = { pointer: 6, line: 15, pulse: 30 };
const SORTS = ['best', 'slot', 'name'];
const SORT_LBL = { best: 'BEST', slot: 'SLOT', name: 'NAME' };

let D = null, A = null, SPOT8 = null;

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
    ell(11, 8, 8.4, 4.6, (u, v) => TINPAL[Math.max(0, Math.min(5, Math.round(2.8 - v * 2.2)))]);
    ell(11, 12.4, 10.4, 2.6, () => TINPAL[2]);
  } else {
    ell(11, 9.4, 8.6, 4.6, () => BERRY[2]);
  }
  return c;
}

function paintGlyph(slot, lit) {
  const [c, x] = makeCanvas(16, 16);
  const F = lit ? ['#3a2a18', '#7a5418', '#c4943a', '#e2b75a', '#fff1b8'] : ['#241812', '#4a3524', '#5d4530', '#6e543a', '#806848'];
  x.fillStyle = F[2]; x.fillRect(4, 4, 8, 8);
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
  const LEA = ['#1d1210', '#2a1a16', '#3b251d', '#4d3125'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, PANW, PANH);
  const B = 10;
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
  const TS = { y: B + 3, h: 22 };
  fill(O, B + 2, TS.y, PANW - 2 * B - 4, TS.h);
  for (let j = 0; j < TS.h - 2; j++) for (let i = 0; i < PANW - 2 * B - 6; i++) {
    fill(LEA[2], B + 3 + i, TS.y + 1 + j);
  }
  return c;
}

function paintCard(sel, worn) {
  const [c, x] = makeCanvas(LISTW, ROWH);
  const O = '#140b0c';
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill(O, 0, 0, LISTW, ROWH);
  fill(sel ? '#c4943a' : '#6e4727', 1, 1, LISTW - 2, ROWH - 2);
  fill(sel ? '#f6d888' : '#875a31', 1, 1, LISTW - 2, 1);
  if (worn) fill('#5a8a3c', 1, ROWH - 2, LISTW - 2, 1);
  for (let j = 0; j < ROWH - 4; j++) for (let i = 0; i < LISTW - 4; i++) {
    fill(PAR[2], 2 + i, 2 + j);
  }
  return c;
}

function paintPlate(w, h, pressed = false, green = false) {
  const [c, x] = makeCanvas(w, h);
  const O = '#140b0c';
  const BR = ['#3e2a0c', '#5c3e12', '#7a5418', '#c4943a', '#e2b75a'];
  const WD = green ? ['#244218', '#548c38'] : ['#3d2414', '#6e4727'];
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill(O, 0, 0, w, h);
  fill(BR[2], 1, 1, w - 2, h - 2);
  fill(WD[pressed ? 0 : 1], 2, 2, w - 4, h - 4);
  return c;
}

function paintDais() {
  const [c, x] = makeCanvas(DOLLY.w, DOLLY.h);
  const PAR = ['#a87f4e', '#bd9663', '#d0ac79', '#dfc08f', '#e9d3a6'];
  const fill = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  fill('#140b0c', 0, 0, DOLLY.w, DOLLY.h);
  for (let j = 1; j < DOLLY.h - 1; j++) for (let i = 1; i < DOLLY.w - 1; i++) {
    fill(PAR[2], i, j);
  }
  for (let j = 0; j < 12; j++) for (let i = 0; i < 96; i++) {
    fill('#c4a050', 28 + i, DOLLFEET - 6 + j);
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

function buildItemArt(item) {
  if (A.itemArt[item.id]) return;
  const shortName = item.name.length > 21 ? item.name.slice(0, 20) + '…' : item.name;
  const sub = item.hp ? `${item.slot.toUpperCase()} · +${item.hp} max HP` : item.stat && item.stat.startsWith('+') ? `${item.slot.toUpperCase()} · ${item.stat}` : `${item.slot.toUpperCase()} · Gear`;
  A.itemArt[item.id] = {
    icon: paintIcon(item),
    name: t2(shortName, 'bold 11px "Pixelify Sans"', '#3b2418'),
    sub: t2(sub, 'bold 9px "Pixelify Sans"', '#2e5a1c'),
    note: t2(item.note || '', '10px "Pixelify Sans"', '#5a3a22'),
  };
}

export function buildBeat8() {
  SPOT8 = cb.buildSpot(16, 18, 1.1);
  A = { panel: paintPanel(), dais: paintDais(),
    card: [paintCard(false, false), paintCard(true, false)], cardWorn: [paintCard(false, true), paintCard(true, true)],
    equip: paintPlate(EQUIPR.w, EQUIPR.h), equipP: paintPlate(EQUIPR.w, EQUIPR.h, true),
    chip: paintPlate(44, BAR_H, false, false), chipOn: paintPlate(44, BAR_H, false, true),
    bestBtn: paintPlate(72, BAR_H, false, true), bestBtnP: paintPlate(72, BAR_H, true, true),
    done: paintPlate(DONER.w, DONER.h), doneP: paintPlate(DONER.w, DONER.h, true),
    gaunt: buildGauntlet(false), gauntP: buildGauntlet(true),
    subtabDoll: paintSubtabBoard(96, 16, false, true),
    subtabSmithy: paintSubtabBoard(96, 16, true, false),
    subtabBag: paintSubtabBoard(96, 16, true, false),
    subtabGlamour: paintSubtabBoard(96, 16, true, false),
    glyph: {}, itemArt: {}, dyn: new Map(), txt: {} };
  for (const s of ['helm', 'armor', 'cloak', 'weapon', 'shield', 'boots', 'ring1', 'ring2', 'amulet', 'trinket']) {
    A.glyph[s] = { dim: paintGlyph(s, false), lit: paintGlyph(s, true) };
  }
  A.txt.title = t2('GEAR', 'bold 22px "Pixelify Sans"', '#f6d888', { spacing: 2 });
  A.txt.titleSh = t2('GEAR', 'bold 22px "Pixelify Sans"', '#1a0d08', { spacing: 2 });
  A.txt.doll = t2('SELLSWORD', 'bold 10px "Pixelify Sans"', '#8a6a3c');
  A.txt.satchel = t2('· SATCHEL ·', 'bold 10px "Pixelify Sans"', '#8a5f2e');
  A.txt.equip = t2('EQUIP', 'bold 10px "Pixelify Sans"', '#d8ffb0');
  A.txt.equipSh = t2('EQUIP', 'bold 10px "Pixelify Sans"', '#142008');
  A.txt.worn = t2('WORN', 'bold 10px "Pixelify Sans"', '#ffe9a0');
  A.txt.wornSh = t2('WORN', 'bold 10px "Pixelify Sans"', '#241208');
  A.txt.doneLbl = t2('DONE', 'bold 14px "Pixelify Sans"', '#ffe9a0');
  A.txt.doneSh = t2('DONE', 'bold 14px "Pixelify Sans"', '#241208');
  A.txt.hint = t2('G close · Wheel scroll · Click slot to filter', '11px "Pixelify Sans"', '#8a6a3c');
  A.txt.empty = t2('No items in satchel.', '12px "Pixelify Sans"', '#8a6a3c');
  A.txt.upg = t2('↑', 'bold 12px "Pixelify Sans"', '#2e5a1c');
  A.txt.dn = t2('↓', 'bold 11px "Pixelify Sans"', '#9e2a36');
  A.txt.subDoll = t2('Paper Doll', 'bold 10px "Pixelify Sans"', '#fbe9c4');
  A.txt.subSmithy = t2('The Smithy 🔒 Stg 10', 'bold 9px "Pixelify Sans"', '#8a6a3c');
  A.txt.subBag = t2('Bag & Filter 🔒 Stg 15', 'bold 9px "Pixelify Sans"', '#8a6a3c');
  A.txt.subGlamour = t2('Glamour 🔒 Stg 25', 'bold 9px "Pixelify Sans"', '#8a6a3c');
}

function filteredItems() {
  const inv = cb.inventory();
  let list = inv.filter(it => {
    if (D.slotFilter !== 'all' && it.slot !== D.slotFilter) return false;
    if (D.upgradesOnly && (it.equipped || cb.compareItem(it).delta <= 0)) return false;
    return true;
  });
  return list.slice();
}

function clampScroll(list) {
  const maxS = Math.max(0, list.length - ROWS_VIS);
  D.scroll = clamp(D.scroll | 0, 0, maxS);
  return maxS;
}

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
  return { line14: D.line14At, open: D.openAt !== null, selId: D.selId };
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
  }
}

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
    const subY = py + 30, subH = 16;
    if (gy >= subY && gy < subY + subH) {
      if (gx >= px + 14 && gx < px + 110) { D.pressNavAt = t; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
      if (gx >= px + 112 && gx < px + 410) {
        D.pressAt = t; const s2 = cb.warp(t);
        cb.E.live.push({ s: s2, k: 'paper' }, { s: s2 + 0.07, k: 'paper' });
        return true;
      }
    }
    const list = filteredItems();
    const maxS = clampScroll(list);
    const inR = (r) => r && gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h;

    const tb = toolbarRects(px, py);
    if (inR(tb.allR)) { D.slotFilter = 'all'; D.upgradesOnly = false; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.upgR)) { D.upgradesOnly = !D.upgradesOnly; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.slotR)) { D.slotFilter = 'all'; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.sortR)) { D.sort = SORTS[(SORTS.indexOf(D.sort) + 1) % SORTS.length]; D.scroll = 0; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
    if (inR(tb.bestR)) { runEquipBest(t); return true; }

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
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(cx - 3, cy, 7, 1);
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
  const sKey = `${hs.hp}/${hs.hpMax}|${gear.hpBonus || 0}`;
  if (D.statsKey !== sKey) {
    D.statsKey = sKey;
    D.statsTxt = t2(`HP ${hs.hp}/${hs.hpMax} · AC 16`, 'bold 11px "Pixelify Sans"', '#3b2418');
  }

  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);

  u.globalAlpha = 0.55 * ak;
  u.fillStyle = '#0a0610'; u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = ak;
  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.45)');
  IMG(A.panel, px, py);

  IMG(A.subtabDoll, px + 14, py + 30);
  IMG(A.subtabSmithy, px + 112, py + 30);
  IMG(A.subtabBag, px + 210, py + 30);
  IMG(A.subtabGlamour, px + 308, py + 30);
  put(u, A.txt.subDoll, px + 14 + 48, py + 30 + 8, 'c', 'm');
  put(u, A.txt.subSmithy, px + 112 + 48, py + 30 + 8, 'c', 'm');
  put(u, A.txt.subBag, px + 210 + 48, py + 30 + 8, 'c', 'm');
  put(u, A.txt.subGlamour, px + 308 + 48, py + 30 + 8, 'c', 'm');

  const dx = px + DOLLY.x, dy = py + DOLLY.y;
  IMG(A.dais, dx, dy);
  act.drawHeroPractice(u, 'ready', dx + DOLLY.w / 2, dy + DOLLFEET, S);

  for (const [sl, sx, sy] of SLOTS) {
    const X = dx + sx, Y = dy + sy, worn = gear[sl];
    R(X, Y, SLOTW, SLOTW, '#140b0c');
    R(X + 1, Y + 1, SLOTW - 2, SLOTW - 2, worn ? '#4a3418' : '#241812');
    if (worn) {
      const wIt = inv.find(i2 => i2.id === worn);
      if (wIt) { buildItemArt(wIt); IMG(A.itemArt[wIt.id].icon, X + 1, Y + 3); }
    }
  }

  let selIt = list.find(i => i.id === D.selId) || inv.find(i => i.id === D.selId) || list[0] || inv[0] || null;
  if (selIt && D.selId !== selIt.id) D.selId = selIt.id;

  const tb = toolbarRects(px, py);
  const chip = (r, lbl, on) => {
    IMG(A.chip, r.x, r.y);
    put(u, dynTxt('chip', lbl, 'bold 10px "Pixelify Sans"', '#ffe9a0'), r.x + r.w / 2, r.y + r.h / 2, 'c', 'm');
  };
  chip(tb.allR, 'ALL', D.slotFilter === 'all');
  chip(tb.upgR, 'UPG', D.upgradesOnly);
  chip(tb.sortR, SORT_LBL[D.sort], false);

  const bestPressed = D.pressAt !== null && t - D.pressAt < 0.14 && D.pressId === 'best';
  IMG(bestPressed ? A.bestBtnP : A.bestBtn, tb.bestR.x, tb.bestR.y + (bestPressed ? 1 : 0));
  put(u, A.txt.bestSh, tb.bestR.x + tb.bestR.w / 2, tb.bestR.y + tb.bestR.h / 2 + 1, 'c', 'm');
  put(u, A.txt.best, tb.bestR.x + tb.bestR.w / 2, tb.bestR.y + tb.bestR.h / 2, 'c', 'm');

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
    R(X + 5, Y + 5, 20, 18, '#3b2418');
    u.drawImage(IA.icon, Math.round((X + 6) * S), Math.round((Y + 6) * S), 18 * S, 16 * S);
    put(u, IA.name, X + 29, Y + 4);
    put(u, IA.sub, X + 29, Y + 15);

    const er = { x: X + EQUIPR.x, y: Y + EQUIPR.y, w: EQUIPR.w, h: EQUIPR.h };
    IMG(A.equip, er.x, er.y);
    put(u, it.equipped ? A.txt.wornSh : A.txt.equipSh, er.x + er.w / 2 + (it.equipped ? 0 : 4), er.y + er.h / 2 + 1, 'c', 'm');
    put(u, it.equipped ? A.txt.worn : A.txt.equip, er.x + er.w / 2 + (it.equipped ? 0 : 4), er.y + er.h / 2, 'c', 'm');
  }

  const fx = px + FOOTR.x, fy = py + FOOTR.y;
  R(fx, fy, FOOTR.w, FOOTR.h, '#140b0c');
  R(fx + 1, fy + 1, FOOTR.w - 2, FOOTR.h - 2, '#d8b988');
  if (selIt) {
    put(u, dynTxt('cmp', selIt.name + ' · Ready', 'bold 10px "Pixelify Sans"', '#2e5a1c'), fx + 6, fy + 6);
  }

  const dr = { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h };
  IMG(A.done, dr.x, dr.y);
  put(u, A.txt.titleSh, px + PANW / 2, py + 22.5, 'c', 'm');
  put(u, A.txt.title, px + PANW / 2, py + 21.5, 'c', 'm');
  put(u, A.txt.doneSh, dr.x + dr.w / 2, dr.y + dr.h / 2 + 1, 'c', 'm');
  put(u, A.txt.doneLbl, dr.x + dr.w / 2, dr.y + dr.h / 2, 'c', 'm');
  put(u, A.statsTxt, dx + DOLLY.w / 2, dy + DOLLY.h + 4, 'c');
  u.globalAlpha = 1;
}
