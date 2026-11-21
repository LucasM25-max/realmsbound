// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 9 — the first level-up
//
//  The last of the XP motes lands, the bar brims over, and the
//  meadow holds its breath: a pillar of gold around the
//  Sellsword, "LEVEL 2!" in ringing letters, and the padlock on
//  the belt's second socket springs open — ACTION SURGE, lit
//  and waiting. (The surge itself is theatre for now: the
//  socket glows, the chip is live, but pressing 2 does nothing
//  yet.) Elminster, dry as ever: "The Weave sings in thy bones.
//  Or that is the pie."
// ─────────────────────────────────────────────────────────────
import { W, H, T, DIALOGUE, UI_SCALE as S, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat8 from './beat8.js';
import { setSurgeLocked } from './hud.js';
import { heroAnchor } from './actors.js';
import { clamp, easeOut, easeOutBack, easeInOut, hash, inv } from './util.js';
import { num, numWidth } from './pixfont.js';

let D = null;

export function reset() {
  D = { Eref: cb.E, tNow: 0, firedAt: null, saidB: false, doneAt: null };
  setSurgeLocked(true);
}
reset();

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function started() { return !!D && D.firedAt !== null; }
export function finished(t) { return !!D && D.doneAt !== null && cb.warp(t) > D.doneAt + 0.5; }
export function debug() {
  if (!D) return null;
  return { fired: D.firedAt === null ? null : +D.firedAt.toFixed(2), level: cb.heroLevel(),
    done: D.doneAt === null ? null : +D.doneAt.toFixed(2) };
}

export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {
    const hard = D.firedAt !== null;
    D.Eref = cb.E;
    if (hard) reset(); else D.Eref = cb.E;
  }
  D.tNow = t;
  const s = cb.warp(t);
  if (D.firedAt === null) {
    if (!beat8.finished(t)) return;                     // the gear lesson lands first
    const st = cb.hudState(t);
    if (st.xp < cb.RULES.lvl2XP) return;                // the bar must brim
    if (busyLine(s)) return;
    // the moment: gold pillar, the shield turns 2, the surge socket sheds its lock
    D.firedAt = t;
    cb.setLevel(2, s);
    setSurgeLocked(false);
    cb.E.live.push({ s, k: 'chime' }, { s: s + 0.18, k: 'ding' }, { s: s + 0.4, k: 'chime' });
    say('line15', s + 1.0);
    return;
  }
  if (!D.saidB && isFinite(DIALOGUE.line15.at) && s > lineEnd(DIALOGUE.line15) + 0.6 && !busyLine(s)) {
    D.saidB = true; say('line15b', s);
  }
  if (D.doneAt === null && D.saidB && s > lineEnd(DIALOGUE.line15b) + 1.2) D.doneAt = s;
}

// ---------- the golden hour: pillar, rings, and the LEVEL 2! banner ----------
export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.firedAt === null) return;
  const s = cb.warp(t);
  const d = t - D.firedAt;
  const a = heroAnchor(easeInOut(inv(T.pan[0], T.pan[1], t)), t);
  // the pillar of gold around the hero (1.4s)
  if (a && d < 1.4) {
    const k = easeOut(clamp(d / 0.2)), fade = d > 0.9 ? 1 - (d - 0.9) / 0.5 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * k * fade;
    const grd = ctx.createLinearGradient(0, a.y - 78, 0, a.y);
    grd.addColorStop(0, 'rgba(255,240,180,0)');
    grd.addColorStop(1, '#ffd25a');
    ctx.fillStyle = grd;
    ctx.fillRect(Math.round(a.x - 12), Math.round(a.y - 78), 24, 78);
    ctx.globalAlpha = 0.8 * k * fade;
    ctx.fillStyle = '#fff3c8';
    ctx.fillRect(Math.round(a.x - 2), Math.round(a.y - 78), 4, 78);
    ctx.restore();
    // two expanding rings off his feet
    for (let q = 0; q < 2; q++) {
      const dq = d - q * 0.22;
      if (dq < 0 || dq > 0.9) continue;
      const R = 6 + dq * 46, al = (1 - dq / 0.9) * 0.9;
      ctx.globalAlpha = al;
      for (let i = 0; i < 26; i++) {
        const a2 = i / 26 * Math.PI * 2;
        ctx.fillStyle = dq < 0.25 ? '#fff8dc' : '#ffd25a';
        ctx.fillRect(Math.round(a.x + Math.cos(a2) * R), Math.round(a.y - 3 + Math.sin(a2) * R * 0.32), 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    // motes drifting up out of the light
    for (let i = 0; i < 14; i++) {
      const md = (d * 0.9 + hash(i, 3)) % 1;
      const mx = a.x + (hash(i, 7) - 0.5) * 22, my = a.y - 6 - md * 64;
      ctx.globalAlpha = (1 - md) * 0.9;
      ctx.fillStyle = i % 2 ? '#ffe9a0' : '#fff8dc';
      ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  // the banner: LEVEL 2! over the stage, dropping in with the pillar
  if (d >= 0.25 && d < 3.2) {
    const k = easeOutBack(clamp((d - 0.25) / 0.4));
    const fade = d > 2.6 ? 1 - (d - 2.6) / 0.6 : 1;
    const label = 'LEVEL 2!';
    const w = numWidth(label) * 2;
    const X = Math.round(W / 2), Y = Math.round(96 - (1 - k) * 18);
    uctx.save();
    uctx.globalAlpha = clamp(fade);
    // a dark ribbon so the letters read over anything
    uctx.fillStyle = 'rgba(16,8,20,0.72)';
    uctx.fillRect(Math.round((X - w / 2 - 16) * S), Math.round((Y - 6) * S), Math.round((w + 32) * S), Math.round(26 * S));
    uctx.fillStyle = '#c4943a';
    uctx.fillRect(Math.round((X - w / 2 - 16) * S), Math.round((Y - 6) * S), Math.round((w + 32) * S), S);
    uctx.fillRect(Math.round((X - w / 2 - 16) * S), Math.round((Y + 19) * S), Math.round((w + 32) * S), S);
    num(uctx, label, (X + 1) * S, (Y + 1) * S, ['#241208', '#241208'], 'c', { outline: null, scale: 2 * S });
    num(uctx, label, X * S, Y * S, ['#ffd25a', '#fff3b0'], 'c', { outline: '#7a3a10', scale: 2 * S });
    uctx.restore();
  }
  // a gold chevron bobbing over the newly-lit surge socket (belt, bottom-right)
  if (d >= 2.2 && d < 8 && DIALOGUE.line15b && isFinite(DIALOGUE.line15b.at)) {
    const k = easeOut(clamp((d - 2.2) / 0.4));
    const bob = Math.round(Math.sin(t * 4.4) * 1.5);
    const cx = 458 + 42, cy = 314 + 30 - 26 + bob;      // BELT.x + SOCKETS[1], over socket 2
    ctx.globalAlpha = k;
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = '#140b0c'; ctx.fillRect(cx - 4 + r, cy + r - 1, 9 - r * 2, 1);
      ctx.fillStyle = r === 3 ? '#fff3b0' : '#e8a838'; ctx.fillRect(cx - 3 + r, cy + r, 7 - r * 2, 1);
    }
    ctx.globalAlpha = 1;
  }
}
