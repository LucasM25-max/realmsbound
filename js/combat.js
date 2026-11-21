// ─────────────────────────────────────────────────────────────
//  Stage 1 combat: the battle engine and everything drawn for it.
//
//  The fight is kept as a timeline of events: rats (with their
//  movement), the hero's swings, rat bites, Command Strikes, heals,
//  focus changes, coins and XP. Every frame is drawn from that
//  timeline at the current time, so freeze-frames and replays work.
//
//  • Beat 1 is a fixed script (loadBeat1): its rolls are decided in
//    advance, so it always plays the same way.
//  • Beat 2 is live: js/beat2.js adds events as the fight unfolds,
//    always far enough ahead that wind-ups and the die can show.
//
//  Rules (D&D 2024 Basic Rules): the hero swings once per 2.4 s round,
//  rolling d20 + 5 against the rat's AC 12. A hit does 2d6 + 3 (a
//  natural 20 rolls the dice twice). The rats bite at d20 + 4 against
//  the hero's AC 16, doing 1d4. A Command Strike adds 10% of a weapon
//  hit. Mystra's ward stops the hero dropping below 1 HP in Stage 1.
// ─────────────────────────────────────────────────────────────
import { T, W } from './timeline.js';
import { F, off, PATH_Y, BURROW } from './world.js';
import { buildRat, RAT_FEET, RAT_CX } from './art/rat.js';
import { buildGoblin, GOB_FEET, GOB_CX } from './art/goblin.js';
import { HERO_CX, HERO_FEET, HERO_SHOULDER } from './art/hero.js';
import { silhouette, castShadow } from './fx.js';
import { hash, clamp, inv, lerp, easeOut, easeIn, easeOutBack, pxEllipse, makeCanvas, bayer } from './util.js';
import { C, P, Raster, ramp } from './pix.js';
import { num, numWidth } from './pixfont.js';

// ---------- rules ----------
export const RULES = {
  heroHP: 12, heroAC: 16, toHit: 5 /* PB 2 + STR 3 */, dmgBonus: 3, round: 6,
  ratHP: 7, ratAC: 12, ratToHit: 4, ratXP: 8, gobXP: 12, snikXP: 26, lvl2XP: 300, ratRound: 4.25, csPct: 0.10,
  gobRound: 4.75, bossCadence: 5,                              // goblins swing a touch slower than rats
};
export const HS = 0.07, CU = 0.16;    // hit-stop hold (about 2 frames at 30 fps), then a short catch-up
export const LEAP = 0.42;             // a rat's leap out of the burrow
export const GOB_LEAP = 0.55;         // a goblin's vault over the dry-stone wall
export const WALL_TOP = 274;          // coping of the dry-stone wall (art/meadow.js), native y

// ---------- where things stand ----------
export const CB = {
  rustles: [20.95, 21.4, 21.75, ...T.b2rustles],
  eyes: [21.75, T.b2rustles[T.b2rustles.length - 1]],      // rustles where two red eyes glint in the hole
  spot: [23.15, 25.15],
  walk: [23.45, 23.85], x0: T.heroStopX, x1: T.heroStopX + 22,
  draw: 24.3,
};
export const HERO_FIGHT_CX = CB.x1 + HERO_CX;                    // the hero's centre while fighting
export const SLOT = [HERO_FIGHT_CX + 44, HERO_FIGHT_CX + 72];     // melee spots: front, and one behind it
const PURSE_AT = [595, 14];                                      // centre of the purse's copper icon (hud.js)
const XP_BAR = { x: 49, y: 33, w: 90 };                          // hud.js PLATE + HPX, XP well
export const ratGroundY = (x, og, depth = 0) => PATH_Y(Math.round(x)) + 3 + og + depth;

// ---------- the event store ----------
export let E = null;
function fresh() {
  return { rats: [], swings: [], bites: [], strikes: [], heals: [], focus: [], hits: [], rounds: [], coins: [], orbs: [],
    kills: 0, cues: [], live: [], liveOn: false, streak: 0, lastArrive: -9, spent: 0, dmgMult: 1, hpMult: 1, dmgReduce: 0,
    roundMult: 1, extraStrikes: 0, strikeMult: 1, critBonus: 0, critRange: 20, goldFind: 1, autoCollect: false,
    regenMult: 1, potionMult: 1, potionCapBonus: 0, training: {},
    inv: [], gear: { helm: null, armor: null, cloak: null, weapon: null, shield: null, boots: null, ring1: null, ring2: null, amulet: null, trinket: null }, hpBonus: 0, level: 1, stage: 1 };
}
// sound cues: Beat 1's are fixed (handed to the audio engine up front); Beat 2's are streamed as they're decided
function cue(s, k, o = {}) { const c = { s, k, ...o }; (E.liveOn ? E.live : E.cues).push(c); return c; }
export function combatCues() { return E.cues.map(c => ({ ...c, t: unwarp(c.s) })); }
export function takeLiveCues() { const out = E.live.splice(0).map(c => Object.assign(c, { t: unwarp(c.s) })); return out; }

// shared, per-frame UI state set by beat2.js (what the mouse is over, the tutorial's gold pulse)
export const UI = { hover: -1, pulse: -1, pulseK: 0 };

// ---------- hit-stop as a time warp ----------
// the fight holds still for HS seconds after each hit, then catches up (outside those windows s === t)
export function warp(t) {
  for (const h of E.hits) {
    const d = t - h; if (d < 0) break;
    if (d < HS) return h;
    if (d < HS + CU) return h + (d - HS) * (HS + CU) / CU;
  }
  return t;
}
export function unwarp(s) {
  for (const h of E.hits) { const d = s - h; if (d > 0 && d < HS + CU) return h + HS + d * CU / (HS + CU); }
  return s;
}

// ---------- rats ----------
export function addRat(o) {
  const r = { id: E.rats.length, depth: 0, coins: 1, segs: [], dmg: [], hp0: RULES.ratHP, meleeAt: Infinity, slot: -1, ...o };
  r.landT = r.burst + LEAP;
  E.rats.push(r);
  cue(r.burst, 'burst', { pan: 0.45 }); cue(r.burst + 0.12, 'squeak', { pan: 0.45 }); cue(r.landT, 'land', { pan: 0.4 });
  return r;
}
// ---------- goblins (Beat 5): over the dry-stone wall, one at a time ----------
// tel: the hedge rustles and a helm peeks over the coping; leap: the vault itself
export function addGoblin(o) {
  const g = { id: E.rats.length, gob: true, depth: 0, coins: 5, segs: [], dmg: [], hp0: RULES.ratHP, meleeAt: Infinity, slot: -1, ...o };
  g.landT = g.leap + GOB_LEAP;
  E.rats.push(g);
  cue(g.tel, 'hedge', { pan: 0.3 });
  cue(g.leap - 0.03, 'gob', { i: g.id });                              // a yammering war-cry as he launches
  cue(g.landT, 'land', { pan: 0.4 });
  cue(g.landT + 0.09, 'clang', { v: 0.35, pan: 0.35 });                // the helm rattles down over his ears
  return g;
}
export const goblins = () => E.rats.filter(r => r.gob);
// any foe (rat or goblin) currently in the hero's face — gates the out-of-combat regen
export function engagedFoes(s) { return E.rats.some(r => r.dieAt === undefined && r.meleeAt <= s + 0.5 && s >= r.landT); }
// where a rat's body is at time s (before hit reactions and lunges)
export function baseX(r, s) {
  let x = r.landX;
  for (const g of r.segs) {
    if (s < g.t0) break;
    if (s < g.t1) { const k = (s - g.t0) / (g.t1 - g.t0); return { x: lerp(g.x0, g.x1, g.kind === 'dash' ? easeOut(k) : k), moving: true, kind: g.kind }; }
    x = g.x1;
  }
  return { x, moving: false };
}
// plan a move from time t0 (replaces anything planned after it); returns the arrival time
export function moveRat(r, t0, x1, { speed = 150, dur, kind = 'run' } = {}) {
  const x0 = baseX(r, t0).x;
  r.segs = r.segs.filter(g => g.t0 < t0);
  for (const g of r.segs) if (g.t1 > t0) { g.x1 = x0; g.t1 = t0; }
  const d = dur ?? Math.max(0.08, Math.abs(x1 - x0) / speed);
  r.segs.push({ t0, t1: t0 + d, x0, x1, kind });
  return t0 + d;
}
export const ratHP = (r, s) => { let hp = r.hp0; for (const d of r.dmg) if (d.at <= s) hp -= d.amt; return hp; };
export const ratAlive = (r, s) => s >= r.landT && !(r.dieAt <= s);

export function damageRat(r, at, amt, src) {
  if (r.dieAt !== undefined) return false;
  r.dmg.push({ at, amt, src });
  if (ratHP(r, at) <= 0) { killRat(r, at, src); return true; }
  return false;
}
function killRat(r, at, src) {
  r.dieAt = at; r.killer = src;
  r.deathX = baseX(r, at).x;
  const launch = !!src.launch;                               // the scripted natural 20 punts him into the sky
  if (launch) r.launched = true;
  r.popAt = launch ? at + HS + 0.9 : at + (src.kind === 'swing' ? HS : 0) + 0.14;   // a launched goblin "pops" when he becomes the star
  r.killIdx = E.kills++;
  for (const b of E.bites) if (b.rat === r.id && b.at > at) b.void = true;   // a dead rat bites no one
  retarget(r, at);
  // loot: copper arcs out. Beat 1's coins fly to the purse on their own; a rat flagged
  // holdCoins drops coins that rest on the ground for the player to tap (Beat 3).
  const cspawn = launch ? at + HS + 0.06 : r.popAt;          // a launched goblin's purse spills as he lifts off
  const coinVal = Math.max(1, Math.round((r.coinV || 1) * (E.goldFind || 1)));
  for (let j = 0; j < r.coins; j++) {
    const spread = (j - (r.coins - 1) / 2) * 10 + (hash(j, r.id * 7 + 3) - 0.5) * 4;
    const arc = 0.36 + j * 0.05;
    const c = { rat: r.id, j, ox: r.deathX + 8, depth: r.depth, spread, h: 20 + hash(j, r.id + 11) * 10, spawn: cspawn, land: cspawn + arc, gob: !!r.gob, v: coinVal };
    if (r.holdCoins) { c.hold = true; c.expire = Infinity; }                // beat3 arms the 5 s countdown once the fight is over
    else {
      c.fly = r.popAt + 0.72 + j * 0.13; c.arrive = c.fly + 0.58;
      E.streak = c.arrive - E.lastArrive < 1.5 ? E.streak + 1 : 0; c.pitch = E.streak; E.lastArrive = c.arrive;
      cue(c.arrive, 'clink', { i: c.pitch });
    }
    E.coins.push(c);
    cue(c.land, 'tink', { i: j });
  }
  // the XP mote — for a launched goblin it spills out of the ding-star itself
  const xp = r.snik ? RULES.snikXP : r.gob ? RULES.gobXP : RULES.ratXP;
  r.xp = xp;
  const prevXP = E.orbs.reduce((acc, q) => acc + q.xp, 0);
  const o = launch
    ? { rat: r.id, from: r.popAt + 0.04, arrive: r.popAt + 0.66, idx: r.killIdx, x: r.deathX + 300, y: 70, depth: r.depth, xp, cumXP: prevXP + xp }
    : { rat: r.id, from: r.popAt + 0.12, arrive: r.popAt + 0.72, idx: r.killIdx, x: r.deathX + 6, depth: r.depth, xp, cumXP: prevXP + xp };
  E.orbs.push(o);
  if (r.gob) {
    // the helm outlives him: it spins off, clatters, and lies in the grass a while
    // (Snikkit's "helm" is Mistress Jhaele's pie tin — Beat 7 loots it properly)
    if (!r.snik) {
      const hat = at + (launch ? HS : 0) + (launch ? 0.02 : 0.14);
      r.helm = { at: hat, x0: r.deathX + 2, x1: r.deathX + 10 + Math.floor(hash(r.id, 55) * 14), y0: launch ? 34 : 24, hop: launch ? 7 : 15 };
      cue(hat + 0.5, 'clang', { v: 0.9, pan: 0.3 }); cue(hat + 0.5 + 0.24, 'clang', { v: 0.4, pan: 0.32 });
    }
    cue(at + 0.04, launch ? 'cry' : 'gobDie', { pan: 0.3 });
    if (launch) { cue(at + HS + 0.02, 'launch'); cue(r.popAt, 'ding'); }
    if (!launch) cue(r.popAt, 'pop');
    cue(o.arrive, 'xp');
  } else {
    cue(at + 0.04, 'death', { pan: 0.3 }); cue(r.popAt, 'pop'); cue(o.arrive, 'xp');
  }
}

// ---------- the hero's swings ----------
export function addSwing(w) {
  w.total = w.roll + RULES.toHit;
  w.crit = w.roll >= (E.critRange || 20); w.fumble = w.roll === 1;
  w.hit = !w.fumble && (w.crit || w.total >= RULES.ratAC);
  const critMult = w.crit ? (1 + (E.critBonus || 0)) : 1;
  w.dmg = w.hit ? Math.max(1, Math.round((w.dice.reduce((a, b) => a + b, 0) + RULES.dmgBonus) * E.dmgMult * critMult)) : 0;
  w.linger = w.linger ?? (w.hit ? 0.95 : 1.05);
  E.swings.push(w);
  if (w.hit) { E.hits.push(w.at); E.hits.sort((a, b) => a - b); }
  cue(w.at - 0.6, 'dice'); cue(w.at - 0.2, 'diceLand', { hit: w.hit, crit: w.crit }); cue(w.at - 0.08, 'swing');
  w.impactCue = w.hit ? cue(w.at, w.crit ? 'crit' : 'hit') : cue(w.at + 0.02, w.fumble ? 'fumble' : 'whiff');
  return w;
}
// who the hero should hit: the focus target if it's in reach, otherwise the nearest rat in reach
export function chooseTarget(now, at) {
  const ok = r => r.dieAt === undefined && r.meleeAt <= at + 0.02 && now >= r.landT;
  const f = focusAt(now);
  if (f >= 0 && ok(E.rats[f])) return f;
  let best = -1, bx = 1e9;
  for (const r of E.rats) if (ok(r)) { const x = baseX(r, now).x; if (x < bx) { bx = x; best = r.id; } }
  return best;
}
export function voidSwing(w) {
  if (w.void) return;
  w.void = true;
  if (w.impactCue) w.impactCue.void = true;
  const i = E.hits.indexOf(w.at); if (i >= 0) E.hits.splice(i, 1);
}
// a rat died before a swing aimed at it landed: aim at another, or let the blade swish through air
function retarget(r, at) {
  for (const w of E.swings) if (w.rat === r.id && !w.applied && !w.void && w.at > at) {
    const n = chooseTarget(at, w.at);
    if (n >= 0) w.rat = n; else voidSwing(w);
  }
}

// ---------- rat bites ----------
export function heroMaxHP() { return Math.max(1, Math.round(RULES.heroHP * (E.hpMult || 1)) + (E.hpBonus || 0)); }
export function heroHP(s) {
  const maxHP = heroMaxHP();
  let hp = maxHP;
  for (const b of E.bites) if (!b.void && b.hit && b.at <= s) hp -= b.dmg;
  for (const h of E.heals) if (h.at <= s) hp = Math.min(maxHP, hp + h.amt);
  return hp;
}
export function addBite(b) {
  b.hit = b.roll !== 1 && (b.roll === 20 || b.roll + RULES.ratToHit >= RULES.heroAC);
  if (b.hit) {
    if (E.dmgReduce) b.dmg = Math.max(1, b.dmg - E.dmgReduce);
    const hp = heroHP(b.at);
    if (hp - b.dmg < 1) { b.dmg = Math.max(0, hp - 1); b.ward = true; }   // Mystra's patience
  }
  E.bites.push(b);
  b.cues = [cue(b.at - 0.03, 'bite')];
  if (b.hit) b.cues.push(cue(b.at + 0.01, b.ward ? 'ward' : 'hurt'));
  return b;
}

// ---------- Command Strikes, heals, focus ----------
export function addStrike(cs) {
  E.strikes.push(cs);
  cue(cs.at - 0.05, 'shout', { i: cs.n }); cue(cs.at, 'cs', { i: cs.n });
  damageRat(E.rats[cs.rat], cs.at, cs.dmg, { kind: 'cs', cs });
  return cs;
}
export function addHeal(at, amt, kind = 'active') { E.heals.push({ at, amt, passive: kind === 'regen' }); cue(at, 'heal'); }
export function setFocus(at, rat) {
  const cur = E.focus.length ? E.focus[E.focus.length - 1].rat : -1;
  E.focus.push({ at, rat });
  if (cur !== rat) cue(at, 'focus');
}
export function focusAt(s) {
  let f = -1, fa = -9;
  for (const e of E.focus) { if (e.at > s) break; f = e.rat; fa = e.at; }
  if (f >= 0 && E.rats[f].dieAt <= s) return -1;
  return f;
}
function focusEntry(s) { let e = null; for (const x of E.focus) { if (x.at > s) break; e = x; } return e; }

// ---------- Beat 1: the scripted fight ----------
function loadBeat1() {
  const r0 = addRat({ burst: 22.0, landX: 420, coins: 2 });
  r0.meleeAt = moveRat(r0, r0.landT, SLOT[0], { speed: 150 }); r0.slot = 0;
  const r1 = addRat({ burst: 22.27, landX: 440, coins: 3 });
  moveRat(r1, r1.landT, SLOT[0] + 56, { speed: 150 });
  r1.meleeAt = moveRat(r1, 27.0, SLOT[0], { dur: 0.5, kind: 'dash' }); r1.slot = 0;
  cue(23.0, 'squeak', { pan: 0.3 }); cue(27.05, 'squeak', { pan: 0.3 }); cue(27.25, 'squeak', { pan: 0.25 });
  cue(CB.draw, 'draw');
  // the hero's rounds: pips fill from drawing the sword toward each swing
  const SW = [
    { at: 25.9, rat: 0, roll: 16, dice: [4, 5], linger: 1.1 },   // the first swing always hits (≥14)
    { at: 28.3, rat: 1, roll: 4, dice: [], linger: 2.0 },         // …and a low roll misses: "every swing is a roll"
    { at: 30.7, rat: 1, roll: 17, dice: [5, 2], linger: 1.3 },
  ];
  [{ at: 25.2, rat: 0, roll: 8, dmg: 2 }, { at: 27.95, rat: 1, roll: 14, dmg: 3 }, { at: 29.5, rat: 1, roll: 6, dmg: 1 }].forEach(addBite);
  let prev = CB.draw - 0.2;
  for (const w of SW) {
    addSwing(w); w.applied = true;
    E.rounds.push({ t0: prev, full: w.at, at: w.at });
    if (w.hit) damageRat(E.rats[w.rat], w.at, w.dmg, { kind: 'swing', sw: w });
    prev = w.at;
  }
}
export const BEAT1_END = 30.7 + HS + 0.14;

export function resetCombat() {
  E = fresh();
  loadBeat1();
  E.liveOn = true;
}
resetCombat();

// ---------- HUD numbers ----------
export function hudState(t) {
  const s = warp(t);
  const hpMax = heroMaxHP();
  let hp = hpMax, hpAt = -9, healAt = -9, hpLost = 0;
  for (const b of E.bites) if (!b.void && b.hit && b.dmg > 0 && b.at <= s) { hp -= b.dmg; if (b.at >= hpAt) { hpAt = b.at; hpLost = b.dmg; } }
  for (const h of E.heals) if (h.at <= s) { hp = Math.min(hpMax, hp + h.amt); healAt = Math.max(healAt, h.at); }
  let cp = 0, cpAt = -9; for (const c of E.coins) if (c.arrive !== undefined && s >= c.arrive) { cp += (c.v || 1); cpAt = Math.max(cpAt, c.arrive); }
  cp = Math.max(0, cp - E.spent);                          // purchases (Beat 6) spend out of the purse
  let xp = 0, xpAt = -9; for (const o of E.orbs) if (s >= o.arrive) { xp += o.xp; xpAt = Math.max(xpAt, o.arrive); }
  let quota = 0, quotaAt = -9; for (const r of E.rats) if (r.popAt !== undefined && s >= r.popAt + 0.25) { quota++; quotaAt = Math.max(quotaAt, r.popAt + 0.25); }
  // the hero's round: pips fill toward each swing (and stay full while he waits for something to hit)
  let round = 0, swingAt = -9, combat = false;
  for (const rd of E.rounds) if (s >= rd.t0 && s < rd.at) { round = s < rd.full ? inv(rd.t0, rd.full, s) : 1; combat = true; }
  for (const w of E.swings) if (w.at <= s && !w.void) swingAt = Math.max(swingAt, w.at);
  if (s - swingAt < 0.3) combat = true;
  return { hp, hpMax, hpAt, hpLost, healAt, cp, cpAt, xp, xpAt, quota, quotaAt, round, swingAt, combat, s, level: E.level || 1, stage: E.stage || 1 };
}

// ---------- the hero ----------
export function heroCombat(t) {
  if (t < CB.walk[0]) return null;
  const s = warp(t);
  if (s < CB.walk[1]) {
    const k = inv(CB.walk[0], CB.walk[1], s);
    return { x: lerp(CB.x0, CB.x1, k), dx: 0, walking: true, frame: Math.floor((s - CB.walk[0]) * 12) % 8 };
  }
  let mode = s < CB.draw ? 'idle' : s < CB.draw + 0.14 ? 'windup' : (Math.floor((s - CB.draw) / 0.55) % 2 ? 'ready2' : 'ready');
  let dx = 0;
  for (const cs of E.strikes) { const d = s - cs.at + 0.05; if (d >= 0 && d < 0.14) dx = Math.max(dx, Math.round(2 * (1 - d / 0.14))); }  // a lean into the shout
  for (const b of E.bites) if (b.hit && !b.void && s >= b.at && s < b.at + 0.22) { mode = 'hurt'; dx = -Math.round(3 * (1 - (s - b.at) / 0.22)); }
  for (const w of E.swings) {
    const d = s - w.at;
    if (d < -0.3 || d > 0.8) continue;
    const L = w.lunge || 0;                                   // a step in toward a rat in the back slot
    if (d >= -0.26 && d < -0.05) { mode = 'windup'; dx = -1 + Math.round(L * easeOut((d + 0.26) / 0.21)); }
    else if (d >= -0.05 && d < 0.14) { mode = 'strike'; dx = 5 + L; }
    else if (d >= 0.14 && d < 0.44) { mode = w.fumble && d > 0.22 ? 'hurt' : 'follow'; dx = (w.fumble ? 5 + Math.round(Math.sin((d - 0.14) * 40)) : 5) + L; }
    else if (d >= 0.44 && d < 0.74) dx = Math.round((5 + L) * (1 - easeOut((d - 0.44) / 0.3)));
  }
  return { x: CB.x1, dx, walking: false, mode, frame: Math.floor(s / 0.9) % 2 };
}
export function heroAdvanceSteps() { const out = []; for (let s = CB.walk[0]; s < CB.walk[1]; s += 4 / 12) out.push({ t: s, x: lerp(CB.x0, CB.x1, inv(CB.walk[0], CB.walk[1], s)) + HERO_CX }); return out; }

// ---------- rat poses ----------
let RAT = null, RSIL = null, RGLOW = null, D20 = null, SPOT = null, COIN = null, SHOUT = null;
let GOB = null, GSIL = null, GGLOW = null, SNIK = null, SSIL = null, SGLOW = null;
export function buildCombat() {
  RAT = buildRat();
  const each = fn => ({ run: RAT.run.map(fn), crouch: fn(RAT.crouch), bite: fn(RAT.bite), hit: fn(RAT.hit) });
  RSIL = each(f => silhouette(f));
  RGLOW = each(f => silhouette(f, '#ffd45a'));
  RAT.flash = silhouette(RAT.hit, '#ffffff');
  GOB = buildGoblin();
  const geach = fn => ({ run: GOB.run.map(fn), leap: fn(GOB.leap), crouch: fn(GOB.crouch), bite: fn(GOB.bite), hit: fn(GOB.hit) });
  GSIL = geach(f => silhouette(f));
  GGLOW = geach(f => silhouette(f, '#ffd45a'));
  GOB.flash = silhouette(GOB.hit, '#ffffff');
  SNIK = buildGoblin(true);                             // Snikkit: pie-tin helm, pie in hand (Beat 7)
  const seach = fn => ({ run: SNIK.run.map(fn), leap: fn(SNIK.leap), crouch: fn(SNIK.crouch), bite: fn(SNIK.bite), hit: fn(SNIK.hit) });
  SSIL = seach(f => silhouette(f));
  SGLOW = seach(f => silhouette(f, '#ffd45a'));
  SNIK.flash = silhouette(SNIK.hit, '#ffffff');
  D20 = buildD20();
  SPOT = buildSpot(34, 70, 1.15);
  COIN = buildCoin();
  SHOUT = Object.fromEntries(['HA!', 'HUP!', 'HAH!', 'OI!'].map(w => [w, buildShout(w)]));
}

export function ratState(r, s, og) {
  if (s < r.burst || (r.popAt !== undefined && s >= r.popAt)) return null;
  const hx = BURROW.x - 4, hy = BURROW.y + 1 + og;
  if (s < r.landT) {                                       // the leap out of the burrow
    const k = (s - r.burst) / LEAP;
    const gy = ratGroundY(r.landX, og, r.depth);
    return { x: lerp(hx + 8, r.landX, k), y: lerp(hy + 6, gy, easeIn(k)) - Math.sin(Math.PI * k) * 22, img: 'run', fr: k < 0.5 ? 0 : 2,
      emerge: k < 0.35 ? hy + 1 : null, air: Math.sin(Math.PI * k), gy };
  }
  const b = baseX(r, s);
  let img = 'run', fr = 3, dx = 0, lift = 0, flash = 0;
  if (b.moving) fr = Math.floor(s * (b.kind === 'creep' ? 9 : 16) + r.id) % 4;
  else {
    // at rest: twitchy sniffing; a wary rat hisses and feints at the hero
    const cell = Math.floor(s * 6);
    if (hash(cell, r.id * 13 + 1) > 0.72) img = 'crouch';
    dx += hash(Math.floor(s * 2.2), r.id + 40) > 0.7 ? -1 : 0;
    if (r.wary && !(r.aggroAt <= s)) {
      const c2 = Math.floor(s / 1.9), ph = s / 1.9 - c2, h = hash(c2, r.id * 31 + 5);
      if (h > 0.55 && ph < 0.22) { img = 'run'; fr = Math.floor(ph * 30) % 4; dx = -Math.round(9 * Math.sin(Math.PI * ph / 0.22)); }   // a feint
      else if (h < 0.4 && ph > 0.3 && ph < 0.62) img = 'bite';                                                                   // a hiss
    }
  }
  for (const bt of E.bites) if (bt.rat === r.id && !bt.void) {
    const d = s - bt.at; if (d < -0.25 || d > 0.32) continue;
    const reach = r.slot === 1 ? 16 : 7;
    if (d >= -0.22 && d < -0.04) { img = 'crouch'; dx = 2; }
    else if (d >= -0.04 && d < 0.1) { img = 'bite'; dx = -reach; lift = r.slot === 1 ? 3 : 0; }
    else if (d >= 0.1 && d < 0.3) { img = 'run'; fr = 3; dx = Math.round(-reach * (1 - (d - 0.1) / 0.2)); }
  }
  for (const w of E.swings) if (w.rat === r.id && !w.void) {
    const d = s - w.at; if (d < -0.15 || d > 0.6) continue;
    if (!w.hit && d >= -0.12 && d < 0.36) {               // a nimble hop back out of reach
      const k = (d + 0.12) / 0.48;
      img = k < 0.15 || k > 0.85 ? 'crouch' : 'run'; fr = 0;
      dx = Math.round(10 * Math.sin(Math.PI * k)); lift = Math.round(7 * Math.sin(Math.PI * Math.min(1, k * 1.3)));
    }
    if (w.hit && d >= 0) {
      const dead = r.dieAt === w.at;
      const kb = dead ? 8 : 6, dur = dead ? 0.2 : 0.3;
      if (dead || d < dur + 0.1) {
        img = 'hit'; dx = Math.round(kb * (dead ? easeOut(Math.min(1, d / 0.2)) : Math.sin(Math.PI * Math.min(1, d / dur)))); lift = Math.round(4 * Math.sin(Math.PI * Math.min(1, d / 0.21)));
        if (d < HS) flash = 0.8;
      }
    }
  }
  for (const cs of E.strikes) if (cs.rat === r.id) {
    const d = s - cs.at; if (d < 0 || d > 0.16) continue;
    img = 'hit'; dx += Math.round(4 * Math.sin(Math.PI * d / 0.16)); if (d < 0.05) flash = 0.65;
  }
  const x = b.x + dx, gy = ratGroundY(x, og, r.depth);
  return { x, y: gy - lift, img, fr, emerge: null, air: lift / 10, gy, flash };
}
const ratImg = st => st.img === 'run' ? RAT.run[st.fr] : RAT[st.img];
const pick = (set, st) => st.img === 'run' ? set.run[st.fr] : set[st.img];

// ---------- goblin poses ----------
// a goblin's approach: peek over the coping → vault the wall → dash to his slot → stab
export function gobState(g, s, og) {
  if (s < g.tel || (g.popAt !== undefined && s >= g.popAt)) return null;
  if (g.launched && s >= g.dieAt + HS) return null;                     // the sky has him now (the hit-flash holds him through the freeze)
  if (s < g.leap) {                                                        // the telegraph: helm and eyes over the wall
    const duck = s > g.leap - 0.14 ? 3 : 0;                                // a quick duck, then SPRING
    return { peek: true, x: g.wallX, y: WALL_TOP - 6 + Math.round(Math.sin(s * 7) * 1) + duck, gy: WALL_TOP, img: 'peek', fr: 0, air: 0 };
  }
  const gy0 = ratGroundY(g.landX, og, g.depth);
  if (s < g.landT) {                                                       // the vault, helm lifting clean off his head
    const k = (s - g.leap) / GOB_LEAP;
    const y0 = WALL_TOP - 8;
    return { x: lerp(g.wallX, g.landX, easeOut(k)), y: lerp(y0, gy0, easeIn(k)) - Math.sin(Math.PI * k) * 30,
      img: 'leap', fr: 0, air: Math.sin(Math.PI * k), gy: gy0, over: k < 0.55 };
  }
  const b = baseX(g, s);
  let img = 'run', fr = 3, dx = 0, lift = 0, flash = 0;
  if (b.moving) fr = Math.floor(s * 13 + g.id) % 4;                        // a bandy-legged scuttle, helm wobbling
  else if (s < g.landT + 0.42) fr = Math.floor(s * 12) % 2 ? 1 : 3;        // the helm seesaws as it settles
  else {
    // at rest: hefts the dagger, shifts his weight; the back marker hops with impatience
    fr = Math.floor(s * 3 + g.id) % 2 ? 0 : 3;
    if (g.slot >= 2) { const ph = (s * 0.9 + g.id * 0.37) % 1.4; if (ph < 0.24) { lift = Math.round(3 * Math.sin(Math.PI * ph / 0.24)); fr = 1; } }
    if (g.wary && !(g.aggroAt <= s)) { const c2 = Math.floor(s / 1.7), ph = s / 1.7 - c2; if (hash(c2, g.id * 31 + 5) > 0.6 && ph < 0.2) img = 'crouch'; }
  }
  for (const bt of E.bites) if (bt.rat === g.id && !bt.void) {
    const d = s - bt.at; if (d < -0.25 || d > 0.34) continue;
    const reach = g.slot === 1 ? 14 : 8;
    if (d >= -0.22 && d < -0.04) { img = 'crouch'; dx = 2; }               // the wind-up: dagger pulled back
    else if (d >= -0.04 && d < 0.12) { img = 'bite'; dx = -reach; }        // THE STAB
    else if (d >= 0.12 && d < 0.32) { img = 'run'; fr = 3; dx = Math.round(-reach * (1 - (d - 0.12) / 0.2)); }
  }
  for (const w of E.swings) if (w.rat === g.id && !w.void) {
    const d = s - w.at; if (d < -0.15 || d > 0.6) continue;
    if (!w.hit && d >= -0.12 && d < 0.36) {                                // a skip back, helm flying forward
      const k = (d + 0.12) / 0.48;
      img = k < 0.15 || k > 0.85 ? 'crouch' : 'run'; fr = 2;
      dx = Math.round(9 * Math.sin(Math.PI * k)); lift = Math.round(6 * Math.sin(Math.PI * Math.min(1, k * 1.3)));
    }
    if (w.hit && d >= 0) {
      const dead = g.dieAt === w.at;
      const kb = dead ? 9 : 6, dur = dead ? 0.2 : 0.3;
      if (dead || d < dur + 0.1) {
        img = 'hit'; dx = Math.round(kb * (dead ? easeOut(Math.min(1, d / 0.2)) : Math.sin(Math.PI * Math.min(1, d / dur)))); lift = Math.round(4 * Math.sin(Math.PI * Math.min(1, d / 0.21)));
        if (d < HS) flash = 0.8;
      }
    }
  }
  for (const cs of E.strikes) if (cs.rat === g.id) {
    const d = s - cs.at; if (d < 0 || d > 0.16) continue;
    img = 'hit'; dx += Math.round(4 * Math.sin(Math.PI * d / 0.16)); if (d < 0.05) flash = 0.65;
  }
  const x = b.x + dx, gy = ratGroundY(x, og, g.depth);
  return { x, y: gy - lift, img, fr, air: lift / 10, gy, flash, snik: !!g.snik };
}
const gobImg = st => { const set = st.snik ? SNIK : GOB; return st.img === 'run' ? set.run[st.fr] : set[st.img]; };

// which foe (if any) is under a point on the native 640×360 grid
export function ratAtPoint(gx, gy, s, og, filter = () => true) {
  const cands = E.rats.filter(r => filter(r) && ratAlive(r, s)).sort((a, b) => b.depth - a.depth);
  for (const r of cands) {
    const st = (r.gob ? gobState : ratState)(r, s, og); if (!st || st.peek) continue;
    const bx = r.gob ? [-15, 13, -38, 4] : [-26, 22, -26, 5];
    if (gx >= st.x + bx[0] && gx <= st.x + bx[1] && gy >= st.gy + bx[2] && gy <= st.gy + bx[3]) return r.id;
  }
  return -1;
}

function ratHPBar(ctx, r, s, st) {
  const first = r.segs.length ? r.segs[0].t1 : r.landT;
  if (s < first + 0.2 && !r.dmg.some(d => d.at <= s)) return;
  const X = Math.round(st.x) - 8, Y = Math.round(st.gy) - (r.gob ? 40 : 27);
  const hp = Math.max(0, ratHP(r, s)), frac = hp / r.hp0;
  let last = null; for (const d of r.dmg) if (d.at <= s) last = d;
  const ds = last ? s - last.at : 9;
  const prev = last ? Math.max(0, hp + last.amt) / r.hp0 : frac;
  const k = clamp((s - first - 0.2) / 0.15) || (r.dmg.length ? 1 : 0), w = Math.max(4, Math.round(16 * Math.max(k, last ? 1 : 0)));
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X, Y, w + 2, 4);
  ctx.fillStyle = '#3a1418'; ctx.fillRect(X + 1, Y + 1, w, 2);
  if (ds < 0.45) {                                         // the lost chunk lingers pale, then drains
    const g = Math.round(w * lerp(prev, frac, clamp((ds - 0.15) / 0.3)));
    ctx.fillStyle = ds < 0.07 ? '#fff4e0' : '#f0b8a0'; ctx.fillRect(X + 1, Y + 1, g, 2);
  }
  ctx.fillStyle = '#d83a3e'; ctx.fillRect(X + 1, Y + 1, Math.round(w * frac), 2);
  ctx.fillStyle = '#ff9a7e'; ctx.fillRect(X + 1, Y + 1, Math.round(w * frac), 1);
}

// ---------- effects ----------
const FURC = ['#2f1d14', '#5c3823', '#76492c', '#8e5d38', '#a87446', '#c08e5c'];
const DIRT = ['#4a311e', '#6b4a2c', '#8c6a42', '#a98654'];
function burstFX(ctx, s, r, og) {
  const d = s - r.burst; if (d < 0 || d > 1.0) return;
  const hx = BURROW.x - 4, hy = BURROW.y + 1 + og;
  if (d < 0.5) for (let i = 0; i < 6; i++) {
    const k = d / 0.5, a = -Math.PI * (0.15 + 0.7 * i / 5);
    const cx = hx + Math.cos(a) * (4 + 12 * easeOut(k)), cy = hy - 2 + Math.sin(a) * (3 + 7 * easeOut(k));
    ctx.globalAlpha = 0.55 * (1 - k); pxEllipse(ctx, cx, cy, 2 + 4 * k, 1.5 + 3 * k, i % 2 ? '#b3946c' : '#8c6f4e');
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 16; i++) {
    const vx = (hash(i, r.burst * 10) - 0.5) * 70, vy = -40 - hash(i, r.burst * 10 + 1) * 50;
    const x = hx + vx * d, y = hy + vy * d + 130 * d * d;
    if (y > hy + 3) continue;
    ctx.fillStyle = DIRT[i % 4]; ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 1 : 2, i % 3 ? 1 : 2);
  }
  for (let i = 0; i < 3; i++) {
    const vx = (i - 1) * 26, vy = -55 - i * 6; const x = hx + vx * d, y = hy + vy * d + 130 * d * d; if (y > hy + 3) continue;
    const a = d * 14 + i; ctx.fillStyle = '#6a9a46';
    for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), 1, 1);
  }
}
function landDust(ctx, s, x, gy, at) {
  const d = s - at; if (d < 0 || d > 0.3) return;
  const k = d / 0.3;
  ctx.globalAlpha = 0.5 * (1 - k);
  pxEllipse(ctx, x - 10 - 6 * k, gy - 1 - 2 * k, 2 + 2 * k, 1 + k, '#c2a57a');
  pxEllipse(ctx, x + 10 + 6 * k, gy - 1 - 2 * k, 2 + 2 * k, 1 + k, '#c2a57a');
  ctx.globalAlpha = 1;
}
function runDust(ctx, s, r, og) {
  for (let k = 0; k < 8; k++) {
    const st = Math.floor(s / 0.07) * 0.07 - k * 0.07, age = s - st;
    const p = ratState(r, st, og); if (!p || p.img !== 'run' || p.air > 0.05) continue;
    const prev = ratState(r, st - 0.05, og); if (!prev || Math.abs(prev.x - p.x) < 1) continue;
    ctx.globalAlpha = 0.45 * (1 - age / 0.56); ctx.fillStyle = '#c9ad84';
    ctx.fillRect(Math.round(p.x + 12 + age * 10), Math.round(p.gy - 1 - age * 9), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// the sword's smear: a pixel crescent sweeping from over the shoulder down through the rat
function smear(ctx, s, w, px, py) {
  const d = s - w.at; if (d < -0.045 || d > 0.13) return;
  const lead = lerp(-100, 18, clamp((d + 0.045) / 0.06)) * Math.PI / 180;
  const span = d < 0.02 ? 1.75 : 1.75 * (1 - (d - 0.02) / 0.11);
  if (span <= 0.05) return;
  const R0 = 27, R1 = 41, gold = w.crit;
  py += 9;
  for (let y = -R1; y <= R1; y++) for (let x = -R1; x <= R1; x++) {
    const r = Math.hypot(x, y); if (r < R0 || r > R1) continue;
    const f = (Math.atan2(y, x) - (lead - span)) / span; if (f < 0 || f > 1) continue;
    const edge = (r - R0) / (R1 - R0);
    const band = 1 - Math.abs(edge - 0.62) * 1.6;
    const v = Math.pow(f, 1.6) * (0.35 + 0.65 * band);
    if (v < 0.1 + bayer(x + 64, y + 64) * 0.2) continue;
    ctx.fillStyle = v > 0.7 ? '#ffffff' : v > 0.45 ? (gold ? '#ffe98a' : '#fff3cf') : v > 0.25 ? (gold ? '#ffc23a' : '#ffd88a') : (gold ? '#e8902a' : '#f0a656');
    ctx.globalAlpha = v > 0.45 ? 1 : 0.7;
    ctx.fillRect(px + x, py + y, 1, 1);
  }
  ctx.globalAlpha = 1;
}
function impact(ctx, s, at, x, y, big = 1) {
  const d = s - at; if (d < 0 || d > 0.32) return;
  x = Math.round(x); y = Math.round(y);
  ctx.globalCompositeOperation = 'lighter';
  if (d < HS) {
    ctx.fillStyle = '#ffffff';
    pxEllipse(ctx, x, y, 3 * big, 3 * big, '#ffffff');
    for (let k = 6; k < 15 * big; k++) { ctx.fillRect(x - k, y, 1, 1); ctx.fillRect(x + k, y, 1, 1); ctx.fillRect(x, y - k, 1, 1); ctx.fillRect(x, y + k, 1, 1); }
    for (let k = 4; k < 10 * big; k++) { ctx.fillRect(x - k, y - k, 1, 1); ctx.fillRect(x + k, y - k, 1, 1); ctx.fillRect(x - k, y + k, 1, 1); ctx.fillRect(x + k, y + k, 1, 1); }
  } else {
    const k = (d - HS) / (0.32 - HS), R = (6 + 10 * easeOut(k)) * big;
    ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffe2a0';
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * R), Math.round(y + Math.sin(a) * R * 0.8), 1, 1); }
    for (let i = 0; i < 8; i++) {
      const a = hash(i, 77) * Math.PI * 2, sp = 25 + hash(i, 78) * 40;
      ctx.fillStyle = i % 2 ? '#fff4c8' : '#ffb84a';
      ctx.fillRect(Math.round(x + Math.cos(a) * sp * (d - HS) * 2.2), Math.round(y + Math.sin(a) * sp * (d - HS) * 2.2 + 30 * (d - HS) ** 2), 1, 1);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// a Command Strike lands: a quick gold slash across the rat and a spray of sparks
function csSlash(ctx, s, cs, x, y) {
  const d = s - cs.at; if (d < 0 || d > 0.22) return;
  const k = d / 0.22, dir = cs.n % 2 ? 1 : -1;
  ctx.globalCompositeOperation = 'lighter';
  if (d < 0.1) {
    const L = 11, grow = Math.min(1, d / 0.04);
    for (let i = -L; i <= L * (2 * grow - 1); i++) {
      const px = Math.round(x + i * dir), py = Math.round(y + i * 0.55);
      ctx.fillStyle = Math.abs(i) < 4 ? '#ffffff' : '#ffe27a'; ctx.globalAlpha = 1 - d / 0.1;
      ctx.fillRect(px, py, 1, 1); if (Math.abs(i) < 7) ctx.fillRect(px, py - 1, 1, 1);
    }
  }
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 6; i++) {
    const a = hash(i, cs.n * 9 + 1) * Math.PI * 2, sp = 30 + hash(i, cs.n * 9 + 2) * 35;
    ctx.fillStyle = i % 2 ? '#fff2b0' : '#ffc23a';
    ctx.fillRect(Math.round(x + Math.cos(a) * sp * d), Math.round(y + Math.sin(a) * sp * d + 40 * d * d), 1, 1);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function furPuff(ctx, s, r, x, gy) {
  const d = s - r.popAt; if (d < 0 || d > 1.8) return;
  const cy = gy - 10;
  if (d < 0.42) {
    const k = d / 0.42;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + 0.4, R = 4 + 13 * easeOut(k);
      ctx.globalAlpha = 0.9 * (1 - k * k);
      pxEllipse(ctx, x + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7, 4 + 4 * k, 3 + 3 * k, i % 2 ? '#efe4d2' : '#cdb79c');
    }
    if (d < 0.06) { ctx.globalAlpha = 1; pxEllipse(ctx, x, cy, 9, 7, '#fff6e8'); }
  }
  for (let i = 0; i < 30; i++) {
    const life = 0.55 + hash(i, 5) * 0.45; if (d > life) continue;
    const a = -Math.PI * (0.05 + 0.9 * hash(i, 6)), sp = 35 + hash(i, 7) * 55;
    const drag = (1 - Math.exp(-3 * d)) / 3;
    const px = x + Math.cos(a) * sp * drag * 1.4, py = cy + Math.sin(a) * sp * drag * 1.4 + 70 * d * d;
    if (py > gy + 1) continue;
    ctx.globalAlpha = 1 - Math.max(0, (d - life * 0.6) / (life * 0.4));
    ctx.fillStyle = FURC[i % FURC.length]; ctx.fillRect(Math.round(px), Math.round(py), 2, i % 3 ? 1 : 2);
  }
  for (let i = 0; i < 7; i++) {
    const px = x + (hash(i, 9) - 0.5) * 26 + Math.sin(d * 4 + i) * 3, py = cy - 8 - hash(i, 10) * 8 + d * 14;
    ctx.globalAlpha = clamp(1 - d / 1.8) * 0.9; ctx.fillStyle = i % 2 ? '#c08e5c' : '#e0c8a4';
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// a goblin goes the same way, but greener: skin, rags, and a puff of pond-scum smoke
const GOBC = ['#16240e', '#36541e', '#4c7028', '#649038', '#783622', '#c9a86a'];
function gobPuff(ctx, s, r, x, gy) {
  const d = s - r.popAt; if (d < 0 || d > 1.8) return;
  const cy = gy - 14;
  if (d < 0.42) {
    const k = d / 0.42;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + 0.4, R = 4 + 14 * easeOut(k);
      ctx.globalAlpha = 0.9 * (1 - k * k);
      pxEllipse(ctx, x + Math.cos(a) * R, cy + Math.sin(a) * R * 0.75, 4 + 4 * k, 3 + 3 * k, i % 2 ? '#e4ecd2' : '#b9c49a');
    }
    if (d < 0.06) { ctx.globalAlpha = 1; pxEllipse(ctx, x, cy, 10, 8, '#f4f8e4'); }
  }
  for (let i = 0; i < 30; i++) {
    const life = 0.55 + hash(i, 5) * 0.45; if (d > life) continue;
    const a = -Math.PI * (0.05 + 0.9 * hash(i, 6)), sp = 35 + hash(i, 7) * 55;
    const drag = (1 - Math.exp(-3 * d)) / 3;
    const px = x + Math.cos(a) * sp * drag * 1.4, py = cy + Math.sin(a) * sp * drag * 1.4 + 70 * d * d;
    if (py > gy + 1) continue;
    ctx.globalAlpha = 1 - Math.max(0, (d - life * 0.6) / (life * 0.4));
    ctx.fillStyle = GOBC[i % GOBC.length]; ctx.fillRect(Math.round(px), Math.round(py), 2, i % 3 ? 1 : 2);
  }
  for (let i = 0; i < 7; i++) {                                          // stolen veg, scattered
    const px = x + (hash(i, 9) - 0.5) * 26 + Math.sin(d * 4 + i) * 3, py = cy - 8 - hash(i, 10) * 8 + d * 14;
    ctx.globalAlpha = clamp(1 - d / 1.8) * 0.9; ctx.fillStyle = i % 3 ? '#d8782a' : '#80ac4e';
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// the helm outlives him: it spins off in a high parabola, clangs once, bounces, and rests in the grass
function drawHelm(ctx, s, g, og) {
  const hm = g.helm; if (!hm) return;
  const d = s - hm.at; if (d < 0) return;
  const gy = ratGroundY(hm.x1, og, g.depth) - 3;
  const LAND = 0.5, B2 = 0.22;
  const fade = d > LAND + B2 + 4.4 ? 1 - (d - LAND - B2 - 4.4) / 0.6 : 1;
  if (fade <= 0) return;
  ctx.globalAlpha = clamp(fade);
  let x, y, fr;
  if (d < LAND) {
    const k = d / LAND;
    x = lerp(hm.x0, hm.x1, k); y = gy - hm.y0 + (hm.y0) * k * k - Math.sin(Math.PI * k) * hm.hop;
    fr = GOB.helm[Math.floor(d * 11) % 3];
  } else if (d < LAND + B2) {
    const k = (d - LAND) / B2;
    x = hm.x1 + k * 2; y = gy - Math.sin(Math.PI * k) * 3.5;
    fr = GOB.helm[Math.floor(d * 11) % 3];
  } else { x = hm.x1 + 2; y = gy; fr = GOB.helm[0]; }
  if (d >= LAND && d < LAND + 0.1) {                                     // the clang kicks up a puff of dust
    ctx.globalAlpha = clamp(fade) * 0.5; pxEllipse(ctx, x, gy + 2, 4, 1.5, '#c2a57a'); ctx.globalAlpha = clamp(fade);
  }
  ctx.drawImage(fr, Math.round(x - 7), Math.round(y - 4));
  ctx.globalAlpha = 1;
}

// the scripted natural 20: the goblin is punted skyward in a long shallow arc,
// dwindles to a speck, and goes off with a twinkle and a "ding" like a struck star
export function launchPos(g, s) {
  const d = s - g.dieAt - HS;
  if (d < 0 || d > 0.9 || !g.launched) return null;
  const x0 = g.deathX, y0 = ratGroundY(x0, 0, g.depth) - 20;
  // a long ringing arc into the open sky above the big house's gable (box and roof would hide him)
  const x1 = x0 + 300, y1 = 70;
  const k = clamp(d / 0.9), e = easeOut(k);
  const cx = x0 + 170, cy = y0 - 190;
  const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1;
  const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1;
  return { x, y, k };
}
function drawLaunch(ctx, s, g) {
  const p = launchPos(g, s); if (!p) return;
  // a green-gold streak trailing him
  for (let q = 1; q <= 6; q++) {
    const pp = launchPos(g, s - q * 0.028); if (!pp) continue;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 - q * 0.08;
    ctx.fillStyle = q % 2 ? '#b8e060' : '#ffe27a';
    ctx.fillRect(Math.round(pp.x), Math.round(pp.y + 4), q < 3 ? 2 : 1, 1);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
  const img = p.k < 0.55 ? GOB.hit : GOB.hitHalf;
  const w = img.width, h = img.height;
  ctx.drawImage(img, Math.round(p.x - w * (GOB_CX / 44)), Math.round(p.y - h * (GOB_FEET / 42)));
}
function drawStar(ctx, s, g) {
  if (!g.launched) return;
  const d = s - g.popAt; if (d < 0 || d > 0.9) return;
  const x = Math.round(g.deathX + 300), y = 70;
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 3; q++) {                                          // three pulses: ding… ding… ding
    const dd = d - q * 0.3; if (dd < 0 || dd > 0.26) continue;
    const R = 2.5 + easeOut(dd / 0.26) * (11 - q * 2);
    ctx.globalAlpha = (1 - dd / 0.22) * (1 - q * 0.18);
    ctx.fillStyle = q ? '#ffd25a' : '#fff8dc';
    ctx.fillRect(x - Math.round(R), y, Math.round(R) * 2 + 1, 1);
    ctx.fillRect(x, y - Math.round(R), 1, Math.round(R) * 2 + 1);
    ctx.fillRect(x - Math.round(R * 0.5), y - Math.round(R * 0.5), 1, 1); ctx.fillRect(x + Math.round(R * 0.5), y + Math.round(R * 0.5), 1, 1);
    ctx.fillRect(x + Math.round(R * 0.5), y - Math.round(R * 0.5), 1, 1); ctx.fillRect(x - Math.round(R * 0.5), y + Math.round(R * 0.5), 1, 1);
  }
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = clamp(1 - d / 0.9); ctx.fillRect(x, y, 1, 1);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// the telegraph: the hedge shivers, petals drift, and a helm peeks over the coping
const LEAFC = ['#2e4a1e', '#3e5c28', '#527436', '#6a9a46'];
function hedgeFX(ctx, s, g, og) {
  const d = s - g.tel; if (d < 0 || d > g.leap - g.tel + 0.15) return;
  const wx = g.wallX, wy = WALL_TOP - 6 + og * 0;
  for (let i = 0; i < 10; i++) {                                         // leaves shaking loose
    const lx = wx - 12 + hash(i, g.tel * 7) * 24, ph = hash(i, 3) * 0.8;
    const age = (d + ph) % 0.9;
    const jig = Math.sin(s * 26 + i * 2) * 1.5 * (1 - d / (g.leap - g.tel + 0.15));
    ctx.globalAlpha = 0.8 * (1 - age / 0.9);
    ctx.fillStyle = LEAFC[i % 4];
    ctx.fillRect(Math.round(lx + jig), Math.round(wy - 6 - hash(i, 9) * 12 + age * 16), 1, 1);
  }
  for (let i = 0; i < 3; i++) {                                          // hawthorn petals drifting off
    const age = (d * 0.8 + i * 0.33) % 1.1;
    ctx.globalAlpha = 0.85 * (1 - age / 1.1);
    ctx.fillStyle = i % 2 ? '#f8f2ea' : '#f4c6d4';
    ctx.fillRect(Math.round(wx - 6 + i * 6 + Math.sin(age * 6 + i) * 3), Math.round(wy - 14 + age * 22), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// the focus reticle: four gold corner brackets that snap onto the chosen rat, and a little marker above it
function drawReticle(ctx, s, og) {
  const f = focusAt(s); if (f < 0) return;
  const r = E.rats[f], st = (r.gob ? gobState : ratState)(r, s, og); if (!st || st.peek) return;
  const e = focusEntry(s), d = s - e.at;
  const k = easeOutBack(clamp(d / 0.2));
  const breathe = Math.floor(s * 2.4) % 2;
  const cx = Math.round(st.x - (r.gob ? 1 : 3)), cy = Math.round(st.gy - (r.gob ? 18 : 10));
  const hw = Math.round(lerp(28, r.gob ? 14 : 17, k)) + breathe, hh = Math.round(lerp(22, r.gob ? 20 : 12, k)) + breathe;
  const col = d < 0.08 ? '#ffffff' : '#ffd25a', dark = '#140b0c', hi = '#fff3b0';
  const L = 5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x0 = cx + sx * hw, y0 = cy + sy * hh;
    // outline pass then the bracket
    ctx.fillStyle = dark;
    ctx.fillRect(Math.min(x0, x0 - sx * (L - 1)) - 1, y0 - 1, L + 2, 3);
    ctx.fillRect(x0 - 1, Math.min(y0, y0 - sy * (L - 1)) - 1, 3, L + 2);
    ctx.fillStyle = col;
    ctx.fillRect(Math.min(x0, x0 - sx * (L - 1)), y0, L, 1);
    ctx.fillRect(x0, Math.min(y0, y0 - sy * (L - 1)), 1, L);
    ctx.fillStyle = hi; ctx.fillRect(x0, y0, 1, 1);
  }
  // marker: a small down-pointing gem above the bar
  const my = Math.round(st.gy - (r.gob ? 48 : 36) + Math.sin(s * 5) * 1.2 - (1 - k) * 6);
  const rows = [[-3, 7], [-2, 5], [-1, 3], [0, 1]];
  ctx.fillStyle = dark; ctx.fillRect(cx - 4, my - 1, 9, 1);
  rows.forEach(([o, w], i) => { ctx.fillStyle = dark; ctx.fillRect(cx - (w >> 1) - 1, my + i, w + 2, 1); });
  rows.forEach(([o, w], i) => { ctx.fillStyle = i === 0 ? hi : col; ctx.fillRect(cx - (w >> 1), my + i, w, 1); });
  ctx.fillStyle = dark; ctx.fillRect(cx, my + 4, 1, 1);
}

// ---------- Beat 3: held coins (dropped by Beat 2's rats, tapped by the player) ----------
export function heldCoins() { return E.coins.filter(c => c.hold); }
export function coinPosAt(c, s, og) { return coinPos(c, s, og); }
// the nearest resting coin within reach of a click, or null
export function coinAtPoint(gx, gy, s, og) {
  let best = null, bd = 1e9;
  for (const c of E.coins) {
    if (!c.hold || c.fly !== undefined || c.roll !== undefined || s < c.land + 0.16) continue;
    const [x, y] = coinPos(c, s, og);
    const d = Math.hypot(gx - x, (gy - y) * 1.4);
    if (d < 11 && d < bd) { bd = d; best = c; }
  }
  return best;
}
// a tap pockets it: zip off the ground, arc to the purse, clink (pitch climbs with each quick pickup)
export function collectCoin(c, s) {
  c.fly = s + 0.04; c.arrive = c.fly + 0.58;
  E.streak = c.fly - E.lastArrive < 1.6 ? Math.min(E.streak + 1, 12) : 0; c.pitch = E.streak; E.lastArrive = c.fly;
  cue(c.fly, 'zip', { pan: 0.1 }); cue(c.arrive, 'clink', { i: c.pitch });
}
// a tap's gauntlet also sweeps up resting coins near the one that was struck — returns the count pocketed
export function collectCoinSplash(c, s, og, radius = 34) {
  const [x0, y0] = coinPos(c, s, og);
  collectCoin(c, s);
  let n = 1;
  for (const o of E.coins) {
    if (o === c || !o.hold || o.fly !== undefined || o.roll !== undefined || s < o.land + 0.16) continue;
    const [x, y] = coinPos(o, s, og);
    if (Math.hypot(x - x0, (y - y0) * 1.4) <= radius) { collectCoin(o, s + 0.04 + n * 0.05); n++; }
  }
  return n;
}
// sweeps any resting coins near a ground point (used when clicking nearby loot) — returns count pocketed
export function collectCoinsNear(gx, gy, s, og, radius = 44) {
  let n = 0;
  for (const o of E.coins) {
    if (!o.hold || o.fly !== undefined || o.roll !== undefined || s < o.land + 0.16) continue;
    const [x, y] = coinPos(o, s, og);
    if (Math.hypot(x - gx, (y - gy) * 1.4) <= radius) { collectCoin(o, s + n * 0.045); n++; }
  }
  return n;
}
// left too long, a coin rolls off to the burrow and is gone for good
export function loseCoin(c, s) { c.roll = s; c.gone = s + 0.85; cue(s, 'roll', { pan: 0.2 }); }

// ---------- purchases (Beat 6: the Training Yard) ----------
// copper hops out of the purse, one clink at a time; the purse read-out simply counts fewer coins
export function buyCp(n, s) {
  E.spent += n;
  for (let i = 0; i < n; i++) cue(s + 0.03 + i * 0.06, 'clink', { i: Math.min(2 + i, 11) });
}

// ---------- the six drills (Freeplay plan §1.1 & design plan §5.6) ----------
const growCost = (base, rate) => p => { let c = base; for (let i = 0; i < p; i++) c = Math.ceil(c * rate); return c; };
const M_RANKS = [10, 25, 50, 100, 150, 200, 300, 400, 500];
const T_M_RANKS = [10, 25, 50, 100, 150, 200, 300, 400];
const mileCount = (p, ranks = M_RANKS) => { let n = 0; for (const r of ranks) if (p >= r) n++; return n; };
const fmtMult = m => m >= 10 ? `×${Math.round(m)}` : `+${Math.round((m - 1) * 100)}%`;

export const TRACKS = [
  { id: 'weapon', name: 'Weapon Drills', kind: 'Martial drill · ranks without number',
    d1: 'Sword work at the pell: edge and form.', d2: 'Each rank: a tenth harder.',
    fxName: 'Damage', fx: p => fmtMult((1 + p * 0.1) * Math.pow(2, mileCount(p))), float: '+DAMAGE',
    cost: growCost(10, 1.13),
    miles: M_RANKS.map((r, i) => [r, '×2!', ['thy blows land twofold', 'thy blows double again', 'again twofold', 'twofold yet again', 'stronger still', 'the pell trembles', 'steel sings', 'unbroken', 'without number'][i]]),
    apply: (E2, p) => { E2.dmgMult = (1 + p * 0.1) * Math.pow(2, mileCount(p)); } },
  { id: 'armour', name: 'Armour Drills', kind: 'Martial drill · hide like a wall',
    d1: 'Brace, shrug, endure. Hide like a wall.', d2: 'Each rank: +5% HP & tough hide.',
    fxName: 'Health', fx: p => fmtMult((1 + p * 0.05) * Math.pow(2, mileCount(p))), float: '+ARMOUR',
    cost: growCost(15, 1.13),
    miles: M_RANKS.map((r, i) => [r, '×2!', ['twice the hide', 'twice it again', 'a wall of thee', 'stone would envy thee', 'iron-bound', 'unyielding', 'bastion of bone', 'immovable', 'without number'][i]]),
    apply: (E2, p) => { E2.hpMult = (1 + p * 0.05) * Math.pow(2, mileCount(p)); E2.dmgReduce = Math.floor(p / 5); } },
  { id: 'footwork', name: 'Footwork', kind: 'Martial drill · swift as borrowed time',
    d1: 'Ladder steps and pivots in the mud.', d2: 'Each rank: swifter swing rounds.',
    fxName: 'Round time', fx: p => `-${Math.round((1 - Math.max(0.25, Math.pow(0.99, p))) * 100)}%`, float: '+SPEED',
    cost: growCost(25, 1.15),
    miles: M_RANKS.map((r, i) => [r, 'STRIKE+1!', i === 0 ? 'an extra Command Strike per tap' : 'yet another Command Strike']),
    apply: (E2, p) => { E2.roundMult = Math.max(0.25, Math.pow(0.99, p)); E2.extraStrikes = mileCount(p); } },
  { id: 'tactics', name: 'Tactics', kind: 'Martial drill · the eye before the arm',
    d1: 'Chalk lines. Learn where the gaps live.', d2: 'Each rank: +10% strike, +2% crit dmg.',
    fxName: 'Command', fx: p => fmtMult((1 + p * 0.1) * Math.pow(2, mileCount(p, T_M_RANKS))), float: '+TACTICS',
    cost: growCost(100, 1.13),
    miles: [
      [10, '×2!', 'thy commands land twofold'], [25, '×2!', 'twofold again'], [50, '×2!', 'again twofold'],
      [100, '×2!', 'twofold yet again'], [150, '×2!', 'thy voice shakes the field'], [200, '×2!', 'without number'],
      [250, 'CRIT+!', 'thy crits grow likelier'], [300, '×2!', 'twofold yet again'], [400, '×2!', 'twofold yet again'],
      [500, 'CRIT+!', 'likelier still'],
    ],
    apply: (E2, p) => {
      E2.strikeMult = (1 + p * 0.1) * Math.pow(2, mileCount(p, T_M_RANKS));
      E2.critBonus = p * 0.02;
      E2.critRange = 20 - (p >= 250 ? 1 : 0) - (p >= 500 ? 1 : 0);
    } },
  { id: 'scavenging', name: 'Scavenging', kind: 'Field craft · copper finds its way',
    d1: 'Pockets, packs and loose floorboards.', d2: 'Each rank: a fiftieth more.',
    fxName: 'Gold find', fx: p => fmtMult((1 + p * 0.02) * Math.pow(2, mileCount(p))), float: '+GOLD',
    cost: growCost(20, 1.13),
    miles: [[5, 'AUTO!', 'coins pick themselves up'], ...M_RANKS.map((r, i) => [r, '×2!', ['twice the gleanings', 'twice again', 'again twofold', 'a fortune in leavings', 'heavy pockets', 'every glint caught', 'kingly gleanings', 'bottomless purse', 'without number'][i]])],
    apply: (E2, p) => { E2.goldFind = (1 + p * 0.02) * Math.pow(2, mileCount(p)); E2.autoCollect = p >= 5; } },
  { id: 'conditioning', name: 'Conditioning', kind: 'Field craft · breath and bone',
    d1: 'Sprints up the tor with a sack of stones.', d2: 'Each rank: +5% regen & potions.',
    fxName: 'Mending', fx: p => fmtMult((1 + p * 0.05) * Math.pow(2, mileCount(p))), float: '+VIGOUR',
    cost: growCost(50, 1.13),
    miles: M_RANKS.map((r, i) => [r, 'POTION+1!', i === 0 ? 'twice the mending and +1 potion' : 'stronger mending and +1 potion']),
    apply: (E2, p) => { const mc = mileCount(p); E2.regenMult = (1 + p * 0.05) * Math.pow(2, mc); E2.potionMult = E2.regenMult; E2.potionCapBonus = mc; } },
];
// what the next milestone promises (the card's small print), or the drill's base note
export function nextMile(tr, p) { const m = tr.miles.find(([r]) => r > p); return m ? `At RANK ${m[0]}: ${m[2]}.` : 'The drill goes ever on.'; }
// a purchase lands: ranks become numbers the fight can use
export function applyTraining(id, ranks) {
  const keyed = {};
  TRACKS.forEach((tr, i) => { keyed[tr.id] = ranks[i] || 0; });
  E.training = keyed;
  for (const tr of TRACKS) tr.apply(E, keyed[tr.id]);
}
export function trainingStats() {
  return { dmgMult: E.dmgMult, hpMult: E.hpMult || 1, dmgReduce: E.dmgReduce || 0, roundMult: E.roundMult || 1,
           extraStrikes: E.extraStrikes || 0, strikeMult: E.strikeMult || 1, critBonus: E.critBonus || 0, critRange: E.critRange || 20,
           goldFind: E.goldFind || 1, regenMult: E.regenMult || 1, potionMult: E.potionMult || 1, potionCapBonus: E.potionCapBonus || 0,
           autoCollect: !!E.autoCollect, ranks: { ...E.training } };
}

// ---------- gear & inventory (Beat 7 loot, Beat 8 the Gear screen) ----------
export const GEAR_SLOTS = ['helm', 'armor', 'cloak', 'weapon', 'shield', 'boots', 'ring1', 'ring2', 'amulet', 'trinket'];
export const slotFamily = sl => (sl === 'ring1' || sl === 'ring2' ? 'ring' : sl);
export function itemPower(it) {
  if (!it) return 0;
  return (it.dmg || 0) * 6 + (it.toHit || 0) * 5 + (it.ac || 0) * 4 + (it.hp || 0) * 3 + (it.crit || 0) * 4 + (it.power || 0);
}
export function equippedForItem(it) {
  if (!it) return null;
  if (it.slot === 'ring') {
    const r1 = E.gear.ring1 ? E.inv.find(i => i.id === E.gear.ring1) : null;
    const r2 = E.gear.ring2 ? E.inv.find(i => i.id === E.gear.ring2) : null;
    if (!r1 || !r2) return null;
    return itemPower(r1) <= itemPower(r2) ? r1 : r2;
  }
  const id = E.gear[it.slot];
  return id ? E.inv.find(i => i.id === id) || null : null;
}
export function compareItem(it) {
  if (!it) return { delta: 0, worn: null, empty: true };
  if (it.equipped) return { delta: 0, worn: it, empty: false };
  const cur = equippedForItem(it);
  if (!cur) return { delta: itemPower(it), worn: null, empty: true };
  return { delta: itemPower(it) - itemPower(cur), worn: cur, empty: false };
}
export function addItem(item) {
  if (!E.inv.some(i => i.id === item.id)) E.inv.push({ equipped: false, seq: E.inv.length, ...item });
}
export function inventory() { return E.inv; }
export function gearState() { return { ...E.gear, hpBonus: E.hpBonus || 0 }; }
export function equipItem(id, s) {
  const it = E.inv.find(i => i.id === id);
  if (!it) return null;
  // rings share two fingers: take the free one, else the weaker / first
  let slot = it.slot;
  if (it.slot === 'ring') {
    if (!E.gear.ring1 || E.gear.ring1 === id) slot = 'ring1';
    else if (!E.gear.ring2 || E.gear.ring2 === id) slot = 'ring2';
    else {
      const r1 = E.inv.find(i => i.id === E.gear.ring1);
      const r2 = E.inv.find(i => i.id === E.gear.ring2);
      slot = itemPower(r1) <= itemPower(r2) ? 'ring1' : 'ring2';
    }
  }
  for (const sl of GEAR_SLOTS) if (E.gear[sl] === id) E.gear[sl] = null;   // it jumps fingers cleanly
  const prev = E.gear[slot];
  if (prev) { const p = E.inv.find(i => i.id === prev); if (p) p.equipped = false; }
  it.equipped = true;
  E.gear[slot] = id;
  E.hpBonus = E.inv.filter(i => i.equipped && i.hp).reduce((a, i) => a + i.hp, 0);
  if (s !== undefined) cue(s, 'equip');
  return it;
}
export function unequipSlot(slot, s) {
  const id = E.gear[slot];
  if (!id) return null;
  const it = E.inv.find(i => i.id === id);
  E.gear[slot] = null;
  if (it) it.equipped = false;
  E.hpBonus = E.inv.filter(i => i.equipped && i.hp).reduce((a, i) => a + i.hp, 0);
  if (s !== undefined) cue(s, 'equip');
  return it;
}
export function equipBest(s) {
  const changed = [];
  for (const sl of GEAR_SLOTS) {
    const fam = slotFamily(sl);
    const curId = E.gear[sl];
    const cur = curId ? E.inv.find(i => i.id === curId) : null;
    const curPow = cur ? itemPower(cur) : -1;
    const cands = E.inv.filter(i => i.slot === fam && (!i.equipped || i.id === curId))
      .sort((a, b) => itemPower(b) - itemPower(a) || (b.seq || 0) - (a.seq || 0));
    const best = cands[0];
    if (!best) continue;
    if (!cur || itemPower(best) > curPow) {
      if (best.id !== curId) {
        if (cur) cur.equipped = false;
        best.equipped = true;
        E.gear[sl] = best.id;
        changed.push(best);
      }
    }
  }
  if (changed.length) {
    E.hpBonus = E.inv.filter(i => i.equipped && i.hp).reduce((a, i) => a + i.hp, 0);
    if (s !== undefined) cue(s, 'equip');
  }
  return changed;
}

// ---------- level (Beat 9: the first level-up) ----------
export function heroLevel() { return E.level || 1; }
export function setLevel(n, s) {
  if (E.level === n) return;
  E.level = n;
  if (s !== undefined) cue(s, 'chime');
}

// ---------- coins ----------
function buildCoin() {
  const pal = P(['#4a2210', '#7e3e1c', '#b0602c', '#d98b47', '#f4b77a', '#ffe0b8']);
  return [7, 5, 2, 5].map((w) => {
    const r = new Raster(9, 9);
    if (w <= 2) { for (let y = 1; y < 8; y++) { r.set(4, y, pal[y < 3 ? 4 : 2]); } r.set(3, 3, pal[1]); r.set(3, 5, pal[1]); for (let y = 2; y < 7; y++) r.set(3, y, pal[1]); }
    else {
      r.ellipse(4, 4, w / 2, 3.5, (x, y, u, v) => ramp(pal, clamp(0.62 - (u + v) * 0.3), x, y, 0));
      if (w > 5) r.ellipse(4, 4, 1.8, 1.8, (x, y, u, v) => ramp(pal, clamp(0.4 - (u + v) * 0.2), x, y, 0));
      r.set(3, 2, pal[5]); r.set(2, 3, pal[4]);
    }
    return r.outline(C('#140b0c')).toCanvas();
  });
}
function coinPos(c, s, og) {
  const sx = c.ox, sy = ratGroundY(c.ox, og, c.depth) - 10;
  const gx = c.ox + c.spread, gy = ratGroundY(gx, og, c.depth) - 2;
  if (s < c.land) { const k = (s - c.spawn) / (c.land - c.spawn); return [lerp(sx, gx, k), lerp(sy, gy, k) - Math.sin(Math.PI * k) * c.h, 'air']; }
  if (s < c.land + 0.16) { const k = (s - c.land) / 0.16; return [gx, gy - Math.sin(Math.PI * k) * 4, 'bounce']; }
  if (c.roll !== undefined) {                                    // untapped too long: it wanders off to the burrow
    if (s >= c.gone) return [BURROW[0], gy, 'gone'];
    const k = clamp((s - c.roll) / (c.gone - c.roll)), e = easeIn(k);
    const x = lerp(gx, BURROW[0], e);
    return [x, ratGroundY(x, og, c.depth) - 2 - Math.abs(Math.sin(k * 10)) * 2.5 * (1 - k), 'roll'];
  }
  if (c.fly === undefined || s < c.fly) return [gx, gy, 'rest'];
  const k = clamp((s - c.fly) / (c.arrive - c.fly)), e = Math.pow(k, 1.7);
  const cx = gx + (PURSE_AT[0] - gx) * 0.3, cy = 36;      // up and over, never off the top of the screen
  const x = (1 - e) * (1 - e) * gx + 2 * (1 - e) * e * cx + e * e * PURSE_AT[0];
  const y = (1 - e) * (1 - e) * gy + 2 * (1 - e) * e * cy + e * e * PURSE_AT[1];
  return [x, y, 'fly'];
}
function drawCoinsGround(ctx, s, og) {
  for (const c of E.coins) {
    if (s < c.spawn) continue;
    if (c.fly !== undefined && s >= c.fly) continue;
    const [x, y, ph] = coinPos(c, s, og);
    if (ph === 'gone') continue;
    const f = ph === 'rest' ? 0 : Math.floor(s * (ph === 'roll' ? 30 : 18) + c.j) % 4;
    const gy = ratGroundY(x, og, c.depth) - 2;
    ctx.globalAlpha = 0.35; pxEllipse(ctx, x, gy + 3, ph === 'air' ? 2 : 3, 1, '#2a1a10'); ctx.globalAlpha = 1;
    ctx.drawImage(COIN[f], Math.round(x - 4), Math.round(y - 4));
    if (ph === 'rest') {
      const g = (s - c.land - 0.16) / 0.3; if (g > 0 && g < 1) { ctx.fillStyle = '#fff6dc'; ctx.fillRect(Math.round(x - 2 + g * 4), Math.round(y - 3 + g * 4), 1, 1); ctx.fillRect(Math.round(x - 1 + g * 4), Math.round(y - 3 + g * 4), 1, 1); }
      if (c.hold) {
        // the glint: a little four-point sparkle, quicker and hotter as the coin's patience runs out
        const left = c.expire - s, rate = left < 1.6 ? 8 : left < 3 ? 4 : 1.8;
        const gp = (s * rate + c.j * 0.61) % 1;
        if (gp < 0.3) {
          const k = gp / 0.3, R = 1 + easeOut(k) * 4.5, cx = Math.round(x), cy = Math.round(y);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9 - k * 0.7;
          ctx.fillStyle = left < 1.6 ? '#ffe9a0' : '#fff6dc';
          ctx.fillRect(cx - Math.round(R), cy, 1, 1); ctx.fillRect(cx + Math.round(R), cy, 1, 1);
          ctx.fillRect(cx, cy - Math.round(R), 1, 1); ctx.fillRect(cx, cy + Math.round(R), 1, 1);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, cy, 1, 1);
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
        if (left < 1 && left > 0) {                 // the fidgets: it shivers, eager to wander
          const d = Math.round(Math.sin(s * 40) * 1);
          ctx.drawImage(COIN[f], Math.round(x - 4) + d, Math.round(y - 4));
        }
      }
    }
    if (ph === 'roll') {                            // dust kicked up as it trundles off
      for (let k = 0; k < 3; k++) {
        const dk = (s * 7 + k * 0.33) % 1;
        ctx.globalAlpha = (1 - dk) * 0.5; ctx.fillStyle = '#d6bf94';
        ctx.fillRect(Math.round(x - 3 - dk * 6), Math.round(gy - 1 - dk * 3 - k), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}
function drawCoinsFlying(ctx, s, og) {
  for (const c of E.coins) {
    if (c.fly === undefined || s < c.fly || s >= c.arrive + 0.25) continue;
    if (s < c.arrive) {
      for (let k = 1; k <= 4; k++) { const [tx, ty] = coinPos(c, s - k * 0.025, og); ctx.globalAlpha = 0.5 - k * 0.1; ctx.fillStyle = k < 2 ? '#ffe0b8' : '#f4b77a'; ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1); }
      ctx.globalAlpha = 1;
      const [x, y] = coinPos(c, s, og);
      ctx.drawImage(COIN[Math.floor(s * 22 + c.j) % 4], Math.round(x - 4), Math.round(y - 4));
    } else {
      const k = (s - c.arrive) / 0.25;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffd49a';
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + c.j, R = 3 + 8 * easeOut(k); ctx.fillRect(Math.round(PURSE_AT[0] + Math.cos(a) * R), Math.round(PURSE_AT[1] + Math.sin(a) * R), 1, 1); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
}
function drawXPOrbs(ctx, s, og) {
  for (const o of E.orbs) {
    if (s < o.from || s >= o.arrive) continue;
    const k = (s - o.from) / (o.arrive - o.from);
    const sx = o.x, sy = o.y !== undefined ? o.y : ratGroundY(sx, og, o.depth) - 16;
    const tx = XP_BAR.x + XP_BAR.w * Math.min(1, o.cumXP / RULES.lvl2XP), ty = XP_BAR.y + 1;
    const cx = lerp(sx, tx, 0.5) - 30, cy = Math.min(sy, ty) - 40;
    const at = kk => { const ee = easeIn(kk) * 0.6 + kk * 0.4; return [(1 - ee) ** 2 * sx + 2 * (1 - ee) * ee * cx + ee * ee * tx, (1 - ee) ** 2 * sy + 2 * (1 - ee) * ee * cy + ee * ee * ty]; };
    ctx.globalCompositeOperation = 'lighter';
    for (let q = 1; q <= 5; q++) { const [qx, qy] = at(clamp(k - q * 0.03)); ctx.globalAlpha = 0.5 - q * 0.08; ctx.fillStyle = '#5fa8f0'; ctx.fillRect(Math.round(qx), Math.round(qy), 1, 1); }
    const [x, y] = at(k);
    ctx.globalAlpha = 1; ctx.fillStyle = '#9fd8ff'; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------- the d20 ----------
const DR = 13;
function buildD20() {
  const body = P(['#2e0810', '#4e1520', '#6e1e2c', '#922a38', '#b63a48', '#d8566a']);
  const gold = C('#f2c25a'), goldD = C('#b07a2a'), out = C('#140b0c');
  const frame = (rotDeg, grey) => {
    const r = new Raster(DR * 2 + 5, DR * 2 + 5), c = DR + 2;
    const rot = rotDeg * Math.PI / 180;
    const hex = [...Array(6)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3 + rot; return [c + Math.cos(a) * DR, c + Math.sin(a) * DR]; });
    const tri = [0, 1, 2].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 3 + rot; return [c + Math.cos(a) * DR * 0.56, c + Math.sin(a) * DR * 0.56]; });
    const inTri = (x, y) => { const sg = (p, q, rr) => (p[0] - rr[0]) * (q[1] - rr[1]) - (q[0] - rr[0]) * (p[1] - rr[1]); const P0 = [x, y]; const d1 = sg(P0, tri[0], tri[1]), d2 = sg(P0, tri[1], tri[2]), d3 = sg(P0, tri[2], tri[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    r.poly(hex, (x, y) => {
      if (inTri(x + 0.5, y + 0.5)) return ramp(body, 0.86 - (y - c) * 0.012, x, y, 0.4);
      const a = Math.atan2(y + 0.5 - c, x + 0.5 - c) - rot;
      const sector = Math.floor(((a + Math.PI / 2) / (Math.PI / 3) + 6.5)) % 6;
      return ramp(body, [0.62, 0.72, 0.42, 0.26, 0.18, 0.4][sector], x, y, 0.4);
    });
    const L = (p, q, col) => r.line(p[0], p[1], q[0], q[1], col);
    for (let i = 0; i < 6; i++) L(hex[i], hex[(i + 1) % 6], gold);
    for (let i = 0; i < 3; i++) L(tri[i], tri[(i + 1) % 3], gold);
    L(tri[0], hex[0], goldD); L(tri[0], hex[1], goldD); L(tri[0], hex[5], goldD);
    L(tri[1], hex[2], goldD); L(tri[1], hex[3], goldD); L(tri[2], hex[3], goldD); L(tri[2], hex[4], goldD);
    r.set(Math.round(hex[1][0]) - 1, Math.round(hex[1][1]), C('#fff1b8'));
    r.outline(out, false);
    if (grey) for (let i = 0; i < r.d.length; i++) if (r.d[i]) { const v = r.d[i]; const R = v & 255, G = (v >> 8) & 255, B = (v >> 16) & 255; const l = (R * 0.3 + G * 0.5 + B * 0.2) * 0.8 + 18; r.d[i] = ((255 << 24) | (Math.min(255, l + 6) << 16) | (Math.min(255, l) << 8) | Math.min(255, l + 2)) >>> 0; }
    return r.toCanvas();
  };
  return { spin: [0, 12, 24, 36, 48].map(a => frame(a)), still: frame(0), grey: frame(0, true) };
}

function drawD20(ctx, s, w, hx, hy) {
  const d = s - w.at;
  const linger = w.void ? 0.5 : w.linger;
  if (d < -0.62 || d > linger + 0.25) return;
  const cx = Math.round(hx), baseY = Math.round(hy - 104);
  const settle = -0.2;
  let y = baseY, img, n, numCol, shake = 0;
  if (d < settle) {
    const k = (d + 0.62) / (0.62 + settle);
    y = Math.round(baseY + 26 * (1 - easeOutBack(Math.min(1, k * 1.6))) - Math.sin(Math.PI * k) * 6);
    img = D20.spin[Math.floor(s * 30) % 5];
    n = 1 + Math.floor(hash(Math.floor(s * 20), 3) * 20);
    numCol = ['#d8b8a0', '#f4dcc4'];
  } else {
    const k = d - settle;
    y = baseY - Math.round(Math.max(0, 3 * Math.sin(Math.min(1, k / 0.16) * Math.PI)));
    img = w.hit ? D20.still : (k > 0.1 ? D20.grey : D20.still);
    n = w.roll;
    numCol = w.crit ? ['#ffd04a', '#ffffff'] : w.hit ? ['#fff4d8', '#ffffff'] : ['#c8c4cc', '#e8e4ec'];
    if (!w.hit && k > 0.1 && k < 0.4) shake = Math.round(Math.sin(k * 60) * 1.5);
    if (w.crit && k < 0.5) shake = Math.round(Math.sin(k * 80) * 1.5 * (1 - k / 0.5));
  }
  ctx.save(); ctx.translate(shake, 0);
  const fade = d > linger ? 1 - (d - linger) / 0.25 : 1;
  ctx.globalAlpha = clamp(fade);
  if (d >= settle && w.hit) {
    const k = (d - settle) / (w.crit ? 0.6 : 0.35);
    if (k < 1) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(fade) * (1 - k);
      ctx.fillStyle = w.crit ? '#ffcf4a' : '#ffd27a';
      const R = DR + 3 + (w.crit ? 18 : 10) * easeOut(k);
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(y + Math.sin(a) * R), 1, 1); }
      if (w.crit) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; for (let q = 0; q < 5; q++) ctx.fillRect(Math.round(cx + Math.cos(a) * (R + q)), Math.round(y + Math.sin(a) * (R + q)), 1, 1); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = clamp(fade);
    }
  }
  ctx.drawImage(img, cx - DR - 2, y - DR - 2);
  if (d >= settle && d < settle + 0.06) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * clamp(fade); ctx.drawImage(D20.still, cx - DR - 2, y - DR - 2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = clamp(fade); }
  num(ctx, String(n), cx, y - 3, numCol, 'c');
  if (d >= -0.12) {
    const k = clamp((d + 0.12) / 0.14);
    const word = w.crit ? 'CRIT!' : w.hit ? 'HIT' : w.fumble ? 'FUMBLE' : 'MISS';
    const ty = y + DR + 4 - Math.round((1 - easeOutBack(k)) * 4);
    num(ctx, word, cx, ty, w.hit ? ['#ffd877', '#fff4c8', '#e8a040'] : ['#a9a4b0', '#d4d0da'], 'c');
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- floating callouts ----------
function popText(ctx, s, at, str, x, y, col, scale, life = 0.9, rise = 14) {
  const d = s - at; if (d < 0 || d > life) return;
  const k = d / life;
  const r = Math.round(-rise * easeOut(k));
  const pop = d < 0.08 ? -Math.round(5 * (d / 0.08)) : d < 0.18 ? -5 + Math.round(5 * easeOut((d - 0.08) / 0.1)) : 0;
  ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
  num(ctx, str, x, y + r + pop, col, 'c', { scale });
  ctx.globalAlpha = 1;
}
const COL = {
  white: ['#ffffff', '#ffffff', '#d8d4e0'], gold: ['#ffd04a', '#ffffff', '#e8a030'], grey: ['#a9a4b0', '#d4d0da'],
  red: ['#ff5a4a', '#ffb0a0', '#c02a2a'], green: ['#6fe07a', '#d8ffd0', '#2f9a48'], xp: ['#8fd0ff', '#e0f4ff', '#4f90d8'],
  yellow: ['#ffe14a', '#fff8c8', '#e0a020'], ward: ['#c6a8ff', '#f0e8ff', '#7a5ad8'],
};

// the shout bubble: a spiky yellow burst with the word in it
function buildShout(word) {
  const tw = numWidth(word), w = tw + 16, h = 19;
  const [c, x] = makeCanvas(w + 4, h + 9);
  const cx = (w + 4) / 2, cy = h / 2 + 1, rx = w / 2, ry = h / 2;
  const inside = (i, j) => {
    const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, a = Math.atan2(dy, dx);
    const spike = 0.86 + 0.16 * Math.pow(Math.max(0, Math.cos(a * 6 + 0.4)), 3);
    if (dx * dx + dy * dy <= spike * spike) return true;
    // tail toward the speaker (down-left)
    const tx = i - (cx - rx * 0.45), ty = j - (cy + ry * 0.55);
    return ty >= 0 && ty < 7 && tx <= 2 - ty * 0.2 && tx >= -ty * 0.9;
  };
  for (let j = 0; j < h + 9; j++) for (let i = 0; i < w + 4; i++) {
    if (!inside(i, j)) continue;
    const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
    x.fillStyle = edge ? '#3a1408' : j < cy - ry * 0.45 ? '#fff4a8' : j > cy + ry * 0.4 ? '#f0a62a' : '#ffd84a';
    x.fillRect(i, j, 1, 1);
  }
  num(x, word, Math.round(cx), Math.round(cy - 3), ['#8a1a10', '#c8381e'], 'c', { outline: null });
  return c;
}

// ---------- spotlight ----------
export function buildSpot(r0, ramp_, sx) {
  const w = 1280, h = 720, [c, x] = makeCanvas(w, h), id = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (i - w / 2) / sx, dy = j - h / 2, r = Math.hypot(dx, dy);
    const v = clamp((r - r0) / ramp_);
    const lvl = Math.floor(v * 4 + bayer(i, j)) / 4;
    const o = (j * w + i) * 4; id.data[o] = 8; id.data[o + 1] = 5; id.data[o + 2] = 18; id.data[o + 3] = Math.round(clamp(lvl) * 255);
  }
  x.putImageData(id, 0, 0);
  return c;
}

// ---------- public drawing API ----------
export function combatShake(t) {
  const s = warp(t);
  let amp = 0;
  for (const w of E.swings) if (w.hit && !w.void) {
    const d = t - w.at;
    const dur = w.launch ? 0.55 : w.crit ? 0.4 : 0.26, a0 = w.launch ? 5 : w.crit ? 3.6 : 2.2;
    if (d >= 0 && d < dur) amp = Math.max(amp, a0 * (1 - d / dur));
  }
  for (const b of E.bites) if (b.hit && !b.void) { const d = s - b.at; if (d >= 0 && d < 0.18) amp = Math.max(amp, 1.2 * (1 - d / 0.18)); }
  for (const cs of E.strikes) { const d = s - cs.at; if (d >= 0 && d < 0.08) amp = Math.max(amp, 0.8); }
  if (amp < 0.3) return [0, 0];
  const f = Math.floor(t * 60);
  return [Math.round((hash(f, 1) - 0.5) * 2 * amp), Math.round((hash(f, 2) - 0.5) * 2 * amp)];
}

// world layer: drawn right after the hero (rats stand a step closer to the camera)
export function drawCombatWorld(ctx, p, t, hero) {
  if (t < E.rats[0].burst - 0.01) return;
  const s = warp(t), og = off(p, F.ground);
  for (const r of E.rats) if (!r.gob) burstFX(ctx, s, r, og);
  for (const g of E.rats) if (g.gob) hedgeFX(ctx, s, g, og);
  drawCoinsGround(ctx, s, og);
  const live = E.rats.filter(r => !r.gob && s >= r.burst && !(r.popAt <= s)).sort((a, b) => a.depth - b.depth);
  for (const r of live) {
    const st = ratState(r, s, og); if (!st) continue;
    runDust(ctx, s, r, og);
    landDust(ctx, s, st.x, st.gy, r.landT);
    const img = ratImg(st), X = Math.round(st.x) - RAT_CX, Y = Math.round(st.y) - RAT_FEET;
    if (!st.emerge) {
      castShadow(ctx, pick(RSIL, st), X, Math.round(st.gy), RAT_FEET, { lean: -0.7, squash: 0.3, alpha: 0.3 * (1 - st.air * 0.6) });
      pxEllipse(ctx, Math.round(st.x) - 2, Math.round(st.gy), Math.round(11 - st.air * 4), 2, 'rgba(40,28,16,0.34)');
    }
    if (st.emerge) { ctx.save(); ctx.beginPath(); ctx.rect(X - 20, 0, 120, st.emerge); ctx.clip(); }
    // a gold glow round a rat under the mouse (or the one the tutorial wants clicked)
    const glow = UI.hover === r.id ? 1 : UI.pulse === r.id ? UI.pulseK : 0;
    if (glow > 0.05 && !st.emerge) {
      ctx.globalAlpha = glow; const g = pick(RGLOW, st);
      ctx.drawImage(g, X - 1, Y); ctx.drawImage(g, X + 1, Y); ctx.drawImage(g, X, Y - 1); ctx.drawImage(g, X, Y + 1);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, X, Y);
    if (st.flash) { ctx.globalAlpha = st.flash; ctx.drawImage(RAT.flash, X, Y); ctx.globalAlpha = 1; }
    if (st.emerge) ctx.restore();
    ratHPBar(ctx, r, s, st);
  }
  // goblins: peeking, vaulting, scuttling, stabbing
  const gstat = E.rats.filter(r => r.gob).sort((a, b) => a.depth - b.depth);
  for (const g of gstat) {
    const st = gobState(g, s, og); if (!st) continue;
    const set = g.snik ? SNIK : GOB, sil = g.snik ? SSIL : GSIL, glo = g.snik ? SGLOW : GGLOW;
    if (st.peek) { ctx.drawImage(set.peek, Math.round(st.x - 7), Math.round(st.y)); continue; }
    landDust(ctx, s, st.x, st.gy, g.landT);
    const img = gobImg(st), X = Math.round(st.x) - GOB_CX, Y = Math.round(st.y) - GOB_FEET;
    castShadow(ctx, pick(sil, st), X, Math.round(st.gy), GOB_FEET, { lean: -0.7, squash: 0.3, alpha: 0.3 * (1 - st.air * 0.6) });
    pxEllipse(ctx, Math.round(st.x) - 2, Math.round(st.gy), Math.round(9 - st.air * 4), 2, 'rgba(40,28,16,0.34)');
    if (st.img === 'leap' && st.over) {                                    // still clearing the coping: dust the wall top
      const k = (s - g.leap) / GOB_LEAP;
      ctx.globalAlpha = 0.4 * (1 - k); ctx.fillStyle = '#c2a57a';
      for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(g.wallX - 6 + i * 4 + k * 8), Math.round(WALL_TOP + 1 + i % 2), 1, 1);
      ctx.globalAlpha = 1;
    }
    const glow = UI.hover === g.id ? 1 : UI.pulse === g.id ? UI.pulseK : 0;
    if (glow > 0.05) {
      ctx.globalAlpha = glow; const gl = pick(glo, st);
      ctx.drawImage(gl, X - 1, Y); ctx.drawImage(gl, X + 1, Y); ctx.drawImage(gl, X, Y - 1); ctx.drawImage(gl, X, Y + 1);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, X, Y);
    if (st.flash) { ctx.globalAlpha = st.flash; ctx.drawImage(set.flash, X, Y); ctx.globalAlpha = 1; }
    if (!st.air || st.air < 0.05) ratHPBar(ctx, g, s, st);
  }
  for (const g of gstat) { drawLaunch(ctx, s, g); drawStar(ctx, s, g); if (g.helm) drawHelm(ctx, s, g, og); }
  for (const w of E.swings) if (w.hit && !w.void && w.rat >= 0) {
    const r = E.rats[w.rat], x = r.dieAt === w.at ? r.deathX : baseX(r, w.at).x;
    impact(ctx, s, w.at, x - 6, ratGroundY(x, og, r.depth) - (r.gob ? 16 : 10), w.crit ? 1.4 : 1);
  }
  for (const r of E.rats) if (r.dieAt !== undefined && !r.launched) (r.gob ? gobPuff : furPuff)(ctx, s, r, r.deathX + 8, ratGroundY(r.deathX + 8, og, r.depth));
  for (const cs of E.strikes) { if (s < cs.at || s > cs.at + 0.25) continue; const r = E.rats[cs.rat], x = baseX(r, cs.at).x; csSlash(ctx, s, cs, x - 4, ratGroundY(x, og, r.depth) - (r.gob ? 16 : 11)); }
  drawReticle(ctx, s, og);
  if (hero) for (const w of E.swings) smear(ctx, s, w, Math.round(hero.x + HERO_SHOULDER[0]), Math.round(hero.y + HERO_SHOULDER[1]));
}

// the spotlight that singles out the hero as the fight begins
export function drawSpotlight(ctx, p, t, hero) {
  if (t < CB.spot[0] || t > CB.spot[1] || !hero) return;
  const k = inv(CB.spot[0], CB.spot[0] + 0.35, t) * (1 - inv(CB.spot[1] - 0.5, CB.spot[1], t));
  ctx.globalAlpha = 0.58 * easeOut(k);
  ctx.drawImage(SPOT, Math.round(hero.cx - 640), Math.round(hero.cy - 360));
  ctx.globalAlpha = 1;
}

// overlay: above the HUD — the die, damage numbers, coins in flight, xp motes, the hero's shouts
export function drawCombatOverlay(ctx, p, t, hero) {
  if (t < E.rats[0].burst) return;
  const s = warp(t), og = off(p, F.ground);
  if (hero) for (const w of E.swings) drawD20(ctx, s, w, hero.cx, hero.feet);
  for (const w of E.swings) {
    if (w.void || w.rat < 0 || !w.hit) continue;
    const r = E.rats[w.rat], rx = r.dieAt === w.at ? r.deathX : baseX(r, w.at).x, ry = ratGroundY(rx, og, r.depth) - (r.gob ? 54 : 44);
    popText(ctx, s, w.at, String(w.dmg), rx + 12, ry, w.crit ? COL.gold : COL.white, w.crit ? 3 : 2, w.crit ? 1.3 : 1.0);
  }
  // Command Strike numbers: small and yellow, fanned out so a flurry of clicks stays readable
  for (const cs of E.strikes) {
    const r = E.rats[cs.rat], x = baseX(r, cs.at).x;
    popText(ctx, s, cs.at, String(cs.dmg), x + 2 + (hash(cs.n, 4) - 0.5) * 16, ratGroundY(x, og, r.depth) - (r.gob ? 42 : 34) - hash(cs.n, 5) * 6, COL.yellow, 1, 0.7, 12);
  }
  if (hero) {
    for (const b of E.bites) {
      if (b.void || !b.hit) continue;
      if (b.dmg > 0) popText(ctx, s, b.at, '-' + b.dmg, hero.cx - 20, hero.feet - 52, COL.red, 2, 0.95);
      else if (b.ward) popText(ctx, s, b.at, 'WARD', hero.cx - 20, hero.feet - 52, COL.ward, 1, 1.0);
      if (b.ward) drawWard(ctx, s, b.at, hero);
    }
    for (const h of E.heals) {
      if (!h.passive) popText(ctx, s, h.at, '+' + h.amt, hero.cx - 14, hero.feet - 58, COL.green, 1, 0.8, 10);
      healMotes(ctx, s, h.at, hero);
    }
    drawShouts(ctx, s, hero);
  }
  for (const r of E.rats) if (r.popAt !== undefined) {
    const xpX = r.launched ? Math.min(W - 34, r.deathX + 290) : r.deathX + 24;
    const xpY = r.launched ? 82 : ratGroundY(r.deathX, og, r.depth) - (r.gob ? 26 : 18);
    popText(ctx, s, r.popAt + 0.55, '+' + (r.xp || RULES.ratXP) + ' XP', xpX, xpY, COL.xp, 1, 1.0);
  }
  drawXPOrbs(ctx, s, og);
  drawCoinsFlying(ctx, s, og);
}

// "HA!": the shout bubble pops over the hero's shoulder, and rings of sound ripple toward the rat
function drawShouts(ctx, s, hero) {
  let last = null; for (const cs of E.strikes) if (cs.at - 0.05 <= s && s < cs.at + 0.55) last = cs;
  if (!last) return;
  const d = s - (last.at - 0.05);
  const img = SHOUT[last.word] || SHOUT['HA!'];
  const k = easeOutBack(clamp(d / 0.12)), fade = d > 0.4 ? 1 - (d - 0.4) / 0.2 : 1;
  const w = Math.max(2, Math.round(img.width * k)), h = Math.max(2, Math.round(img.height * k));
  const ax = hero.cx + 6, ay = hero.feet - 70 - Math.round(d * 10);
  ctx.globalAlpha = clamp(fade);
  ctx.drawImage(img, Math.round(ax - img.width * 0.2 * k), Math.round(ay - h), w, h);
  ctx.globalAlpha = 1;
  // sound rings from the hero's mouth
  for (const cs of E.strikes) {
    const dd = s - (cs.at - 0.05); if (dd < 0 || dd > 0.26) continue;
    const mx = hero.cx + 8, my = hero.feet - 60;
    for (let q = 0; q < 3; q++) {
      const R = 4 + q * 4 + dd * 60; ctx.globalAlpha = (1 - dd / 0.26) * (0.9 - q * 0.25); ctx.fillStyle = '#ffe680';
      for (let a = -0.7; a <= 0.7; a += 0.12) ctx.fillRect(Math.round(mx + Math.cos(a) * R), Math.round(my + Math.sin(a) * R), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}
function healMotes(ctx, s, at, hero) {
  const d = s - at; if (d < 0 || d > 0.7) return;
  for (let i = 0; i < 5; i++) {
    const x = hero.cx - 10 + hash(i, at * 7) * 20, y = hero.feet - 10 - hash(i, at * 7 + 1) * 40 - d * 30;
    ctx.globalAlpha = (1 - d / 0.7) * 0.9; ctx.fillStyle = i % 2 ? '#9cf0a0' : '#e0ffd8';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1); if (i % 2 === 0) { ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
  }
  ctx.globalAlpha = 1;
}
// Mystra's patience: a shimmering violet shell soaks up the blow
function drawWard(ctx, s, at, hero) {
  const d = s - at; if (d < 0 || d > 0.6) return;
  const k = d / 0.6, cx = hero.cx, cy = hero.feet - 30;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const a = i / 90 * Math.PI * 2, R = 26 + k * 4;
    if (bayer(i, Math.floor(s * 30)) > 1 - k * 0.8) continue;
    ctx.globalAlpha = (1 - k) * 0.9; ctx.fillStyle = i % 3 ? '#b49aff' : '#e8dcff';
    ctx.fillRect(Math.round(cx + Math.cos(a) * R * 0.8), Math.round(cy + Math.sin(a) * R), 1, 1);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// hero anchor helpers for the draw calls in main.js
export function heroFrameBox(x, feetY) { return { x, y: feetY - HERO_FEET, cx: x + HERO_CX, cy: feetY - 34, feet: feetY }; }
