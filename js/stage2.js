// ─────────────────────────────────────────────────────────────
//  Stage 1 -> 2 Bridge (Beat 10, Beat 10b) & Stage 2+ Combat Loop
//
//  • Beat 10: Once Stage 1 Clear lands (Beat 9), the NEXT ▶ bookmark
//    on the right edge unlocks and pulses gold with escalating nudges
//    (spotlight, 6s gauntlet pointer, 15s Elminster nudge, 30s chime).
//  • Transition: Clicking ▶ walks the hero rightward off the meadow,
//    sweeps a stepped pixel curtain across the scene, advances the
//    stage to Hedrun's Turnip Fields (0/12), unlocks [H] Hero, and
//    reveals the new stage (reusing the existing meadow backdrop).
//  • Beat 10b: Opens the Hero Appearance Customiser before Stage 2
//    waves begin; closing it starts the 12-kill wave combat loop.
// ─────────────────────────────────────────────────────────────
import { W, H, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import { F, off, setHedrunStage3ClearAt } from './world.js';
import { BARN_DOOR_X, BARREL_SPOTS_S3 } from './art/ciderbarn.js';
import * as cb from './combat.js';
import * as act from './actors.js';
import * as beat6 from './beat6.js';
import * as beat8 from './beat8.js';
import * as beat9 from './beat9.js';
import * as customiser from './customiser.js';
import {
  setNextUnlocked, setNextPulse, setStageHUD, setTileLocked, setSurgeGuided,
  setLevelUpFlash, setSurgeUnlockAt, setSurgeHover, setSurgeRestAt,
  inNextTile, inHeroTile, inHeroPortrait, inSurgeBtn, inPotionSocket, SURGE_BTN,
} from './hud.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { stageDef, isStageCleared, MAX_PLAYABLE_STAGE, RULES_XP, STAGE3_ORDER } from './progression.js';
import { mulberry, clamp, lerp, easeOut, easeInOut, easeOutBack, crispText, makeCanvas } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const DT = 1 / 120;
const FUSE = 7.5;
const NUDGE = { pointer: 6, line: 15, pulse: 30 };

let D = null, SPOT10 = null, GAUNT = null, GAUNT_P = null, hoverPt = null;

export function buildStage2() {
  SPOT10 = cb.buildSpot(24, 28, 1.0);
  GAUNT = buildGauntlet(false);
  GAUNT_P = buildGauntlet(true);
}

export function reset(seed = 47) {
  D = {
    Eref: cb.E,
    tNow: 0,
    s: null,
    seed,
    rng: mulberry(seed),
    beat10At: null,
    nextUnlocked: false,
    nextUnlockAt: null,
    nudged: false,
    chimeAt: 0,
    trans: null,
    beat10bDone: false,
    heroUnlocked: false,
    waveStarted: false,
    foes: [],
    spawned: 0,
    nextWaveAt: null,
    round: null,
    nextRegen: 0,
    lastTapS: -9,
    lastStrikeAt: -9,
    n: 0,
    ripples: [],
    stageClearAt: null,
    stageClearFor: 0,
    levelUpShown: false,
    lvCard: null,
    lvBtnRect: null,
    surgeGuided: false,
    surgeUsed: false,
    wasSurgeCd: false,
    surgeRestLineAt: null,
    surgeUnlockMsg: null,
    hedrunGiftAt: null,
    potionNote: null,
  };
  act.setHeroWalkOverride(null);
  setHedrunStage3ClearAt(null);
  setSurgeGuided(false);
  setSurgeHover(false);
  setLevelUpFlash(-9);
  setSurgeUnlockAt(-9);
  setSurgeRestAt(-9);
  cb.endSlowMo(0);
  setNextUnlocked(false);
  setNextPulse(false);
  setTileLocked('hero', true);
  setStageHUD(1);
}
reset();

const LV_TEXT = new Map();
function lvTx(str, size = 14, color = '#3b2418', { bold = false, sh = null, spacing = 0 } = {}) {
  const k = [str, size, color, bold, sh, spacing].join('|');
  if (LV_TEXT.has(k)) return LV_TEXT.get(k);
  const font = `${bold ? 'bold ' : ''}${size}px "Pixelify Sans"`;
  const s = str.replace(/f(?=[ilft])/g, 'f\u200C');
  const a = crispText(s, font, color, { threshold: 105, spacing });
  let out = a;
  if (sh) {
    const b = crispText(s, font, sh, { threshold: 105, spacing });
    const [cv, cx] = makeCanvas(a.width + 2, a.height + 2);
    cx.drawImage(b, 2, 2); cx.drawImage(b, 1, 2); cx.drawImage(b, 2, 1); cx.drawImage(a, 0, 0);
    out = cv;
  }
  const d = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  let x0 = a.width, x1 = 0, y0 = a.height, y1 = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) if (d[(y * a.width + x) * 4 + 3]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  out.inkX = x0 < a.width ? x0 : 4;
  out.inkW = x1 >= x0 ? x1 - x0 + 1 : 0;
  out.inkTop = y0 < a.height ? y0 : 0;
  out.inkH = y1 >= y0 ? y1 - y0 + 1 : a.height;
  LV_TEXT.set(k, out);
  return out;
}
function putLvText(u, img, gx, gy, align = 'l', valign = 't') {
  let X = gx * S - img.inkX;
  if (align === 'c') X = Math.round(gx * S - img.inkW / 2 - img.inkX);
  else if (align === 'r') X = Math.round(gx * S - img.inkW - img.inkX);
  const Y = valign === 'm' ? gy * S - img.inkTop - img.inkH / 2 : gy * S - img.inkTop;
  u.drawImage(img, Math.round(X), Math.round(Y));
}
function dismissLevelCard(t) {
  if (!D || !D.lvCard) return false;
  const card = D.lvCard;
  D.lvCard = null;
  D.lvBtnRect = null;
  cb.endSlowMo(t);
  const s = cb.warp(t);
  cb.endLevelUpCelebration(s);
  setSurgeUnlockAt(t);
  D.surgeUnlockMsg = { t, text: `+${Math.max(1, card.newMaxHP - card.prevMaxHP)} MAX HP . ACTION SURGE READY!` };
  D.nextWaveAt = Math.max(D.nextWaveAt ?? 0, s + 0.55);
  cb.E.live.push({ s, k: 'chime' });
  return true;
}

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function heroUnlocked() { return !!D && (D.heroUnlocked || (cb.E?.stage || 1) >= 2); }
export function nextReady() { return !!D && D.nextUnlocked && !D.trans; }
export function inTransition() { return !!D && !!D.trans; }
export function levelCardOpen() { return !!D && !!D.lvCard && !D.trans; }
export function hover(gx, gy) {
  hoverPt = gx === null ? null : [gx, gy];
  const modOpen = customiser.isOpen() || beat6.trainingOpen() || beat8.gearOpen();
  setSurgeHover(!modOpen && !D?.lvCard && (cb.E?.level || 1) >= 2 && !!hoverPt && inSurgeBtn(gx, gy));
}

export function debug() {
  if (!D) return null;
  const stg = cb.E?.stage || 1;
  const st = cb.hudState(D.tNow || 0);
  return {
    stage: stg,
    stageName: stageDef(stg).name,
    beat10At: D.beat10At === null ? null : +D.beat10At.toFixed(2),
    nextUnlocked: D.nextUnlocked,
    inTransition: !!D.trans,
    beat10bDone: D.beat10bDone,
    heroUnlocked: heroUnlocked(),
    waveStarted: D.waveStarted,
    spawned: D.spawned,
    quotaMax: stageDef(stg).quota,
    liveFoes: D.foes.filter(f => f.dieAt === undefined).length,
    stageClearFor: D.stageClearFor,
    materials: cb.materials(D.s || 0),
    level: st.level,
    levelUpShown: D.levelUpShown,
    lvCardOpen: !!D.lvCard,
    surgeGuided: D.surgeGuided,
    surgeReady: st.surgeReady,
    surgeRemain: +st.surgeRemain.toFixed(1),
    potions: st.potions,
    tacticalMind: st.tacticalMind,
    slowMo: cb.isSlowMo(),
  };
}

// ---------- Stage transition (Beat 10 -> Stage 2, and Stage 2 -> Stage 3+) ----------
function startTransition(t, toStage) {
  if (!D || D.trans || toStage > MAX_PLAYABLE_STAGE) return false;
  const s = cb.warp(t);
  D.nextUnlocked = false;
  setNextUnlocked(false);
  setNextPulse(false);
  cb.E.live.push({ s, k: 'paper' }, { s: s + 0.08, k: 'step' });
  D.trans = { startT: t, toStage, swapped: false, dur: 1.5 };
  act.setHeroWalkOverride(tt => {
    if (!D.trans || D.trans.swapped) return null;
    const el = Math.max(0, tt - D.trans.startT);
    const x = cb.CB.x1 + el * 260;
    return { x, dx: 0, walking: true, frame: Math.floor(el * 14) % 8 };
  });
  return true;
}

function finishTransitionSwap(t) {
  const tr = D.trans;
  if (!tr || tr.swapped) return;
  tr.swapped = true;
  const s = cb.warp(t);
  const def = stageDef(tr.toStage);
  act.setHeroWalkOverride(null);
  cb.advanceStage(tr.toStage, s);
  setStageHUD(def.id, def.name, def.quota, def.kind);
  D.heroUnlocked = true;
  setTileLocked('hero', false);
  D.foes = [];
  D.spawned = 0;
  D.round = null;
  D.nextWaveAt = s + 0.7;
  D.stageClearAt = null;
  D.stageClearFor = 0;
  D.nextRegen = s + 2.5;
  D.s = s;
  setHedrunStage3ClearAt(null);
  setSurgeGuided(false);
  cb.endSlowMo(t);
  if (tr.toStage === 2 && !D.beat10bDone) D.waveStarted = false;
  else D.waveStarted = true;
}

function completeTransition(t) {
  const tr = D.trans;
  D.trans = null;
  act.setHeroWalkOverride(null);
  const s = cb.warp(t);
  if (tr.toStage === 2 && !D.beat10bDone) {
    D.beat10bDone = true;
    say('line17', s + 0.08);
    customiser.open(t, {
      focusName: false,
      onClose: closeT => {
        const cs = cb.warp(closeT);
        if (!D.waveStarted) {
          D.waveStarted = true;
          D.s = cs;
          D.nextWaveAt = cs + 0.75;
          if (!busyLine(cs)) say('stage2Open', cs + 0.12);
        }
      },
    });
  } else {
    D.waveStarted = true;
    D.s = s;
    D.nextWaveAt = s + 0.65;
    if (tr.toStage === 3) say('stage3Open', s + 0.12);
  }
}

// ---------- Click / Key handling ----------
export function clickNext(gx, gy, t) {
  if (!D || D.trans) return false;
  if (inNextTile(gx, gy)) {
    const stg = cb.E?.stage || 1;
    if (D.nextUnlocked && stg < MAX_PLAYABLE_STAGE) return startTransition(t, stg + 1);
    const s = cb.warp(t);
    cb.E.live.push({ s, k: 'paper' }, { s: s + 0.07, k: 'paper' });
    return true;
  }
  return false;
}

export function clickHero(gx, gy, t) {
  if (!D || D.trans) return false;
  if (inHeroTile(gx, gy) || inHeroPortrait(gx, gy)) {
    if (heroUnlocked()) {
      customiser.open(t);
      return true;
    }
    if (inHeroTile(gx, gy)) {
      const s = cb.warp(t);
      cb.E.live.push({ s, k: 'paper' }, { s: s + 0.07, k: 'paper' });
      return true;
    }
  }
  return false;
}

export function doActionSurge(t) {
  if (!D || D.trans) return false;
  if (!cb.triggerActionSurge(t, D.rng)) return false;
  const s = cb.warp(t);
  D.surgeGuided = false;
  D.surgeUsed = true;
  setSurgeGuided(false);
  D.surgeRestLineAt = s + 1.05;
  return true;
}

export function clickBelt(gx, gy, t) {
  if (!D || D.trans) return false;
  if (D.lvCard) {
    const r = D.lvBtnRect;
    const onBtn = r && gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h;
    const cy = Math.max(204, Math.round(boxBottom() + 61 + 12));
    const onCard = gx >= 172 && gx <= 468 && gy >= cy - 61 && gy <= cy + 61;
    const age = t - D.lvCard.t;
    if ((onBtn && age > 0.16) || (onCard && age > 0.35) || age > 0.65) {
      dismissLevelCard(t);
    }
    return true;
  }
  if (inSurgeBtn(gx, gy) && (cb.E?.level || 1) >= 2) {
    if (doActionSurge(t)) return true;
    const s = cb.warp(t);
    cb.E.live.push({ s, k: 'paper' });
    return true;
  }
  if (inPotionSocket(gx, gy) && (cb.E?.potions || 0) > 0) {
    const res = cb.drinkPotion(t);
    D.potionNote = { t, text: res.ok ? `HEALED +${res.amt} HP!` : res.reason === 'full' ? 'HP ALREADY FULL' : 'NO POTIONS' };
    return true;
  }
  return false;
}

export function click(gx, gy, t) {
  if (!D || D.trans || (cb.E?.stage || 1) < 2) return false;
  const s = cb.warp(t);
  const stg = cb.E.stage;
  const id = cb.ratAtPoint(gx, gy, s, off(1, F.ground), r => (r.stage || 1) === stg);
  D.ripples.push({ t, gx, gy, hit: id >= 0 });
  if (D.ripples.length > 24) D.ripples.shift();
  if (id < 0) return false;
  const q = Math.max(s, D.s || s);
  D.lastTapS = q;
  D.lastStrikeAt = q;
  const baseDmg = Math.max(1, Math.round(7 * cb.E.dmgMult * cb.RULES.csPct * (cb.E.strikeMult || 1)));
  const count = 1 + (cb.E.extraStrikes || 0);
  for (let k = 0; k < count; k++) {
    cb.addStrike({ at: q + k * 0.07, rat: id, dmg: baseDmg, n: D.n++, word: ['HA!', 'HUP!', 'HAH!', 'OI!'][D.n % 4] });
  }
  cb.setFocus(q, id);
  return true;
}

export function key(k, t) {
  if (!D || D.trans) return false;
  if (D.lvCard && (k === ' ' || k === 'Enter' || k === 'Escape' || k === 'q' || k === 'Q')) {
    return dismissLevelCard(t);
  }
  if ((k === 'q' || k === 'Q' || k === 'a' || k === 'A') && (cb.E?.level || 1) >= 2 && !customiser.isOpen() && !beat6.trainingOpen() && !beat8.gearOpen()) {
    return doActionSurge(t);
  }
  if (k === '2' && (cb.E?.potions || 0) > 0 && !customiser.isOpen() && !beat6.trainingOpen() && !beat8.gearOpen()) {
    const res = cb.drinkPotion(t);
    D.potionNote = { t, text: res.ok ? `HEALED +${res.amt} HP!` : res.reason === 'full' ? 'HP ALREADY FULL' : 'NO POTIONS' };
    return true;
  }
  if ((k === 'h' || k === 'H') && heroUnlocked()) {
    if (customiser.isOpen()) customiser.close(t);
    else customiser.open(t);
    return true;
  }
  if ((k === 'n' || k === 'N' || k === 'ArrowRight') && D.nextUnlocked && !customiser.isOpen() && !beat6.trainingOpen() && !beat8.gearOpen()) {
    const stg = cb.E?.stage || 1;
    if (stg < MAX_PLAYABLE_STAGE) return startTransition(t, stg + 1);
  }
  return false;
}

// ---------- Director step ----------
const liveFoes = () => D.foes.filter(f => f.dieAt === undefined);
const activeFoes = s => D.foes.filter(f => f.dieAt === undefined && s >= f.landT);

const S2_ORDER = ['gob', 'beetle', 'gob', 'beetle', 'gob', 'beetle', 'gob', 'gob', 'beetle', 'gob', 'beetle', 'gob'];

function spawnWave(s, stg) {
  const def = stageDef(stg);
  const rem = def.quota - D.spawned;
  if (rem <= 0) return;
  const isS3BarnRush = stg === 3 && D.spawned === 8;
  const n = stg === 3 ? Math.min(4, rem) : Math.min(3, rem);
  const slots = isS3BarnRush
    ? [cb.SLOT[0], cb.SLOT[1], cb.SLOT[1] + 24, cb.SLOT[1] + 48]
    : stg === 3
      ? [cb.SLOT[0], cb.SLOT[1], cb.SLOT[1] + 26, cb.SLOT[1] + 52]
      : [cb.SLOT[0], cb.SLOT[1], cb.SLOT[1] + 34];
  for (let i = 0; i < n; i++) {
    const kind = stg === 3
      ? (STAGE3_ORDER[D.spawned] || 'gob')
      : stg === 2 ? (S2_ORDER[D.spawned] || 'gob') : ((D.spawned + i) % 3 !== 1 ? 'gob' : 'rat');
    const depth = (i - 1.2) * 2;
    let f;
    if (kind === 'gob') {
      const fromBarn = stg === 3;
      const tel = fromBarn ? s + 0.08 + i * 0.16 : s + 0.15 + i * 0.65;
      const wallX = fromBarn ? BARN_DOOR_X + (i - 1.5) * 7 : 436 + i * 54;
      f = cb.addGoblin({
        tel,
        leap: tel + (fromBarn ? 0.24 : 0.48),
        wallX,
        landX: fromBarn ? BARN_DOOR_X - 24 - i * 16 : wallX - 8,
        fromBarn,
        depth,
        stage: stg,
        hp0: stg === 2 ? 7 : 7 + Math.floor((stg - 2) * 3),
        coins: stg === 2 ? 2 : stg === 3 ? 3 + Math.floor(D.rng() * 2) : 4 + Math.floor(D.rng() * 3),
        coinV: stg === 2 ? 1 : Math.max(1, stg - 1),
        turnip: stg === 2,
        holdCoins: true,
      });
    } else if (kind === 'beetle') {
      const burst = s + 0.14 + i * 0.48;
      const landX = 418 + i * 24;
      f = cb.addBeetle({
        burst,
        landX,
        depth,
        stage: stg,
        hp0: 9,
        coins: stg === 3 ? 4 : 4,
        coinV: stg === 3 ? 4 : 5,
        mat: 'Fire Beetle Gland',
        holdCoins: true,
      });
    } else {
      const burst = s + 0.12 + i * 0.46;
      const bSpot = stg === 3 ? BARREL_SPOTS_S3[i % BARREL_SPOTS_S3.length] : null;
      const landX = bSpot ? bSpot.x - 16 - i * 10 : 418 + i * 24;
      f = cb.addRat({
        burst,
        spawnX: bSpot ? bSpot.x : undefined,
        landX,
        depth,
        stage: stg,
        hp0: 6 + Math.floor((stg - 2) * 2),
        coins: 2 + Math.floor(D.rng() * 2),
        coinV: Math.max(1, stg - 1),
        holdCoins: true,
      });
    }
    f.slot = i;
    f.meleeAt = cb.moveRat(f, f.landT + 0.1, slots[i], { speed: kind === 'gob' ? (isS3BarnRush ? 205 : 185) : 165 });
    D.foes.push(f);
    D.spawned++;
  }
}

function startRound(t0, at) {
  D.round = { t0, full: at, at };
  cb.E.rounds.push(D.round);
}

function heroTurn(s) {
  const rd = D.round;
  if (!rd) return;
  if (!rd.sw && s >= rd.at - 0.62) {
    const live = activeFoes(s);
    if (!live.length) { D.round = null; return; }
    if (!live.some(r => r.meleeAt <= rd.at - 0.05)) {
      const eta = Math.min(...live.map(r => r.meleeAt));
      rd.at = isFinite(eta) ? Math.max(rd.at, eta + 0.25) : s + 0.5;
      return;
    }
    const roll = 1 + Math.floor(D.rng() * 20);
    const crit = roll >= (cb.E.critRange || 20);
    const dice = Array.from({ length: crit ? 4 : 2 }, () => 1 + Math.floor(D.rng() * 6));
    rd.sw = cb.addSwing({ at: rd.at, rat: -1, roll, dice, live: true });
  }
  const sw = rd.sw;
  if (!sw) return;
  if (sw.rat < 0 && !sw.void && s >= sw.at - 0.3) {
    sw.rat = cb.chooseTarget(s, sw.at);
    if (sw.rat < 0) cb.voidSwing(sw);
    else sw.lunge = clamp(cb.baseX(cb.E.rats[sw.rat], sw.at).x - cb.SLOT[0], 0, 30);
  }
  if (!sw.applied && s >= sw.at) {
    sw.applied = true;
    if (!sw.void) {
      let r = cb.E.rats[sw.rat];
      if (!r || r.dieAt !== undefined || r.archived) {
        const n = cb.chooseTarget(s, sw.at);
        if (n >= 0) { sw.rat = n; r = cb.E.rats[n]; }
        else cb.voidSwing(sw);
      }
      if (!sw.void && sw.hit && r) {
        cb.damageRat(r, sw.at, sw.dmg, { kind: 'swing', sw });
      }
    }
    const left = liveFoes().filter(r => isFinite(r.meleeAt));
    D.round = null;
    if (left.length) startRound(sw.at, sw.at + cb.RULES.round * (cb.E.roundMult || 1));
  }
}

function foeTurns(s) {
  const live = activeFoes(s);
  for (const f of live) {
    if (!(f.meleeAt <= s + 0.25) || f.slot > 1) continue;
    if (f.nextBite === undefined) f.nextBite = f.meleeAt + 0.75 + D.rng() * 0.45;
    if (s >= f.nextBite - 0.3) {
      const at = f.nextBite;
      cb.addBite({ at, rat: f.id, roll: 1 + Math.floor(D.rng() * 20), dmg: 1 + Math.floor(D.rng() * 4) });
      f.nextBite = at + (f.gob ? cb.RULES.gobRound : cb.RULES.ratRound) + D.rng() * 0.4 - 0.15;
    }
  }
  for (const target of [0, 1]) {
    if (live.some(f => f.slot === target)) continue;
    const next = live.filter(f => f.slot > target).sort((a, b) => a.slot - b.slot)[0];
    if (next) {
      next.slot = target;
      next.meleeAt = cb.moveRat(next, s + 0.1, cb.SLOT[target], { speed: 145 });
    }
  }
}

function regen(s) {
  if (cb.engagedFoes(s)) return;
  const maxHP = cb.heroMaxHP();
  if (cb.heroHP(s) >= maxHP || s < D.nextRegen) return;
  const mult = (cb.E.regenMult || 1) * (1 + (cb.heroBuild().bonuses.regenBonus || 0));
  cb.addHeal(s, Math.max(1, Math.round(mult)), 'regen');
  D.nextRegen = s + Math.max(1.2, 3.0 / Math.max(1, mult * 0.5 + 0.5));
}

function stepCoins(s) {
  for (const c of cb.E.coins) {
    if (c.archived || (c.stage || 1) < 2 || !c.hold || c.fly !== undefined || c.roll !== undefined) continue;
    if (cb.E.autoCollect) {
      if (s >= c.land + 0.22) cb.collectCoin(c, s);
      continue;
    }
    if (!c.armed && s >= c.land) {
      c.armed = true;
      c.expire = c.land + FUSE + c.j * 0.35;
    }
    if (c.armed && s >= c.expire) cb.loseCoin(c, s);
  }
}

function surgeSwings(s) {
  for (const w of cb.E.swings) {
    if (!w.surge || w.applied || s < w.at) continue;
    w.applied = true;
    if (w.void) continue;
    let r = cb.E.rats[w.rat];
    if (!r || r.dieAt !== undefined || r.archived) {
      const n = cb.chooseTarget(s, w.at);
      if (n >= 0) { w.rat = n; r = cb.E.rats[n]; }
      else {
        const alive = activeFoes(s);
        if (alive.length) {
          alive.sort((a, b) => cb.baseX(a, s).x - cb.baseX(b, s).x);
          w.rat = alive[0].id;
          r = alive[0];
        } else cb.voidSwing(w);
      }
    }
    if (!w.void && w.hit && r) cb.damageRat(r, w.at, w.dmg, { kind: 'swing', sw: w });
  }
}

function tick(s) {
  const stg = cb.E?.stage || 1;
  if (stg < 2 || D.trans) return;
  if (!D.waveStarted) {
    if (!customiser.isOpen() && D.beat10bDone) {
      D.waveStarted = true;
      D.nextWaveAt = s + 0.6;
    }
    return;
  }
  const def = stageDef(stg);
  const live = liveFoes();

  // Check for Level 2 milestone right at 300 XP (end of Stage 3 Wave 2!)
  if (!D.levelUpShown) {
    let xpNow = 0;
    for (const o of cb.E.orbs) if (s >= o.arrive) xpNow += o.xp;
    if (xpNow >= RULES_XP.lvl2XP) {
      D.levelUpShown = true;
      const prevMaxHP = cb.heroMaxHP();
      cb.setLevel(2, s, D.tNow);
      const newMaxHP = cb.heroMaxHP();
      setLevelUpFlash(D.tNow);
      cb.setSlowMo(0.04, D.tNow);
      D.lvCard = { t: D.tNow, s, dur: 15.0, prevMaxHP, newMaxHP };
      say('level2Up', s + 0.18);
      D.nextWaveAt = Math.max(D.nextWaveAt ?? 0, s + 0.8);
    }
  }
  if (D.lvCard && D.tNow - D.lvCard.t >= D.lvCard.dur) dismissLevelCard(D.tNow);

  // Track Short Rest completion so Action Surge visually chimes & pops a toast when recharged
  const stHud = cb.hudState(D.tNow);
  if (stHud.level >= 2) {
    if (!stHud.surgeReady) D.wasSurgeCd = true;
    else if (D.wasSurgeCd) {
      D.wasSurgeCd = false;
      setSurgeRestAt(D.tNow);
      cb.E.live.push({ s, k: 'chime' });
      D.surgeUnlockMsg = { t: D.tNow, text: 'SHORT REST . SURGE READY!' };
    }
  }

  if (D.spawned < def.quota && live.length === 0 && !D.lvCard && s >= (D.nextWaveAt ?? 0)) {
    spawnWave(s, stg);
    D.nextWaveAt = s + 1.15;
  }

  // Stage 3 Wave 3: 4 goblins rush out of Hedrun's barn -> trigger slow-mo & Action Surge prompt
  if (stg === 3 && D.spawned >= 12 && !D.surgeGuided && !D.surgeUsed && live.length >= 3) {
    const close = activeFoes(s).filter(f => cb.baseX(f, s).x <= cb.SLOT[1] + 56);
    if (close.length >= 2) {
      D.surgeGuided = true;
      setSurgeGuided(true);
      cb.setSlowMo(0.18, D.tNow);
      say('surgePrompt', s + 0.05);
    }
  }
  if (D.surgeRestLineAt !== null && s >= D.surgeRestLineAt && !busyLine(s)) {
    D.surgeRestLineAt = null;
    say('surgeShortRest', s);
  }

  const active = activeFoes(s);
  if (!D.round && active.length > 0) {
    const firstReady = Math.min(...active.map(f => f.meleeAt));
    startRound(s, Math.max(s + 0.7, firstReady + 0.2));
  }
  heroTurn(s);
  surgeSwings(s);
  foeTurns(s);
  regen(s);
  stepCoins(s);

  if (D.spawned >= def.quota && D.foes.length >= def.quota && D.stageClearFor !== stg) {
    const allPopped = D.foes.every(f => f.popAt !== undefined && s >= f.popAt + 0.25);
    if (allPopped) {
      D.stageClearFor = stg;
      D.stageClearAt = s;
      cb.addBonusXP(def.clearXP, 320, 82, s + 0.1, null);
      if (stg === 2 && !busyLine(s)) say('stage2Clear', s + 0.35);
      if (stg === 3) {
        cb.E.stage3ClearT = D.tNow;
        setHedrunStage3ClearAt(D.tNow);
        cb.grantPotions(3);
        D.hedrunGiftAt = s + 1.25;
        say('stage3Clear', s + 1.35);
      }
      if (stg < MAX_PLAYABLE_STAGE) {
        D.nextUnlocked = true;
        D.nextUnlockAt = s;
        setNextUnlocked(true);
        setNextPulse(true);
      } else {
        D.nextUnlocked = false;
        D.nextUnlockAt = null;
        setNextUnlocked(false);
        setNextPulse(false);
      }
      cb.E.live.push({ s: s + 0.15, k: 'chime' });
    }
  }
}

export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {
    const hard = D.beat10At !== null || (cb.E?.stage || 1) >= 2;
    D.Eref = cb.E;
    if (hard) reset(D.seed);
  }
  D.tNow = t;
  const s = cb.warp(t);
  const stg = cb.E?.stage || 1;

  // Transition animation clock runs on real time t
  if (D.trans) {
    const el = t - D.trans.startT;
    if (el >= D.trans.dur * 0.5 && !D.trans.swapped) finishTransitionSwap(t);
    if (el >= D.trans.dur) completeTransition(t);
    return;
  }

  // Stage 1 Beat 10: unlock NEXT ▶ after Beat 9 finishes
  if (stg === 1 && D.beat10At === null) {
    if (!beat9.finished(t) || busyLine(s)) return;
    D.beat10At = s;
    D.nextUnlocked = true;
    D.nextUnlockAt = s;
    setNextUnlocked(true);
    setNextPulse(true);
    cb.E.live.push({ s, k: 'chime' });
    say('line16', s + 0.14);
    return;
  }

  if (stg === 1 && D.nextUnlocked) {
    if (!D.nudged && s >= D.beat10At + NUDGE.line && !busyLine(s)) {
      D.nudged = true;
      say('nextNudge', s);
    }
    if (s >= D.beat10At + NUDGE.pulse && s >= D.chimeAt) {
      cb.E.live.push({ s, k: 'chime' });
      D.chimeAt = s + 2.5;
    }
    return;
  }

  // Stage 2+ wave combat simulation
  if (stg >= 2) {
    if (D.s === null || s < D.s - 0.5) D.s = s;
    if (s - D.s > 2.0) D.s = s - DT;
    while (D.s + DT <= s) { D.s += DT; tick(D.s); }
    const og = off(1, F.ground);
    const modOpen = customiser.isOpen() || beat6.trainingOpen() || beat8.gearOpen();
    setSurgeHover(!modOpen && !D.lvCard && (cb.E?.level || 1) >= 2 && !!hoverPt && inSurgeBtn(hoverPt[0], hoverPt[1]));
    cb.UI.hover = !modOpen && !D.lvCard && hoverPt
      ? cb.ratAtPoint(hoverPt[0], hoverPt[1], s, og, r => (r.stage || 1) === stg)
      : -1;
  }
}

// ---------- Overlays & Spotlights ----------
export function drawSpot(ctx, p, t) {
  if (!D || D.trans) return;
  if (D.surgeGuided) {
    ctx.globalAlpha = 0.48;
    ctx.drawImage(SPOT10, Math.round(SURGE_BTN.x + SURGE_BTN.w / 2 - 640), Math.round(SURGE_BTN.y + SURGE_BTN.h / 2 - 360));
    ctx.globalAlpha = 1;
    return;
  }
  if (!D.nextUnlocked || (cb.E?.stage || 1) >= 2) return;
  if (customiser.isOpen() || beat6.trainingOpen() || beat8.gearOpen()) return;
  const s = cb.warp(t);
  const k = easeOut(clamp((s - (D.nextUnlockAt || s)) / 0.5));
  if (k <= 0) return;
  ctx.globalAlpha = 0.56 * k;
  ctx.drawImage(SPOT10, Math.round(628 - 640), Math.round(172 - 360));
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D) return;
  const s = cb.warp(t);

  // Tap ripples in Stage 2+
  for (const r of D.ripples) {
    const age = t - r.t;
    if (age < 0 || age > 0.35) continue;
    const k = age / 0.35, rad = 2 + easeOut(k) * (r.hit ? 10 : 6);
    ctx.globalAlpha = (1 - k) * (r.hit ? 0.85 : 0.45);
    ctx.fillStyle = r.hit ? '#ffd84a' : '#d8d4e0';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.fillRect(Math.round(r.gx + Math.cos(a) * rad), Math.round(r.gy + Math.sin(a) * rad * 0.65), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Beat 10 / Next stage objective banner + 6s gauntlet nudge
  const clearing = D.stageClearAt !== null && s - D.stageClearAt < 2.85;
  if (D.nextUnlocked && !D.trans && (cb.E?.stage || 1) < MAX_PLAYABLE_STAGE && !customiser.isOpen() && !beat6.trainingOpen() && !beat8.gearOpen()) {
    const stg = cb.E?.stage || 1;
    const at = D.stageClearAt !== null ? D.stageClearAt + 2.85 : (D.nextUnlockAt || s);
    if (!clearing && s >= at + 0.35) {
      const label = `ADVANCE TO STAGE ${stg + 1}`;
      const w = numWidth(label) + 23, h = 17;
      const k = easeOutBack(clamp((s - at - 0.35) / 0.3));
      const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8);
      ctx.globalAlpha = clamp(k);
      ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
      ctx.fillStyle = '#5a3414'; ctx.fillRect(X, Y, w, h);
      ctx.fillStyle = '#7a4820'; ctx.fillRect(X, Y, w, 1);
      ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
      const ax = X + 6, ay = Y + 5;
      ctx.fillStyle = '#140b0c';
      ctx.fillRect(ax - 1, ay - 1, 3, 9);
      ctx.fillRect(ax + 2, ay, 2, 7);
      ctx.fillRect(ax + 4, ay + 1, 2, 5);
      ctx.fillRect(ax + 6, ay + 2, 2, 3);
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(ax, ay, 1, 7);
      ctx.fillStyle = '#ffd25a';
      ctx.fillRect(ax + 1, ay, 1, 7);
      ctx.fillRect(ax + 2, ay + 1, 2, 5);
      ctx.fillRect(ax + 4, ay + 2, 2, 3);
      ctx.fillRect(ax + 6, ay + 3, 1, 1);
      num(ctx, label, X + 16, Y + 5, ['#ffe7a0', '#ffffff'], 'l');
      ctx.globalAlpha = 1;
    }
    if (stg === 1 && s >= (D.nextUnlockAt || s) + NUDGE.pointer && GAUNT) {
      const k = easeOut(clamp((s - (D.nextUnlockAt || s) - NUDGE.pointer) / 0.4));
      const ph = (s % 1.1) / 1.1, press = ph > 0.55 && ph < 0.72;
      const gx = 618 - (press ? 0 : Math.round(Math.sin(ph * Math.PI * 2) * 2));
      const gy = 172 + (press ? 2 : 0);
      ctx.globalAlpha = k;
      ctx.drawImage(press ? GAUNT_P : GAUNT, gx - GAUNTLET_TIP[0], gy - GAUNTLET_TIP[1]);
      ctx.globalAlpha = 1;
    }
  }

  // Action Surge slow-mo spotlight gauntlet pointer
  if (D.surgeGuided && GAUNT && !D.trans) {
    const ph = ((t * 1.4) % 1), press = ph > 0.52 && ph < 0.72;
    const gx = SURGE_BTN.x + SURGE_BTN.w + 7 - (press ? 2 : Math.round(Math.sin(ph * Math.PI * 2) * 2));
    const gy = SURGE_BTN.y + 7 + (press ? 1 : 0);
    ctx.drawImage(press ? GAUNT_P : GAUNT, gx - GAUNTLET_TIP[0], gy - GAUNTLET_TIP[1]);
  }

  // Level 2 Celebration Showcase Card (unobstructed below Elminster's dialogue box, pauses waves cleanly)
  if (D.lvCard && !D.trans) {
    const age = Math.max(0, t - D.lvCard.t);
    const inK = easeOutBack(clamp(age / 0.36));
    const cw = 324, ch = 144;
    const cx = 320, cy = Math.max(216, Math.round(boxBottom() + ch / 2 + 8));
    const sw = Math.max(12, Math.round(cw * (0.25 + 0.75 * clamp(inK))));
    const sh = Math.max(12, Math.round(ch * (0.55 + 0.45 * clamp(inK))));
    const X = Math.round(cx - sw / 2), Y = Math.round(cy - sh / 2);

    // Subtle atmospheric scrim + warm sunburst behind the showcase
    ctx.save();
    ctx.globalAlpha = clamp(age / 0.28) * 0.44;
    ctx.fillStyle = '#0c0814';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(age / 0.35) * 0.14;
    const sunG = ctx.createRadialGradient(cx, cy, 8, cx, cy, 170);
    sunG.addColorStop(0, '#ffe48a');
    sunG.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(cx - 170, cy - 170, 340, 340);
    ctx.restore();

    // Carved oak & parchment Level-Up panel
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,14,0.42)';
    ctx.fillRect(X + 2, Y + 3, sw, sh);
    ctx.fillStyle = '#140b0c';
    ctx.fillRect(X - 2, Y - 2, sw + 4, sh + 4);
    ctx.fillStyle = '#6c421a';
    ctx.fillRect(X - 1, Y - 1, sw + 2, sh + 2);
    ctx.fillStyle = '#d8a642';
    ctx.fillRect(X, Y, sw, sh);
    ctx.fillStyle = '#f6d888';
    ctx.fillRect(X, Y, sw, 1);
    ctx.fillStyle = '#8a5f1e';
    ctx.fillRect(X, Y + sh - 1, sw, 1);
    // Brass corner rivets
    for (const [rx, ry] of [[X + 2, Y + 2], [X + sw - 4, Y + 2], [X + 2, Y + sh - 4], [X + sw - 4, Y + sh - 4]]) {
      ctx.fillStyle = '#3e2a0c'; ctx.fillRect(rx, ry, 2, 2);
      ctx.fillStyle = '#fff1b8'; ctx.fillRect(rx, ry, 1, 1);
    }
    // Warm parchment interior
    ctx.fillStyle = '#f2e2bd';
    ctx.fillRect(X + 3, Y + 3, Math.max(2, sw - 6), Math.max(2, sh - 6));
    ctx.fillStyle = '#e5cf9e';
    ctx.fillRect(X + 3, Y + 3, Math.max(2, sw - 6), 2);
    ctx.fillRect(X + 3, Y + sh - 5, Math.max(2, sw - 6), 2);

    if (age > 0.16) {
      const txA = clamp((age - 0.16) / 0.22);
      ctx.globalAlpha = txA;
      uctx.save();
      uctx.globalAlpha = txA;

      // Crimson & gold header banner
      const hx = X + 14, hw = sw - 28, hy = Y + 7, hh = 17;
      ctx.fillStyle = '#140b0c'; ctx.fillRect(hx - 1, hy - 1, hw + 2, hh + 2);
      ctx.fillStyle = '#7e2618'; ctx.fillRect(hx, hy, hw, hh);
      ctx.fillStyle = '#a83820'; ctx.fillRect(hx, hy, hw, 5);
      ctx.fillStyle = '#e2b75a'; ctx.fillRect(hx, hy, hw, 1);
      ctx.fillStyle = '#5c3e12'; ctx.fillRect(hx, hy + hh - 1, hw, 1);
      const tHead = lvTx('LEVEL 2 REACHED!  ·  FIGHTER', 16, '#fff4cc', { bold: true, sh: '#2e0c0a', spacing: 1 });
      putLvText(uctx, tHead, cx, hy + 8.5, 'c', 'm');

      // Row 1: ACTION SURGE [Q] medallion + copy (native 16px Pixelify grid)
      const r1y = Y + 30;
      ctx.fillStyle = '#140b0c'; ctx.fillRect(X + 12, r1y, 20, 20);
      ctx.fillStyle = '#8b2618'; ctx.fillRect(X + 13, r1y + 1, 18, 18);
      ctx.fillStyle = '#e2b75a'; ctx.fillRect(X + 13, r1y + 1, 18, 1);
      for (let k = 0; k < 10; k++) {
        ctx.fillStyle = '#fff4c4';
        ctx.fillRect(X + 17 + k, r1y + 5 + k, 2, 1);
        ctx.fillRect(X + 26 - k, r1y + 5 + k, 2, 1);
      }
      ctx.fillStyle = '#ffcf48';
      ctx.fillRect(X + 21, r1y + 3, 2, 4);
      ctx.fillRect(X + 20, r1y + 14, 4, 2);

      const tAS = lvTx('ACTION SURGE [Q]', 16, '#8c2214', { bold: true });
      const tASDesc = lvTx('Once per Short Rest, take an extra turn (2 swings).', 16, '#3b2418');
      putLvText(uctx, tAS, X + 38, r1y, 'l', 't');
      putLvText(uctx, tASDesc, X + 38, r1y + 11, 'l', 't');

      // Divider
      ctx.fillStyle = '#cba571'; ctx.fillRect(X + 12, Y + 56, sw - 24, 1);

      // Row 2: TACTICAL MIND medallion + copy
      const r2y = Y + 61;
      ctx.fillStyle = '#140b0c'; ctx.fillRect(X + 12, r2y, 20, 20);
      ctx.fillStyle = '#244a5e'; ctx.fillRect(X + 13, r2y + 1, 18, 18);
      ctx.fillStyle = '#7ec8ff'; ctx.fillRect(X + 13, r2y + 1, 18, 1);
      ctx.fillStyle = '#e8f8ff';
      ctx.fillRect(X + 18, r2y + 5, 8, 8);
      ctx.fillRect(X + 19, r2y + 13, 6, 2);
      ctx.fillRect(X + 21, r2y + 15, 2, 2);
      ctx.fillStyle = '#3870a0';
      ctx.fillRect(X + 21, r2y + 7, 2, 6);
      ctx.fillRect(X + 19, r2y + 9, 6, 2);

      const tTM = lvTx('TACTICAL MIND', 16, '#1e465c', { bold: true });
      const tTMDesc = lvTx('Second Wind boosts failed skill checks (+1d10).', 16, '#3b2418');
      putLvText(uctx, tTM, X + 38, r2y, 'l', 't');
      putLvText(uctx, tTMDesc, X + 38, r2y + 11, 'l', 't');

      // Stat boost strip: MAX HP 13 -> 21 (+8)  &  SHORT REST 90s
      const sy = Y + 89;
      ctx.fillStyle = '#140b0c'; ctx.fillRect(X + 12, sy, sw - 24, 17);
      ctx.fillStyle = '#2e1a0f'; ctx.fillRect(X + 13, sy + 1, sw - 26, 15);
      ctx.fillStyle = '#56361d'; ctx.fillRect(X + 13, sy + 1, sw - 26, 1);
      const prevHP = D.lvCard.prevMaxHP ?? 13;
      const nextHP = D.lvCard.newMaxHP ?? 21;
      const tHP = lvTx(`MAX HP  ${prevHP} -> ${nextHP} (+${Math.max(1, nextHP - prevHP)})`, 16, '#8cf068', { bold: true, sh: '#10240e' });
      const tRest = lvTx('SHORT REST  90s', 16, '#ffe7a0', { bold: true, sh: '#24140a' });
      putLvText(uctx, tHP, X + 20, sy + 8.5, 'l', 'm');
      putLvText(uctx, tRest, X + sw - 20, sy + 8.5, 'r', 'm');

      // Interactive CTA button: CLAIM POWER [SPACE]
      const bw = 166, bh = 20, bx = Math.round(cx - bw / 2), by = Y + sh - 27;
      D.lvBtnRect = { x: bx, y: by, w: bw, h: bh };
      const hovered = !!(hoverPt && hoverPt[0] >= bx && hoverPt[0] < bx + bw && hoverPt[1] >= by && hoverPt[1] < by + bh);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
      ctx.fillStyle = '#140b0c'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = hovered ? '#46a430' : '#358224';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = hovered ? '#9ef87a' : (pulse > 0.5 ? '#84e462' : '#68c848');
      ctx.fillRect(bx, by, bw, 2);
      ctx.fillStyle = '#1f5216';
      ctx.fillRect(bx, by + bh - 2, bw, 2);
      ctx.fillStyle = '#f6d888';
      ctx.fillRect(bx + 2, by + 2, 2, 2); ctx.fillRect(bx + bw - 4, by + 2, 2, 2);
      ctx.fillRect(bx + 2, by + bh - 4, 2, 2); ctx.fillRect(bx + bw - 4, by + bh - 4, 2, 2);
      const tBtn = lvTx('CLAIM POWER  [SPACE]', 16, '#fffce6', { bold: true, sh: '#163810', spacing: 1 });
      putLvText(uctx, tBtn, cx, by + bh / 2, 'c', 'm');

      // Sparkle glints around corners
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.4 + i * 0.27) % 1;
        if (ph > 0.45) continue;
        const sx = i % 2 === 0 ? X + 6 : X + sw - 7;
        const sy2 = i < 2 ? Y + 6 : Y + sh - 7;
        ctx.fillStyle = '#fff8dc';
        ctx.fillRect(sx - 1, sy2, 3, 1);
        ctx.fillRect(sx, sy2 - 1, 1, 3);
      }

      uctx.restore();
    }
    ctx.restore();
  } else {
    D.lvBtnRect = null;
  }

  // Post-claim Action Surge handoff toast pointing toward top-left Hero Plate [Q] button
  if (D.surgeUnlockMsg && t - D.surgeUnlockMsg.t < 2.8) {
    const dt = Math.max(0, t - D.surgeUnlockMsg.t);
    const a = dt < 0.2 ? dt / 0.2 : dt > 2.2 ? 1 - (dt - 2.2) / 0.6 : 1;
    const ax = SURGE_BTN.x + SURGE_BTN.w + 4 + Math.round(Math.sin(t * 7.5) * 1.5);
    const ay = Math.round(SURGE_BTN.y + 4 - Math.min(4, dt * 3));
    ctx.save();
    ctx.globalAlpha = clamp(a);
    // Crisp left-pointing pixel arrow toward SURGE_BTN
    ctx.fillStyle = '#14280e';
    ctx.fillRect(ax - 1, ay + 2, 10, 5);
    ctx.fillRect(ax + 1, ay, 3, 9);
    ctx.fillStyle = '#8cf068';
    ctx.fillRect(ax, ay + 3, 8, 3);
    ctx.fillRect(ax + 2, ay + 1, 1, 7);
    ctx.fillRect(ax + 1, ay + 2, 1, 5);
    ctx.fillStyle = '#fff8d0';
    ctx.fillRect(ax, ay + 4, 8, 1);
    num(ctx, D.surgeUnlockMsg.text, ax + 12, ay + 1, ['#8cf068', '#fff8d0'], 'l', { outline: '#14280e' });
    ctx.restore();
  }

  // Stage 2+ clear celebration + Hedrun's 3 Healing Potions gift quote
  if (D.stageClearAt !== null && !D.trans) {
    const age = s - D.stageClearAt;
    if (age >= 0 && age <= 2.8) {
      const inK = easeOutBack(clamp(age / 0.34));
      const outK = age > 2.25 ? easeOut((age - 2.25) / 0.55) : 0;
      const alpha = clamp(inK) * (1 - outK);
      if (alpha > 0.02) {
        const def = stageDef(D.stageClearFor);
        const title = 'STAGE CLEAR!';
        const sub = `+${def.clearXP} XP BONUS`;
        const w = Math.max(numWidth(title, 2) + 16, numWidth(sub) + 16);
        const x = Math.round(320 - w / 2), y = Math.round(Math.max(118, boxBottom() + 6) - (1 - inK) * 10 - outK * 8);
        ctx.save();
        ctx.globalAlpha = alpha;
        num(ctx, title, 320, y, ['#ffd24a', '#fff8d0', '#b86818'], 'c', { scale: 2, outline: '#180a06' });
        num(ctx, sub, 320, y + 17, ['#7ec8ff', '#e8f8ff', '#3a84d8'], 'c', { outline: '#0c1428' });
        for (let i = 0; i < 6; i++) {
          const ph = ((age * 2.2 + i * 0.31) % 1);
          if (ph > 0.5) continue;
          const sx = x + ((i * 37) % Math.max(8, w));
          const sy = y + (i % 2 ? -5 : 27);
          ctx.fillStyle = '#fff4c8';
          ctx.fillRect(sx, sy, 1, 1);
          ctx.fillRect(sx - 1, sy, 3, 1);
          ctx.fillRect(sx, sy - 1, 1, 3);
        }
        ctx.restore();
      }
    }
    if (D.stageClearFor === 3 && D.hedrunGiftAt !== null && s >= D.hedrunGiftAt) {
      const gage = s - D.hedrunGiftAt;
      if (gage >= 0 && gage < 6.5) {
        const alpha = gage < 0.35 ? gage / 0.35 : gage > 5.8 ? 1 - (gage - 5.8) / 0.7 : 1;
        const bx = 320, by = 148;
        const bw = 276, bh = 32;
        ctx.save();
        ctx.globalAlpha = clamp(alpha);
        ctx.fillStyle = '#140b0c'; ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#4e2c14'; ctx.fillRect(bx - bw / 2, by, bw, bh);
        ctx.fillStyle = '#e8b85a'; ctx.fillRect(bx - bw / 2 + 1, by + 1, bw - 2, 1);
        ctx.fillStyle = '#e8b85a'; ctx.fillRect(bx - bw / 2 + 1, by + bh - 2, bw - 2, 1);
        num(ctx, '+3 POTIONS OF HEALING GIFTED!', bx, by + 5, ['#ff9a9a', '#ffffff'], 'c', { outline: '#3a0c14' });
        num(ctx, '"BLESS YOU, STRANGER! DRINK THESE IF SOMETHING BITES BACK."', bx, by + 18, ['#f8e8c8', '#ffffff'], 'c', { outline: '#1a0c08' });
        ctx.restore();
      }
    }
  }

  if (D.potionNote && t - D.potionNote.t < 1.35) {
    const a = 1 - Math.max(0, t - D.potionNote.t) / 1.35;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    num(ctx, D.potionNote.text, 526, Math.round(300 - (t - D.potionNote.t) * 14), ['#8cf068', '#ffffff'], 'c', { outline: '#14280e' });
    ctx.restore();
  }

  // 1.5s pixel transition curtain wipe (0..0.75s close, 0.75..1.5s open)
  if (D.trans) {
    const el = clamp((t - D.trans.startT) / D.trans.dur);
    let x0 = 0, x1 = 0;
    if (el < 0.5) {
      const k = easeInOut(el / 0.5);
      x0 = 0;
      x1 = Math.round(W * k);
    } else {
      const k = easeInOut((el - 0.5) / 0.5);
      x0 = Math.round(W * k);
      x1 = W;
    }
    if (x1 > x0) {
      const drawWipe = (c2, sc) => {
        c2.fillStyle = '#0c0816';
        c2.fillRect(x0 * sc, 0, (x1 - x0) * sc, H * sc);
        const edgeX = el < 0.5 ? x1 : x0;
        if (edgeX > 2 && edgeX < W - 2) {
          c2.fillStyle = '#d9a948';
          c2.fillRect((edgeX - 2) * sc, 0, 2 * sc, H * sc);
        }
      };
      drawWipe(ctx, 1);
      drawWipe(uctx, S);
    }
  }
}
