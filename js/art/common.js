// Shared palettes + reusable pixel-art painters (trees, clumps, windows…)
import { C, P, Raster, ramp, mixC, darken, lighten, rnd, h2 } from '../pix.js';
import { clamp, noise2, bayer } from '../util.js';

export const SUN_X = 402;                        // screen x of the rising sun (rim-light direction)
export const HAZE = C('#cfa7bd');
export const haze = (c, a) => mixC(c, HAZE, a);
export const hazeP = (pal, a) => pal.map(c => haze(c, a));

export const PAL = {
  leaf: P(['#16301f', '#1f3d25', '#2b502b', '#3b6530', '#4f7c36', '#69943e', '#88ad4a', '#a9c35e', '#cfd982']),
  grass: P(['#29492a', '#33592d', '#3f6b31', '#4e7d36', '#61903c', '#76a344', '#8fb44f', '#aac463']),
  thatch: P(['#4a2e17', '#6a4420', '#8c5d2a', '#ad7836', '#c99446', '#e0b05a', '#f1cd7c', '#fbe6a8']),
  plaster: P(['#8d7b72', '#ab9988', '#c8b69e', '#dccdb3', '#ece0c7', '#f7efdc']),
  timber: P(['#24150f', '#3a2418', '#553522', '#6e472d']),
  stone: P(['#2f2c3c', '#423f52', '#57546a', '#6e6a82', '#878299', '#a19cb0', '#bdb7c8', '#d8d0dc']),
  slate: P(['#1f2132', '#2b2e44', '#383c56', '#474c69', '#5a607d', '#727995', '#8e93ad']),
  wood: P(['#2a1a10', '#40281a', '#5a3a24', '#76502f', '#93683f', '#b08453', '#c9a06b']),
  glow: P(['#b8562a', '#e4813a', '#ffae4a', '#ffd06e', '#fff0b4']),
  rim: C('#ffd9b0'), rim2: C('#ffeccb'),
  ink: C('#1a1020'),
};

// light direction for a given screen x: the low sun sits behind the village
export function lightAt(x) { return clamp((SUN_X - x) / 220, -1, 1); }

// ---- clumpy foliage (the classic pixel-art leaf-cluster look) ----
// shape: array of ellipses [cx, cy, rx, ry]; draws clusters inside their union
export function foliage(R, shape, opts = {}) {
  const pal = opts.pal || PAL.leaf, seed = opts.seed || 1, lx = opts.lx ?? 0.5;
  const r = rnd(seed);
  const inside = (x, y) => { for (const [cx, cy, rx, ry] of shape) { const u = (x - cx) / rx, v = (y - cy) / ry; if (u * u + v * v <= 1) return [u, v]; } return null; };
  // bounding box
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [cx, cy, rx, ry] of shape) { x0 = Math.min(x0, cx - rx); x1 = Math.max(x1, cx + rx); y0 = Math.min(y0, cy - ry); y1 = Math.max(y1, cy + ry); }
  const L = norm3(lx * 0.75, -0.62, 0.55);
  // base fill (dark interior so gaps read as depth)
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
    const uv = inside(x + 0.5, y + 0.5); if (!uv) continue;
    const nz = Math.sqrt(Math.max(0, 1 - uv[0] ** 2 - uv[1] ** 2));
    const d = uv[0] * L[0] + uv[1] * L[1] + nz * L[2];
    R.set(x, y, ramp(pal, clamp(0.08 + d * 0.32), x, y));
  }
  // clusters
  const cl = [];
  const area = (x1 - x0) * (y1 - y0);
  const n = Math.floor(area / (opts.density || 9));
  const cr = opts.cluster || 3.2;
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    const uv = inside(x, y); if (!uv) continue;
    const nz = Math.sqrt(Math.max(0, 1 - uv[0] ** 2 - uv[1] ** 2));
    const d = uv[0] * L[0] + uv[1] * L[1] + nz * L[2];
    cl.push({ x, y, rr: cr * (0.6 + r() * 0.7), d, u: uv[0], v: uv[1] });
  }
  cl.sort((a, b) => a.d - b.d);
  for (const c of cl) {
    const rr = c.rr;
    for (let y = Math.floor(c.y - rr); y <= c.y + rr; y++) for (let x = Math.floor(c.x - rr); x <= c.x + rr; x++) {
      const u = (x + 0.5 - c.x) / rr, v = (y + 0.5 - c.y) / (rr * 0.85);
      if (u * u + v * v > 1) continue;
      if (!inside(x + 0.5, y + 0.5) && (u * u + v * v > 0.55)) continue;
      const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
      const local = u * L[0] + v * L[1] + nz * L[2];
      let t = 0.18 + c.d * 0.5 + local * 0.32;
      if (v > 0.55) t -= 0.12;                       // underside of each clump
      R.set(x, y, ramp(pal, clamp(t), x, y, 0.6));
    }
    // a bright leaf glint on lit clumps
    if (c.d > 0.55 && r() > 0.5) R.set(Math.round(c.x + c.rr * 0.3 * L[0]), Math.round(c.y - c.rr * 0.4), pal[pal.length - 1]);
  }
  // blossoms / fruit
  if (opts.blossom) for (let i = 0; i < n * opts.blossom; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    if (inside(x, y) && R.has(x | 0, y | 0)) R.set(x, y, opts.blossomCols[Math.floor(r() * opts.blossomCols.length)]);
  }
}
export function norm3(x, y, z) { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; }

// ---- a deciduous tree: trunk, limbs, clumpy canopy ----
export function tree(R, cx, base, s, seed, o = {}) {
  const r = rnd(seed);
  const lx = o.lx ?? lightAt(cx);
  const wood = o.wood || PAL.wood, pal = o.pal || PAL.leaf;
  const trunkH = Math.round(s * (o.trunk ?? 0.85));
  const tw = Math.max(2, Math.round(s * 0.16));
  // trunk with root flare
  for (let y = 0; y < trunkH + 4; y++) {
    const yy = base - y;
    const flare = y < 3 ? 3 - y : 0;
    const w = tw + flare;
    for (let i = -w; i <= w; i++) {
      const u = i / (w + 0.5);
      const t = 0.45 + u * lx * 0.45 + (h2(cx + i, yy, 3) - 0.5) * 0.2;
      R.set(cx + i, yy, ramp(wood, clamp(t), cx + i, yy));
    }
  }
  // limbs
  const top = base - trunkH;
  for (let k = 0; k < 3; k++) {
    const dir = k === 0 ? -1 : k === 1 ? 1 : (r() > 0.5 ? 1 : -1);
    R.line(cx, top + 4, cx + dir * s * (0.35 + r() * 0.2), top - s * (0.25 + r() * 0.2), (x, y) => ramp(wood, 0.35 + dir * lx * 0.2, x, y), 2);
  }
  // canopy
  const shape = [[cx, top - s * 0.42, s * 0.78, s * 0.58]];
  const nb = 4 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + r();
    shape.push([cx + Math.cos(a) * s * 0.55, top - s * 0.45 + Math.sin(a) * s * 0.35 - s * 0.05, s * (0.35 + r() * 0.2), s * (0.3 + r() * 0.15)]);
  }
  foliage(R, shape, { pal, seed: seed * 7 + 1, lx, density: o.density || 8, cluster: o.cluster || Math.max(2.2, s * 0.13), blossom: o.blossom, blossomCols: o.blossomCols });
  return { top: top - s };
}

// tall poplar / cypress
export function poplar(R, cx, base, s, seed, o = {}) {
  const lx = o.lx ?? lightAt(cx);
  for (let y = 0; y < 5; y++) { R.set(cx, base - y, PAL.wood[2]); R.set(cx + 1, base - y, PAL.wood[1]); }
  foliage(R, [[cx + 0.5, base - 4 - s * 0.95, s * 0.32, s * 0.95]], { pal: o.pal || PAL.leaf, seed, lx, density: 6, cluster: 2.2 });
}

// conifer
export function pine(R, cx, base, s, seed, o = {}) {
  const lx = o.lx ?? lightAt(cx), pal = o.pal || PAL.leaf;
  const r = rnd(seed);
  for (let y = 0; y < 4; y++) R.set(cx, base - y, PAL.wood[1]);
  const tiers = 4 + Math.floor(s / 10);
  for (let k = 0; k < tiers; k++) {
    const ty = base - 3 - k * (s / tiers) * 0.9;
    const w = (s * 0.42) * (1 - k / tiers) + 2;
    const hgt = s / tiers * 1.5;
    R.poly([[cx - w, ty], [cx + w + 1, ty], [cx + 0.5, ty - hgt]], (x, y) => {
      const u = (x - cx) / w;
      const t = 0.25 + u * lx * 0.35 + (ty - y) / hgt * 0.15 + (h2(x, y, seed) - 0.5) * 0.18;
      return ramp(pal, clamp(t * 0.9), x, y);
    });
    // drooping tier edge
    for (let x = Math.round(cx - w); x <= cx + w; x++) if (h2(x, k, seed) > 0.4) R.set(x, Math.round(ty), pal[1]);
  }
}

// lit window (glass glow, mullions, frame, optional shutters & flower box)
export function windowPane(R, x, y, w, h, o = {}) {
  const frame = o.frame || PAL.timber[1];
  R.rect(x - 1, y - 1, w + 2, h + 2, frame);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = 0.95 - j / h * 0.55 - (i === 0 ? 0.2 : 0) + (h2(x + i, y + j, 9) - 0.5) * 0.2;
    R.set(x + i, y + j, ramp(PAL.glow, clamp(t * (o.dim ?? 1)), x + i, y + j));
  }
  // mullions
  if (w >= 4) for (let j = 0; j < h; j++) R.set(x + Math.floor(w / 2), y + j, frame);
  if (h >= 5) for (let i = 0; i < w; i++) R.set(x + i, y + Math.floor(h / 2), frame);
  // sill
  R.hline(x - 2, x + w + 1, y + h + 1, o.sill || PAL.wood[4]);
  if (o.shutters) {
    const sc = o.shutters;
    for (const sx of [x - 3, x + w + 1]) for (let j = -1; j <= h; j++) for (let k = 0; k < 2; k++) R.set(sx + k, y + j, j % 3 === 1 ? darken(sc, 0.3) : (k ? darken(sc, 0.12) : sc));
  }
  if (o.flowers) {
    R.rect(x - 1, y + h + 2, w + 2, 2, PAL.wood[2]);
    for (let i = -1; i <= w; i++) {
      R.set(x + i, y + h + 1, h2(x + i, y, 4) > 0.45 ? o.flowers[Math.floor(h2(i, y, 5) * o.flowers.length)] : PAL.leaf[4]);
      if (h2(x + i, y, 6) > 0.6) R.set(x + i, y + h, PAL.leaf[5]);
    }
  }
}

// arched plank door
export function door(R, x, y, w, h, o = {}) {
  const pal = o.pal || PAL.wood;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const arch = j < 2 && (i === 0 || i === w - 1);
    if (arch) continue;
    let t = 0.45 + (i % 3 === 0 ? -0.18 : 0) + (h2(x + i, y + j, 2) - 0.5) * 0.15 - j / h * 0.1;
    R.set(x + i, y + j, ramp(pal, clamp(t), x + i, y + j));
  }
  R.hline(x, x + w - 1, y + 3, PAL.timber[0]); R.hline(x, x + w - 1, y + h - 4, PAL.timber[0]);
  R.set(x + w - 2, y + Math.floor(h / 2), C('#d9b45a'));
  // frame
  R.vline(x - 1, y + 1, y + h - 1, PAL.timber[0]); R.vline(x + w, y + 1, y + h - 1, PAL.timber[0]); R.hline(x + 1, x + w - 2, y - 1, PAL.timber[0]);
  R.set(x, y, PAL.timber[0]); R.set(x + w - 1, y, PAL.timber[0]);
}

// soft cast-shadow band (darken existing pixels)
export function shade(R, x, y, w, h, amt = 0.35, col = C('#2a1a35')) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = R.get(x + i, y + j); if (!(c >>> 24)) continue;
    const a = amt * (1 - j / (h + 1));
    if (a > bayer(x + i, y + j) * 0.25) R.set(x + i, y + j, mixC(c, col, a));
  }
}

// grass blade strokes over an area (meadows, verges)
export function blades(R, x0, y0, x1, y1, count, seed, pal, hMax = 4) {
  const r = rnd(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(x0 + r() * (x1 - x0)), y = Math.floor(y0 + r() * (y1 - y0));
    const h = 1 + Math.floor(r() * hMax), lean = r() > 0.5 ? 1 : -1;
    for (let k = 0; k < h; k++) R.set(x + (k === h - 1 && h > 2 ? lean : 0), y - k, k === h - 1 ? pal[pal.length - 2] : pal[Math.min(pal.length - 1, 2 + k)]);
  }
}

export { C, P, Raster, ramp, mixC, darken, lighten, rnd, h2, noise2, clamp, bayer };
