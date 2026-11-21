// ─────────────────────────────────────────────────────────────
//  Lighting & post-processing ("shaders" in canvas 2D)
//  · rimLit()       back-light rim baked onto character frames
//  · castShadow()   long, soft dawn shadows stretched toward the viewer
//  · windowGlows()  warm halos breathing around lit windows
//  · sunPool()      a pool of warm light spilling through the valley gap onto the meadow
//  · cloudShadows() slow cloud shadows drifting across the village and meadow
//  · bloom()        bright-pass → blur → screen, at quarter resolution
// ─────────────────────────────────────────────────────────────
import { W, H } from './timeline.js';
import { makeCanvas, hash, clamp } from './util.js';

// ---- rim light: pixels whose neighbour toward the light is empty pick up the warm sun colour ----
export function rimLit(src, dir, col = [255, 214, 150], strength = 0.6) {
  const w = src.width, h = src.height;
  const [c, x] = makeCanvas(w, h);
  x.drawImage(src, 0, 0);
  const id = x.getImageData(0, 0, w, h), d = id.data, a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  const A = (xx, y) => (xx < 0 || y < 0 || xx >= w || y >= h) ? 0 : a[y * w + xx];
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = y * w + xx; if (!a[i]) continue;
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    if (r + g + b < 120) continue;                                   // leave the ink outline alone
    let k = 0;
    if (!A(xx + dir * 2, y) || !A(xx + dir, y)) k = strength;          // side facing the sun
    if (!A(xx, y - 2)) k = Math.max(k, strength * 0.55);              // sky light on the top edges
    if (!k) continue;
    d[i * 4] = r + (col[0] - r) * k; d[i * 4 + 1] = g + (col[1] - g) * k; d[i * 4 + 2] = b + (col[2] - b) * k;
  }
  x.putImageData(id, 0, 0);
  return c;
}

// ---- silhouette (for cast shadows) ----
export function silhouette(src, col = '#1a1424') {
  const [c, x] = makeCanvas(src.width, src.height);
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, src.width, src.height);
  return c;
}
// long shadow: the silhouette flipped down onto the ground, squashed and sheared away from the sun
export function castShadow(ctx, sil, x, footY, footRow, { lean = -0.6, squash = 0.32, alpha = 0.28 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setTransform(1, 0, lean * squash, squash, x, footY);            // x' = x + lean*y ; flipped below the feet
  ctx.scale(1, -1);
  ctx.drawImage(sil, 0, -footRow, sil.width, sil.height);
  ctx.restore();
}

// ---- window glow ----
export function windowGlows(ctx, wins, oy, t, k = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  wins.forEach((w, i) => {
    const fl = 0.85 + 0.1 * Math.sin(t * (2.1 + hash(i, 3)) + i * 1.7) + 0.05 * Math.sin(t * 7.3 + i);
    const cx = w.x + w.w / 2, cy = w.y + oy + w.h / 2, r = Math.max(w.w, w.h) * (w.far ? 1.2 : 1.6);
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    const a = (w.far ? 0.18 : 0.3) * fl * k;
    g.addColorStop(0, `rgba(255,176,80,${a})`); g.addColorStop(0.5, `rgba(255,140,60,${a * 0.4})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  });
  ctx.restore();
}

// ---- sunlight pooling on the meadow through the gap between the cottages ----
export function sunPool(ctx, sun, oy, t, k = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const cx = sun.x - 10, cy = 300 + oy;
  const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 190);
  const a = (0.42 + 0.06 * Math.sin(t * 0.5)) * k;
  g.addColorStop(0, `rgba(255,214,140,${a})`); g.addColorStop(0.55, `rgba(255,190,120,${a * 0.45})`); g.addColorStop(1, 'rgba(255,180,120,0)');
  ctx.setTransform(1, 0, 0, 0.42, 0, cy * 0.58);
  ctx.fillStyle = g; ctx.fillRect(cx - 190, cy - 190, 380, 380);
  ctx.restore();
}

// ---- drifting cloud shadows ----
export function cloudShadows(ctx, oy, t, k = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 3; i++) {
    const span = W + 400, x = ((hash(i, 11) * span + t * (7 + i * 2)) % span) - 200, y = 250 + hash(i, 12) * 80 + oy;
    const rx = 110 + hash(i, 13) * 70;
    const g = ctx.createRadialGradient(x, y, 10, x, y, rx);
    g.addColorStop(0, `rgba(120,100,150,${0.32 * k})`); g.addColorStop(1, 'rgba(120,100,150,0)');
    ctx.setTransform(1, 0, 0, 0.3, 0, y * 0.7);
    ctx.fillStyle = g; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
  }
  ctx.restore();
}

// ---- bloom: quarter-res bright pass, two box-blur passes, screened back over the frame ----
const BW = W >> 2, BH = H >> 2;
let BC = null, BX = null, TMP = null, ACC = null;
export function bloom(ctx, { threshold = 0.66, strength = 0.55 } = {}) {
  if (!BC) { BC = document.createElement('canvas'); BC.width = BW; BC.height = BH; BX = BC.getContext('2d', { willReadFrequently: true }); TMP = new Float32Array(BW * BH * 3); ACC = new Float32Array(BW * BH * 3); }
  BX.imageSmoothingEnabled = true; BX.globalCompositeOperation = 'copy';
  BX.drawImage(ctx.canvas, 0, 0, BW, BH);
  const id = BX.getImageData(0, 0, BW, BH), d = id.data;
  for (let i = 0, n = BW * BH; i < n; i++) {
    const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
    const l = Math.max(r, g, b) * 0.6 + (0.3 * r + 0.59 * g + 0.11 * b) * 0.4;
    const k = clamp((l - threshold) / (1 - threshold)); const kk = k * k;
    ACC[i * 3] = r * kk; ACC[i * 3 + 1] = g * kk; ACC[i * 3 + 2] = b * kk;
  }
  const R = 3;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < BH; y++) for (let c = 0; c < 3; c++) {          // horizontal
      let s = 0; for (let x = -R; x <= R; x++) s += ACC[(y * BW + clamp(x, 0, BW - 1)) * 3 + c];
      for (let x = 0; x < BW; x++) { TMP[(y * BW + x) * 3 + c] = s / (2 * R + 1); s += ACC[(y * BW + Math.min(BW - 1, x + R + 1)) * 3 + c] - ACC[(y * BW + Math.max(0, x - R)) * 3 + c]; }
    }
    for (let x = 0; x < BW; x++) for (let c = 0; c < 3; c++) {          // vertical
      let s = 0; for (let y = -R; y <= R; y++) s += TMP[(clamp(y, 0, BH - 1) * BW + x) * 3 + c];
      for (let y = 0; y < BH; y++) { ACC[(y * BW + x) * 3 + c] = s / (2 * R + 1); s += TMP[(Math.min(BH - 1, y + R + 1) * BW + x) * 3 + c] - TMP[(Math.max(0, y - R) * BW + x) * 3 + c]; }
    }
  }
  for (let i = 0, n = BW * BH; i < n; i++) { d[i * 4] = Math.min(255, ACC[i * 3] * 255 * 1.6); d[i * 4 + 1] = Math.min(255, ACC[i * 3 + 1] * 255 * 1.5); d[i * 4 + 2] = Math.min(255, ACC[i * 3 + 2] * 255 * 1.3); d[i * 4 + 3] = 255; }
  BX.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = strength; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(BC, 0, 0, W, H);
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
}
