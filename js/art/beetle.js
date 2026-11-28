// ─────────────────────────────────────────────────────────────
//  Giant Fire Beetle (CR 0, 9 HP) — glossy obsidian-bronze chitin,
//  snapping mandibles, six scurrying legs, and twin glowing amber-
//  orange bioluminescent glands lighting the soil beneath it.
//  Faces LEFT toward the hero.
//  Frames: run×4 · crouch · bite · hit · + ground soil-glow sprite.
// ─────────────────────────────────────────────────────────────
import { C, P, Raster, ramp, mixC, darken, h2, clamp, PAL } from './common.js';

export const BEETLE_W = 48, BEETLE_H = 30, BEETLE_FEET = 27;
export const BEETLE_CX = 23;

const SHELL = P(['#130d14', '#221722', '#35232e', '#4d333c', '#694648', '#8b5e54', '#b58068']);
const WING  = P(['#180e10', '#2b1818', '#44241e', '#623222', '#84462a', '#a85f34']);
const LEG   = P(['#140d10', '#281818', '#42261e', '#623828', '#844e34']);
const GLOW  = P(['#a4280a', '#df4e12', '#ff8822', '#ffc648', '#fff4a8']);
const EYE   = P(['#380c08', '#a02612', '#ff6420', '#ffbe60']);
const OUT   = C('#140b14');

function legB(R, hx, hy, ang, len, far) {
  const kx = hx + Math.sin(ang) * len * 0.55;
  const ky = hy + Math.cos(ang) * len * 0.45 - 1.5;
  const ex = hx + Math.sin(ang) * len;
  const ey = Math.min(BEETLE_FEET - 0.3, hy + Math.cos(ang) * len);
  const pal = far ? LEG.map(c => darken(c, 0.34)) : LEG;
  R.capsule(hx, hy, kx, ky, 1.4, 1.0, (x, y, s) => ramp(pal, clamp(0.55 - s * 0.25), x, y));
  R.capsule(kx, ky, ex, ey, 1.0, 0.7, (x, y, s) => ramp(pal, clamp(0.45 - s * 0.25), x, y));
  R.set(Math.round(ex - 0.5), Math.round(ey), pal[0]);
}

function beetleHead(R, hx, hy, open, hit) {
  // armoured cephalon tapering left
  R.ellipse(hx, hy, 5.2, 4.4, (x, y, u, v) => ramp(SHELL, clamp(0.55 - v * 0.4 + u * 0.14), x, y, 0.4));
  // serrated mandibles jutting left
  const spread = open ? 2.2 : 0.4;
  R.poly([[hx - 4, hy - 1 - spread * 0.4], [hx - 10.5, hy - 2.6 - spread], [hx - 7.5, hy + 0.2 - spread * 0.3]],
    (x, y) => ramp(LEG, clamp(0.7 - (hx - x) * 0.04), x, y));
  R.poly([[hx - 4, hy + 2.2 + spread * 0.4], [hx - 10.5, hy + 2.8 + spread], [hx - 7.5, hy + 0.8 + spread * 0.3]],
    (x, y) => ramp(LEG, clamp(0.62 - (hx - x) * 0.04), x, y));
  // delicate jointed antennae
  R.line(hx - 4, hy - 2.5, hx - 9.5, hy - 5.5 - (open ? 1 : 0), LEG[2]);
  R.set(Math.round(hx - 10), Math.round(hy - 6 - (open ? 1 : 0)), LEG[3]);
  // glowing amber eye dot
  if (!hit) {
    R.rect(hx - 3, hy - 1.5, 2, 2, EYE[1]);
    R.set(hx - 2, hy - 1.5, EYE[3]);
  } else {
    R.line(hx - 3, hy - 1, hx - 1, hy - 1, SHELL[0]);
  }
  // bioluminescent dorsal gland behind the eye (iconic Fire Beetle pair of glowing spots)
  const gx = hx + 2.5, gy = hy - 2.2;
  R.ellipse(gx, gy, 2.2, 1.8, (x, y, u, v) => {
    const d = Math.hypot(u, v);
    return ramp(GLOW, clamp(0.92 - d * 0.52), x, y, 0);
  });
  R.set(Math.round(gx), Math.round(gy), GLOW[4]);
}

// mode: 'run' (ph 0..3) | 'crouch' | 'bite' | 'hit'
export function beetleFrame(mode, ph = 0) {
  const R = new Raster(BEETLE_W, BEETLE_H);
  const run = mode === 'run';
  const bob = run ? [0, -1, 0, -0.5][ph] : mode === 'crouch' ? 1.5 : mode === 'hit' ? -1.5 : 0;
  const lean = mode === 'bite' ? -3.5 : mode === 'crouch' ? 1.8 : mode === 'hit' ? 3.5 : 0;
  const bx = BEETLE_CX + lean * 0.4;
  const by = BEETLE_FEET - 9 + bob;

  // 3 far legs behind carapace
  const stride = run ? [0.55, 0.1, -0.55, -0.1][ph] : mode === 'bite' ? 0.65 : mode === 'hit' ? -0.45 : 0.2;
  legB(R, bx - 5, by + 2, stride + 0.2, 8, true);
  legB(R, bx + 1, by + 2.5, -stride + 0.1, 8, true);
  legB(R, bx + 7, by + 2, stride - 0.15, 8.5, true);

  // rounded glossy carapace (elytra + dark pronotum)
  R.ellipse(bx + 3, by, 12.0, 6.8, (x, y, u, v) => {
    const ridge = Math.abs(v + 0.15) < 0.08 ? -0.16 : 0;
    const sheen = u > -0.2 && u < 0.45 && v < -0.25 ? 0.22 : 0;
    const speck = h2(x, y, 17) < 0.07 ? -0.1 : 0;
    return ramp(WING, clamp(0.56 - v * 0.44 + u * 0.14 + ridge + sheen + speck), x, y, 0.45);
  });
  // wing-case seam & pronotum collar
  R.ellipse(bx - 5.5, by - 0.5, 4.8, 5.8, (x, y, u, v) => ramp(SHELL, clamp(0.58 - v * 0.38 + u * 0.12), x, y, 0.4));
  // underside chitin plates
  R.ellipse(bx + 1, by + 4.8, 10.5, 2.0, (x, y, u, v) => ramp(SHELL, clamp(0.32 - v * 0.15), x, y));

  // glowing orange bioluminescent abdomen tail lantern!
  const pulse = run ? (ph % 2 ? 0.12 : 0) : mode === 'bite' ? 0.18 : 0;
  R.ellipse(bx + 12.2, by + 0.8, 4.4, 3.6, (x, y, u, v) => {
    const d = Math.hypot(u * 0.9, v);
    return ramp(GLOW, clamp(0.95 - d * 0.58 + pulse), x, y, 0.25);
  });
  R.set(Math.round(bx + 13), Math.round(by), GLOW[4]);
  R.set(Math.round(bx + 12), Math.round(by + 1), GLOW[3]);

  // head & mandibles
  const hx = Math.round(bx - 10 - (mode === 'bite' ? 1.5 : 0));
  const hy = Math.round(by + 1 + (mode === 'crouch' ? 1.5 : mode === 'hit' ? -1.5 : 0));
  beetleHead(R, hx, hy, mode === 'bite' || mode === 'crouch' || (run && ph === 1), mode === 'hit');

  // 3 near legs gripping soil
  const nStride = run ? [-0.55, -0.1, 0.55, 0.1][ph] : mode === 'bite' ? 0.8 : mode === 'hit' ? -0.55 : -0.15;
  legB(R, bx - 5.5, by + 3.2, nStride, 8.2, false);
  legB(R, bx + 0.5, by + 3.5, -nStride, 8.2, false);
  legB(R, bx + 6.5, by + 3.0, nStride - 0.1, 8.5, false);

  // subtle sun rim light + crisp ink outline
  R.rim(1, 0, c => mixC(c, PAL.rim, 0.36));
  R.rim(0, -1, c => mixC(c, PAL.rim, 0.16));
  if (mode === 'hit') { for (let i = 0; i < R.d.length; i++) if (R.d[i]) R.d[i] = mixC(R.d[i], C('#ffffff'), 0.28); }
  R.outline(OUT, false);
  return R;
}

// Pre-baked pixel-art bioluminescent orange soil pool beneath the beetle
export function buildBeetleSoilGlow() {
  const w = 44, h = 16;
  const R = new Raster(w, h);
  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot((x + 0.5 - cx) / 19, (y + 0.5 - cy) / 6.5);
    if (d >= 1) continue;
    const f = 1 - d;
    if (f > 0.62) R.set(x, y, C('#ffae38'));
    else if (f > 0.34) R.set(x, y, C('#ef6e18'));
    else if (((x + y) & 1) === 0) R.set(x, y, C('#b83e0c'));
  }
  return R.toCanvas();
}

export function buildBeetle() {
  const run = [0, 1, 2, 3].map(i => beetleFrame('run', i).toCanvas());
  return {
    run,
    crouch: beetleFrame('crouch').toCanvas(),
    bite: beetleFrame('bite').toCanvas(),
    hit: beetleFrame('hit').toCanvas(),
    soilGlow: buildBeetleSoilGlow(),
  };
}
