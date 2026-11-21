// ─────────────────────────────────────────────────────────────
//  Stage 1 · Beat 9 — Stage 1 closing beat
//
//  After the gear lesson lands, Elminster delivers his parting word
//  to wrap up Old Skull Meadow (Level 2 and Action Surge wait for
//  later stages).
// ─────────────────────────────────────────────────────────────
import { DIALOGUE, lineEnd } from './timeline.js';
import * as cb from './combat.js';
import * as beat8 from './beat8.js';

let D = null;

export function reset() {
  D = { Eref: cb.E, tNow: 0, firedAt: null, doneAt: null };
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
    if (hard) reset();
  }
  D.tNow = t;
  const s = cb.warp(t);
  if (D.firedAt === null) {
    if (!beat8.finished(t)) return;                     // the gear lesson lands first
    if (busyLine(s)) return;
    D.firedAt = t;
    say('line15', s + 0.4);
    return;
  }
  if (D.doneAt === null && isFinite(DIALOGUE.line15.at) && s > lineEnd(DIALOGUE.line15) + 1.0) D.doneAt = s;
}

export function drawOverlay() {}
