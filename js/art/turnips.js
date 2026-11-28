// ─────────────────────────────────────────────────────────────
//  Stage 2: "Hedrun's Turnip Fields" — mid-morning Shadowdale farm
//  Cel-shaded procedural pixel art matching meadow.js / village.js craft:
//   · Rolling Dalelands contour meadows (no geometric strip grids), Old Skull crag glimpse,
//     valley stone brook bridge & cottages, golden haystacks & stone windmill
//   · Half-timbered & thatched Farmhouse with protruding gabled front porch wing,
//     lit leaded windows (WINDOWS_S2), rain barrel, woodpile & spare wagon wheel
//   · Stepped dry-stone terrace retaining walls, shingled farm well, scarecrow post,
//     organic hillside turnip plots & winding ochre cart lane
//   · Double-slope gambrel Orchard Barn with overhanging hay-hood pulley & ajar lantern doors
//   · Animated Farmer Hedrun shaking pitchfork on the roof ridge
//   · Flowering country hedgerow, mossy stone-and-rail field wall, timber-rimmed turnip beds,
//     crisp battle footpath, & overturned cart spilling turnips
// ─────────────────────────────────────────────────────────────
import { C, P, Raster, mixC, rnd, h2, clamp, noise2, fbm1, band, canopy, treeSprite, coniferSprite } from './cel.js';
import { PATH_Y, FENCE, LANE, GRASS_Y } from './meadow.js';

export const CHIMNEYS_S2 = [];
export const WINDOWS_S2 = [];
export const HEDRUN_POS = { x: 142, roofY: 165 };
export const S2_MILL = { x: 582, y: 0 };
export const CART_POS = { x: 382, y: 282 };

const INK = C('#1b141a');
const SUN_X = 468;
const lxAt = x => clamp((SUN_X - x) / 180, -1, 1);

const PAL = {
  grass: P(['#284f1f', '#386725', '#4c822b', '#659d34', '#82b73e', '#a1cf4d', '#c3e268', '#e0f090']),
  leaf: P(['#1c391e', '#2a5125', '#3d6d2b', '#548b33', '#70a83b', '#91c248', '#b5d962', '#d6eb80']),
  leafD: P(['#152a18', '#1f3e20', '#2c5526', '#3d702e', '#528b37', '#6da444']),
  soil: P(['#382114', '#4d2f1d', '#643f27', '#7b5033', '#926441', '#ab7b52', '#c4966a']),
  dirt: P(['#4e3322', '#6a4830', '#87603f', '#a37a52', '#be9568', '#d7b282', '#ebd0a0']),
  wood: P(['#23130b', '#3a2214', '#55341e', '#72492b', '#8e623b', '#ad7e4e', '#c99e68']),
  plank: P(['#331e12', '#4c2e1c', '#694228', '#865836', '#a47148', '#c08c5c', '#daa876']),
  barnWood: P(['#361412', '#521e1b', '#702c25', '#8f3c32', '#ad5244', '#c96f5b']),
  plaster: P(['#8f7b68', '#ac967e', '#c8b396', '#dfd0b0', '#f1e5ca', '#faf3e0']),
  shingle: P(['#3a2515', '#58381d', '#794f27', '#9c6a34', '#be8844', '#dca85c']),
  thatch: P(['#472d14', '#69461d', '#8e6128', '#b07e36', '#cf9c46', '#e6ba5e', '#f5d784']),
  stone: P(['#3b3646', '#534c5e', '#6d6578', '#878092', '#a39bac', '#c1b8c5', '#dad2dc']),
  water: P(['#2b5d82', '#3f7da6', '#61a1c4', '#92cae2', '#cdeaf4']),
  turnipP: P(['#3a1744', '#5e2867', '#863e8c', '#ad5ead', '#d284cf']),
  turnipI: P(['#8f816a', '#bbb096', '#dfd4ba', '#f3ead4', '#fffcf0']),
  turnipG: P(['#1e4616', '#316820', '#4c8e2c', '#6ab13a', '#92d252']),
  straw: P(['#78541c', '#a47a2a', '#cf9f3c', '#eed068', '#faf0a4']),
  iron: P(['#1e1e26', '#32323e', '#4c4d5e', '#6c6e82', '#9497aa']),
  glass: P(['#7c4c24', '#b47432', '#df9f44', '#f7c666', '#ffe69a', '#fff7d2']),
  shutter: P(['#1d3b28', '#2c5838', '#3e774a', '#55965d']),
};

function tuft(R, x, y, s, lean = 0, pal = PAL.grass) {
  const n = 3 + Math.floor(s / 2);
  for (let b = 0; b < n; b++) {
    const off = (b - (n - 1) / 2), hgt = Math.round(s * (1 - Math.abs(off) / n * 0.6));
    for (let k = 0; k < hgt; k++) {
      const f = k / hgt, xx = Math.round(x + off * (0.6 + f * 0.9) + lean * f * f * 2);
      R.set(xx, y - k, pal[clamp(Math.round(3 + f * 4), 0, pal.length - 1)]);
    }
  }
}

// Cel-shaded turnip with optional crisp dark micro-outline when loose/spilled
function drawTurnip(R, cx, cy, scale = 1, angle = 0, buried = false, outlined = false) {
  const rx = 2.7 * scale, ry = 2.6 * scale;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const pts = [];
  for (let dy = -Math.ceil(ry + 1); dy <= Math.ceil(ry + 1); dy++) {
    for (let dx = -Math.ceil(rx + 1); dx <= Math.ceil(rx + 1); dx++) {
      if (buried && dy > 0.65 * scale) continue;
      const u0 = (dx * ca + dy * sa) / rx, v0 = (-dx * sa + dy * ca) / ry;
      if (u0 * u0 + v0 * v0 > 1) continue;
      const px = Math.round(cx + dx), py = Math.round(cy + dy);
      const t = clamp(0.64 - v0 * 0.32 + u0 * 0.2);
      pts.push([px, py, v0 < -0.04 ? band(PAL.turnipP, t, px, py, 0.08) : band(PAL.turnipI, t, px, py, 0.08)]);
    }
  }
  if (outlined) {
    for (const [px, py] of pts) {
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!pts.some(p => p[0] === px + ox && p[1] === py + oy)) R.set(px + ox, py + oy, INK);
      }
    }
  }
  for (const [px, py, col] of pts) R.set(px, py, col);
  if (!buried) {
    const tx = Math.round(cx - sa * (ry + 1.4)), ty = Math.round(cy + ca * (ry + 1.4));
    R.set(tx, ty, PAL.turnipI[1]);
  }
  const gx = cx + sa * (ry * 0.8), gy = cy - ca * (ry * 0.8);
  const dirs = [[-0.9, -0.88], [0, -1.2], [0.9, -0.85]];
  for (let i = 0; i < dirs.length; i++) {
    const lx = dirs[i][0] * ca - dirs[i][1] * sa, ly = dirs[i][0] * sa + dirs[i][1] * ca;
    const len = (2.5 + (i === 1 ? 1.2 : 0)) * scale;
    for (let s = 0; s <= len; s += 0.55) {
      const px = Math.round(gx + lx * s), py = Math.round(gy + ly * s);
      R.set(px, py, PAL.turnipG[s > len * 0.55 ? 3 : 2]);
      if (scale >= 0.95 && s > 0.9) R.set(px + (i === 0 ? -1 : 1), py, PAL.turnipG[1]);
    }
  }
}

// ============ SKYLINE PASTURES, OLD SKULL GLIMPSE, VALLEY BROOK & WINDMILL ============
export function buildFarHillsS2(W) {
  const H = 330, R = new Raster(W, H);
  const HAZE = C('#a8cde8');
  const hz = (pal, a) => pal.map(c => mixC(c, HAZE, a));
  const FAR = hz(P(['#487446', '#5c8a4c', '#74a256', '#90ba64', '#b4d678']), 0.34);
  const MID = hz(P(['#31612f', '#447836', '#5b923f', '#76ae48', '#98c85a']), 0.14);
  const BARLEY = hz(P(['#a99a44', '#c9b658', '#e4d274']), 0.24);
  const CLOVER = hz(P(['#3d7834', '#559642', '#74b452']), 0.20);

  // Far hazy Old Skull crag crest with sunlit brow facets (connects back to Stage 1's valley)
  const skCx = 248;
  for (let x = 196; x < 300; x++) {
    const u = (x - skCx) / 50;
    if (Math.abs(u) >= 1) continue;
    const ridgeNoise = (fbm1(x / 10, 7, 3) - 0.5) * 6;
    const top = Math.round(154 + u * u * 35 + ridgeNoise);
    for (let y = top; y < 210; y++) {
      const dx = x - skCx, dy = y - 174;
      const inEye = (((dx + 14) / 8.5) ** 2 + (dy / 5.8) ** 2 < 1) || (((dx - 11) / 8.5) ** 2 + (dy / 5.8) ** 2 < 1);
      const inNose = Math.abs(dx + 1) < 3.5 && dy > 5 && dy < 14;
      const facet = (Math.abs((dx * 2 + dy) % 13) <= 1 ? -0.08 : 0) + (dx > 0 && (y - top) < 6 ? 0.08 : 0);
      let t = 0.56 + (dx > 0 ? 0.14 : -0.1) - (y - top) * 0.011 + facet;
      if (y - top < 2) t += 0.24;
      if (inEye || inNose) t -= 0.36;
      const col = band(hz(P(['#556c8d', '#6e87a8', '#8ba4c2', '#b3cae0', '#d6e6f4']), 0.40), t, x, y);
      R.set(x, y, col);
    }
  }

  // Rolling Dalelands pastures with organic contour meadows + low stone wall contours (no boxy grids!)
  const ridge1 = x => 188 + fbm1(x / 68, 17, 4) * 14 - 22 * Math.exp(-(((x - S2_MILL.x) / 60) ** 2));
  const ridge2 = x => 205 + fbm1(x / 48, 31, 4) * 13;
  const contourLine = x => 214 + Math.sin(x * 0.025) * 4 + fbm1(x / 32, 9, 2) * 4;
  for (let x = 0; x < W; x++) {
    const t1 = Math.round(ridge1(x)), t2 = Math.round(ridge2(x)), cLine = Math.round(contourLine(x));
    for (let y = t1; y < H; y++) {
      const near = y >= t2;
      const top = near ? t2 : t1;
      const slope = (near ? ridge2(x + 2) - ridge2(x - 2) : ridge1(x + 2) - ridge1(x - 2)) * 0.25;
      let t = 0.62 - slope * 0.48 - (y - top) * 0.01;
      const patch = noise2(x / 52, y / 16, near ? 13 : 5);
      let col = band(near ? MID : FAR, t, x, y);
      if (y - top > 3) {
        if (patch > 0.62) col = mixC(col, BARLEY[clamp(Math.floor((patch - 0.62) * 7), 0, 2)], near ? 0.56 : 0.42);
        else if (patch < 0.36) col = mixC(col, CLOVER[clamp(Math.floor(patch * 6), 0, 2)], near ? 0.48 : 0.34);
      }
      // Single organic contour hedgerow / dry-stone field bank curving along the mid hillside
      if (near && Math.abs(y - cLine) <= 1 && (x < 312 || x > 382)) {
        col = y === cLine - 1 ? hz(PAL.stone, 0.32)[4] : MID[0];
      }
      if (y === top) col = mixC(near ? MID[4] : FAR[4], C('#fff4d0'), 0.52);
      R.set(x, y, col);
    }
  }

  // Sunny valley brook & tiny stone arch bridge nestled between hills (x=312..386)
  for (let y = 213; y < 236; y++) {
    const cx = 348 + Math.sin((y - 213) * 0.22) * 8;
    const hw = 4 + (y - 213) * 0.42;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = Math.abs(x - cx) / hw;
      const glint = ((x + y * 3) % 7 === 0) ? 0.25 : 0;
      R.set(x, y, band(hz(PAL.water, 0.2), 0.72 - u * 0.36 + glint, x, y));
    }
  }
  const vx = 342, vy = 211;
  R.rect(vx, vy, 22, 11, (x, y) => band(hz(PAL.plaster, 0.26), 0.62 + (x - vx) * 0.01, x, y));
  R.rect(vx + 4, vy + 3, 4, 4, PAL.glass[3]); R.rect(vx + 13, vy + 3, 4, 4, PAL.glass[3]);
  R.poly([[vx - 3, vy + 1], [vx + 25, vy + 1], [vx + 19, vy - 8], [vx + 3, vy - 8]],
    (x, y) => band(hz(PAL.thatch, 0.22), 0.65 - (y - (vy - 8)) * 0.03, x, y));
  R.rect(vx + 16, vy - 11, 4, 5, hz(PAL.stone, 0.3)[2]); // distant chimney
  // Miniature stone arch bridge crossing the valley brook
  const bxB = 349, byB = 227;
  R.rect(bxB - 9, byB - 2, 19, 3, hz(PAL.stone, 0.26)[4]);
  R.hline(bxB - 9, bxB + 9, byB - 3, hz(PAL.stone, 0.26)[5]);
  R.rect(bxB - 9, byB + 1, 5, 3, hz(PAL.stone, 0.26)[1]);
  R.rect(bxB + 5, byB + 1, 5, 3, hz(PAL.stone, 0.26)[1]);
  R.hline(bxB - 4, bxB + 4, byB + 1, hz(PAL.water, 0.24)[0]);

  // Distant stone-and-oak hill windmill (far right hillock) with stone plinth, timber trim & window
  const mx = S2_MILL.x, mtop = Math.round(ridge1(mx)) - 29;
  S2_MILL.y = mtop + 5;
  const MSTONE = hz(P(['#554d58', '#746a74', '#978d94', '#bcb2b4']), 0.2);
  const MWOOD = hz(P(['#442818', '#684028', '#8d5b3a', '#b17c50']), 0.18);
  R.poly([[mx - 7, mtop], [mx + 7, mtop], [mx + 10, mtop + 31], [mx - 10, mtop + 31]], (x, y) => {
    const u = (x - mx) / 9;
    return (y - mtop) > 13 ? band(MSTONE, 0.54 - u * 0.26, x, y) : band(hz(PAL.plaster, 0.16), 0.62 - u * 0.24, x, y);
  });
  R.hline(mx - 8, mx + 8, mtop + 13, MWOOD[1]);
  R.rect(mx - 2, mtop + 19, 4, 9, MWOOD[0]);
  R.rect(mx - 2, mtop + 6, 3, 4, PAL.glass[3]);
  R.poly([[mx - 9, mtop + 1], [mx + 9, mtop + 1], [mx, mtop - 9]], (x, y) => band(MWOOD, 0.55 - (x - mx) * 0.05, x, y));

  // Distant golden haystacks across the sunny upper meadow with softer south-left ground shadows
  for (const [hx, hy] of [[246, 211], [268, 213], [430, 209]]) {
    R.ellipse(hx - 2, hy + 4.5, 8, 2.2, mixC(MID[0], C('#1c2a1a'), 0.36));
    R.poly([[hx - 6, hy + 4], [hx + 6, hy + 4], [hx + 4, hy - 3], [hx, hy - 6], [hx - 4, hy - 3]],
      (x, y) => band(PAL.straw, 0.58 - (x - hx) * 0.06 - (y - hy) * 0.04, x, y));
  }

  // Sunlit hedgerow tree-lines across the pasture (open center valley vista)
  const PINE = P(['#18361c', '#244a24', '#33622c', '#487e34', '#639b40']);
  const LEAF = P(['#214a22', '#326628', '#46822e', '#62a036', '#82be42', '#aad65a']);
  const rows = [
    { y: 218, s: 13, haze: 0.28, n: 108, ink: C('#456146') },
    { y: 236, s: 18, haze: 0.14, n: 74, ink: C('#2b472c') },
    { y: 256, s: 24, haze: 0.05, n: 46, ink: C('#1a301d') },
  ];
  const r = rnd(19);
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const x = Math.round((i + r() * 0.8) * (W + 30) / row.n) - 15;
      if (x > 214 && x < 428 && r() > 0.15) continue;
      const s = row.s * (0.78 + r() * 0.45), y = row.y + (r() - 0.5) * 5;
      const con = r() > 0.72;
      const lx = lxAt(x) * 0.4 + 0.35;
      const sp = con
        ? coniferSprite({ w: Math.round(s * 0.62) | 1, h: Math.round(s * 1.2), pal: hz(PINE, row.haze), seed: i * 9 + ri, lx, ink: row.ink })
        : treeSprite({ w: Math.round(s * 1.05), h: Math.round(s * 1.12), pal: hz(LEAF, row.haze), bark: hz(PAL.wood, row.haze), seed: i * 13 + ri, lx, ink: row.ink, puff: Math.max(3, s * 0.22), stray: 0 });
      R.blit(sp, Math.round(x - sp.w / 2), Math.round(y - sp.h));
    }
    for (let x = 0; x < W; x++) for (let y = row.y; y < row.y + 28; y++) {
      if (!R.has(x, y)) R.set(x, y, hz(LEAF, row.haze)[1 + ((x + y) & 1)]);
    }
  });
  return R;
}

export function drawMillSailsS2(ctx, ox, oy, t) {
  const cx = S2_MILL.x + ox, cy = S2_MILL.y + oy, a0 = t * 0.65;
  for (let k = 0; k < 4; k++) {
    const a = a0 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 1; s < 17; s++) {
      const x = Math.round(cx + ca * s), y = Math.round(cy + sa * s);
      ctx.fillStyle = '#4e3c36'; ctx.fillRect(x, y, 1, 1);
      if (s > 3) {
        ctx.fillStyle = s % 3 ? '#f6efe2' : '#d2c2b2';
        ctx.fillRect(Math.round(x - sa), Math.round(y + ca), 1, 1);
        ctx.fillRect(Math.round(x - sa * 2), Math.round(y + ca * 2), 1, 1);
      }
    }
  }
  ctx.fillStyle = '#3a2a24'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

// ============ STAGE 1-CRAFT BUILDING PRIMITIVES ============
function stoneBlock(R, x0, y0, w, h, o = {}) {
  const pal = o.pal || PAL.stone, rh = o.rh || 5, lx = o.lx ?? 0.4, r = rnd(o.seed || 7);
  for (let row = 0; row * rh < h; row++) {
    let x = x0 - Math.floor(r() * 7);
    while (x < x0 + w) {
      const sw = (o.sw || 9) + Math.floor(r() * 5) - 2, v = (r() - 0.5) * 0.22;
      for (let j = 0; j < rh; j++) for (let i = 0; i < sw; i++) {
        const px = x + i, py = y0 + row * rh + j;
        if (px < x0 || px >= x0 + w || py >= y0 + h) continue;
        let t = (o.light ? o.light(px, py) : 0.52) + v;
        if (i === sw - 1 || j === rh - 1) { R.set(px, py, pal[0]); continue; }
        if (j === 0) t += 0.2; else if (j === rh - 2) t -= 0.16;
        if (i === 0) t += 0.08 * Math.sign(-lx + 0.01);
        if (i === sw - 2) t += 0.08 * Math.sign(lx);
        R.set(px, py, band(pal, t, px, py));
      }
      if (r() > 0.72) {
        const mx = x + 2 + Math.floor(r() * Math.max(1, sw - 4)), my = y0 + row * rh + 1 + Math.floor(r() * Math.max(1, rh - 2));
        if (mx < x0 + w && my < y0 + h) R.set(mx, my, r() > 0.45 ? C('#789448') : C('#b8a86a'));
      }
      x += sw;
    }
  }
}

function halfTimber(R, x0, y0, w, h, o = {}) {
  const lx = o.lx ?? 0.4, tp = PAL.wood;
  R.rect(x0, y0, w, h, (x, y) => band(PAL.plaster, 0.64 + (x - x0) / Math.max(1, w) * lx * 0.18 + (noise2(x / 8, y / 8, 3) - 0.5) * 0.12, x, y, 0.08));
  const beam = (xa, ya, xb, yb, wd = 3) => R.line(xa, ya, xb, yb, (x, y) => band(tp, 0.46 + ((x + y) % 5 === 0 ? -0.18 : 0), x, y), wd);
  for (const px of o.posts) beam(px, y0, px, y0 + h - 1);
  beam(x0, y0 + 1, x0 + w - 1, y0 + 1);
  if (o.rail) beam(x0, o.rail, x0 + w - 1, o.rail);
  beam(x0, y0 + h - 2, x0 + w - 1, y0 + h - 2);
  for (const [a, b, c2, d] of (o.braces || [])) beam(a, b, c2, d, 2);
}

function thatchRoof(R, x0, x1, eaveY, ridgeY, inset, o = {}) {
  const pal = o.pal || PAL.thatch, lx = o.lx ?? 0.4, H = eaveY - ridgeY;
  const left = f => x0 + inset * (1 - Math.pow(f, 0.55)), right = f => x1 - inset * (1 - Math.pow(f, 0.55));
  for (let y = ridgeY; y <= eaveY + 2; y++) {
    const f = clamp((y - ridgeY) / H);
    const xl = Math.round(left(f)), xr = Math.round(right(f));
    for (let x = xl; x <= xr; x++) {
      const hip = Math.min(1, (x - xl) / Math.max(1, inset), (xr - x) / Math.max(1, inset));
      let t = 0.56 - f * 0.12;
      if (hip < 1) t += (x - xl < xr - x ? -lx : lx) * (1 - hip) * 0.35;
      const yy = y - ridgeY, CH = 7;
      const course = Math.floor(yy / CH);
      const sc = Math.abs(Math.sin((x + course * 5) * Math.PI / 11)) * 2.1;
      const inC = (yy + sc) % CH;
      if (inC < 1.6) t += 0.2; else if (inC > CH - 1.4) t -= 0.26; else if (inC > CH - 2.6) t -= 0.1;
      if (((x * 5 + course * 3) % 10) < 1 && inC > 1.6 && inC < CH - 2.6) t -= 0.1;
      const dE = eaveY - y;
      if (dE < 5) t = dE < 0 ? 0.1 : dE < 2 ? 0.28 : 0.76;
      if (y - ridgeY < 6 && hip >= 1) t = 0.66 + (((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) ? -0.26 : 0) - (y - ridgeY === 5 ? 0.28 : 0);
      R.set(x, y, band(pal, t, x, y, 0.09));
    }
  }
}

function eyebrowDormer(R, cx, baseY, w, lx = 0.4) {
  const h = Math.round(w * 0.5);
  for (let y = baseY - h - 4; y <= baseY; y++) for (let x = cx - w / 2 - 4; x <= cx + w / 2 + 4; x++) {
    const u = (x - cx) / (w / 2 + 4), v = (baseY - y) / (h + 4);
    if (u * u + v * v > 1) continue;
    const rr = Math.sqrt(u * u + v * v);
    let t = 0.52 + v * 0.24 + u * lx * 0.2;
    if (rr > 0.86) t = 0.78; if (rr > 0.94) t = 0.28;
    if ((Math.round(Math.atan2(v, u) * 22)) % 3 === 0 && rr < 0.86) t -= 0.12;
    R.set(Math.round(x), y, band(PAL.thatch, t, x, y));
  }
  const wx = Math.round(cx - w / 4), wy = baseY - Math.round(h * 0.85), ww = Math.round(w / 2), wh = Math.round(h * 0.8);
  WINDOWS_S2.push({ x: wx, y: wy, w: ww, h: wh });
  R.rect(wx - 1, wy - 1, ww + 2, wh + 2, PAL.wood[0]);
  R.rect(wx, wy, ww, wh, (x, y) => {
    const mull = x === wx + Math.floor(ww / 2) || y === wy + Math.floor(wh / 2);
    return mull ? PAL.wood[1] : band(PAL.glass, 0.86 - (y - wy) / Math.max(1, wh) * 0.42, x, y, 0.05);
  });
  R.hline(Math.round(cx - w / 2 - 2), Math.round(cx + w / 2 + 2), baseY + 1, PAL.thatch[1]);
}

function verticalBarnBoards(R, x0, y0, w, h, lx = -0.3, pal = PAL.barnWood) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const col = Math.floor((x - x0) / 5), pj = (x - x0) % 5;
      let t = 0.48 + (x - x0) / Math.max(1, w) * lx * 0.2 + (h2(col, Math.floor(y / 14), 11) - 0.5) * 0.15;
      if (pj === 0) t += 0.14;
      else if (pj === 4) t -= 0.24;
      R.set(x, y, band(pal, t, x, y, 0.08));
    }
  }
}

// ============ FARMHOUSE, TERRACES, SHINGLED WELL & GAMBREL ORCHARD BARN ============
export function buildFarmhouseS2(W) {
  CHIMNEYS_S2.length = 0;
  WINDOWS_S2.length = 0;
  const H = 300, VG = 274;
  const R = new Raster(W, H);
  const RIMC = C('#ffe0a2');
  const rimLight = S => {
    const src = S.d.slice();
    const has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!src[y * W + x]) continue;
      const dx = x < SUN_X ? 1 : -1, near = Math.abs(x - SUN_X) < 340;
      if (!near) continue;
      const k = 1 - Math.abs(x - SUN_X) / 340;
      if (!has(x, y - 1) || !has(x + dx, y)) S.set(x, y, mixC(src[y * W + x], RIMC, 0.3 + 0.3 * k));
      else if (!has(x + dx * 2, y) || !has(x, y - 2)) S.set(x, y, mixC(src[y * W + x], RIMC, 0.12 * k));
    }
  };
  const put = (draw, ink = INK) => {
    const S = new Raster(W, H);
    draw(S);
    rimLight(S);
    S.outline(ink, false);
    R.blit(S, 0, 0);
  };

  // --- ROLLING SUNLIT DALELANDS PASTURE KNOLL & STEPPED STONE-TERRACED PLOTS (x = 188..474) ---
  const hillTop = x => 229 + Math.sin((x - 190) * 0.022) * 5 + fbm1(x / 40, 15, 3) * 5;
  for (let x = 188; x < 474; x++) {
    const yStart = Math.round(hillTop(x));
    const slope = (hillTop(x + 2) - hillTop(x - 2)) * 0.25;
    for (let y = yStart; y < VG + 8; y++) {
      const dap = noise2(x / 24, y / 10, 4);
      let t = 0.54 - slope * 0.4 + (dap - 0.5) * 0.26 - (y - yStart) * 0.002;
      if (y - yStart < 2) t += 0.14;
      R.set(x, y, band(PAL.grass, t, x, y, 0.08));
    }
  }
  // Clover & wildflower clusters across hillside grass
  for (let x = 196; x < 462; x += 4) {
    const yt = Math.round(hillTop(x));
    if (h2(x >> 2, 11) > 0.35) tuft(R, x, yt + 3, 2 + Math.floor(h2(x, 12) * 3), 0.2);
    if (h2(x, 41) > 0.68) {
      const fy = yt + 4 + Math.floor(h2(x, 42) * 28);
      if (fy < VG) R.set(x, fy, h2(x, 43) > 0.6 ? C('#fff4d0') : h2(x, 44) > 0.4 ? C('#f2ce4a') : C('#e85a4a'));
    }
  }
  // Rustic split-rail fence hugging pasture ridge
  for (let x = 216; x < 450; x++) {
    const yt = Math.round(hillTop(x));
    if (Math.abs(x - 362) < 9) continue;
    R.set(x, yt - 2, PAL.wood[4]); R.set(x, yt - 1, PAL.wood[2]);
    if (x % 22 === 0) R.rect(x, yt - 5, 2, 7, PAL.wood[3]);
  }
  // Mossy dry-stone terrace retaining walls beneath both hillside turnip terraces
  for (const [wx0, wx1, wy] of [[224, 330, 268], [398, 446, 269]]) {
    stoneBlock(R, wx0, wy, wx1 - wx0, 6, { rh: 3, sw: 6, lx: 0.35, seed: wx0 });
    for (let x = wx0; x < wx1; x += 3) if (h2(x, wy, 7) > 0.45) R.set(x, wy, PAL.grass[5]);
  }
  // Two soft organic hillside turnip plots nested inside stone-trimmed terraces
  const hillPlots = [[224, 332, 239, 269], [396, 448, 243, 269]];
  for (const [px0, px1, py0, py1] of hillPlots) {
    const mx = (px0 + px1) / 2, my = (py0 + py1) / 2, rx = (px1 - px0) / 2, ry = (py1 - py0) / 2;
    const inside = (x, y) => {
      const dx = Math.abs(x - mx) / rx, dy = Math.abs(y - my) / ry;
      return dx ** 4 + dy ** 4 <= 0.94 + (noise2(x / 16, y / 10, 7) - 0.5) * 0.08;
    };
    for (let x = px0; x <= px1; x++) for (let y = py0; y <= py1; y++) {
      if (!inside(x, y)) continue;
      const inR = ((y - py0 + Math.sin(x * 0.04) * 1.4) % 5.5 + 5.5) % 5.5;
      let t = 0.5 + Math.sin((inR / 5.5) * Math.PI * 2) * 0.24 + (noise2(x / 14, y / 5, 8) - 0.5) * 0.14;
      if (!inside(x, y - 1) || !inside(x, y + 1)) t = 0.24;
      R.set(x, y, band(PAL.soil, t, x, y, 0.07));
    }
    for (let ry2 = py0 + 3; ry2 < py1 - 3; ry2 += 6) {
      for (let x = px0 + 8 + ((ry2 >> 1) & 1) * 4; x < px1 - 6; x += 9) {
        const py = Math.round(ry2 - Math.sin(x * 0.04) * 1.2);
        if (!inside(x, py - 1) || !inside(x, py + 2) || h2(x, ry2, 23) > 0.84) continue;
        drawTurnip(R, x, py, 0.64, 0, true, false);
      }
    }
  }
  // Winding sunny ochre farm cart-track descending hillside
  for (let y = 229; y < VG + 8; y++) {
    const cx = 376 - (VG - y) * 0.36 + Math.sin(y / 6) * 1.5;
    const hw = 3.5 + (y - 228) * 0.14;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const dx = (x - cx) / hw;
      let t = 0.58 + dx * 0.12 + (h2(x, y, 3) - 0.5) * 0.12;
      if (Math.abs(dx) > 0.82) t -= 0.2;
      R.set(x, y, band(PAL.dirt, t, x, y, 0.06));
    }
  }

  // Hillside props: south-left morning shadows + miniature wooden crow-scarer & shingled stone farm well
  R.ellipse(247, 243, 6, 2.2, C('#182414', 84));
  R.ellipse(338, 265, 11, 3.2, C('#182414', 94));
  put(S => {
    // Upper garden crow-scarer (x=250, y=242)
    const sx = 250, sy = 242;
    S.vline(sx, sy - 14, sy, PAL.wood[3]);
    S.hline(sx - 6, sx + 6, sy - 10, PAL.wood[4]);
    S.rect(sx - 2, sy - 11, 5, 6, C('#9c3b2c'));
    S.ellipse(sx, sy - 13, 2, 2, PAL.straw[2]);
    S.hline(sx - 4, sx + 4, sy - 15, PAL.straw[3]);

    // Shingled stone farm well beside the cart lane (x=344, y=262)
    const wx = 342, wy = 264;
    stoneBlock(S, wx - 8, wy - 7, 17, 9, { rh: 3, sw: 5, lx: 0.4, seed: 39 });
    S.rect(wx - 6, wy - 18, 2, 11, PAL.wood[3]);
    S.rect(wx + 5, wy - 18, 2, 11, PAL.wood[2]);
    S.hline(wx - 5, wx + 5, wy - 14, PAL.wood[4]);
    S.vline(wx, wy - 14, wy - 9, PAL.straw[2]);
    S.rect(wx - 2, wy - 9, 4, 3, PAL.wood[5]);
    for (let y = wy - 25; y <= wy - 17; y++) {
      const hw = Math.round(((y - (wy - 25)) / 8) * 10 + 1);
      for (let x = wx - hw; x <= wx + hw; x++) S.set(x, y, band(PAL.shingle, 0.55 - (x - wx) * 0.04, x, y));
    }
  });

  // --- SUNLIT FARMSTEAD TREES & BLOOMING APPLE ORCHARD TREES ---
  R.ellipse(34, VG + 1, 24, 4, C('#132214', 82));
  R.ellipse(234, VG + 1, 16, 3, C('#132214', 76));
  R.ellipse(448, VG + 1, 14, 3, C('#132214', 76));
  R.ellipse(618, VG + 1, 22, 4, C('#132214', 82));
  put(S => {
    const tL = treeSprite({ w: 98, h: 132, pal: PAL.leaf, bark: PAL.wood, seed: 31, lx: 0.6, ink: null, puff: 10, stray: 0, spread: 0.72 });
    S.blit(tL, -8, VG - 132);
    const tM = treeSprite({ w: 72, h: 98, pal: PAL.leafD, bark: PAL.wood, seed: 47, lx: 0.4, ink: null, puff: 8, stray: 0 });
    S.blit(tM, 204, VG - 98);
    // blooming apple tree bridging pasture & orchard barn left wall cleanly
    const tB = treeSprite({ w: 64, h: 88, pal: PAL.leafD, bark: PAL.wood, seed: 53, lx: 0.35, ink: null, puff: 7, stray: 0 });
    S.blit(tB, 422, VG - 88);
    for (const [ax, ay] of [[22, 184], [35, 192], [52, 180], [60, 196], [44, 204], [28, 210], [444, 216], [456, 224], [436, 228], [450, 234]]) {
      S.set(ax, ay, C('#d83a32')); S.set(ax + 1, ay, C('#ff6a52')); S.set(ax, ay + 1, C('#981e1a'));
    }
    const tR = treeSprite({ w: 96, h: 126, pal: PAL.leaf, bark: PAL.wood, seed: 65, lx: -0.3, ink: null, puff: 9, stray: 0 });
    S.blit(tR, 586, VG - 126);
    for (const [ax, ay] of [[604, 188], [616, 196], [626, 184], [610, 206]]) {
      S.set(ax, ay, C('#d83a32')); S.set(ax + 1, ay, C('#ff6a52')); S.set(ax, ay + 1, C('#981e1a'));
    }
  }, C('#132414'));

  // Ground contact shadow beneath Orchard Barn
  R.ellipse(503, VG + 2, 54, 4.5, C('#120c12', 92));

  // --- RIGHT-SIDE DOUBLE-SLOPE GAMBREL ORCHARD BARN (x = 456..556) ---
  put(S => {
    const bx = 456, bw = 100, wt = 220, midY = 196, pk = 175;
    const lx = lxAt(bx + bw / 2);
    const bcy = bx + bw / 2;
    stoneBlock(S, bx, VG - 12, bw, 12, { rh: 4, sw: 8, lx, seed: 21, light: () => 0.48 });
    verticalBarnBoards(S, bx, wt, bw, VG - 12 - wt, lx);
    for (const px of [bx, bx + 23, bx + 73, bx + bw - 4]) {
      S.rect(px, wt, 4, VG - 12 - wt, (x, y) => band(PAL.wood, 0.46 + (x - px) * 0.08, x, y));
    }
    S.rect(bx, wt, bw, 3, PAL.wood[2]);
    for (let x = bx; x < bx + bw; x++) for (let j = 0; j < 4; j++) {
      S.set(x, wt + 3 + j, mixC(S.get(x, wt + 3 + j), C('#2a1216'), 0.48 - j * 0.1));
    }

    // Double cross-braced barn doors — left leaf cracked ajar showing cozy golden hay & lantern light!
    const dx = bx + 28, dw = 44, dy = VG - 40;
    S.rect(dx - 1, dy - 1, dw + 2, 41, PAL.wood[1]);
    // Interior lantern glow behind left ajar opening
    S.rect(dx + 1, dy + 1, 14, 39, '#23130b');
    S.rect(dx + 3, dy + 22, 10, 17, (x, y) => band(PAL.straw, 0.52 - (y - dy - 22) * 0.02, x, y));
    S.rect(dx + 7, dy + 7, 3, 5, PAL.glass[4]);
    WINDOWS_S2.push({ x: dx + 6, y: dy + 6, w: 6, h: 7 });
    // Left ajar leaf (angled slightly open) + Right closed cross-braced leaf
    S.rect(dx + 14, dy, 9, 40, (x, y) => band(PAL.wood, 0.42 + ((x - dx) % 3 === 0 ? -0.15 : 0.08), x, y));
    S.rect(dx + 23, dy, 21, 40, (x, y) => band(PAL.wood, 0.5 + ((x - dx) % 4 === 0 ? -0.16 : 0.06), x, y));
    S.line(dx + 24, dy + 1, dx + 42, VG - 2, PAL.wood[4], 2);
    S.line(dx + 42, dy + 1, dx + 24, VG - 2, PAL.wood[4], 2);
    for (const hy of [dy + 7, VG - 11]) {
      S.hline(dx + dw - 9, dx + dw - 2, hy, PAL.iron[1]);
    }
    S.set(dx + 25, dy + 20, C('#e2b858'));

    // Gambrel gable wall boards + loft doorway + overhanging hay-hood pulley beam
    const gambrelHalfW = y => y < midY
      ? 24 * ((y - pk) / (midY - pk))
      : 24 + (bw / 2 - 24) * ((y - midY) / (wt - midY));
    for (let y = pk + 4; y < wt; y++) {
      const gh = Math.round(gambrelHalfW(y));
      verticalBarnBoards(S, bcy - gh, y, gh * 2, 1, lx);
    }
    S.rect(bcy - 9, pk + 17, 18, 16, PAL.wood[0]);
    S.rect(bcy - 7, pk + 19, 14, 14, PAL.straw[2]);
    for (let sx = bcy - 6; sx <= bcy + 6; sx += 2) S.vline(sx, pk + 30, pk + 34 + (sx % 3), PAL.straw[4]);
    WINDOWS_S2.push({ x: bcy - 6, y: pk + 19, w: 12, h: 12, far: true });

    // Wood-shingle double-slope gambrel roof + projecting central hay-hood peak
    for (let y = pk - 4; y <= wt + 4; y++) {
      const ew = y < midY
        ? Math.round(clamp((y - (pk - 4)) / (midY - (pk - 4))) * 30)
        : Math.round(30 + clamp((y - midY) / (wt + 4 - midY)) * (bw / 2 + 11 - 30));
      for (let x = bcy - ew; x <= bcy + ew; x++) {
        const yy = y - (pk - 4), row = Math.floor(yy / 4), inR = yy % 4;
        let t = 0.56 + (x < bcy ? 0.16 : -0.14) + (inR === 0 ? 0.15 : inR === 3 ? -0.22 : 0);
        if ((x + row * 3) % 5 === 0) t -= 0.14;
        S.set(x, y, band(PAL.shingle, t, x, y, 0.08));
      }
    }
    // Crisp gambrel bargeboard trim + hay-hood hoist beam & dangling iron hook
    S.line(bcy, pk - 4, bcy - 30, midY, PAL.wood[5], 2);
    S.line(bcy - 30, midY, bx - 11, wt + 4, PAL.wood[5], 2);
    S.line(bcy, pk - 4, bcy + 30, midY, PAL.wood[4], 2);
    S.line(bcy + 30, midY, bx + bw + 11, wt + 4, PAL.wood[4], 2);
    S.rect(bcy - 2, pk + 5, 4, 8, PAL.wood[4]);
    S.vline(bcy, pk + 12, pk + 16, PAL.straw[3]);
    S.set(bcy, pk + 16, PAL.iron[3]);

    // Haystack with upright pitchfork + brass milk churn + rain barrel
    S.ellipse(bx + 12, VG - 7, 8, 6.5, (x, y, u, v) => band(PAL.straw, 0.54 - v * 0.25 + ((x + y) % 4 === 0 ? -0.14 : 0.08), x, y));
    S.line(bx + 6, VG - 21, bx + 11, VG - 8, PAL.wood[4], 1);
    S.hline(bx + 10, bx + 13, VG - 8, PAL.iron[3]);
    S.rect(bx + 20, VG - 10, 4, 9, PAL.iron[3]);
    S.hline(bx + 20, bx + 23, VG - 11, PAL.iron[4]);
    S.ellipse(bx + bw - 9, VG - 6, 4.5, 6, (x, y, u) => band(PAL.wood, 0.48 - u * 0.28, x, y));
    S.hline(bx + bw - 13, bx + bw - 5, VG - 9, PAL.iron[2]);
    S.hline(bx + bw - 13, bx + bw - 5, VG - 4, PAL.iron[2]);
  });

  // Warm lantern light trapezoid spilling from ajar left barn door onto the farmyard dirt
  for (let y = VG; y < VG + 6; y++) {
    const spread = y - VG;
    for (let x = 482 - spread * 2; x <= 499 + spread; x++) {
      const a = clamp(0.32 - spread * 0.05);
      R.set(x, y, mixC(R.get(x, y) || C('#4e3322'), PAL.glass[4], a));
    }
  }

  // --- HEDRUN'S STONE & HALF-TIMBERED THATCHED FARMHOUSE (x = 76..204, ridgeY = 162 for Hedrun!) ---
  R.ellipse(134, VG + 2, 72, 5, C('#120c12', 90));
  R.ellipse(213, VG + 2, 14, 3, C('#120c12', 78));
  put(S => {
    const x0 = 76, x1 = 204, wt = 206, ridgeY = 162;
    const lx = lxAt(140);
    const cx = Math.round((x0 + x1) / 2);

    // Rugged stone masonry base + left timber-and-stone cellar annex/woodpile
    stoneBlock(S, x0, VG - 22, x1 - x0, 22, { rh: 5, sw: 9, lx, seed: 13, light: x => 0.46 + (x - x0) / (x1 - x0) * lx * 0.25 });
    halfTimber(S, x0, wt, x1 - x0, VG - 22 - wt, {
      lx,
      posts: [x0 + 1, x0 + 44, x1 - 45, x1 - 2],
      rail: wt + 24,
      braces: [[x0 + 2, wt + 22, x0 + 42, wt + 3], [x1 - 43, wt + 3, x1 - 3, wt + 22]],
    });
    for (let x = x0; x < x1; x++) for (let j = 0; j < 4; j++) {
      S.set(x, wt + 2 + j, mixC(S.get(x, wt + 2 + j), C('#382028'), 0.5 - j * 0.1));
    }

    // Stone chimney rising up left hipped slope (spawns smoke via CHIMNEYS_S2)
    const chx = x0 + 11, chtop = 148;
    stoneBlock(S, chx, chtop + 4, 13, 28, { rh: 4, sw: 5, lx, seed: 19, light: px => 0.5 + ((px - chx) / 13 - 0.5) * 0.4 });
    S.rect(chx - 2, chtop, 17, 4, (x, y) => band(PAL.stone, y === chtop ? 0.88 : y === chtop + 3 ? 0.2 : 0.56, x, y));
    S.rect(chx + 2, chtop - 2, 3, 2, C('#7a4030'));
    S.rect(chx + 8, chtop - 2, 3, 2, C('#7a4030'));
    CHIMNEYS_S2.push({ x: chx + 6, y: chtop - 3, magic: false });

    // Warm glowing leaded cottage windows with emerald shutters & flower boxes
    for (const [wx, wy, ww, wh] of [[x0 + 14, wt + 10, 16, 14], [x1 - 30, wt + 10, 16, 14]]) {
      WINDOWS_S2.push({ x: wx, y: wy, w: ww, h: wh });
      S.rect(wx - 5, wy, 4, wh, (x, y) => band(PAL.shutter, 0.55 + ((y - wy) % 4 === 0 ? -0.15 : 0.1), x, y));
      S.rect(wx + ww + 1, wy, 4, wh, (x, y) => band(PAL.shutter, 0.55 + ((y - wy) % 4 === 0 ? -0.15 : 0.1), x, y));
      S.rect(wx - 1, wy - 1, ww + 2, wh + 2, PAL.wood[0]);
      S.rect(wx, wy, ww, wh, (x, y) => {
        const mull = x === wx + Math.floor(ww / 2) || y === wy + Math.floor(wh / 2);
        const lead = !mull && (((x - wx) + (y - wy)) % 4 === 0);
        return mull ? PAL.wood[1] : lead ? band(PAL.glass, 0.45, x, y) : band(PAL.glass, 0.9 - (y - wy) / wh * 0.45, x, y, 0.05);
      });
      S.rect(wx - 2, wy + wh, ww + 4, 3, PAL.wood[4]);
      for (let fx = wx; fx < wx + ww; fx += 3) {
        S.set(fx, wy + wh - 1, PAL.grass[4]);
        S.set(fx + 1, wy + wh - 2, (fx & 1) ? C('#e85046') : C('#f4d258'));
      }
    }

    // Lush golden hipped thatched roof + eyebrow dormer
    thatchRoof(S, x0 - 12, x1 + 12, wt + 4, ridgeY, 24, { lx });
    eyebrowDormer(S, cx + 26, wt - 10, 22, lx);

    // Protruding Gabled Front Porch Wing (Stage 1 gableWing architecture!) over central arched oak door
    const pcx = cx, phw = 18, pApex = 212, pEave = 230;
    const pSlope = phw / (pEave - pApex);
    for (let y = pApex + 4; y <= VG; y++) {
      const hw = Math.min(phw - 3, (y - pApex - 4) * pSlope);
      for (let x = Math.round(pcx - hw); x <= Math.round(pcx + hw); x++) {
        S.set(x, y, band(PAL.plaster, 0.64 + ((x - pcx) / phw) * lx * 0.14, x, y, 0.08));
      }
    }
    S.line(pcx - phw + 3, pEave, pcx + phw - 3, pEave, PAL.wood[2], 2);
    S.line(pcx, pApex + 4, pcx, pEave, PAL.wood[2], 2);
    S.line(pcx - phw + 3, pEave, pcx - phw + 3, VG, PAL.wood[2], 3);
    S.line(pcx + phw - 3, pEave, pcx + phw - 3, VG, PAL.wood[2], 3);
    // Draped thatch front gable hood
    for (let i = 0; i <= phw + 3; i++) {
      const yTop = Math.round(pApex - 3 + (i / phw) * (pEave - pApex));
      for (let t = 0; t < 8; t++) {
        const yy = yTop + t;
        const cVal = 0.64 - t * 0.06;
        S.set(pcx - i, yy, band(PAL.thatch, cVal + 0.08, pcx - i, yy));
        S.set(pcx + i, yy, band(PAL.thatch, cVal - 0.12, pcx + i, yy));
      }
    }
    // Arched oak plank cottage door inside porch + stone steps + warm lantern
    const dx = cx - 8, dw = 16, dh = 32, dy = VG - dh;
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) {
      const px = dx + i, py = dy + j, r = dw / 2;
      if (j < r && ((i + 0.5 - r) / r) ** 2 + ((j + 0.5 - r) / r) ** 2 > 1) continue;
      if (j === Math.floor(dh * 0.32) || j === Math.floor(dh * 0.74)) { S.set(px, py, PAL.iron[1]); continue; }
      S.set(px, py, band(PAL.wood, 0.48 + (i % 4 === 0 ? -0.22 : 0.08), px, py));
    }
    S.set(dx + dw - 4, dy + 18, C('#e2b858'));
    S.rect(dx - 3, VG - 2, dw + 6, 2, PAL.stone[4]);
    S.rect(dx + dw + 2, VG - 31, 3, 5, C('#ffd46e')); S.set(dx + dw + 3, VG - 32, PAL.iron[1]);
    WINDOWS_S2.push({ x: dx + dw + 1, y: VG - 32, w: 5, h: 6, far: true });

    // Climbing ivy + spare leaning wooden cartwheel + stacked firewood along left wall
    for (let k = 0; k < 24; k++) {
      const ix = x0 + 3 + Math.round(Math.sin(k * 0.55) * 3.5 + k * 0.22);
      const iy = VG - 5 - k * 2.4;
      S.ellipse(ix, iy, 2.2, 1.7, PAL.leaf[2 + (k % 3)]);
    }
    for (let wx = x0 + 5; wx < x0 + 22; wx += 4) for (let wy = VG - 9; wy < VG - 1; wy += 4) {
      S.ellipse(wx, wy, 2, 1.8, PAL.wood[3 + ((wx + wy) & 1)]);
    }
    // Rain barrel + spare wagon wheel on left gable
    S.ellipse(x0 - 4, VG - 7, 4, 6, (x, y, u) => band(PAL.wood, 0.48 - u * 0.22, x, y));
    S.hline(x0 - 7, x0 - 1, VG - 9, PAL.iron[2]);
    for (let a = 0; a < Math.PI * 2; a += 0.1) S.set(Math.round(x0 + 34 + Math.cos(a) * 6), Math.round(VG - 7 + Math.sin(a) * 6), PAL.wood[4]);

    // Lean-to wooden side porch on right wall with turnip crates + firmly grounded wooden ladder
    S.rect(x1, VG - 29, 23, 4, PAL.shingle[3]);
    S.rect(x1 + 18, VG - 25, 3, 25, PAL.wood[3]);
    for (const [bx, by] of [[x1 + 2, VG - 12], [x1 + 11, VG - 10]]) {
      S.rect(bx, by, 9, VG - by, (x, y) => band(PAL.plank, (y - by) % 3 === 0 ? 0.25 : 0.65, x, y));
      drawTurnip(S, bx + 2, by - 1, 0.75, -0.2, false, false);
      drawTurnip(S, bx + 6, by - 1, 0.75, 0.25, false, false);
    }
    S.line(x1 + 10, wt + 4, x1 + 2, VG, PAL.wood[4], 2);
    S.line(x1 + 16, wt + 4, x1 + 8, VG, PAL.wood[3], 2);
    for (let ly = wt + 9; ly < VG - 3; ly += 6) {
      const f = (ly - (wt + 4)) / (VG - (wt + 4));
      const lx0 = Math.round(x1 + 10 - f * 8);
      S.hline(lx0, lx0 + 6, ly, PAL.wood[5]);
    }
  });
  // Warm porch lantern puddle below cottage threshold
  R.ellipse(156, VG + 1, 7, 2.2, mixC(C('#6a4830'), PAL.glass[4], 0.42));

  return R;
}

// ============ FARMER HEDRUN (4-frame animated sprite shaking 3-prong pitchfork!) ============
export function buildHedrunFrames() {
  const frames = [];
  for (let ph = 0; ph < 4; ph++) {
    const R = new Raster(42, 46);
    const cx = 19, feet = 41;
    const armLift = [0, -3, -6, -2][ph];
    const forkTilt = [-0.22, 0.1, 0.32, -0.05][ph];
    const mouthOpen = ph % 2 === 1;
    const overalls = P(['#1d2e4c', '#2c4674', '#3f629a', '#5882bd']);
    const shirt = P(['#782418', '#a63826', '#d0543a', '#ee7a58']);
    const skin = P(['#7a442c', '#a86442', '#d28a62', '#eeb088']);

    R.rect(cx - 5, feet - 4, 4, 4, PAL.wood[1]);
    R.rect(cx + 1, feet - 3, 4, 4, PAL.wood[0]);
    R.rect(cx - 4, feet - 12, 8, 9, (x, y) => band(overalls, 0.5 + (x - cx) * 0.05, x, y));
    R.rect(cx - 5, feet - 20, 10, 9, (x, y) => band(shirt, 0.55 - (y - (feet - 20)) * 0.04 + (x - cx) * 0.04, x, y));
    R.rect(cx - 3, feet - 18, 6, 7, (x, y) => band(overalls, 0.6, x, y));
    R.set(cx - 2, feet - 18, C('#f2d06b')); R.set(cx + 1, feet - 18, C('#f2d06b'));
    R.ellipse(cx, feet - 25, 4.2, 4.4, (x, y, u, v) => band(skin, 0.62 + u * 0.2 - v * 0.2, x, y));
    R.rect(cx - 3, feet - 24, 6, 3, PAL.stone[4]);
    if (mouthOpen) R.rect(cx - 1, feet - 24, 3, 2, C('#4a1210'));
    R.set(cx + 1, feet - 26, C('#1b141a'));
    R.ellipse(cx, feet - 29, 8.5, 2.0, (x, y, u, v) => band(PAL.straw, 0.65 - v * 0.25, x, y));
    R.rect(cx - 4, feet - 33, 8, 4, (x, y) => band(PAL.straw, 0.6 + (x - cx) * 0.06, x, y));
    R.hline(cx - 4, cx + 3, feet - 30, C('#9e2c26'));

    const hx = cx + 6, hy = feet - 20 + armLift;
    R.capsule(cx + 3, feet - 17, hx, hy, 1.6, 1.4, shirt[2]);
    R.set(hx, hy, skin[2]);
    const sa = Math.sin(forkTilt), ca = Math.cos(forkTilt);
    const botX = hx - sa * 8, botY = hy + ca * 8;
    const topX = hx + sa * 15, topY = hy - ca * 15;
    R.line(botX, botY, topX, topY, PAL.wood[3], 2);
    const px = ca, py = sa;
    R.line(topX - px * 4, topY - py * 4, topX + px * 4, topY + py * 4, PAL.iron[2], 2);
    for (const off of [-4, 0, 4]) {
      const fx = topX + px * off, fy = topY + py * off;
      R.line(fx, fy, fx + sa * 6.5, fy - ca * 6.5, PAL.iron[3], 1.5);
      R.set(Math.round(fx + sa * 6.5), Math.round(fy - ca * 6.5), C('#eef6ff'));
    }
    R.capsule(cx - 4, feet - 18, cx - 7, feet - 15 + (ph % 2), 1.3, 1.1, skin[2]);
    R.outline(INK, false);
    if (mouthOpen) {
      R.hline(cx + 6, cx + 8, feet - 26, C('#ffd25a'));
      R.hline(cx + 7, cx + 9, feet - 29, C('#d96828'));
    }
    frames.push(R.toCanvas());
  }
  return frames;
}

// ============ NEAR LAYER: FLOWERING HEDGEROW, STONE BASE & TIMBER FARM WALL (y=274..285) ============
export function buildNearS2(W) {
  const H = 420, R = new Raster(W, H);
  const TOP = 274, BOT = 285;
  for (let x = 0; x < W; x++) for (let y = BOT - 4; y < H; y++) {
    R.set(x, y, band(PAL.grass, 0.44 + (noise2(x / 36, y / 12, 5) - 0.5) * 0.22, x, y));
  }
  for (let y = 252; y < BOT; y++) for (let x = LANE.gap0 - 3; x <= LANE.gap1 + 3; x++) {
    const k = (y - 252) / (BOT - 252), lx = LANE.x - (285 - y) * 0.38, hw = 2 + k * 5;
    R.set(x, y, Math.abs(x - lx) <= hw ? band(PAL.dirt, 0.58 + (x - lx) / hw * 0.14, x, y) : band(PAL.grass, 0.48, x, y));
  }
  const hedge = new Raster(W, H), r = rnd(29);
  for (let x = -16; x < W + 24; x += 21) {
    const hgt = 10 + fbm1(x / 55, 11, 3) * 8;
    canopy(hedge, x + r() * 8, TOP - hgt * 0.42, 21, hgt * 0.62, { pal: PAL.leaf, seed: x + 400, lx: 0.35, puff: 5, stray: 0, spread: 0.56 });
  }
  for (let i = 0; i < 380; i++) {
    const x = Math.floor(r() * W), y = Math.floor(TOP - 2 - r() * 19);
    if (hedge.has(x, y) && hedge.has(x, y - 1)) hedge.set(x, y, r() > 0.4 ? C('#f4d248') : C('#fff6cc'));
  }
  for (let y = 0; y < H; y++) for (let x = LANE.gap0 - 4; x <= LANE.gap1 + 4; x++) {
    if (x > LANE.gap0 + 1 && x < LANE.gap1 - 1 && hedge.in(x, y)) hedge.d[y * W + x] = 0;
  }
  hedge.outline(C('#142414'), false);
  R.blit(hedge, 0, 0);
  // Darkened contact shade under the overhanging flowering hedgerow
  for (let x = 0; x < W; x++) {
    if (x >= LANE.gap0 && x <= LANE.gap1) continue;
    for (let y = TOP - 1; y <= TOP + 6; y++) {
      if (R.has(x, y)) R.set(x, y, mixC(R.get(x, y), C('#0f1612'), 0.22));
    }
  }

  const wall = new Raster(W, H);
  for (let x = 0; x < W; x++) {
    if (x >= LANE.gap0 && x <= LANE.gap1) continue;
    for (let y = TOP + 5; y <= BOT; y++) {
      const c2 = y === TOP + 5 || (x + ((y - TOP) >> 1) * 5) % 10 === 0;
      wall.set(x, y, band(PAL.stone, c2 ? 0.3 : 0.62 + (h2(x >> 3, y >> 1) - 0.5) * 0.2, x, y));
    }
  }
  for (let x = 0; x < W; x++) {
    if (x >= LANE.gap0 && x <= LANE.gap1) continue;
    for (let k = 0; k < 4; k++) {
      wall.set(x, TOP + k, band(PAL.wood, k === 0 ? 0.82 : k === 3 ? 0.16 : 0.54 + (h2(x >> 2, 1) - 0.5) * 0.14, x, TOP + k));
    }
  }
  for (let px = 14; px < W; px += 48) {
    if (px > LANE.gap0 - 8 && px < LANE.gap1 + 6) continue;
    for (let y = TOP - 3; y <= BOT; y++) for (let i = 0; i < 5; i++) {
      wall.set(px + i, y, band(PAL.wood, 0.46 + (i === 0 ? 0.25 : i >= 3 ? -0.22 : 0), px + i, y));
    }
    wall.hline(px, px + 4, TOP - 3, PAL.wood[6]);
  }
  for (const gx of [LANE.gap0 - 5, LANE.gap1]) {
    wall.rect(gx, TOP - 8, 6, BOT - TOP + 9, (x, y) => band(PAL.wood, 0.5 + ((x - gx) === 0 ? 0.28 : (x - gx) >= 4 ? -0.24 : 0), x, y));
    wall.rect(gx - 1, TOP - 10, 8, 2, PAL.wood[6]);
  }
  wall.rect(404, TOP - 12, 22, 11, (x, y) => band(PAL.plank, y === TOP - 12 ? 0.82 : 0.58, x, y));
  wall.hline(407, 422, TOP - 8, PAL.wood[1]);
  wall.hline(407, 419, TOP - 5, PAL.wood[1]);
  wall.rect(414, TOP - 1, 2, 9, PAL.wood[2]);
  wall.outline(INK, false);
  R.blit(wall, 0, 0);

  for (let k = 0; k < 65; k++) {
    const px = Math.floor(h2(k, 43) * W);
    tuft(R, px, BOT + 1, 3 + Math.floor(h2(k, 44) * 4), h2(k, 45) - 0.5);
  }
  return R;
}

// ============ GROUND: ORGANIC BEVELED TURNIP BEDS, OVERTURNED CART, FENCE ============
function drawSpilledCart(R, cx, cy) {
  const S = new Raster(138, 86);
  const ox = 68, oy = 46;
  S.ellipse(ox - 8, oy + 9, 36, 5.5, (x, y, u, v) => band(PAL.soil, 0.28 - v * 0.14, x, y));

  for (const [dx, dy, ang] of [[-26, 7, -0.5], [-16, 10, 0.7], [-3, 11, -0.3], [11, 11, 0.8]]) {
    drawTurnip(S, ox + dx, oy + dy, 1.04, ang, false, true);
  }

  const ang = -0.34, ca = Math.cos(ang), sa = Math.sin(ang);
  const pt = (lx, ly) => [Math.round(ox + lx * ca - ly * sa), Math.round(oy + lx * sa + ly * ca)];
  const bed = [pt(-21, -2), pt(23, -2), pt(23, 10), pt(-21, 10)];
  S.poly(bed, (x, y) => band(PAL.plank, 0.36 + (y - (oy - 4)) * 0.012, x, y));
  for (const sx of [-17, -5, 7, 20]) {
    const p0 = pt(sx, -18), p1 = pt(sx, 8);
    S.line(p0[0], p0[1], p1[0], p1[1], PAL.wood[3], 2);
  }
  for (const ry of [-16, -9, -2]) {
    const a = pt(-21, ry), b = pt(24, ry);
    S.line(a[0], a[1], b[0], b[1], ry === -16 ? PAL.wood[6] : PAL.wood[5], 2);
  }
  const sh1a = pt(-21, 6), sh1b = pt(-40, 13);
  const sh2a = pt(-19, 2), sh2b = pt(-33, 6);
  S.line(sh1a[0], sh1a[1], sh1b[0], sh1b[1], PAL.wood[3], 2);
  S.line(sh2a[0], sh2a[1], sh2b[0], sh2b[1], PAL.wood[4], 2);

  for (const [lx, ly, ta] of [[-12, -7, -0.8], [-2, -9, 0.3], [8, -7, -0.4], [-17, -2, -1.1]]) {
    const [tx, ty] = pt(lx, ly);
    drawTurnip(S, tx, ty, 1.06, ta, false, true);
  }

  const wc = pt(7, -14);
  const wx = wc[0], wy = wc[1], wr = 11.5;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + 0.25;
    S.line(wx, wy, Math.round(wx + Math.cos(a) * (wr - 1)), Math.round(wy + Math.sin(a) * (wr - 1)), PAL.wood[4], 1);
  }
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    S.set(Math.round(wx + Math.cos(a) * wr), Math.round(wy + Math.sin(a) * wr), PAL.iron[2]);
    S.set(Math.round(wx + Math.cos(a) * (wr - 1)), Math.round(wy + Math.sin(a) * (wr - 1)), PAL.wood[5]);
  }
  S.ellipse(wx, wy, 2.5, 2.5, PAL.iron[3]);
  S.set(wx - 1, wy - 1, PAL.iron[4]);

  S.ellipse(ox + 28, oy + 8, 7, 5, (x, y, u, v) => band(PAL.straw, 0.48 - v * 0.25 + ((x + y) % 3 === 0 ? -0.15 : 0), x, y));
  S.ellipse(ox + 22, oy + 8, 3, 4.5, PAL.soil[1]);
  for (const [dx, dy, ang2] of [[-35, 15, -0.7], [-23, 16, 0.5], [16, 12, -0.4]]) {
    drawTurnip(S, ox + dx, oy + dy, 1.08, ang2, false, true);
  }

  S.outline(INK, false);
  R.blit(S, cx - ox, cy - oy);
}

export function buildGroundS2(W) {
  const H = 420, R = new Raster(W, H);
  const edge = x => GRASS_Y + Math.round(fbm1(x / 12, 27, 3) * 2.5);

  for (let x = 0; x < W; x++) for (let y = edge(x); y < H; y++) {
    const dap = noise2(x / 54, y / 15, 12);
    let t = 0.52 + (dap - 0.5) * 0.4 - (y - GRASS_Y) * 0.001;
    R.set(x, y, band(PAL.grass, t, x, y, 0.1));
  }
  // Meadow flower drifts & half-sunk fieldstones matching Stage 1 meadow richness
  const FL = [
    [C('#f4f1e6'), C('#ffd84a')], [C('#ffd23f'), C('#c98a1a')],
    [C('#e3372f'), C('#3a1414')], [C('#7f9df4'), C('#3b4ea8')],
  ];
  const gr = rnd(91);
  for (let i = 0; i < 240; i++) {
    const fx = Math.floor(gr() * W), fy = GRASS_Y + 3 + Math.floor(gr() * 82);
    if (Math.abs(fy - PATH_Y(fx)) < 10) continue;
    const fl = FL[Math.floor(gr() * FL.length)];
    R.set(fx, fy, fl[0]);
    if (gr() > 0.55) R.set(fx + 1, fy, fl[1]);
  }
  for (const [sx, sy, rw] of [[126, 294, 5], [352, 304, 4], [510, 344, 5], [142, 338, 4]]) {
    R.ellipse(sx, sy, rw, 2.2, (x, y, u, v) => band(PAL.stone, 0.58 - v * 0.25, x, y));
    R.set(sx - 1, sy - 1, C('#7f9a4a'));
  }

  // ---- ORGANIC BEVELED TURNIP BEDS WITH WEATHERED TIMBER CORNER STAKES ----
  const drawOrganicTurnipBed = (x0, x1, y0, y1, rowPeriod, skipFn) => {
    const rw = (x1 - x0) / 2, rh = (y1 - y0) / 2;
    const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;
    const inBed = (x, y) => {
      if (skipFn && skipFn(x, y)) return false;
      const dx = Math.abs(x - midX) / rw, dy = Math.abs(y - midY) / rh;
      const wobble = (noise2(x / 18, y / 12, 55) - 0.5) * 0.08;
      return (dx ** 5 + dy ** 5) <= (0.98 + wobble);
    };

    for (let x = x0; x <= x1; x++) {
      const slopeShift = (x - midX) * 0.025;
      for (let y = y0; y <= y1; y++) {
        if (!inBed(x, y)) continue;
        const edgeRim = !inBed(x, y - 1) || !inBed(x - 1, y);
        const edgeBot = !inBed(x, y + 1);
        const fy = (y - y0 + slopeShift * 7 + Math.sin(x * 0.03) * 1.4);
        const inR = ((fy % rowPeriod) + rowPeriod) % rowPeriod;
        let t = 0.54 + Math.sin((inR / rowPeriod) * Math.PI * 2) * 0.22;
        t += (noise2(x / 14, y / 4, 19) - 0.5) * 0.14;
        if (inR < 1.3) t += 0.12;
        if (edgeRim) t = 0.34;
        if (edgeBot) t = 0.2;
        R.set(x, y, band(PAL.soil, t, x, y, 0.07));
        if (edgeRim && (x % 9 < 7)) R.set(x, y - 1, PAL.wood[3]);
        if (edgeBot) R.set(x, y + 1, PAL.grass[0]);
      }
    }
    // Weathered timber pegs at upper corners
    for (const px of [x0 + 5, x1 - 6]) {
      if (inBed(px, y0 + 5)) {
        R.rect(px, y0 - 1, 2, 4, PAL.wood[3]);
        R.set(px, y0 - 1, PAL.wood[5]);
      }
    }
    for (let x = x0 + 4; x < x1 - 4; x += 9) {
      if (inBed(x, y0 + 2) && !inBed(x, y0 - 1)) tuft(R, x, y0 + 2, 2 + Math.floor(h2(x, y0, 17) * 3), 0.2);
      if (inBed(x, y1 - 2) && !inBed(x, y1 + 1)) tuft(R, x + 2, y1 + 2, 2 + Math.floor(h2(x, y1, 18) * 3), -0.2);
    }
    for (let r = 0; r * rowPeriod + y0 + 3 < y1 - 1; r++) {
      const spacing = rowPeriod >= 9 ? 12 : 10;
      for (let x = x0 + 9 + (r & 1) * 5; x < x1 - 7; x += spacing) {
        const slopeShift = (x - midX) * 0.025;
        const py = Math.round(y0 + r * rowPeriod + rowPeriod * 0.34 - slopeShift * 7 - Math.sin(x * 0.03) * 1.4);
        if (!inBed(x, py - 1) || !inBed(x, py + 2)) continue;
        if (h2(x, r, 71) > 0.84) {
          R.ellipse(x, py + 1, 3, 1.5, PAL.soil[1]);
          continue;
        }
        const sz = (rowPeriod >= 9 ? 1.08 : 0.92) * (0.9 + h2(x, r, 29) * 0.22);
        drawTurnip(R, x, py, sz, (h2(x, r, 13) - 0.5) * 0.3, true, false);
      }
    }
    if (inBed(x0 + 8, y0 + 6)) {
      const sx = x0 + 6, sy = y0 + 4;
      R.rect(sx, sy - 6, 2, 7, PAL.wood[4]);
      R.set(sx, sy - 6, PAL.wood[6]);
      R.rect(sx - 2, sy - 5, 6, 3, PAL.plank[4]);
    }
  };

  drawOrganicTurnipBed(8, 114, 289, 313, 7.5);
  drawOrganicTurnipBed(162, 336, 288, 313, 7.5);
  drawOrganicTurnipBed(436, 628, 288, 313, 7.5, (x, y) => x >= FENCE.x0 - 6 && y <= FENCE.base + 4);
  drawOrganicTurnipBed(10, 304, 335, 365, 9.2);
  drawOrganicTurnipBed(326, 626, 335, 365, 9.2);

  for (let y = GRASS_Y + 1; y < PATH_Y(384) - 2; y++) {
    const cx = LANE.x + 10 * ((y - GRASS_Y) / 31) ** 2;
    const hw = 5 + ((y - GRASS_Y) / 31) * 9;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const dx = (x - cx) / hw;
      let t = 0.58 + dx * 0.1 + (noise2(x / 8, y / 3, 15) - 0.5) * 0.12;
      R.set(x, y, band(PAL.dirt, t, x, y, 0.05));
    }
  }

  const pathHW = x => 7 + Math.round(fbm1(x / 17, 41, 2) * 2);
  for (let x = 0; x < W; x++) {
    const c = PATH_Y(x), hw = pathHW(x);
    for (let y = c - hw; y <= c + hw; y++) {
      const dy = y - c;
      let t = 0.56 + (noise2(x / 9, y / 3, 14) - 0.5) * 0.18;
      if (dy <= -hw + 1) t = 0.14;
      else if (dy <= -hw + 2) t = 0.34;
      if (dy >= hw - 1) t = 0.78;
      // Crisp worn twin farm-wagon wheel ruts along the battle footpath
      if (Math.abs(dy + 2.5) <= 0.8 || Math.abs(dy - 2.8) <= 0.8) t -= 0.18;
      R.set(x, y, band(PAL.dirt, t, x, y, 0.1));
    }
    if (h2(x, 19) > 0.88) {
      const yy = c - 3 + Math.floor(h2(x, 20) * 6);
      R.set(x, yy, C('#948a8c')); R.set(x + 1, yy, C('#6e646e')); R.set(x, yy - 1, C('#e0d8d4'));
    }
  }
  for (let x = 0; x < W; x += 3) {
    const c = PATH_Y(x), hw = pathHW(x);
    if (h2(x, 4) > 0.4) tuft(R, x, c - hw + 1, 3 + Math.floor(h2(x, 5) * 2), 0.3);
    if (h2(x, 6) > 0.5) tuft(R, x + 1, c + hw + 3, 3 + Math.floor(h2(x, 7) * 3), -0.3);
  }

  const fence = new Raster(W, H), PB = FENCE.base, PH = PB - FENCE.rail1 + 5;
  for (const px of FENCE.posts) {
    R.ellipse(px, PB + 1, 5, 2, C('#182414', 85));
    for (let y = PB - PH; y <= PB; y++) for (let k = 0; k < 5; k++) {
      fence.set(px + k, y, band(PAL.wood, 0.52 + (k === 0 ? 0.25 : k >= 3 ? -0.25 : 0) + (h2(px, y >> 2) - 0.5) * 0.1, px + k, y));
    }
    fence.hline(px, px + 4, PB - PH, PAL.wood[6]);
  }
  for (const ry of [FENCE.rail1, FENCE.rail2]) for (let x = FENCE.x0; x < W; x++) {
    const sag = Math.round(Math.sin(((x - FENCE.x0) / 46) * Math.PI) * 0.8);
    for (let k = 0; k < 4; k++) fence.set(x, ry + Math.max(0, sag) + k, band(PAL.wood, k === 0 ? 0.78 : k === 3 ? 0.14 : 0.5, x, ry + k));
  }
  fence.outline(INK, false);
  R.blit(fence, 0, 0);
  for (let x = FENCE.x0 + 2; x < W; x += 2) tuft(R, x, PB + 2, 4 + Math.floor(h2(x, 9) * 3), h2(x, 8) - 0.5);

  drawSpilledCart(R, CART_POS.x, CART_POS.y);

  R.ellipse(468, 302, 12, 3.5, C('#182414', 85));
  const sack = new Raster(28, 22);
  sack.ellipse(12, 14, 8, 5, (x, y, u, v) => band(PAL.straw, 0.45 - v * 0.25, x, y));
  drawTurnip(sack, 18, 14, 0.92, 0.7, false, true);
  drawTurnip(sack, 20, 16, 0.88, 0.3, false, true);
  sack.line(4, 16, 23, 3, PAL.wood[4]);
  sack.line(22, 1, 25, 5, PAL.iron[3]);
  sack.outline(INK, false);
  R.blit(sack, 456, 286);

  return R;
}
