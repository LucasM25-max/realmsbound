// Near plane (hawthorn hedge + dry-stone wall) and the meadow in front:
// footpath, signpost, split-rail fence, Elminster's stump, rat burrow,
// scarecrow. Screen coordinates (final camera).
import { C, P, Raster, mixC, darken, lighten, rnd, h2, clamp, noise2, fbm1, band, norm3, canopy, sprite } from './cel.js';

export const NEAR_Y = 0;
export const GROUND_Y = 0;
export const GRASS_Y = 284;                                   // meadow top edge (screen)
export const PATH_Y = x => 322 + Math.round(2.5 * Math.sin(x / 90 + 0.5));
// Elminster's perch: the top rail of the split-rail fence (x = his body centre, top = rail top)
export const FENCE = { x0: 486, posts: [492, 584, 626], base: 303, rail1: 277, rail2: 290 };
export const STUMP = { x: 545, base: FENCE.base, top: FENCE.rail1 + 1 };
export const SCARECROW = { x: 474, base: 298, armY: 0 };
export const BURROW = { x: 452, y: 341 };
// the lane: leaves the footpath, slips through a gap in the hedge between two gateposts and
// winds up past the cottages into the valley
export const LANE = { gap0: 374, gap1: 395, x: 384 };
const laneMeadowX = y => LANE.x + 20 * ((y - GRASS_Y) / 31) ** 2;
const laneHW = y => { const k = clamp((y - GRASS_Y) / 31); return 4 + k ** 1.6 * 8; };
const laneNearX = y => LANE.x - (285 - y) * 0.42 + Math.sin(y / 5) * 0.6;

const INK = C('#1c1220');
const G = P(['#24401e', '#2f5424', '#3d6a2a', '#4f8030', '#659834', '#80ae3c', '#9cc246', '#bad55c', '#dbe885']);
const LEAF = P(['#183420', '#22482a', '#30602e', '#467a32', '#619438', '#80ae40', '#a6c852']);
const STONE = P(['#2e293b', '#433c52', '#5a5169', '#736981', '#8e839a', '#aa9fb2', '#c7bccb', '#e0d6dd']);
const DIRT = P(['#4a3020', '#64432b', '#7f5b3a', '#9a744c', '#b48d62', '#cba77b', '#dfc196']);
const WOOD = P(['#26170e', '#3c2617', '#563822', '#73502f', '#916a40', '#ae8654', '#c9a46e']);
const SH = C('#1d2c1e');
const shadowPx = (R, x, y, a = 0.4) => R.set(x, y, mixC(R.get(x, y) || G[3], SH, a));

// grass tuft: a little fan of blades, dark roots → lit tips
function tuft(R, x, y, s, lean = 0, pal = G) {
  const n = 3 + Math.floor(s / 2);
  for (let b = 0; b < n; b++) {
    const off = (b - (n - 1) / 2), hgt = Math.round(s * (1 - Math.abs(off) / n * 0.6));
    for (let k = 0; k < hgt; k++) {
      const f = k / hgt, xx = Math.round(x + off * (0.6 + f * 0.9) + lean * f * f * 2);
      R.set(xx, y - k, pal[f > 0.75 ? 7 : f > 0.4 ? 5 : 3]);
    }
  }
}

// ============ HEDGE + DRY-STONE WALL ============
export function buildNear(W) {
  const H = 420, R = new Raster(W, H);
  const TOP = 274, BOT = 285;
  // grass verge behind/below (fills parallax gaps)
  for (let x = 0; x < W; x++) for (let y = BOT - 4; y < H; y++) R.set(x, y, band(G, 0.42 + (noise2(x / 40, y / 12, 3) - 0.5) * 0.25, x, y));
  // through the gap: a sliver of village green with the lane running back between the trees
  for (let y = 252; y < BOT; y++) for (let x = LANE.gap0 - 2; x <= LANE.gap1 + 2; x++) {
    const k = (y - 252) / (BOT - 252), lx = laneNearX(y), hw = 1 + k * 3.2;
    if (y < 256 && h2(x, y, 3) > (y - 251) / 5) continue;                 // ragged far edge
    let c = band(G, 0.3 + k * 0.2 + (noise2(x / 6, y / 3, 4) - 0.5) * 0.2, x, y);
    if (Math.abs(x - lx) <= hw) c = band(DIRT, 0.45 + k * 0.15 + (x - lx) / (hw + 1) * 0.25 + (h2(x, y, 9) - 0.5) * 0.1, x, y);
    R.set(x, y, c);
  }
  for (let x = LANE.gap0; x <= LANE.gap1; x += 2) if (Math.abs(x - laneNearX(262)) > 3) tuft(R, x, 262 + (x & 3), 3, 0.2);
  // hawthorn hedge: one long clustered mass with blossom
  const hedge = new Raster(W, H);
  const r = rnd(11);
  for (let x = -20; x < W + 30; x += 22) {
    const hgt = 10 + fbm1(x / 60, 5, 3) * 8;
    canopy(hedge, x + r() * 8, TOP - hgt * 0.45, 20, hgt * 0.62, { pal: LEAF, seed: x + 900, lx: 0.2, puff: 5.5, stray: 10, spread: 0.55 });
  }
  for (let i = 0; i < 520; i++) { const x = Math.floor(r() * W), y = Math.floor(TOP - 4 - r() * 20); if (hedge.has(x, y) && hedge.has(x, y - 1)) { const c = r() > 0.3 ? C('#f8f2ea') : C('#f4c6d4'); hedge.set(x, y, c); if (r() > 0.5) hedge.set(x + 1, y, c); } }
  // cut the gap: ragged, leaning in a little at the top like an old field gate
  for (let y = 0; y < H; y++) for (let x = LANE.gap0 - 4; x <= LANE.gap1 + 4; x++) {
    const lean = Math.max(0, TOP - y) * 0.18, j = (h2(x, y >> 1, 21) - 0.5) * 2.4;
    if (x > LANE.gap0 + lean + j && x < LANE.gap1 - lean + j && hedge.in(x, y)) hedge.d[y * W + x] = 0;
  }
  hedge.outline(C('#13261a'), false);
  R.blit(hedge, 0, 0);
  // the wall: big rounded field-stones, through-stones and a coping of upright slabs
  const wall = new Raster(W, H);
  const rows = [TOP + 5];
  rows.forEach((y0, ri) => {
    let x = -Math.floor(r() * 10);
    while (x < W) {
      const sw = 9 + Math.floor(r() * 8), sh = 6 + (r() > 0.7 ? 1 : 0), v = (r() - 0.5) * 0.24;
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
        if (x + i > LANE.gap0 && x + i < LANE.gap1) continue;
        const cornerCut = (i === 0 || i === sw - 1) && (j === 0 || j === sh - 1);
        if (cornerCut) continue;
        const u = (i + 0.5) / sw * 2 - 1, w = (j + 0.5) / sh * 2 - 1;
        const nz = Math.sqrt(Math.max(0, 1 - u * u * 0.6 - w * w * 0.6));
        let t = 0.22 + v + (-w * 0.38) + u * 0.08 + nz * 0.32;
        if (j === 0) t += 0.12;
        wall.set(x + i, y0 + j, band(STONE, t, x + i, y0 + j));
      }
      // lichen & moss
      if (r() > 0.55) wall.set(x + 2 + Math.floor(r() * (sw - 4)), y0 + 2 + Math.floor(r() * 3), r() > 0.5 ? C('#c9c06a') : C('#a4b86a'));
      x += sw + (r() > 0.6 ? 1 : 0);
    }
  });
  // dark joints behind the stones
  for (let x = 0; x < W; x++) for (let y = TOP + 5; y < TOP + 11; y++) if (!wall.has(x, y) && !(x > LANE.gap0 && x < LANE.gap1)) wall.set(x, y, C('#221d2c'));
  // coping slabs set on edge
  let x = 0;
  while (x < W) {
    const cw = 3 + Math.floor(r() * 2), ch = 3 + Math.floor(r() * 2), lean = r() > 0.5 ? 1 : 0;
    for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) {
      const px = x + i + (j < 2 ? lean : 0), py = TOP + 5 - j;
      if (px > LANE.gap0 - 1 && px < LANE.gap1 + 1) continue;
      wall.set(px, py, band(STONE, 0.35 + (i === 0 ? 0.25 : i === cw - 1 ? -0.25 : 0) + (j === ch - 1 ? 0.25 : 0), px, py));
    }
    if (r() > 0.4 && (x + cw < LANE.gap0 || x > LANE.gap1 + 1)) for (let i = 0; i < cw; i++) wall.set(x + i + lean, TOP + 5 - ch, r() > 0.5 ? C('#7f9a4a') : C('#a4b85c'));   // moss caps
    x += cw;
  }
  // two squared gateposts with cap stones, and the old gate swung open against the right one
  for (const gx of [LANE.gap0 - 4, LANE.gap1 - 1]) {
    for (let y = TOP - 6; y <= BOT; y++) for (let i = 0; i < 6; i++) {
      const t = 0.42 + (i === 0 ? 0.28 : i >= 4 ? -0.22 : 0) + (((y - TOP) % 5) === 0 ? -0.18 : 0) - (y - TOP) * 0.006 + (h2(gx + i, y >> 1, 4) - 0.5) * 0.08;
      wall.set(gx + i, y, band(STONE, t, gx + i, y));
    }
    for (let i = -1; i < 7; i++) { wall.set(gx + i, TOP - 7, band(STONE, 0.78, gx + i, TOP - 7)); wall.set(gx + i, TOP - 8, band(STONE, i < 3 ? 0.9 : 0.6, gx + i, TOP - 8)); }
    wall.set(gx + 1, TOP - 9, C('#a4b85c')); wall.set(gx + 2, TOP - 9, C('#7f9a4a')); wall.set(gx + 4, TOP - 3, C('#c9c06a'));
  }
  { // gate (seen edge-on, swung back): three bars + a brace
    const gx = LANE.gap1 + 5;
    for (let y = TOP - 3; y <= BOT - 1; y++) { wall.set(gx + 9, y, WOOD[3]); wall.set(gx + 10, y, WOOD[1]); }
    for (const by of [TOP - 2, TOP + 3, TOP + 8]) for (let i = 0; i < 11; i++) { wall.set(gx + i, by + (i >> 3), WOOD[5]); wall.set(gx + i, by + 1 + (i >> 3), WOOD[2]); }
    for (let i = 0; i < 10; i++) wall.set(gx + i, TOP + 9 - i, WOOD[4]);
  }
  wall.outline(INK, false);
  R.blit(wall, 0, 0);
  // weeds and foxgloves at the foot of the wall
  for (let k = 0; k < 60; k++) { const px = Math.floor(h2(k, 31) * W); tuft(R, px, BOT + 1, 4 + Math.floor(h2(k, 32) * 4), h2(k, 33) - 0.5); }
  for (let k = 0; k < 14; k++) {
    const px = Math.floor(h2(k, 41) * W), hgt = 12 + Math.floor(h2(k, 42) * 8), col = h2(k, 43) > 0.5 ? [C('#c4489a'), C('#e07ac0')] : [C('#f2eee0'), C('#ffffff')];
    R.vline(px, BOT - hgt, BOT, G[3]);
    for (let j = 0; j < hgt - 3; j += 2) { R.set(px - 1, BOT - hgt + j + 1, col[0]); R.set(px + 1, BOT - hgt + j + 2, col[1]); }
  }
  return R;
}

// ============ MEADOW ============
export function buildMeadow(W) {
  const H = 420, R = new Raster(W, H);
  const edge = x => GRASS_Y + Math.round(fbm1(x / 11, 31, 3) * 3);
  // grass: broad sunlit dapples, banded (no static)
  for (let x = 0; x < W; x++) for (let y = edge(x); y < H; y++) {
    const dap = noise2(x / 58, y / 16, 6), dap2 = noise2(x / 21, y / 7, 8);
    let t = 0.5 + (dap - 0.5) * 0.5 + (dap2 - 0.5) * 0.14 - (y - GRASS_Y) * 0.0012;
    R.set(x, y, band(G, t, x, y, 0.12));
  }
  // the lane, from the hedge gap down to the footpath
  for (let y = GRASS_Y + 1; y < PATH_Y(404) - 3; y++) {
    const cx = laneMeadowX(y), hw = laneHW(y) + Math.sin(y / 3) * 0.4;
    for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) {
      const dx = x - cx; if (Math.abs(dx) > hw) continue;
      let t = 0.55 + (noise2(x / 7, y / 3, 15) - 0.5) * 0.12 + dx / hw * 0.08;
      if (dx < -hw + 1.2) t = 0.25; else if (dx > hw - 1.2) t = 0.74;
      if (Math.abs(dx) < 1.2 && h2(x, y >> 1, 3) > 0.5) t += 0.1;              // grassy crown between the ruts
      R.set(x, y, Math.abs(dx) < 0.8 && h2(x, y, 6) > 0.55 ? G[4] : band(DIRT, t, x, y, 0.04));
    }
  }
  // top edge: tufty silhouette against the wall
  for (let x = 0; x < W; x += 2) if (Math.abs(x - LANE.x) > 5) tuft(R, x + (h2(x, 1) > 0.5 ? 1 : 0), edge(x) + 2, 3 + Math.floor(h2(x, 2) * 3), h2(x, 3) - 0.5);
  // footpath
  const pathHW = x => 7 + Math.round(fbm1(x / 17, 41, 2) * 2);
  for (let x = 0; x < W; x++) {
    const c = PATH_Y(x), hw = pathHW(x);
    for (let y = c - hw; y <= c + hw; y++) {
      const dy = y - c;
      let t = 0.55 + (noise2(x / 9, y / 3, 14) - 0.5) * 0.18;
      if (dy <= -hw + 1) t = 0.12;                              // far bank in shadow
      else if (dy <= -hw + 2) t = 0.3;
      if (dy >= hw - 1) t = 0.78;                               // near lip catches light
      if ((dy === -2 || dy === 3) && h2(Math.floor(x / 5), dy, 2) > 0.35) t -= 0.16;   // ruts
      R.set(x, y, band(DIRT, t, x, y, 0.1));
    }
    if (h2(x, 15) > 0.86) { const yy = c - 4 + Math.floor(h2(x, 16) * 8); R.set(x, yy, C('#8a8088')); R.set(x + 1, yy, C('#6a6070')); R.set(x, yy - 1, C('#d8d0d0')); }
  }
  // grass spilling over both path edges
  for (let x = 0; x < W; x += 3) { const c = PATH_Y(x), hw = pathHW(x); if (h2(x, 4) > 0.3) tuft(R, x, c - hw + 1, 3 + Math.floor(h2(x, 5) * 2), 0.3); if (h2(x, 6) > 0.45) tuft(R, x + 1, c + hw + 3, 4 + Math.floor(h2(x, 7) * 3), -0.3); }
  for (let y = GRASS_Y + 3; y < PATH_Y(404) - 8; y += 4) { const cx = laneMeadowX(y), hw = laneHW(y); if (h2(y, 1) > 0.4) tuft(R, Math.round(cx - hw - 1), y + 1, 3, -0.4); if (h2(y, 2) > 0.4) tuft(R, Math.round(cx + hw + 2), y + 1, 3, 0.4); }
  // tufts + flower drifts across the meadow, larger toward the viewer
  const FL = [[C('#f4f1e6'), C('#ffd84a')], [C('#ffd23f'), C('#c98a1a')], [C('#e3372f'), C('#3a1414')], [C('#7f9df4'), C('#3b4ea8')], [C('#d58ce8'), C('#8e4aa8')]];
  const fr = rnd(51);
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(fr() * W), y = GRASS_Y + 6 + Math.floor(Math.pow(fr(), 0.8) * (H - GRASS_Y - 10));
    if (Math.abs(y - PATH_Y(x)) < 11) continue;
    if (y < PATH_Y(x) && Math.abs(x - laneMeadowX(y)) < laneHW(y) + 4) continue;
    const s = 3 + (y - GRASS_Y) / 14 + fr() * 2;
    tuft(R, x, y, Math.round(s), fr() - 0.5);
  }
  for (let d = 0; d < 26; d++) {
    const cx = fr() * W, cy = GRASS_Y + 8 + fr() * 64, kind = FL[Math.floor(fr() * FL.length)];
    for (let k = 0; k < 14; k++) {
      const x = Math.round(cx + (fr() - 0.5) * 34), y = Math.round(cy + (fr() - 0.5) * 9);
      if (Math.abs(y - PATH_Y(x)) < 10) continue;
      if (y < PATH_Y(x) && Math.abs(x - laneMeadowX(y)) < laneHW(y) + 3) continue;
      const big = y > GRASS_Y + 40;
      R.set(x, y + 1, G[2]); R.set(x, y + 2, G[3]);
      if (big) { R.set(x - 1, y, kind[0]); R.set(x + 1, y, kind[0]); R.set(x, y - 1, kind[0]); R.set(x, y + 1, kind[0]); R.set(x, y, kind[1]); }
      else { R.set(x, y, kind[0]); R.set(x + 1, y, mixC(kind[0], G[4], 0.4)); }
    }
  }
  // half-sunk stones
  for (const [sx, sy, s] of [[118, 300, 5], [282, 344, 6], [612, 346, 5], [20, 352, 7], [372, 296, 4]]) {
    const S = sprite(s * 3, s * 2, T => T.ellipse(s * 1.5, s * 1.1, s * 1.4, s * 0.9, (x, y, u, v) => band(STONE, 0.5 - v * 0.4 + u * 0.15, x, y)), INK);
    R.blit(S, sx - Math.round(s * 1.5), sy - s);
    for (let i = -s; i <= s; i += 2) tuft(R, sx + i, sy + Math.round(s * 0.7), 3, 0);
  }
  // split-rail fence: Elminster perches on its top rail
  const fence = new Raster(W, H), PB = FENCE.base, PH = PB - FENCE.rail1 + 5;
  for (const px of FENCE.posts) {
    for (let y = PB - PH; y <= PB; y++) for (let k = 0; k < 5; k++) fence.set(px + k, y, band(WOOD, 0.52 + (k === 0 ? 0.25 : k >= 3 ? -0.25 : 0) + (((y * 7 + k) % 9) === 0 ? -0.2 : 0) + (h2(px, y >> 2) - 0.5) * 0.1, px + k, y));
    fence.hline(px, px + 4, PB - PH, WOOD[6]); fence.set(px + 1, PB - PH - 1, WOOD[5]); fence.set(px + 2, PB - PH - 1, WOOD[4]);
    for (let k = 0; k < 12; k++) shadowPx(R, px + 2 - Math.round(k * 0.4), PB + 1 + Math.round(k * 0.5));
  }
  for (const ry of [FENCE.rail1, FENCE.rail2]) for (let x = FENCE.x0; x < W; x++) {
    const sag = Math.round(Math.sin(((x - FENCE.x0) / 46) * Math.PI) * 0.8);
    const knot = h2(x >> 2, ry, 5) > 0.9;
    for (let k = 0; k < 4; k++) fence.set(x, ry + Math.max(0, sag) + k, band(WOOD, k === 0 ? 0.78 : k === 3 ? 0.12 : knot ? 0.22 : (((x * 3) % 11) === 0 ? 0.3 : 0.5), x, ry + k));
  }
  // split ends of the rails at the left post
  for (const ry of [FENCE.rail1, FENCE.rail2]) { fence.set(FENCE.x0, ry + 1, WOOD[2]); fence.set(FENCE.x0 + 1, ry + 3, 0); }
  fence.outline(INK, false);
  R.blit(fence, 0, 0);
  for (let x = FENCE.x0 + 2; x < W; x += 2) tuft(R, x, PB + 2, 4 + Math.floor(h2(x, 9) * 3), h2(x, 8) - 0.5);
  // toadstools at the foot of the near post
  for (const [mx, my] of [[FENCE.posts[0] - 4, PB + 1], [FENCE.posts[0] - 7, PB + 2]]) { R.vline(mx, my - 2, my, C('#efe2c6')); R.hline(mx - 1, mx + 1, my - 3, C('#c8392e')); R.set(mx, my - 4, C('#e0524a')); R.set(mx - 1, my - 3, C('#ffffff')); }
  // signpost
  const sign = new Raster(W, H), gx = 206, gb = 302;
  for (let y = gb - 34; y <= gb; y++) for (let k = 0; k < 3; k++) sign.set(gx + k, y, WOOD[[5, 3, 2][k]]);
  const arrow = (y, dir, len, base) => { const x0 = dir > 0 ? gx + 3 : gx - len; for (let j = 0; j < 6; j++) for (let i = 0; i < len; i++) { const d = dir > 0 ? len - 1 - i : i; if (d < 3 && (j < 3 - d - 1 || j > 2 + d)) continue; let t = j === 0 ? 0.85 : j === 5 ? 0.15 : base; if ((j === 2 || j === 3) && i % 3 === 1 && d > 3) t = 0.1; sign.set(x0 + i, y + j, band(WOOD, t, x0 + i, y + j)); } };
  arrow(gb - 32, 1, 20, 0.62); arrow(gb - 24, -1, 17, 0.5);
  sign.outline(INK, false); R.blit(sign, 0, 0);
  for (let k = 0; k < 9; k++) shadowPx(R, gx + 1 + Math.round(k * 0.3), gb + 1 + k);
  tuft(R, gx - 2, gb + 2, 5, -0.3); tuft(R, gx + 4, gb + 2, 4, 0.4);
  // rat burrow
  const bx = BURROW.x, by = BURROW.y;
  R.ellipse(bx, by, 15, 5, (x, y, u, v) => band(DIRT, 0.5 - v * 0.3, x, y));
  R.ellipse(bx + 3, by - 2, 9, 3, (x, y, u, v) => band(DIRT, 0.72 - v * 0.2, x, y));
  R.ellipse(bx - 4, by + 1, 6, 3.2, C('#2a1810')); R.ellipse(bx - 4, by + 1.5, 4, 2, C('#0e0806'));
  for (let i = -16; i <= 16; i += 3) tuft(R, bx + i, by + 5 + (Math.abs(i) < 8 ? 1 : -2), 4, i / 20);
  // scarecrow shadow
  for (let k = 0; k < 20; k++) for (let w = -1; w <= 1; w++) shadowPx(R, SCARECROW.x - Math.round(k * 0.4) + w, SCARECROW.base + 1 + Math.round(k * 0.5), 0.35);
  return R;
}

// ============ SCARECROW (its own sprite so the crow can perch on it) ============
export const SC_W = 56, SC_H = 84, SC_BASE = 80;
export function buildScarecrow() {
  const R = new Raster(SC_W, SC_H), sx = 28, base = SC_BASE, armY = base - 40;
  SCARECROW.armY = SCARECROW.base - 40;
  const COAT = P(['#3a1c1c', '#572a26', '#77392f', '#964b38', '#b46242', '#cf7c52']);
  const STRAW = P(['#8a6424', '#b38c34', '#d9b450', '#f2d777', '#fbeaa8']);
  const HAT = P(['#231c1a', '#3a2f28', '#544436', '#6e5a46', '#8a7458']);
  const SACK = P(['#7a5c38', '#9c7c4c', '#bc9c66', '#d8bc86', '#eedaaa']);
  for (let y = base - 52; y <= base; y++) { R.set(sx, y, WOOD[4]); R.set(sx + 1, y, WOOD[2]); }
  for (let x = sx - 18; x <= sx + 19; x++) { R.set(x, armY, WOOD[4]); R.set(x, armY + 1, WOOD[2]); }
  // coat body + sleeves
  R.poly([[sx - 8, armY - 3], [sx + 9, armY - 3], [sx + 11, armY + 20], [sx - 10, armY + 20]], (x, y) => band(COAT, 0.5 + (x - sx) * 0.03 - (y - armY) * 0.012 + (((x - sx + 30) % 5) === 0 && y > armY + 4 ? -0.15 : 0), x, y));
  for (let x = sx - 17; x <= sx + 18; x++) if (x < sx - 7 || x > sx + 8) for (let j = -3; j <= 2; j++) R.set(x, armY + j, band(COAT, 0.62 - (j + 3) * 0.08 + (Math.abs(x - sx) % 6 === 0 ? -0.18 : 0), x, armY + j));
  // patches, buttons, rope belt
  R.rect(sx + 2, armY + 5, 5, 5, (x, y) => band(P(['#2a3e64', '#3c5a8a', '#5a7eb0', '#86a4d0']), 0.55 - (y - armY - 5) * 0.08, x, y));
  R.rect(sx - 7, armY + 11, 4, 4, (x, y) => band(STRAW, 0.5, x, y));
  for (let j = 0; j < 3; j++) R.set(sx, armY + 2 + j * 4, C('#e8dcc0'));
  R.hline(sx - 9, sx + 10, armY + 14, STRAW[2]); R.set(sx + 4, armY + 15, STRAW[2]); R.set(sx + 4, armY + 16, STRAW[1]);
  // straw tufts at cuffs and hem
  for (let x = sx - 9; x <= sx + 10; x += 2) for (let j = 0; j < 3 + ((x * 7) % 3); j++) R.set(x + (j > 1 ? 1 : 0), armY + 21 + j, STRAW[(j + x) % 4]);
  for (const dir of [-1, 1]) for (let j = -3; j <= 3; j++) for (let k = 0; k < 4; k++) R.set(sx + dir * (18 + k) + (dir < 0 ? 1 : 0), armY + j + (k > 2 ? Math.sign(j) : 0), STRAW[(j + k + 4) % 5]);
  // sack head with stitched grin
  R.ellipse(sx + 0.5, armY - 8, 7, 7, (x, y, u, v) => band(SACK, 0.62 + u * 0.25 - v * 0.2 + (((x + y) % 4) === 0 ? -0.1 : 0), x, y));
  for (const ex of [sx - 2, sx + 3]) { R.set(ex, armY - 9, C('#1e1410')); R.set(ex + 1, armY - 9, C('#1e1410')); R.set(ex, armY - 10, C('#3a2a20')); }
  for (let i = -3; i <= 4; i++) R.set(sx + i, armY - 4 + (Math.abs(i - 0.5) > 2.5 ? -1 : 0), i % 2 ? C('#1e1410') : C('#6a4a30'));
  R.hline(sx - 3, sx + 4, armY - 1, STRAW[2]);
  // floppy hat + feather
  R.ellipse(sx + 0.5, armY - 13, 11, 2.4, (x, y, u, v) => band(HAT, 0.5 - v * 0.35 + u * 0.1, x, y));
  R.poly([[sx - 6, armY - 13], [sx + 7, armY - 13], [sx + 5, armY - 22], [sx - 3, armY - 23]], (x, y) => band(HAT, 0.55 + (x - sx) * 0.03, x, y));
  R.hline(sx - 6, sx + 7, armY - 15, C('#8a2a2a')); R.hline(sx - 6, sx + 7, armY - 16, C('#a83a34'));
  R.line(sx + 6, armY - 16, sx + 11, armY - 25, C('#e9e2cf')); R.set(sx + 10, armY - 23, C('#c9c2b0')); R.set(sx + 11, armY - 26, C('#ffffff'));
  for (let k = -4; k <= 5; k++) { const h = 1 + Math.floor(h2(k, 7) * 3); for (let j = 0; j < h; j++) R.set(sx + k, base - j, G[j ? 6 : 4]); }
  R.outline(INK, false);
  return R;
}
