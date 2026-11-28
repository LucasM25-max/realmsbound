// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 9 — Stage Clear closing beat (Freeplay Plan)
//
//  After the gear lesson lands, a crisp STAGE CLEAR ribbon unfurls,
//  a +10 XP bonus orb arcs into the XP bar (bringing Stage 1 to
//  120 / 300 XP while the Hero stays Level 1), and Elminster sends
//  the player onward to Stage 2.
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat8 from './beat8.js';
import { clamp, easeOut, easeOutBack } from './util.js';
import { num, numWidth } from './pixfont.js';
import { boxBottom } from './ui.js';

let D = null;

export function reset() {
  D = { Eref: cb.E, tNow: 0, firedAt: null, bonusAt: null, doneAt: null };
}
reset();

function say(key, s) { DIALOGUE[key].at = s; cb.E.live.push({ s: Math.max(0, s - 0.05), k: 'paper' }); }
function busyLine(s) {
  for (const d of Object.values(DIALOGUE)) if (d.hud && isFinite(d.at) && s >= d.at && s < lineEnd(d) + 0.3) return true;
  return false;
}

export function started() { return !!D && D.firedAt !== null; }
export function finished(t) { return !!D && D.doneAt !== null && cb.warp(t) > D.doneAt + 0.4; }
export function debug() {
  if (!D) return null;
  return {
    fired: D.firedAt === null ? null : +D.firedAt.toFixed(2),
    bonusAt: D.bonusAt === null ? null : +D.bonusAt.toFixed(2),
    level: cb.heroLevel(),
    done: D.doneAt === null ? null : +D.doneAt.toFixed(2),
  };
}

export function step(t) {
  if (!D) reset();
  if (cb.E !== D.Eref) {
    const hard = D.firedAt !== null && (cb.E?.stage || 1) === 1;
    D.Eref = cb.E;
    if (hard) reset();
  }
  D.tNow = t;
  if ((cb.E?.stage || 1) >= 2) return;
  const s = cb.warp(t);
  if (D.firedAt === null) {
    if (!beat8.finished(t)) return;                     // the gear lesson lands first
    if (busyLine(s)) return;
    D.firedAt = t;
    D.bonusAt = s + 0.16;
    cb.addBonusXP(10, 320, 82, D.bonusAt, null);
    say('line15', s + 0.45);
    return;
  }
  if (D.doneAt === null && isFinite(DIALOGUE.line15.at) && s > lineEnd(DIALOGUE.line15) + 0.85) D.doneAt = s;
}

export function drawOverlay(ctx, uctx, p, t) {
  if (!D || D.firedAt === null || (cb.E?.stage || 1) >= 2) return;
  const age = t - D.firedAt;
  if (age < 0 || age > 3.85) return;
  const inK = easeOutBack(clamp(age / 0.34));
  const outK = age > 3.25 ? easeOut((age - 3.25) / 0.6) : 0;
  const alpha = clamp(inK) * (1 - outK);
  if (alpha <= 0.02) return;

  const title = 'STAGE CLEAR!';
  const sub = '+10 XP BONUS';
  const w = Math.max(numWidth(title, 2) + 16, numWidth(sub) + 16);
  const h = 24;
  const x = Math.round(320 - w / 2);
  const y = Math.round(Math.max(118, boxBottom() + 6) - (1 - inK) * 10 - outK * 8);

  ctx.save();
  ctx.globalAlpha = alpha;
  num(ctx, title, 320, y, ['#ffd24a', '#fff8d0', '#b86818'], 'c', { scale: 2, outline: '#180a06' });
  num(ctx, sub, 320, y + 17, ['#7ec8ff', '#e8f8ff', '#3a84d8'], 'c', { outline: '#0c1428' });

  // twinkling golden motes around the floating text
  for (let i = 0; i < 6; i++) {
    const ph = ((age * 2.2 + i * 0.31) % 1);
    if (ph > 0.5) continue;
    const sx = x + ((i * 37) % Math.max(8, w));
    const sy = y + (i % 2 ? -5 : h + 3);
    ctx.fillStyle = '#fff4c8';
    ctx.fillRect(sx, sy, 1, 1);
    ctx.fillRect(sx - 1, sy, 3, 1);
    ctx.fillRect(sx, sy - 1, 1, 3);
  }
  ctx.restore();
}
