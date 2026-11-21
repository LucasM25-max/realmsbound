// ─────────────────────────────────────────────────────────────
//  Giant Rat (CR 1/8) — mangy brown fur, red beady eyes, pink tail.
//  Faces LEFT (it charges out of the burrow toward the hero).
//  Frames: scurry×4 · crouch (bite wind-up) · bite · hit · all drawn in code.
// ─────────────────────────────────────────────────────────────
import { C, P, Raster, ramp, mixC, darken, h2, clamp, PAL } from './common.js';

export const RAT_W = 56, RAT_H = 30, RAT_FEET = 27;     // canvas, ground row
export const RAT_CX = 26;                                // body centre column (x anchor)
export const RAT_MOUTH = [6, 18];                         // bite point (for the snap fx)

const FUR = P(['#1f130e', '#2f1d14', '#45291b', '#5c3823', '#76492c', '#8e5d38', '#a87446', '#c08e5c']);
const BELLY = P(['#5a4232', '#7a5c44', '#977658', '#b2916e', '#c9aa86']);
const PINK = P(['#6e2f3c', '#97475a', '#bd6676', '#d98995', '#f0b2b6']);
const EYE = P(['#3a0606', '#8e0c10', '#e0232a', '#ff7a6a']);
const TOOTH = P(['#8c7a52', '#d8c89a', '#fff4d0']);
const OUT = C('#1a1020');

// the light comes from the low sun on the right (behind the rat), so the back & rump get the rim
function body(R, cx, cy, rx, ry, squash) {
  R.ellipse(cx, cy, rx, ry * squash, (x, y, u, v) => {
    const mange = h2(x, y, 41) < 0.08 ? -0.22 : 0;                 // bald patches
    const tuft = (x * 3 + y * 5) % 7 === 0 ? 0.1 : 0;               // fur clumps
    const belly = v > 0.35 ? (v - 0.35) * 0.9 : 0;
    return ramp(FUR, clamp(0.58 - v * 0.42 + u * 0.12 + tuft + mange - belly), x, y, 0.6);
  });
}

// legs as small capsules; `ph` is the gait phase
function leg(R, hx, hy, ang, len, far) {
  const ex = hx + Math.sin(ang) * len, ey = hy + Math.cos(ang) * len;
  const pal = far ? FUR.map(c => darken(c, 0.3)) : FUR;
  R.capsule(hx, hy, ex, ey, 2.8, 1.4, (x, y, s) => ramp(pal, clamp(0.45 - s * 0.32), x, y));
  // pink toes
  R.capsule(ex - 1.6, ey + 0.3, ex + 0.6, ey + 0.3, 0.9, 0.7, far ? darken(PINK[2], 0.3) : PINK[2]);
  return [ex, ey];
}

function tail(R, x0, y0, ph, curl) {
  // a long bare pink tail curling behind, with ring segments
  let px = x0, py = y0;
  for (let i = 0; i < 22; i++) {
    const k = i / 21;
    const nx = x0 + i * 1.05, ny = y0 - Math.sin(k * 2.6 + ph) * (2.5 + curl * k) - k * 4 + k * k * 6;
    const r = 1.5 - k * 1.0;
    R.capsule(px, py, nx, ny, r, r, (x, y, s) => (i % 3 === 0 && s < 0.6 ? PINK[1] : ramp(PINK, clamp(0.6 - s * 0.4), x, y)));
    px = nx; py = ny;
  }
}

function head(R, hx, hy, open, ear, eyeShut) {
  // skull + snout tapering left
  R.ellipse(hx + 3, hy, 6.4, 5.2, (x, y, u, v) => ramp(FUR, clamp(0.55 - v * 0.4 + u * 0.15 + ((x + y * 2) % 5 === 0 ? 0.1 : 0)), x, y, 0.6));
  R.poly([[hx - 1, hy - 4], [hx - 9, hy - 0.5 + open * 0.2], [hx - 9.5, hy + 1.2], [hx - 1, hy + 4]], (x, y) => ramp(FUR, clamp(0.6 - (y - hy) * 0.08 + (x - hx) * 0.02), x, y, 0.6));
  if (open) {
    // the lower jaw drops; a dark red gape, incisors kept behind the nose line
    R.poly([[hx - 1, hy + 3], [hx - 7, hy + 3.5 + open], [hx - 6, hy + 5 + open], [hx + 1, hy + 4.5]], (x, y) => ramp(FUR, 0.3, x, y));
    R.poly([[hx - 1.5, hy + 2.8], [hx - 6.5, hy + 3.2], [hx - 6, hy + 3.6 + open * 0.8], [hx - 1, hy + 4.2]], PINK[0]);
    R.rect(hx - 6, hy + 1, 1, 2, TOOTH[2]);                                  // upper incisor, behind the snout tip
    R.set(hx - 5, hy + 2, TOOTH[1]);
    R.set(hx - 6, Math.round(hy + 3.2 + open * 0.8), TOOTH[1]);               // lower incisor
  } else {
    // closed: a mouth line under the snout, one buck tooth peeking past it
    R.line(hx - 8, hy + 2.6, hx - 1.5, hy + 3.2, FUR[0]);
    R.set(hx - 6, hy + 2, TOOTH[2]); R.set(hx - 5, hy + 2, TOOTH[0]);
  }
  // pink nose + whisker dots
  R.ellipse(hx - 9.5, hy + 0.2, 1.3, 1.1, (x, y, u, v) => ramp(PINK, clamp(0.7 - v * 0.4), x, y));
  for (const [dx, dy] of [[-6, 0], [-5, 1], [-6, 2]]) R.set(hx + dx, hy + dy, FUR[1]);
  // whiskers (thin, low-contrast, kept short so they don't read as teeth)
  R.line(hx - 7, hy + 0, hx - 10.5, hy - 1, mixC(C('#c9b394'), FUR[4], 0.45));
  R.line(hx - 7, hy + 1, hx - 10.5, hy + 2, mixC(C('#b3a284'), FUR[4], 0.5));
  // ear: big round, pink inside, drawn last so it overlaps the skull
  const ey = hy - 4.5 - ear;
  R.ellipse(hx + 5, ey, 3.2, 3.6, (x, y, u, v) => ramp(FUR, clamp(0.55 - v * 0.3 + u * 0.1), x, y));
  R.ellipse(hx + 4.6, ey + 0.4, 1.9, 2.4, (x, y, u, v) => ramp(PINK, clamp(0.5 - v * 0.3), x, y));
  // red beady eye with a hot glint
  if (eyeShut) { R.line(hx - 2, hy - 1.5, hx + 0.5, hy - 1.5, FUR[0]); return; }
  R.rect(hx - 2, hy - 2.5, 3, 2, EYE[0]);
  R.rect(hx - 1.5, hy - 2.5, 2, 2, EYE[2]);
  R.set(hx - 1, hy - 2.5, EYE[3]);
}

// mode: 'run' (ph 0..3) | 'crouch' | 'bite' | 'hit'
export function ratFrame(mode, ph = 0) {
  const R = new Raster(RAT_W, RAT_H);
  const run = mode === 'run';
  const a = ph / 4 * Math.PI * 2;
  // body bob + stretch with the gallop (rats bound: the spine arches and stretches)
  const stretch = run ? [1.1, 0.95, 0.88, 1.0][ph] : mode === 'bite' ? 1.14 : mode === 'crouch' ? 0.9 : 1.0;
  const lift = run ? [1, 2.5, 1, 0][ph] : mode === 'crouch' ? -1 : mode === 'hit' ? 1 : 0;
  const lean = mode === 'bite' ? -3 : mode === 'crouch' ? 2.5 : mode === 'hit' ? 4 : 0;
  const by = RAT_FEET - 11 - lift, bx = RAT_CX + lean * 0.5;
  // far legs (behind)
  const fA = run ? [0.7, 0.2, -0.6, -0.1][ph] : mode === 'bite' ? 0.8 : mode === 'hit' ? -0.5 : 0.3;
  const hA = run ? [-0.7, -0.1, 0.6, 0.2][ph] : mode === 'bite' ? -0.7 : mode === 'hit' ? 0.4 : -0.3;
  const footY = RAT_FEET - 1;
  const fLen = (y) => Math.max(3, footY - y);
  leg(R, bx - 7 * stretch + 2, by + 3, fA + 0.25, fLen(by + 3) - (run && ph === 1 ? 2 : 0), true);
  leg(R, bx + 7 * stretch + 2, by + 3, hA + 0.25, fLen(by + 3) - (run && ph === 3 ? 1 : 0), true);
  // tail (behind body), whipping with the gait
  tail(R, bx + 10 * stretch, by + 2, a, mode === 'hit' ? 6 : 2);
  // body
  body(R, bx, by, 11.5 * stretch, 6.8, mode === 'crouch' ? 1.08 : 1);
  // haunch bulge + belly
  R.ellipse(bx + 7 * stretch, by + 0.5, 5.5, 5.6, (x, y, u, v) => ramp(FUR, clamp(0.6 - v * 0.45 + u * 0.15 + ((x * 3 + y) % 6 === 0 ? 0.1 : 0)), x, y, 0.6));
  R.ellipse(bx - 1, by + 4.6, 8 * stretch, 2.2, (x, y, u, v) => ramp(BELLY, clamp(0.45 - v * 0.3), x, y));
  // ragged fur along the spine
  for (let i = -9; i <= 9; i += 2) {
    const sx = Math.round(bx + i * stretch), sy = Math.round(by - 6.6 + Math.abs(i) * Math.abs(i) * 0.03);
    R.set(sx, sy - (i % 4 === 0 ? 1 : 0), FUR[(i % 4 === 0) ? 5 : 3]);
  }
  // near legs
  const nfA = run ? [-0.6, -0.1, 0.7, 0.2][ph] : mode === 'bite' ? 0.9 : mode === 'hit' ? -0.6 : 0.1;
  const nhA = run ? [0.6, 0.2, -0.7, -0.1][ph] : mode === 'bite' ? -0.8 : mode === 'hit' ? 0.5 : -0.1;
  leg(R, bx - 7 * stretch, by + 4, nfA, fLen(by + 4), false);
  leg(R, bx + 7 * stretch, by + 3.5, nhA, fLen(by + 3.5), false);
  // head
  const hx = bx - 11 * stretch - (mode === 'bite' ? 2 : 0), hy = by - 1 + (mode === 'crouch' ? 2 : 0) + (run ? [0, -1, 0, 1][ph] : 0) + (mode === 'hit' ? -2 : 0);
  head(R, Math.round(hx), Math.round(hy), mode === 'bite' ? 3 : mode === 'hit' ? 2 : 0, run ? [0, 1, 0, 0][ph] : mode === 'crouch' ? -1 : 0, mode === 'hit');
  // rim light from the sun behind (right), then outline
  R.rim(1, 0, c => mixC(c, PAL.rim, 0.42));
  R.rim(0, -1, c => mixC(c, PAL.rim, 0.18));
  if (mode === 'hit') { for (let i = 0; i < R.d.length; i++) if (R.d[i]) R.d[i] = mixC(R.d[i], C('#ffffff'), 0.25); }
  R.outline(OUT, false);
  return R;
}

export function buildRat() {
  const run = [0, 1, 2, 3].map(i => ratFrame('run', i).toCanvas());
  return { run, crouch: ratFrame('crouch').toCanvas(), bite: ratFrame('bite').toCanvas(), hit: ratFrame('hit').toCanvas() };
}
