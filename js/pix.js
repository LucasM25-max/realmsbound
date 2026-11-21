// ─────────────────────────────────────────────────────────────
//  Pixel toolkit: an integer raster with palette ramps, ordered
//  dithering, polygon/ellipse fills with per-pixel shaders, and
//  selective outlining. Every piece of art in the game is drawn
//  through this — no bitmaps.
// ─────────────────────────────────────────────────────────────
import { bayer, hash, clamp } from './util.js';

// packed little-endian RGBA (matches ImageData via Uint32Array)
export function C(hex, a = 255) {
  const n = parseInt(hex.slice(1), 16);
  return ((a << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
}
export const rgbOf = c => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
export const alphaOf = c => c >>> 24;
export function pack(r, g, b, a = 255) { return ((a << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0; }
export function mixC(c1, c2, t) {
  const a = rgbOf(c1), b = rgbOf(c2);
  return pack(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t));
}
export const P = arr => arr.map(h => C(h));          // palette from hex list
export const darken = (c, t = 0.35) => mixC(c, C('#1a0f1f'), t);
export const lighten = (c, t = 0.35) => mixC(c, C('#fff4dc'), t);

// pick from a colour ramp with Bayer dithering between steps
export function ramp(cols, t, x, y, dither = 1) {
  t = clamp(t) * (cols.length - 1);
  let i = Math.floor(t); const f = t - i;
  if (dither && f > bayer(x, y) * dither + (1 - dither) * 0.5) i++;
  return cols[Math.min(cols.length - 1, i)];
}

export class Raster {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x |= 0; y |= 0; if (c && this.in(x, y)) this.d[y * this.w + x] = c; }
  get(x, y) { x |= 0; y |= 0; return this.in(x, y) ? this.d[y * this.w + x] : 0; }
  has(x, y) { return alphaOf(this.get(x, y)) > 0; }
  clear(x, y) { if (this.in(x, y)) this.d[(y | 0) * this.w + (x | 0)] = 0; }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, typeof c === 'function' ? c(x + i, y + j, i, j) : c);
  }
  hline(x0, x1, y, c) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, typeof c === 'function' ? c(x, y) : c); }
  vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, typeof c === 'function' ? c(x, y) : c); }
  // filled ellipse; shader gets (x, y, u, v) with u,v in [-1,1]
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, u, v) : c);
    }
  }
  // polygon (even-odd), shader gets (x, y)
  poly(pts, c) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const py = y + 0.5, xs = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py)) xs.push(xi + (py - yi) / (yj - yi) * (xj - xi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }
  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    const r = (w - 1) / 2;
    for (;;) {
      if (w <= 1) this.set(x0, y0, typeof c === 'function' ? c(x0, y0, n) : c);
      else for (let j = -Math.floor(r); j <= Math.ceil(r); j++) for (let i = -Math.floor(r); i <= Math.ceil(r); i++) this.set(x0 + i, y0 + j, typeof c === 'function' ? c(x0 + i, y0 + j, n) : c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } n++;
    }
  }
  // thick tapered segment (limbs): shader gets (x, y, s across [-1,1], t along [0,1])
  capsule(x0, y0, x1, y1, r0, r1, c) {
    const minx = Math.floor(Math.min(x0, x1) - Math.max(r0, r1) - 1), maxx = Math.ceil(Math.max(x0, x1) + Math.max(r0, r1) + 1);
    const miny = Math.floor(Math.min(y0, y1) - Math.max(r0, r1) - 1), maxy = Math.ceil(Math.max(y0, y1) + Math.max(r0, r1) + 1);
    const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1, L = Math.sqrt(L2);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0;
      const t = clamp((px * vx + py * vy) / L2);
      const r = r0 + (r1 - r0) * t;
      const cx = px - vx * t, cy = py - vy * t;
      const d2 = cx * cx + cy * cy;
      if (d2 <= r * r) {
        const s = (cx * -vy + cy * vx) / L / r;       // signed across
        this.set(x, y, typeof c === 'function' ? c(x, y, s, t) : c);
      }
    }
  }
  blit(src, dx, dy, flip = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
      if (alphaOf(c)) this.set(dx + x, dy + y, c);
    }
  }
  // outline all opaque pixels (4-neighbour, optionally 8) with a colour or with a darkened neighbour colour
  outline(col = null, diag = false, amt = 0.62) {
    const add = [];
    for (let y = -1; y <= this.h; y++) for (let x = -1; x <= this.w; x++) {
      if (this.has(x, y)) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (diag) nb.push([1, 1], [-1, 1], [1, -1], [-1, -1]);
      for (const [dx, dy] of nb) {
        if (this.has(x + dx, y + dy)) { add.push([x, y, col ?? darken(this.get(x + dx, y + dy), amt)]); break; }
      }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }
  // recolour the interior edge pixels that face a direction (rim light / shade)
  rim(dx, dy, fn) {
    const hits = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++)
      if (this.has(x, y) && !this.has(x + dx, y + dy)) hits.push([x, y]);
    for (const [x, y] of hits) this.set(x, y, fn(this.get(x, y), x, y));
    return this;
  }
  toCanvas() {
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    const x = c.getContext('2d');
    const id = x.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.d);
    x.putImageData(id, 0, 0);
    return c;
  }
}

// tiny helpers
export const rnd = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export const h2 = (x, y, s = 0) => hash(x * 73856093 ^ y * 19349663, s);

// draw an ascii pixel map: rows of chars, key → packed colour ('.' or ' ' = transparent)
export function stamp(R, rows, key, ox, oy, flip = false) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]; if (ch === '.' || ch === ' ') continue;
      const c = key[ch]; if (c === undefined) continue;
      R.set(ox + (flip ? row.length - 1 - i : i), oy + j, c);
    }
  });
}

// A Raster that accepts drawing calls in a smaller "design" space and renders them k× larger:
// shapes (ellipse/poly/capsule/line) are re-rasterised at full resolution (clean curves, no
// blocky upscaling); single-pixel detail calls (set/hline/vline/rect) cover the scaled cell.
// Post passes (outline/rim/get/has/blit) work in real pixels.
export class ScaledRaster extends Raster {
  constructor(w, h, k) { super(Math.ceil(w * k), Math.ceil(h * k)); this.k = k; this.raw = 0; }
  set(x, y, c) {
    if (this.raw) return super.set(x, y, c);
    const k = this.k, x0 = Math.floor(x * k), y0 = Math.floor(y * k), x1 = Math.max(x0 + 1, Math.floor((x + 1) * k)), y1 = Math.max(y0 + 1, Math.floor((y + 1) * k));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) super.set(xx, yy, c);
  }
  _r(fn) { this.raw++; try { fn(); } finally { this.raw--; } }
  ellipse(cx, cy, rx, ry, c) { const k = this.k; this._r(() => super.ellipse(cx * k, cy * k, rx * k, ry * k, typeof c === 'function' ? (x, y, u, v) => c(Math.floor(x / k), Math.floor(y / k), u, v) : c)); }
  poly(pts, c) { const k = this.k; this._r(() => super.poly(pts.map(([x, y]) => [x * k, y * k]), typeof c === 'function' ? (x, y) => c(Math.floor(x / k), Math.floor(y / k)) : c)); }
  capsule(x0, y0, x1, y1, r0, r1, c) { const k = this.k; this._r(() => super.capsule(x0 * k, y0 * k, x1 * k, y1 * k, r0 * k, r1 * k, typeof c === 'function' ? (x, y, s, t) => c(Math.floor(x / k), Math.floor(y / k), s, t) : c)); }
  line(x0, y0, x1, y1, c, w = 1) { const k = this.k; this._r(() => super.line(x0 * k, y0 * k, x1 * k, y1 * k, typeof c === 'function' ? (x, y, n) => c(Math.floor(x / k), Math.floor(y / k), Math.floor(n / k)) : c, Math.max(1, Math.round(w * k)))); }
  get(x, y) { return super.get(x, y); }
  blit(src, dx, dy, flip) { this._r(() => super.blit(src, dx, dy, flip)); }
  outline(col, diag, amt) { this._r(() => super.outline(col, diag, amt)); return this; }
  rim(dx, dy, fn) { this._r(() => super.rim(dx, dy, fn)); return this; }
}
