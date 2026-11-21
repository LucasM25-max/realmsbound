// Shadowdale — big, close, cel-shaded buildings (screen coordinates).
// Elminster's tower · great oak · thatched cottage · valley gap (sun) ·
// the Old Skull Inn · neighbour cottage. Ground line y = 272 (behind the hedge).
import { C, P, Raster, mixC, darken, lighten, rnd, h2, clamp, noise2, fbm1, band, norm3, sprite, canopy, treeSprite, coniferSprite } from './cel.js';

export const VILLAGE_Y = 0;
export const VG = 272;
export const CHIMNEYS = [];
export const TOWER = {};
export const SIGN = {};
const SUN_X = 402;
const lxAt = x => clamp((SUN_X - x) / 170, -1, 1);

const PAL = {
  thatch: P(['#3a2414', '#5c3b1c', '#80562a', '#a47234', '#c58f40', '#dcab55', '#efc970', '#fbe39c']),
  plaster: P(['#7a675e', '#9b8778', '#b9a48f', '#d2bfa5', '#e6d6ba', '#f5ebd4']),
  timber: P(['#1f120c', '#352017', '#4f3223', '#6a4831', '#86603f']),
  stone: P(['#38324a', '#4f475f', '#675d75', '#82768c', '#9e91a3', '#bbadb9', '#d8cad0']),
  slate: P(['#1c1f33', '#272c46', '#343b5b', '#454e70', '#5a6488', '#737da1', '#919abb']),
  glass: P(['#8a3e1c', '#c4672a', '#ec953a', '#ffbd58', '#ffdf8e', '#fff4c8']),
  wood: P(['#26170e', '#3c2617', '#563822', '#73502f', '#916a40', '#ae8654']),
  red: P(['#4a1418', '#6e1e22', '#93302e', '#b8463a', '#d8664a']),
  leaf: P(['#1a3420', '#24482a', '#33602c', '#4a7a2e', '#679632', '#88b23a', '#abcb48', '#d2e270', '#f0f2a6']),
  leafD: P(['#14281c', '#1c3a24', '#28502a', '#386630', '#4e7e36', '#6a983e', '#8cb24c']),
  ivy: P(['#18321e', '#224428', '#2f5a2f', '#427338', '#5a8d42', '#7aa94f']),
  ink: C('#1c1220'),
};

// ---------- building blocks ----------
function stoneBlock(R, x0, y0, w, h, o = {}) {
  const pal = o.pal || PAL.stone, rh = o.rh || 6, lx = o.lx ?? 0.5, r = rnd(o.seed || 3);
  const mask = o.mask || (() => true);
  for (let row = 0; row * rh < h; row++) {
    let x = x0 - Math.floor(r() * 8);
    while (x < x0 + w) {
      const sw = (o.sw || 10) + Math.floor(r() * 7) - 3, v = (r() - 0.5) * 0.22;
      for (let j = 0; j < rh; j++) for (let i = 0; i < sw; i++) {
        const px = x + i, py = y0 + row * rh + j;
        if (px < x0 || px >= x0 + w || py >= y0 + h || !mask(px, py)) continue;
        const base = (o.light ? o.light(px, py) : 0.5) + v;
        let t = base;
        if (i === sw - 1 || j === rh - 1) { R.set(px, py, pal[0]); continue; }            // mortar
        if (j === 0) t += 0.22; else if (j === rh - 2) t -= 0.18;
        if (i === 0) t += 0.1 * Math.sign(-lx + 0.01); if (i === sw - 2) t += 0.1 * Math.sign(lx);
        R.set(px, py, band(pal, t, px, py));
      }
      if (r() > 0.75) { const mx = x + 2 + Math.floor(r() * (sw - 4)), my = y0 + row * rh + 1 + Math.floor(r() * (rh - 3)); if (mask(mx, my) && mx < x0 + w) R.set(mx, my, r() > 0.5 ? C('#8fa45a') : C('#c9b878')); }
      x += sw;
    }
  }
}

export const WINDOWS = [];   // lit windows (screen coords) for the runtime glow pass
function windowGlow(R, x, y, w, h, o = {}) {
  WINDOWS.push({ x, y, w, h, far: !!o.far });
  const arch = o.arch, fr = PAL.timber, g = PAL.glass;
  const inside = (px, py) => { if (!arch) return true; const r = w / 2, cy = y + r; if (py >= cy) return true; return ((px + 0.5 - (x + w / 2)) / r) ** 2 + ((py + 0.5 - cy) / r) ** 2 <= 1; };
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
    const px = x + i, py = y + j;
    const inn = i >= 0 && j >= 0 && i < w && j < h && inside(px, py);
    const edge = !inn && (inside(px, py) || inside(px + 1, py) || inside(px - 1, py) || inside(px, py + 1)) && i >= -1 && i <= w && j >= -1 && j <= h;
    if (inn) {
      let t = 0.95 - (j / h) * 0.55 + (i < w / 2 ? 0.05 : -0.05);
      const mull = i === Math.floor(w / 2) || j === Math.floor(h * (arch ? 0.55 : 0.45));
      const lead = !mull && ((i + j) % 4 === 0 || (i - j + 400) % 4 === 0) && o.leaded !== false;
      R.set(px, py, mull ? fr[2] : lead ? band(g, t - 0.35, px, py) : band(g, t, px, py));
    } else if (edge) R.set(px, py, fr[1]);
  }
  // reveal shadow + sill
  R.hline(x, x + w - 1, y + (arch ? Math.floor(w / 2) : 0), mixC(g[2], fr[2], 0.5));
  R.rect(x - 2, y + h, w + 4, 2, (px, py) => py === y + h ? PAL.stone[5] : PAL.stone[2]);
  if (o.box) {
    R.rect(x - 1, y + h + 2, w + 2, 3, (px, py) => band(PAL.wood, py === y + h + 2 ? 0.7 : 0.35, px, py));
    const fl = [C('#e8455a'), C('#ff8aa0'), C('#f4e05a'), C('#ffffff'), C('#c86ae0')];
    for (let i = 0; i < w + 2; i++) { const k = h2(x + i, y, 5); R.set(x - 1 + i, y + h + 1, k > 0.5 ? PAL.leaf[4] : PAL.leaf[3]); if (k > 0.55) R.set(x - 1 + i, y + h + (k > 0.8 ? 0 : 1), fl[Math.floor(h2(i, y, 6) * fl.length)]); }
  }
  if (o.shutters) for (const sx of [x - 5, x + w + 1]) R.rect(sx, y, 4, h, (px, py) => band(o.shutters, ((px - sx) === 0 ? 0.7 : 0.45) + (((py - y) % 4 === 0) ? -0.2 : 0), px, py));
}

function door(R, x, y, w, h, o = {}) {
  const r = w / 2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = x + i, py = y + j;
    if (j < r && ((i + 0.5 - r) / r) ** 2 + ((j + 0.5 - r) / r) ** 2 > 1) continue;
    const plank = i % 4 === 0;
    let t = 0.45 + (i / w) * 0.2 * (o.lx || 0.5) - (plank ? 0.25 : 0);
    if (j === Math.floor(h * 0.3) || j === Math.floor(h * 0.75)) { R.set(px, py, C('#2a2226')); continue; }   // iron straps
    R.set(px, py, band(o.pal || PAL.wood, t, px, py));
  }
  R.set(x + w - 3, y + Math.floor(h * 0.55), C('#d8b860'));
  R.rect(x - 2, y + h, w + 4, 2, PAL.stone[4]);
}

// thatched roof: rounded hips, straw courses, rolled eave lip, patterned ridge
function thatch(R, x0, x1, eaveY, ridgeY, inset, o = {}) {
  const pal = o.pal || PAL.thatch, lx = o.lx ?? 0.5, H = eaveY - ridgeY;
  const left = f => x0 + inset * (1 - Math.pow(f, 0.55)), right = f => x1 - inset * (1 - Math.pow(f, 0.55));
  for (let y = ridgeY; y <= eaveY + 2; y++) {
    const f = clamp((y - ridgeY) / H);
    const xl = Math.round(left(f)), xr = Math.round(right(f));
    for (let x = xl; x <= xr; x++) {
      const sx = (x - xl) / Math.max(1, xr - xl);              // 0..1 across
      const hip = Math.min(1, (x - xl) / Math.max(1, inset), (xr - x) / Math.max(1, inset));
      let t = 0.58 - f * 0.12;
      if (hip < 1) t += (x - xl < xr - x ? -lx : lx) * (1 - hip) * 0.35;  // hip ends turn toward/away from light
      // thick scalloped bundles: each course bulges, lit on top, dark lip underneath
      const yy = y - ridgeY, CH = 7;
      const course = Math.floor(yy / CH);
      const sc = Math.abs(Math.sin((x + course * 5) * Math.PI / 11)) * 2.2;
      const inC = (yy + sc) % CH;
      if (inC < 1.6) t += 0.2; else if (inC > CH - 1.4) t -= 0.26; else if (inC > CH - 2.6) t -= 0.1;
      if (((x * 5 + course * 3) % 10) < 1 && inC > 1.6 && inC < CH - 2.6) t -= 0.1;   // a few straw strokes
      // rolled eave lip
      const dE = eaveY - y;
      if (dE < 5) t = dE < 0 ? 0.1 : dE < 2 ? 0.28 : 0.74;
      // ridge cap with spar pattern
      if (y - ridgeY < 6 && hip >= 1) { t = 0.62 + (((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) ? -0.28 : 0) - (y - ridgeY === 5 ? 0.3 : 0); }
      R.set(x, y, band(pal, t, x, y, 0.1));
    }
  }
  return { left, right };
}

// eyebrow dormer pushed up through the thatch
function dormer(R, cx, baseY, w, o = {}) {
  const h = Math.round(w * 0.5), pal = o.pal || PAL.thatch;
  for (let y = baseY - h - 4; y <= baseY; y++) for (let x = cx - w / 2 - 4; x <= cx + w / 2 + 4; x++) {
    const u = (x - cx) / (w / 2 + 4), v = (baseY - y) / (h + 4);
    if (u * u + v * v > 1) continue;
    const rr = Math.sqrt(u * u + v * v);
    let t = 0.5 + v * 0.25 + u * (o.lx ?? 0.5) * 0.2;
    if (rr > 0.86) t = 0.75; if (rr > 0.94) t = 0.3;
    if ((Math.round(Math.atan2(v, u) * 22)) % 3 === 0 && rr < 0.86) t -= 0.12;
    R.set(Math.round(x), y, band(pal, t, x, y));
  }
  windowGlow(R, Math.round(cx - w / 4), baseY - Math.round(h * 0.85), Math.round(w / 2), Math.round(h * 0.8), { leaded: true });
  R.hline(Math.round(cx - w / 2 - 2), Math.round(cx + w / 2 + 2), baseY + 1, pal[1]);
}

function chimney(R, x, top, w, bottom, o = {}) {
  stoneBlock(R, x, top + 4, w, bottom - top - 4, { rh: 4, sw: 5, lx: o.lx, light: (px) => 0.48 + ((px - x) / w - 0.5) * (o.lx ?? 0.5) * 0.6 });
  R.rect(x - 2, top, w + 4, 4, (px, py) => band(PAL.stone, py === top ? 0.85 : py === top + 3 ? 0.15 : 0.55, px, py));
  R.rect(x + 2, top - 2, 3, 2, C('#7a4030')); R.rect(x + w - 5, top - 2, 3, 2, C('#7a4030'));   // chimney pots
  CHIMNEYS.push({ x: x + w / 2, y: top - 3, magic: !!o.magic });
}

function halfTimber(R, x0, y0, w, h, o = {}) {
  const lx = o.lx ?? 0.5, tp = PAL.timber;
  R.rect(x0, y0, w, h, (x, y) => band(PAL.plaster, 0.62 + (x - x0) / w * lx * 0.18 + (noise2(x / 7, y / 7, 3) - 0.5) * 0.12, x, y, 0.1));
  const beam = (xa, ya, xb, yb, wd = 3) => R.line(xa, ya, xb, yb, (x, y, n) => band(tp, 0.5 + ((x + y) % 5 === 0 ? -0.2 : 0), x, y), wd);
  for (const px of o.posts) beam(px, y0, px, y0 + h - 1);
  beam(x0, y0 + 1, x0 + w - 1, y0 + 1);
  if (o.rail) beam(x0, o.rail, x0 + w - 1, o.rail);
  beam(x0, y0 + h - 2, x0 + w - 1, y0 + h - 2);
  for (const [a, b, c2, d] of (o.braces || [])) beam(a, b, c2, d, 2);
}


// gable-fronted wing: thick draped thatch A-frame over a half-timbered gable wall
function gableWing(R, cx, hw, apexY, eaveY, baseY, o = {}) {
  const lx = o.lx ?? 0.4, th = o.th ?? 10, pal = o.pal || PAL.thatch;
  const slope = hw / (eaveY - apexY);
  // gable wall
  for (let y = apexY + 4; y <= baseY; y++) {
    const w = Math.min(hw - 3, (y - apexY - 4) * slope);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) R.set(x, y, band(PAL.plaster, 0.62 + (x - cx) / hw * -lx * 0.15 + (noise2(x / 7, y / 7, 5) - 0.5) * 0.12, x, y, 0.1));
  }
  const tp = PAL.timber, beam = (a, b, c2, d, wd = 3) => R.line(a, b, c2, d, (x, y) => band(tp, 0.5 + ((x + y) % 5 === 0 ? -0.2 : 0), x, y), wd);
  const wl = Math.round(cx - hw + 3), wr = Math.round(cx + hw - 3);
  beam(wl, eaveY, wr, eaveY); beam(wl, o.rail ?? eaveY + 26, wr, o.rail ?? eaveY + 26);
  beam(wl, eaveY, wl, baseY); beam(wr, eaveY, wr, baseY); beam(Math.round(cx), apexY + 8, Math.round(cx), baseY);
  beam(Math.round(cx), apexY + 10, wl + 6, eaveY - 1, 2); beam(Math.round(cx), apexY + 10, wr - 6, eaveY - 1, 2);
  beam(wl, eaveY + 1, Math.round(cx) - 2, (o.rail ?? eaveY + 26) - 1, 2); beam(wr, eaveY + 1, Math.round(cx) + 2, (o.rail ?? eaveY + 26) - 1, 2);
  if (o.win) for (const w of o.win) windowGlow(R, w[0], w[1], w[2], w[3], w[4] || {});
  windowGlow(R, Math.round(cx - 7), apexY + 26, 14, 16, { arch: true, box: true });
  // eave shadow under the thatch
  for (let y = apexY + 4; y < apexY + 30; y++) { const w = (y - apexY - 4) * slope; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x = Math.round(cx + s * (w - k)); const c = R.get(x, y); if (c && Math.abs(x - cx) < hw) R.set(x, y, mixC(c, C('#3a2030'), 0.45 - k * 0.1)); } }
  // thatch: two thick sloping blankets meeting at a rounded ridge, rolled lip at the edge
  for (let y = apexY - th; y <= eaveY + 4; y++) {
    const wOut = Math.max(0, (y - apexY + th) * slope) + 2, wIn = Math.max(-1, (y - apexY) * slope - 2);
    for (let x = Math.round(cx - wOut); x <= Math.round(cx + wOut); x++) {
      const dx = Math.abs(x + 0.5 - cx); if (dx < wIn && y > apexY - 2) continue;
      if (y > eaveY && dx < wOut - th - 2) continue;
      const side = x < cx ? -1 : 1;
      const depth = (wOut - dx) / (th * slope + 4);               // 0 outer edge → 1 inner edge
      let t = 0.6 + side * lx * 0.32;
      if (depth < 0.18) t = 0.86; else if (depth > 0.85) t = 0.18;   // bright rolled outer lip, dark inner fold
      if (y - apexY + th < 4) t = 0.82;
      const sc = Math.abs(Math.sin((dx + Math.floor(y / 6) * 5) * Math.PI / 9)) * 2;
      const inC = (y + sc + dx * 0.4) % 6;
      if (depth >= 0.18 && depth <= 0.85) { if (inC < 1.4) t += 0.16; else if (inC > 4.8) t -= 0.24; }
      R.set(x, y, band(pal, t, x, y, 0.1));
    }
  }
}

// ---------- the tower ----------
function tower(R) {
  const cx = 92, r = 30, top = 152, base = VG, tip = 70, er = 39;
  const L = norm3(0.75, -0.25, 0.62);
  // body: curved stone courses
  for (let y = top; y <= base; y++) for (let x = cx - r; x <= cx + r; x++) {
    const u = (x + 0.5 - cx) / r; if (Math.abs(u) > 1) continue;
    const nz = Math.sqrt(1 - u * u), d = u * L[0] + nz * L[2];
    const th = Math.asin(u), row = Math.floor((y - top) / 6), jj = (y - top) % 6;
    const col = (th + Math.PI / 2) / (Math.PI / 13) + (row % 2) * 0.5;
    const ci = Math.floor(col), fi = col - ci;
    const v = (h2(ci, row, 4) - 0.5) * 0.2;
    let t = -0.05 + d * 0.9 + v;
    if (jj === 5 || fi > 1 - 0.09 / Math.max(0.25, nz)) { R.set(x, y, band(PAL.stone, t - 0.4, x, y)); continue; }
    if (jj === 0) t += 0.18; else if (jj === 4) t -= 0.15;
    R.set(x, y, band(PAL.stone, t, x, y));
  }
  // corbel ring under the eave + shadow
  for (let x = cx - r; x <= cx + r; x++) { const u = (x - cx) / r; for (let j = 0; j < 5; j++) R.set(x, top + j, band(PAL.stone, j < 2 ? 0.1 : (Math.floor((Math.asin(clamp(u)) + 2) * 9) % 2 ? 0.55 + u * 0.3 : 0.15), x, top + j)); }
  // windows (curving into the wall)
  windowGlow(R, cx + 4, 172, 10, 17, { arch: true });
  windowGlow(R, cx - 14, 214, 9, 15, { arch: true });
  // balcony: wooden half-ring
  const by = 200;
  for (let x = cx - r - 4; x <= cx + r + 4; x++) {
    const u = (x - cx) / (r + 4); if (Math.abs(u) > 1) continue;
    const yy = by + Math.round(Math.sqrt(1 - u * u) * 4);
    R.set(x, yy, PAL.wood[5]); R.set(x, yy + 1, PAL.wood[3]); R.set(x, yy + 2, PAL.wood[1]);
    R.set(x, yy - 8, PAL.wood[4]);
    if (x % 4 === 0) for (let j = -7; j < 0; j++) R.set(x, yy + j, PAL.wood[3]);
  }
  // door
  door(R, cx - 6, 246, 14, 26, { lx: 0.8 });
  // ivy climbing the shaded left side
  const ivy = rnd(41);
  const ivyShape = [];
  for (let k = 0; k < 9; k++) ivyShape.push([cx - r + 6 + ivy() * 14, 268 - k * 12 - ivy() * 6, 7 + ivy() * 5]);
  for (const [x, y, s] of ivyShape) canopy(R, x, y, s * 0.8, s, { pal: PAL.ivy, seed: Math.round(x * y), lx: 0.6, puff: 3.2, stray: 8 });
  // cone roof of slate
  const eaveY = top + 2;
  for (let y = tip; y <= eaveY + 5; y++) {
    const f = (y - tip) / (eaveY - tip), hw = er * Math.min(1, f);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x + 0.5 - cx) / Math.max(1, hw); if (Math.abs(u) > 1) continue;
      const curve = Math.sqrt(1 - u * u) * 5;                   // elliptical eave
      if (y > eaveY + curve) continue;
      const nz = Math.sqrt(1 - u * u), d = u * L[0] * 0.9 + nz * 0.5 + 0.25;
      const row = Math.floor((y - tip - curve * f) / 4), jj = Math.floor(y - tip - curve * f) % 4;
      const col = (Math.asin(clamp(u)) + Math.PI / 2) * (4 + f * 9) + (row % 2) * 0.5;
      let t = -0.1 + d * 0.75 + (h2(Math.floor(col), row, 8) - 0.5) * 0.12;
      if (jj === 3 || col % 1 < 0.12) t -= 0.25;
      if (y > eaveY + curve - 2) t = y > eaveY + curve - 1 ? 0.05 : 0.7;   // eave lip
      R.set(x, y, band(PAL.slate, t, x, y));
    }
  }
  // magic chimney poking out of the cone
  chimney(R, cx + 15, 104, 7, 124, { lx: 0.8, magic: true });
  // little oculus window on the cone
  windowGlow(R, cx - 4, 118, 6, 7, { arch: true, leaded: false });
  // finial
  R.vline(cx, tip - 12, tip, PAL.timber[2]); R.set(cx, tip - 13, C('#f0c860')); R.set(cx - 1, tip - 7, C('#f0c860')); R.set(cx + 1, tip - 7, C('#f0c860'));
  TOWER.flag = { x: cx + 1, y: tip - 12 };
}

// ---------- main build ----------
export function buildVillage(W) {
  CHIMNEYS.length = 0; WINDOWS.length = 0;
  const H = 300, R = new Raster(W, H);
  const RIMC = C('#ffd8a0');
  const rimLight = S => {             // warm back-light on silhouette edges that face the low sun
    const src = S.d.slice();
    const has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!src[y * W + x]) continue;
      const dx = x < SUN_X ? 1 : -1, near = Math.abs(x - SUN_X) < 260;
      if (!near) continue;
      const k = 1 - Math.abs(x - SUN_X) / 260;
      if (!has(x, y - 1) || !has(x + dx, y)) S.set(x, y, mixC(src[y * W + x], RIMC, 0.35 + 0.35 * k));
      else if (!has(x + dx * 2, y) || !has(x, y - 2)) S.set(x, y, mixC(src[y * W + x], RIMC, 0.15 * k));
    }
  };
  const put = (draw, ink = PAL.ink) => { const S = new Raster(W, H); draw(S); rimLight(S); S.outline(ink, false); R.blit(S, 0, 0); };

  // --- back row (in the valley gap and behind): small hazy roofs + trees
  const hz = (pal, a) => pal.map(c => mixC(c, C('#c9a3c0'), a));
  put(S => {
    for (const [x, s] of [[330, 22], [352, 26], [440, 24], [600, 30], [232, 22], [628, 26]]) S.blit(treeSprite({ w: s, h: Math.round(s * 1.2), pal: hz(PAL.leaf, 0.25), bark: hz(PAL.wood, 0.25), seed: x, lx: lxAt(x), ink: C('#3a4a3e'), stray: 6 }), Math.round(x - s / 2), Math.round(VG - 34 - s * 1.2 + 10));
    // a small far cottage glimpsed in the gap
    const x0 = 344, y0 = 236;
    S.rect(x0, y0, 34, 18, (x, y) => band(hz(PAL.plaster, 0.25), 0.6 + (x - x0) * 0.004, x, y));
    windowGlow(S, x0 + 6, y0 + 5, 6, 6, { leaded: false, far: true }); windowGlow(S, x0 + 22, y0 + 5, 6, 6, { leaded: false, far: true });
    thatch(S, x0 - 5, x0 + 39, y0 + 1, y0 - 16, 9, { pal: hz(PAL.thatch, 0.25), lx: 0.1 });
    chimney(S, x0 + 26, y0 - 22, 5, y0 - 8, { lx: 0.1 });
  }, C('#3e3040'));

  // --- lush backdrop: big round trees behind and between the buildings
  put(S => {
    for (const [x, w, hh, seed] of [[640, 92, 110, 5], [26, 100, 132, 13], [394, 58, 70, 21], [322, 64, 84, 29], [612, 70, 96, 37], [452, 80, 120, 45], [560, 84, 128, 53], [200, 70, 100, 61]]) {
      S.blit(treeSprite({ w, h: hh, pal: PAL.leafD, bark: PAL.wood, seed, lx: lxAt(x), ink: null, puff: Math.max(7, w / 9), stray: 20, spread: 0.7 }), Math.round(x - w / 2), VG - hh);
    }
  }, C('#13261a'));
  put(S => {
    for (const [x, w, hh, seed] of [[-6, 96, 150, 71], [56, 60, 96, 79], [416, 50, 64, 83], [664, 70, 120, 89]]) {
      S.blit(treeSprite({ w, h: hh, pal: PAL.leaf, bark: PAL.wood, seed, lx: lxAt(x), ink: null, puff: Math.max(7, w / 9), stray: 24, spread: 0.75 }), Math.round(x - w / 2), VG - hh);
    }
  }, C('#16281a'));
  // --- great oak between the tower and the cottage
  put(S => { const t = treeSprite({ w: 104, h: 124, pal: PAL.leaf, bark: PAL.wood, seed: 77, lx: 0.7, ink: null, puff: 11, rx: 50, ry: 40, canopyBot: 88, trunkW: 9, stray: 30, spread: 0.7 }); S.blit(t, 170 - 52, VG - 124); });

  // --- tower
  put(tower);

  // --- thatched cottage (left of the gap)
  put(S => {
    const x0 = 214, x1 = 318, wt = 220, lx = lxAt(266);
    stoneBlock(S, x0, VG - 12, x1 - x0, 12, { rh: 4, sw: 7, lx, light: () => 0.45 });
    halfTimber(S, x0, wt, x1 - x0, VG - 12 - wt, { lx, posts: [x0 + 1, 250, 284, x1 - 2], rail: 243, braces: [[x0 + 2, 241, 249, 224], [285, 224, x1 - 3, 241]] });
    // eave shadow on the wall
    for (let x = x0; x < x1; x++) for (let j = 0; j < 4; j++) S.set(x, wt + 2 + j, mixC(S.get(x, wt + 2 + j), C('#3a2030'), 0.5 - j * 0.1));
    windowGlow(S, 224, 228, 16, 13, { box: true });
    windowGlow(S, 291, 228, 16, 13, { box: true });
    door(S, 259, 236, 16, 36, { lx, pal: PAL.red });
    chimney(S, 296, 150, 12, 190, { lx });
    thatch(S, x0 - 12, x1 + 12, wt + 2, 170, 24, { lx });
    dormer(S, 266, 200, 26, { lx });
  });

  // --- the Old Skull Inn
  put(S => {
    const x0 = 426, x1 = 606, lx = lxAt(516);
    stoneBlock(S, x0, 236, x1 - x0, VG - 236, { rh: 6, sw: 11, lx, seed: 9, light: (x) => 0.5 + (x - x0) / (x1 - x0) * lx * 0.25 });
    // jettied upper storey
    halfTimber(S, x0 - 6, 200, x1 - x0 + 12, 36, { lx, posts: [x0 - 5, 468, 520, 562, x1 + 4], rail: 218, braces: [[x0 - 4, 216, 467, 202], [469, 202, 519, 216], [521, 216, 561, 202], [563, 202, x1 + 3, 216]] });
    for (let x = x0 - 6; x < x1 + 6; x++) { S.set(x, 236, PAL.timber[3]); S.set(x, 237, PAL.timber[1]); for (let j = 0; j < 4; j++) S.set(x, 238 + j, mixC(S.get(x, 238 + j) || PAL.stone[1], C('#2a1a2a'), 0.55 - j * 0.12)); }
    for (let x = x0 - 4; x < x1 + 6; x += 10) { S.rect(x, 236, 3, 3, PAL.timber[2]); S.set(x, 236, PAL.timber[4]); }   // joist ends
    for (const wx of [438, 480, 532, 574]) windowGlow(S, wx, 205, 16, 14, { box: true });
    windowGlow(S, 566, 246, 22, 16, { leaded: true });
    door(S, 502, 238, 22, 34, { lx });
    // lanterns either side of the door
    for (const lxp of [494, 528]) { S.rect(lxp, 242, 4, 6, C('#2a2026')); S.rect(lxp + 1, 243, 2, 4, C('#ffd47a')); S.set(lxp + 1, 243, C('#fff4c8')); S.set(lxp + 1, 241, C('#2a2026')); }
    // barrels by the wall
    for (const bx of [588, 598]) S.ellipse(bx, 264, 5, 8, (x, y, u, v) => band(PAL.wood, 0.5 + u * 0.35 * lx - (Math.abs(v) > 0.55 && Math.abs(v) < 0.75 ? 0.4 : 0), x, y));
    chimney(S, 520, 112, 13, 160, { lx });
    chimney(S, 586, 124, 12, 166, { lx });
    thatch(S, x0 - 18, x1 + 18, 202, 132, 36, { lx });
    dormer(S, 556, 172, 30, { lx });
  });
  put(S => {
    const lx = 0.3;
    stoneBlock(S, 432, 240, 74, VG - 240, { rh: 6, sw: 10, lx, seed: 17, light: (x) => 0.55 + (x - 469) / 74 * 0.15 });
    gableWing(S, 469, 44, 124, 196, 240, { lx, th: 16, win: [[444, 206, 14, 13, { box: true }], [480, 206, 14, 13, { box: true }]], rail: 222 });
    windowGlow(S, 446, 248, 18, 14, {}); windowGlow(S, 476, 248, 18, 14, {});
    for (let x = 427; x < 512; x++) { S.set(x, 239, PAL.timber[3]); S.set(x, 240, PAL.timber[1]); }
    // sign bracket
    S.rect(408, 240, 22, 2, PAL.timber[2]); S.line(428, 250, 414, 241, PAL.timber[2]);
    SIGN.x = 404; SIGN.y = 242;
  });

  // --- neighbour cottage (right edge, partly off-frame) + tree behind it
  put(S => {
    const x0 = 614, lx = -0.6;
    stoneBlock(S, x0, 224, 60, VG - 224, { rh: 5, sw: 9, lx, light: () => 0.42 });
    windowGlow(S, 624, 236, 12, 12, { shutters: P(['#1d3444', '#2a4c60', '#3c6a80', '#5a8aa0']) });
    thatch(S, x0 - 10, 700, 226, 184, 26, { lx });
  });
  // keep only windows that are still visible (not hidden behind trees / later buildings)
  const glass = new Set(PAL.glass);
  for (let i = WINDOWS.length - 1; i >= 0; i--) {
    const w = WINDOWS[i]; let vis = 0, n = 0;
    for (let j = 0; j < w.h; j += 2) for (let k = 0; k < w.w; k += 2) { n++; if (glass.has(R.get(w.x + k, w.y + j))) vis++; }
    if (vis / Math.max(1, n) < 0.3) WINDOWS.splice(i, 1);
  }
  return R;
}

// swinging inn sign + pennant on the tower (animated)
export function drawInnSign(ctx, ox, oy, t) {
  const sw = Math.sin(t * 1.4) * 0.12;
  const x = SIGN.x + ox, y = SIGN.y + oy;
  ctx.save(); ctx.translate(x + 9, y); ctx.rotate(sw);
  ctx.fillStyle = '#1c1220'; ctx.fillRect(-1, 0, 1, 3); ctx.fillRect(16, 0, 1, 3);
  ctx.fillRect(-3, 3, 23, 17);
  ctx.fillStyle = '#6e1e22'; ctx.fillRect(-2, 4, 21, 15);
  ctx.fillStyle = '#93302e'; ctx.fillRect(-2, 4, 21, 1);
  ctx.fillStyle = '#d8b860'; ctx.fillRect(-2, 4, 21, 1); ctx.fillRect(-2, 18, 21, 1);
  // little skull
  ctx.fillStyle = '#efe6d6'; ctx.fillRect(4, 7, 9, 6); ctx.fillRect(5, 6, 7, 1); ctx.fillRect(5, 13, 7, 3);
  ctx.fillStyle = '#1c1220'; ctx.fillRect(5, 9, 3, 2); ctx.fillRect(9, 9, 3, 2); ctx.fillRect(8, 12, 1, 1); ctx.fillRect(6, 15, 1, 1); ctx.fillRect(8, 15, 1, 1); ctx.fillRect(10, 15, 1, 1);
  ctx.restore();
  // tower pennant
  if (TOWER.flag) {
    const fx = TOWER.flag.x + ox, fy = TOWER.flag.y + oy;
    for (let i = 0; i < 12; i++) { const w = Math.round(Math.sin(t * 5 - i * 0.6) * (i / 6)); const hgt = Math.max(1, 4 - Math.floor(i / 3)); ctx.fillStyle = i % 4 < 2 ? '#7b2bb0' : '#9a48d0'; ctx.fillRect(fx + i, fy + w, 1, hgt); }
  }
}
