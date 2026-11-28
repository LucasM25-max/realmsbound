// ─────────────────────────────────────────────────────────────
//  Hero, Respec & Guild Roster Screen (Beat 10b / [H] Hero Tile)
//
//  Carved-oak & parchment panel with 4 hanging wooden board sub-tabs:
//    1. Look (Appearance & Voice customiser — unlocked Stg 1)
//    2. Hero Sheet (Stats, Origin/Kit/Style, 18 Skills, Mastery — Stg 1)
//    3. Rebuilding · Stg 50 (greyed & padlocked)
//    4. Roster · Stg 100 (greyed & padlocked)
// ─────────────────────────────────────────────────────────────
import { W, H, UI_SCALE as S } from './timeline.js';
import * as cb from './combat.js';
import * as act from './actors.js';
import { setHeroIdentity, getHeroPortraitCanvas, setTileLocked } from './hud.js';
import { makeCanvas, crispText, clamp, easeOutBack, hash } from './util.js';
import {
  SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_COLORS, FACIAL_HAIRS,
  CAPE_COLORS, TABARD_COLORS, VOICE_BARKS, NAME_PRESETS, EPITHETS,
  BACKGROUNDS, KIT_FOCUSES, FIGHTING_STYLES,
  DEFAULT_HERO_STYLE, ELMINSTER_PICK_STYLE,
  fmtMod, computeHeroSheet, sanitizeHeroName, commitHeroName,
  heroDisplayName, normalizeHeroStyle, randomHeroStyle, findOption,
} from './progression.js';

const PANW = 468, PANH = 304, PANX = 86, PANY = 28;
const SUBTABS = [
  { id: 'look',   label: 'Look',              x: 12,  w: 72,  stage: 1,   msg: '' },
  { id: 'sheet',  label: 'Hero Sheet',        x: 88,  w: 92,  stage: 1,   msg: '' },
  { id: 'respec', label: 'Rebuilding · Stg 50', x: 184, w: 140, stage: 50,  msg: 'Mirror of Rebuilding unlocks at Stage 50!' },
  { id: 'roster', label: 'Roster · Stg 100',  x: 328, w: 128, stage: 100, msg: 'The Guild Roster unlocks at Stage 100!' },
];

// Look sub-tab layout (starts cleanly below y=56 sub-tab rail, ends before y=263 divider)
const MIRROR = { x: 12, y: 58, w: 164, h: 118 };
const NAMEPL = { x: 12, y: 179, w: 164, h: 21 };
const VOICER = { x: 12, y: 203, w: 164, h: 26 };
const UTILR  = { x: 12, y: 233, w: 164, h: 22 };
const DONER  = { x: PANW - 76, y: 270, w: 64, h: 24 };

let D = null, A = null;
let onPlayBark = null;
export function setBarkPlayer(fn) { onPlayBark = fn; }

function t2(str, font, col, opts = {}) {
  const th = opts.threshold ?? (/bold\s+16px/.test(font) ? 152 : 148);
  const c = crispText(str.replace(/f(?=[ilft])/g, 'f\u200C'), font, col, { threshold: th, ...opts });
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
const dynTxt = (key, str, font, col) => {
  const k = `${key}|${str}|${col}`;
  if (!A.dyn.has(k)) A.dyn.set(k, t2(str, font, col));
  return A.dyn.get(k);
};

// ---------- Pixel art panels, hanging wooden boards & padlocks ----------
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
    const k = j === 9 ? 5 : j === 10 ? 4 : j === 28 ? 0 : j === 27 ? 1 : (2 + (g > 0.65 ? 1 : g < -0.65 ? -1 : 0));
    fill(WOOD[k], i, j);
  }
  fill('#8a5f1e', px0 + 2, 27, pw - 4, 1);

  // Dark leather recess behind hanging wooden boards (y = 30..54)
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

  fill('#b58d58', px0 + 4, 263, pw - 8, 1);
  fill('#f8edd2', px0 + 4, 264, pw - 8, 1);
  return c;
}

function paintHangingBoard(w, h, state = 'active') {
  // state: 'active' (bright lit oak), 'idle' (warm dim oak for unlocked inactive tab), 'locked' (cold iron grey)
  const totalH = h + 5;
  const [c, x] = makeCanvas(w, totalH);
  const O = '#140b0c';
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  const locked = state === 'locked';
  const active = state === 'active';
  const WOOD = active
    ? ['#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#c4943a']
    : state === 'idle'
      ? ['#26160c', '#362012', '#472b18', '#583822', '#6c472c']
      : ['#1d1c22', '#2a2830', '#36343e', '#45424e', '#585564'];

  for (const rx of [10, w - 13]) {
    fill(O, rx - 1, 0, 5, 1);
    fill(locked ? '#9e9aa8' : '#f6d888', rx, 0, 3, 1);
    for (let y = 1; y < 5; y++) {
      fill(O, rx - 1, y, 4, 1);
      fill(locked ? ((y % 2) ? '#9e9aa8' : '#4b4856') : ((y % 2) ? '#f6d888' : '#9a7026'), rx, y, 2, 1);
    }
    fill(O, rx - 2, 4, 6, 4);
    fill(locked ? '#747080' : (active ? '#c4943a' : '#7a5418'), rx - 1, 5, 4, 2);
    fill(locked ? '#d2ceda' : (active ? '#fff1b8' : '#c4943a'), rx - 1, 5, 2, 1);
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
    fill(locked ? '#4b4856' : (active ? '#c4943a' : '#7a5418'), nx, ny, 2, 2);
    fill(locked ? '#878394' : (active ? '#fff1b8' : '#d9a948'), nx, ny);
  }
  if (active) fill('#f6d888', 5, py + h - 2, w - 10, 1);
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

function paintMirrorDais() {
  const { w, h } = MIRROR;
  const [c, x] = makeCanvas(w, h);
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill('#140b0c', 0, 0, w, h);
  fill('#6e4727', 1, 1, w - 2, h - 2);
  fill('#d9a948', 2, 2, w - 4, h - 4);
  fill('#140b0c', 3, 3, w - 6, h - 6);
  for (let j = 4; j < h - 4; j++) {
    const f = (j - 4) / (h - 8);
    const col = f < 0.25 ? '#261b42' : f < 0.52 ? '#3a2a5e' : f < 0.72 ? '#594270' : '#354e28';
    fill(col, 4, j, w - 8, 1);
  }
  for (let i = 4; i < w - 4; i++) {
    const hill = Math.round(76 + Math.sin(i * 0.06) * 5);
    fill('#283c22', i, hill, 1, h - 4 - hill);
    fill('#3f5d30', i, hill + 5, 1, h - 9 - hill);
  }
  fill('#140b0c', 34, 98, 92, 14);
  fill('#4a4856', 35, 99, 90, 12);
  fill('#6c6978', 35, 99, 90, 3);
  fill('#8e8b9c', 36, 99, 88, 1);
  for (const [sx, sy] of [[56, 14], [92, 10], [134, 20], [116, 30], [66, 34]]) fill('#ffeeb8', sx, sy, 1, 1);
  return c;
}

function paintBtn(w, h, tone = 'oak', pressed = false) {
  const [c, x] = makeCanvas(w, h);
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill('#140b0c', 0, 0, w, h);
  const body = tone === 'green'
    ? (pressed ? '#244a1c' : '#326624')
    : tone === 'gold'
      ? (pressed ? '#704914' : '#96621c')
      : tone === 'locked'
        ? '#26242e'
        : (pressed ? '#3d2414' : '#56361d');
  const rim = tone === 'green' ? '#60a848' : tone === 'gold' ? '#f6d888' : tone === 'locked' ? '#4b4856' : '#c4943a';
  const top = tone === 'green' ? '#488836' : tone === 'gold' ? '#c88c30' : tone === 'locked' ? '#36343e' : '#875a31';
  fill(rim, 1, 1, w - 2, h - 2);
  fill(body, 2, 2, w - 4, h - 4);
  if (!pressed) {
    fill(top, 2, 2, w - 4, 2);
    fill('#22120a', 2, h - 3, w - 4, 1);
  }
  return c;
}

function paintCardBox(w, h) {
  const [c, x] = makeCanvas(w, h);
  const fill = (col, X, Y, w2 = 1, h2 = 1) => { x.fillStyle = col; x.fillRect(X, Y, w2, h2); };
  fill('#140b0c', 0, 0, w, h);
  fill('#875a31', 1, 1, w - 2, h - 2);
  fill('#e9d3a6', 2, 2, w - 4, h - 4);
  fill('#f8edd2', 2, 2, w - 4, 1);
  return c;
}

export function buildCustomiser() {
  A = {
    panel: paintPanel(),
    mirror: paintMirrorDais(),
    nameCard: paintCardBox(272, 52),
    optCard: paintCardBox(272, 148),
    plaque: paintCardBox(NAMEPL.w, NAMEPL.h),
    voiceCard: paintCardBox(VOICER.w, VOICER.h),
    // Hero Sheet cards
    sheetStats: paintCardBox(186, 118),
    sheetMast: paintCardBox(186, 82),
    sheetBuild: paintCardBox(252, 92),
    sheetSkills: paintCardBox(252, 108),
    // Hanging boards
    boards: Object.fromEntries(SUBTABS.map(t => [
      t.id,
      {
        active: paintHangingBoard(t.w, 19, 'active'),
        idle: paintHangingBoard(t.w, 19, 'idle'),
        locked: paintHangingBoard(t.w, 19, 'locked'),
      },
    ])),
    lockSm: paintLockSmall(),
    // Buttons
    doneBtn: paintBtn(DONER.w, DONER.h, 'green', false),
    doneBtnP: paintBtn(DONER.w, DONER.h, 'green', true),
    chooseBtn: paintBtn(88, 22, 'gold', false),
    chooseBtnP: paintBtn(88, 22, 'gold', true),
    randBtn: paintBtn(72, 22, 'oak', false),
    randBtnP: paintBtn(72, 22, 'oak', true),
    elmPickSm: paintBtn(94, 15, 'gold', false),
    elmPickSmP: paintBtn(94, 15, 'gold', true),
    arrowBtn: paintBtn(14, 14, 'oak', false),
    arrowBtnP: paintBtn(14, 14, 'oak', true),
    testBtn: paintBtn(40, 17, 'gold', false),
    testBtnP: paintBtn(40, 17, 'gold', true),
    mastOn: paintBtn(56, 18, 'gold', false),
    mastLk: paintBtn(56, 18, 'locked', false),
    lockWide: paintBtn(174, 18, 'locked', false),
    lockHalf: paintBtn(85, 18, 'locked', false),
    dyn: new Map(),
    portraitCache: new Map(),
  };
}

export function reset() {
  D = {
    open: false,
    openAt: null,
    closeAt: null,
    activeTab: 'look',
    selectedSkill: 'ath',
    style: { ...DEFAULT_HERO_STYLE },
    draftName: DEFAULT_HERO_STYLE.name,
    nameFocus: false,
    barkAt: -9,
    barkWord: 'HA!',
    pressId: null,
    pressAt: null,
    statusMsg: '',
    statusTone: 'info',
    statusUntil: -9,
    onClose: null,
    tNow: 0,
  };
  setHeroIdentity(D.style.name, D.style);
  act.setHeroAppearance(D.style);
  cb.setHeroStyle(D.style);
}
reset();

export function isOpen() { return !!D && D.open; }
export function isTypingName() { return !!D && D.open && D.activeTab === 'look' && D.nameFocus; }
export function currentStyle() { return D ? { ...D.style } : { ...DEFAULT_HERO_STYLE }; }
export function debug() {
  if (!D) return null;
  const sheet = computeHeroSheet(D.style, cb.heroLevel ? cb.heroLevel() : 1);
  return {
    open: D.open,
    activeTab: D.activeTab,
    selectedSkill: D.selectedSkill,
    style: { ...D.style },
    sheet: {
      pb: sheet.pb,
      ac: sheet.ac,
      toHit: sheet.toHit,
      dmgFlat: sheet.dmgFlat,
      proficientSkills: sheet.skills.filter(sk => sk.prof).map(sk => sk.id),
      bonuses: { ...sheet.bonuses },
    },
  };
}

export function open(t = 0, { focusName = false, onClose = null, tab = null } = {}) {
  if (!D) reset();
  if (!A) buildCustomiser();
  D.open = true;
  D.openAt = t;
  D.closeAt = null;
  if (tab === 'look' || tab === 'sheet') D.activeTab = tab;
  D.draftName = D.style.name;
  D.nameFocus = D.activeTab === 'look' && !!focusName;
  D.onClose = onClose || null;
  setTileLocked('hero', false);
}

export function close(t = 0) {
  if (!D || !D.open) return;
  commitDraft();
  D.open = false;
  D.nameFocus = false;
  D.closeAt = t;
  const fn = D.onClose;
  D.onClose = null;
  if (fn) fn(t);
}

function applyStyle(next) {
  D.style = normalizeHeroStyle(next);
  D.draftName = D.style.name;
  act.setHeroAppearance(D.style);
  setHeroIdentity(D.style.name, D.style);
  cb.setHeroStyle(D.style);
}

function commitDraft() {
  const name = commitHeroName(D.draftName);
  applyStyle({ ...D.style, name });
}

function cycleList(arr, currentId, dir, filterFn = () => true) {
  const avail = arr.filter(filterFn);
  if (!avail.length) return currentId;
  const idx = Math.max(0, avail.findIndex(x => x.id === currentId));
  return avail[(idx + dir + avail.length) % avail.length].id;
}

function triggerBark(t) {
  D.barkAt = t;
  D.barkWord = ['HA!', 'HUP!', 'HAH!', 'OI!'][Math.floor(Math.random() * 4)];
  if (onPlayBark) onPlayBark(D.style.voice);
}

function showToast(t, id, msg, tone = 'warn') {
  D.pressId = id;
  D.pressAt = t;
  D.statusMsg = msg;
  D.statusTone = tone;
  D.statusUntil = t + 2.4;
  cb.E.live.push({ s: cb.warp(t), k: 'paper' });
}

function rects(px, py) {
  const rx = px + 184;
  const stg = cb.E?.stage || 1;
  const lx = px + 12, rbx = px + 204;

  const skillRects = [];
  const sheet = computeHeroSheet(D.style, cb.heroLevel ? cb.heroLevel() : 1);
  for (let idx = 0; idx < sheet.skills.length; idx++) {
    const col = Math.floor(idx / 6), row = idx % 6;
    skillRects.push({
      skill: sheet.skills[idx],
      x: rbx + 6 + col * 81,
      y: py + 172 + row * 14,
      w: 78,
      h: 13,
    });
  }

  return {
    subtabs: SUBTABS.map(tab => ({ tab, x: px + tab.x, y: py + 28, w: tab.w, h: 24 })),

    // Look sub-tab
    nameInput: { x: rx + 42, y: py + 62, w: 150, h: 16 },
    nameDice:  { x: rx + 196, y: py + 62, w: 70, h: 16 },
    presets: NAME_PRESETS.slice(0, 6).map((n, i) => ({
      name: n, x: rx + 6 + i * 43, y: py + 80, w: 41, h: 12,
    })),
    epPrev: { x: rx + 72, y: py + 94, w: 14, h: 14 },
    epNext: { x: rx + 250, y: py + 94, w: 14, h: 14 },

    hoodBtn: { x: rx + 54, y: py + 118, w: 80, h: 16 },
    scarBtn: { x: rx + 180, y: py + 118, w: 84, h: 16 },

    skinSwatches: SKIN_TONES.map((s, i) => ({ item: s, x: rx + 72 + i * 24, y: py + 139, w: 18, h: 14 })),
    hairPrev: { x: rx + 72, y: py + 158, w: 14, h: 14 },
    hairNext: { x: rx + 250, y: py + 158, w: 14, h: 14 },
    hairSwatches: HAIR_COLORS.map((s, i) => ({ item: s, x: rx + 72 + i * 24, y: py + 178, w: 18, h: 14 })),
    eyeSwatches: EYE_COLORS.map((s, i) => ({ item: s, x: rx + 72 + i * 24, y: py + 197, w: 18, h: 14 })),
    facePrev: { x: rx + 72, y: py + 216, w: 14, h: 14 },
    faceNext: { x: rx + 250, y: py + 216, w: 14, h: 14 },
    capeSwatches: CAPE_COLORS.map((s, i) => ({ item: s, x: rx + 50 + i * 14, y: py + 239, w: 12, h: 14 })),
    tabSwatches: TABARD_COLORS.map((s, i) => ({ item: s, x: rx + 182 + i * 14, y: py + 239, w: 12, h: 14 })),

    voicePrev: { x: px + VOICER.x + 42, y: py + VOICER.y + 6, w: 14, h: 14 },
    voiceNext: { x: px + VOICER.x + 102, y: py + VOICER.y + 6, w: 14, h: 14 },
    voiceTest: { x: px + VOICER.x + 119, y: py + VOICER.y + 4, w: 40, h: 17 },

    randBtn:   { x: px + UTILR.x, y: py + UTILR.y, w: 72, h: 22 },
    chooseBtn: { x: px + UTILR.x + 76, y: py + UTILR.y, w: 88, h: 22 },

    // Hero Sheet sub-tab
    elmPickSheet: { x: rbx + 152, y: py + 60, w: 94, h: 15 },
    bgPrev:    { x: rbx + 54, y: py + 82, w: 14, h: 14 },
    bgNext:    { x: rbx + 146, y: py + 82, w: 14, h: 14 },
    kitPrev:   { x: rbx + 54, y: py + 104, w: 14, h: 14 },
    kitNext:   { x: rbx + 146, y: py + 104, w: 14, h: 14 },
    fsPrev:    { x: rbx + 54, y: py + 126, w: 14, h: 14 },
    fsNext:    { x: rbx + 146, y: py + 126, w: 14, h: 14 },

    mastGraze: { x: lx + 6,   y: py + 195, w: 56, h: 18 },
    mastSlot2: { x: lx + 65,  y: py + 195, w: 56, h: 18 },
    mastSlot3: { x: lx + 124, y: py + 195, w: 56, h: 18 },
    tacMaster: { x: lx + 6,   y: py + 216, w: 174, h: 18 },
    featLock:  { x: lx + 6,   y: py + 237, w: 85, h: 18 },
    epicLock:  { x: lx + 95,  y: py + 237, w: 85, h: 18 },
    skillRects,

    doneBtn: { x: px + DONER.x, y: py + DONER.y, w: DONER.w, h: DONER.h },
    stg,
  };
}

const inR = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function click(gx, gy, t) {
  if (!D || !D.open) return false;
  const R = rects(PANX, PANY);
  const press = id => { D.pressId = id; D.pressAt = t; };

  if (gx < PANX || gx >= PANX + PANW || gy < PANY || gy >= PANY + PANH) {
    D.nameFocus = false;
    return true;
  }

  // Hanging wooden board sub-tabs
  for (const st of R.subtabs) {
    if (inR(st, gx, gy)) {
      D.nameFocus = false;
      if (st.tab.stage > R.stg) {
        showToast(t, `tab_${st.tab.id}`, st.tab.msg, 'warn');
        return true;
      }
      if (D.activeTab !== st.tab.id) {
        commitDraft();
        D.activeTab = st.tab.id;
        D.statusUntil = -9;
      }
      press(`tab_${st.tab.id}`);
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }
  }

  if (inR(R.doneBtn, gx, gy)) {
    press('done');
    close(t);
    return true;
  }

  if (D.activeTab === 'sheet') {
    if (inR(R.elmPickSheet, gx, gy)) {
      press('elmPickSheet');
      applyStyle({
        ...D.style,
        background: ELMINSTER_PICK_STYLE.background,
        kit: ELMINSTER_PICK_STYLE.kit,
        fightingStyle: ELMINSTER_PICK_STYLE.fightingStyle,
      });
      D.statusMsg = 'Elminster recommends: Soldier · Vanguard · Great Weapon.';
      D.statusTone = 'good';
      D.statusUntil = t + 2.6;
      cb.E.live.push({ s: cb.warp(t), k: 'chime' });
      return true;
    }
    if (inR(R.bgPrev, gx, gy) || inR(R.bgNext, gx, gy)) {
      const dir = inR(R.bgPrev, gx, gy) ? -1 : 1;
      press(dir < 0 ? 'bgPrev' : 'bgNext');
      const next = cycleList(BACKGROUNDS, D.style.background, dir);
      applyStyle({ ...D.style, background: next });
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }
    if (inR(R.kitPrev, gx, gy) || inR(R.kitNext, gx, gy)) {
      const dir = inR(R.kitPrev, gx, gy) ? -1 : 1;
      press(dir < 0 ? 'kitPrev' : 'kitNext');
      const next = cycleList(KIT_FOCUSES, D.style.kit, dir);
      applyStyle({ ...D.style, kit: next });
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }
    if (inR(R.fsPrev, gx, gy) || inR(R.fsNext, gx, gy)) {
      const dir = inR(R.fsPrev, gx, gy) ? -1 : 1;
      press(dir < 0 ? 'fsPrev' : 'fsNext');
      const next = cycleList(FIGHTING_STYLES, D.style.fightingStyle, dir);
      applyStyle({ ...D.style, fightingStyle: next });
      cb.E.live.push({ s: cb.warp(t), k: 'paper' });
      return true;
    }
    if (inR(R.mastGraze, gx, gy)) {
      showToast(t, 'mastGraze', 'Graze: Greatsword still deals STR dmg on a miss (Stg 6+).', 'good');
      return true;
    }
    if (inR(R.mastSlot2, gx, gy)) { showToast(t, 'mastSlot2', '2nd Weapon Mastery slot unlocks at Hero Lv 4!', 'warn'); return true; }
    if (inR(R.mastSlot3, gx, gy)) { showToast(t, 'mastSlot3', '3rd Weapon Mastery slot unlocks at Stage 15!', 'warn'); return true; }
    if (inR(R.tacMaster, gx, gy)) { showToast(t, 'tacMaster', 'Tactical Master mastery-swap unlocks at Hero Lv 9!', 'warn'); return true; }
    if (inR(R.featLock, gx, gy))  { showToast(t, 'featLock',  'Feats & ASIs Tarot Grid unlocks at Stage 15 (Lv 4)!', 'warn'); return true; }
    if (inR(R.epicLock, gx, gy))  { showToast(t, 'epicLock',  'Epic Constellation unlocks post-Lv 20 (Stage 850+)!', 'warn'); return true; }

    for (const sr of R.skillRects) {
      if (inR(sr, gx, gy)) {
        D.selectedSkill = sr.skill.id;
        D.statusUntil = -9;
        press(`sk_${sr.skill.id}`);
        cb.E.live.push({ s: cb.warp(t), k: 'paper' });
        return true;
      }
    }
    return true;
  }

  // Look sub-tab
  if (inR(R.nameInput, gx, gy)) { D.nameFocus = true; press('nameInput'); return true; }
  D.nameFocus = false;

  if (inR(R.nameDice, gx, gy)) {
    press('nameDice');
    const others = NAME_PRESETS.filter(n => n !== D.style.name);
    const n = others[Math.floor(Math.random() * others.length)] || 'Aldric';
    applyStyle({ ...D.style, name: n });
    return true;
  }
  for (const p of R.presets) if (inR(p, gx, gy)) {
    press(`pre_${p.name}`);
    applyStyle({ ...D.style, name: p.name });
    return true;
  }
  if (inR(R.epPrev, gx, gy) || inR(R.epNext, gx, gy)) {
    const dir = inR(R.epPrev, gx, gy) ? -1 : 1;
    press(dir < 0 ? 'epPrev' : 'epNext');
    applyStyle({ ...D.style, epithet: cycleList(EPITHETS, D.style.epithet, dir, e => e.stage <= R.stg) });
    return true;
  }

  if (inR(R.hoodBtn, gx, gy)) { press('hood'); applyStyle({ ...D.style, hoodUp: !D.style.hoodUp }); return true; }
  if (inR(R.scarBtn, gx, gy)) { press('scar'); applyStyle({ ...D.style, scar: !D.style.scar }); return true; }
  for (const sw of R.skinSwatches) if (inR(sw, gx, gy)) { press(`sk_${sw.item.id}`); applyStyle({ ...D.style, skin: sw.item.id }); return true; }
  if (inR(R.hairPrev, gx, gy) || inR(R.hairNext, gx, gy)) {
    const dir = inR(R.hairPrev, gx, gy) ? -1 : 1;
    press(dir < 0 ? 'hairPrev' : 'hairNext');
    applyStyle({ ...D.style, hairStyle: cycleList(HAIR_STYLES, D.style.hairStyle, dir) });
    return true;
  }
  for (const sw of R.hairSwatches) if (inR(sw, gx, gy)) { press(`hc_${sw.item.id}`); applyStyle({ ...D.style, hairColor: sw.item.id }); return true; }
  for (const sw of R.eyeSwatches)  if (inR(sw, gx, gy)) { press(`ey_${sw.item.id}`); applyStyle({ ...D.style, eyeColor: sw.item.id }); return true; }
  if (inR(R.facePrev, gx, gy) || inR(R.faceNext, gx, gy)) {
    const dir = inR(R.facePrev, gx, gy) ? -1 : 1;
    press(dir < 0 ? 'facePrev' : 'faceNext');
    applyStyle({ ...D.style, facialHair: cycleList(FACIAL_HAIRS, D.style.facialHair, dir) });
    return true;
  }
  for (const sw of R.capeSwatches) if (inR(sw, gx, gy)) { press(`cp_${sw.item.id}`); applyStyle({ ...D.style, capeColor: sw.item.id }); return true; }
  for (const sw of R.tabSwatches)  if (inR(sw, gx, gy)) { press(`tb_${sw.item.id}`); applyStyle({ ...D.style, tabardColor: sw.item.id }); return true; }

  if (inR(R.voicePrev, gx, gy) || inR(R.voiceNext, gx, gy)) {
    const dir = inR(R.voicePrev, gx, gy) ? -1 : 1;
    press(dir < 0 ? 'voicePrev' : 'voiceNext');
    applyStyle({ ...D.style, voice: cycleList(VOICE_BARKS, D.style.voice, dir) });
    triggerBark(t);
    return true;
  }
  if (inR(R.voiceTest, gx, gy)) { press('voiceTest'); triggerBark(t); return true; }

  if (inR(R.randBtn, gx, gy)) { press('rand'); applyStyle(randomHeroStyle(Math.random, D.style)); return true; }
  if (inR(R.chooseBtn, gx, gy)) { press('choose'); applyStyle(ELMINSTER_PICK_STYLE); close(t); return true; }
  return true;
}

export function key(k, t) {
  if (!D || !D.open) return false;
  if (D.activeTab === 'look' && D.nameFocus) {
    if (k === 'Escape' || k === 'Enter') {
      commitDraft();
      D.nameFocus = false;
      return true;
    }
    if (k === 'Backspace') {
      D.draftName = D.draftName.slice(0, -1);
      setHeroIdentity(commitHeroName(D.draftName), D.style);
      return true;
    }
    if (k.length === 1 && /[A-Za-z0-9 '\-]/.test(k)) {
      const next = sanitizeHeroName(D.draftName + k);
      D.draftName = next;
      setHeroIdentity(commitHeroName(next), D.style);
      return true;
    }
    return true;
  }
  if (k === 'Escape' || k === 'Enter' || k === 'h' || k === 'H') { close(t); return true; }
  if (k === '1') { D.activeTab = 'look'; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
  if (k === '2') { D.activeTab = 'sheet'; D.nameFocus = false; cb.E.live.push({ s: cb.warp(t), k: 'paper' }); return true; }
  if (k === ' ' && D.activeTab === 'look') { triggerBark(t); return true; }
  return false;
}

function getPreviewPortrait(style) {
  const key = JSON.stringify(style);
  if (!A.portraitCache.has(key)) {
    if (A.portraitCache.size > 40) A.portraitCache.clear();
    A.portraitCache.set(key, getHeroPortraitCanvas(style));
  }
  return A.portraitCache.get(key);
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D || !D.open) return;
  if (!A) buildCustomiser();
  D.tNow = t;

  const k = D.openAt !== null ? easeOutBack(clamp((t - D.openAt) / 0.25)) : 1;
  const px = PANX, py = Math.round(PANY + (1 - k) * 14);
  const u = uctx;
  const R = (X, Y, w, h, col) => { u.fillStyle = col; u.fillRect(Math.round(X * S), Math.round(Y * S), Math.round(w * S), Math.round(h * S)); };
  const IMG = (img, X, Y) => u.drawImage(img, Math.round(X * S), Math.round(Y * S), img.width * S, img.height * S);
  const isPressed = id => D.pressId === id && D.pressAt !== null && t - D.pressAt < 0.14;
  const shakeOf = id => (D.pressId === id && D.pressAt !== null && t - D.pressAt < 0.22
    ? Math.round(Math.sin((t - D.pressAt) * 80) * 1.5) : 0);

  u.save();
  u.globalAlpha = 0.60 * clamp(k);
  u.fillStyle = '#0a0610';
  u.fillRect(0, 0, W * S, H * S);
  u.globalAlpha = clamp(k);

  R(px + 4, py + 6, PANW, PANH, 'rgba(8,4,10,0.48)');
  IMG(A.panel, px, py);

  // Header
  put(u, dynTxt('hdrSh', 'HERO & ROSTER', 'bold 18px "Pixelify Sans"', '#241208'), px + PANW / 2, py + 19.5, 'c', 'm');
  put(u, dynTxt('hdr',   'HERO & ROSTER', 'bold 18px "Pixelify Sans"', '#ffe9a0'), px + PANW / 2, py + 18.5, 'c', 'm');

  // 4 Hanging Wooden Board Sub-Tabs
  const RC = rects(px, py);
  for (const st of RC.subtabs) {
    const { tab } = st;
    const locked = tab.stage > RC.stg;
    const active = !locked && D.activeTab === tab.id;
    const tx = st.x + (locked ? shakeOf(`tab_${tab.id}`) : 0);
    const board = locked ? A.boards[tab.id].locked : active ? A.boards[tab.id].active : A.boards[tab.id].idle;
    IMG(board, tx, py + 28);
    if (locked) {
      IMG(A.lockSm, tx + 5, py + 38);
      put(u, dynTxt('subLk', tab.label, '16px "Pixelify Sans"', '#c8c4d2'), tx + 14, py + 42.5, 'l', 'm');
    } else if (active) {
      put(u, dynTxt('subOnS', tab.label, 'bold 16px "Pixelify Sans"', '#241208'), tx + tab.w / 2, py + 43.5, 'c', 'm');
      put(u, dynTxt('subOn',  tab.label, 'bold 16px "Pixelify Sans"', '#ffe9a0'), tx + tab.w / 2, py + 42.5, 'c', 'm');
    } else {
      put(u, dynTxt('subId', tab.label, '16px "Pixelify Sans"', '#d2b98e'), tx + tab.w / 2, py + 42.5, 'c', 'm');
    }
  }

  if (D.activeTab === 'look') {
    drawLookTab(u, R, IMG, put, px, py, t, RC, isPressed);
  } else {
    drawSheetTab(u, R, IMG, put, px, py, t, RC, isPressed, shakeOf);
  }

  // Footer status / hint & DONE button
  let hint = '';
  let hintCol = '#5a3a22';
  if (t < D.statusUntil && D.statusMsg) {
    hint = D.statusMsg;
    hintCol = D.statusTone === 'warn' ? '#8a2020' : '#1d5e14';
  } else if (D.activeTab === 'look') {
    hint = D.nameFocus ? 'Type name · [Enter] to confirm' : 'Click NAME to type · Switch to Hero Sheet for stats & build';
  } else {
    const sheet = computeHeroSheet(D.style, cb.heroLevel ? cb.heroLevel() : 1);
    const sk = sheet.skills.find(s => s.id === D.selectedSkill) || sheet.skills[0];
    hint = `${sk.prof ? '★' : '·'} ${sk.short.toUpperCase()} (${sk.ab.toUpperCase()} ${fmtMod(sk.bonus)}): ${sk.note}`;
    hintCol = sk.prof ? '#1d5e14' : '#5a3a22';
  }
  put(u, dynTxt('ht', hint, '16px "Pixelify Sans"', hintCol), px + 14, py + 281, 'l', 'm');

  const dr = RC.doneBtn;
  const dp = isPressed('done');
  IMG(dp ? A.doneBtnP : A.doneBtn, dr.x, dr.y + (dp ? 1 : 0));
  put(u, dynTxt('dnS', 'DONE', 'bold 16px "Pixelify Sans"', '#14200c'), dr.x + dr.w / 2, dr.y + dr.h / 2 + 1 + (dp ? 1 : 0), 'c', 'm');
  put(u, dynTxt('dn',  'DONE', 'bold 16px "Pixelify Sans"', '#fff8dc'), dr.x + dr.w / 2, dr.y + dr.h / 2 + (dp ? 1 : 0), 'c', 'm');

  u.restore();
}

function drawLookTab(u, R, IMG, putFn, px, py, t, RC, isPressed) {
  const mx = px + MIRROR.x, my = py + MIRROR.y;
  IMG(A.mirror, mx, my);
  const tinOn = !!(cb.gearState && cb.gearState().helm === 'pietin');
  const barking = t - D.barkAt < 0.55;
  act.drawHeroPreview(u, D.style, barking ? 'strike' : 'ready', mx + 82, my + 104, S, tinOn);

  const port = getPreviewPortrait(D.style);
  R(mx + 5, my + 5, 34, 34, '#140b0c');
  R(mx + 6, my + 6, 32, 32, '#c4943a');
  const prevSmooth = u.imageSmoothingEnabled;
  u.imageSmoothingEnabled = false;
  u.drawImage(port, Math.round((mx + 7) * S), Math.round((my + 7) * S), 30 * S, 30 * S);
  u.imageSmoothingEnabled = prevSmooth;

  if (barking) {
    const bx = mx + 92, by = my + 24;
    R(bx, by, 34, 15, '#140b0c');
    R(bx + 1, by + 1, 32, 13, '#ffd84a');
    putFn(u, dynTxt('brk', D.barkWord, 'bold 16px "Pixelify Sans"', '#8a1a10'), bx + 17, by + 7.5, 'c', 'm');
  }

  const npx = px + NAMEPL.x, npy = py + NAMEPL.y;
  IMG(A.plaque, npx, npy);
  const disp = heroDisplayName({ ...D.style, name: D.draftName || 'Sellsword' });
  putFn(u, dynTxt('np', disp, 'bold 16px "Pixelify Sans"', '#3b2418'), npx + NAMEPL.w / 2, npy + 10.5, 'c', 'm');

  const vx = px + VOICER.x, vy = py + VOICER.y;
  IMG(A.voiceCard, vx, vy);
  putFn(u, dynTxt('vl', 'VOICE', '16px "Pixelify Sans"', '#5a3a22'), vx + 6, vy + 13, 'l', 'm');
  IMG(isPressed('voicePrev') ? A.arrowBtnP : A.arrowBtn, RC.voicePrev.x, RC.voicePrev.y);
  putFn(u, dynTxt('ar', '<', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.voicePrev.x + 7, RC.voicePrev.y + 7, 'c', 'm');
  const vOpt = findOption(VOICE_BARKS, D.style.voice);
  putFn(u, dynTxt('vo', vOpt.label, '16px "Pixelify Sans"', '#3b2418'), vx + 79, vy + 13, 'c', 'm');
  IMG(isPressed('voiceNext') ? A.arrowBtnP : A.arrowBtn, RC.voiceNext.x, RC.voiceNext.y);
  putFn(u, dynTxt('ar', '>', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.voiceNext.x + 7, RC.voiceNext.y + 7, 'c', 'm');
  IMG(isPressed('voiceTest') ? A.testBtnP : A.testBtn, RC.voiceTest.x, RC.voiceTest.y);
  putFn(u, dynTxt('tbk', 'TEST', '16px "Pixelify Sans"', '#fff8dc'), RC.voiceTest.x + 20, RC.voiceTest.y + 8.5, 'c', 'm');

  IMG(isPressed('rand') ? A.randBtnP : A.randBtn, RC.randBtn.x, RC.randBtn.y);
  putFn(u, dynTxt('rb', 'RANDOMISE', '16px "Pixelify Sans"', '#ffe9a0'), RC.randBtn.x + 36, RC.randBtn.y + 11, 'c', 'm');
  IMG(isPressed('choose') ? A.chooseBtnP : A.chooseBtn, RC.chooseBtn.x, RC.chooseBtn.y);
  putFn(u, dynTxt('cb', 'CHOOSE FOR ME', '16px "Pixelify Sans"', '#fff8dc'), RC.chooseBtn.x + 44, RC.chooseBtn.y + 11, 'c', 'm');

  // Right Column Cards
  const rx = px + 184;
  IMG(A.nameCard, rx, py + 58);
  IMG(A.optCard, rx, py + 113);

  putFn(u, dynTxt('lbl', 'NAME', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 70, 'l', 'm');
  R(RC.nameInput.x, RC.nameInput.y, RC.nameInput.w, RC.nameInput.h, D.nameFocus ? '#d9a948' : '#140b0c');
  R(RC.nameInput.x + 1, RC.nameInput.y + 1, RC.nameInput.w - 2, RC.nameInput.h - 2, D.nameFocus ? '#fff8e2' : '#f2e2bd');
  const shownName = D.draftName + (D.nameFocus && Math.floor(t * 2.5) % 2 === 0 ? '_' : '');
  putFn(u, dynTxt('nin', shownName || ' ', 'bold 16px "Pixelify Sans"', '#241208'), RC.nameInput.x + 5, RC.nameInput.y + 8, 'l', 'm');

  R(RC.nameDice.x, RC.nameDice.y, RC.nameDice.w, RC.nameDice.h, '#140b0c');
  R(RC.nameDice.x + 1, RC.nameDice.y + 1, RC.nameDice.w - 2, RC.nameDice.h - 2, isPressed('nameDice') ? '#3d2414' : '#6e4727');
  R(RC.nameDice.x + 1, RC.nameDice.y + 1, RC.nameDice.w - 2, 1, '#c4943a');
  putFn(u, dynTxt('nd', 'NEW NAME', '16px "Pixelify Sans"', '#ffe9a0'), RC.nameDice.x + RC.nameDice.w / 2, RC.nameDice.y + 8, 'c', 'm');

  for (const pChip of RC.presets) {
    const active = D.style.name === pChip.name;
    R(pChip.x, pChip.y, pChip.w, pChip.h, '#140b0c');
    R(pChip.x + 1, pChip.y + 1, pChip.w - 2, pChip.h - 2, active ? '#96621c' : '#4a2e1b');
    R(pChip.x + 1, pChip.y + 1, pChip.w - 2, 1, active ? '#f6d888' : '#875a31');
    putFn(u, dynTxt('pr', pChip.name, '16px "Pixelify Sans"', active ? '#fff8dc' : '#e9d3a6'), pChip.x + pChip.w / 2, pChip.y + 6, 'c', 'm');
  }

  putFn(u, dynTxt('lbl', 'EPITHET', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 101, 'l', 'm');
  IMG(isPressed('epPrev') ? A.arrowBtnP : A.arrowBtn, RC.epPrev.x, RC.epPrev.y);
  putFn(u, dynTxt('ar', '<', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.epPrev.x + 7, RC.epPrev.y + 7, 'c', 'm');
  const epOpt = findOption(EPITHETS, D.style.epithet);
  putFn(u, dynTxt('epv', epOpt.label, '16px "Pixelify Sans"', '#3b2418'), rx + 168, py + 101, 'c', 'm');
  IMG(isPressed('epNext') ? A.arrowBtnP : A.arrowBtn, RC.epNext.x, RC.epNext.y);
  putFn(u, dynTxt('ar', '>', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.epNext.x + 7, RC.epNext.y + 7, 'c', 'm');

  putFn(u, dynTxt('lbl', 'HOOD', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 126, 'l', 'm');
  R(RC.hoodBtn.x, RC.hoodBtn.y, RC.hoodBtn.w, RC.hoodBtn.h, '#140b0c');
  R(RC.hoodBtn.x + 1, RC.hoodBtn.y + 1, RC.hoodBtn.w - 2, RC.hoodBtn.h - 2, D.style.hoodUp ? '#56361d' : '#96621c');
  R(RC.hoodBtn.x + 1, RC.hoodBtn.y + 1, RC.hoodBtn.w - 2, 1, D.style.hoodUp ? '#c4943a' : '#f6d888');
  putFn(u, dynTxt('hdv', D.style.hoodUp ? 'HOOD: UP' : 'HOOD: DOWN', '16px "Pixelify Sans"', '#fff6d8'), RC.hoodBtn.x + 40, RC.hoodBtn.y + 8, 'c', 'm');

  putFn(u, dynTxt('lbl', 'SCAR', '16px "Pixelify Sans"', '#5a3a22'), rx + 142, py + 126, 'l', 'm');
  R(RC.scarBtn.x, RC.scarBtn.y, RC.scarBtn.w, RC.scarBtn.h, '#140b0c');
  R(RC.scarBtn.x + 1, RC.scarBtn.y + 1, RC.scarBtn.w - 2, RC.scarBtn.h - 2, D.style.scar ? '#96621c' : '#56361d');
  R(RC.scarBtn.x + 1, RC.scarBtn.y + 1, RC.scarBtn.w - 2, 1, D.style.scar ? '#f6d888' : '#c4943a');
  putFn(u, dynTxt('scv', D.style.scar ? 'SCAR: ON' : 'SCAR: OFF', '16px "Pixelify Sans"', '#fff6d8'), RC.scarBtn.x + 42, RC.scarBtn.y + 8, 'c', 'm');

  const drawSwatches = (list, activeId) => {
    for (const sw of list) {
      const sel = sw.item.id === activeId;
      R(sw.x, sw.y, sw.w, sw.h, sel ? '#fff1b8' : '#140b0c');
      R(sw.x + 1, sw.y + 1, sw.w - 2, sw.h - 2, sel ? '#c4943a' : '#3d2414');
      R(sw.x + 2, sw.y + 2, sw.w - 4, sw.h - 4, sw.item.swatch);
    }
  };

  putFn(u, dynTxt('lbl', 'SKIN', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 146, 'l', 'm');
  drawSwatches(RC.skinSwatches, D.style.skin);

  putFn(u, dynTxt('lbl', 'HAIR', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 165, 'l', 'm');
  IMG(isPressed('hairPrev') ? A.arrowBtnP : A.arrowBtn, RC.hairPrev.x, RC.hairPrev.y);
  putFn(u, dynTxt('ar', '<', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.hairPrev.x + 7, RC.hairPrev.y + 7, 'c', 'm');
  putFn(u, dynTxt('hs', findOption(HAIR_STYLES, D.style.hairStyle).label, '16px "Pixelify Sans"', '#3b2418'), rx + 168, py + 165, 'c', 'm');
  IMG(isPressed('hairNext') ? A.arrowBtnP : A.arrowBtn, RC.hairNext.x, RC.hairNext.y);
  putFn(u, dynTxt('ar', '>', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.hairNext.x + 7, RC.hairNext.y + 7, 'c', 'm');

  putFn(u, dynTxt('lbl', 'SHADE', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 185, 'l', 'm');
  drawSwatches(RC.hairSwatches, D.style.hairColor);

  putFn(u, dynTxt('lbl', 'EYES', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 204, 'l', 'm');
  drawSwatches(RC.eyeSwatches, D.style.eyeColor);

  putFn(u, dynTxt('lbl', 'BEARD', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 223, 'l', 'm');
  IMG(isPressed('facePrev') ? A.arrowBtnP : A.arrowBtn, RC.facePrev.x, RC.facePrev.y);
  putFn(u, dynTxt('ar', '<', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.facePrev.x + 7, RC.facePrev.y + 7, 'c', 'm');
  putFn(u, dynTxt('fh', findOption(FACIAL_HAIRS, D.style.facialHair).label, '16px "Pixelify Sans"', '#3b2418'), rx + 168, py + 223, 'c', 'm');
  IMG(isPressed('faceNext') ? A.arrowBtnP : A.arrowBtn, RC.faceNext.x, RC.faceNext.y);
  putFn(u, dynTxt('ar', '>', 'bold 16px "Pixelify Sans"', '#ffe9a0'), RC.faceNext.x + 7, RC.faceNext.y + 7, 'c', 'm');

  putFn(u, dynTxt('lbl', 'CLOAK', '16px "Pixelify Sans"', '#5a3a22'), rx + 6, py + 246, 'l', 'm');
  drawSwatches(RC.capeSwatches, D.style.capeColor);
  putFn(u, dynTxt('lbl', 'TUNIC', '16px "Pixelify Sans"', '#5a3a22'), rx + 138, py + 246, 'l', 'm');
  drawSwatches(RC.tabSwatches, D.style.tabardColor);
}

function drawSheetTab(u, R, IMG, putFn, px, py, t, RC, isPressed, shakeOf) {
  const lx = px + 12, rx = px + 204;
  const lv = cb.heroLevel ? cb.heroLevel() : 1;
  const hs = cb.hudState(t);
  const sheet = computeHeroSheet(D.style, lv);
  const mats = cb.materials ? cb.materials() : {};
  const glands = mats['Fire Beetle Gland'] || 0;

  // Left Top Card: Core Stats & Bounded Accuracy
  IMG(A.sheetStats, lx, py + 58);
  putFn(u, dynTxt('cls', `LV ${lv} HUMAN FIGHTER`, 'bold 16px "Pixelify Sans"', '#3b2418'), lx + 6, py + 67, 'l', 'm');
  R(lx + 144, py + 61, 36, 12, '#140b0c');
  R(lx + 145, py + 62, 34, 10, '#56361d');
  putFn(u, dynTxt('pb', `PB +${sheet.pb}`, 'bold 16px "Pixelify Sans"', '#ffe9a0'), lx + 162, py + 67, 'c', 'm');

  const AB = [['str', 'STR'], ['dex', 'DEX'], ['con', 'CON'], ['int', 'INT'], ['wis', 'WIS'], ['cha', 'CHA']];
  for (let i = 0; i < AB.length; i++) {
    const [k, lbl] = AB[i];
    const col = i % 3, row = Math.floor(i / 3);
    const ax = lx + 6 + col * 59, ay = py + 76 + row * 24;
    R(ax, ay, 56, 22, '#140b0c');
    R(ax + 1, ay + 1, 54, 20, '#b58d58');
    R(ax + 2, ay + 2, 52, 18, '#f8edd2');
    putFn(u, dynTxt('abL', lbl, '16px "Pixelify Sans"', '#6e4727'), ax + 6, ay + 7, 'l', 'm');
    putFn(u, dynTxt('abS', String(sheet.scores[k]), 'bold 16px "Pixelify Sans"', '#241208'), ax + 50, ay + 7, 'r', 'm');
    const mod = sheet.mods[k];
    putFn(u, dynTxt('abM', fmtMod(mod), 'bold 16px "Pixelify Sans"', mod > 0 ? '#1d5e14' : mod < 0 ? '#8a2020' : '#5a3a22'), ax + 28, ay + 15.5, 'c', 'm');
  }

  // Bounded Accuracy Strip
  const BA = [
    ['AC', String(sheet.ac)],
    ['TO-HIT', fmtMod(sheet.toHit)],
    ['GREATSWORD', `2d6${fmtMod(sheet.dmgFlat)}`],
  ];
  for (let i = 0; i < 3; i++) {
    const bx = lx + 6 + i * (i === 2 ? 56 : 56);
    const bw = i === 0 ? 44 : i === 1 ? 56 : 68;
    const x0 = i === 0 ? lx + 6 : i === 1 ? lx + 53 : lx + 112;
    R(x0, py + 126, bw, 22, '#140b0c');
    R(x0 + 1, py + 127, bw - 2, 20, '#56361d');
    R(x0 + 2, py + 128, bw - 4, 18, '#3d2414');
    putFn(u, dynTxt('baL', BA[i][0], '16px "Pixelify Sans"', '#d2b98e'), x0 + bw / 2, py + 133, 'c', 'm');
    putFn(u, dynTxt('baV', BA[i][1], 'bold 16px "Pixelify Sans"', '#ffe9a0'), x0 + bw / 2, py + 142, 'c', 'm');
  }

  putFn(u, dynTxt('sav', `SAVES  STR ${fmtMod(sheet.saves.str)} · CON ${fmtMod(sheet.saves.con)}`, '16px "Pixelify Sans"', '#3b2418'), lx + 6, py + 155, 'l', 'm');
  const pouchInfo = glands > 0 ? `HP ${hs.hp}/${hs.hpMax} · Fire Glands ${glands}` : `HP ${hs.hp}/${hs.hpMax} · XP ${hs.xp}/300`;
  putFn(u, dynTxt('hpS', pouchInfo, '16px "Pixelify Sans"', glands > 0 ? '#9c4014' : '#1d5e14'), lx + 6, py + 166, 'l', 'm');

  // Left Bottom Card: Weapon Mastery & Locked Progression
  IMG(A.sheetMast, lx, py + 179);
  putFn(u, dynTxt('wmT', 'WEAPON MASTERY', 'bold 16px "Pixelify Sans"', '#3b2418'), lx + 6, py + 187, 'l', 'm');
  putFn(u, dynTxt('wmC', '1 / 3 SLOTS', '16px "Pixelify Sans"', '#6e4727'), lx + 180, py + 187, 'r', 'm');

  // Graze active + 2 locked slots
  IMG(A.mastOn, RC.mastGraze.x, RC.mastGraze.y);
  putFn(u, dynTxt('mGr', 'GRAZE', 'bold 16px "Pixelify Sans"', '#fff8dc'), RC.mastGraze.x + 28, RC.mastGraze.y + 9, 'c', 'm');

  for (const [key, r, lbl] of [['mastSlot2', RC.mastSlot2, 'LV 4'], ['mastSlot3', RC.mastSlot3, 'STG 15']]) {
    const sx = r.x + shakeOf(key);
    IMG(A.mastLk, sx, r.y);
    IMG(A.lockSm, sx + 5, r.y + 5);
    putFn(u, dynTxt('mLk', lbl, '16px "Pixelify Sans"', '#c8c4d2'), sx + 15, r.y + 9, 'l', 'm');
  }

  const drawLockedBtn = (key, img, r, lbl) => {
    const sx = r.x + shakeOf(key);
    IMG(img, sx, r.y);
    IMG(A.lockSm, sx + 6, r.y + 5);
    putFn(u, dynTxt('lkB', lbl, '16px "Pixelify Sans"', '#c8c4d2'), sx + 16, r.y + 9, 'l', 'm');
  };
  drawLockedBtn('tacMaster', A.lockWide, RC.tacMaster, 'TACTICAL MASTER · LV 9');
  drawLockedBtn('featLock',  A.lockHalf, RC.featLock,  'FEATS · S15');
  drawLockedBtn('epicLock',  A.lockHalf, RC.epicLock,  'EPIC · S850');

  // Right Top Card: Origin, Kit & Fighting Style
  IMG(A.sheetBuild, rx, py + 58);
  putFn(u, dynTxt('obT', 'ORIGIN & COMBAT KIT', 'bold 16px "Pixelify Sans"', '#3b2418'), rx + 6, py + 67, 'l', 'm');

  const ep = RC.elmPickSheet;
  IMG(isPressed('elmPickSheet') ? A.elmPickSmP : A.elmPickSm, ep.x, ep.y);
  putFn(u, dynTxt('epB', 'CHOOSE FOR ME', '16px "Pixelify Sans"', '#fff8dc'), ep.x + ep.w / 2, ep.y + ep.h / 2, 'c', 'm');

  const shortPerk = {
    soldier: '+10% Cmd Strike', criminal: '+10% Gold Find', acolyte: '+15% Regen', sage: '+8% Lore XP',
    vanguard: '+1 Weapon DMG', skirmisher: '+1 To-Hit', purse: '+8% Coin Drop',
    great_weapon: '+1 Sword DMG', defense: '+1 Armour AC', dueling: '+1 Blade Hit', blind: '+1 Spores/Hit',
  };
  const rows = [
    { lbl: 'ORIGIN', prev: RC.bgPrev,  next: RC.bgNext,  idP: 'bgPrev',  idN: 'bgNext',  opt: sheet.bg,  y: py + 89 },
    { lbl: 'KIT',    prev: RC.kitPrev, next: RC.kitNext, idP: 'kitPrev', idN: 'kitNext', opt: sheet.kit, y: py + 111 },
    { lbl: 'STYLE',  prev: RC.fsPrev,  next: RC.fsNext,  idP: 'fsPrev',  idN: 'fsNext',  opt: sheet.fs,  y: py + 133 },
  ];
  for (const row of rows) {
    putFn(u, dynTxt('bLb', row.lbl, '16px "Pixelify Sans"', '#5a3a22'), rx + 6, row.y, 'l', 'm');
    IMG(isPressed(row.idP) ? A.arrowBtnP : A.arrowBtn, row.prev.x, row.prev.y);
    putFn(u, dynTxt('ar', '<', 'bold 16px "Pixelify Sans"', '#ffe9a0'), row.prev.x + 7, row.prev.y + 7, 'c', 'm');
    putFn(u, dynTxt('bVal', row.opt.label, 'bold 16px "Pixelify Sans"', '#3b2418'), rx + 107, row.y, 'c', 'm');
    IMG(isPressed(row.idN) ? A.arrowBtnP : A.arrowBtn, row.next.x, row.next.y);
    putFn(u, dynTxt('ar', '>', 'bold 16px "Pixelify Sans"', '#ffe9a0'), row.next.x + 7, row.next.y + 7, 'c', 'm');
    putFn(u, dynTxt('bPk', shortPerk[row.opt.id] || row.opt.perk, '16px "Pixelify Sans"', '#1d5e14'), rx + 246, row.y, 'r', 'm');
  }

  // Right Bottom Card: 18 Skills (3 × 6 interactive grid)
  IMG(A.sheetSkills, rx, py + 153);
  putFn(u, dynTxt('skH', '18 SKILLS', 'bold 16px "Pixelify Sans"', '#3b2418'), rx + 6, py + 162, 'l', 'm');
  putFn(u, dynTxt('skS', 'Click skill to inspect', '16px "Pixelify Sans"', '#6e4727'), rx + 246, py + 162, 'r', 'm');

  for (const sr of RC.skillRects) {
    const sk = sr.skill;
    const sel = D.selectedSkill === sk.id;
    R(sr.x, sr.y, sr.w, sr.h, sel ? '#ffd24a' : sk.prof ? '#8a5f1e' : '#b58d58');
    R(sr.x + 1, sr.y + 1, sr.w - 2, sr.h - 2, sel ? '#fff8dc' : sk.prof ? '#f4e6be' : '#dfc28e');
    // Proficiency pip diamond/square
    R(sr.x + 3, sr.y + 5, 3, 3, sk.prof ? '#2a6e20' : '#9c7d52');
    if (sk.prof) R(sr.x + 4, sr.y + 6, 1, 1, '#a8f080');
    putFn(u, dynTxt('skN', sk.short, '16px "Pixelify Sans"', sk.prof ? '#241208' : '#5a3a22'), sr.x + 8, sr.y + 6.5, 'l', 'm');
    const bStr = fmtMod(sk.bonus);
    putFn(u, dynTxt('skB', bStr, sk.prof ? 'bold 16px "Pixelify Sans"' : '16px "Pixelify Sans"', sk.prof ? '#1d5e14' : (sk.bonus < 0 ? '#8a2020' : '#4d3125')), sr.x + sr.w - 3, sr.y + 6.5, 'r', 'm');
  }
}
