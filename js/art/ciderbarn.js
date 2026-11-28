// ─────────────────────────────────────────────────────────────
//  Stage 3: "Hedrun's Cider Barn" — high-noon sun-dappled orchard
//  Cel-shaded procedural pixel art matching meadow.js / turnips.js craft:
//   · High-noon cobalt/amber orchard vista, distant stone walls & apple groves
//   · Red-stained timber Cider Barn with cedar-shingle gambrel roof, weathervane,
//     flung-open double doors showing lantern-lit interior & hay bales
//   · Exterior screw apple press, leaning orchard ladder, stacked hooped oak barrels
//     dripping amber cider into sticky glistening cider puddles
//   · Laden apple trees casting leafy noon shadows, fallen red/gold apples,
//     rustic split-rail orchard fence & crates
//   · Standing Hedrun gift sprite holding ruby-red Potions of Healing on Stage Clear
// ─────────────────────────────────────────────────────────────
import { C, P, Raster, mixC, rnd, h2, clamp, noise2, fbm1, band, canopy, treeSprite } from './cel.js';
import { PATH_Y, GRASS_Y } from './meadow.js';

export const BARN_DOOR_X = 414;
export const HEDRUN_BARN_POS = { x: 374, roofY: 185, ladderX: 353, doorX: 384, groundY: 278 };
export const CHIMNEYS_S3 = [{ x: 460, y: 147, vx: 7, magic: false }];
export const WINDOWS_S3 = [
  { x: 410, y: 171, w: 8, h: 9 },    // hayloft gable window
  { x: 400, y: 234, w: 28, h: 30 },  // open barn doorway warm lantern core
  { x: 382, y: 224, w: 4, h: 6 },    // left brass wall lantern
  { x: 442, y: 224, w: 4, h: 6 },    // right brass wall lantern
];

// Coordinates for bees, drips, & dappled highlights
export const APPLE_SPOTS_S3 = [
  { x: 74, y: 158 }, { x: 96, y: 146 }, { x: 112, y: 168 },
  { x: 548, y: 148 }, { x: 572, y: 138 }, { x: 588, y: 164 },
  { x: 136, y: 292 }, { x: 244, y: 318 }, { x: 318, y: 314 }, { x: 526, y: 310 },
];
export const BARREL_SPOTS_S3 = [
  { x: 326, y: 268 }, { x: 492, y: 266 }, { x: 486, y: 306 },
];

const INK = C('#1b141a');
const SUN_X = 488; // high-noon overhead sun clear of top Stage Sign
const lxAt = x => clamp((SUN_X - x) / 220, -0.8, 0.8);

const PAL = {
  grass: P(['#25541d', '#356d23', '#4b8a2a', '#65a633', '#82c23d', '#a2da4e', '#c6ec6c', '#e6f79c']),
  leaf: P(['#183a1b', '#265423', '#38722a', '#509233', '#6db23d', '#8fcf4a', '#b6e466', '#daf488']),
  leafD: P(['#122b16', '#1c401e', '#2a5a26', '#3c772e', '#529438', '#6fb146']),
  bark: P(['#24140d', '#3a2216', '#543321', '#70472e', '#8e5e3e', '#ab7952']),
  barnRed: P(['#381010', '#541a18', '#742722', '#94372d', '#b4493b', '#d0624f']),
  timber: P(['#26150c', '#3e2414', '#59351e', '#76492b', '#93603b', '#b27b50', '#d09b6c']),
  shingle: P(['#312116', '#4a3322', '#664830', '#835f40', '#a17952', '#be9568']),
  stone: P(['#3d3844', '#554f5e', '#70687a', '#8c8396', '#a8a0b2', '#c7bfd0']),
  dirt: P(['#4e3322', '#6c4930', '#8b6240', '#a87d54', '#c4996a', '#deb686', '#f0d4a4']),
  cider: P(['#72320c', '#9e4c14', '#c96f1d', '#eaa02c', '#ffd052', '#fff09c']),
  appleR: P(['#4d0c10', '#85181c', '#bc2628', '#e3423c', '#ff7a68', '#ffd8cc']),
  appleG: P(['#58420c', '#8c6b14', '#bd941e', '#e5bd2e', '#ffe45e', '#fff7ba']),
  hay: P(['#6e4d18', '#986f24', '#c29434', '#e5ba4c', '#fae07e', '#fff4b8']),
  iron: P(['#1c1d24', '#30323e', '#4b4e60', '#6d7084', '#979bae']),
  warm: P(['#5e2810', '#964718', '#ce7522', '#f4ad38', '#ffe174', '#fff7c4']),
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

// Cel-shaded crisp apple (red or golden) with tiny stem & leaf
function drawApple(R, cx, cy, gold = false, scale = 1, outlined = true) {
  const pal = gold ? PAL.appleG : PAL.appleR;
  const rx = 2.4 * scale, ry = 2.2 * scale;
  const pts = [];
  for (let dy = -Math.ceil(ry + 1); dy <= Math.ceil(ry + 1); dy++) {
    for (let dx = -Math.ceil(rx + 1); dx <= Math.ceil(rx + 1); dx++) {
      const u = dx / rx, v = dy / ry;
      const dimple = v < -0.55 ? 0.14 * (1 - Math.min(1, Math.abs(u) * 2.5)) : 0;
      if (u * u + (v + dimple) * (v + dimple) > 1) continue;
      const px = Math.round(cx + dx), py = Math.round(cy + dy);
      const t = clamp(0.62 - v * 0.36 + u * 0.16);
      pts.push([px, py, band(pal, t, px, py, 0.08)]);
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
  // tiny crisp noon specular glint
  R.set(Math.round(cx - 0.5), Math.round(cy - 0.7), pal[5]);
  // stem + tiny leaf
  R.set(Math.round(cx), Math.round(cy - ry), PAL.bark[2]);
  R.set(Math.round(cx + 1), Math.round(cy - ry - 1), PAL.leaf[5]);
}

// Standing hooped oak cider barrel with sticky amber leak
function drawBarrel(R, bx, by, w = 16, h = 21, leakSide = 1, seed = 1) {
  const S = new Raster(w + 8, h + 10);
  const cx = Math.floor((w + 8) / 2), top = 3;
  // staves
  for (let y = 0; y < h; y++) {
    const f = y / (h - 1);
    const bulge = Math.sin(f * Math.PI);
    const hw = Math.round((w * 0.37) + bulge * (w * 0.14));
    for (let dx = -hw; dx <= hw; dx++) {
      const u = dx / (hw + 0.5);
      const staveSeam = Math.abs((dx + hw) % 4) === 0 ? -0.18 : 0;
      const t = clamp(0.56 - u * 0.25 + (1 - f) * 0.14 + staveSeam);
      S.set(cx + dx, top + y, band(PAL.timber, t, cx + dx, top + y, 0.08));
    }
  }
  // top rim ellipse
  S.ellipse(cx, top + 1, Math.round(w * 0.38), 2.5, (x, y, u, v) => band(PAL.timber, 0.42 - v * 0.18, x, y));
  // two iron hoops
  for (const hy of [top + 4, top + h - 5]) {
    const f = (hy - top) / (h - 1), hw = Math.round((w * 0.37) + Math.sin(f * Math.PI) * (w * 0.14));
    for (let y = 0; y < 2; y++) for (let dx = -hw; dx <= hw; dx++) {
      const u = dx / (hw + 0.5);
      S.set(cx + dx, hy + y, band(PAL.iron, 0.54 - u * 0.28 + (y === 0 ? 0.14 : -0.12), cx + dx, hy + y));
    }
  }
  // wooden tap spigot + amber cider trickle
  const sx = cx + leakSide * 4, sy = top + h - 6;
  S.rect(sx - 1, sy, 3, 2, PAL.timber[4]);
  S.set(sx + leakSide, sy + 1, PAL.timber[2]);
  for (let y = sy + 2; y <= top + h + 1; y++) {
    const wag = ((y + seed) % 3 === 0) ? leakSide : 0;
    S.set(sx + leakSide + wag, y, PAL.cider[3]);
    S.set(sx + leakSide + wag, y, y === sy + 3 ? PAL.cider[5] : PAL.cider[4]);
  }
  S.outline(INK, false);
  R.blit(S, bx - cx, by - (top + h));
  // sticky amber cider puddle beneath the barrel tap
  const px = bx + leakSide * 5, py = by + 1;
  R.ellipse(px, py, 8, 2.5, (x, y, u, v) => band(PAL.cider, 0.62 - v * 0.25 + (h2(x, y, seed) > 0.8 ? 0.22 : 0), x, y));
  R.set(px - 2, py - 1, PAL.cider[5]);
  R.set(px + 2, py, PAL.cider[5]);
}

// ============ FAR ORCHARD HILLS & STONE WALL ============
export function buildFarOrchardS3(W) {
  const H = 330, R = new Raster(W, H);
  const HAZE = C('#cde6fa');
  const hz = (pal, a) => pal.map(c => mixC(c, HAZE, a));
  const FAR = hz(P(['#487e42', '#5f984b', '#7ab255', '#96ca62', '#b8e076']), 0.30);
  const MID = hz(P(['#346a2c', '#4a8436', '#62a040', '#7ebc4c', '#9fd45c']), 0.12);
  const BARLEY = hz(P(['#a99a44', '#c9b658', '#e4d274']), 0.22);
  const CLOVER = hz(P(['#2e6628', '#428034', '#5c9d42']), 0.18);
  const STONE = hz(PAL.stone, 0.22);

  const ridge1 = x => 190 + fbm1(x / 70, 29, 4) * 14 - 16 * Math.exp(-(((x - 170) / 80) ** 2));
  const ridge2 = x => 209 + fbm1(x / 50, 41, 4) * 12;

  for (let x = 0; x < W; x++) {
    const t1 = Math.round(ridge1(x)), t2 = Math.round(ridge2(x));
    for (let y = t1; y < H; y++) {
      const near = y >= t2;
      const top = near ? t2 : t1;
      const slope = (near ? ridge2(x + 2) - ridge2(x - 2) : ridge1(x + 2) - ridge1(x - 2)) * 0.24;
      const sunShift = clamp((x - SUN_X) * -0.0005, -0.08, 0.14);
      let t = 0.52 - (y - top) * 0.007 - slope * 0.14 + sunShift + (noise2(x / 40, y / 18, 9) - 0.5) * 0.12;
      if (y - top < 2) t += 0.16;
      const patch = noise2(x / 50, y / 16, near ? 19 : 7);
      let col = band(near ? MID : FAR, t, x, y);
      if (y - top > 3) {
        if (patch > 0.63) col = mixC(col, BARLEY[clamp(Math.floor((patch - 0.63) * 7), 0, 2)], near ? 0.46 : 0.34);
        else if (patch < 0.35) col = mixC(col, CLOVER[clamp(Math.floor(patch * 6), 0, 2)], near ? 0.42 : 0.30);
      }
      if (y === top) col = mixC(near ? MID[4] : FAR[4], C('#fff4d0'), 0.45);
      R.set(x, y, col);
    }
  }

  // Sunlit stone orchard retaining wall tucked across the mid-hill ridge
  for (let x = 20; x < 622; x++) {
    if (x > 310 && x < 506) continue; // behind the big Cider Barn
    const wy = Math.round(ridge2(x) + 12 + noise2(x / 18, 3, 2) * 2);
    for (let k = 0; k < 6; k++) {
      const mortar = ((x + (k >> 1) * 4) % 9 === 0) || (k === 2 && x % 3 !== 0);
      R.set(x, wy + k, STONE[mortar ? 1 : (k === 0 ? 5 : k === 1 ? 4 : 3)]);
    }
    if (h2(x, 11, 7) > 0.88) R.set(x, wy, MID[3]); // sunlit moss fleck on capstone
  }

  // Distant timber apple-storage shed & stone archway on the sunlit left terrace
  {
    const sx = 186, sy = Math.round(ridge2(186) + 11);
    const WALL = hz(PAL.barnRed, 0.28), ROOF = hz(PAL.shingle, 0.25);
    R.ellipse(sx - 2, sy + 1, 14, 2.5, mixC(MID[0], C('#1c2a1a'), 0.35));
    R.rect(sx - 12, sy - 11, 24, 11, WALL[3]);
    R.rect(sx - 12, sy - 11, 24, 2, WALL[1]);
    for (let y = 0; y < 8; y++) {
      const hw = 4 + Math.round((y / 7) * 11);
      R.rect(sx - hw, sy - 19 + y, hw * 2, 1, ROOF[y % 2 ? 3 : 4]);
    }
    R.rect(sx - 3, sy - 6, 6, 6, hz(PAL.timber, 0.25)[1]);
    R.rect(sx + 6, sy - 18, 3, 7, STONE[3]);
  }

  // Distant rows of Shadowdale apple trees dotted with crimson & golden fruit (framed inside 0..640)
  const farTrees = [
    [54, 206, 28, 30], [108, 211, 25, 27], [156, 208, 28, 30], [228, 213, 25, 26],
    [274, 211, 26, 28], [534, 211, 27, 29], [584, 206, 31, 33], [624, 210, 26, 28],
  ];
  for (let i = 0; i < farTrees.length; i++) {
    const [tx, ty, tw, th] = farTrees[i];
    R.ellipse(tx - 1, ty + 2, Math.round(tw * 0.32), 2.4, mixC(MID[0], C('#1a2a18'), 0.35));
    const T = treeSprite({
      w: tw, h: th,
      pal: hz(PAL.leaf, 0.16),
      bark: hz(PAL.bark, 0.2),
      seed: 200 + i * 7,
      lx: lxAt(tx),
      puff: 4.5,
      stray: 0,
      blossom: 6,
      blossomCol: i % 2 ? PAL.appleR[3] : PAL.appleG[4],
      ink: mixC(INK, HAZE, 0.35),
    });
    R.blit(T, Math.round(tx - tw / 2), ty - th + 6);
  }
  return R;
}

// ============ CIDER BARN, APPLE PRESS, BARRELS & ORCHARD TREES ============
export function buildCiderBarnS3(W) {
  const H = 360, R = new Raster(W, H);

  // Back flanking orchard bushes along the hedge line
  const bushR = rnd(55);
  for (let bx = 12; bx < W - 12; bx += 22) {
    if (bx > 322 && bx < 508) continue;
    const by = 266 + Math.round((bushR() - 0.5) * 4);
    canopy(R, bx, by, 14 + bushR() * 6, 9 + bushR() * 4, {
      pal: PAL.leafD, seed: 300 + bx, lx: lxAt(bx), puff: 4.2, stray: 0,
    });
  }

  // ---- HEDRUN'S CIDER BARN (centerpiece x = 336..500, grounded y = 276) ----
  {
    const bx0 = 336, bx1 = 492, bw = bx1 - bx0; // 156 px wide
    const plinthTop = 266, wallBot = 276;
    const eavesY = 200, gambrelKneeY = 174, ridgeY = 152;
    const midX = Math.round((bx0 + bx1) / 2); // 414 = BARN_DOOR_X!

    // Contact shadow behind & south-left of the barn plinth
    R.ellipse(midX - 4, wallBot + 2, 88, 6.5, C('#100c12', 94));

    // Dry-stone foundation plinth
    for (let y = plinthTop; y <= wallBot; y++) {
      for (let x = bx0 - 2; x <= bx1 + 2; x++) {
        const mortar = ((x + (y >> 2) * 5) % 11 === 0) || y === plinthTop + 5;
        const lit = clamp(0.55 - (y - plinthTop) * 0.04 + (x < midX ? 0.08 : -0.04));
        R.set(x, y, mortar ? PAL.stone[0] : band(PAL.stone, lit, x, y));
      }
    }

    // Main weathered red vertical-plank barn walls (under gambrel gable, noon eaves shadow)
    for (let y = ridgeY + 2; y < plinthTop; y++) {
      let lx = bx0, rx = bx1;
      if (y < eavesY) {
        const t = y < gambrelKneeY
          ? (y - ridgeY) / (gambrelKneeY - ridgeY)
          : 1;
        const t2 = y < gambrelKneeY ? t * 0.62 : 0.62 + ((y - gambrelKneeY) / (eavesY - gambrelKneeY)) * 0.38;
        const hw = Math.round((bw / 2) * clamp(t2));
        lx = midX - hw; rx = midX + hw;
      }
      for (let x = lx; x <= rx; x++) {
        const seam = ((x - bx0) % 6 === 0) ? -0.18 : 0;
        const eavesSh = y >= eavesY && y < eavesY + 7 ? -0.22 * (1 - (y - eavesY) / 7) : 0;
        const sideSh = x > midX ? 0.10 : -0.05; // right face catches noon sun at x=488
        const t = clamp(0.56 + eavesSh + sideSh + seam);
        R.set(x, y, band(PAL.barnRed, t, x, y, 0.08));
      }
    }

    // Crisp timber corner posts, diagonal braces & horizontal beam trim
    for (const px of [bx0, bx0 + 1, bx1 - 1, bx1]) R.rect(px, eavesY, 3, plinthTop - eavesY, PAL.timber[2]);
    R.rect(bx0, eavesY, bw + 1, 3, PAL.timber[2]);
    R.rect(bx0, eavesY, bw + 1, 1, PAL.timber[5]);
    R.line(bx0 + 3, eavesY + 4, bx0 + 22, eavesY + 22, PAL.timber[3], 2);
    R.line(bx1 - 2, eavesY + 4, bx1 - 21, eavesY + 22, PAL.timber[3], 2);

    // Hayloft gable doorway + protruding golden straw + warm glowing lantern window above doors
    {
      const lw = 18, lh = 22, lx = midX - 9, ly = 166;
      R.rect(lx - 1, ly - 1, lw + 2, lh + 2, INK);
      R.rect(lx, ly, lw, lh, PAL.warm[2]);
      R.rect(lx + 2, ly + 2, lw - 4, lh - 4, PAL.warm[4]);
      R.rect(lx + 5, ly + 5, lw - 10, lh - 10, PAL.warm[5]);
      // Golden hay bundle peeking out on the loft sill
      R.rect(lx + 2, ly + lh - 4, lw - 4, 4, PAL.hay[3]);
      R.rect(lx + 4, ly + lh - 5, lw - 8, 2, PAL.hay[4]);
      for (const hx of [lx + 3, lx + 7, lx + 12]) R.rect(hx, ly + lh, 1, 3, PAL.hay[4]);
      // Crossed wooden loft shutters ajar on each side
      for (const sx of [lx - 8, lx + lw + 1]) {
        R.rect(sx, ly, 7, lh, PAL.barnRed[2]);
        R.rect(sx + 1, ly + 1, 5, lh - 2, PAL.barnRed[4]);
        R.line(sx, ly, sx + 6, ly + lh - 1, PAL.timber[3], 1);
      }
      // Projecting hay-hood beam + iron hoist pulley & rope
      R.rect(midX - 2, ridgeY + 5, 4, 12, PAL.timber[4]);
      R.rect(midX - 1, 159, 2, 7, PAL.iron[2]);
      R.ellipse(midX, 165, 2.5, 2.5, PAL.iron[3]);
      R.rect(midX, 167, 1, 7, PAL.hay[1]);
    }

    // Fieldstone & warm-brick cider-kiln chimney on right roof slope
    {
      const cx = 454, cy = 147;
      R.rect(cx - 1, cy - 1, 13, 31, INK);
      for (let y = 0; y < 29; y++) for (let x = 0; x < 11; x++) {
        const mortar = ((x + (y >> 1) * 3) % 5 === 0) || (y % 3 === 2);
        R.set(cx + x, cy + y, mortar ? PAL.stone[1] : band(PAL.stone, 0.52 - x * 0.025, cx + x, cy + y));
      }
      R.rect(cx - 2, cy - 2, 15, 3, PAL.stone[4]);
      R.rect(cx - 2, cy - 2, 15, 1, PAL.stone[5]);
      R.rect(cx + 2, cy - 5, 7, 3, PAL.stone[2]);
    }

    // Overhanging shingled gambrel roof with scalloped cedar courses & moss flecks
    for (let y = ridgeY - 3; y <= eavesY + 7; y++) {
      const t = y < gambrelKneeY
        ? (y - (ridgeY - 3)) / (gambrelKneeY - (ridgeY - 3)) * 0.64
        : 0.64 + ((y - gambrelKneeY) / (eavesY + 7 - gambrelKneeY)) * 0.36;
      const hw = Math.round((bw / 2 + 8) * clamp(t));
      for (let x = midX - hw; x <= midX + hw; x++) {
        const courseY = (y - ridgeY) % 5;
        const scallop = Math.abs(Math.sin(((x + (y >> 2) * 3) * Math.PI) / 5));
        const edgeShadow = courseY === 4 || (courseY === 3 && scallop < 0.35);
        const lipLight = courseY === 0 && scallop > 0.4;
        const side = x >= midX ? 0.14 : -0.04;
        let colT = 0.52 + side + (edgeShadow ? -0.22 : lipLight ? 0.14 : 0) + (h2(x, y, 71) > 0.88 ? 0.10 : 0);
        const moss = h2(x >> 2, y >> 2, 88) > 0.90 && h2(x, y, 17) > 0.55;
        const col = moss ? PAL.leaf[3] : band(PAL.shingle, clamp(colT), x, y);
        R.set(x, y, col);
      }
    }
    // Crisp dark roof fascia, gable bargeboard & ridge beam
    R.line(midX, ridgeY - 3, midX - 49, gambrelKneeY - 2, INK, 1);
    R.line(midX - 49, gambrelKneeY - 2, bx0 - 8, eavesY + 4, INK, 1);
    R.line(midX, ridgeY - 3, midX + 49, gambrelKneeY - 2, INK, 1);
    R.line(midX + 49, gambrelKneeY - 2, bx1 + 8, eavesY + 4, INK, 1);
    R.line(midX, ridgeY - 2, midX - 48, gambrelKneeY - 1, PAL.timber[4], 1);
    R.line(midX - 48, gambrelKneeY - 1, bx0 - 7, eavesY + 5, PAL.timber[4], 1);
    R.line(midX, ridgeY - 2, midX + 48, gambrelKneeY - 1, PAL.timber[5], 1);
    R.line(midX + 48, gambrelKneeY - 1, bx1 + 7, eavesY + 5, PAL.timber[5], 1);
    R.rect(midX - 5, ridgeY - 4, 10, 3, PAL.timber[5]);

    // Nailed timber roof-cleat / saddle perch grounding Hedrun cleanly at HEDRUN_BARN_POS (374, 185)
    R.rect(365, 187, 18, 2, C('#1b141a', 110));
    R.rect(365, 184, 18, 3, PAL.timber[4]);
    R.hline(365, 382, 184, PAL.timber[6]);
    R.set(367, 185, PAL.iron[3]);
    R.set(380, 185, PAL.iron[3]);

    // Painted hanging wooden "CIDER" signboard with crisp pixel letters & iron chains
    {
      const sw = 48, sh = 12, sx = midX - 24, sy = 202;
      R.rect(sx + 7, sy - 3, 1, 3, PAL.iron[2]);
      R.rect(sx + sw - 8, sy - 3, 1, 3, PAL.iron[2]);
      R.rect(sx - 1, sy - 1, sw + 2, sh + 2, INK);
      R.rect(sx, sy, sw, sh, PAL.timber[4]);
      R.rect(sx + 1, sy + 1, sw - 2, 1, PAL.timber[6]);
      R.rect(sx + 1, sy + sh - 2, sw - 2, 1, PAL.timber[2]);
      drawApple(R, sx + 7, sy + 6, false, 0.85, false);
      const LETTERS = [
        ['111', '100', '100', '100', '111'], // C
        ['111', '010', '010', '010', '111'], // I
        ['110', '101', '101', '101', '110'], // D
        ['111', '100', '110', '100', '111'], // E
        ['110', '101', '110', '101', '101'], // R
      ];
      LETTERS.forEach((glyph, idx) => {
        const gx = sx + 14 + idx * 6, gy = sy + 3;
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
          if (glyph[r][c] === '1') R.set(gx + c, gy + r, PAL.cider[5]);
        }
      });
    }

    // Copper rooster weathervane on roof peak
    R.line(midX, ridgeY - 4, midX, ridgeY - 15, PAL.iron[2], 1);
    R.line(midX - 5, ridgeY - 10, midX + 5, ridgeY - 10, PAL.cider[4], 1);
    R.rect(midX + 1, ridgeY - 14, 4, 3, PAL.cider[5]);
    R.set(midX + 5, ridgeY - 13, PAL.appleR[3]);

    // ---- WIDE OPEN DOUBLE BARN DOORS (x = 389..439, y = 218..275) ----
    {
      const dx0 = 389, dx1 = 439, dy0 = 218, dy1 = 275;
      // Textured cozy lantern-lit plank interior behind open barn doors
      for (let y = dy0; y <= dy1; y++) {
        for (let x = dx0; x <= dx1; x++) {
          const dist = Math.hypot((x - midX) / 22, (y - (dy0 + 16)) / 24);
          const plank = (x % 5 === 0) ? -1 : 0;
          const base = dist < 0.32 ? 3 : dist < 0.65 ? 2 : dist < 0.98 ? 1 : 0;
          const idx = clamp(base + plank, 0, 3);
          R.set(x, y, idx === 0 ? PAL.timber[0] : PAL.warm[idx]);
        }
      }
      // Interior timber cross-beam & stall post
      R.rect(dx0, dy0 + 13, dx1 - dx0 + 1, 2, PAL.timber[1]);
      // Hay bales stacked inside on left, pitchfork leaning, big oak cider tun on right
      R.rect(dx0 + 3, dy1 - 15, 16, 14, PAL.hay[2]);
      R.rect(dx0 + 3, dy1 - 15, 16, 3, PAL.hay[4]);
      R.rect(dx0 + 6, dy1 - 24, 12, 9, PAL.hay[3]);
      R.line(dx0 + 21, dy1 - 27, dx0 + 19, dy1 - 2, PAL.timber[4], 1);
      R.rect(dx0 + 20, dy1 - 31, 3, 4, PAL.iron[3]);
      R.rect(dx1 - 17, dy1 - 18, 15, 17, PAL.timber[2]);
      R.rect(dx1 - 17, dy1 - 14, 15, 2, PAL.iron[3]);
      R.rect(dx1 - 17, dy1 - 6, 15, 2, PAL.iron[3]);
      // Hanging iron barn lantern glowing bright cream-gold
      R.rect(midX, dy0 + 1, 1, 5, PAL.iron[1]);
      R.rect(midX - 2, dy0 + 6, 5, 6, PAL.warm[5]);
      R.set(midX, dy0 + 8, C('#ffffff'));

      // Heavy lintel + door jambs + flanking brass carriage wall lanterns
      R.rect(dx0 - 3, dy0 - 3, dx1 - dx0 + 7, 4, PAL.timber[3]);
      R.rect(dx0 - 3, dy0 - 3, dx1 - dx0 + 7, 1, PAL.timber[5]);
      R.rect(dx0 - 3, dy0, 3, dy1 - dy0 + 1, PAL.timber[2]);
      R.rect(dx1 + 1, dy0, 3, dy1 - dy0 + 1, PAL.timber[2]);
      for (const lx of [381, 441]) {
        R.rect(lx, 222, 6, 9, INK);
        R.rect(lx + 1, 223, 4, 1, PAL.iron[2]);
        R.rect(lx + 1, 224, 4, 6, PAL.warm[4]);
        R.rect(lx + 2, 225, 2, 3, PAL.warm[5]);
      }

      // Flung-open left & right barn doors angled outward with X-bracing & strap hinges
      const drawLeaf = (sx, wLeaf, dir) => {
        for (let y = dy0; y <= dy1; y++) {
          for (let i = 0; i < wLeaf; i++) {
            const x = sx + dir * i;
            const seam = i % 4 === 0 ? -0.15 : 0;
            R.set(x, y, band(PAL.barnRed, clamp(0.45 + seam + (dir < 0 ? 0.12 : -0.08)), x, y));
          }
        }
        R.rect(dir < 0 ? sx - wLeaf + 1 : sx, dy0, wLeaf, 3, PAL.timber[4]);
        R.rect(dir < 0 ? sx - wLeaf + 1 : sx, dy1 - 3, wLeaf, 3, PAL.timber[3]);
        R.line(sx, dy0 + 2, sx + dir * (wLeaf - 1), dy1 - 2, PAL.timber[4], 2);
        // wrought-iron strap hinges
        R.rect(dir < 0 ? sx - 10 : sx, dy0 + 9, 10, 2, PAL.iron[2]);
        R.rect(dir < 0 ? sx - 10 : sx, dy1 - 12, 10, 2, PAL.iron[2]);
      };
      drawLeaf(dx0 - 3, 18, -1);
      drawLeaf(dx1 + 3, 18, 1);
      // Timber plank threshold ramp + warm amber doorway lantern light spill onto dirt
      R.rect(dx0 - 2, dy1 - 1, dx1 - dx0 + 5, 4, PAL.timber[3]);
      R.rect(dx0 - 1, dy1 - 1, dx1 - dx0 + 3, 1, PAL.warm[4]);
      R.rect(dx0, dy1, dx1 - dx0 + 1, 2, PAL.warm[2]);
      for (let sy = dy1 + 2; sy <= dy1 + 9; sy++) {
        const k = sy - (dy1 + 2);
        const span = 22 + k * 2;
        const a = Math.round(92 - k * 9);
        R.hline(midX - span, midX + span, sy, C('#ffcf68', a));
      }
    }

    // Leaning wooden orchard ladder on the left front corner (`HEDRUN_BARN_POS.ladderX ~ 353`)
    {
      const lx0 = 344, ly0 = 276, lx1 = 359, ly1 = 196;
      R.ellipse(lx0 + 2, ly0 + 2, 10, 2.6, C('#100c12', 84));
      R.line(lx0, ly0, lx1, ly1, PAL.timber[4], 2);
      R.line(lx0 + 8, ly0, lx1 + 8, ly1, PAL.timber[3], 2);
      for (let k = 1; k <= 7; k++) {
        const f = k / 8;
        const rx = Math.round(lx0 + (lx1 - lx0) * f);
        const ry = Math.round(ly0 + (ly1 - ly0) * f);
        R.rect(rx, ry, 9, 2, PAL.timber[5]);
        R.rect(rx, ry + 1, 9, 1, PAL.timber[2]);
      }
    }

    // ---- EXTERIOR WOODEN SCREW APPLE PRESS (right side of barn: x = 454..486) ----
    {
      const px = 468, py = 275;
      R.ellipse(px - 2, py + 2, 16, 3.2, C('#100c12', 88));
      // stout press legs + cross beam
      R.rect(px - 12, py - 32, 3, 32, PAL.timber[3]);
      R.rect(px + 9, py - 32, 3, 32, PAL.timber[2]);
      R.rect(px - 14, py - 34, 28, 4, PAL.timber[4]);
      R.rect(px - 14, py - 34, 28, 1, PAL.timber[6]);
      // central iron screw & crossbar handle
      R.rect(px - 1, py - 44, 3, 16, PAL.iron[3]);
      R.rect(px - 9, py - 43, 18, 2, PAL.iron[4]);
      // slatted oak press tub full of red apples
      R.rect(px - 9, py - 24, 18, 14, PAL.timber[4]);
      R.rect(px - 9, py - 21, 18, 2, PAL.iron[2]);
      R.rect(px - 9, py - 14, 18, 2, PAL.iron[2]);
      for (const [ax, ay] of [[px - 5, py - 25], [px, py - 26], [px + 4, py - 25]]) drawApple(R, ax, ay, false, 0.78, false);
      // golden cider stream pouring into oak catch-bucket
      R.rect(px, py - 10, 2, 6, PAL.cider[4]);
      R.rect(px - 5, py - 6, 11, 6, PAL.timber[3]);
      R.rect(px - 4, py - 6, 9, 2, PAL.cider[4]);
    }
  }

  // ---- STACKED LEAKING CIDER BARRELS BESIDE BARN ----
  for (const [bx, by, rx] of [[325, 274, 10], [337, 275, 9], [490, 274, 10]]) {
    R.ellipse(bx, by, rx, 2.8, C('#100c12', 82));
  }
  drawBarrel(R, 326, 273, 16, 20, -1, 11);
  drawBarrel(R, 338, 274, 14, 18, 1, 22);
  drawBarrel(R, 492, 273, 16, 21, 1, 33);

  // ---- WOODEN APPLE-HARVEST WHEELBARROW & WOVEN BEE SKEP ----
  {
    const wx = 196, wy = 274;
    R.ellipse(wx - 2, wy + 1, 14, 3, C('#100c12', 80));
    const WB = new Raster(30, 18);
    WB.rect(4, 5, 16, 7, PAL.timber[4]);
    WB.rect(4, 5, 16, 2, PAL.timber[6]);
    WB.line(1, 7, 23, 12, PAL.timber[3], 2);
    WB.rect(7, 12, 2, 5, PAL.timber[2]);
    WB.ellipse(23, 13, 3.5, 3.5, PAL.iron[2]);
    WB.set(23, 13, PAL.iron[4]);
    drawApple(WB, 8, 4, false, 0.82, false);
    drawApple(WB, 12, 3, true, 0.88, false);
    drawApple(WB, 16, 4, false, 0.82, false);
    WB.outline(INK, false);
    R.blit(WB, wx - 15, wy - 17);
  }
  {
    const skx = 602, sky = 276;
    R.ellipse(skx - 2, sky + 1, 9, 2.4, C('#100c12', 78));
    const SK = new Raster(18, 20);
    SK.rect(2, 13, 14, 2, PAL.timber[3]);
    SK.rect(3, 15, 2, 4, PAL.timber[2]);
    SK.rect(13, 15, 2, 4, PAL.timber[2]);
    for (let y = 3; y <= 12; y++) {
      const hw = Math.round(2.5 + ((y - 3) / 9) * 4.5);
      SK.rect(9 - hw, y, hw * 2, 1, PAL.hay[(y % 2) ? 3 : 4]);
    }
    SK.rect(8, 10, 2, 3, INK);
    SK.outline(INK, false);
    R.blit(SK, skx - 9, sky - 19);
  }

  // ---- SUN-DAPPLED APPLE ORCHARD FLANKING TREES (within 0..640 viewport) ----
  const orchardTrees = [
    { x: 24, y: 274, w: 72, h: 112, apples: 9, gold: false, seed: 10 },
    { x: 92, y: 278, w: 86, h: 130, apples: 14, gold: false, seed: 20 },
    { x: 168, y: 266, w: 58, h: 86, apples: 6, gold: true, seed: 30 },
    { x: 260, y: 268, w: 62, h: 92, apples: 8, gold: false, seed: 40 },
    { x: 562, y: 278, w: 90, h: 136, apples: 15, gold: true, seed: 50 },
    { x: 622, y: 272, w: 72, h: 112, apples: 10, gold: false, seed: 60 },
  ];
  for (const t of orchardTrees) {
    R.ellipse(t.x - 2, t.y + 1, Math.round(t.w * 0.25), 3.6, C('#122014', 82));
    const spr = treeSprite({
      w: t.w, h: t.h,
      pal: PAL.leaf,
      bark: PAL.bark,
      seed: t.seed,
      lx: lxAt(t.x),
      puff: 7.5,
      stray: 0,
      ink: INK,
    });
    const bx = Math.round(t.x - t.w / 2), by = t.y - t.h;
    R.blit(spr, bx, by);
    // hang plump glossy crimson & golden apples throughout the canopy
    const ar = rnd(t.seed + 99);
    for (let k = 0; k < t.apples; k++) {
      const ax = t.x + (ar() - 0.5) * (t.w * 0.62);
      const ay = by + 16 + ar() * (t.h * 0.44);
      if (spr.has(Math.round(ax - bx), Math.round(ay - by))) {
        drawApple(R, ax, ay, (t.gold ? k % 3 !== 0 : k % 4 === 0), 0.9, true);
      }
    }
  }

  return R;
}

// ============ NEAR LAYER: SPLIT-RAIL ORCHARD FENCE & APPLE CRATES ============
export function buildNearS3(W) {
  const H = 310, R = new Raster(W, H);
  const Y0 = 266;

  // Sunlit orchard split-rail fence (open gap x = 376..452 facing the open barn doorway)
  const postXs = [];
  for (let x = 22; x < 370; x += 38) postXs.push(x);
  for (let x = 456; x < 632; x += 38) postXs.push(x);

  const drawRails = (x0, x1) => {
    for (const ry of [Y0 + 5, Y0 + 13]) {
      for (let x = x0; x <= x1; x++) {
        const sag = Math.round(Math.sin((x - x0) / (x1 - x0 + 1) * Math.PI) * 1.2);
        R.set(x, ry + sag, PAL.timber[5]);
        R.set(x, ry + sag + 1, PAL.timber[3]);
        R.set(x, ry + sag + 2, PAL.timber[1]);
      }
    }
  };
  for (let i = 0; i < postXs.length - 1; i++) {
    if (postXs[i + 1] - postXs[i] < 48) drawRails(postXs[i], postXs[i + 1]);
  }
  for (const px of postXs) {
    R.ellipse(px - 1, Y0 + 21, 5, 2, C('#122014', 82));
    R.rect(px - 2, Y0, 4, 21, PAL.timber[3]);
    R.rect(px - 1, Y0, 2, 20, PAL.timber[5]);
    R.rect(px - 2, Y0 - 1, 4, 1, INK);
    if (px % 76 === 22) { // climbing ivy sprigs on alternating posts
      R.set(px - 2, Y0 + 12, PAL.leaf[4]); R.set(px + 2, Y0 + 9, PAL.leaf[5]);
      R.set(px - 1, Y0 + 16, PAL.leaf[3]);
    }
  }

  // Stacked apple-harvest bushel crates beside the left orchard tree & right fence
  const drawCrate = (cx, cy, gold = false) => {
    R.ellipse(cx - 2, cy + 1, 11, 2.8, C('#122014', 86));
    const S = new Raster(22, 18);
    S.rect(2, 4, 18, 12, PAL.timber[3]);
    S.rect(2, 4, 18, 2, PAL.timber[5]);
    S.rect(2, 10, 18, 2, PAL.timber[4]);
    S.rect(2, 4, 3, 12, PAL.timber[4]);
    S.rect(17, 4, 3, 12, PAL.timber[2]);
    drawApple(S, 7, 4, gold, 0.85, false);
    drawApple(S, 11, 3, !gold, 0.9, false);
    drawApple(S, 15, 4, gold, 0.85, false);
    S.outline(INK, false);
    R.blit(S, cx - 11, cy - 16);
  };
  drawCrate(128, Y0 + 20, false);
  drawCrate(148, Y0 + 21, true);
  drawCrate(530, Y0 + 20, false);

  return R;
}

// ============ GROUND: DAPPLED ORCHARD TURF, STICKY CIDER PUDDLES & FALLEN APPLES ============
export function buildGroundS3(W) {
  const H = 420, R = new Raster(W, H);
  const edge = x => GRASS_Y + Math.round(fbm1(x / 12, 43, 3) * 2.5);

  for (let x = 0; x < W; x++) for (let y = edge(x); y < H; y++) {
    const dap = noise2(x / 52, y / 14, 21);
    const sunDap = noise2(x / 20, y / 9, 44);
    let t = 0.56 + (dap - 0.5) * 0.42 - (y - GRASS_Y) * 0.001;
    // Cool sun-dappled canopy shade beneath left and right apple trees (with golden coin-of-sun spots!)
    const shadeL = Math.max(0, 1 - Math.hypot((x - 92) / 78, (y - 310) / 36));
    const shadeR = Math.max(0, 1 - Math.hypot((x - 562) / 82, (y - 312) / 38));
    if (Math.max(shadeL, shadeR) > 0.25) {
      t += sunDap > 0.64 ? 0.14 : -0.17;
    }
    R.set(x, y, band(PAL.grass, t, x, y, 0.1));
  }

  // Beaten sunlit ochre path (`PATH_Y`) with twin cider-wagon wheel ruts + branch curving up to open barn doors (`BARN_DOOR_X`)
  for (let x = 0; x < W; x++) {
    const py = PATH_Y(x);
    const hw = 14 + Math.round(fbm1(x / 24, 17, 2) * 3);
    for (let dy = -hw; dy <= hw; dy++) {
      const y = py + dy;
      if (y < edge(x) || y >= H) continue;
      const dist = Math.abs(dy) / hw;
      if (dist > 0.88 && h2(x, y, 5) > 0.45) continue;
      let t = 0.64 - dist * 0.22 + (noise2(x / 16, y / 7, 13) - 0.5) * 0.16;
      if (Math.abs(dy + 3) <= 0.8 || Math.abs(dy - 3) <= 0.8) t -= 0.18;
      R.set(x, y, band(PAL.dirt, t, x, y, 0.09));
    }
  }
  for (let y = GRASS_Y - 1; y < PATH_Y(BARN_DOOR_X) - 2; y++) {
    const k = clamp((y - GRASS_Y) / 36);
    const cx = BARN_DOOR_X - Math.round(k * 10);
    const hw = 14 + Math.round(k * 6);
    for (let dx = -hw; dx <= hw; dx++) {
      const dist = Math.abs(dx) / hw;
      if (dist > 0.9 && h2(cx + dx, y, 9) > 0.5) continue;
      let t = 0.60 - dist * 0.20;
      if (Math.abs(dx + 5) <= 0.8 || Math.abs(dx - 5) <= 0.8) t -= 0.16;
      R.set(cx + dx, y, band(PAL.dirt, t, cx + dx, y, 0.08));
    }
  }

  // Orchard wild clover, white apple blossoms, buttercups & half-sunk mossy fieldstones
  const FL = [
    [C('#fff6ea'), C('#ffd858')], [C('#ffe14d'), C('#c98e1a')],
    [C('#f5b4be'), C('#fff2f4')], [C('#82a8f6'), C('#4058b0')],
  ];
  const gr = rnd(143);
  for (let i = 0; i < 210; i++) {
    const fx = Math.floor(gr() * W), fy = GRASS_Y + 4 + Math.floor(gr() * 78);
    if (Math.abs(fy - PATH_Y(fx)) < 13) continue;
    const fl = FL[Math.floor(gr() * FL.length)];
    R.set(fx, fy, fl[0]);
    if (gr() > 0.5) R.set(fx + 1, fy, fl[1]);
  }
  for (const [sx, sy, rw] of [[188, 294, 5], [292, 336, 4], [448, 342, 5], [588, 304, 4]]) {
    R.ellipse(sx, sy, rw, 2.2, (x, y, u, v) => band(PAL.stone, 0.58 - v * 0.25, x, y));
    R.set(sx - 1, sy - 1, PAL.leaf[4]);
  }

  // Sun-dappled grass tufts bordering the path and orchard trunks
  for (let x = 14; x < W - 14; x += 18) {
    const py = PATH_Y(x);
    if (h2(x, 1, 7) > 0.35) tuft(R, x + Math.round(h2(x, 2, 7) * 6), py - 14, 4, -0.3);
    if (h2(x, 3, 7) > 0.35) tuft(R, x + Math.round(h2(x, 4, 7) * 6), py + 17, 5, 0.3);
  }

  // ---- FOREGROUND TILTED LEAKING CIDER BARREL + STICKY AMBER PUDDLE (x = 486, y = 306) ----
  R.ellipse(484, 307, 11, 3, C('#122014', 86));
  drawBarrel(R, 486, 306, 17, 22, -1, 77);
  // Extend extra wide sticky amber cider pool glistening on the dirt edge
  R.ellipse(473, 309, 14, 4.5, (x, y, u, v) => band(PAL.cider, 0.58 - v * 0.24 + (h2(x, y, 91) > 0.85 ? 0.2 : 0), x, y));
  R.rect(468, 308, 4, 1, PAL.cider[5]);
  R.rect(477, 310, 3, 1, PAL.cider[5]);

  // Scattered fallen red & golden apples nestled in grass around the orchard
  const fallen = [
    [76, 290, false], [104, 294, true], [136, 292, false], [154, 298, false],
    [244, 318, true], [318, 314, false], [526, 310, false], [552, 296, true], [584, 291, false],
  ];
  for (const [ax, ay, isGold] of fallen) {
    drawApple(R, ax, ay, isGold, 0.96, true);
  }

  return R;
}

// ============ STANDING HEDRUN GIFT SPRITE (Stage 3 Clear: holding Potions of Healing!) ============
export function buildHedrunGiftSprite() {
  const w = 36, h = 44;
  const R = new Raster(w, h);
  const cx = 18;
  const HAT = P(['#583a16', '#865b22', '#b88332', '#dfad4a', '#fae07e']);
  const SHIRT = P(['#6e5642', '#9c7c60', '#c8a888', '#ecd4b6']);
  const DENIM = P(['#243858', '#36527c', '#4c70a2', '#6c94c8']);
  const SKIN = P(['#6e3e2a', '#a46444', '#d48d66', '#f2b894']);
  const BEARD = P(['#4e4240', '#7e706c', '#b4a8a2', '#e4dcd6']);
  const POTION = P(['#5a0a16', '#9e1424', '#de2a38', '#ff6e74', '#ffd8dc']);

  // sturdy leather boots
  R.rect(cx - 6, 36, 5, 5, PAL.bark[2]); R.rect(cx + 1, 36, 5, 5, PAL.bark[1]);
  // denim overalls legs & bib
  R.rect(cx - 6, 27, 5, 9, DENIM[1]); R.rect(cx + 1, 27, 5, 9, DENIM[2]);
  R.rect(cx - 7, 17, 14, 11, DENIM[2]);
  R.rect(cx - 5, 19, 10, 8, DENIM[3]);
  // linen shirt shoulders & extended welcoming arms
  R.rect(cx - 9, 16, 4, 7, SHIRT[2]);
  R.rect(cx + 5, 16, 4, 7, SHIRT[3]);
  // warm smiling weathered farmer head & grey beard
  R.ellipse(cx, 11, 5, 5, (x, y, u, v) => band(SKIN, 0.65 - v * 0.25, x, y));
  R.rect(cx - 2, 10, 1, 1, INK); R.rect(cx + 2, 10, 1, 1, INK); // cheerful eyes
  R.ellipse(cx, 15, 4.5, 3, (x, y, u, v) => band(BEARD, 0.72 - v * 0.28, x, y));
  // wide straw farm hat
  R.rect(cx - 10, 6, 20, 2, HAT[3]);
  R.rect(cx - 9, 5, 18, 1, HAT[4]);
  R.rect(cx - 5, 2, 10, 4, HAT[2]);
  R.rect(cx - 4, 2, 8, 2, HAT[3]);
  // three glowing ruby Potions of Healing cradled forward in his hands!
  for (const [px, py] of [[cx - 9, 20], [cx, 18], [cx + 8, 20]]) {
    R.rect(px - 2, py, 5, 6, POTION[2]);
    R.rect(px - 1, py + 1, 3, 4, POTION[3]);
    R.set(px - 1, py + 1, POTION[4]); // bright glass highlight
    R.rect(px - 1, py - 2, 3, 2, PAL.timber[4]); // cork
  }
  R.rect(cx - 9, 24, 3, 3, SKIN[2]);
  R.rect(cx + 6, 24, 3, 3, SKIN[2]);

  R.outline(INK, false);
  return R.toCanvas();
}
