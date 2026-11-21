// Old Skull — the great skull-shaped crag over Shadowdale — and the
// forested valley + windmill hill behind the village.
// Both rasters are in SCREEN coordinates (final camera), drawn at y=0+parallax.
import { C, P, Raster, mixC, rnd, h2, clamp, noise2, fbm1, Field, band, norm3, dot, smooth, inPoly, canopy, coniferSprite, treeSprite } from './cel.js';

const HAZE = C('#c9a3c0');
const hz = (pal, a) => pal.map(c => mixC(c, HAZE, a));

// ============ OLD SKULL ============
export const SKULL_Y = 0;
// The Old Skull: a colossal skull-shaped crag, three-quarter view turned toward the sunrise.
// Sculpted as a height field — cranium dome, heavy brow, cheekbones, zygomatic arch, carved
// sockets and nasal cavity — then broken into weathered, rounded rock masses (warped cellular
// lumps), lit per-pixel from the sun and quantised to a mauve-grey ramp with a peach rim.
// Coordinates are final screen pixels (640×360 frame) at the end of the opening pan.
export function buildSkull(W) {
  const H = 300, R = new Raster(W, H);
  const L = norm3(0.72, -0.5, 0.48);
  const g = (x, y, x0, y0, sx, sy) => Math.exp(-(((x - x0) / sx) ** 2 + ((y - y0) / sy) ** 2));
  // ---- silhouette ----
  const CX = 188, CY = 104, RX = 88, RY = 76;
  const prof = a => (fbm1(a * 2.6 + 4, 23, 3) - 0.5) * 0.16 + (fbm1(a * 9 + 1, 41, 2) - 0.5) * 0.05 + 0.035 * Math.max(0, Math.sin(a * 3 - 0.6)) + 0.03 * Math.sin(a * 7 + 1)
    + 0.035 * Math.exp(-(((a + 2.2) / 0.22) ** 2)) + 0.03 * Math.exp(-(((a + 1.25) / 0.18) ** 2)) - 0.025 * Math.exp(-(((a + 1.7) / 0.1) ** 2));   // weathered knobs and a notch on the crown
  const inCran = (x, y) => {
    const dx = (x - CX) / (RX * (x < CX ? 1.03 : 1)), dy = (y - CY) / RY, a = Math.atan2(dy, dx);
    const e = dy < 0 ? 2.0 : 2.4;                                 // slightly flattened crown
    return Math.pow(Math.abs(dx), e) + Math.pow(Math.abs(dy), e) <= 1 + prof(a);
  };
  const face = [[150, 111], [226, 91], [270, 89], [284, 99], [290, 117], [288, 133], [280, 143], [272, 180], [204, 184], [168, 172], [150, 163], [118, 143]];
  const inSkull = (x, y) => inCran(x, y) || inPoly(face, x, y);
  // sockets: rounded-square, tilted; the near one bigger, far one foreshortened
  const sockets = [{ x: 199, y: 115, rx: 23, ry: 19, tilt: 0.34, e: 2.5 }, { x: 260, y: 112, rx: 13, ry: 19, tilt: -0.3, e: 2.4 }];
  const socketAt = (x, y) => {
    for (const s of sockets) {
      const dx = x - s.x, dy = y - s.y, c = Math.cos(s.tilt), sn = Math.sin(s.tilt);
      const u = (dx * c + dy * sn) / s.rx, v = (-dx * sn + dy * c) / s.ry;
      const q = Math.pow(Math.abs(u), s.e) + Math.pow(Math.abs(v < 0 ? v * 1.1 : v), s.e);
      if (q < 1.6) return { q, u, v, s };
    }
    return null;
  };
  const TEETH = { x0: 204, x1: 274, y0: 157, y1: 175 };
  const TEETHS = []; { let x = TEETH.x0 + 1; const spec = [[5.2, 17, 0], [4.8, 18, 0], [4.4, 8, 0], [4.1, 17, 1], [3.6, 16, 0], [3.2, 14, 0], [2.7, 12, 0], [2.3, 11, 0]];
    spec.forEach(([hw, len, chip], i) => { TEETHS.push({ cx: x + hw, hw, len, chip, k: h2(i, 7, 2) - 0.5 }); x += hw * 2 + 0.9; }); }
  const nose = [[236, 126], [243, 133], [247, 148], [240, 152], [236, 148], [232, 152], [224, 147], [229, 133]];
  // ---- base sculpt ----
  const M = new Field(W, H).each((x, y) => inSkull(x, y) ? 1 : 0);
  const Hf = M.clone().blur(4, 3).each((x, y, v) => v * 40);
  Hf.each((x, y, v) => {
    if (!M.get(x, y)) return v;
    const u = (x - CX) / RX, w = (y - CY) / RY;
    v += Math.sqrt(Math.max(0, 1 - u * u - w * w)) * 46;          // dome
    v -= smooth(0.9, 1.3, ((x - 222) / 70) ** 2 + ((y - 100) / 64) ** 2) * (x < 222 ? 18 : 4);   // side plane
    v += 12 * g(x, y, 197, 92, 30, 6) + 8 * g(x, y, 262, 90, 17, 6);   // brow ridges
    v += 6 * g(x, y, 230, 105, 8, 12);                              // glabella
    v += 20 * g(x, y, 186, 142, 20, 8) + 9 * g(x, y, 138, 139, 24, 5);   // near cheekbone + zygomatic arch
    v += 9 * g(x, y, 278, 133, 9, 10);                              // far cheekbone
    v += 12 * g(x, y, 236, 159, 30, 12) + 10 * g(x, y, 190, 160, 18, 9); // maxilla, swelling back under the near cheek
    v -= 13 * g(x, y, 134, 109, 14, 22);                            // temple hollow
    v -= 6 * g(x, y, 118, 153, 18, 10);                             // under the arch
    return v;
  });
  const carve = new Field(W, H).each((x, y) => { const s = socketAt(x, y); if (s && s.q < 1) return 1; return inPoly(nose, x, y) ? 0.8 : 0; }).blur(2, 2);
  Hf.each((x, y, v) => v - carve.get(x, y) * 44);
  // ---- weathered rock masses: domain-warped cells, each a rounded lump at its own height ----
  const fr = rnd(31), cells = [];
  for (let gy = -20; gy < H; gy += 34) for (let gx = -20; gx < W; gx += 40) {
    cells.push({ x: gx + fr() * 40, y: gy + fr() * 34, h: fr() });
    fr(); fr(); fr();
  }
  const GS = 32, grid = new Map();
  cells.forEach((c, i) => { const k = Math.floor(c.x / GS) + ',' + Math.floor(c.y / GS); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
  const near2 = (x, y) => {
    const gx = Math.floor(x / GS), gy = Math.floor(y / GS); let a = -1, ad = 1e9, b = -1, bd = 1e9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const l = grid.get((gx + i) + ',' + (gy + j)); if (!l) continue;
      for (const k of l) { const c = cells[k], d = Math.hypot(x - c.x, (y - c.y) * 1.15); if (d < ad) { b = a; bd = ad; a = k; ad = d; } else if (d < bd) { b = k; bd = d; } } }
    return [a, ad, b, bd];
  };
  const CELL = new Int32Array(W * H).fill(-1), CELL2 = new Int32Array(W * H), EDGE = new Float32Array(W * H);
  const nb = i => CELL2[i];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!M.get(x, y)) continue;
    const wx = x + (noise2(x / 23, y / 23, 5) - 0.5) * 22, wy = y + (noise2(x / 23, y / 23, 9) - 0.5) * 18;
    const [a, ad, b, bd] = near2(wx, wy), i = y * W + x;
    CELL[i] = a; CELL2[i] = b; EDGE[i] = bd - ad;
    const c = cells[a], dh = Math.abs(c.h - cells[b].h);
    const crev = Math.exp(-(bd - ad) / 2.6) * Math.max(0, dh - 0.12) * 9;          // crevices deepest between unequal masses
    const lumpH = (c.h - 0.5) * 6 - (ad / 40) ** 2 * 6;
    const lk = 0.45 + 0.55 * smooth(110, 200, x);                                // calmer, broader masses on the shadowed back of the crown
    Hf.set(x, y, Hf.get(x, y) + (lumpH - crev) * lk * (1 - carve.get(x, y)));
  }
  Hf.blur(1, 1);
  const AO = Hf.clone().blur(6, 2);
  // ---- mountain shoulder the skull is sunk into ----
  const mtTop = x => 176 + ((x - 186) / 150) ** 2 * 40 - 30 * Math.exp(-(((x - 124) / 40) ** 2)) - 8 * Math.exp(-(((x - 300) / 20) ** 2)) + (fbm1(x / 24, 5, 3) - 0.5) * 12
    - 14 * Math.exp(-(((x - 70) / 18) ** 2)) - 12 * Math.exp(-(((x - 318) / 18) ** 2)) - 7 * Math.exp(-(((x - 240) / 30) ** 2));
  // where the jaw meets the hillside: tooth tips sink into a scree bank instead of a black mouth box
  const jawRock = x => TEETH.y0 + 19 - (x - TEETH.x0) * 0.12 + (fbm1(x / 9, 77, 2) - 0.5) * 3;
  const jawK = x => smooth(186, 204, x) * (1 - smooth(276, 292, x));
  const mtTop2 = x => { const k = jawK(x); return k > 0 ? mtTop(x) * (1 - k) + Math.min(mtTop(x), jawRock(x)) * k : mtTop(x); };
  const MM = new Field(W, H).each((x, y) => y >= mtTop2(x) ? 1 : 0);
  const Hm = MM.clone().blur(6, 2).each((x, y, v) => v * 34 + (fbm1(x / 30 + y / 70, 21, 3) - 0.5) * 10 + (noise2(x / 34, y / 16, 21) - 0.5) * 8);

  // ---- paint ----
  const ROCK = P(['#211a2e', '#30273f', '#433851', '#594c66', '#71627b', '#8b7b91', '#a796a6', '#c4b0b6', '#dcc4c1']);
  const MT = P(['#211b31', '#2f2742', '#423857', '#594d6c', '#736582', '#8e7e97']);
  const SOCK = P(['#120d1b', '#1b1426', '#251c32', '#31263f', '#40334f', '#54465f']);
  const GRASS = P(['#34502f', '#466736', '#5d8040', '#7a9a4a']);
  const PEACH = C('#ffc79e'), INK = C('#1c1528');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, sk = M.get(x, y) > 0, mt = MM.get(x, y) > 0;
    if (!sk && !mt) continue;
    if (mt && (!sk || !(inPoly(face, x, y) && x > 172) || (jawK(x) > 0.5 && y >= jawRock(x)))) {
      const n = Hm.normal(x, y, 0.6), d = dot(n, L);
      const ledge = n[1] < -0.5 && noise2(x / 18, y / 7, 33) > 0.62 && y - mtTop2(x) < 30;
      R.set(x, y, ledge ? band(GRASS, 0.2 + d * 0.7, x, y) : band(MT, 0.12 + d * 0.75 - (y - mtTop2(x)) * 0.004 - (jawK(x) * Math.max(0, 1 - (y - jawRock(x)) / 5)) * 0.15, x, y, 0.1));
      continue;
    }
    const cv = carve.get(x, y), sa = socketAt(x, y);
    if (cv > 0.55) {
      // cavity interior: black under the brow, warming to a faint mauve bounce on the floor / far wall
      let t = 0.05;
      if (sa) t = clamp(0.12 + sa.v * 0.62 + sa.u * 0.15) * 0.95; else t = clamp((y - 140) / 26) * 0.5;
      if (sa && sa.v > 0.35 && sa.q > 0.55) t += 0.12;
      R.set(x, y, band(SOCK, t, x, y, 0.2));
      continue;
    }
    let toothN = null;
    if (y >= TEETH.y0 - 3 && y <= TEETH.y1 + 4 && x >= TEETH.x0 && x <= TEETH.x1) {
      // upper teeth hang from the maxilla along a curving jaw: wide near teeth, narrow far ones,
      // one snapped short. Each is a rounded bone peg with a real normal, so it takes the same
      // sunlight, AO and peach highlight as the rest of the skull.
      const yt = TEETH.y0 - (x - TEETH.x0) * 0.05;
      if (y >= yt) {
        const j = y - yt;
        // distance from this column to the nearest tooth edge at the root (negative = inside a tooth)
        let tooth = null, e = 99;
        for (const tt of TEETHS) { const de = Math.abs(x + 0.5 - tt.cx) - tt.hw; if (de < e) { e = de; tooth = tt; } }
        // alveolar ridge: the maxilla bone flows down between the teeth in rounded scallops,
        // so every tooth grows out of the skull instead of hanging under a seam
        const scallop = 1.6 + clamp(e + 1.8, 0, 3.2) * 0.95;
        if (j >= scallop - 0.5) {
          const taper = 1 - 0.16 * clamp(j / tooth.len);
          const u = (x + 0.5 - tooth.cx) / (tooth.hw * taper);
          const tipY = tooth.len - u * u * 3.2 - (tooth.chip && u > 0.15 ? 3 : 0);
          if (Math.abs(u) <= 1 && j <= tipY) {
            const tipK = smooth(tipY - 4, tipY, j);
            toothN = norm3(u * 0.8, -0.2 + tipK * 0.85, Math.sqrt(Math.max(0.05, 1 - u * u)) * 0.95);
            toothN.j = j - scallop; toothN.k = tooth.k;
          } else {
            // the gap behind/between the teeth: shaded where it meets the ridge, darkening into the mouth,
            // then lifted again by bounce light off the scree below
            const dj = j - scallop;
            const tt = dj < 1 ? 0.42 : dj < 2.5 ? 0.3 : 0.16 + clamp((dj - 6) / 8) * 0.18;
            R.set(x, y, band(SOCK, tt + (Math.abs(u) < 1.4 ? 0.04 : 0), x, y, 0.2)); continue;
          }
        }
      }
    }
    const n = Hf.normal(x, y, 0.5), d = dot(n, L);
    const ao = clamp((AO.get(x, y) - Hf.get(x, y)) * 0.05, -0.15, 0.4);
    let t = 0.0 + d * 1.08 - ao + (y < 70 ? 0.04 : 0) - smooth(150, 200, y) * 0.08;
    if (sa && sa.q >= 0.9 && sa.q < 1.45 && sa.v > 0.2) t += 0.18;      // lit lower socket lip
    if (sa && sa.q >= 0.9 && sa.q < 1.5 && sa.v < -0.3) t -= 0.22;      // brow overhang shadow
    t += 0.16 * g(x, y, 188, 163, 18, 9);                               // bounce light off the scree onto the jaw corner
    if (toothN) {
      // same lighting model as the bone above; the first couple of rows blend into the ridge's tone
      const tt = 0.2 + dot(toothN, L) * 1.0 + toothN.k * 0.08 - smooth(150, 200, y) * 0.04;
      const bl = clamp(toothN.j / 2.5);
      t = t * (1 - bl) + tt * bl - (toothN.j < 0.6 ? 0.06 : 0);
    }
    let col = band(ROCK, t, x, y, 0.12);
    if (t > 0.62) col = mixC(col, PEACH, clamp((t - 0.62) * 1.8) * clamp((x - 110) / 150) * 0.55);
    if (!toothN && EDGE[i] < 1.1 && Math.abs(cells[CELL[i]].h - cells[nb(i)].h) > 0.36 && cv < 0.2) col = mixC(col, INK, clamp(0.12 + d * 0.45, 0.1, 0.45));   // crevice ink
    R.set(x, y, col);
  }
  // rubble and boulders heaped where the back of the skull sinks into the hillside
  const rr = rnd(91);
  for (let k = 0; k < 26; k++) {
    const bx = k < 16 ? 70 + rr() * 150 : 196 + rr() * 86, top = mtTop2(bx), brx = 3 + rr() * 6, bry = 2.2 + rr() * 3.2, byy = top + 1 + rr() * 5;
    if (!M.get(bx | 0, (top - 3) | 0) && rr() < 0.6) continue;        // mostly against the skull itself
    R.ellipse(bx, byy, brx, bry, (x, y, u, v) => { const n = norm3(u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v)) + 0.2); return band(MT, 0.15 + dot(n, L) * 0.85 + (h2(x, y, 4) - 0.5) * 0.08, x, y, 0.15); });
    R.hline(bx - brx * 0.5, bx + brx * 0.3, byy - bry + 0.5, MT[5]);
  }
  for (let x = 72; x < 290; x += 2) { const y = Math.round(mtTop2(x)) + 2; if (h2(x, 3) > 0.45) { R.set(x, y, GRASS[2]); R.set(x, y - 1, GRASS[3]); if (h2(x, 4) > 0.6) R.set(x + 1, y - 2, GRASS[3]); } }
  // two deep fissures running down the crown
  const lipC = ROCK[6];
  const crack = pts => { for (let k = 0; k + 1 < pts.length; k++) R.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], (x, y) => { if (M.get(x + 1, y)) R.set(x + 1, y, mixC(R.get(x + 1, y), lipC, 0.6)); return INK; }); };
  crack([[186, 29], [190, 40], [185, 51], [192, 63], [188, 76]]);
  crack([[190, 40], [201, 45], [208, 42]]);
  crack([[127, 70], [133, 82], [129, 96]]);
  // peach rim on sun-facing silhouette edges
  const src = R.d.slice(), has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (!src[i]) continue;
    const up = !has(x, y - 1), rt = !has(x + 1, y), k = clamp((x - 80) / 190);
    if ((up || rt) && (M.get(x, y) || y < mtTop2(x) + 3)) {
      R.d[i] = mixC(src[i], PEACH, 0.3 + 0.5 * k);
      if (has(x - (rt ? 1 : 0), y + (up ? 1 : 0))) { const j = i + (up ? W : 0) - (rt ? 1 : 0); R.d[j] = mixC(src[j], PEACH, 0.12 + 0.22 * k); }
    }
  }
  R.outline(C('#1f182c'), false);
  const out = new Raster(W, H); out.blit(R, 0, 8);
  return out;
}

// ============ VALLEY: far hills, patchwork, treeline, windmill ============
export const HILLS_Y = 0;
export const MILL = { x: 588, y: 0 };
export function buildHills(W) {
  const H = 330, R = new Raster(W, H);
  const FAR = hz(P(['#5f7a5a', '#728f5e', '#88a462', '#a2b86a', '#c0cc7c']), 0.3);
  const MID = hz(P(['#3c5e3a', '#4d7240', '#618846', '#7a9e4c', '#96b456', '#b6ca66']), 0.16);
  const FIELD = hz(P(['#c9b46a', '#a7b45e', '#d4c27a', '#8ea85a', '#b99c5a']), 0.35);
  const L = norm3(0.4, -0.8, 0.5);
  // band 1: far rolling hills (two ridges)
  const ridge1 = x => 190 + fbm1(x / 70, 41, 4) * 14 - 26 * Math.exp(-(((x - MILL.x) / 60) ** 2)) + 16 * Math.exp(-(((x - 196) / 64) ** 2));
  const ridge2 = x => 204 + fbm1(x / 50, 43, 4) * 12;
  for (let x = 0; x < W; x++) {
    const t1 = Math.round(ridge1(x)), t2 = Math.round(ridge2(x));
    for (let y = t1; y < H; y++) {
      const near = y >= t2;
      const top = near ? t2 : t1, slope = (near ? ridge2(x + 2) - ridge2(x - 2) : ridge1(x + 2) - ridge1(x - 2)) * 0.25;
      let t = 0.6 - slope * 0.5 - (y - top) * 0.012;
      // patchwork fields on the far slopes (hard-edged quilts with hedgerows)
      const fx = Math.floor((x + (y - top) * 1.6) / 38), fy = Math.floor((y - top) / 9);
      const id = Math.floor(h2(fx, fy + (near ? 50 : 0), 7) * 7);
      let c = band(near ? MID : FAR, t, x, y);
      const strip = Math.floor((y - top + fbm1(x / 55, near ? 8 : 9, 2) * 7) / 6), col = Math.floor((x + strip * 23) / 70);
      const id2 = Math.floor(h2(col, strip + (near ? 50 : 0), 7) * 6);
      if (!near && id2 < 3 && y - top > 2) c = mixC(FIELD[id2], FAR[2], 0.5);
      if (!near && (y - top + Math.round(fbm1(x / 55, 9, 2) * 7)) % 6 === 0 && y - top > 2 && h2(col, strip, 3) > 0.3) c = FAR[1];
      if (y === top) c = mixC(near ? MID[5] : FAR[4], C('#ffe0c0'), 0.4);
      R.set(x, y, c);
    }
  }
  // windmill on its hill
  const mx = MILL.x, mtop = Math.round(ridge1(mx)) - 30;
  MILL.y = mtop + 4;
  const TW = hz(P(['#6a5a5c', '#8a7874', '#ab9890', '#cbb8aa', '#e6d6c4']), 0.25);
  R.poly([[mx - 5, mtop], [mx + 5, mtop], [mx + 8, mtop + 32], [mx - 8, mtop + 32]], (x, y) => band(TW, 0.45 + (x - mx) * 0.06, x, y));
  R.poly([[mx - 7, mtop + 1], [mx + 7, mtop + 1], [mx, mtop - 7]], (x, y) => band(hz(P(['#4a3434', '#6a4440', '#8c5a4c']), 0.2), 0.5 + (x - mx) * 0.08, x, y));
  R.rect(mx - 1, mtop + 22, 3, 6, C('#4a3a3a')); R.rect(mx + 2, mtop + 10, 2, 3, C('#ffcf7a'));
  // the lane, seen again far off: snaking up the valley slopes and over the ridge toward the sunrise
  { const LN = hz(P(['#9a7a56', '#b8966a', '#d4b282', '#f0d8a6']), 0.22);
    const lx = y => 374 - (y - 194) * 0.9 + Math.sin((y - 194) / 3.2) * (2 + (y - 194) * 0.3);
    let px = null;
    for (let y = Math.round(ridge1(374)); y < 232; y++) {
      const x = lx(y), hw = 0.4 + Math.max(0, y - 194) * 0.07;
      const x0 = px === null ? x : px; px = x;
      for (let xx = Math.round(Math.min(x, x0) - hw); xx <= Math.round(Math.max(x, x0) + hw); xx++) {
        if (!R.has(xx, y)) continue;
        R.set(xx, y, LN[xx < x - hw * 0.3 ? 1 : xx > x + hw * 0.3 ? 3 : 2]);
        if (R.has(xx, y + 1) && h2(xx, y, 3) > 0.5) R.set(xx, y + 1, mixC(R.get(xx, y + 1), LN[0], 0.3));
      }
    }
  }
  // treeline: three depth rows of conifers + round trees, thinning at the valley mouth
  const rows = [
    { y: 216, s: 14, haze: 0.34, n: 120, ink: C('#4f5e50') },
    { y: 234, s: 19, haze: 0.2, n: 84, ink: C('#34463a') },
    { y: 256, s: 26, haze: 0.08, n: 56, ink: C('#1f3024') },
  ];
  const PINE = P(['#14281c', '#1d3524', '#28452c', '#375a35', '#4b7140', '#638a4c']);
  const LEAF = P(['#1d3a22', '#2a4f28', '#3b672c', '#558232', '#749e3a', '#98ba46', '#c2d662', '#e6ec98']);
  const r = rnd(5);
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const x = Math.round((i + r() * 0.8) * (W + 40) / row.n) - 20;
      if (Math.abs(x - 380) < 40 + ri * 14 && r() > 0.25) continue;       // valley mouth gap
      const s = row.s * (0.75 + r() * 0.5), y = row.y + (r() - 0.5) * 6;
      const conifer = r() > 0.68;
      const lx = clamp((402 - x) / 160, -1, 1) * -0.2 + 0.55;
      const sp = conifer
        ? coniferSprite({ w: Math.round(s * 0.62) | 1, h: Math.round(s * 1.25), pal: hz(PINE, row.haze), seed: i * 7 + ri, lx, ink: row.ink })
        : treeSprite({ w: Math.round(s * 1.05), h: Math.round(s * 1.15), pal: hz(LEAF, row.haze), bark: hz(P(['#2a1c14', '#3e2a1c', '#57402a']), row.haze), seed: i * 11 + ri, lx, ink: row.ink, puff: Math.max(3, s * 0.22), stray: 6 });
      R.blit(sp, Math.round(x - sp.w / 2), Math.round(y - sp.h));
    }
    // fill below each row so gaps don't show the sky
    for (let x = 0; x < W; x++) for (let y = row.y - 2; y < row.y + 30; y++) if (!R.has(x, y)) R.set(x, y, hz(PINE, row.haze)[1 + ((x + y) & 1)]);
  });
  return R;
}

export function drawMillSails(ctx, ox, oy, t) {
  const cx = MILL.x + ox, cy = MILL.y + oy, a0 = t * 0.7;
  for (let k = 0; k < 4; k++) {
    const a = a0 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 1; s < 19; s++) {
      const x = Math.round(cx + ca * s), y = Math.round(cy + sa * s);
      ctx.fillStyle = '#5a4848'; ctx.fillRect(x, y, 1, 1);
      if (s > 4) { ctx.fillStyle = s % 3 ? '#e6d8cc' : '#c8b8b0'; ctx.fillRect(Math.round(x - sa * 2), Math.round(y + ca * 2), 1, 1); ctx.fillRect(Math.round(x - sa), Math.round(y + ca), 1, 1); }
    }
  }
  ctx.fillStyle = '#3a2a2a'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
}
