// ─────────────────────────────────────────────────────────────
//  World layers for "Old Skull Meadow at Dawn"
//  Back → front: sky · stars · sun · clouds · distant range ·
//  Old Skull & Twisted Tower · Shadowdale village · mist ·
//  hedgerow/dry-stone wall/scarecrow · meadow/path/fence · foreground grass
//  Each layer has a parallax factor; the camera tilts down by PAN px.
// ─────────────────────────────────────────────────────────────
import { W, H, PAN } from './timeline.js';
import { buildSkull, buildHills, drawMillSails, SKULL_Y, HILLS_Y } from './art/landscape.js';
import { buildVillage, drawInnSign, VILLAGE_Y, WINDOWS } from './art/village.js';
import { buildFarHillsS2, drawMillSailsS2, buildFarmhouseS2, buildHedrunFrames, buildNearS2, buildGroundS2, HEDRUN_POS, WINDOWS_S2 } from './art/turnips.js';
import { buildFarOrchardS3, buildCiderBarnS3, buildNearS3, buildGroundS3, buildHedrunGiftSprite, HEDRUN_BARN_POS, WINDOWS_S3 } from './art/ciderbarn.js';
import { windowGlows, sunPool, cloudShadows } from './fx.js';
import { buildNear, buildMeadow, buildScarecrow, NEAR_Y as NY, GROUND_Y as GY, SCARECROW as SC, SC_W, SC_BASE } from './art/meadow.js';
import { makeCanvas, hash, mulberry, fbm1, noise2, bayer, hex, rgb, mix, lerp, clamp, inv, pxEllipse } from './util.js';

export const F = { sky: 0.25, sun: 0.3, clouds: 0.27, range: 0.34, far: 0.45, hills: 0.56, village: 0.65, mist: 0.74, near: 0.85, ground: 1.0, fore: 1.18 };
export const off = (p, f) => Math.round(PAN * (1 - p) * f);   // vertical parallax offset (p = camera progress)

const L = {};   // prerendered layer canvases

// ---------- SKY ----------
const SKY_H = H + Math.round(PAN * F.sky);
const SKY_STOPS = [
  [0, '#151230'], [55, '#221c47'], [110, '#3a2d68'], [160, '#5b4689'], [200, '#8569a8'],
  [232, '#b07fae'], [258, '#d895a8'], [280, '#f0ad9c'], [298, '#f9c697'], [318, '#ffdca4'], [SKY_H, '#ffe9bf'],
].map(([y, c]) => [y, hex(c)]);

function skyColorAt(y) {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [y0, c0] = SKY_STOPS[i], [y1, c1] = SKY_STOPS[i + 1];
    if (y >= y0 && y <= y1) return [c0, c1, (y - y0) / (y1 - y0)];
  }
  return [SKY_STOPS.at(-1)[1], SKY_STOPS.at(-1)[1], 0];
}

function buildSky() {
  const [c, x] = makeCanvas(W, SKY_H);
  const id = x.createImageData(W, SKY_H); const d = id.data;
  for (let y = 0; y < SKY_H; y++) {
    const [c0, c1, tt] = skyColorAt(y);
    // posterize into 2 steps per band with ordered dithering → pixel-art banding
    for (let xx = 0; xx < W; xx++) {
      const warm = clamp(1 - Math.hypot((xx - 402) / 420, (y - 290) / 160)) * 0.18;  // horizon glow near the sun
      const q = tt * 3, base = Math.floor(q), fr = q - base;
      const step = (base + (fr > bayer(xx, y) ? 1 : 0)) / 3;
      let col = mix(c0, c1, clamp(step));
      col = mix(col, [255, 226, 170], warm);
      const i = (y * W + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  L.sky = c;
  const r = mulberry(11);
  L.stars = Array.from({ length: 170 }, () => ({ x: Math.floor(r() * W), y: Math.floor(Math.pow(r(), 1.6) * 250), b: r(), ph: r() * 6.28, sp: 1 + r() * 3 }));
}

const SKY_S2_STOPS = [
  [0, '#2864b4'], [75, '#4b91d9'], [155, '#82c2f0'], [235, '#bae3fa'], [310, '#d8eef8'], [SKY_H, '#f0f5e8'],
].map(([y, c]) => [y, hex(c)]);

function skyS2ColorAt(y) {
  for (let i = 0; i < SKY_S2_STOPS.length - 1; i++) {
    const [y0, c0] = SKY_S2_STOPS[i], [y1, c1] = SKY_S2_STOPS[i + 1];
    if (y >= y0 && y <= y1) return [c0, c1, (y - y0) / (y1 - y0)];
  }
  return [SKY_S2_STOPS.at(-1)[1], SKY_S2_STOPS.at(-1)[1], 0];
}

function buildSkyS2() {
  const [c, x] = makeCanvas(W, SKY_H);
  const id = x.createImageData(W, SKY_H); const d = id.data;
  const sunSkyY = 88 + Math.round(PAN * F.sky);
  for (let y = 0; y < SKY_H; y++) {
    const [c0, c1, tt] = skyS2ColorAt(y);
    for (let xx = 0; xx < W; xx++) {
      const warm = clamp(1 - Math.hypot((xx - 468) / 340, (y - sunSkyY) / 140)) * 0.16;
      const q = tt * 3, base = Math.floor(q), fr = q - base;
      const step = (base + (fr > bayer(xx, y) ? 1 : 0)) / 3;
      let col = mix(c0, c1, clamp(step));
      col = mix(col, [255, 246, 212], warm);
      const i = (y * W + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  L.sky2 = c;
}

const SKY_S3_STOPS = [
  [0, '#1e58aa'], [70, '#3e84d2'], [148, '#72b6ec'], [228, '#addcf8'], [304, '#d8eefc'], [SKY_H, '#f5f6e6'],
].map(([y, c]) => [y, hex(c)]);

function skyS3ColorAt(y) {
  for (let i = 0; i < SKY_S3_STOPS.length - 1; i++) {
    const [y0, c0] = SKY_S3_STOPS[i], [y1, c1] = SKY_S3_STOPS[i + 1];
    if (y >= y0 && y <= y1) return [c0, c1, (y - y0) / (y1 - y0)];
  }
  return [SKY_S3_STOPS.at(-1)[1], SKY_S3_STOPS.at(-1)[1], 0];
}

function buildSkyS3() {
  const [c, x] = makeCanvas(W, SKY_H);
  const id = x.createImageData(W, SKY_H); const d = id.data;
  const sunSkyY = 56 + Math.round(PAN * F.sky);
  for (let y = 0; y < SKY_H; y++) {
    const [c0, c1, tt] = skyS3ColorAt(y);
    for (let xx = 0; xx < W; xx++) {
      const warm = clamp(1 - Math.hypot((xx - 488) / 360, (y - sunSkyY) / 145)) * 0.24;
      const q = tt * 3, base = Math.floor(q), fr = q - base;
      const step = (base + (fr > bayer(xx, y) ? 1 : 0)) / 3;
      let col = mix(c0, c1, clamp(step));
      col = mix(col, [255, 248, 214], warm);
      const i = (y * W + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  L.sky3 = c;
}

// ---------- CLOUDS ----------
// Volumetric cumulus: a union of spherical puffs gives a height field; each pixel is lit from
// the low dawn sun (which sits BELOW most clouds, so undersides glow gold and the tops fall
// into lavender shade), then quantised to a 7-step ramp with ordered dithering.
const smooth01 = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const CLOUD_RAMP = ['#5f4a84', '#7d5f97', '#9c74a6', '#c58eb0', '#e9a2ae', '#ffbfa4', '#ffdcb4', '#fff3dc'].map(hex);
const CLOUD_RAMP_S2 = ['#6585b2', '#7e9ec9', '#9cb9df', '#bdd5ee', '#dcebf9', '#f0f7fe', '#fffdf4', '#ffffff'].map(hex);
function buildCloud(seed, w, h, sx, ramp = CLOUD_RAMP, daytime = false) {
  const r = mulberry(seed);
  const [c, x] = makeCanvas(w, h);
  // puffs: a row of big belly puffs, then smaller cauliflower puffs stacked on the crown
  const puffs = [], base = h - 3;
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, mid = 1 - Math.abs(f - 0.5) * 1.7;
    const rad = h * (0.26 + mid * 0.24 + r() * 0.1);
    puffs.push({ x: w * (0.1 + 0.8 * f) + (r() - 0.5) * 4, y: base - rad * 0.5, r: rad });
  }
  const m = 3 + Math.floor(r() * 4);
  for (let i = 0; i < m; i++) {
    const f = 0.2 + r() * 0.6, mid = 1 - Math.abs(f - 0.5) * 2;
    const rad = h * (0.2 + r() * 0.14 + mid * 0.14);
    puffs.push({ x: w * f, y: base - h * (0.3 + mid * 0.26) - rad * 0.1, r: rad });
  }
  puffs.push({ x: w * 0.5, y: base - h * 0.12, r: w * 0.46, sq: (h * 0.3) / (w * 0.46) });   // the flat body everything sits on
  puffs.sort((a, b) => a.y - b.y);                     // lower puffs sit in front
  const body = puffs.pop(); puffs.unshift(body);       // ...but the body is furthest back
  const lx = clamp((402 - sx - w / 2) / 260, -1, 1) * 0.7;
  const L = [lx, 0.5, 0.62]; { const l = Math.hypot(...L); L[0] /= l; L[1] /= l; L[2] /= l; }
  const id = x.createImageData(w, h); const d = id.data;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    if (y > base + 1) continue;
    let hit = null, hu = 0, hv = 0;
    for (const p of puffs) {                          // frontmost (last) puff covering this pixel
      const u = (xx + 0.5 - p.x) / p.r, v = (y + 0.5 - p.y) / (p.r * (p.sq || 0.8));
      if (u * u + v * v <= 1) { hit = p; hu = u; hv = v; }
    }
    if (!hit) continue;
    const nz = Math.sqrt(Math.max(0, 1 - hu * hu - hv * hv));
    // two lights: Stage 1 dawn sun from below/side; Stage 2 bright mid-morning sun from above/right
    let t = daytime
      ? 0.44 - hv * 0.34 + hu * lx * 0.24 + (nz > 0.3 ? 0.05 : -0.04) - smooth01((y - base + 6) / 6) * 0.28
      : 0.47 - hv * 0.3 + hu * L[0] * 0.22 + (nz > 0.25 ? 0 : 0.06) + smooth01((y - base + 6) / 6) * 0.35;
    if (!daytime && y >= base) t = 0.86;                // gold underside lip at dawn
    if (daytime && y >= base) t = Math.min(t, 0.24);    // cool sky-blue flat cloud belly in daylight
    // contact shadow where this puff tucks under the one behind/above it
    for (const p of puffs) { if (p === hit) break; const u = (xx + 0.5 - p.x) / p.r, v = (y + 0.5 - p.y) / (p.r * (p.sq || 0.8)); if (u * u + v * v <= 1.0 && hv < -0.55 && !hit.sq) { t -= 0.14; break; } }
    t = clamp(t);
    let k = t * 7; const fr = k - Math.floor(k); k = Math.floor(k);
    if (fr > 0.82 && ((xx + y) & 1)) k++;              // tight checker only on band edges
    const col = ramp[Math.min(7, k + (daytime ? 0 : 1))];
    const i = (y * w + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; d[i + 3] = 254 - Math.min(7, k + (daytime ? 0 : 1));
  }
  // silver lining: the top edge of every puff catches the brightening sky, the sun-side edge glows
  const A = (xx, y) => (xx < 0 || y < 0 || xx >= w || y >= h) ? 0 : d[(y * w + xx) * 4 + 3];
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = (y * w + xx) * 4; if (!d[i + 3]) continue;
    let k = 254 - d[i + 3];
    if (!A(xx, y - 1)) k = Math.max(k + 2, 5);
    else if (!A(xx, y - 2)) k = Math.max(k + 1, 4);
    if ((lx > 0.1 && !A(xx + 1, y)) || (lx < -0.1 && !A(xx - 1, y))) k += 1;
    const col = ramp[Math.min(7, k)];
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  for (let i = 3; i < d.length; i += 4) if (d[i]) d[i] = 255;
  x.putImageData(id, 0, 0);
  return c;
}
// thin stratus streaks lying along the horizon
function buildStreak(seed, w, h, daytime = false) {
  const [c, x] = makeCanvas(w, h);
  const id = x.createImageData(w, h); const d = id.data;
  const A = hex(daytime ? '#aacae8' : '#c88aa8'), B = hex(daytime ? '#d8ecfb' : '#f6b9a4'), Cc = hex(daytime ? '#ffffff' : '#ffe4c0');
  for (let xx = 0; xx < w; xx++) {
    const f = xx / w, env = Math.sin(Math.PI * f) ** 0.6;
    const top = h / 2 - env * (h / 2 - 1) * (0.6 + 0.4 * noise2(xx / 14, seed, 3)), bot = h / 2 + env * (h / 2 - 1) * 0.55;
    for (let y = Math.ceil(top); y <= bot; y++) {
      const col = y - top < 1 ? Cc : y > bot - 1 ? A : B;
      if (env < 0.3 && bayer(xx, y) > env * 3) continue;
      const i = (y * w + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  return c;
}

const CLOUDS = [
  // seed, w, h, x0, screenY at START of pan, parallax, drift px/s, kind
  [3, 170, 40, 20, 88, 0.22, 2.2],
  [7, 104, 28, 430, 52, 0.18, 1.4],
  [12, 136, 34, 240, 200, 0.27, 3.0],
  [21, 78, 20, 566, 150, 0.24, -1.6],
  [33, 210, 48, 470, 254, 0.31, 2.6],
  [41, 96, 24, 112, 296, 0.33, 3.4],
  [55, 64, 16, 330, 116, 0.2, -1.1],
  [64, 150, 32, -50, 232, 0.29, 2.9],
  [72, 120, 30, 150, 30, 0.16, 1.0],
  [88, 90, 22, 300, 10, 0.15, -0.8],
  [97, 230, 6, 300, 318, 0.32, 1.2, 'streak'],
  [101, 170, 5, 60, 330, 0.33, 1.6, 'streak'],
  [113, 140, 5, 520, 300, 0.31, 0.9, 'streak'],
  [127, 110, 4, 200, 286, 0.3, -0.7, 'streak'],
];

// ---------- DISTANT RANGE ----------
function buildRange() {
  const [c, x] = makeCanvas(W, 150);
  const A = hex('#a887b9'), B = hex('#cfa6bf'), RIM = hex('#f2c7c3'), A2 = hex('#93739f'), B2 = hex('#b88fae');
  for (let xx = 0; xx < W; xx++) {
    const top = Math.round(24 + fbm1(xx / 70, 5, 5) * 40 - Math.max(0, 14 - Math.abs(xx - 300) / 12));
    for (let y = top; y < 150; y++) {
      const t = clamp((y - top) / 60);
      let col = mix(A, B, t + (bayer(xx, y) - 0.5) * 0.25);
      if (y - top < 1) col = RIM;
      x.fillStyle = rgb(col); x.fillRect(xx, y, 1, 1);
    }
    const top2 = Math.round(52 + fbm1(xx / 46, 9, 4) * 28);
    for (let y = top2; y < 150; y++) {
      const t = clamp((y - top2) / 50);
      let col = mix(A2, B2, t + (bayer(xx, y) - 0.5) * 0.3);
      if (y - top2 < 1) col = mix(A2, RIM, 0.55);
      // tiny pine silhouettes on the nearer ridge
      x.fillStyle = rgb(col); x.fillRect(xx, y, 1, 1);
    }
    if (hash(xx, 77) > 0.86) {
      const ph = 3 + Math.floor(hash(xx, 78) * 4);
      x.fillStyle = rgb(mix(A2, [60, 50, 80], 0.35));
      for (let k = 0; k < ph; k++) x.fillRect(xx - Math.floor(k / 3), top2 - ph + k, 1 + Math.floor(k / 3) * 2, 1);
    }
  }
  L.range = c;
}

function buildRangeS2() {
  const [c, x] = makeCanvas(W, 150);
  const A = hex('#6e90b8'), B = hex('#c2dcf0'), SH = hex('#4f7098'), RIM = hex('#f2f9ff');
  const A2 = hex('#587ca2'), B2 = hex('#9ec0da'), SH2 = hex('#405e82'), RIM2 = hex('#d9ecf8');
  const SKY_HAZE = hex('#cce4f4');
  const crag1 = xx => Math.abs(((xx * 0.13 + fbm1(xx / 28, 7, 3) * 4) % 10) - 5) * 1.1;
  const r1 = xx => 26 + fbm1(xx / 68, 15, 5) * 38 - crag1(xx) - Math.max(0, 14 - Math.abs(xx - 458) / 14);
  const r2 = xx => 56 + fbm1(xx / 44, 21, 4) * 28 - Math.abs(((xx * 0.19) % 6) - 3) * 0.85;
  for (let xx = 0; xx < W; xx++) {
    const t1 = Math.round(r1(xx)), s1 = clamp((r1(xx + 4) - r1(xx - 4)) * 0.16, -1, 1);
    const sunProx = clamp(1 - Math.abs(xx - 468) / 260) * 0.18;
    const facet1 = noise2(xx / 18, 4, 17) > 0.54 ? 0.12 : -0.10;
    const base1 = s1 < 0 ? mix(A, RIM, clamp(-s1 * 0.28 + sunProx, 0, 0.40)) : mix(A, SH, clamp(s1 * 0.42 - facet1 * 0.3, 0, 0.52));
    for (let y = t1; y < 150; y++) {
      const t = clamp((y - t1) / 52);
      const gully = Math.sin((xx - y * 0.72) * 0.11 + fbm1(xx / 22, 9, 2) * 2.5);
      let col = mix(base1, B, t * 0.82 + (gully > 0.42 && y - t1 > 4 ? -0.10 : 0) + (bayer(xx, y) - 0.5) * 0.18);
      if (y > 96) col = mix(col, SKY_HAZE, clamp((y - 96) / 54) * 0.45);
      if (y - t1 < 2) col = mix(A, RIM, clamp(0.62 - s1 * 0.34 + sunProx, 0.24, 0.96));
      x.fillStyle = rgb(col); x.fillRect(xx, y, 1, 1);
    }
    const t2 = Math.round(r2(xx)), s2 = clamp((r2(xx + 4) - r2(xx - 4)) * 0.16, -1, 1);
    const base2 = s2 < 0 ? mix(A2, RIM2, clamp(-s2 * 0.26 + sunProx, 0, 0.38)) : mix(A2, SH2, clamp(s2 * 0.40, 0, 0.50));
    for (let y = t2; y < 150; y++) {
      const t = clamp((y - t2) / 44);
      const rib = ((xx - Math.floor(y * 0.55)) % 19 === 0) ? -0.09 : 0;
      let col = mix(base2, B2, t * 0.85 + rib + (bayer(xx, y) - 0.5) * 0.22);
      if (y > 106) col = mix(col, SKY_HAZE, clamp((y - 106) / 44) * 0.38);
      if (y - t2 < 1) col = mix(A2, RIM2, clamp(0.54 - s2 * 0.32 + sunProx, 0.2, 0.90));
      x.fillStyle = rgb(col); x.fillRect(xx, y, 1, 1);
    }
    if (hash(xx, 93) > 0.85) {
      const ph = 3 + Math.floor(hash(xx, 94) * 4);
      x.fillStyle = rgb(mix(A2, [34, 58, 66], 0.42));
      for (let k = 0; k < ph; k++) x.fillRect(xx - Math.floor(k / 3), t2 - ph + k, 1 + Math.floor(k / 3) * 2, 1);
    }
  }
  L.range2 = c;
}

function buildRangeS3() {
  const [c, x] = makeCanvas(W, 150);
  const A = hex('#6e95b9'), B = hex('#c4e0f4'), SH = hex('#4e759c'), RIM = hex('#f4faff');
  const A2 = hex('#59839e'), B2 = hex('#a4c8de'), SH2 = hex('#426680'), RIM2 = hex('#e2f2fc');
  const SKY_HAZE = hex('#d2e9fa');
  const crag1 = xx => Math.abs(((xx * 0.14 + fbm1(xx / 26, 13, 3) * 3.6) % 9) - 4.5) * 1.05;
  const r1 = xx => 29 + fbm1(xx / 70, 33, 5) * 34 - crag1(xx) - Math.max(0, 12 - Math.abs(xx - 488) / 15);
  const r2 = xx => 58 + fbm1(xx / 46, 45, 4) * 25 - Math.abs(((xx * 0.17) % 6) - 3) * 0.75;
  for (let xx = 0; xx < W; xx++) {
    const t1 = Math.round(r1(xx)), s1 = clamp((r1(xx + 4) - r1(xx - 4)) * 0.16, -1, 1);
    const sunProx = clamp(1 - Math.abs(xx - 488) / 260) * 0.22;
    const base1 = s1 < 0 ? mix(A, RIM, clamp(-s1 * 0.28 + sunProx, 0, 0.42)) : mix(A, SH, clamp(s1 * 0.40, 0, 0.50));
    for (let y = t1; y < 150; y++) {
      const t = clamp((y - t1) / 52);
      const gully = Math.sin((xx - y * 0.68) * 0.12 + fbm1(xx / 20, 19, 2) * 2.4);
      let col = mix(base1, B, t * 0.80 + (gully > 0.44 && y - t1 > 4 ? -0.09 : 0) + (bayer(xx, y) - 0.5) * 0.18);
      if (y > 98) col = mix(col, SKY_HAZE, clamp((y - 98) / 52) * 0.44);
      if (y - t1 < 2) col = mix(A, RIM, clamp(0.62 - s1 * 0.34 + sunProx, 0.24, 0.96));
      x.fillStyle = rgb(col); x.fillRect(xx, y, 1, 1);
    }
    const t2 = Math.round(r2(xx)), s2 = clamp((r2(xx + 4) - r2(xx - 4)) * 0.16, -1, 1);
    const base2 = s2 < 0 ? mix(A2, RIM2, clamp(-s2 * 0.26 + sunProx, 0, 0.38)) : mix(A2, SH2, clamp(s2 * 0.38, 0, 0.48));
    for (let y = t2; y < 150; y++) {
      const t = clamp((y - t2) / 44);
      const rib = ((xx - Math.floor(y * 0.52)) % 17 === 0) ? -0.08 : 0;
      let col = mix(base2, B2, t * 0.84 + rib + (bayer(xx, y) - 0.5) * 0.20);
      if (y > 108) col = mix(col, SKY_HAZE, clamp((y - 108) / 42) * 0.36);
      if (y - t2 < 1) col = mix(A2, RIM2, clamp(0.54 - s2 * 0.32 + sunProx, 0.2, 0.90));
      x.fillStyle = rgb(col); x.fillRect(xx, y, 1, 1);
    }
    if (hash(xx, 107) > 0.86) {
      const ph = 3 + Math.floor(hash(xx, 108) * 3);
      x.fillStyle = rgb(mix(A2, [34, 62, 54], 0.40));
      for (let k = 0; k < ph; k++) x.fillRect(xx - Math.floor(k / 3), t2 - ph + k, 1 + Math.floor(k / 3) * 2, 1);
    }
  }
  L.range3 = c;
}

// ---------- MIST ----------
function buildMist() {
  const w = W, h = 46;
  const [c, x] = makeCanvas(w, h);
  const id = x.createImageData(w, h); const d = id.data;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const n = noise2(xx / 48, y / 9, 3) * 0.6 + noise2(xx / 17, y / 5, 8) * 0.4;
    const v = clamp((n - 0.35) * 1.8) * Math.sin(Math.PI * y / h);
    const a = Math.floor(v * 4) / 4;    // posterized alpha → pixel-art mist
    const i = (y * w + xx) * 4; d[i] = 255; d[i + 1] = 236; d[i + 2] = 232; d[i + 3] = (a > bayer(xx, y) * 0.25 ? a : 0) * 255;
  }
  x.putImageData(id, 0, 0);
  L.mist = c;
}

// ---------- NEAR / MEADOW / LANDMARKS: hand-drawn procedural pixel art (js/art/*) ----------
export { NEAR_Y, GROUND_Y, PATH_Y, BURROW, STUMP, SCARECROW } from './art/meadow.js';
// ---------- FOREGROUND GRASS (animated tufts) ----------
const TUFTS = Array.from({ length: 92 }, (_, i) => ({
  x: Math.floor(hash(i, 61) * (W + 20)) - 10, base: 362 + Math.floor(hash(i, 62) * 10),
  blades: 3 + Math.floor(hash(i, 63) * 5), h: 7 + Math.floor(hash(i, 64) * 13), ph: hash(i, 65) * 6.28,
  flower: hash(i, 66) > 0.8 ? ['#e0574b', '#f4cf4c', '#f4efe2', '#7c9be0'][Math.floor(hash(i, 67) * 4)] : null,
}));
function buildForeBase() {
  const [c, x] = makeCanvas(W, 40);
  for (let xx = 0; xx < W; xx++) {
    const top = 4 + Math.round(fbm1(xx / 7, 71, 3) * 7);
    for (let y = top; y < 40; y++) { x.fillStyle = y - top < 1 ? '#4f8a36' : (y - top < 3 ? '#386a2a' : '#2a5222'); x.fillRect(xx, y, 1, 1); }
  }
  L.fore = c;
}

export function buildWorld() {
  buildSky(); buildSkyS2(); buildRange(); buildRangeS2(); buildMist(); buildForeBase();
  L.skull = buildSkull(W).toCanvas(); L.hills = buildHills(W).toCanvas(); L.village = buildVillage(W).toCanvas();
  L.near = buildNear(W).toCanvas(); L.ground = buildMeadow(W).toCanvas(); L.scarecrow = buildScarecrow().toCanvas();
  L.clouds = CLOUDS.map(([s, w, h, x0, , , , kind]) => kind === 'streak' ? buildStreak(s, w, h, false) : buildCloud(s, w, h, x0, CLOUD_RAMP, false));
  // Stage 2: Hedrun's Turnip Fields (mid-morning)
  L.farS2 = buildFarHillsS2(W).toCanvas();
  L.farmS2 = buildFarmhouseS2(W).toCanvas();
  L.hedrunS2 = buildHedrunFrames();
  L.nearS2 = buildNearS2(W).toCanvas();
  L.groundS2 = buildGroundS2(W).toCanvas();
  L.clouds2 = CLOUDS.map(([s, w, h, x0, , , , kind]) => kind === 'streak' ? buildStreak(s, w, h, true) : buildCloud(s, w, h, x0, CLOUD_RAMP_S2, true));
  // Stage 3: Hedrun's Cider Barn (high noon)
  buildSkyS3(); buildRangeS3();
  L.farS3 = buildFarOrchardS3(W).toCanvas();
  L.barnS3 = buildCiderBarnS3(W).toCanvas();
  L.nearS3 = buildNearS3(W).toCanvas();
  L.groundS3 = buildGroundS3(W).toCanvas();
  L.hedrunGiftS3 = buildHedrunGiftSprite();
}

let hedrunS3ClearAt = null;
export function setHedrunStage3ClearAt(s = null) { hedrunS3ClearAt = s; }

// ─────────────── per-frame drawing ───────────────
export function sunPos(p, t, stg = 1) {
  if (stg === 3) return { x: 488, y: 56 + off(p, F.sun) };
  if (stg >= 2) return { x: 468, y: 88 + off(p, F.sun) };
  return { x: 402, y: 160 + off(p, F.sun) - Math.min(6, t * 0.3) };
}

export function drawSky(ctx, p, t, stg = 1) {
  if (stg === 3) {
    ctx.drawImage(L.sky3, 0, -Math.round(PAN * F.sky) + off(p, F.sky));
    return;
  }
  if (stg >= 2) {
    ctx.drawImage(L.sky2, 0, -Math.round(PAN * F.sky) + off(p, F.sky));
    return;
  }
  ctx.drawImage(L.sky, 0, -Math.round(PAN * F.sky) + off(p, F.sky));
  // stars fade as dawn breaks and as we tilt down
  const sa = clamp(1 - p * 1.25) * clamp(1 - t / 14);
  if (sa > 0.01) {
    const oy = -Math.round(PAN * F.sky) + off(p, F.sky);
    for (const s of L.stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      const a = sa * tw * (0.35 + s.b * 0.65) * clamp(1 - s.y / 260);
      if (a < 0.05) continue;
      ctx.globalAlpha = a; ctx.fillStyle = s.b > 0.85 ? '#fff6dc' : '#d8d2ff';
      ctx.fillRect(s.x, s.y + oy, 1, 1);
      if (s.b > 0.93) { ctx.globalAlpha = a * 0.5; ctx.fillRect(s.x - 1, s.y + oy, 3, 1); ctx.fillRect(s.x, s.y + oy - 1, 1, 3); }
    }
    ctx.globalAlpha = 1;
  }
  // the morning star — a nod to Mystra — glints for the first seconds
  const ma = clamp(inv(0.6, 1.6, t)) * clamp(1 - inv(5.0, 7.5, t));
  if (ma > 0) {
    const mx = 486, my = 64 + off(p, F.sky) - Math.round(PAN * F.sky) + 75;
    const tw = 0.75 + 0.25 * Math.sin(t * 5.3);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(mx + 0.5, my + 0.5, 0, mx + 0.5, my + 0.5, 14);
    g.addColorStop(0, `rgba(220,230,255,${0.55 * ma})`); g.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = g; ctx.fillRect(mx - 14, my - 14, 29, 29);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = ma; ctx.fillStyle = '#ffffff';
    const len = Math.round(3 + tw * 3);
    ctx.fillRect(mx - len, my, len * 2 + 1, 1); ctx.fillRect(mx, my - len, 1, len * 2 + 1);
    ctx.globalAlpha = ma * 0.6; ctx.fillRect(mx - 1, my - 1, 3, 3);
    ctx.globalAlpha = 1;
  }
}

export function drawSun(ctx, p, t, stg = 1) {
  const s = sunPos(p, t, stg);
  ctx.globalCompositeOperation = 'lighter';
  const rings = stg === 3 ? [[105, 0.14], [48, 0.22], [22, 0.36]] : stg >= 2 ? [[96, 0.12], [44, 0.20], [20, 0.34]] : [[150, 0.16], [70, 0.22], [30, 0.35]];
  for (const [r, a] of rings) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, `rgba(255,228,170,${a})`); g.addColorStop(1, 'rgba(255,204,150,0)');
    ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  pxEllipse(ctx, s.x, s.y, stg >= 2 ? 12 : 14, stg >= 2 ? 12 : 14, stg >= 2 ? '#ffe49c' : '#ffd98c');
  pxEllipse(ctx, s.x, s.y, stg >= 2 ? 10 : 12, stg >= 2 ? 10 : 12, '#fff4c8');
  pxEllipse(ctx, s.x, s.y, stg >= 2 ? 8 : 9, stg >= 2 ? 8 : 9, '#fffef2');
}

export function drawClouds(ctx, p, t, stg = 1) {
  const imgs = stg >= 2 ? L.clouds2 : L.clouds;
  CLOUDS.forEach(([, w, , x0, sy, f, vx], i) => {
    const y = sy - Math.round(PAN * f) + off(p, f);
    let xx = ((x0 + vx * t) % (W + w + 40));
    if (xx < -w - 20) xx += W + w + 40;
    ctx.drawImage(imgs[i], Math.round(xx), y);
  });
}

export function drawRange(ctx, p, stg = 1) { ctx.drawImage(stg === 3 ? L.range3 : stg >= 2 ? L.range2 : L.range, 0, 110 + off(p, F.range)); }
export function drawFar(ctx, p, t, stg = 1) {
  if (stg === 3) {
    const hy = HILLS_Y + off(p, F.hills);
    ctx.drawImage(L.farS3, 0, hy);
    return;
  }
  if (stg >= 2) {
    const hy = HILLS_Y + off(p, F.hills);
    ctx.drawImage(L.farS2, 0, hy); drawMillSailsS2(ctx, 0, hy, t);
    return;
  }
  ctx.drawImage(L.skull, 0, SKULL_Y + off(p, F.far));
  const hy = HILLS_Y + off(p, F.hills);
  ctx.drawImage(L.hills, 0, hy); drawMillSails(ctx, 0, hy, t);
}
export function drawVillage(ctx, p, t, stg = 1) {
  const vy = VILLAGE_Y + off(p, F.village);
  if (stg === 3) {
    ctx.drawImage(L.barnS3, 0, vy);
    windowGlows(ctx, WINDOWS_S3, vy, t, 0.34);
    // Animated amber cider droplets & glistening puddle sparkles at leaking barrels + apple press spout
    for (const [bx, by, ph] of [[322, 267, 0.0], [342, 268, 0.37], [496, 267, 0.71], [468, 265, 0.19]]) {
      const cyc = (t * 0.85 + ph) % 1;
      if (cyc < 0.65) {
        const dy = Math.round((cyc / 0.65) * 6);
        ctx.fillStyle = cyc < 0.3 ? '#fff09c' : '#eaa02c';
        ctx.fillRect(bx, by + dy + vy, 1, 2);
      } else {
        const rk = (cyc - 0.65) / 0.35;
        ctx.globalAlpha = 1 - rk;
        ctx.fillStyle = '#fff09c';
        ctx.fillRect(bx - Math.round(rk * 3), by + 6 + vy, 1, 1);
        ctx.fillRect(bx + Math.round(rk * 3), by + 6 + vy, 1, 1);
        ctx.globalAlpha = 1;
      }
    }
    // Hedrun either sits up on the barn roof waving his pitchfork, or climbs down on clear to gift Healing Potions
    if (hedrunS3ClearAt === null) {
      const hf = L.hedrunS2[Math.floor(t * 3.8) % L.hedrunS2.length];
      ctx.drawImage(hf, HEDRUN_BARN_POS.x - 19, HEDRUN_BARN_POS.roofY - 41 + vy);
    } else {
      const dt = Math.max(0, t - hedrunS3ClearAt);
      if (dt < 0.65) {
        const k = clamp(dt / 0.65);
        const hx = Math.round(lerp(HEDRUN_BARN_POS.x, HEDRUN_BARN_POS.ladderX, k));
        const hy = Math.round(lerp(HEDRUN_BARN_POS.roofY, 198, k));
        const hf = L.hedrunS2[Math.floor(t * 5) % L.hedrunS2.length];
        ctx.drawImage(hf, hx - 19, hy - 41 + vy);
      } else if (dt < 1.85) {
        const k = clamp((dt - 0.65) / 1.2);
        const hx = Math.round(lerp(HEDRUN_BARN_POS.ladderX, HEDRUN_BARN_POS.doorX, k));
        const hy = Math.round(lerp(198, HEDRUN_BARN_POS.groundY, k));
        const step = Math.round(Math.sin(dt * 14) * 1.5);
        ctx.drawImage(L.hedrunGiftS3, hx - 18, hy - 42 + vy + step);
      } else {
        const bob = Math.round(Math.sin(t * 2.4) * 1);
        ctx.drawImage(L.hedrunGiftS3, HEDRUN_BARN_POS.doorX - 18, HEDRUN_BARN_POS.groundY - 42 + vy + bob);
      }
    }
    return;
  }
  if (stg >= 2) {
    ctx.drawImage(L.farmS2, 0, vy);
    windowGlows(ctx, WINDOWS_S2, vy, t, 0.35);
    const hf = L.hedrunS2[Math.floor(t * 3.8) % L.hedrunS2.length];
    ctx.drawImage(hf, HEDRUN_POS.x - 19, HEDRUN_POS.roofY - 41 + vy);
    return;
  }
  ctx.drawImage(L.village, 0, vy); drawInnSign(ctx, 0, vy, t);
  windowGlows(ctx, WINDOWS, vy, t, 1 - clamp(inv(14, 40, t)) * 0.4);
}
export function drawScarecrow(ctx, p, stg = 1) {
  if (stg >= 2) return;
  ctx.drawImage(L.scarecrow, SC.x - (SC_W >> 1), SC.base - SC_BASE + off(p, F.ground));
}

export function drawMist(ctx, p, t, stg = 1) {
  const fade = stg === 3 ? 0.18 : stg >= 2 ? 0.28 : 0.62 - clamp(t / 40) * 0.25;
  const y = 214 + off(p, F.mist);
  for (const [dy, sp, a] of [[0, 4, 1], [16, -2.5, 0.7]]) {
    const ox = Math.round((t * sp) % W);
    ctx.globalAlpha = fade * a * 0.42;
    ctx.drawImage(L.mist, ox, y + dy); ctx.drawImage(L.mist, ox - W, y + dy); ctx.drawImage(L.mist, ox + W, y + dy);
  }
  ctx.globalAlpha = 1;
}

export function drawNear(ctx, p, stg = 1) { ctx.drawImage(stg === 3 ? L.nearS3 : stg >= 2 ? L.nearS2 : L.near, 0, NY + off(p, F.near)); }
export function drawGround(ctx, p, t = 0, stg = 1) {
  const oy = off(p, F.ground);
  ctx.drawImage(stg === 3 ? L.groundS3 : stg >= 2 ? L.groundS2 : L.ground, 0, GY + oy);
  sunPool(ctx, sunPos(p, t, stg), oy, t, stg >= 2 ? 0.65 : clamp(inv(2, 10, t)));
  cloudShadows(ctx, oy, t, stg >= 2 ? 0.42 : clamp(inv(4, 12, t)));
}

export function drawForeground(ctx, p, t) {
  const oy = off(p, F.fore);
  ctx.drawImage(L.fore, 0, 336 + oy);
  for (const tf of TUFTS) {
    for (let b = 0; b < tf.blades; b++) {
      const bx = tf.x + b * 2 - tf.blades;
      const hgt = tf.h - Math.abs(b - tf.blades / 2) * 2.2;
      const lean = (b - tf.blades / 2) * 0.35;
      for (let k = 0; k < hgt; k++) {
        const fr = k / hgt;
        const sway = Math.sin(t * 1.7 + tf.ph + tf.x * 0.03) * 2.4 * fr * fr + lean * fr * 3;
        ctx.fillStyle = fr > 0.8 ? '#7fb24c' : fr > 0.45 ? '#4f8a36' : '#33642a';
        ctx.fillRect(Math.round(bx + sway), tf.base - k + oy, 1, 1);
      }
    }
    if (tf.flower) {
      const sway = Math.sin(t * 1.7 + tf.ph + tf.x * 0.03) * 2.4;
      const fx = Math.round(tf.x + sway), fy = tf.base - tf.h - 1 + oy;
      ctx.fillStyle = tf.flower; ctx.fillRect(fx - 1, fy, 3, 1); ctx.fillRect(fx, fy - 1, 1, 3);
      ctx.fillStyle = '#ffe58a'; ctx.fillRect(fx, fy, 1, 1);
    }
  }
  // dew sparkles catching the low sun
  for (let i = 0; i < 14; i++) {
    const ph = (t * 0.6 + hash(i, 81) * 7) % 7;
    if (ph > 0.6) continue;
    const a = Math.sin((ph / 0.6) * Math.PI);
    const x = Math.floor(hash(i, 82) * W), y = 300 + Math.floor(hash(i, 83) * 56) + off(p, F.ground);
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = a * 0.6; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
  }
  ctx.globalAlpha = 1;
}

// God rays fanning from the sun
export function drawGodRays(ctx, p, t, stg = 1) {
  const s = sunPos(p, t, stg);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rays = 11;
  for (let i = 0; i < rays; i++) {
    const a0 = -Math.PI + (i / (rays - 1)) * Math.PI * 2 * 0.98 + Math.sin(t * 0.07 + i) * 0.03;
    const wid = 0.035 + hash(i, 91) * 0.05;
    const len = stg >= 2 ? 460 : 520;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.45 + i * 1.7);
    const alpha = (0.035 + 0.04 * pulse) * (i % 2 ? 0.7 : 1) * (stg >= 2 ? 0.55 : 1);
    const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, len);
    g.addColorStop(0, `rgba(255,224,170,${alpha})`); g.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(a0 - wid) * len, s.y + Math.sin(a0 - wid) * len);
    ctx.lineTo(s.x + Math.cos(a0 + wid) * len, s.y + Math.sin(a0 + wid) * len);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Colour grade: pre-dawn chill warming into golden morning, or crisp sunny mid-morning for Stage 2
export function drawGrade(ctx, p, t, stg = 1) {
  if (stg >= 2) {
    const s = sunPos(p, t, stg);
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, 560);
    g.addColorStop(0, stg === 3 ? 'rgba(255,244,196,0.38)' : 'rgba(255,236,184,0.34)');
    g.addColorStop(1, stg === 3 ? 'rgba(110,185,248,0.08)' : 'rgba(130,185,245,0.06)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.72);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(85,95,120,1)');
    ctx.globalAlpha = stg === 3 ? 0.12 : 0.14; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    return;
  }
  const chill = clamp(1 - inv(0.5, 10, t));
  if (chill > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(110,92,160,${0.5 * chill})`; ctx.fillRect(0, 0, W, H);
  }
  const s = sunPos(p, t, stg);
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, 520);
  g.addColorStop(0, 'rgba(255,196,120,0.6)'); g.addColorStop(1, 'rgba(150,110,170,0.12)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.68);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(70,50,90,1)');
  ctx.globalAlpha = 0.3; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
