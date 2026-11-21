// ─────────────────────────────────────────────────────────────
//  The pointing gauntlet: a steel plate glove, index finger up.
//  Used as the in-game mouse cursor and as the tutorial's "tap here"
//  hand. The fingertip is the hotspot (GAUNTLET_TIP).
// ─────────────────────────────────────────────────────────────
import { Raster, P, C, ramp } from '../pix.js';
import { clamp } from '../util.js';

export const GAUNTLET_TIP = [4, 1];
const STEEL = P(['#262b3a', '#3e4659', '#5f6a85', '#8c98b4', '#bcc7de', '#eef3ff']);
const GOLD = P(['#6e4a16', '#a8782a', '#e2b04e', '#fff0b0']);
const OUT = C('#140b0c');

export function buildGauntlet(pressed = false) {
  const R = new Raster(17, 20);
  const lit = (x, y, v) => ramp(STEEL, clamp(v), x, y, 0.6);
  const dy = pressed ? 1 : 0;
  // back of the hand: a curved plate, lit from the top-left
  R.poly([[2.6, 9.6], [14.6, 9.2], [15.4, 14.6], [12.8, 16.4], [4.6, 16.4], [2.2, 13.4]], (x, y) => lit(x, y, 0.62 - (x - 3) * 0.022 - (y - 10) * 0.05));
  // three curled fingers: knuckle plates stepping down to the right
  [[7.6, 9.6 + dy, 2.0], [10.5, 10.0 + dy, 1.95], [13.2, 10.8 + dy, 1.75]].forEach(([cx, cy, r]) =>
    R.ellipse(cx, cy, r, r * 1.08, (x, y, u, v) => lit(x, y, 0.74 - u * 0.18 - v * 0.34)));
  // thumb folded across the palm
  R.capsule(1.6, 10.6, 4.4, 13.8, 1.5, 1.7, (x, y, s, t) => lit(x, y, 0.58 + s * 0.22 - t * 0.12));
  // index finger: three articulated plates
  R.capsule(4.6, 1.6, 4.9, 10.2, 1.75, 2.0, (x, y, s) => lit(x, y, 0.66 + s * 0.26));
  for (const yy of [4, 7]) { R.set(4, yy, STEEL[2]); R.set(5, yy, STEEL[1]); R.set(3, yy, STEEL[3]); }
  R.set(3, 2, STEEL[5]); R.set(3, 3, STEEL[4]);
  // cuff: a flared steel band with a gilt rim and a rivet
  R.poly([[3.6, 15.4], [14.4, 15.4], [15.2, 19], [3.0, 19]], (x, y) => lit(x, y, 0.5 - (x - 4) * 0.02));
  for (let x = 4; x <= 14; x++) R.set(x, 15, x < 7 ? GOLD[3] : GOLD[2]);
  for (let x = 4; x <= 14; x++) R.set(x, 18, GOLD[1]);
  R.set(12, 17, GOLD[3]); R.set(6, 17, STEEL[4]);
  R.outline(OUT, false);
  return R.toCanvas();
}

// a crisp, integer-scaled copy for use as a CSS cursor
export function gauntletCursor(scale) {
  const src = buildGauntlet(false);
  const c = document.createElement('canvas'); c.width = src.width * scale; c.height = src.height * scale;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
  return { url: c.toDataURL('image/png'), hx: GAUNTLET_TIP[0] * scale, hy: GAUNTLET_TIP[1] * scale };
}
