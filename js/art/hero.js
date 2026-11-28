// The Human Fighter — drawn on a tiny pose rig so the walk cycle is a
// real 8-frame gait (planted feet, knee bend, arm swing, cape sway).
import { C, P, Raster, ramp, mixC, darken, lighten, h2, clamp, PAL } from './common.js';
import {
  DEFAULT_HERO_STYLE, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CAPE_COLORS, TABARD_COLORS,
  findOption, normalizeHeroStyle,
} from '../progression.js';

import { ScaledRaster } from '../pix.js';
const DW = 40, DH = 66, DFEET = 63, DCX = 20;          // design-space rig size (body)
const OX = 12, OY = 8, PW = DW + OX + 22, PH = DH + OY;  // padded canvas: room for the greatsword in every pose
export const HK = 1.2;                                  // rendered 1.2× larger (shapes re-rasterised, not upscaled)
export const HERO_W = Math.ceil(PW * HK), HERO_H = Math.ceil(PH * HK), HERO_FEET = Math.round((DFEET + OY + 1) * HK) - 1, HERO_CX = Math.round((DCX + OX) * HK);
// where the shoulder sits in the frame (for sword smears), in rendered pixels from the frame's top-left
export const HERO_SHOULDER = [Math.round((20 + OX) * HK), Math.round((23 + OY) * HK)];

// A ScaledRaster that draws in body design space but writes into the padded canvas.
// Shaders still receive unshifted design coordinates, so all gradients/dither stay put.
class PadRaster extends ScaledRaster {
  constructor() { super(PW, PH, HK); }
  set(x, y, c) { if (this.raw) return super.set(x, y, c); return super.set(x + OX, y + OY, c); }
  _w(c) { return typeof c === 'function' ? (x, y, ...r) => c(x - OX, y - OY, ...r) : c; }
  ellipse(cx, cy, rx, ry, c) { super.ellipse(cx + OX, cy + OY, rx, ry, this._w(c)); }
  poly(pts, c) { super.poly(pts.map(([x, y]) => [x + OX, y + OY]), this._w(c)); }
  capsule(x0, y0, x1, y1, r0, r1, c) { super.capsule(x0 + OX, y0 + OY, x1 + OX, y1 + OY, r0, r1, this._w(c)); }
  line(x0, y0, x1, y1, c, w = 1) { super.line(x0 + OX, y0 + OY, x1 + OX, y1 + OY, this._w(c), w); }
}

const MAIL = P(['#22242f', '#363948', '#4f5366', '#6d7286', '#9298ab', '#bcc1cf', '#e3e6ee']);
const PLATE = P(['#262a38', '#3d4357', '#5b6379', '#808aa0', '#a9b2c6', '#d3dae7', '#f4f7fb']);
const GOLD = P(['#5a3510', '#8a5a1a', '#bd8a2e', '#e5b84d', '#f8de86', '#fff5c8']);
const LEA = P(['#1f120b', '#341f13', '#4f311f', '#6d462c', '#8c5e3c', '#ab7a50']);
const WOOD = PAL.wood;
const TIN = P(['#2a2e3c', '#484e62', '#6e7488', '#969cb2', '#bcc2d4', '#e2e8f4']);    // a pie tin: brighter, bluer tin
const BERRY = P(['#1c1434', '#342458', '#4e3a7e', '#6a52a4', '#8a6ec2']);              // blueberry stain
const OUT = C('#1a1020');
const deg = Math.PI / 180;

function resolvePalettes(rawStyle) {
  const st = normalizeHeroStyle(rawStyle || DEFAULT_HERO_STYLE);
  const skin = P(findOption(SKIN_TONES, st.skin).ramp);
  const hair = P(findOption(HAIR_COLORS, st.hairColor).ramp);
  const eyeOpt = findOption(EYE_COLORS, st.eyeColor);
  const cape = P(findOption(CAPE_COLORS, st.capeColor).ramp);
  const tab = P(findOption(TABARD_COLORS, st.tabardColor).ramp);
  return { st, skin, hair, eye: C(eyeOpt.iris), cape, tab };
}

// light comes from the right (the sun is ahead of him): shader helper for limbs
const limb = pal => (x, y, s, t) => ramp(pal, clamp(0.55 - s * 0.38 + (h2(x, y, 4) - 0.5) * 0.08), x, y, 0.5);

// Combat poses: a two-handed greatsword. `grip` is where both hands meet (design space, relative to
// the shoulder line), `dir` the blade direction in degrees (0 = forward, -90 = straight up).
const COMBAT = {
  ready:  { near: { th: 15, kn: 12 }, far: { th: -15, kn: 8 }, grip: [25, 11], dir: -52, bob: 1 },
  ready2: { near: { th: 15, kn: 13 }, far: { th: -15, kn: 9 }, grip: [25, 12], dir: -50, bob: 1 },
  windup: { near: { th: 10, kn: 16 }, far: { th: -20, kn: 6 }, grip: [13, -8], dir: -150, bob: 1 },
  strike: { near: { th: 30, kn: 26 }, far: { th: -22, kn: 4 }, grip: [31, 8], dir: 12, bob: 2 },
  follow: { near: { th: 28, kn: 24 }, far: { th: -22, kn: 6 }, grip: [27, 15], dir: 62, bob: 2 },
  hurt:   { near: { th: 8, kn: 8 }, far: { th: -18, kn: 10 }, grip: [21, 13], dir: -72, bob: 0, recoil: true },
};
function pose(phase, walking, mode) {
  if (COMBAT[mode]) {
    const m = COMBAT[mode];
    return { near: { th: m.near.th * deg, kn: m.near.kn * deg }, far: { th: m.far.th * deg, kn: m.far.kn * deg }, armN: { up: 0, el: 0 }, armF: { up: 0, el: 0 },
      breathe: 0, cape: mode === 'strike' || mode === 'follow' ? 2.6 : 1.2, combat: m };
  }
  if (!walking) {
    const br = Math.sin(phase) * 0.5 + 0.5;
    return { near: { th: 5 * deg, kn: 3 * deg }, far: { th: -7 * deg, kn: 2 * deg }, armN: { up: 6 * deg, el: 18 * deg }, armF: { up: -4 * deg, el: 14 * deg }, breathe: br, cape: Math.sin(phase) * 0.6, bob: 0 };
  }
  const leg = ph => {
    const th = 26 * deg * Math.sin(ph);
    const swing = Math.cos(ph);                       // >0 while the leg travels forward
    const kn = (swing > 0 ? 44 * swing : 6 * Math.max(0, -Math.sin(ph))) * deg;
    return { th, kn };
  };
  return {
    near: leg(phase), far: leg(phase + Math.PI),
    armN: { up: -24 * deg * Math.sin(phase), el: (20 + 18 * Math.max(0, Math.sin(phase))) * deg },
    armF: { up: 22 * deg * Math.sin(phase), el: (18 + 14 * Math.max(0, -Math.sin(phase))) * deg },
    breathe: 0, cape: Math.cos(phase * 2) * 1.2 + 1.5, walk: true,
  };
}

function legPts(hip, L, l1 = 12, l2 = 12) {
  const knee = [hip[0] + Math.sin(L.th) * l1, hip[1] + Math.cos(L.th) * l1];
  const a = L.th - L.kn;
  const ankle = [knee[0] + Math.sin(a) * l2, knee[1] + Math.cos(a) * l2];
  return { hip, knee, ankle };
}

function drawLeg(R, g, far) {
  const k = far ? 0.22 : 0;
  const trous = LEA.map(c => darken(mixC(c, C('#4a3a2e'), 0.3), k));
  const boot = LEA.map(c => darken(c, k + 0.1));
  R.capsule(g.hip[0], g.hip[1], g.knee[0], g.knee[1], 3.4, 2.9, limb(trous));
  R.capsule(g.knee[0], g.knee[1], g.ankle[0], g.ankle[1], 2.9, 2.6, (x, y, s, t) => (t > 0.38 ? limb(boot) : limb(trous))(x, y, s, t));
  const cx = g.knee[0] + (g.ankle[0] - g.knee[0]) * 0.38, cy = g.knee[1] + (g.ankle[1] - g.knee[1]) * 0.38;
  R.capsule(cx - 2.6, cy, cx + 2.6, cy, 1.2, 1.2, (x, y) => ramp(boot, 0.75, x, y));
  R.capsule(g.ankle[0] - 1, g.ankle[1] + 0.6, g.ankle[0] + 4.6, g.ankle[1] + 1.2, 2.1, 1.6, (x, y, s) => ramp(boot, clamp(0.45 - s * 0.2), x, y));
  R.hline(Math.round(g.ankle[0] - 2), Math.round(g.ankle[0] + 5), Math.round(g.ankle[1] + 2.6), darken(boot[1], 0.2));
  if (!far) R.ellipse(g.knee[0] + 0.8, g.knee[1], 2.4, 2.2, (x, y, u, v) => ramp(PLATE, clamp(0.55 + u * 0.3 - v * 0.25), x, y));
}

function drawArm(R, sh, A, far) {
  const k = far ? 0.25 : 0;
  const mail = MAIL.map(c => darken(c, k)), lea = LEA.map(c => darken(c, k));
  const elbow = [sh[0] + Math.sin(A.up) * 9, sh[1] + Math.cos(A.up) * 9];
  const fa = A.up + A.el;
  const hand = [elbow[0] + Math.sin(fa) * 8, elbow[1] + Math.cos(fa) * 8];
  R.capsule(sh[0], sh[1], elbow[0], elbow[1], 2.8, 2.4, (x, y, s) => {
    const ring = (x + y) % 2 === 0 ? 0.06 : -0.06;
    return ramp(mail, clamp(0.55 - s * 0.35 + ring), x, y, 0.4);
  });
  R.capsule(elbow[0], elbow[1], hand[0], hand[1], 2.4, 2.2, limb(lea));
  const bx = elbow[0] + (hand[0] - elbow[0]) * 0.5, by = elbow[1] + (hand[1] - elbow[1]) * 0.5;
  R.set(bx, by, darken(lea[2], 0.3)); R.set(bx + 1, by, darken(lea[2], 0.3));
  R.ellipse(hand[0] + 0.3, hand[1] + 0.6, 2.4, 2.4, (x, y, u, v) => ramp(lea, clamp(0.55 + u * 0.3 - v * 0.2), x, y));
  return { elbow, hand };
}

function armIK(sh, hand, l1 = 9, l2 = 8) {
  let dx = hand[0] - sh[0], dy = hand[1] - sh[1]; let d = Math.hypot(dx, dy);
  const md = l1 + l2 - 0.3; if (d > md) { hand = [sh[0] + dx / d * md, sh[1] + dy / d * md]; dx = hand[0] - sh[0]; dy = hand[1] - sh[1]; d = md; }
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const e1 = [sh[0] + Math.cos(a + b) * l1, sh[1] + Math.sin(a + b) * l1], e2 = [sh[0] + Math.cos(a - b) * l1, sh[1] + Math.sin(a - b) * l1];
  return { elbow: e1[1] >= e2[1] ? e1 : e2, hand };
}
function drawArmIK(R, sh, target, far) {
  const k = far ? 0.25 : 0;
  const mail = MAIL.map(c => darken(c, k)), lea = LEA.map(c => darken(c, k));
  const { elbow, hand } = armIK(sh, target);
  R.capsule(sh[0], sh[1], elbow[0], elbow[1], 2.8, 2.4, (x, y, s) => ramp(mail, clamp(0.55 - s * 0.35 + ((x + y) % 2 === 0 ? 0.06 : -0.06)), x, y, 0.4));
  R.capsule(elbow[0], elbow[1], hand[0], hand[1], 2.4, 2.2, limb(lea));
  R.ellipse(hand[0] + 0.3, hand[1] + 0.3, 2.5, 2.5, (x, y, u, v) => ramp(lea, clamp(0.55 + u * 0.3 - v * 0.2), x, y));
  return { elbow, hand };
}
const STEEL = P(['#2b3042', '#4a536a', '#6f7a92', '#9aa6bd', '#c8d1e2', '#eef3fb', '#ffffff']);
function drawSword(R, g, dirDeg) {
  const a = dirDeg * deg, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  const at = d => [g[0] + ux * d, g[1] + uy * d];
  const [p0x, p0y] = at(-4.5), [g0x, g0y] = at(-3.5), [g1x, g1y] = at(2.5), [b0x, b0y] = at(3.2), [tipx, tipy] = at(27);
  R.capsule(b0x, b0y, tipx - ux * 1.5, tipy - uy * 1.5, 1.8, 1.0, (x, y, s, t) => ramp(STEEL, clamp(0.62 - s * 0.45 + (t > 0.85 ? 0.1 : 0)), x, y, 0.4));
  R.line(b0x + ux * 1.5, b0y + uy * 1.5, tipx - ux * 4, tipy - uy * 4, STEEL[2]);
  R.set(tipx, tipy, STEEL[5]);
  R.capsule(g1x + px * 3.6, g1y + py * 3.6, g1x - px * 3.6, g1y - py * 3.6, 1.1, 1.1, (x, y, s) => ramp(GOLD, clamp(0.6 - s * 0.4), x, y));
  R.capsule(g0x, g0y, g1x, g1y, 1.05, 1.05, (x, y, s, t) => ((Math.floor(t * 5) % 2) ? LEA[1] : LEA[3]));
  R.ellipse(p0x, p0y, 1.6, 1.6, (x, y, u, v) => ramp(GOLD, clamp(0.65 - (u + v) * 0.3), x, y));
}

function drawHead(R, hx, hy, Pals) {
  const { st, skin: SKIN, hair: HAIR, eye: EYE } = Pals;
  const hs = st.hairStyle || 'fringe';
  const fh = st.facialHair || 'stubble';

  if (hs === 'braid') {
    R.capsule(hx - 5, hy + 2, hx - 7, hy + 13, 2.2, 1.4, (x, y, s, t) =>
      ramp(HAIR, clamp(0.42 - s * 0.25 + ((Math.floor(t * 6) % 2) ? 0.12 : -0.08)), x, y, 0.3));
    R.set(hx - 7, hy + 13, GOLD[3]);
    R.set(hx - 7, hy + 15, HAIR[3]);
  }

  R.ellipse(hx, hy, 6.6, 7, (x, y, u, v) => {
    const hairCutoff = hs === 'crop' ? -0.34 : hs === 'swept' ? -0.22 : -0.12;
    const hairLine = hairCutoff + u * 0.55;
    const backCut = hs === 'crop' ? -0.45 : -0.32;
    const isHair = v < hairLine - 0.1 || u < backCut || (v < -0.55);
    if (isHair) {
      const strand = ((x * 2 + y) % 3 === 0) ? -0.12 : 0.04;
      return ramp(HAIR, clamp(0.5 + u * 0.3 - v * 0.15 + strand), x, y, 0.4);
    }
    return ramp(SKIN, clamp(0.58 + u * 0.32 - v * 0.15), x, y, 0.5);
  });

  R.rect(hx - 1, hy + 4, 7, 3, (x, y) => ramp(SKIN, clamp(0.45 + (x - hx) * 0.06 - (y - hy - 4) * 0.08), x, y));
  R.set(hx + 6, hy + 4, SKIN[3]); R.set(hx + 5, hy + 6, SKIN[2]);

  R.set(hx + 7, hy + 1, SKIN[4]); R.set(hx + 7, hy + 2, SKIN[3]); R.set(hx + 6, hy + 3, SKIN[1]);
  R.set(hx + 4, hy, C('#f4efe6')); R.set(hx + 5, hy, C('#1d1a2c')); R.set(hx + 5, hy - 1, EYE);
  R.hline(hx + 3, hx + 6, hy - 2, HAIR[1]);
  R.hline(hx + 4, hx + 5, hy + 4, SKIN[1]);
  R.rect(hx - 1, hy, 2, 3, SKIN[3]); R.set(hx - 1, hy + 1, SKIN[1]); R.set(hx, hy, SKIN[4]);

  if (st.scar) {
    R.set(hx + 2, hy + 1, SKIN[1]);
    R.set(hx + 3, hy + 2, SKIN[4]);
    R.set(hx + 4, hy + 3, SKIN[1]);
  }

  if (fh === 'stubble') {
    for (let x = hx; x <= hx + 5; x++) if ((x + hy) % 2) R.set(x, hy + 6, SKIN[2]);
  } else if (fh === 'mustache') {
    R.hline(hx + 3, hx + 6, hy + 3, HAIR[1]);
    R.set(hx + 7, hy + 4, HAIR[2]);
  } else if (fh === 'goatee') {
    R.hline(hx + 3, hx + 6, hy + 3, HAIR[1]);
    R.rect(hx + 3, hy + 5, 3, 2, HAIR[1]);
    R.set(hx + 5, hy + 6, HAIR[2]);
  } else if (fh === 'beard') {
    R.poly([[hx, hy + 3], [hx + 6, hy + 3], [hx + 7, hy + 6], [hx + 4, hy + 8], [hx, hy + 7]], (x, y) =>
      ramp(HAIR, clamp(0.32 + (x - hx) * 0.05 - (y - hy - 4) * 0.04), x, y, 0.3));
    R.hline(hx + 4, hx + 5, hy + 4, SKIN[1]);
  }

  if (hs === 'fringe') {
    for (const [dx, dy] of [[2, -5], [3, -4], [4, -4], [5, -3], [1, -5], [6, -3]]) R.set(hx + dx, hy + dy, HAIR[3]);
    R.set(hx + 6, hy - 2, HAIR[2]); R.set(hx + 7, hy - 3, HAIR[3]);
  } else if (hs === 'parted') {
    for (const [dx, dy] of [[-1, -5], [0, -5], [1, -4], [2, -4], [4, -5], [5, -4], [6, -3]]) R.set(hx + dx, hy + dy, HAIR[3]);
    R.hline(hx + 2, hx + 4, hy - 5, HAIR[4]);
  } else if (hs === 'crop') {
    R.hline(hx - 2, hx + 5, hy - 5, HAIR[2]);
    R.hline(hx + 1, hx + 5, hy - 4, HAIR[3]);
  } else if (hs === 'swept') {
    for (const [dx, dy] of [[-3, -6], [-2, -6], [-1, -6], [0, -6], [1, -6], [2, -6], [3, -5], [4, -5]]) R.set(hx + dx, hy + dy, HAIR[4]);
    R.hline(hx - 4, hx + 2, hy - 7, HAIR[5]);
  } else if (hs === 'braid') {
    for (const [dx, dy] of [[0, -5], [1, -5], [2, -4], [3, -4], [4, -4]]) R.set(hx + dx, hy + dy, HAIR[3]);
  }

  R.hline(hx - 3, hx + 1, hy - 6, HAIR[5]); R.set(hx - 4, hy - 5, HAIR[4]);
}

export function heroFrame(phase, walking, mode = null, tin = false, style = DEFAULT_HERO_STYLE) {
  const Pals = resolvePalettes(style);
  const { st, skin: SKIN, cape: CAPE, tab: TAB } = Pals;
  const R = new PadRaster();
  const p = pose(phase, walking, mode);
  const cm = p.combat;
  const hipX = 19, hipY0 = 38;
  const n0 = legPts([hipX + 1, hipY0], p.near), f0 = legPts([hipX - 1, hipY0], p.far);
  const lowest = Math.max(n0.ankle[1], f0.ankle[1]);
  const dy = Math.round(DFEET - 2.6 - lowest) + (cm ? cm.bob : 0);
  const hipY = hipY0 + dy;
  const nearL = legPts([hipX + 1, hipY], p.near), farL = legPts([hipX - 1, hipY], p.far);
  const bodyY = hipY - 38;
  const br = p.breathe ? Math.round(p.breathe) : 0;
  const shY = 21 + bodyY - br * 0;

  // 1. cape (behind everything), billowing back
  const sway = p.cape;
  R.poly([[12, shY - 3], [20, shY - 3], [19, shY + 16], [17 - sway * 0.5, shY + 36], [6 - sway * 1.6, shY + 37], [6 - sway, shY + 18]], (x, y) => {
    const v = (y - shY) / 30;
    const fold = Math.sin((x + y * 0.4) / 2.2) * 0.12;
    return ramp(CAPE, clamp(0.38 + fold - v * 0.15 + (x - 10) * 0.02), x, y, 0.5);
  });
  // 2. far arm & far leg
  const grip = cm ? [cm.grip[0], shY + cm.grip[1]] : null;
  if (cm) drawArmIK(R, [16, shY + 1], [grip[0] - 2.2, grip[1] + 0.6], true); else drawArm(R, [16, shY + 1], p.armF, true);
  drawLeg(R, farL, true);
  // 3. backpack
  const bpx = 6, bpy = shY + 1;
  R.rect(bpx, bpy + 3, 8, 14, (x, y) => ramp(LEA, clamp(0.5 + (x - bpx) * 0.04 - (y - bpy) * 0.01 + ((y - bpy) === 10 ? -0.25 : 0)), x, y));
  R.rect(bpx - 1, bpy + 9, 3, 6, (x, y) => ramp(LEA, 0.35 + (x - bpx) * 0.05, x, y));
  R.hline(bpx, bpx + 7, bpy + 3, LEA[5]);
  R.capsule(bpx - 1, bpy + 1, bpx + 9, bpy + 1, 2.3, 2.3, (x, y, s2) => ramp(P(['#3a3a30', '#5c5a44', '#807a5a', '#a49c74', '#c8bf94']), clamp(0.55 - s2 * 0.4 + ((x % 3) === 0 ? -0.15 : 0)), x, y));
  R.vline(bpx + 2, bpy - 1, bpy + 3, LEA[1]); R.vline(bpx + 6, bpy - 1, bpy + 3, LEA[1]);
  R.rect(bpx + 2, bpy + 7, 3, 3, GOLD[2]); R.set(bpx + 3, bpy + 8, LEA[1]);
  R.ellipse(bpx + 1, bpy + 19, 2, 1.6, (x, y, u) => ramp(PLATE, 0.55 + u * 0.3, x, y));
  // 4. near leg
  drawLeg(R, nearL, false);
  // 5. torso: mail hauberk, tabard, belt
  const tY = shY - 2;
  R.poly([[13, tY], [24, tY + 1], [25, tY + 10], [24, tY + 19], [13, tY + 19], [12, tY + 9]], (x, y) => {
    const ring = (x + y) % 2 === 0 ? 0.05 : -0.05;
    return ramp(MAIL, clamp(0.5 + (x - 18) * 0.04 + ring - (y - tY) * 0.006), x, y, 0.4);
  });
  R.poly([[13, tY + 18], [24, tY + 18], [26, tY + 24], [12, tY + 24]], (x, y) => ramp(MAIL, clamp(0.45 + (x - 18) * 0.04 + ((x + y) % 2 ? 0.08 : -0.06)), x, y));
  for (let x = 12; x <= 26; x++) if (x % 2) R.set(x, tY + 24, MAIL[2]);
  const hem = walking ? Math.round(Math.sin(phase * 2) * 0.8) : 0;
  R.poly([[16, tY + 3], [24, tY + 3], [25, tY + 18], [26 + hem, tY + 27], [15 + hem, tY + 27], [15, tY + 18]], (x, y) => {
    const fold = ((x - 16) % 4 === 0 && y > tY + 18) ? -0.15 : 0;
    return ramp(TAB, clamp(0.5 + (x - 20) * 0.05 + fold - (y - tY) * 0.005), x, y, 0.5);
  });
  for (let y = tY + 3; y <= tY + 27; y++) { R.set(15 + (y > tY + 18 ? hem * (y - tY - 18) / 9 : 0), y, GOLD[2]); }
  R.hline(15 + hem, 26 + hem, tY + 27, GOLD[3]);
  R.line(24, tY + 1, 14, tY + 14, LEA[2], 2);
  R.line(24, tY + 1, 14, tY + 14, (x, y, n) => n % 3 === 1 ? LEA[5] : LEA[3], 1);
  R.set(19, tY + 8, GOLD[4]); R.set(20, tY + 7, GOLD[2]);
  for (let x = 17; x <= 24; x += 2) R.set(x + hem, tY + 22, TAB[2]), R.set(x + 1 + hem, tY + 25, TAB[2]);
  const ex = 21, ey = tY + 11;
  for (const [dx, dy2, c] of [[0, -2, 4], [0, -1, 3], [-1, 0, 3], [0, 0, 4], [1, 0, 3], [-2, 0, 2], [2, 0, 2], [0, 1, 3], [-1, 2, 2], [1, 2, 2]]) R.set(ex + dx, ey + dy2, GOLD[c]);
  R.rect(13, tY + 17, 13, 2, (x, y) => ramp(LEA, y === tY + 17 ? 0.6 : 0.3, x, y));
  R.rect(21, tY + 16, 3, 4, GOLD[3]); R.set(22, tY + 17, LEA[1]); R.set(22, tY + 18, LEA[1]); R.set(21, tY + 16, GOLD[5]);
  R.rect(13, tY + 19, 4, 4, (x, y) => ramp(LEA, 0.45 + (x - 13) * 0.05, x, y)); R.hline(13, 16, tY + 19, LEA[4]);
  // 6. sword
  R.line(17, tY + 19, 8, tY + 34, (x, y, n) => n % 5 === 4 ? GOLD[2] : LEA[2], 2);
  R.line(17, tY + 19, 8, tY + 34, LEA[4], 1);
  R.set(8, tY + 35, GOLD[3]); R.set(7, tY + 35, GOLD[2]);
  if (!cm) {
    R.line(18, tY + 18, 22, tY + 13, LEA[1], 1);
    R.line(16, tY + 17, 20, tY + 21, GOLD[3], 1);
    R.set(23, tY + 12, GOLD[4]); R.set(22, tY + 12, GOLD[2]);
  } else { R.set(17, tY + 19, GOLD[3]); R.set(18, tY + 18, GOLD[2]); }
  if (cm && cm.dir < -100) drawSword(R, grip, cm.dir);
  // 7. head & neck
  R.rect(18, shY - 5, 4, 4, (x, y) => ramp(SKIN, 0.35 + (x - 18) * 0.08, x, y));
  drawHead(R, 19, shY - 12 + br, Pals);
  const hx = 19, hy = shY - 12 + br;
  if (st.hoodUp) {
    R.ellipse(hx - 0.5, hy - 1, 8.2, 8.6, (x, y, u, v) => {
      const face = u > 0.05 && v > -0.42 && !(u > 0.05 && v > -0.42 && (u - 0.05) < 0.18 && v < 0.9);
      if (face && u > 0.22) return null;
      if (u > 0.05 && v > -0.42 && u <= 0.22) return ramp(CAPE, 0.15, x, y);
      const fold = ((x * 2 - y) % 5 === 0) ? -0.15 : 0;
      return ramp(CAPE, clamp(0.5 + u * 0.3 - v * 0.25 + fold), x, y, 0.5);
    });
    R.line(hx + 2, hy - 8, hx + 7, hy - 4, CAPE[6]); R.line(hx + 7, hy - 4, hx + 7, hy - 3, CAPE[5]);
  } else {
    R.poly([[10, shY - 10], [16, shY - 9], [16, shY - 4], [9, shY - 4]], (x, y) =>
      ramp(CAPE, clamp(0.32 + (x - 10) * 0.04), x, y, 0.4));
  }
  R.poly([[12, shY - 5], [25, shY - 5], [26, shY + 2], [11, shY + 3]], (x, y) => ramp(CAPE, clamp(0.45 + (x - 16) * 0.04 - (y - shY) * 0.03 + ((x + y) % 4 === 0 ? -0.12 : 0)), x, y, 0.5));
  R.rect(16, shY - 3, 8, 0, CAPE[3]);
  R.set(22, shY - 1, GOLD[4]); R.set(23, shY - 1, GOLD[2]);
  if (tin) {
    const tx = hx + 0.5, ty = hy - (st.hoodUp ? 8.4 : 7.4);
    R.ellipse(tx, ty - 0.6, 7.4, 2.9, (x, y, u, v) => ramp(TIN, clamp(0.6 - v * 0.4 - u * 0.08), x, y, 0.4));
    R.ellipse(tx, ty + 1.4, 9.2, 1.7, (x, y, u, v) => ramp(TIN, clamp(0.46 - v * 0.3), x, y));
    for (let i = -8; i <= 8; i += 3) R.set(Math.round(tx + i), Math.round(ty + 1.4) - 1, TIN[1]);
    R.set(Math.round(tx - 3), Math.round(ty - 2.2), TIN[5]); R.set(Math.round(tx - 2), Math.round(ty - 2.9), TIN[4]);
    R.set(Math.round(tx + 4), Math.round(ty - 0.8), BERRY[1]); R.set(Math.round(tx + 5), Math.round(ty - 0.1), BERRY[0]);
  }
  // 8. near arm + pauldron
  if (cm && cm.dir >= -100) drawSword(R, grip, cm.dir);
  cm ? drawArmIK(R, [20, shY + 2], grip, false) : drawArm(R, [20, shY + 2], p.armN, false);
  R.ellipse(20, shY + 1, 4.6, 3.6, (x, y, u, v) => ramp(TAB, clamp(0.55 + u * 0.3 - v * 0.35), x, y));
  R.hline(17, 23, shY + 3, TAB[1]); R.set(22, shY - 1, TAB[6]);
  R.rim(1, 0, (c, x, y) => mixC(c, PAL.rim, y < (40 + dy + OY) * HK ? 0.45 : 0.22));
  R.outline(OUT, false);
  return R;
}

export function buildHero(tin = false, style = DEFAULT_HERO_STYLE) {
  const walk = [], idle = [];
  for (let f = 0; f < 8; f++) walk.push(heroFrame(f / 8 * Math.PI * 2, true, null, tin, style).toCanvas());
  for (let f = 0; f < 2; f++) idle.push(heroFrame(f * Math.PI, false, null, tin, style).toCanvas());
  const combat = {};
  for (const m of Object.keys(COMBAT)) combat[m] = heroFrame(0, false, m, tin, style).toCanvas();
  return { walk, idle, combat };
}
