// Small deterministic helpers shared by every module.

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeIn = t => t * t * t;
export const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// Hash-based PRNG: hash(i, salt) -> [0,1)
export function hash(i, s = 0) {
  let h = (i * 374761393 + s * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// 1D value noise (smooth), deterministic
export function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i, s), b = hash(i + 1, s);
  return lerp(a, b, smooth(f));
}
export function fbm1(x, s = 0, oct = 4) {
  let v = 0, amp = 0.5, fr = 1, n = 0;
  for (let o = 0; o < oct; o++) { v += noise1(x * fr, s + o * 17) * amp; n += amp; amp *= 0.5; fr *= 2; }
  return v / n;
}
export function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash(a * 7919 + b * 104729, s);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgb(a) { return `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`; }
export function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  return [c, x];
}

// Pixel-perfect filled ellipse / disc
export function pxEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -Math.floor(ry); y <= Math.floor(ry); y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// Render text to an offscreen canvas and hard-threshold alpha so pixel fonts stay crisp
export function crispText(text, font, color, opts = {}) {
  const m = document.createElement('canvas'); m.width = 8; m.height = 8;
  const mx = m.getContext('2d');
  mx.font = font;
  const w = Math.ceil(mx.measureText(text).width) + 8 + (opts.spacing || 0) * text.length;
  const size = parseInt(font.match(/(\d+)px/)[1], 10);
  const h = Math.ceil(size * 1.5) + 6;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  x.font = font; x.textBaseline = 'top'; x.fillStyle = color;
  if (opts.spacing) {
    let px = 4;
    for (const ch of text) { x.fillText(ch, px, 3); px += x.measureText(ch).width + opts.spacing; }
  } else x.fillText(text, 4, 3);
  const id = x.getImageData(0, 0, w, h); const d = id.data;
  const thr = opts.threshold ?? 110;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > thr ? 255 : 0;
  x.putImageData(id, 0, 0);
  return c;
}

// Outline an offscreen canvas' opaque pixels (1px, 8-neighbour) with a colour
export function outlineCanvas(src, color, thick = 1) {
  const w = src.width + thick * 2, h = src.height + thick * 2;
  const [c, x] = makeCanvas(w, h);
  const [t, tx] = makeCanvas(src.width, src.height);
  tx.drawImage(src, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = color; tx.fillRect(0, 0, w, h);
  for (let dy = -thick; dy <= thick; dy++) for (let dx = -thick; dx <= thick; dx++) if (dx || dy) x.drawImage(t, thick + dx, thick + dy);
  x.drawImage(src, thick, thick);
  return c;
}
