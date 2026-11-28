// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 4 — the Quota Bar (a pause to point at it).
//
//  The meadow is quiet: four foes down, six to go. Elminster draws
//  the player's eye to the stage sign hanging at the top: a spotlight
//  falls on it (the world and the rest of the HUD dim; the dialogue
//  box stays lit), the four filled pockets ripple with a gold wave,
//  and a little chevron bobs beneath the quota, pointing up at it.
//
//  Then the lesson proves itself: two more Giant Rats burst from the
//  grass and are fought down by the book (auto-combat; the player may
//  tap along), and the sign ticks 5/10 … 6/10 for all to see. Only
//  when both rats are pocketed does Beat 5's assault begin — the
//  goblins bring it to 9/10, and Snikkit (Beat 7) completes the ten.
//
//  The director runs in fixed 1/120 s steps on the fight's clock,
//  the same as Beats 2 and 5.
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat3 from './beat3.js';
import { mulberry, clamp, inv, easeOut } from './util.js';

const DT = 1 / 120;

// the stage sign's quota track (hud.js): ten pockets from x 268, each 9 px wide, at y 21
const SIGN = { x: 228, y: 0 }, SEG0 = 40, SEGW = 9;
const POCK = i => ({ x: SIGN.x + SEG0 + i * SEGW, y: SIGN.y + 21, w: SEGW - 1, h: 7 });

let D = null, SPOT4 = null;
export function buildBeat4() { SPOT4 = cb.buildSpot(26, 26, 4.2); }    // a wide soft hole around the sign

export function reset(seed = 53) {
  D = { lineAt: null, doneAt: null, lastS: null, s: null, seed, rng: mulberry(seed),
        spawnAt: null, rats: [], round: null, roundUp: false };
}
reset();

function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}
export function debug() {
  if (!D) return null;
  return { lineAt: D.lineAt, done: D.doneAt,
    rats: D.rats.map(r => ({ id: r.id, hp: cb.E && cb.E.rats.includes(r) && D.s !== null ? cb.ratHP(r, D.s) : '?', dead: r.dieAt !== undefined })) };
}
export function started() { return !!D && D.lineAt !== null; }

// ---------- the interlude: two more rats, so the bar can prove itself ----------
function spawn() {
  const A = cb.addRat({ burst: D.spawnAt, landX: 452, depth: 2, coins: 3, holdCoins: true, wary: true, b4: 0 });
  A.meleeAt = cb.moveRat(A, A.landT + 0.1, cb.SLOT[0], { dur: 1.8 }); A.slot = 0;
  const B = cb.addRat({ burst: D.spawnAt + 0.8, landX: 486, depth: -2, coins: 2, holdCoins: true, wary: true, b4: 1 });
  B.meleeAt = cb.moveRat(B, B.landT + 0.15, cb.SLOT[1], { dur: 1.8 }); B.slot = 1;
  D.rats = [A, B];
}
const alive = s => D.rats.filter(r => r.dieAt === undefined && s >= r.landT);
function startRound(t0, at) { D.round = { t0, full: at, at }; cb.E.rounds.push(D.round); }

// the hero's turn: the same by-the-book fencing as Beat 5, minus the scheduled miracle
function heroTurn(s) {
  const rd = D.round; if (!rd) return;
  if (!rd.sw && s >= rd.at - 0.62) {
    const live = alive(s);
    if (!live.length) { rd.at = s; D.round = null; return; }
    if (!live.some(r => r.meleeAt <= rd.at - 0.05)) {
      const eta = Math.min(...live.map(r => r.meleeAt));
      rd.at = isFinite(eta) ? Math.max(rd.at, eta + 0.35) : s + 0.7;   // hold, sword up, until something's in reach
      return;
    }
    const roll = 1 + Math.floor(D.rng() * 20);
    const dice = Array.from({ length: roll >= (cb.E.critRange || 20) ? 4 : 2 }, () => 1 + Math.floor(D.rng() * 6));
    rd.sw = cb.addSwing({ at: rd.at, rat: -1, roll, dice, live: true });
  }
  const sw = rd.sw; if (!sw) return;
  if (sw.rat < 0 && !sw.void && s >= sw.at - 0.3) {
    sw.rat = cb.chooseTarget(s, sw.at);
    if (sw.rat < 0) cb.voidSwing(sw);
    else sw.lunge = clamp(cb.baseX(cb.E.rats[sw.rat], sw.at).x - cb.SLOT[0], 0, 30);
  }
  if (!sw.applied && s >= sw.at) {
    sw.applied = true;
    if (!sw.void) {
      const r = cb.E.rats[sw.rat];
      if (!r || r.dieAt !== undefined) { const n = cb.chooseTarget(s, sw.at); if (n >= 0) sw.rat = n; else cb.voidSwing(sw); }
      if (!sw.void && sw.hit) cb.damageRat(cb.E.rats[sw.rat], sw.at, sw.dmg, { kind: 'swing', sw });
    }
    const leftInReach = alive(s).some(r => r.meleeAt <= s + 0.05);
    D.round = null;
    if (leftInReach) startRound(sw.at, sw.at + cb.RULES.round * (cb.E.roundMult || 1));
  }
}

// each rat in reach bites on its own, quicker clock (with Pack Tactics Advantage when 2+ rats engage)
function ratTurns(s) {
  const live = alive(s);
  for (const r of live) {
    if (!(r.meleeAt <= s + 0.3)) continue;
    if (r.nextBite === undefined) r.nextBite = r.meleeAt + 0.55 + D.rng() * 0.5;
    if (s >= r.nextBite - 0.3) {
      const at = r.nextBite;
      const roll = cb.hasPackTactics(r, at)
        ? Math.max(1 + Math.floor(D.rng() * 20), 1 + Math.floor(D.rng() * 20))
        : 1 + Math.floor(D.rng() * 20);
      cb.addBite({ at, rat: r.id, roll, dmg: 1 + Math.floor(D.rng() * 2) });
      r.nextBite = at + cb.RULES.ratRound + D.rng() * 0.4 - 0.15;
    }
  }
  const front = live.find(r => r.slot === 0);
  if (!front) for (const r of live) if (r.slot === 1 && r.meleeAt <= s) { r.slot = 0; cb.moveRat(r, s + 0.15, cb.SLOT[0], { speed: 110 }); }
}

function tick(s) {
  if (!D.rats.length) return;
  const inReach = alive(s).some(r => r.meleeAt <= s + 0.05);
  if (!D.round && inReach && D.rats.some(r => r.dieAt === undefined)) startRound(s, s + cb.RULES.round * (cb.E.roundMult || 1));
  if (D.round && !D.round.sw && !inReach) { D.round.t0 += DT; D.round.full += DT; D.round.at += DT; }
  heroTurn(s);
  ratTurns(s);
}

export function step(t) {
  if (!D || !cb.E || (cb.E.stage || 1) >= 2) return;
  const s = cb.warp(t);
  if (D.lastS !== null && s < D.lastS - 0.25) { const was = D.lineAt; const sd = D.seed; reset(sd); D.lastS = s; if (was !== null) DIALOGUE.line9.at = Infinity; }
  D.lastS = s;
  if (D.lineAt === null) {
    // the cue: Beat 3's closing line has finished playing
    const b3 = beat3.debug();
    if (!b3 || b3.done === null || s < b3.done) return;
    const closer = isFinite(DIALOGUE.line8a.at) ? DIALOGUE.line8a : isFinite(DIALOGUE.line8b.at) ? DIALOGUE.line8b : null;
    if (!closer || s < lineEnd(closer) + 0.7 || busyLine(s)) return;
    D.lineAt = s + 0.15;
    DIALOGUE.line9.at = D.lineAt;
    cb.E.live.push({ s: D.lineAt - 0.05, k: 'paper' });
    return;
  }
  // the moral delivered, the bar makes its point with teeth: two more rats
  if (D.spawnAt === null && s >= lineEnd(DIALOGUE.line9) + 1.2) { D.spawnAt = s; spawn(); D.s = s; }
  if (D.s !== null) {
    if (s < D.s) return;
    while (D.s + DT <= s) { D.s += DT; tick(D.s); }
  }
  if (D.doneAt === null && D.rats.length && D.rats.every(r => r.popAt !== undefined && s >= r.popAt) && s >= lineEnd(DIALOGUE.line9) + 0.6) D.doneAt = s;
}

// ---------- overlays ----------
// the spotlight: dim everything but the sign (drawn after the HUD, before the dialogue box)
export function drawSpot(ctx, p, t) {
  if (!D || (cb.E?.stage || 1) >= 2 || D.lineAt === null) return;
  const s = cb.warp(t);
  const end = lineEnd(DIALOGUE.line9) + 0.9;
  if (s > end) return;
  const k = easeOut(inv(D.lineAt - 0.05, D.lineAt + 0.5, s)) * (1 - inv(end - 0.45, end, s));
  ctx.globalAlpha = 0.62 * k;
  ctx.drawImage(SPOT4, Math.round(320 - 640), Math.round(18 - 360));
  ctx.globalAlpha = 1;
}

// the gold wave rolling across the filled pockets, and the chevron pointing up at the count
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || (cb.E?.stage || 1) >= 2 || D.lineAt === null) return;
  const s = cb.warp(t);
  const end = lineEnd(DIALOGUE.line9) + 0.9;
  if (s > end) return;
  const k = easeOut(inv(D.lineAt, D.lineAt + 0.4, s)) * (1 - inv(end - 0.4, end, s));
  if (k <= 0) return;
  const quota = cb.E.kills;
  // the wave: each filled pocket flares in turn, left to right, timed to "That bar tracks it"
  const w0 = D.lineAt + (DIALOGUE.line9.segs[1] ? DIALOGUE.line9.segs[1][1] : 2.5);
  for (let i = 0; i < quota && i < 10; i++) {
    const d = s - w0 - i * 0.14;
    if (d < 0 || d > 0.45) continue;
    const P = POCK(i), q = d / 0.45;
    ctx.globalAlpha = (1 - q) * k;
    ctx.fillStyle = d < 0.08 ? '#fff8dc' : '#ffd25a';
    ctx.fillRect(P.x - 1, P.y - 1, P.w + 2, 1); ctx.fillRect(P.x - 1, P.y + P.h, P.w + 2, 1);
    ctx.fillRect(P.x - 1, P.y - 1, 1, P.h + 2); ctx.fillRect(P.x + P.w, P.y - 1, 1, P.h + 2);
    if (d < 0.3) {                                                        // a rising mote off each lit pocket
      ctx.fillRect(Math.round(P.x + 3 + Math.sin(d * 20) ), Math.round(P.y - 2 - d * 26), 1, 1);
    }
  }
  // the chevron under the count, bobbing: "look here"
  const bob = Math.round(Math.sin(s * 5) * 1.5);
  const cx = SIGN.x + 176, cy = SIGN.y + 33 + bob;                     // right under the "4/10"
  ctx.globalAlpha = k;
  for (let r = 0; r < 3; r++) {
    ctx.fillStyle = '#140b0c'; ctx.fillRect(cx - 3 - r, cy + 3 - r, 7 + r * 2, 1);
  }
  for (let r = 0; r < 3; r++) {
    ctx.fillStyle = r === 2 ? '#ffe9a0' : '#e8a838';
    ctx.fillRect(cx - 2 - r, cy + 2 - r, 5 + r * 2, 1);
  }
  ctx.globalAlpha = 1;
}
