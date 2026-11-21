// Elminster Aumar, the Old Mage of Shadowdale — perched on the top rail of the
// meadow fence, three-quarter view turned toward the hero (left), legs dangling,
// long-stemmed pipe in hand — plus the 72×72 speech-HUD portrait. All hand-shaded.
import { C, P, Raster, ramp, mixC, darken, lighten, h2, clamp, PAL } from './common.js';
import { noise2 } from '../util.js';
import { ScaledRaster } from '../pix.js';

export const EK = 1.12;
const DW = 52, DH = 74;
export const ELM_W = DW, ELM_H = DH, ELM_FEET = 66;
export const ELM_SEAT_ROW = Math.round(51 * EK);            // sprite row resting on the fence's top rail
export const ELM_HEAD_X = Math.round(25 * EK);              // speech-bubble anchor (hat brim centre)
export const ELM_PIPE = { bowl: [Math.round(7.5 * EK), Math.round(30.5 * EK)], mouth: [Math.round(18 * EK), Math.round(31 * EK)] };

const ROBE = P(['#1b1a26', '#272636', '#363548', '#48485e', '#5d5e76', '#777a91', '#9599ad', '#b8bccb']);
const HAT = P(['#1f1712', '#30241b', '#453426', '#5c4633', '#755b41', '#917452', '#ad9068']);
const BEARD = P(['#5a5566', '#7c7788', '#a19cad', '#c5c2ce', '#e0dee7', '#f4f3f8', '#ffffff']);
const SKIN = P(['#503026', '#7d4f3d', '#a96f52', '#cb9370', '#e5b693', '#f6d4b2']);
const GOLD = P(['#5a3510', '#8a5a1a', '#bd8a2e', '#e5b84d', '#f8de86']);
const LEA = P(['#22140c', '#3a2415', '#553520', '#724a2c', '#90623c', '#ad7c50']);
const PIPE = P(['#2a170c', '#4a2c16', '#6e4322', '#93602f', '#b98245']);
const SOCK = P(['#24222c', '#36333f', '#4a4655', '#605b6b']);
const OUT = C('#140c16');
const CRYS = P(['#3d6e8a', '#6fb3d0', '#bfeaf5', '#ffffff']);

// sun from the LEFT. Cloth shader: base value, darker to the right, soft vertical folds.
const cloth = (pal, base, foldF = 2.3, foldA = 0.1, slope = 0.02, x0 = 26) => (x, y) =>
  ramp(pal, clamp(base - (x - x0) * slope + Math.sin(x / foldF + Math.sin(y / 5) * 0.8) * foldA + (h2(x | 0, y | 0, 3) - 0.5) * 0.05), x, y, 0.5);

export function elminsterFrame({ mouth = 0, blink = 0, bob = 0 } = {}) {
  const R = new ScaledRaster(DW, DH, EK);
  const b = bob;
  // ---------- staff leaning on the rail beside him (behind everything) ----------
  for (let y = 4; y < DH - 1; y++) {
    const x = 46.5 - (y - 4) * 0.03 + Math.sin(y / 4.5) * 0.5;
    R.rect(x, y, 2, 1, (px, py) => (px - x < 1 ? PAL.wood[4] : PAL.wood[2]));
    if (y % 9 === 0) R.set(x - 1, y, PAL.wood[3]);
  }
  R.ellipse(47.5, 5, 3.2, 3, (x, y, u, v) => ramp(PAL.wood, clamp(0.5 - u * 0.3 - v * 0.2), x, y));
  R.line(45, 4, 44, 1, PAL.wood[3]); R.line(50, 4, 51, 1, PAL.wood[2]);
  R.ellipse(47.5, 2.5, 1.9, 2.3, (x, y, u, v) => ramp(CRYS, clamp(0.65 - u * 0.3 - v * 0.4), x, y));

  // ---------- dangling legs (behind the robe hem) ----------
  for (const [lx, d, sw] of [[13, 0, 0], [24, 0.22, 1.5]]) {
    R.capsule(lx, 55, lx - 0.5 + sw, 61.5, 2.6, 2.2, (x, y, s) => ramp(SOCK.map(c => darken(c, d)), clamp(0.6 - s * 0.4 - (x - lx) * 0.06), x, y));
    // curl-toed boots, toes toward the hero
    const bx = lx - 0.5 + sw, by = 63;
    R.poly([[bx - 3, by - 2], [bx + 3, by - 2], [bx + 3.5, by + 3], [bx - 6, by + 3.5], [bx - 7.5, by + 1.5], [bx - 4, by + 1]], (x, y) =>
      ramp(LEA.map(c => darken(c, d)), clamp(0.62 - (y - by) * 0.09 - (x - bx) * 0.03), x, y, 0.5));
    R.set(bx - 8, by, darken(LEA[3], d)); R.set(bx - 8, by - 1, darken(LEA[4], d));
    R.hline(bx - 3, bx + 3, by - 2, darken(LEA[5], d));
    R.hline(bx - 6, bx + 3, by + 3.5, darken(LEA[0], d));
  }

  // ---------- robe: torso and the skirt draped over the rail ----------
  R.poly([[13, 31 + b], [37, 30 + b], [41, 37 + b], [42, 48], [43, 54], [40, 58], [33, 59], [27, 57.5], [19, 59], [9, 58.5], [7, 54], [8, 50], [11, 47], [10, 38 + b]], (x, y) => {
    let t = 0.55 - (x - 14) * 0.018;
    if (y > 50) t += Math.sin(x / 1.9) * 0.12 - (y - 50) * 0.012;             // hanging folds of the skirt
    else t += Math.sin((x + y * 0.3) / 2.6) * 0.07;
    if (y > 49 && y < 53) t += 0.06;                                         // thighs catch the light
    return ramp(ROBE, clamp(t + (h2(x | 0, y | 0, 5) - 0.5) * 0.04), x, y, 0.5);
  });
  // knees under the cloth + deep fold between them
  R.ellipse(11.5, 52.5, 5, 2.8, (x, y, u, v) => ramp(ROBE, clamp(0.7 - v * 0.25 - u * 0.1), x, y, 0.5));
  R.ellipse(23.5, 52.5, 4.6, 2.5, (x, y, u, v) => ramp(ROBE, clamp(0.5 - v * 0.25 - u * 0.1), x, y, 0.5));
  R.line(18, 53, 18, 58, ROBE[1]); R.line(19, 54, 19, 58, ROBE[2]); R.line(30, 54, 31, 58, ROBE[2]);
  // ragged hem with a faded silver trim
  for (let x = 8; x <= 42; x++) {
    const hy = (x < 19 ? 58.5 : x < 28 ? 57.5 + Math.abs(x - 23) * 0.1 : 59 - (x - 28) * 0.05) + (x % 4 === 0 ? 0.6 : 0);
    R.set(x, hy, ROBE[1]); if (x % 3) R.set(x, hy - 1, ROBE[5]);
  }
  // patched square on the skirt
  R.rect(35, 52, 4, 4, (x, y) => ramp(P(['#3b2c40', '#53405a', '#6a5474']), 0.5 - (x - 35) * 0.1, x, y)); R.set(35, 52, C('#8a7394'));
  for (const [x, y] of [[34, 52], [34, 54], [39, 53], [36, 56]]) R.set(x, y, ROBE[6]);

  // ---------- far arm resting on his knee ----------
  R.capsule(37, 33 + b, 40, 44 + b, 3.6, 3.2, cloth(ROBE, 0.38, 2, 0.06, 0.02, 37));
  R.capsule(40, 44 + b, 27, 51, 3.2, 3.6, cloth(ROBE, 0.36, 2, 0.06, 0.02, 34));
  R.ellipse(25.5, 51.5, 2.4, 2.1, (x, y, u, v) => ramp(SKIN, clamp(0.45 - u * 0.2 - v * 0.2), x, y));
  R.set(24, 52, SKIN[2]); R.set(24.5, 53, SKIN[1]);

  // ---------- rope belt + pouch + a scroll tucked in ----------
  R.line(11, 46 + b, 41, 45 + b, GOLD[2]); R.line(11, 47 + b, 41, 46 + b, GOLD[1]);
  for (let x = 12; x < 41; x += 3) R.set(x, 46 + b - (x - 11) / 30, GOLD[3]);
  R.line(15, 47 + b, 14, 52 + b, GOLD[2]); R.set(14, 53 + b, GOLD[3]); R.set(15, 53 + b, GOLD[1]);   // dangling knot
  R.rect(33, 46 + b, 5, 6, (x, y) => ramp(LEA, 0.55 - (x - 33) * 0.06 - (y - 46 - b) * 0.03, x, y)); R.hline(33, 37, 46 + b, LEA[5]); R.set(35, 48 + b, GOLD[3]);
  R.rect(38, 41 + b, 2, 6, (x, y) => ramp(P(['#9c8a66', '#c9b68a', '#ece0bc']), 0.6 - (x - 38) * 0.3, x, y)); R.set(38, 41 + b, C('#b34a3a'));

  // gold-trimmed collar running down beside the beard
  R.line(14, 31 + b, 18, 46 + b, GOLD[3]); R.line(15, 31 + b, 19, 46 + b, GOLD[1]);
  R.line(35, 30 + b, 31, 46 + b, GOLD[2]); R.line(34, 30 + b, 30, 46 + b, GOLD[1]);
  // shaded far side of the torso
  R.poly([[34, 31 + b], [37, 30 + b], [41, 37 + b], [42, 48], [36, 48]], (x, y) => ramp(ROBE, clamp(0.28 + Math.sin(x / 1.6) * 0.06), x, y, 0.5));
  // ---------- head ----------
  const hy = 24 + b;
  // white hair spilling out under the brim, down to the shoulders
  R.poly([[15, hy - 3], [33, hy - 3], [36, hy + 6], [35, hy + 10], [30, hy + 8], [18, hy + 8], [13, hy + 10], [12, hy + 4]], (x, y) => {
    const s = Math.sin((x + Math.sin(y / 2.5) * 1.2) * 1.4) * 0.14;
    return ramp(BEARD, clamp(0.55 - (x - 16) * 0.016 + s), x, y, 0.4);
  });
  // face, turned 3/4 left
  R.ellipse(23, hy + 0.5, 5.6, 5.8, (x, y, u, v) => ramp(SKIN, clamp(0.62 - u * 0.28 - v * 0.08 + (h2(x | 0, y | 0) - 0.5) * 0.05), x, y, 0.5));
  R.ellipse(28.5, hy + 1, 1.4, 2.2, (x, y, u, v) => ramp(SKIN, clamp(0.38 - u * 0.1), x, y));     // ear
  // shadow of the brim across the brow
  R.hline(18, 28, hy - 3, SKIN[1]); R.hline(18, 28, hy - 2, SKIN[2]);
  // eyes: twinkling, half-lidded
  const eyes = [[20, hy - 0.5], [25, hy - 0.5]];
  for (const [ex, ey] of eyes) {
    if (blink) { R.hline(ex - 1, ex + 1, ey, SKIN[1]); continue; }
    R.set(ex - 1, ey, C('#efe9e0')); R.set(ex, ey, C('#2c5d8c')); R.set(ex + 1, ey, C('#140f1c'));
    R.hline(ex - 1, ex + 1, ey - 1, SKIN[1]);
  }
  R.set(25, hy - 1.5, C('#ffffff'));
  // great bushy brows
  for (let k = 0; k < 6; k++) { R.set(17.5 + k, hy - 2 - (k === 1 || k === 2 ? 1 : 0), BEARD[5 + (k % 2)]); R.set(23.5 + k, hy - 2 - (k === 2 ? 1 : 0), BEARD[4 + (k % 2)]); }
  R.set(16.5, hy - 1, BEARD[6]); R.set(29.5, hy - 2, BEARD[4]);
  // the famous nose
  R.ellipse(18.2, hy + 2.2, 2.3, 2.5, (x, y, u, v) => ramp(SKIN, clamp(0.72 - u * 0.12 - v * 0.3), x, y));
  R.set(17.5, hy + 1, SKIN[5]); R.set(18.5, hy + 4, SKIN[1]); R.set(19.5, hy + 4, SKIN[2]);
  // rosy cheeks
  R.set(21.5, hy + 2.5, C('#da8270')); R.set(22.5, hy + 2.5, C('#cf7663')); R.set(26.5, hy + 2.5, C('#c56c5c'));

  // ---------- beard: long white cascade to the lap ----------
  const by0 = hy + 4, md = mouth ? 1 : 0;
  R.poly([[15.5, by0], [30.5, by0], [32, by0 + 7], [30.5, by0 + 13], [28, by0 + 18], [25, by0 + 22 + md], [22.5, by0 + 19 + md], [19.5, by0 + 21 + md], [17.5, by0 + 15], [15, by0 + 8]], (x, y) => {
    const yy = y - (y > by0 + 3 ? md : 0);
    const strand = Math.sin((x + Math.sin(yy / 3.4) * 1.8) * 1.5) * 0.13;
    return ramp(BEARD, clamp(0.66 - (x - 18) * 0.02 + strand - (yy - by0) * 0.006), x, y, 0.4);
  });
  // forked tip wisps
  R.line(19.5, by0 + 21 + md, 19, by0 + 23 + md, BEARD[3]); R.line(25, by0 + 22 + md, 25.5, by0 + 24 + md, BEARD[2]);
  if (mouth) { R.hline(19, 23, by0 + 2, C('#3a1c1c')); R.hline(20, 22, by0 + 3, C('#5a2a26')); }
  // moustache sweeping out over the pipe stem
  R.poly([[15, by0 - 0.5], [20, by0 - 1.5], [24, by0 - 0.5], [29, by0 + 0.5], [30, by0 + 3], [26, by0 + 2], [21, by0 + 1.5], [16, by0 + 3], [14, by0 + 2]], (x, y) =>
    ramp(BEARD, clamp(0.8 - (x - 15) * 0.02 + Math.sin(x * 1.3) * 0.07), x, y));

  // ---------- near arm: bell sleeve raised, hand holding the pipe ----------
  R.poly([[15, 31 + b], [19, 33 + b], [17, 41 + b], [13, 44 + b], [7, 41 + b], [6, 37 + b], [10, 35 + b]], (x, y) => {
    const fold = Math.sin((x - y * 0.8) / 1.7) * 0.11;
    return ramp(ROBE, clamp(0.66 - (x - 8) * 0.02 + fold), x, y, 0.5);
  });
  R.ellipse(8, 38.5 + b, 3.4, 4, (x, y, u, v) => ramp(ROBE, clamp(0.32 + u * 0.1 + v * 0.1), x, y));    // sleeve mouth (dark inside)
  R.line(5, 36 + b, 7, 42 + b, ROBE[6]);
  R.ellipse(8.2, 35 + b, 2.3, 2.2, (x, y, u, v) => ramp(SKIN, clamp(0.62 - u * 0.25 - v * 0.2), x, y));
  R.set(9.5, 36 + b, SKIN[2]);
  // the pipe: curved stem from the moustache, bowl cupped in his hand
  R.line(17, by0 + 2.5, 11, by0 + 5, PIPE[2]); R.line(17, by0 + 3.5, 11, by0 + 6, PIPE[1]);
  R.rect(5.5, 29.5 + b, 4, 4.5, (x, y) => ramp(PIPE, clamp(0.68 - (x - 5.5) * 0.12 - (y - 29.5 - b) * 0.05), x, y));
  R.hline(5.5, 9, 29.5 + b, PIPE[0]); R.set(5, 30.5 + b, PIPE[2]); R.set(5, 31.5 + b, PIPE[1]);

  // ---------- the hat: wide floppy brim, tall battered cone with a drooping tip ----------
  R.poly([[16, hy - 5], [20, hy - 12], [23, hy - 17], [27, hy - 21], [32, hy - 23.5], [37, hy - 23], [40, hy - 20.5], [38.5, hy - 19.5], [35, hy - 21], [31.5, hy - 19], [30, hy - 14], [32, hy - 5]], (x, y) => {
    const crumple = Math.sin((x * 0.9 + y * 1.4) / 2) * 0.11;
    return ramp(HAT, clamp(0.58 - (x - 18) * 0.024 + crumple), x, y, 0.5);
  });
  R.line(30, hy - 18, 31, hy - 10, HAT[1]);                                     // dent crease
  R.rect(25, hy - 13, 3, 3, C('#5a3a4e')); R.set(25, hy - 13, C('#7a5266')); R.set(27, hy - 11, C('#3a2434'));   // patch
  // band with a tarnished star
  R.poly([[16.5, hy - 7], [31.5, hy - 8], [32, hy - 5.5], [16, hy - 4.5]], (x, y) => ramp(P(['#2b2236', '#3f3350', '#56476a']), clamp(0.6 - (x - 16) * 0.03), x, y));
  R.set(20, hy - 7, GOLD[4]); R.set(19, hy - 6, GOLD[3]); R.set(21, hy - 6, GOLD[3]); R.set(20, hy - 5, GOLD[2]); R.set(20, hy - 6, GOLD[4]);
  // brim (droops toward the left, lifted at the back)
  R.poly([[7, hy - 1], [12, hy - 4.5], [20, hy - 6], [30, hy - 6.5], [38, hy - 5.5], [42, hy - 4], [39, hy - 2.5], [31, hy - 2.5], [22, hy - 2], [14, hy - 0.5]], (x, y) => {
    const top = y < hy - 3.6 - (x < 20 ? (20 - x) * 0.12 : 0);
    let t = top ? 0.62 - (x - 12) * 0.016 : 0.2;
    if (x < 11) t += 0.06;
    return ramp(HAT, clamp(t + Math.sin(x / 2.2) * 0.05), x, y, 0.5);
  });

  // ---------- light: warm rim from the low sun on the left, then ink ----------
  R.rim(-1, 0, (c, x, y) => mixC(c, PAL.rim, y < 46 * EK ? 0.5 : 0.25));
  R.rim(0, -1, (c, x, y) => (y < 30 * EK ? mixC(c, PAL.rim, 0.32) : c));
  R.outline(OUT, false);
  return R;
}

export function buildElminster() {
  return {
    idle: elminsterFrame({}).toCanvas(),
    breathe: elminsterFrame({ bob: 1 }).toCanvas(),
    talk: elminsterFrame({ mouth: 1, bob: 0 }).toCanvas(),
    talkB: elminsterFrame({ mouth: 0, bob: 1 }).toCanvas(),
    blink: elminsterFrame({ blink: 1 }).toCanvas(),
  };
}

// ================= HUD PORTRAIT (72×72, three-quarter view facing right, toward the text) =================
// A close-framed RPG bust rebuilt for readability: both blue eyes open and twinkling on one
// eyeline under shaggy white brows, a bulbous but PROPORTIONED nose, a mouth that shows between
// two moustache wings, and a beard of fat ropey locks instead of a combed curtain. The battered
// hat, the pipe, the dusk halo and the robe stay — the face is what was rebuilt.
export const PORTRAIT_PIPE = [64, 40];                        // top of the pipe bowl (for the smoke)
export function buildPortrait(open = 0) {
  const S = 72, R = new Raster(S, S);
  const D = 0.2;
  const sh = (pal, t, x, y, d = D) => ramp(pal, clamp(t), x, y, d);
  const L = () => new Raster(S, S);
  const ink = (r, col, amt = 0.5) => r.outline(col, false, amt);
  // ---------- backdrop: dusk sky, warm halo behind the head ----------
  const BG = P(['#1a1430', '#241a42', '#33245a', '#4a3270', '#664283', '#8a5590', '#b26e94', '#d68d95']);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const halo = Math.max(0, 1 - Math.hypot((x - 36) / 38, (y - 28) / 34));
    R.set(x, y, sh(BG, 0.12 + halo * 0.72 + y / S * 0.08, x, y, 0.5));
  }
  for (const [x, y] of [[4, 4], [2, 15], [68, 22], [70, 50]]) R.set(x, y, C('#e9dcff'));
  for (const [x, y] of [[9, 8]]) { R.set(x, y, C('#fff7e0')); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) R.set(x + dx, y + dy, C('#9a86c0')); }

  // ---------- robe: shoulders at the bottom corners ----------
  const robe = L();
  robe.poly([[-2, 73], [-2, 58], [8, 52], [20, 50], [54, 50], [66, 53], [74, 58], [74, 73]], (x, y) => {
    let t = 0.42 + (x - 36) * 0.006 - (y - 50) * 0.006;
    if (x < 12) t -= 0.12;
    return sh(ROBE, t, x, y);
  });
  for (let y = 56; y < 72; y++) { robe.set(Math.round(6 + (y - 56) * 0.3), y, sh(ROBE, 0.12, 0, y, 0)); robe.set(Math.round(7 + (y - 56) * 0.3), y, sh(ROBE, 0.44, 0, y, 0)); }
  for (let y = 58; y < 72; y++) { robe.set(Math.round(66 - (y - 58) * 0.2), y, sh(ROBE, 0.28, 0, y, 0)); robe.set(Math.round(67 - (y - 58) * 0.2), y, sh(ROBE, 0.66, 0, y, 0)); }
  robe.poly([[9, 52], [15, 51], [20, 72], [13, 72]], (x, y) => sh(GOLD, 0.45 + (x - 9) * 0.04, x, y));
  robe.poly([[58, 51], [64, 53], [60, 72], [53, 72]], (x, y) => sh(GOLD, 0.62 + (x - 56) * 0.03, x, y));
  ink(robe, OUT);

  // ---------- long hair behind, curtains framing the face ----------
  const hair = L();
  hair.capsule(13, 18, 9, 52, 4.6, 3.4, (x, y, sv) => sh(BEARD, 0.4 - sv * 0.12 + (Math.sin((x + Math.sin(y / 3) * 1.4) * 1.5) > 0.5 ? 0.12 : -0.06), x, y));
  hair.capsule(55, 18, 57, 46, 4.2, 3.2, (x, y, sv) => sh(BEARD, 0.3 - sv * 0.1 + (Math.sin((x + Math.sin(y / 3) * 1.4) * 1.5) > 0.5 ? 0.12 : -0.06), x, y));
  ink(hair, C('#3c3850'));

  // ---------- face ----------
  const face = L();
  face.poly([[19, 15], [47, 15], [50, 22], [49, 36], [44, 44], [25, 44], [19, 36], [17, 24]], (x, y) => {
    const u = (x - 33) / 17, v = (y - 29) / 15;
    let t = 0.6 + u * 0.2 - v * 0.07;
    if (x < 22) t -= (22 - x) * 0.035;                        // temple shade melting into the hair
    if (y < 20) t -= (20 - y) * 0.02;                         // soft shadow under the brim
    const cbk = Math.hypot((x - 27) / 6.5, (y - 33) / 3);     // the near cheekbone catching the light
    if (cbk < 1) t += 0.14 * (1 - cbk);
    const cb2 = Math.hypot((x - 44) / 4, (y - 32) / 2.6);     // the far cheek, smaller in perspective
    if (cb2 < 1) t += 0.08 * (1 - cb2);
    return sh(SKIN, t, x, y);
  });
  // ear on the near side
  face.ellipse(17.5, 29.5, 2.8, 4.4, (x, y, u, v) => sh(SKIN, 0.44 + u * 0.2 - v * 0.08, x, y, 0));
  for (const [x, y] of [[17, 28], [17, 29], [17, 30], [18, 31], [16, 27]]) face.set(x, y, SKIN[1]);
  // forehead wrinkles
  for (const [x, y] of [[26, 19], [27, 19], [28, 19], [29, 19], [33, 18], [34, 18], [35, 18], [36, 18], [40, 19], [41, 19], [42, 19],
                        [28, 21], [29, 21], [30, 21], [35, 20], [36, 20], [37, 20]]) face.set(x, y, SKIN[2]);
  // rosy cheeks — high on both cheekbones
  for (let y = 30; y <= 33; y++) for (let x = 23; x <= 29; x++) if (Math.hypot((x - 26) / 3, (y - 31.6) / 1.7) < 1) face.set(x, y, mixC(face.get(x, y), C('#e0705c'), 0.24));
  for (let y = 30; y <= 32; y++) for (let x = 43; x <= 47; x++) if (Math.hypot((x - 45) / 2.2, (y - 31) / 1.5) < 1) face.set(x, y, mixC(face.get(x, y), C('#e0705c'), 0.2));

  // ---- eyes: both open, one eyeline, bright blue and twinkling ----
  const ey = 26;
  const eye = (x0, w, ix, far = false) => {
    if (open === 2) {                                            // closed: a contented curve
      face.hline(x0, x0 + w - 1, ey + 1, SKIN[0]); face.set(x0 - 1, ey + 2, SKIN[1]); face.set(x0 + w, ey + 2, SKIN[1]);
      face.hline(x0 + 1, x0 + w - 2, ey + 2, SKIN[2]); return;
    }
    face.hline(x0, x0 + w - 1, ey, C('#f2ece2'));                 // the white, two rows tall
    face.hline(x0 + 1, x0 + w - 2, ey + 1, C('#e8e0d2'));
    face.rect(ix, ey - 1, 2, 3, C('#3f8ad0'));                    // iris, tucked under the upper lid
    face.set(ix + 1, ey, C('#14203a'));                           // pupil
    face.set(ix, ey + 1, C('#2c66a8'));
    face.set(ix, ey - 1, C('#bfe4ff'));
    face.hline(x0 - 1, x0 + w, ey - 2, SKIN[1]);                  // the upper lid
    face.set(x0 - 1, ey, SKIN[1]); face.set(x0 + w, ey, SKIN[1]);
    face.hline(x0 + 1, x0 + w - 2, ey + 2, mixC(SKIN[2], SKIN[3], 0.4));   // the lower lid, soft
    if (!far) { face.set(x0 - 2, ey + 1, SKIN[2]); face.set(x0 - 2, ey - 1, SKIN[2]); }   // a crow's-foot hint, near side only
  };
  eye(23, 7, 26); eye(39, 5, 41, true);
  ink(face, C('#4a2420'), 0.5);

  // ---------- nose: its own layer — it hangs OVER the moustache, as noses do ----------
  const nose = L();
  for (let y = 25; y <= 30; y++) { nose.set(34, y, mixC(SKIN[4], SKIN[3], 0.4)); nose.set(35, y, mixC(SKIN[3], SKIN[2], 0.3)); }
  nose.ellipse(35, 32.5, 4.0, 3.0, (x, y, u, v) => sh(SKIN, 0.64 + u * 0.3 - v * 0.3 - (u * u + v * v > 0.45 && v > 0.15 ? 0.34 : 0), x, y, 0));
  nose.set(32, 30, SKIN[5]); nose.set(33, 30, SKIN[5]); nose.set(32, 29, C('#fff0dc'));
  for (const [x, y] of [[30, 31], [30, 32], [31, 33], [31, 34]]) nose.set(x, y, mixC(SKIN[1], C('#4a2420'), 0.25));   // where the nose meets the cheek
  nose.set(38, 34, mixC(SKIN[1], C('#4a2420'), 0.3)); nose.set(38, 35, C('#4a2420')); nose.set(39, 35, C('#4a2420')); nose.set(39, 36, SKIN[0]);   // nostril wing
  nose.set(34, 36, C('#4a2420')); nose.set(35, 36, C('#4a2420')); nose.set(36, 36, C('#4a2420')); nose.set(37, 36, mixC(SKIN[1], C('#4a2420'), 0.5));   // the shadow it casts
  nose.set(33, 36, mixC(SKIN[1], C('#4a2420'), 0.3));

  // ---------- beard: fat ropey locks, not a curtain ----------
  const beard = L();
  for (const [bx, len, w] of [[16, 22, 4.4], [23, 28, 4.8], [31, 30, 5.0], [39, 29, 4.8], [47, 26, 4.4], [53, 20, 3.8]]) {
    beard.capsule(bx, 38, bx + Math.sin(bx * 1.7) * 2, 38 + len, w, w * 0.72, (x, y, sv) => {
      const strand = Math.sin((x + Math.sin(y / 3.2) * 1.6) * 1.7) * 0.13;
      return sh(BEARD, clamp(0.64 - (y - 38) * 0.008 + strand - sv * 0.18), x, y, 0.15);
    });
  }
  // lock tips
  for (const [x, y] of [[16, 61], [23, 67], [31, 69], [39, 68], [47, 65], [53, 59]]) { beard.set(x, y, BEARD[5]); beard.set(x, y + 1, BEARD[4]); }
  // the mouth, tucked between the moustache wings
  if (open === 1) { beard.ellipse(35.5, 41.5, 2.6, 1.8, C('#2a1216')); beard.hline(33, 38, 40, C('#7a3434')); }
  else { beard.hline(33, 38, 40, C('#3a1c1c')); }
  ink(beard, C('#4a4660'), 0.5);
  // moustache: two heavy wings swept down and out from under the nose, mouth left bare between
  const mst = L();
  mst.poly([[36, 36], [30, 36.5], [24, 39], [20, 43], [20, 46], [24, 46], [29, 43], [34, 40]], (x, y) => {
    const g = Math.sin((x * 0.9 + y * 1.4) * 0.9);
    return sh(BEARD, 0.78 - (36 - x) * 0.012 - (y - 37) * 0.028 + (g > 0.6 ? 0.1 : g < -0.7 ? -0.12 : 0), x, y, 0);
  });
  mst.poly([[37, 36], [43, 36.5], [49, 39], [53, 43], [53, 46], [49, 46], [44, 43], [39, 40]], (x, y) => {
    const g = Math.sin((x * 0.9 + y * 1.4) * 0.9);
    return sh(BEARD, 0.74 - (x - 37) * 0.012 - (y - 37) * 0.028 + (g > 0.6 ? 0.1 : g < -0.7 ? -0.12 : 0), x, y, 0);
  });
  mst.set(27, 38, BEARD[5]); mst.set(45, 38, BEARD[5]);       // a silver glint on each wing
  // the moustache casts a soft shadow into the beard beneath
  for (let x = 22; x <= 52; x++) {
    let yb = 0; for (let y = 49; y > 38; y--) if (mst.has(x, y)) { yb = y; break; }
    for (const d of [2, 3]) if (yb && beard.has(x, yb + d)) beard.set(x, yb + d, mixC(beard.get(x, yb + d), C('#6a6684'), d === 2 ? 0.5 : 0.25));
  }
  ink(mst, C('#5a5670'), 0.5);

  // ---------- pipe ----------
  const pipe = L();
  const [pbx, pby] = PORTRAIT_PIPE;
  pipe.line(50, 44, pbx - 3, pby + 8, PIPE[3], 2); pipe.line(51, 45, pbx - 3, pby + 9, PIPE[1]);
  pipe.poly([[pbx - 4, pby], [pbx + 4, pby], [pbx + 4, pby + 7], [pbx + 2, pby + 10], [pbx - 2, pby + 10], [pbx - 4, pby + 7]], (x, y) => sh(PIPE, 0.8 - (x - pbx + 4) * 0.07 - (y - pby) * 0.04, x, y, 0));
  pipe.hline(pbx - 3, pbx + 3, pby, C('#ff7a2a')); pipe.set(pbx, pby, C('#ffd27a')); pipe.set(pbx - 1, pby, C('#ffb04a')); pipe.set(pbx + 1, pby, C('#ffb04a'));
  pipe.hline(pbx - 3, pbx + 3, pby + 1, PIPE[0]);
  ink(pipe, C('#1e0f08'));

  // ---------- hat: brim across the top, crown cropped by the frame, bent tip flopping into view ----------
  const hat = L();
  const crownC = y => 33 + (12 - y) * 0.35;
  for (let y = -2; y <= 12; y++) {
    const c = crownC(y), w = 16 - (12 - y) * 0.42;
    for (let x = Math.floor(c - w); x <= Math.ceil(c + w); x++) {
      const u = (x + 0.5 - c) / w; if (Math.abs(u) > 1) continue;
      let t = 0.42 + u * 0.36 + (u > 0.6 ? 0.12 : 0);
      if (y === 5 && u > -0.5 && u < 0.8) t -= 0.16;              // crumple
      if (y === 6 && u > -0.5 && u < 0.8) t += 0.08;
      hat.set(x, y, sh(HAT, t, x, y));
    }
  }
  // the bent tip, folded over and hanging down the right side
  hat.capsule(46, 1, 58, 3, 3.2, 2.4, (x, y, sv, tv) => sh(HAT, 0.5 - sv * 0.24 - tv * 0.06, x, y, 0));
  hat.capsule(58, 3, 63, 10, 2.4, 1.2, (x, y, sv) => sh(HAT, 0.36 - sv * 0.16, x, y, 0));
  // patch
  hat.rect(22, 2, 6, 5, (x, y) => sh(HAT, 0.66 + (y === 2 ? 0.1 : 0), x, y, 0));
  for (const [x, y] of [[21, 3], [21, 5], [28, 2], [28, 4], [28, 6], [24, 7]]) hat.set(x, y, C('#d9c69a'));
  // band + buckle
  for (let x = 17; x <= 49; x++) { hat.set(x, 9, HAT[1]); hat.set(x, 10, HAT[0]); hat.set(x, 11, HAT[1]); }
  hat.rect(38, 8, 5, 4, GOLD[3]); hat.rect(39, 9, 3, 2, HAT[0]); hat.set(38, 8, GOLD[4]); hat.set(42, 11, GOLD[1]);
  // brim
  for (let x = -2; x <= 74; x++) {
    const k = (x - 36) / 38;
    const top = Math.round(12 + k * k * 5 + (x < 36 ? -k * 1.5 : 0));
    const th = Math.max(3, Math.round(4.6 - Math.abs(k) * 1.6));
    for (let y = top; y <= top + th; y++) {
      const under = y >= top + th - 1;
      hat.set(x, y, sh(HAT, (under ? (y === top + th ? 0.06 : 0.16) : 0.48) + k * 0.2 + (y === top ? 0.2 : 0), x, y, 0));
    }
  }
  ink(hat, C('#170e0a'), 0.5);

  // ---------- brows: great shaggy arches, flyaway tufts ----------
  const brows = L();
  const lift = open === 1 ? 1 : 0;
  const tuft = pts => { for (const [x, y, k] of pts) brows.set(x, y - lift, BEARD[k]); };
  // near brow (left): a shaggy row ABOVE the eye with flyaway tufts, skin showing between
  for (let x = 22; x <= 32; x++) {
    const a = (x - 22) / 10;
    const y = Math.round(22 - Math.sin(a * Math.PI * 0.9) * 1.2 + (x < 25 ? (24 - x) * 0.3 : 0));
    tuft([[x, y, x % 2 ? 4 : 3]]);
    if (x % 3 === 0) tuft([[x, y + 1, x % 2 ? 3 : 4]]);
    if (x === 25 || x === 28) tuft([[x, y - 1, 5]]);
  }
  tuft([[21, 22, 4], [33, 21, 3], [34, 21, 4]]);
  // far brow (right)
  for (let x = 38; x <= 45; x++) {
    const a = (x - 38) / 7;
    const y = Math.round(22 - Math.sin(a * Math.PI) * 1);
    tuft([[x, y, x % 2 ? 4 : 3]]);
    if (x % 4 === 0) tuft([[x, y + 1, 2]]);
  }
  tuft([[46, 21, 4], [41, 20, 4]]);
  ink(brows, C('#6a6478'), 0.5);
  // the outline is only wanted where the brows meet skin from below (a cast shadow), not above
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const c = brows.d[y * S + x]; if (!c) continue;
    if ((c & 0xffffff) === (C('#6a6478') & 0xffffff)) { const above = y > 0 && brows.d[(y - 1) * S + x] && (brows.d[(y - 1) * S + x] & 0xffffff) !== (C('#6a6478') & 0xffffff); brows.d[y * S + x] = above ? mixC(SKIN[1], C('#6a6478'), 0.3) : 0; }
  }

  for (const r of [hair, robe, face, beard, mst, nose, pipe, hat, brows]) R.blit(r, 0, 0);

  // ---------- lighting ----------
  // brim shadow across the forehead
  for (let y = 15; y <= 22; y++) for (let x = 0; x < S; x++) {
    if (!face.has(x, y) || hat.has(x, y) || brows.has(x, y)) continue;
    let top = 0; for (let yy = y; yy >= 0; yy--) if (hat.has(x, yy)) { top = yy; break; }
    const d = y - top; if (d > 0 && d <= 4) R.set(x, y, mixC(R.get(x, y), C('#3a1e30'), [0, 0.55, 0.36, 0.2, 0.1][d]));
  }
  const warm = C('#ffd6a0'), cool = C('#8e9be0');
  const layers = [hair, robe, face, beard, mst, nose, pipe, hat, brows];
  const owner = (x, y) => { for (let i = layers.length - 1; i >= 0; i--) if (layers[i].has(x, y)) return layers[i]; return null; };
  // only where a layer's silhouette edge is actually visible against something behind it
  for (const r of [hat, beard, mst, robe, hair]) for (let y = 0; y < S; y++) for (let x = 1; x < S - 1; x++) {
    if (!r.has(x, y) || owner(x, y) !== r) continue;
    const ix = x - 1; if (!r.has(ix, y) || owner(ix, y) !== r) continue;
    if (r.has(x + 1, y)) continue;
    if (owner(x + 1, y) && owner(x + 1, y) !== null && r !== hat && r !== robe) continue;   // edge tucked against another form
    R.set(ix, y, mixC(R.get(ix, y), warm, 0.36));
  }
  for (const r of [hat, beard, robe, hair]) for (let y = 0; y < S; y++) for (let x = 1; x < S - 1; x++) {
    if (!r.has(x, y) || owner(x, y) !== r || r.has(x - 1, y)) continue;
    const ix = x + 1; if (!r.has(ix, y) || owner(ix, y) !== r) continue;
    if (owner(x - 1, y)) continue;
    R.set(ix, y, mixC(R.get(ix, y), cool, 0.2));
  }
  return R;
}
