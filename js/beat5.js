// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 5 — Goblins! (and the scheduled miracle)
//
//  Three Goblin Minions vault the dry-stone wall, one at a time,
//  helmets wobbling, sacks of stolen veg bouncing. The fight runs
//  by the book (2.4 s rounds, d20 + 5 vs AC 12, daggers at 1d4) —
//  except the dice have plans for the goblin the hero meets second
//  (the middle one of the three): the first swing that would land on
//  him is a scripted NATURAL 20. Double damage dice, a CRITICAL!
//  stamp, a bigger shake, and the goblin is punted skyward,
//  dwindles to a speck, and goes off with a twinkle and a "ding"
//  like a struck star. His helmet, left behind, spins in the air
//  a moment, then clatters to the grass.
//
//  All goblins die the goblin way: a green puff, the helm spinning
//  off to clatter and lie in the grass a while, and 4–8 copper that
//  rest on the ground for the player to tap (short fuse — 6.5 s).
//
//  Everything runs in fixed 1/120 s steps on the fight's clock, the
//  same as Beat 2; replays rebuild the store and rerun the steps.
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, lineEnd } from './timeline.js';
import { F, off } from './world.js';
import * as cb from './combat.js';
import * as beat4 from './beat4.js';
import { mulberry, clamp, easeOut, easeOutBack } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const DT = 1 / 120;
const FUSE = 6.5;                     // goblin copper is impatient
let D = null;

export function buildBeat5() {}       // all art is built in combat.buildCombat

export function reset(seed = 31) {
  D = { s: null, seed, rng: mulberry(seed), startAt: null, gobs: [], round: null,
        critDone: false, critAt: null, line10: false, line11: false, doneAt: null, lastS: null };
}
reset();

export function debug() {
  if (!D) return null;
  return { s: D.s === null ? null : +D.s.toFixed(2), start: D.startAt,
    gobs: D.gobs.map(g => ({ id: g.id, hp: cb.E && cb.E.rats.includes(g) ? cb.ratHP(g, D.s || 0) : '?', dead: g.dieAt !== undefined, launched: !!g.launched })),
    critAt: D.critAt, done: D.doneAt };
}
export function goblinPoints(t) {
  if (!D || !D.gobs.length) return [];
  const s = cb.warp(t), og = off(1, F.ground);
  return D.gobs.filter(g => cb.ratAlive(g, s)).map(g => {
    const st = cb.gobState(g, s, og);
    return { id: g.id, x: Math.round(st.x - 2), y: Math.round((st.gy || st.y) - 16), hp: cb.ratHP(g, s) };
  });
}
export function wantsGoblins(t) { return !!D && D.startAt !== null && aliveNow(cb.warp(t)).length > 0; }
export function started() { return !!D && D.startAt !== null; }

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}
const aliveNow = s => D.gobs.filter(g => g.dieAt === undefined && s >= g.landT);

// ---------- the setup: three of them, over the wall ----------
function startBeat(s) {
  D.startAt = s;
  const defs = [
    { tel: s + 0.60, wallX: 430, landX: 422, coins: 5, depth: 2 },
    { tel: s + 2.00, wallX: 502, landX: 494, coins: 6, depth: -2 },
    { tel: s + 3.40, wallX: 556, landX: 548, coins: 4, depth: 3 },
  ];
  D.gobs = defs.map((d, i) => {
    const g = cb.addGoblin({ ...d, leap: d.tel + 0.55, b5: i, holdCoins: true, wary: true });
    g.slot = i;
    const arrive = cb.SLOT[Math.min(i, 1)] + (i === 2 ? 36 : 0);
    g.meleeAt = cb.moveRat(g, g.landT + 0.15, arrive, { speed: 185 });
    return g;
  });
}

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  const s = cb.warp(t);
  // the combat store was rebuilt under us (replay / scrub) — start the beat over
  if (D.startAt !== null && (!cb.E || !cb.E.rats.includes(D.gobs[0]))) reset(D.seed);
  D.lastS = s;
  if (D.startAt === null) {
    const b4 = beat4.debug();
    if (b4 && b4.done !== null && s >= b4.done + 1.2 && !busyLine(s)) startBeat(s);   // the quota interlude settles first
    else return;
  }
  if (D.s === null) D.s = Math.max(0, D.startAt);
  if (s < D.s) return;        // scrubbed back with the store intact: the future is already written
  while (D.s + DT <= s) { D.s += DT; tick(D.s); }
}

function tick(s) {
  if (!D.line10 && s >= D.startAt + 0.85) { D.line10 = true; say('line10', s); }
  // the hero's round begins once the first goblin has both feet in the meadow
  if (!D.round && !D.doneAt && D.gobs.some(g => s >= g.landT)) startRound(s, s + 0.85);
  heroTurn(s);
  gobTurns(s);
  // goblin copper gets its own short fuse as it lands (Beat 3's countdown is long spent)
  for (const c of cb.E.coins) {
    if (!c.gob || !c.hold || c.armed || c.fly !== undefined || c.roll !== undefined) continue;
    if (s >= c.land) { c.armed = true; c.expire = c.land + FUSE + c.j * 0.4; }
  }
  // the proud line, once the star has sung and Elminster has a gap between words
  if (!D.line11 && D.critAt !== null && s >= D.critAt + 1.7 && !busyLine(s)) { D.line11 = true; say('line11', s); }
  if (!D.doneAt && D.gobs.length && D.gobs.every(g => g.popAt !== undefined && s >= g.popAt)) D.doneAt = s;
}

function startRound(t0, at) { D.round = { t0, full: at, at }; cb.E.rounds.push(D.round); }

// the hero's turn: roll 0.62 s ahead (so the die can tumble), pick the target 0.3 s ahead —
// unless the fated one is in the blade's path, in which case the die has already chosen
function heroTurn(s) {
  const rd = D.round; if (!rd) return;
  if (!rd.sw && s >= rd.at - 0.62) {
    const live = aliveNow(s);
    if (!live.length) { rd.at = s; D.round = null; return; }
    if (!live.some(r => r.meleeAt <= rd.at - 0.05)) {
      const eta = Math.min(...live.map(r => r.meleeAt));
      rd.at = isFinite(eta) ? Math.max(rd.at, eta + 0.35) : s + 0.7;   // hold, sword up, until something's in reach
      return;
    }
    const guess = cb.chooseTarget(s, rd.at);
    const fated = D.gobs[1];                                   // the second one the hero will meet
    const fatedDead = fated.dieAt !== undefined;
    const fatedOk = !fatedDead && fated.meleeAt <= rd.at + 0.02;               // in the blade's path?
    // the crit waits for him — unless the player's taps got him first, in which case fate picks another
    const isCrit = !D.critDone && guess >= 0 && ((fatedOk && guess === fated.id) || (fatedDead && cb.E.rats[guess].gob));
    const roll = isCrit ? 20 : 1 + Math.floor(D.rng() * 20);
    const dice = isCrit ? [6, 5, 6, 5] : Array.from({ length: roll === 20 ? 4 : 2 }, () => 1 + Math.floor(D.rng() * 6));
    rd.sw = cb.addSwing({ at: rd.at, rat: -1, roll, dice, live: true, ...(isCrit ? { launch: true, linger: 1.7 } : {}) });
    if (isCrit) { rd.sw.rat = fatedOk ? fated.id : guess; D.critAt = rd.at; D.critDone = true; }
  }
  const sw = rd.sw; if (!sw) return;
  if (sw.rat < 0 && !sw.void && s >= sw.at - 0.3) {
    sw.rat = cb.chooseTarget(s, sw.at);
    if (sw.rat < 0) cb.voidSwing(sw);
    else sw.lunge = clamp(cb.baseX(cb.E.rats[sw.rat], sw.at).x - cb.SLOT[0], 0, 30);   // he steps in to reach the one behind
  }
  if (!sw.applied && s >= sw.at) {
    sw.applied = true;
    if (!sw.void) {
      const r = cb.E.rats[sw.rat];
      if (!r || r.dieAt !== undefined) { const n = cb.chooseTarget(s, sw.at); if (n >= 0) sw.rat = n; else cb.voidSwing(sw); }
      if (!sw.void && sw.hit) {
        const tgt = cb.E.rats[sw.rat];
        cb.damageRat(tgt, sw.at, sw.dmg, { kind: 'swing', sw, launch: sw.launch && tgt && !!tgt.gob });
      }
    }
    const left = aliveNow(s).filter(r => isFinite(r.meleeAt));
    D.round = null;
    if (left.length) startRound(sw.at, sw.at + cb.RULES.round);
  }
}

// each goblin in the line stabs on its own, slower clock; the line shuffles up as the front falls
function gobTurns(s) {
  const live = aliveNow(s);
  for (const g of live) {
    if (!(g.meleeAt <= s + 0.3) || g.slot > 1) continue;               // the third one waits his turn, hopping
    if (g.nextBite === undefined) g.nextBite = g.meleeAt + 0.7 + D.rng() * 0.5;
    if (s >= g.nextBite - 0.3) {
      const at = g.nextBite;
      cb.addBite({ at, rat: g.id, roll: 1 + Math.floor(D.rng() * 20), dmg: 1 + Math.floor(D.rng() * 4) });
      g.nextBite = at + cb.RULES.gobRound + D.rng() * 0.4 - 0.15;
    }
  }
  for (const target of [0, 1]) {
    if (live.some(g => g.slot === target)) continue;
    const next = live.filter(g => g.slot > target).sort((a, b) => a.slot - b.slot)[0];
    if (next) { next.slot = target; next.meleeAt = cb.moveRat(next, s + 0.12, cb.SLOT[target], { speed: 140 }); }
  }
}

// the stage is over when the goblins are gone and the moral has been delivered
export function finished(t) {
  if (!D || D.doneAt === null) return false;
  const s = cb.warp(t);
  return s > D.doneAt + 3 && (D.line11 === false || s > lineEnd(DIALOGUE.line11) + 1.0);
}

// ---------- overlays ----------
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.startAt === null) return;
  const s = cb.warp(t);
  drawBanner(ctx, s);
  drawStamp(ctx, s);
}

// the objective tag under Elminster's box: THUMP THE GOBLINS! until they're all thumped
function drawBanner(ctx, s) {
  if (!D.line10) return;
  const at = DIALOGUE.line10.at;
  if (s < at + 0.4) return;
  const done = D.doneAt, out = done !== null ? s - done : -1;
  if (out > 1.4) return;
  const label = done !== null ? 'THUMPED!' : 'THUMP THE GOBLINS!';
  const w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - at - 0.4) / 0.3)), gone = out > 0.9 ? easeOut((out - 0.9) / 0.5) : 0;
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8 - gone * 10);
  ctx.globalAlpha = clamp(k) * (1 - gone);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = done !== null ? '#3c6a2a' : '#2e4a12'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = done !== null ? '#5c9a40' : '#527436'; ctx.fillRect(X, Y, w, 1);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
  const bx = X + 7, by = Y + 7;
  if (done !== null) { ctx.fillStyle = '#d8ffb0'; [[-2, 0], [-1, 1], [0, 2], [1, 1], [2, 0], [3, -1], [4, -2]].forEach(([dx, dy]) => ctx.fillRect(bx + dx - 1, by + dy - 1, 2, 2)); }
  else { ctx.fillStyle = '#9cc468'; ctx.fillRect(bx - 2, by - 2, 4, 4); ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 3, by - 3, 1, 1); ctx.fillRect(bx + 1, by - 3, 1, 1); }
  num(ctx, label, X + 13, Y + 4, done !== null ? ['#e8ffd0', '#ffffff'] : ['#e4f0b8', '#ffffff'], 'l');
  ctx.globalAlpha = 1;
}

// the CRITICAL! stamp: slams into the airspace over the fight, holds, and lifts away
function drawStamp(ctx, s) {
  if (D.critAt === null) return;
  const d = s - D.critAt - 0.06;
  if (d < 0 || d > 1.55) return;
  const k = easeOutBack(clamp(d / 0.16));
  const word = 'CRITICAL!';
  const w = numWidth(word) * 3;
  const jit = d < 0.3 ? Math.round((Math.sin(d * 90) * (1 - d / 0.3)) * 2) : 0;
  const x = Math.round(320 - w / 2) + jit, y = 148 - Math.round((1 - k) * 26);
  const fade = d > 1.15 ? 1 - (d - 1.15) / 0.4 : 1;
  ctx.globalAlpha = clamp(fade);
  if (d < 0.22) {                                   // the flash as it lands
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(fade) * (1 - d / 0.22);
    const R = 12 + easeOut(d / 0.22) * 44;
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.fillStyle = '#ffcf4a'; ctx.fillRect(Math.round(320 + Math.cos(a) * R), Math.round(158 + Math.sin(a) * R * 0.35), 1, 1); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(fade);
  }
  num(ctx, word, x, y, ['#ffd04a', '#fff8dc', '#c87818'], 'l', { scale: 3 });
  if (d < 0.1) num(ctx, word, x, y, ['#ffffff', '#ffffff'], 'l', { scale: 3, outline: null, shadow: false });
  ctx.globalAlpha = 1;
}
