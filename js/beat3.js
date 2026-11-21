// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 3 — Coins (played live).
//
//  The two rats from Beat 2 drop their copper on the path: two coins
//  each, and this time nobody picks them up for you. A coin rests on
//  the ground for 5 s, glinting — faster and hotter as its patience
//  runs out — and then it wanders off (it rolls away to the burrow
//  and is gone for good).
//
//  A tap pockets a coin: it zips into the air, arcs up to the purse,
//  and lands with a clink whose pitch climbs for each quick pickup
//  in a row. Elminster introduces the idea ("Tap them before they
//  wander off"), nudges a dawdler, and passes judgement at the end —
//  one line if every copper was pocketed, another if the meadow kept
//  some. The stage's "finished" flag (the replay button) waits for
//  this beat to close.
//
//  The coins themselves live in combat.js's event store (so freezes,
//  replays and seeks see them); this file is the beat's director:
//  input, tutorial nudges, the banner, and the timing.
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, lineEnd } from './timeline.js';
import { F, off } from './world.js';
import * as cb from './combat.js';
import { buildGauntlet, GAUNTLET_TIP } from './art/gauntlet.js';
import { clamp, inv, easeOut, easeOutBack } from './util.js';
import { num, numWidth } from './pixfont.js';
import { HUD, boxBottom } from './ui.js';

const NUDGE = { pointer: 6, line: 11 };          // after the intro, if the coins just sit there
let D = null, GAUNT = null, GAUNT_P = null, SPOT3 = null;
const params = new URLSearchParams(location.search);
// ?coins=N — scripted coin taps (N resting coins get pocketed as soon as they're up) for screenshots
const SCRIPTED = parseInt(params.get('coins') || '0', 10) || 0;

export function buildBeat3() { GAUNT = buildGauntlet(false); GAUNT_P = buildGauntlet(true); SPOT3 = cb.buildSpot(26, 60, 1.2); }

export function reset() {
  D = { introAt: null, armedAt: null, nudged: false, collected: 0, lost: 0, doneAt: null, firstTap: null,
        ripples: [], taps: Array(SCRIPTED).fill(0), ti: 0, nextTap: 0, lastS: null };
}
reset();

const held = () => (cb.E ? cb.E.coins.filter(c => c.hold) : []);
// goblin copper (Beat 5) is tappable but must not re-trigger Beat 3's tutorial nudges and prompts
const resting = (s, gobsToo = false) => held().filter(c => (gobsToo || !c.gob) && c.fly === undefined && c.roll === undefined && s >= c.land + 0.16);
const resolved = c => c.arrive !== undefined || c.gone !== undefined;

export function wantsCoins(t) { return !!D && resting(cb.warp(t), true).length > 0; }
export function coinPoints(t) {
  const s = cb.warp(t), og = off(1, F.ground);
  return resting(s, true).map(c => { const [x, y] = cb.coinPosAt(c, s, og); return { x: Math.round(x), y: Math.round(y) }; });
}
export function debug() {
  if (!D) return null;
  return { intro: D.introAt, collected: D.collected, lost: D.lost, done: D.doneAt,
    coins: held().map(c => ({ j: c.j, state: c.gone !== undefined ? 'gone' : c.arrive !== undefined ? 'purse' : c.roll !== undefined ? 'rolling' : 'rest' })) };
}

// a tap on a resting coin pockets it; taps elsewhere fall through to Beat 2's rat check
export function click(gx, gy, t) {
  if (!D || !cb.E) return false;
  const s = cb.warp(t);
  const c = cb.coinAtPoint(gx, gy, s, off(1, F.ground));
  if (!c) return false;
  D.collected += cb.collectCoinSplash(c, s, off(1, F.ground));   // the gauntlet sweeps the neighbours up too
  if (D.firstTap === null) D.firstTap = s;
  D.ripples.push({ t, gx, gy, hit: true, splash: true });
  if (D.ripples.length > 24) D.ripples.shift();
  return true;
}

function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}
function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }

export function step(t) {
  if (!D || !cb.E) return;
  const s = cb.warp(t);
  // scrubbed backwards (or reset): put any held coins back on the ground and start the beat over
  if (D.lastS !== null && s < D.lastS - 0.25) {
    for (const c of held()) { delete c.fly; delete c.arrive; delete c.roll; delete c.gone; delete c.pitch; delete c.armed; c.expire = Infinity; }
    const taps = D.taps; reset(); D.taps = taps;
  }
  D.lastS = s;
  const hc = held();
  if (!hc.length) return;
  // the intro plays once the first coin has landed and Elminster isn't mid-sentence
  if (D.introAt === null) {
    const ready = hc.some(c => s >= c.land + 0.2), busy = busyLine(s);
    if (ready && !busy) { D.introAt = s; say('line7', s); }
    return;
  }
  // scripted taps (testing): pocket the first resting coin, one every 0.9 s — goblin copper counts too
  if (D.ti < D.taps.length && s >= D.nextTap) {
    const c = resting(s, true)[0];
    if (c) {
      D.ti++;
      cb.collectCoin(c, s);
      D.collected++;
      if (D.firstTap === null) D.firstTap = s;
      D.nextTap = s + 0.9;
    }
  }
  // a nudge if the coins are just sitting there
  if (!D.nudged && resting(s).length && s >= D.introAt + NUDGE.line && !busyLine(s)) { D.nudged = true; say('coinNudge', s); }
  // the 5 s countdown starts once the fight is over — nobody pockets loot mid-swing
  if (D.armedAt === null) {
    const b2 = cb.E.rats.filter(r => r.b2 !== undefined);
    const ok = b2.length && b2.every(r => r.popAt !== undefined && s >= r.popAt);
    if (ok) D.armedAt = s;
  }
  for (const c of hc) {
    if (c.fly !== undefined || c.roll !== undefined) continue;
    // Beat 3 arms the countdown only for the coins already on the ground when the fight ended;
    // goblin copper (Beat 5) gets its own shorter fuse, armed by beat5.js as it lands
    if (!c.armed) { if (D.armedAt !== null && c.land <= D.armedAt + 0.01) { c.armed = true; c.expire = D.armedAt + 5 + c.j * 0.45; } }
    else if (s >= c.expire) { cb.loseCoin(c, s); D.lost++; }
  }
  // the closing line once every coin is pocketed or gone (and the fight has produced all its coins)
  if (D.doneAt === null && hc.length && hc.every(resolved) && !busyLine(s)) {
    say(D.lost === 0 ? 'line8a' : 'line8b', s + 0.35);
    D.doneAt = s + 0.35;
  }
}

// the objective tag under Elminster's box: stays until every coin is settled
function drawBanner(ctx, s) {
  if (D.introAt === null || s < D.introAt + 0.4) return;
  const done = D.doneAt, out = done !== null ? s - done : -1;
  if (out > 1.4) return;
  const allIn = done !== null && D.lost === 0;
  const label = done !== null ? (allIn ? 'POCKETED!' : 'POCKETED ' + D.collected + '/' + (D.collected + D.lost)) : 'TAP THE COINS!';
  const w = numWidth(label) + 20, h = 15;
  const k = easeOutBack(clamp((s - D.introAt - 0.4) / 0.3)), gone = out > 0.9 ? easeOut((out - 0.9) / 0.5) : 0;
  const X = Math.round(HUD.x + HUD.w / 2 - w / 2), Y = Math.round(boxBottom() + 3 - (1 - k) * 8 - gone * 10);
  ctx.globalAlpha = clamp(k) * (1 - gone);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(X - 1, Y - 1, w + 2, h + 2);
  ctx.fillStyle = done !== null ? '#3c6a2a' : '#5a2a14'; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = done !== null ? '#5c9a40' : '#7a4020'; ctx.fillRect(X, Y, w, 1);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X + 1, Y + 1, w - 2, 1); ctx.fillRect(X + 1, Y + h - 2, w - 2, 1);
  const bx = X + 7, by = Y + 7;
  if (done !== null && allIn) { ctx.fillStyle = '#d8ffb0'; [[-2, 0], [-1, 1], [0, 2], [1, 1], [2, 0], [3, -1], [4, -2]].forEach(([dx, dy]) => ctx.fillRect(bx + dx - 1, by + dy - 1, 2, 2)); }
  else { ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 1, by - 2, 3, 5); ctx.fillRect(bx - 2, by - 1, 5, 3); ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by - 1, 1, 1); }
  num(ctx, label, X + 13, Y + 4, done !== null ? ['#e8ffd0', '#ffffff'] : ['#ffe7a0', '#ffffff'], 'l');
  ctx.globalAlpha = 1;
}

function drawRipples(ctx, t) {
  for (const c of D.ripples) {
    const d = t - c.t; if (d < 0 || d > 0.3) continue;
    const k = d / 0.3, R = 4 + k * 9;
    ctx.globalAlpha = (1 - k) * 0.95; ctx.fillStyle = '#ffe680';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.fillRect(Math.round(c.gx + Math.cos(a) * R), Math.round(c.gy + Math.sin(a) * R * 0.7), 1, 1); }
    if (c.splash) {                                  // the wider sweep ring: what the gauntlet also gathers
      ctx.globalAlpha = (1 - k) * 0.4; ctx.fillStyle = '#fff2b0';
      const R2 = 4 + k * 26;
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.fillRect(Math.round(c.gx + Math.cos(a) * R2), Math.round(c.gy + Math.sin(a) * R2 * 0.7), 1, 1); }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- overlays ----------
// a soft spotlight on the nearest resting coin until the player gets the idea
export function drawSpot(ctx, p, t) {
  if (!D || D.introAt === null || D.firstTap !== null) return;
  const s = cb.warp(t);
  const rs = resting(s); if (!rs.length) return;
  const [x, y] = cb.coinPosAt(rs[0], s, off(p, F.ground));
  const k = easeOut(inv(D.introAt, D.introAt + 0.5, s));
  ctx.globalAlpha = 0.4 * k;
  ctx.drawImage(SPOT3, Math.round(x - 640), Math.round(y - 360));
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D) return;
  drawRipples(ctx, t);
  const s = cb.warp(t);
  drawBanner(ctx, s);
  if (D.introAt === null) return;
  if (D.firstTap !== null && s > D.firstTap + 0.3) return;
  const rs = resting(s); if (!rs.length) return;
  const [cx, cy] = cb.coinPosAt(rs[0], s, off(p, F.ground));
  const fade = D.firstTap !== null ? 1 - (s - D.firstTap) / 0.3 : 1;
  ctx.globalAlpha = clamp(fade);
  // the essential instruction, blinking over the coin
  if (s > D.introAt + 0.8) {
    const on = Math.floor((s - D.introAt) * 2.2) % 3 !== 2;
    const bob = Math.round(Math.sin(s * 4) * 1.5);
    if (on) num(ctx, 'TAP!', Math.round(cx - numWidth('TAP!')), Math.round(cy - 26 + bob), ['#ffe9a0', '#fff8dc'], 'l', { scale: 2 });
    // the gauntlet bobs up at the coin from just below, tapping the air
    const press = Math.sin(s * 4) > 0.55;
    const g = press ? GAUNT_P : GAUNT;
    ctx.drawImage(g, Math.round(cx + 7 - GAUNTLET_TIP[0]), Math.round(cy + 7 + (press ? 1 : 0) + bob - GAUNTLET_TIP[1]));
  }
  ctx.globalAlpha = 1;
}
