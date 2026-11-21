// ─────────────────────────────────────────────────────────────
//  Actors & stateless particle systems (all pure functions of t)
//  Hero · Elminster (pipe, ember, smoke rings) · chimney smoke ·
//  birds · butterflies · the scarecrow's crow · sun motes · dust
// ─────────────────────────────────────────────────────────────
import { T, W, H, speakingAt } from './timeline.js';
import { F, off, PATH_Y, BURROW, STUMP, SCARECROW } from './world.js';
import { buildHero, HERO_FEET, HERO_CX } from './art/hero.js';
import { buildElminster, ELM_PIPE, EK, ELM_SEAT_ROW, ELM_HEAD_X, ELM_FEET } from './art/elminster.js';
import { CHIMNEYS as V_CHIMNEYS, VILLAGE_Y } from './art/village.js';

let HERO = null, ELMS = null;
import { rimLit, silhouette, castShadow } from './fx.js';
import { heroCombat, heroAdvanceSteps, CB, gearState } from './combat.js';
let HSIL = null, ESIL = null, HERO_TIN = null, HSIL_TIN = null;
export function buildActors() {
  HERO = buildHero(); HERO_TIN = buildHero(true); ELMS = buildElminster();
  // back-lit by the low sun: the hero stands left of it (rim on his right), Elminster to its right
  for (const H0 of [HERO, HERO_TIN]) {
    H0.walk = H0.walk.map(f => rimLit(f, 1)); H0.idle = H0.idle.map(f => rimLit(f, 1));
    for (const k of Object.keys(H0.combat)) H0.combat[k] = rimLit(H0.combat[k], 1);
  }
  for (const k of ['idle', 'breathe', 'talk', 'talkB', 'blink']) ELMS[k] = rimLit(ELMS[k], -1, [255, 214, 150], 0.5);
  HSIL = { walk: HERO.walk.map(f => silhouette(f)), idle: HERO.idle.map(f => silhouette(f)), combat: {} };
  for (const k of Object.keys(HERO.combat)) HSIL.combat[k] = silhouette(HERO.combat[k]);
  HSIL_TIN = { walk: HERO_TIN.walk.map(f => silhouette(f)), idle: HERO_TIN.idle.map(f => silhouette(f)), combat: {} };
  for (const k of Object.keys(HERO_TIN.combat)) HSIL_TIN.combat[k] = silhouette(HERO_TIN.combat[k]);
  ESIL = silhouette(ELMS.idle);
}
// the hero's current wardrobe: plain hood, or the pie tin once it is equipped (Beat 8)
const heroSets = () => gearState().helm === 'pietin' ? [HERO_TIN, HSIL_TIN] : [HERO, HSIL];
import { hash, clamp, inv, lerp, pxEllipse, easeOut } from './util.js';


// ---------- HERO ----------
export function heroState(t) {
  const c = heroCombat(t);                       // Beat 1: the fight takes over
  if (c) return { visible: true, ...c };
  const arrive = T.heroWalk + (T.heroStopX - T.heroStartX) / T.heroSpeed;
  if (t < T.heroWalk) return { visible: false };
  if (t < arrive) {
    const x = T.heroStartX + (t - T.heroWalk) * T.heroSpeed;
    return { visible: true, x, walking: true, frame: Math.floor((t - T.heroWalk) * 12) % 8, arrive };
  }
  return { visible: true, x: T.heroStopX, walking: false, frame: Math.floor((t - arrive) / 0.9) % 2, arrive };
}
export function heroFootsteps(tmax = 40) {
  const arrive = T.heroWalk + (T.heroStopX - T.heroStartX) / T.heroSpeed;
  const out = [];
  for (let s = T.heroWalk; s < arrive && s < tmax; s += 4 / 12) out.push({ t: s, x: T.heroStartX + (s - T.heroWalk) * T.heroSpeed + HERO_CX });
  return out.concat(heroAdvanceSteps());
}
const heroFeetY = (x, p) => PATH_Y(Math.round(x + HERO_CX)) + 1 + off(p, F.ground);

// where the hero's feet are on screen (for the in-world HP gauge)
export function heroAnchor(p, t) { const h = heroState(t); if (!h.visible) return null; return { x: Math.round(h.x) + HERO_CX, y: heroFeetY(h.x, p) }; }

export function drawHero(ctx, p, t) {
  const h = heroState(t);
  if (!h.visible) return;
  const fy = heroFeetY(h.x, p), x = Math.round(h.x) + (h.dx || 0);
  const combat = h.mode && h.mode !== 'idle';
  const [HF, HS] = heroSets();
  const img = combat ? HF.combat[h.mode] : (h.walking ? HF.walk : HF.idle)[h.frame];
  const sil = combat ? HS.combat[h.mode] : (h.walking ? HS.walk : HS.idle)[h.frame];
  // long dawn shadow stretching toward the viewer, then a tight contact shadow
  castShadow(ctx, sil, x, fy, HERO_FEET, { lean: -0.7, squash: 0.3, alpha: 0.38 });
  pxEllipse(ctx, x + HERO_CX - 1, fy, 9, 2, 'rgba(40,28,16,0.34)');
  // dust kicked up on each footfall
  for (const st of heroFootsteps()) {
    const age = t - st.t;
    if (age < 0 || age > 0.7) continue;
    for (let k = 0; k < 3; k++) {
      const dx = -4 - k * 3 - age * (8 + k * 4), dy = -age * (6 + k * 2) - k;
      ctx.globalAlpha = (1 - age / 0.7) * 0.55;
      ctx.fillStyle = k % 2 ? '#d6bf94' : '#c2a77a';
      ctx.fillRect(Math.round(st.x - 6 + dx), Math.round(heroFeetY(st.x - HERO_CX, p) - 1 + dy), k === 1 ? 2 : 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(img, x, fy - HERO_FEET);
}
// Beat 6: the hero drills at the pell inside the Training screen (no world, no shadows but his own)
// sc: draw at 2× on the UI canvas (the modal lives there, above the dim)
export function drawHeroPractice(ctx, mode, cx, feetY, sc = 1) {
  const [HF] = heroSets();
  const img = HF.combat[mode] || HF.idle[0];
  pxEllipse(ctx, Math.round((cx - 1) * sc), Math.round(feetY * sc), 9 * sc, 2 * sc, 'rgba(40,28,16,0.34)');
  ctx.drawImage(img, Math.round((cx - HERO_CX) * sc), Math.round((feetY - HERO_FEET) * sc), img.width * sc, img.height * sc);
}

// the hero's frame box on screen (for the sword smear, the die and the spotlight)
export function heroBox(p, t) {
  const h = heroState(t); if (!h.visible) return null;
  const fy = heroFeetY(h.x, p), x = Math.round(h.x) + (h.dx || 0);
  return { x, y: fy - HERO_FEET, cx: Math.round(h.x) + HERO_CX, cy: fy - 34, feet: fy };
}

// ---------- ELMINSTER ----------
// sprite-top anchored so his seat row rests on the fence's top rail
export const ELM = { x: STUMP.x - Math.round(26 * EK), seat: STUMP.top, seatRow: ELM_SEAT_ROW, head: ELM_HEAD_X, bowl: ELM_PIPE.bowl, mouth: ELM_PIPE.mouth };
const elmTop = p => ELM.seat - ELM.seatRow + off(p, F.ground);
export function pipeBowl(p) { return [ELM.x + ELM.bowl[0], elmTop(p) + ELM.bowl[1] - 1]; }
export function pipeMouth(p) { return [ELM.x + ELM.mouth[0], elmTop(p) + ELM.mouth[1]]; }

const extraPuffs = [];
export function addPuff(t) { extraPuffs.push(t); if (extraPuffs.length > 8) extraPuffs.shift(); }
function puffAmount(t) {
  let a = 0;
  for (const pt of [T.puff1, T.puff2, 15.2, ...extraPuffs]) {
    const d = t - pt;
    if (d > 0 && d < 0.55) a = Math.max(a, Math.sin((d / 0.55) * Math.PI * 0.5));
    else if (d >= 0.55 && d < 1.2) a = Math.max(a, 1 - (d - 0.55) / 0.65);
  }
  return a;
}

export function drawElminster(ctx, p, t) {
  const x = ELM.x, top = elmTop(p);
  let img = Math.sin(t * 1.9) > 0.6 ? ELMS.breathe : ELMS.idle, bob = img === ELMS.breathe ? 1 : 0;
  if ((t % 4.3) < 0.13) img = ELMS.blink;
  if (speakingAt(t)) { const k = Math.floor(t / 0.13) % 3; img = k === 0 ? ELMS.talk : k === 1 ? ELMS.talkB : ELMS.idle; bob = k === 1 ? 1 : 0; }
  if (puffAmount(t) > 0.5) { img = ELMS.breathe; bob = 1; }
  castShadow(ctx, ESIL, x, top + ELM_FEET + 8, ELM_FEET, { lean: 0.7, squash: 0.26, alpha: 0.3 });
  ctx.drawImage(img, x, top);
  // ember in the pipe bowl
  const [bx, by] = [x + ELM.bowl[0], top + ELM.bowl[1] - 1 + bob];
  const glow = 0.35 + puffAmount(t) * 0.65 + 0.08 * Math.sin(t * 9);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(bx + 0.5, by + 0.5, 0, bx + 0.5, by + 0.5, 7);
  g.addColorStop(0, `rgba(255,150,60,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(bx - 7, by - 7, 15, 15);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = glow > 0.7 ? '#ffd27a' : '#ff8a3a'; ctx.fillRect(bx - 1, by, 2, 1);
  if (glow > 0.7) { ctx.fillStyle = '#ff6a2a'; ctx.fillRect(bx - 2, by, 1, 1); }
}

// Thin wisp rising from the pipe + expanding smoke rings after each puff
export function drawPipeSmoke(ctx, p, t) {
  const [bx, by] = pipeBowl(p);
  for (let k = 0; k < 18; k++) {
    const spawn = Math.floor(t / 0.22) * 0.22 - k * 0.22;
    const age = t - spawn; if (age < 0 || age > 3.8) continue;
    const sx = bx + 1 + Math.sin(spawn * 3.1 + age * 2.2) * (1 + age * 1.6) - age * 2.5;
    const sy = by - 1 - age * 9;
    ctx.globalAlpha = 0.5 * (1 - age / 3.8);
    ctx.fillStyle = '#e4dfe9'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, age > 1.8 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
  const [mx, my] = pipeMouth(p);
  const rings = [
    { t0: T.puff1 + 0.55, vx: -11, vy: -7, life: 5.2 },
    { t0: 15.75, vx: -9, vy: -9, life: 4.5 },
    { t0: T.puff2 + 0.55, vx: -46, vy: 7, life: 6.5 },   // drifts toward the dialogue frame
  ];
  for (const r of rings) {
    const age = t - r.t0; if (age < 0 || age > r.life) continue;
    const e = easeOut(clamp(age / r.life));
    const cx = mx - 3 + r.vx * age * (1 - age / (r.life * 2.2)), cy = my + r.vy * age + Math.sin(age * 2) * 1.5;
    const rad = 1.5 + e * 8;
    ctx.globalAlpha = 0.8 * (1 - e) ** 1.2;
    ctx.fillStyle = '#efeaf3';
    const n = Math.max(10, Math.floor(rad * 7));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * 0.55), 1, 1);
    }
    ctx.globalAlpha = 0.25 * (1 - e);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(a) * (rad - 1)), Math.round(cy + 1 + Math.sin(a) * (rad - 1) * 0.55), 1, 1); }
  }
  ctx.globalAlpha = 1;
}

// ---------- CHIMNEY SMOKE (Elminster's tower smoke changes colour) ----------
const MAGIC = ['#9ef0b0', '#9fd2ff', '#d2abff', '#ffd59e'];
export function drawChimneySmoke(ctx, p, t) {
  const oy = VILLAGE_Y + off(p, F.village);
  for (const [ci, c] of V_CHIMNEYS.entries()) {
    const rate = c.magic ? 0.16 : 0.32, life = c.magic ? 5.5 : 4.2;
    for (let k = 0; k < 40; k++) {
      const spawn = Math.floor(t / rate) * rate - k * rate;
      const age = t - spawn; if (age < 0 || age > life) continue;
      const seed = Math.floor(spawn / rate) + ci * 1000;
      const drift = 4.5 + hash(seed, 5) * 2;
      const sx = c.x + age * drift + Math.sin(age * 1.4 + hash(seed, 6) * 6) * (0.6 + age * 0.9);
      const sy = c.y + oy - age * (c.magic ? 10 : 7.5);
      const sz = Math.min(5, 2 + Math.floor(age * 0.9));
      const a = Math.min(1, age * 3) * (1 - age / life) * (c.magic ? 0.85 : 0.7);
      let col = age < 1.2 ? '#cfc6d6' : '#efe8f2';
      if (c.magic) col = MAGIC[Math.floor(spawn / 4.2) % MAGIC.length < 0 ? 0 : Math.floor(spawn / 4.2) % MAGIC.length];
      ctx.globalAlpha = a; ctx.fillStyle = col;
      ctx.fillRect(Math.round(sx - sz / 2), Math.round(sy - sz / 2), sz, sz);
      if (c.magic && hash(seed, 9) > 0.8 && age < 2.5) { ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx + 2), Math.round(sy - 1), 1, 1); }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- BIRDS (V-flock crossing the dawn sky) ----------
const BIRD = [
  ['X...X', '.X.X.', '..X..'],
  ['XX.XX', '..X..'],
  ['..X..', '.X.X.', 'X...X'],
];
function drawShape(ctx, shape, x, y, col) {
  ctx.fillStyle = col;
  shape.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'X') ctx.fillRect(x + i, y + j, 1, 1); });
}
export function drawBirds(ctx, p, t) {
  const t0 = 1.6, dur = 9.5;
  if (t < t0 || t > t0 + dur) return;
  const k = (t - t0) / dur;
  const baseX = lerp(690, -80, k), baseY = 150 - Math.round(300 * F.clouds) + off(p, F.clouds) - k * 18;
  const flock = [[0, 0], [9, 5], [18, 10], [10, -5], [20, -9], [30, 13]];
  flock.forEach(([dx, dy], i) => {
    const fr = Math.floor(t * 7 + i * 0.7) % 4;
    const shape = BIRD[fr === 3 ? 1 : fr];
    drawShape(ctx, shape, Math.round(baseX + dx), Math.round(baseY + dy + Math.sin(t * 2 + i) * 1.5), '#3d2d4f');
  });
}

// ---------- BUTTERFLIES ----------
function butterfly(ctx, x, y, t, wing, body = '#3a2a2a') {
  const open = Math.floor(t * 14) % 2 === 0;
  ctx.fillStyle = wing;
  if (open) { ctx.fillRect(x - 2, y - 1, 2, 2); ctx.fillRect(x + 1, y - 1, 2, 2); ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); }
  else { ctx.fillRect(x - 1, y - 1, 1, 2); ctx.fillRect(x + 1, y - 1, 1, 2); }
  ctx.fillStyle = body; ctx.fillRect(x, y - 1, 1, 3);
}
export function drawButterflies(ctx, p, t) {
  const og = off(p, F.ground);
  // A: an orange butterfly lifts from the flowers and flutters past the hero
  if (t > 8.4 && t < 16) {
    const k = t - 8.4;
    const x = 336 - 27 * k + Math.sin(k * 3.3) * 6;
    const y = 328 - 26 * k + Math.abs(Math.sin(k * 5.1)) * -5 + Math.sin(k * 1.7) * 4;
    butterfly(ctx, Math.round(x), Math.round(y + og), t, '#f39a3a');
  }
  // B: a white one dances around the meadow flowers near the burrow
  {
    const x = 392 + Math.sin(t * 0.9) * 26 + Math.sin(t * 2.3) * 6;
    const y = 312 + Math.sin(t * 1.3) * 7 + Math.abs(Math.sin(t * 4.2)) * -3;
    butterfly(ctx, Math.round(x), Math.round(y + og), t + 0.3, '#f4f1e4');
  }
}

// ---------- CROW on the scarecrow's arm ----------
export function drawCrow(ctx, p, t) {
  const ox = SCARECROW.x + 14, oy = SCARECROW.armY - 2 + off(p, F.ground);
  const d = t - T.crowFlee;
  ctx.fillStyle = '#1d1622';
  if (d < 0) {
    const bob = Math.floor(t * 1.3) % 3 === 0 ? 1 : 0;
    const CROW = ['..KK.....', '.YKWK....', 'YYKKKK...', '..KDKKK..', '...KDDKKK', '....KKK.KK', '....L.L..'];
    const col = { K: '#1d1622', D: '#3b3150', Y: '#e1a83a', W: '#f4f0e8', L: '#2a2020' };
    CROW.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c === '.') continue; ctx.fillStyle = col[c]; ctx.fillRect(ox - 4 + i, oy - 7 + j + (j < 3 ? bob : 0), 1, 1); } });
    return;
  }
  if (d > 5) return;
  const x = ox + d * 62 + Math.sin(d * 6) * 2, y = oy - 4 - d * 34 - d * d * 4;
  const up = Math.floor(d * 12) % 2 === 0;
  ctx.fillRect(Math.round(x), Math.round(y), 5, 2); ctx.fillRect(Math.round(x) - 2, Math.round(y) + 1, 2, 1);
  ctx.fillRect(Math.round(x) + 5, Math.round(y) - 1, 2, 2); ctx.fillStyle = '#e1a83a'; ctx.fillRect(Math.round(x) + 7, Math.round(y), 1, 1); ctx.fillStyle = '#1d1622';
  if (up) { ctx.fillRect(Math.round(x) + 1, Math.round(y) - 3, 1, 3); ctx.fillRect(Math.round(x) + 2, Math.round(y) - 4, 1, 1); }
  else { ctx.fillRect(Math.round(x) + 1, Math.round(y) + 2, 1, 2); ctx.fillRect(Math.round(x) + 2, Math.round(y) + 3, 1, 1); }
}

// ---------- SUN MOTES (pollen / dust drifting in the light) ----------
export function drawMotes(ctx, p, t) {
  const oy = off(p, 0.9);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const x = ((hash(i, 101) * (W + 40) + t * (4 + hash(i, 102) * 6) + Math.sin(t * 0.7 + i) * 6) % (W + 40)) - 20;
    const y = 120 + hash(i, 103) * 230 - ((t * (1.5 + hash(i, 104) * 2)) % 40) + Math.sin(t * 1.1 + i * 2) * 3 + oy;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i, 105) * 2.5) + i);
    ctx.globalAlpha = tw * 0.55 * clamp(inv(1, 7, t));
    ctx.fillStyle = hash(i, 106) > 0.5 ? '#ffe7a8' : '#fff2d8';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---------- BURROW RUSTLE (Beat 1 tease: something is in there…) ----------
export const RUSTLES = CB.rustles;
export function drawBurrowRustle(ctx, p, t) {
  const og = off(p, F.ground);
  const bx = BURROW.x - 4, by = BURROW.y + 1 + og;
  for (const r of RUSTLES) {
    const d = t - r; if (d < 0 || d > 0.9) continue;
    for (let i = 0; i < 9; i++) {
      const vx = (hash(i, r * 10) - 0.5) * 34, vy = -22 - hash(i, r * 10 + 1) * 26;
      const x = bx + vx * d, y = by + vy * d + 60 * d * d;
      if (y > by + 2) continue;
      ctx.fillStyle = i % 3 ? '#7b5737' : '#a57e50'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // grass blades flick around the hole
    for (let i = 0; i < 6; i++) {
      const gx = bx - 9 + i * 4, sway = Math.round(Math.sin(d * 30 + i) * 2 * (1 - d / 0.9));
      ctx.fillStyle = '#5c8c43';
      for (let k = 0; k < 4; k++) ctx.fillRect(gx + Math.round(sway * k / 4), by - k - 1, 1, 1);
    }
    // two glinting eyes, very briefly
    if (CB.eyes.includes(r) && d > 0.15 && d < 0.55) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(bx - 2, by, 1, 1); ctx.fillRect(bx + 1, by, 1, 1); }
  }
}
