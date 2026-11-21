// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 2 — Command Strike (played live).
//
//  Two more Giant Rats come out of the burrow. Having watched their
//  friends get turned into fur, they hang back, hissing. Elminster
//  tells the player to click one:
//    • a click is a COMMAND STRIKE: the hero shouts ("HA!") and lands a
//      small bonus hit (10% of a weapon hit, so 1–2 damage);
//    • a click also sets the FOCUS TARGET: a gold reticle snaps onto
//      that rat, and the hero's next swing goes to it. Click the other
//      rat and he switches.
//  The first click sets both rats charging; the hero fights them by the
//  normal rules (rounds, d20 rolls, crits, bites, Mystra's ward), with
//  real dice this time.
//
//  Tutorial nudges if the player does nothing (design plan §9.1):
//    spotlight on the nearest rat at once · a gauntlet pointer after 6 s ·
//    an Elminster nudge at 15 s · a gold pulse and chime at 30 s · at 40 s
//    the rats lose patience and attack anyway, so an idle player still
//    gets through.
//
//  Everything runs in fixed 1/120 s steps on the fight's clock from the
//  end of Beat 1, and is decided far enough ahead for the wind-ups and
//  the die to show. Replays and freeze-frames rerun the steps, using the
//  same seed and the clicks recorded so far.
// ─────────────────────────────────────────────────────────────
import { T, DIALOGUE, resetLiveLines, lineEnd } from './timeline.js';
import { F, off } from './world.js';
import * as cb from './combat.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { mulberry, clamp, inv, easeOut, easeOutBack } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const DT = 1 / 120;
const START = cb.BEAT1_END + 0.3;            // the director takes over once Beat 1's last rat is gone
const NUDGE = { pointer: 6, line: 15, pulse: 30, give: 40 };

let D = null, GAUNT = null, GAUNT_P = null, SPOT2 = null;
const params = new URLSearchParams(location.search);
// ?taps=38.4:0,39.0:1  scripted clicks (time on the fight clock : rat index within Beat 2) for screenshots
const SCRIPTED = (params.get('taps') || '').split(',').filter(Boolean).map(x => { const [s, r] = x.split(':'); return { s: +s, b2: +r }; });

export function buildBeat2() {
  GAUNT = buildGauntlet(false); GAUNT_P = buildGauntlet(true);
  SPOT2 = cb.buildSpot(22, 52, 1.35);
}

export function reset(seed = 7) {
  cb.resetCombat();
  resetLiveLines();
  D = {
    s: START, seed, rng: mulberry(seed), taps: SCRIPTED.map(x => ({ ...x })).sort((a, b) => a.s - b.s), ti: 0,
    rats: [], phase: 'standoff', firstTap: null, aggroAt: null, round: null, n: 0, lastCS: -9, nextRegen: 0,
    nudged: false, chimeAt: 0, lastTapS: -9, lastStrikeAt: -9, focusLine: false, spamSaid: false, doneAt: null, csTimes: [], ripples: [],
  };
  spawn();
}

// ---------- the setup: two wary rats ----------
function spawn() {
  const [b0, b1] = T.b2burst;
  const A = cb.addRat({ burst: b0, landX: 414, depth: 2, coins: 2, holdCoins: true, wary: true, b2: 0 });
  let t = cb.moveRat(A, A.landT, 338, { speed: 170 });
  D.standA = cb.moveRat(A, t + 0.35, 296, { speed: 38, kind: 'creep' });
  const B = cb.addRat({ burst: b1, landX: 436, depth: -3, coins: 2, holdCoins: true, wary: true, b2: 1 });
  t = cb.moveRat(B, B.landT, 380, { speed: 170 });
  cb.moveRat(B, t + 0.5, 342, { speed: 34, kind: 'creep' });
  D.rats = [A, B];
  D.spotAt = A.landT + 0.75;
}
const alive = s => D.rats.filter(r => r.dieAt === undefined && s >= r.landT);

// ---------- input ----------
// a click anywhere leaves a little ripple; a click on a Beat 2 rat queues a Command Strike
export function click(gx, gy, t) {
  if (!D) return false;
  const s = cb.warp(t);
  const id = s >= START ? cb.ratAtPoint(gx, gy, s, off(1, F.ground), r => r.b2 !== undefined || r.gob !== undefined || r.b4 !== undefined) : -1;
  D.ripples.push({ t, gx, gy, hit: id >= 0 });
  if (D.ripples.length > 24) D.ripples.shift();
  if (id < 0) return false;
  const q = Math.max(s, D.s);
  if (D.firstTap !== null) {
    if (q - D.lastTapS < 0.14) return false;                       // hand throttle
    if (q < D.lastStrikeAt + 2.2) return false;       // the gauntlet needs a breath between shouts (not a whole round)
  }
  D.lastTapS = q;
  D.lastStrikeAt = q;
  D.taps.push({ s: q, rat: id }); D.taps.sort((a, b) => a.s - b.s);
  return true;
}
let hoverPt = null;
export function hover(gx, gy) { hoverPt = gx === null ? null : [gx, gy]; }
export function wantsGauntlet(t) { return !!D && cb.warp(t) >= T.b2burst[0] && tappable(cb.warp(t)); }
export function ratPoints(t) {
  const s = cb.warp(t), og = off(1, F.ground);
  return D.rats.filter(r => cb.ratAlive(r, s)).map(r => { const st = cb.ratState(r, s, og); return { id: r.id, b2: r.b2, x: Math.round(st.x - 4), y: Math.round(st.gy - 12), hp: cb.ratHP(r, s) }; });
}
export function debug() {
  if (!D) return null;
  return { s: +D.s.toFixed(2), phase: D.phase, firstTap: D.firstTap, strikes: cb.E.strikes.length, swings: cb.E.swings.filter(w => w.live).map(w => ({ at: +w.at.toFixed(2), roll: w.roll, hit: w.hit, dmg: w.dmg, rat: w.rat, void: !!w.void })),
    rats: D.rats.map(r => ({ id: r.id, hp: cb.ratHP(r, D.s), dead: r.dieAt !== undefined })), heroHP: cb.heroHP(D.s), focus: cb.focusAt(D.s), done: D.doneAt };
}

// ---------- the director ----------
export function step(t) {
  if (!D) reset();
  const s = cb.warp(t);
  if (s < D.s - 0.25 && s >= START) reset(D.seed);      // scrubbed backwards: replay from the top of Beat 2
  if (s < START) {
    if (D.s > START + 0.01) reset(D.seed);
    cb.UI.hover = -1; cb.UI.pulse = -1;
    return;
  }
  while (D.s + DT <= s) { D.s += DT; tick(D.s); }
  // per-frame UI state for the renderer
  const og = off(1, F.ground);
  cb.UI.hover = hoverPt && tappable(s) ? cb.ratAtPoint(hoverPt[0], hoverPt[1], s, og, r => r.b2 !== undefined || r.gob !== undefined || r.b4 !== undefined) : -1;
  const ps = D.spotAt + NUDGE.pulse;
  const target = tutorTarget(s);
  cb.UI.pulse = D.firstTap === null && s >= ps && target ? target.id : -1;
  cb.UI.pulseK = 0.45 + 0.55 * Math.abs(Math.sin((s - ps) * 3.2));
}
const tappable = s => D.rats.some(r => r.dieAt === undefined && s >= r.landT) || cb.E.rats.some(r => (r.gob || r.b4 !== undefined) && r.dieAt === undefined && s >= r.landT);

function tick(s) {
  // clicks
  while (D.ti < D.taps.length && D.taps[D.ti].s <= s) {
    const tp = D.taps[D.ti++];
    const rid = tp.rat ?? (D.rats[tp.b2] ? D.rats[tp.b2].id : -1);
    const r = cb.E.rats[rid];
    if (r && (r.b2 !== undefined || r.gob !== undefined || r.b4 !== undefined) && cb.ratAlive(r, tp.s)) commandStrike(tp.s, r);
  }
  // tutorial nudges while nobody has clicked
  if (D.firstTap === null && D.phase === 'standoff') {
    if (!D.nudged && s >= D.spotAt + NUDGE.line) { D.nudged = true; say('nudge', s); }
    if (s >= D.spotAt + NUDGE.pulse && s >= D.chimeAt) { cueLive(s, 'chime'); D.chimeAt = s + 2.5; }
    if (s >= D.spotAt + NUDGE.give) aggro(s);
  }
  heroTurn(s);
  ratTurns(s);
  regen(s);
  // focus explainer, a few seconds after "Splendid", while both rats still stand
  if (D.firstTap !== null && !D.focusLine && s >= lineEnd(DIALOGUE.line6) + 1.2) {
    D.focusLine = true;
    if (alive(s).length >= 2) say('focus', s);
  }
  if (!D.doneAt && D.rats.every(r => r.popAt !== undefined && s >= r.popAt)) D.doneAt = s;
}

function say(key, s) { DIALOGUE[key].at = s; cueLive(s - 0.05, 'paper'); }
function cueLive(s, k, o = {}) { cb.E.live.push({ s, k, ...o }); }

function commandStrike(s, r) {
  if (s - D.lastCS < 0.09) return;                         // even a fighter can only bark so fast
  D.lastCS = s;
  D.lastStrikeAt = s;
  const count = 1 + (cb.E.extraStrikes || 0);
  for (let k = 0; k < count; k++) {
    const tgt = r.dieAt === undefined ? r : alive(s)[0];
    if (!tgt) break;
    const roll = 2 + Math.floor(D.rng() * 6) + Math.floor(D.rng() * 6) + cb.RULES.dmgBonus;   // a weapon hit…
    const dmg = Math.max(1, Math.round(roll * cb.RULES.csPct * (cb.E.strikeMult || 1)));       // …10% of it (scaled by Tactics)
    const n = D.n++;
    const word = n === 0 ? 'HA!' : ['HA!', 'HUP!', 'HA!', 'HAH!', 'OI!'][Math.floor(D.rng() * 5)];
    if (k === 0) cb.setFocus(s, tgt.id);
    cb.addStrike({ at: s + 0.05 + k * 0.07, rat: tgt.id, dmg, word, n });
  }
  D.csTimes.push(s);
  if (D.firstTap === null) {
    D.firstTap = s;
    say('line6', s + 0.55);
    if (!D.aggroAt) aggro(s + 0.12);
  }
  // a flurry earns a remark (once)
  D.csTimes = D.csTimes.filter(x => s - x < 3);
  if (!D.spamSaid && D.csTimes.length >= 9 && s > DIALOGUE.line6.at + 2.5) { D.spamSaid = true; say('spam', s + 0.2); }
}

// the rats stop hissing and charge: the nearer takes the spot in front of the hero, the other the one behind
function aggro(s) {
  if (D.aggroAt) return;
  D.aggroAt = s; D.phase = 'fight';
  const live = alive(s).sort((a, b) => cb.baseX(a, s).x - cb.baseX(b, s).x);
  let first = Infinity;
  live.forEach((r, i) => {
    r.aggroAt = s; r.slot = i;
    const at = cb.moveRat(r, s + i * 0.2, cb.SLOT[i], { speed: 175, kind: 'dash' });
    r.meleeAt = at; first = Math.min(first, at);
    cueLive(s + i * 0.2 + 0.02, 'squeak', { pan: 0.3 });
  });
  for (const r of D.rats) if (r.dieAt !== undefined) r.aggroAt = s;
  if (isFinite(first)) startRound(s, first + 0.95);
}
function startRound(t0, at) { D.round = { t0, full: at, at }; cb.E.rounds.push(D.round); }

// the hero's turn: roll 0.62 s ahead (so the die can tumble), pick the target 0.3 s ahead, land the blow
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
    const nd = roll >= (cb.E.critRange || 20) ? 4 : 2;                // a crit rolls the damage dice twice
    const dice = Array.from({ length: nd }, () => 1 + Math.floor(D.rng() * 6));
    rd.sw = cb.addSwing({ at: rd.at, rat: -1, roll, dice, live: true });
  }
  const sw = rd.sw; if (!sw) return;
  if (sw.rat < 0 && !sw.void && s >= sw.at - 0.3) {
    sw.rat = cb.chooseTarget(s, sw.at);
    if (sw.rat < 0) cb.voidSwing(sw);
    else sw.lunge = clamp(cb.baseX(cb.E.rats[sw.rat], sw.at).x - cb.SLOT[0], 0, 30);   // he steps in to reach the rat behind
  }
  if (!sw.applied && s >= sw.at) {
    sw.applied = true;
    if (!sw.void) {
      const r = cb.E.rats[sw.rat];
      if (!r || r.dieAt !== undefined) { const n = cb.chooseTarget(s, sw.at); if (n >= 0) sw.rat = n; else cb.voidSwing(sw); }
      if (!sw.void && sw.hit) cb.damageRat(cb.E.rats[sw.rat], sw.at, sw.dmg, { kind: 'swing', sw });
    }
    const left = alive(s).filter(r => isFinite(r.meleeAt));
    D.round = null;
    if (left.length) startRound(sw.at, sw.at + cb.RULES.round * (cb.E.roundMult || 1));
  }
}

// each rat in reach bites on its own, quicker clock
function ratTurns(s) {
  const live = alive(s);
  for (const r of live) {
    if (!(r.meleeAt <= s + 0.3)) continue;
    if (r.nextBite === undefined) r.nextBite = r.meleeAt + 0.55 + D.rng() * 0.5;
    if (s >= r.nextBite - 0.3) {
      const at = r.nextBite;
      cb.addBite({ at, rat: r.id, roll: 1 + Math.floor(D.rng() * 20), dmg: 1 + Math.floor(D.rng() * 4) });
      r.nextBite = at + cb.RULES.ratRound + D.rng() * 0.4 - 0.15;
    }
  }
  // the rat behind steps up when the one in front falls
  const front = live.find(r => r.slot === 0);
  if (!front) for (const r of live) if (r.slot === 1 && r.meleeAt <= s) { r.slot = 0; cb.moveRat(r, s + 0.15, cb.SLOT[0], { speed: 110 }); }
}

// out of the fight, the hero catches his breath: +1 HP a second or so
function regen(s) {
  const engaged = cb.engagedFoes(s);
  let lastHurt = -9; for (const b of cb.E.bites) if (!b.void && b.at <= s) lastHurt = Math.max(lastHurt, b.at);
  if (engaged || s - lastHurt < 2.2 || s < D.nextRegen) return;
  if (cb.heroHP(s) < cb.heroMaxHP()) { cb.addHeal(s, 1, 'regen'); D.nextRegen = s + 1.1 / (cb.E.regenMult || 1); }
}

// ---------- queries for main.js ----------
export function finished(t) { return D && D.doneAt !== null && cb.warp(t) > D.doneAt + 3.2; }
function tutorTarget(s) {
  const live = alive(s); if (!live.length) return null;
  return live.reduce((a, b) => (cb.baseX(a, s).x <= cb.baseX(b, s).x ? a : b));
}

// ---------- tutorial overlays ----------
// spotlight on the nearest rat until the first click (or until the rats attack on their own)
export function drawSpot(ctx, p, t) {
  if (!D) return;
  const s = cb.warp(t);
  if (s < D.spotAt) return;
  const end = D.firstTap ?? D.aggroAt ?? Infinity;
  if (s > end + 0.4) return;
  const r = tutorTarget(Math.min(s, end)); if (!r) return;
  const st = cb.ratState(r, s, off(p, F.ground)); if (!st) return;
  const k = easeOut(inv(D.spotAt, D.spotAt + 0.5, s)) * (isFinite(end) ? 1 - inv(end, end + 0.35, s) : 1);
  ctx.globalAlpha = 0.42 * k;
  ctx.drawImage(SPOT2, Math.round(st.x - 4 - 640), Math.round(st.gy - 12 - 360));
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D) return;
  const s = cb.warp(t);
  drawRipples(ctx, t);
  drawBanner(ctx, s);
  if (s < D.spotAt || D.firstTap !== null && s > D.firstTap + 0.3) return;
  const r = tutorTarget(s); if (!r) return;
  const st = cb.ratState(r, s, off(p, F.ground)); if (!st) return;
  const fade = D.firstTap !== null ? 1 - (s - D.firstTap) / 0.3 : 1;
  ctx.globalAlpha = clamp(fade);
  // the essential instruction stays up until it's done: a blinking "CLICK!" over the rat
  if (s > D.spotAt + 0.6) {
    const on = Math.floor((s - D.spotAt) * 2.2) % 3 !== 2;
    const bob = Math.round(Math.sin(s * 4) * 1.5);
    if (on || D.firstTap !== null) num(ctx, 'CLICK!', Math.round(st.x - 2), Math.round(st.gy - 47 + bob), ['#ffe14a', '#fff8c8', '#e0a020'], 'c');
  }
  // the gauntlet: hovers, then taps the rat every 0.9 s with a ripple
  if (s > D.spotAt + NUDGE.pointer) {
    const a = (D.firstTap !== null ? D.firstTap + 0.12 : s) - D.spotAt - NUDGE.pointer, k = easeOut(clamp(a / 0.3));
    const ph = (a % 0.9) / 0.9, press = ph > 0.55 && ph < 0.72;
    const tx = Math.round(st.x - 4), ty = Math.round(st.gy - 12);
    const ox = press ? 0 : 3 + Math.round(Math.sin(ph * Math.PI * 2) * 1), oy = press ? 0 : 5 + Math.round((1 - k) * 14);
    ctx.drawImage(press ? GAUNT_P : GAUNT, tx - GAUNTLET_TIP[0] + ox, ty - GAUNTLET_TIP[1] + oy);
    if (ph > 0.55 && ph < 0.95) {
      const q = (ph - 0.55) / 0.4, R = 3 + q * 10;
      ctx.globalAlpha = clamp(fade) * (1 - q); ctx.fillStyle = '#fff2b0';
      for (let i = 0; i < 20; i++) { const an = i / 20 * Math.PI * 2; ctx.fillRect(Math.round(tx + Math.cos(an) * R), Math.round(ty + Math.sin(an) * R * 0.6), 1, 1); }
    }
  }
  ctx.globalAlpha = 1;
}

// the objective tag under Elminster's box: stays until the player has done it (then ticks and slides away)
function drawBanner(ctx, s) {
  if (s < T.line5 + 0.4) return;
  const done = D.firstTap, out = done !== null ? s - done : -1;
  if (out > 1.4) return;
  const label = done !== null ? 'COMMAND STRIKE!' : 'CLICK A RAT', w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - T.line5 - 0.4) / 0.3)), gone = out > 0.9 ? easeOut((out - 0.9) / 0.5) : 0;
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8 - gone * 10);
  ctx.globalAlpha = clamp(k) * (1 - gone);
  const pulse = done === null && s > D.spotAt + NUDGE.pulse ? Math.abs(Math.sin(s * 3.2)) : 0;
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = done !== null ? '#3c6a2a' : pulse > 0.5 ? '#8a5a12' : '#5a2a14'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = done !== null ? '#5c9a40' : '#7a4020'; ctx.fillRect(X, Y, w, 1);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
  // a little diamond bullet (a tick once it's done)
  const bx = X + 7, by = Y + 7;
  if (done !== null) { ctx.fillStyle = '#d8ffb0'; [[-2, 0], [-1, 1], [0, 2], [1, 1], [2, 0], [3, -1], [4, -2]].forEach(([dx, dy]) => ctx.fillRect(bx + dx - 1, by + dy - 1, 2, 2)); }
  else { ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 1, by - 2, 3, 5); ctx.fillRect(bx - 2, by - 1, 5, 3); ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by - 1, 1, 1); }
  num(ctx, label, X + 13, Y + 4, done !== null ? ['#e8ffd0', '#ffffff'] : ['#ffe7a0', '#ffffff'], 'l');
  ctx.globalAlpha = 1;
}

function drawRipples(ctx, t) {
  for (const c of D.ripples) {
    const d = t - c.t; if (d < 0 || d > 0.3) continue;
    const k = d / 0.3, R = (c.hit ? 4 : 2) + k * (c.hit ? 9 : 6);
    ctx.globalAlpha = (1 - k) * (c.hit ? 0.95 : 0.6); ctx.fillStyle = c.hit ? '#ffe680' : '#fff4dc';
    const n = c.hit ? 16 : 10;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.fillRect(Math.round(c.gx + Math.cos(a) * R), Math.round(c.gy + Math.sin(a) * R * 0.7), 1, 1); }
  }
  ctx.globalAlpha = 1;
}
