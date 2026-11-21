// Cel-shading toolkit: height-field sculpting → normals → hard-banded
// light (a few tones per material, no per-pixel noise), puff-cluster
// canopies, conifers, and "sprite then outline then blit" composition.
import { C, P, Raster, mixC, darken, lighten, rnd, h2 } from '../pix.js';
import { clamp, noise2, fbm1 } from '../util.js';

export { C, P, Raster, mixC, darken, lighten, rnd, h2, clamp, noise2, fbm1 };
export const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// hard-banded palette pick; a narrow checker band softens each step edge
export function band(pal, t, x, y, edge = 0.14) {
  t = clamp(t) * (pal.length - 1);
  let i = Math.floor(t); const f = t - i;
  if (f > 1 - edge && ((x + y) & 1)) i++;
  return pal[Math.min(pal.length - 1, i)];
}

// ---------- scalar fields ----------
export class Field {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Float32Array(w * h); }
  get(x, y) { x = x < 0 ? 0 : x >= this.w ? this.w - 1 : x | 0; y = y < 0 ? 0 : y >= this.h ? this.h - 1 : y | 0; return this.a[y * this.w + x]; }
  set(x, y, v) { this.a[y * this.w + x] = v; }
  each(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = y * this.w + x; this.a[i] = fn(x, y, this.a[i]); } return this; }
  clone() { const f = new Field(this.w, this.h); f.a.set(this.a); return f; }
  blur(r = 1, passes = 1) {
    const { w, h } = this; let a = this.a, b = new Float32Array(w * h);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < h; y++) { let s = 0; const row = y * w; for (let x = -r; x <= r; x++) s += a[row + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) { b[row + x] = s / (2 * r + 1); s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) { a[y * w + x] = s / (2 * r + 1); s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
    }
    return this;
  }
  normal(x, y, k = 1) {
    const dx = (this.get(x + 1, y) - this.get(x - 1, y)) * 0.5 * k, dy = (this.get(x, y + 1) - this.get(x, y - 1)) * 0.5 * k;
    return norm3(-dx, -dy, 1);
  }
}
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// point-in-polygon
export function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }

// ---------- sprite helper: draw into a scratch raster, outline, blit ----------
export function sprite(w, h, draw, outlineCol, diag = false) {
  const S = new Raster(w, h); draw(S);
  if (outlineCol !== null) S.outline(outlineCol ?? null, diag, 0.7);
  return S;
}

// ---------- puff-cluster canopy (classic chunky pixel-art tree crown) ----------
// pal: dark → light (5–7 tones). lx: light direction x (-1..1)
export function canopy(R, cx, cy, rx, ry, o = {}) {
  const pal = o.pal, seed = o.seed || 1, r = rnd(seed);
  const L = norm3(o.lx ?? 0.6, -0.75, 0.55);
  const pr = o.puff || Math.max(3.5, Math.min(rx, ry) * 0.42);
  const puffs = [];
  const n = Math.max(5, Math.round((rx * ry) / (pr * pr) * 1.7));
  for (let i = 0; i < n * 3 && puffs.length < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.92;
    const u = Math.cos(a) * d, v = Math.sin(a) * d;
    const px = cx + u * (rx - pr * 0.55), py = cy + v * (ry - pr * 0.55);
    const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const g = u * L[0] + v * L[1] + nz * L[2];
    puffs.push({ x: px, y: py, r: pr * (0.75 + r() * 0.45), g, ph: r() * 6.28, lobes: 5 + Math.floor(r() * 3) });
  }
  puffs.sort((a, b) => a.g - b.g);
  const base = o.base ?? 0.0, spread = o.spread ?? 0.62;
  for (const p of puffs) {
    const rr = p.r;
    for (let y = Math.floor(p.y - rr - 1); y <= p.y + rr + 1; y++) for (let x = Math.floor(p.x - rr - 1); x <= p.x + rr + 1; x++) {
      const dx = x + 0.5 - p.x, dy = y + 0.5 - p.y;
      const ang = Math.atan2(dy, dx);
      const edge = rr * (1 + 0.13 * Math.sin(ang * p.lobes + p.ph));
      const d = Math.hypot(dx, dy);
      if (d > edge) continue;
      const u = dx / edge, v = dy / edge, nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
      const loc = u * L[0] + v * L[1] + nz * L[2];
      let t = base + 0.16 + p.g * spread + (loc - 0.55) * 0.42;
      if (d > edge - 1.2 && v > 0.15) t -= 0.2;           // dark under-edge separates clusters
      R.set(x, y, band(pal, t, x, y, 0.1));
    }
    // leaf sparkle on the most lit clusters
    if (p.g > 0.72 && r() > 0.35) { const sx = Math.round(p.x + L[0] * rr * 0.35), sy = Math.round(p.y - rr * 0.45); R.set(sx, sy, pal[pal.length - 1]); R.set(sx + 1, sy, pal[pal.length - 1]); }
  }
  // stray leaves around the silhouette
  for (let i = 0; i < (o.stray ?? n * 1.2); i++) {
    const a = r() * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (rx + 0.5)), y = Math.round(cy + Math.sin(a) * (ry + 0.5));
    if (!R.has(x, y)) { const lit = Math.cos(a) * L[0] + Math.sin(a) * L[1] > 0.2; R.set(x, y, pal[lit ? pal.length - 2 : 1]); }
  }
}

// a deciduous tree as an outlined sprite: trunk + branching + canopy
export function treeSprite(o) {
  const { w, h, pal, bark, seed = 1, lx = 0.6, ink } = o;
  return sprite(w, h, S => {
    const cx = w / 2, base = h - 1, tw = o.trunkW ?? Math.max(3, Math.round(w * 0.09));
    const cTop = 2, cBot = o.canopyBot ?? Math.round(h * 0.7);
    // trunk with root flare
    for (let y = Math.round(cBot - (cBot - cTop) * 0.35); y <= base; y++) {
      const flare = Math.max(0, y - (base - 4)) * 0.9;
      const hw = tw / 2 + flare;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const u = (x - cx) / (hw + 0.01);
        S.set(x, y, band(bark, 0.45 + u * lx * 0.45 + (((x * 3 + (y >> 2)) % 5 === 0) ? -0.25 : 0), x, y));
      }
    }
    // a couple of limbs
    const r = rnd(seed + 7);
    for (let k = 0; k < 3; k++) { const s = k % 2 ? 1 : -1, y0 = cBot - 4 - k * 5; S.line(cx, y0, cx + s * (6 + r() * w * 0.18), y0 - 8 - r() * 6, bark[1], 2); }
    const rx = o.rx ?? w / 2 - 2, ry = o.ry ?? (cBot - cTop) / 2;
    canopy(S, cx, cTop + ry, rx, ry, { pal, seed, lx, puff: o.puff, stray: o.stray, spread: o.spread, base: o.base });
    if (o.blossom) { const rb = rnd(seed + 3); for (let i = 0; i < o.blossom; i++) { const x = Math.round(cx + (rb() - 0.5) * rx * 1.8), y = Math.round(cTop + ry + (rb() - 0.5) * ry * 1.8); if (S.has(x, y)) S.set(x, y, o.blossomCol); } }
  }, ink);
}

// conifer: stacked drooping tiers, lit on one side
export function coniferSprite(o) {
  const { w, h, pal, seed = 1, lx = 0.6, ink, trunk } = o;
  return sprite(w, h, S => {
    const cx = (w - 1) / 2, top = 1, bot = h - 3, tiers = o.tiers ?? Math.max(3, Math.round(h / 7));
    if (trunk) for (let y = bot - 1; y < h; y++) { S.set(Math.floor(cx), y, trunk[1]); S.set(Math.ceil(cx), y, trunk[0]); }
    for (let k = 0; k < tiers; k++) {
      const t0 = top + (bot - top) * (k / tiers) * 0.92, t1 = top + (bot - top) * ((k + 1) / tiers) + 1;
      const hw0 = 0.5 + (w / 2 - 1) * Math.pow((k) / tiers, 0.9) * 0.55, hw1 = (w / 2 - 0.5) * Math.pow((k + 1) / tiers, 0.85);
      for (let y = Math.floor(t0); y <= Math.ceil(t1); y++) {
        const f = (y - t0) / (t1 - t0 + 0.01);
        const hw = hw0 + (hw1 - hw0) * Math.pow(f, 0.8);
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const u = (x - cx) / (hw + 0.5);
          // droop: tier edge sags at the tips
          if (f > 0.82 && Math.abs(u) < 0.25 && h2(x, y, seed) > 0.5) continue;
          let t = 0.35 + u * lx * 0.42 + (1 - f) * 0.18 - (f > 0.8 ? 0.22 : 0);
          S.set(x, y, band(pal, t, x, y, 0.1));
        }
      }
    }
  }, ink);
}
