// ─────────────────────────────────────────────────────────────
//  Goblin Minion (CR 1/8) — scrawny green nuisance in a dented
//  kettle helm two sizes too big (it wobbles when he runs, lifts
//  clean off when he leaps, and drops over his eyes when he's
//  smacked). Rusty dagger in hand, a sack of stolen vegetables
//  over his shoulder. Faces LEFT, toward the hero.
//  Frames: run×4 · leap · crouch (wind-up) · bite (the stab) · hit
//  …plus the standalone helmet (spin frames + at rest) for deaths.
// ─────────────────────────────────────────────────────────────
import { C, P, Raster, ramp, mixC, darken, h2, clamp, PAL } from './common.js';

export const GOB_W = 44, GOB_H = 42, GOB_FEET = 38;     // canvas, ground row
export const GOB_CX = 23;                                // body centre column (x anchor)

const SKIN = P(['#16240e', '#243a14', '#36541e', '#4c7028', '#649038', '#80ac4e', '#9cc468']);
const TUNIC = P(['#2a1010', '#421a14', '#5c261a', '#783622', '#94482a']);   // filthy russet rags
const HELM = P(['#1e1e28', '#34344a', '#52526e', '#74748e', '#9a9ab2', '#c8c8dc']);
const TIN = P(['#2a2e3c', '#484e62', '#6e7488', '#969cb2', '#bcc2d4', '#e2e8f4']);   // a pie tin: brighter, bluer tin
const CRUST = P(['#7a4e22', '#a06c32', '#c89450', '#e2b878', '#f4d8a0']);
const BERRY = P(['#2e1a42', '#4a2a62', '#6a3a82', '#8a50a0']);            // Mistress Jhaele's blueberries
const EYE = P(['#4a3408', '#c08420', '#ffd25a']);
const SACK = P(['#3a2a14', '#54401e', '#70582c', '#8c703a', '#a98a4c']);
const BLADE = P(['#4a3a28', '#7a5a3a', '#a8824e', '#c8a06a', '#e8d8b0']);   // rusty: brown iron
const OUT = C('#121018');

const TURNIP_P = P(['#3e1b46', '#683072', '#944a9c', '#bc6ebc']);
const TURNIP_I = P(['#9c8e78', '#d4c8ae', '#f2e8d4', '#fffcf0']);
const TURNIP_G = P(['#224a18', '#387424', '#589c34', '#80c248']);

function paintTurnipSprite(R, cx, cy, scale = 1) {
  const rx = 2.8 * scale, ry = 2.6 * scale;
  R.ellipse(cx, cy, rx, ry, (x, y, u, v) => v < -0.05
    ? ramp(TURNIP_P, clamp(0.62 - u * 0.25 - v * 0.2), x, y, 0)
    : ramp(TURNIP_I, clamp(0.66 - u * 0.25 - v * 0.2), x, y, 0));
  R.set(Math.round(cx), Math.round(cy + ry), TURNIP_I[1]);
  R.line(cx, cy - ry, cx - 2, cy - ry - 3, TURNIP_G[1]);
  R.line(cx, cy - ry, cx, cy - ry - 3.5, TURNIP_G[2]);
  R.line(cx, cy - ry, cx + 2, cy - ry - 3, TURNIP_G[3]);
}

function torso(R, bx, by, lean, turnip = false) {
  // hunched little body in rags
  R.ellipse(bx, by, 6.0, 7.4, (x, y, u, v) => ramp(TUNIC, clamp(0.55 - v * 0.38 + u * 0.1 + (h2(x, y, 7) < 0.12 ? 0.12 : 0)), x, y, 0.5));
  // ragged hem
  for (let i = -5; i <= 5; i += 3) R.set(Math.round(bx + i), Math.round(by + 6.9 + (i % 2)), TUNIC[1]);
  // rope belt
  R.line(bx - 5, by + 2.6, bx + 5, by + 3, C('#c9a86a'));
  // the sack of stolen veg slung over his far shoulder, bulging behind him
  const sx = bx + 6.5, sy = by - 4;
  R.ellipse(sx, sy, turnip ? 5.2 : 4.6, turnip ? 5.8 : 5.2, (x, y, u, v) => ramp(SACK, clamp(0.5 - v * 0.34 - u * 0.1 + (h2(x, y, 13) < 0.15 ? 0.1 : 0)), x, y, 0.5));
  R.line(bx - 2, by - 6, sx - 1, sy + 3, darken(SACK[1], 0.12));                       // the strap across his chest
  R.set(Math.round(sx) - 2, Math.round(sy) - 5, SACK[3]);                              // the knot
  if (turnip) {
    // overflowing stolen turnips bursting out of the top & side of his sack
    paintTurnipSprite(R, sx - 0.5, sy - 6.0, 1.0);
    paintTurnipSprite(R, sx + 3.2, sy - 3.8, 0.85);
    // plus one fat stolen turnip tucked firmly under his belt / arm!
    paintTurnipSprite(R, bx - 1.5, by + 0.5, 0.92);
  } else {
    // a stolen carrot and a turnip top poke out of the sack
    R.line(sx + 1, sy - 5, sx + 3.5, sy - 8.5, C('#d8782a')); R.set(Math.round(sx + 4), Math.round(sy - 9), C('#f09038'));
    R.set(Math.round(sx + 2), Math.round(sy - 7), C('#5c8a3a')); R.set(Math.round(sx + 3), Math.round(sy - 6), C('#6a9a46'));
  }
}

function legG(R, hx, hy, ang, len, far) {
  const ex = hx + Math.sin(ang) * len, ey = hy + Math.cos(ang) * len;
  const pal = far ? SKIN.map(c => darken(c, 0.32)) : SKIN;
  R.capsule(hx, hy, ex, ey, 1.8, 1.5, (x, y, s) => ramp(pal, clamp(0.45 - s * 0.3), x, y));
  R.capsule(ex - 1.8, ey, ex + 0.8, ey, 1.0, 0.75, far ? darken(SKIN[3], 0.3) : SKIN[3]);   // bare flat foot
}

function dagger(R, bx, by, ang) {
  // the near arm ends in a rusty dagger: brown-iron jagged blade, dull edge glint
  const hx = bx - 4.5, hy = by + 1;
  const ex = hx + Math.sin(ang) * 8, ey = hy - Math.cos(ang) * 8;
  R.capsule(hx, hy, ex, ey, 1.5, 1.3, (x, y, s) => ramp(SKIN, clamp(0.48 - s * 0.3), x, y));
  const bl = 8.5, bx2 = ex + Math.sin(ang) * bl, by2 = ey - Math.cos(ang) * bl;
  const px = Math.cos(ang), py = Math.sin(ang);                       // blade width direction
  R.line(ex, ey, bx2, by2, BLADE[2]);
  R.line(ex + px, ey + py, bx2 + px * 0.55, by2 + py * 0.55, BLADE[1]);
  R.set(Math.round(bx2), Math.round(by2), BLADE[4]);                                    // the point catches the sun
  R.set(Math.round(bx2 - px), Math.round(by2 - py), BLADE[3]);
  R.set(Math.round(ex + Math.sin(ang + 0.7) * 3), Math.round(ey - Math.cos(ang + 0.7) * 3), BLADE[0]);   // a rust notch
  R.set(Math.round(ex + px * 1.5), Math.round(ey + py * 1.5), C('#8a6a3e'));            // brassy crossguard
  R.set(Math.round(ex - px * 1.5), Math.round(ey - py * 1.5), C('#8a6a3e'));
}

// helm shift + brim tip — THE WOBBLE (it lags the body by a frame when he runs)
function helmet(R, hx, hy, ox, oy, tip) {
  const x0 = hx + ox, y0 = hy + oy;
  R.ellipse(x0 + 1, y0 - 1.6 + tip * 0.3, 5.8, 3.6, (x, y, u, v) => ramp(HELM, clamp(0.62 - v * 0.5 - u * 0.1), x, y, 0.4));   // dome
  R.ellipse(x0 + 1, y0 + 0.6 + tip * 0.45, 7.0, 1.7, (x, y, u, v) => ramp(HELM, clamp(0.42 - v * 0.3), x, y));                // the wide brim
  R.set(Math.round(x0 - 2), Math.round(y0 - 4), HELM[5]); R.set(Math.round(x0 - 1), Math.round(y0 - 5), HELM[4]);            // sheen
  R.rect(Math.round(x0 + 3), Math.round(y0 - 6), 1, 2, HELM[2]);                                                            // the dent
  R.line(x0 - 4.5, y0 + 0.5, x0 - 5, y0 + 3.5 + tip, HELM[1]);                                                              // loose strap
}

// Snikkit's helm: Mistress Jhaele's pie tin — shallow, fluted, far too pleased with itself
function pieTin(R, hx, hy, ox, oy, tip) {
  const x0 = hx + ox, y0 = hy + oy;
  R.ellipse(x0 + 1, y0 - 0.8 + tip * 0.3, 5.9, 2.4, (x, y, u, v) => ramp(TIN, clamp(0.6 - v * 0.4 - u * 0.08), x, y, 0.4));   // shallow dome
  R.ellipse(x0 + 1, y0 + 0.7 + tip * 0.45, 7.6, 1.5, (x, y, u, v) => ramp(TIN, clamp(0.46 - v * 0.3), x, y));                 // the wide fluted rim
  for (let i = -6; i <= 7; i += 3) R.set(Math.round(x0 + 1 + i), Math.round(y0 + 0.7 + tip * 0.45) - 1, TIN[1]);              // crimped edge
  R.set(Math.round(x0 - 2), Math.round(y0 - 2.6), TIN[5]); R.set(Math.round(x0 - 1), Math.round(y0 - 3.2), TIN[4]);          // sheen
  R.set(Math.round(x0 + 3), Math.round(y0 - 1.6), BERRY[1]); R.set(Math.round(x0 + 4), Math.round(y0 - 0.8), BERRY[0]);      // a berry stain
}

// Snikkit's other hand: the stolen pie, held high like a trophy (no dagger for him)
function pieArm(R, bx, by, ang) {
  const hx = bx - 4.5, hy = by + 1;
  const ex = hx + Math.sin(ang) * 7, ey = hy - Math.cos(ang) * 7;
  R.capsule(hx, hy, ex, ey, 1.5, 1.3, (x, y, s) => ramp(SKIN, clamp(0.48 - s * 0.3), x, y));
  R.set(Math.round(ex), Math.round(ey), SKIN[3]); R.set(Math.round(ex + 1), Math.round(ey), SKIN[3]);                        // fingers under the dish
  const px = ex, py = ey - 2.4;
  R.ellipse(px, py + 1.2, 4.6, 1.5, (x, y, u, v) => ramp(TIN, clamp(0.5 - v * 0.3), x, y));                                   // the tin dish
  R.ellipse(px, py - 0.6, 4.0, 2.2, (x, y, u, v) => ramp(BERRY, clamp(0.55 - v * 0.4 + (h2(x, y, 17) < 0.2 ? 0.18 : 0)), x, y, 0.5)); // the berry mound
  for (let i = -3; i <= 3; i += 3) R.line(px + i - 0.5, py - 2.4, px + i + 1.5, py + 0.6, CRUST[3]);                          // lattice
  for (let i = -3; i <= 3; i += 3) R.line(px + i + 1.5, py - 2.4, px + i - 0.5, py + 0.6, CRUST[2]);
  R.ellipse(px, py + 0.4, 4.3, 0.9, () => CRUST[3]);                                                                          // the crust rim
  R.set(Math.round(px - 2), Math.round(py - 2), BERRY[3]);                                                                    // glisten
}

function head(R, bx, by, lean, helm, mouthOpen, snik) {
  const hx = bx - 8.5 + lean * 0.6, hy = by - 10;
  // big green skull
  R.ellipse(hx, hy, 5.6, 4.9, (x, y, u, v) => ramp(SKIN, clamp(0.55 - v * 0.4 + u * 0.12), x, y, 0.5));
  // the famous nose: long, pointed, tipped down
  R.poly([[hx - 4.5, hy + 0.2], [hx - 10.5, hy + 2.9], [hx - 4, hy + 3.7]], (x, y) => ramp(SKIN, clamp(0.62 - (hx - x) * 0.02), x, y));
  R.set(Math.round(hx - 10), Math.round(hy + 3), darken(SKIN[2], 0.1));
  // bat ear out the back-top, pale inside
  R.poly([[hx + 2.5, hy - 3], [hx + 10, hy - 6.5], [hx + 7.5, hy + 0.5]], (x, y) => ramp(SKIN, clamp(0.5 - (y - hy) * 0.05), x, y));
  R.line(hx + 4, hy - 3, hx + 8.5, hy - 5.2, C('#8fae5c'));
  // mean yellow eye, hot pupil (sits below the brim)
  R.rect(hx - 5, hy + 0.2, 3, 2, EYE[0]);
  R.rect(hx - 4.5, hy + 0.2, 2, 1, EYE[2]); R.set(hx - 4, hy + 1.2, EYE[1]);
  if (mouthOpen) { R.poly([[hx - 4.5, hy + 3.6], [hx - 7.5, hy + 4.1], [hx - 4, hy + 5.2]], C('#5a1010')); R.set(hx - 5, hy + 4.2, C('#d8c89a')); }  // jeering
  else R.line(hx - 5.5, hy + 3.9, hx - 3, hy + 4.1, SKIN[1]);
  // warts
  R.set(hx - 2, hy - 1.8, SKIN[2]); R.set(hx, hy - 2.3, SKIN[2]);
  // THE HELMET — too big, sits on his brow, wobbles (Snikkit's is a pie tin)
  if (snik) pieTin(R, hx, hy - 2.9, helm[0], helm[1], helm[2]);
  else helmet(R, hx, hy - 2.9, helm[0], helm[1], helm[2]);
}

// mode: 'run' (ph 0..3) | 'leap' | 'crouch' | 'bite' (the stab) | 'hit'
// snik: Snikkit — pie tin for a helm, a stolen pie for a dagger
// turnip: Stage 2 turnip raider — sack & arm brimming with stolen purple-ivory turnips
export function goblinFrame(mode, ph = 0, snik = false, turnip = false) {
  const R = new Raster(GOB_W, GOB_H);
  const run = mode === 'run';
  const bob = run ? [0, 1.5, 0, -0.5][ph] : mode === 'crouch' ? 1.5 : mode === 'hit' ? -1 : 0;
  const lean = mode === 'bite' ? -3.5 : mode === 'crouch' ? 2.5 : mode === 'hit' ? 3.5 : mode === 'leap' ? -1 : 0;
  const bx = GOB_CX, by = GOB_FEET - 12.5 - (run ? [0.5, 2, 0.5, 0][ph] : mode === 'leap' ? 3.5 : 0) + (mode === 'crouch' ? 1.5 : 0);
  // legs (far first); a leap tucks both up
  const fA = run ? [0.75, 0.15, -0.65, -0.1][ph] : mode === 'leap' ? 1.15 : mode === 'bite' ? 0.7 : mode === 'hit' ? -0.55 : 0.3;
  const hA = run ? [-0.7, -0.05, 0.65, 0.15][ph] : mode === 'leap' ? 1.35 : mode === 'bite' ? -0.6 : mode === 'hit' ? 0.5 : -0.25;
  const hipY = by + 4.5, footY = mode === 'leap' ? GOB_FEET - 5 : GOB_FEET;
  legG(R, bx + 2.2, hipY, fA, Math.max(3, footY - hipY), true);
  legG(R, bx - 2.2, hipY + 0.5, hA, Math.max(3, footY - hipY), false);
  torso(R, bx, by, lean, turnip);
  // the dagger arm: pumps with the gait, pulled back in crouch, driven forward in the stab
  // (Snikkit's hand is otherwise engaged: the pie rides high, wobbling as he runs)
  const dA = snik
    ? (run ? [-0.55, -0.2, -0.5, -0.25][ph] : mode === 'crouch' ? -1.6 : mode === 'bite' ? -0.2 : mode === 'leap' ? -0.6 : mode === 'hit' ? -1.0 : -0.3)
    : (run ? [-0.4, 0.1, 0.6, 0.1][ph] - 1.1 : mode === 'crouch' ? -2.4 : mode === 'bite' ? 1.35 : mode === 'leap' ? -1.8 : mode === 'hit' ? -1.3 : -1.1);
  if (snik) pieArm(R, bx + lean * 0.4, by, dA); else dagger(R, bx + lean * 0.4, by, dA);
  // head + THE HELMET
  const helm = run ? [[0, 0, 0], [-1, 0.5, -1], [0, 0, 0], [1, 0.5, 1]][ph]
    : mode === 'leap' ? [0, -3, 0]              // it lifts clean off his head mid-air
    : mode === 'crouch' ? [1, -0.5, 1]          // tipped back as he winds up
    : mode === 'bite' ? [-1.5, 1, -1]           // tipped forward over his eyes
    : mode === 'hit' ? [-2, 2.5, -2]            // knocked clean over his face
    : [0, 0, 0];
  head(R, bx + lean * 0.5, by + bob * 0.4, lean, helm, mode === 'leap' || mode === 'bite', snik);
  // rim light from the low sun behind (right), then the outline
  R.rim(1, 0, c => mixC(c, PAL.rim, 0.4));
  R.rim(0, -1, c => mixC(c, PAL.rim, 0.16));
  if (mode === 'hit') { for (let i = 0; i < R.d.length; i++) if (R.d[i]) R.d[i] = mixC(R.d[i], C('#ffffff'), 0.22); }
  R.outline(OUT, false);
  return R;
}

// the helmet on its own: for the spin-off-and-clatter when a goblin falls
export function helmFrame(phase) {
  const R = new Raster(15, 9);
  const x0 = 7, y0 = phase === 'flat' ? 6 : 5;
  if (phase === 'flat') {                                     // edge-on, mid-spin
    R.rect(x0 - 7, y0 - 1, 15, 2, HELM[2]);
    R.rect(x0 - 7, y0 - 1, 15, 1, HELM[4]);
    R.rect(x0 - 2, y0 - 2, 5, 1, HELM[3]);
  } else if (phase === 'under') {                             // brim up, dome hidden: the dark inside
    R.ellipse(x0, y0 - 1, 7.0, 2.2, (x, y, u, v) => ramp(HELM, clamp(0.3 - v * 0.2), x, y));
    R.rect(x0 - 6, y0, 13, 2, HELM[1]);
    R.set(x0 - 5, y0 + 1, HELM[0]); R.set(x0 + 4, y0 + 1, HELM[0]);
  } else {                                                    // 'dome' (also the resting pose, tipped)
    R.ellipse(x0, y0 - 1.2, 5.4, 3.4, (x, y, u, v) => ramp(HELM, clamp(0.62 - v * 0.5 - u * 0.1), x, y, 0.4));
    R.ellipse(x0, y0 + 1.4, 6.8, 1.6, (x, y, u, v) => ramp(HELM, clamp(0.42 - v * 0.3), x, y));
    R.set(x0 - 2, y0 - 3, HELM[5]); R.set(x0 - 1, y0 - 4, HELM[4]);
    R.rect(x0 + 3, y0 - 5, 1, 2, HELM[2]);
  }
  R.outline(OUT, false);
  return R;
}

// the telegraph: the helm's dome and two shifty eyes peeking over the wall coping
export function peekFrame(snik = false) {
  const PAL2 = snik ? TIN : HELM;
  const R = new Raster(15, 9);
  R.ellipse(7, 7.6, 5.8, snik ? 2.6 : 3.6, (x, y, u, v) => ramp(PAL2, clamp(0.62 - v * 0.5 - u * 0.1), x, y, 0.4));   // the dome
  R.ellipse(7, 8.2, snik ? 7.6 : 7.0, 1.7, (x, y, u, v) => ramp(PAL2, clamp(0.42 - v * 0.3), x, y));                    // the brim
  R.set(4, snik ? 4 : 3, PAL2[5]); R.set(5, snik ? 3 : 2, PAL2[4]);                                                     // sheen
  if (!snik) R.rect(11, 1, 1, 2, HELM[2]);                                                                              // the dent
  else { R.set(11, 5, BERRY[1]); R.set(10, 6, BERRY[0]); }                                                              // the berry stain
  R.rect(4, 7, 2, 1, EYE[0]); R.rect(9, 7, 2, 1, EYE[0]);                                                               // shadowed sockets
  R.set(4, 7, EYE[2]); R.set(9, 7, EYE[2]);                                                                             // two hot yellow eyes
  return R;
}

export function buildGoblin(snik = false, turnip = false) {
  const run = [0, 1, 2, 3].map(i => goblinFrame('run', i, snik, turnip).toCanvas());
  const hit = goblinFrame('hit', 0, snik, turnip).toCanvas();
  // a crisp half-scale hit frame for the far end of the crit launch (nearest-neighbour downsample)
  const half = document.createElement('canvas'); half.width = GOB_W / 2; half.height = GOB_H / 2;
  const hx = half.getContext('2d'); hx.imageSmoothingEnabled = false; hx.drawImage(hit, 0, 0, GOB_W / 2, GOB_H / 2);
  return { run, leap: goblinFrame('leap', 0, snik, turnip).toCanvas(), crouch: goblinFrame('crouch', 0, snik, turnip).toCanvas(),
    bite: goblinFrame('bite', 0, snik, turnip).toCanvas(), hit, hitHalf: half,
    helm: ['dome', 'flat', 'under'].map(f => helmFrame(f).toCanvas()), peek: peekFrame(snik).toCanvas() };
}
