// ─────────────────────────────────────────────────────────────
//  Presentation layer: title card, cinematic letterbox, in-world
//  speech bubbles (Beat 0) and the Elminster speech HUD (Beat 1).
//  Frames/boxes are drawn on the native pixel grid; text is drawn
//  on the 2x UI canvas with hard-thresholded pixel fonts.
// ─────────────────────────────────────────────────────────────
import { W, H, T, DIALOGUE, UI_SCALE as S, revealText, speakingAt, hudLine } from './timeline.js';
import { buildPortrait, PORTRAIT_PIPE } from './art/elminster.js';
import { makeCanvas, crispText, outlineCanvas, clamp, inv, lerp, easeOut, easeOutBack, easeInOut, hash, pxEllipse } from './util.js';
import { ELM } from './actors.js';
import { off, F } from './world.js';

const C = {};
const FONT_BODY = '18px "Pixelify Sans"';
const FONT_BOLD = 'bold 18px "Pixelify Sans"';

// ---------- build-once assets ----------
export function buildUI() {
  // Title: REALMSBOUND in a pixel blackletter, banded gold, double outline, drop shadow
  let size = 72;
  let mask = crispText('Realmsbound', `${size}px "Jacquard 24"`, '#fff', { threshold: 120 });
  if (mask.width > 520) { size = 48; mask = crispText('Realmsbound', `${size}px "Jacquard 24"`, '#fff', { threshold: 120 }); }
  mask = trim(mask);
  const [g, gx] = makeCanvas(mask.width, mask.height);
  gx.drawImage(mask, 0, 0);
  gx.globalCompositeOperation = 'source-in';
  // find vertical glyph bounds for the gradient
  const d = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
  let y0 = mask.height, y1 = 0;
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) if (d[(y * mask.width + x) * 4 + 3]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const gr = gx.createLinearGradient(0, y0, 0, y1);
  [[0, '#fffbe2'], [0.14, '#fffbe2'], [0.15, '#ffe892'], [0.38, '#ffd062'], [0.39, '#f4b546'], [0.55, '#e2992f'], [0.56, '#c97a26'], [0.78, '#a85a20'], [0.79, '#8c4519'], [1, '#6e3415']]
    .forEach(([o, c]) => gr.addColorStop(o, c));
  gx.fillStyle = gr; gx.fillRect(0, 0, g.width, g.height);
  // engraved inner highlight: lighten pixels whose upper neighbour is empty
  const gi = gx.getImageData(0, 0, g.width, g.height); const gd = gi.data;
  for (let y = 1; y < g.height; y++) for (let x = 0; x < g.width; x++) {
    const i = (y * g.width + x) * 4, u = ((y - 1) * g.width + x) * 4;
    if (gd[i + 3] && !d[u + 3]) { gd[i] = 255; gd[i + 1] = 255; gd[i + 2] = 236; }
  }
  gx.putImageData(gi, 0, 0);
  const o1 = outlineCanvas(g, '#3a1a10', 1);
  const o2 = outlineCanvas(o1, '#120812', 1);
  const [sh, shx] = makeCanvas(o2.width, o2.height + 3);
  const [dark, dx] = makeCanvas(o2.width, o2.height); dx.drawImage(o2, 0, 0); dx.globalCompositeOperation = 'source-in'; dx.fillStyle = 'rgba(18,8,24,0.55)'; dx.fillRect(0, 0, dark.width, dark.height);
  shx.drawImage(dark, 0, 3); shx.drawImage(o2, 0, 0);
  C.title = sh; C.titleMask = mask;
  C.titleMaskOff = 2;     // mask is inset by 2 outline px inside C.title
  C.subtitle = crispText('AN IDLE ADVENTURING CAREER', '16px "Pixelify Sans"', '#f6e2b3', { spacing: 3, threshold: 90 });
  C.subtitleSh = crispText('AN IDLE ADVENTURING CAREER', '16px "Pixelify Sans"', '#1a0f1f', { spacing: 3, threshold: 90 });
  C.click = crispText('CLICK TO BEGIN', '24px "Pixelify Sans"', '#f6e2b3', { spacing: 4, threshold: 100 });
  C.clickSh = crispText('CLICK TO BEGIN', '24px "Pixelify Sans"', '#120a14', { spacing: 4, threshold: 100 });
  C.sound = crispText('Sound on · best with headphones', FONT_BODY, '#9c8cb8');
  C.loading = crispText('Summoning the Realms…', FONT_BODY, '#9c8cb8');
  C.portrait = [0, 1, 2].map(o => buildPortrait(o).toCanvas());
  C.name = crispText('ELMINSTER', 'bold 18px "Pixelify Sans"', '#ffe39a', { spacing: 2 });
  C.nameSh = crispText('ELMINSTER', 'bold 18px "Pixelify Sans"', '#2a0d12', { spacing: 2 });
  C.nameS = crispText('ELMINSTER', 'bold 15px "Pixelify Sans"', '#ffe39a', { spacing: 2 });
  C.nameSSh = crispText('ELMINSTER', 'bold 15px "Pixelify Sans"', '#2a0d12', { spacing: 2 });
  C.lineCache = new Map();
}

function trim(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  const [o, ox] = makeCanvas(x1 - x0 + 1, y1 - y0 + 1); ox.drawImage(c, -x0, -y0); return o;
}

function crispLine(text, color = '#3b2418') {
  const k = text + color;
  if (!C.lineCache.has(k)) C.lineCache.set(k, crispText(text.replace(/f(?=[ilft])/g, 'f\u200C'), FONT_BODY, color, { threshold: 105 }));
  return C.lineCache.get(k);
}

function wrap(uctx, text, maxW) {
  uctx.font = FONT_BODY;
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (uctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- pixel primitives ----------
function line(ctx, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; ctx.fillStyle = col;
  for (;;) { ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function sparkle(ctx, x, y, s, a, col = '#fff6d8') {
  if (a <= 0) return;
  ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1);
  if (s > 2) { ctx.globalAlpha = a * 0.5; ctx.fillRect(x - 1, y - 1, 3, 3); }
  ctx.globalAlpha = 1;
}

// A little pixel d20 emblem (icosahedron, front view)
function d20(ctx, cx, cy, r, glow) {
  const pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  if (glow > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    g.addColorStop(0, `rgba(255,200,110,${0.35 * glow})`); g.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    ctx.globalCompositeOperation = 'source-over';
  }
  // body
  ctx.fillStyle = '#5b1a24';
  for (let y = -r; y <= r; y++) { const w = Math.round((r - Math.abs(y) * 0.5) * 0.87); ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
  const tri = [[cx, cy - r * 0.55], [cx - r * 0.55, cy + r * 0.38], [cx + r * 0.55, cy + r * 0.38]];
  ctx.fillStyle = '#8e2a35';
  for (let y = Math.round(tri[0][1]); y <= Math.round(tri[1][1]); y++) { const k = (y - tri[0][1]) / (tri[1][1] - tri[0][1]); const w = Math.round(k * r * 0.55); ctx.fillRect(Math.round(cx - w), y, w * 2 + 1, 1); }
  const gold = '#f2c25a', goldD = '#a8692a';
  for (let i = 0; i < 6; i++) line(ctx, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], gold);
  for (let i = 0; i < 3; i++) line(ctx, tri[i][0], tri[i][1], tri[(i + 1) % 3][0], tri[(i + 1) % 3][1], gold);
  line(ctx, tri[0][0], tri[0][1], pts[0][0], pts[0][1], goldD); line(ctx, tri[1][0], tri[1][1], pts[4][0], pts[4][1], goldD); line(ctx, tri[2][0], tri[2][1], pts[2][0], pts[2][1], goldD);
  line(ctx, tri[1][0], tri[1][1], pts[3][0], pts[3][1], goldD); line(ctx, tri[2][0], tri[2][1], pts[3][0], pts[3][1], goldD);
  line(ctx, tri[0][0], tri[0][1], pts[5][0], pts[5][1], goldD); line(ctx, tri[0][0], tri[0][1], pts[1][0], pts[1][1], goldD);
  // "20"
  ctx.fillStyle = '#ffe9a8';
  const nx = Math.round(cx) - 3, ny = Math.round(cy) - 1;
  [[0, 0], [1, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3]].forEach(([a, b]) => ctx.fillRect(nx + a, ny + b, 1, 1));
  [[4, 0], [5, 0], [4, 1], [6, 1], [4, 2], [6, 2], [4, 3], [5, 3], [6, 0], [6, 3]].forEach(([a, b]) => ctx.fillRect(nx + a, ny + b, 1, 1));
}

// ---------- start / loading screen ----------
export function drawStart(ctx, uctx, now, progress, ready) {
  ctx.fillStyle = '#07050c'; ctx.fillRect(0, 0, W, H);
  // drifting embers
  for (let i = 0; i < 40; i++) {
    const x = (hash(i, 1) * W + now * 6 * (0.3 + hash(i, 2))) % W, y = H - ((now * (8 + hash(i, 3) * 10) + hash(i, 4) * H) % H);
    ctx.globalAlpha = 0.35 * (0.5 + 0.5 * Math.sin(now * 2 + i)); ctx.fillStyle = i % 3 ? '#ffb45a' : '#ff7a3a'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
  const pulse = 0.5 + 0.5 * Math.sin(now * 2.6);
  d20(ctx, W / 2, 150, 15, 0.6 + pulse * 0.4);
  if (ready && C.click) {
    const a = 0.65 + 0.35 * pulse;
    uctx.globalAlpha = a;
    const x = Math.round(W - C.click.width / 2), y = 400;
    uctx.drawImage(C.clickSh, x, y + 3); uctx.drawImage(C.click, x, y);
    uctx.globalAlpha = 0.9; uctx.drawImage(C.sound, Math.round(W - C.sound.width / 2), 448);
    uctx.globalAlpha = 1;
  } else {
    if (C.loading) uctx.drawImage(C.loading, Math.round(W - C.loading.width / 2), 400);
    ctx.fillStyle = '#231a33'; ctx.fillRect(W / 2 - 60, 224, 120, 3);
    ctx.fillStyle = '#f2c25a'; ctx.fillRect(W / 2 - 60, 224, Math.round(120 * progress), 3);
  }
}

// ---------- title card ----------
export function drawTitle(ctx, uctx, p, t) {
  const a = clamp(inv(T.titleIn[0], T.titleIn[1], t)) * clamp(1 - inv(T.pan[0] + 0.6, T.pan[0] + 2.4, t));
  if (a <= 0) return;
  const lift = Math.round(off(p, 0.62) - 300 * 0.62);           // drifts up with the sky as the camera tilts
  const rise = Math.round((1 - easeOut(clamp(inv(T.titleIn[0], T.titleIn[1] + 0.4, t)))) * 8);
  const tx = Math.round(W / 2 - C.title.width / 2), ty = 112 + lift + rise;
  ctx.globalAlpha = a;
  d20(ctx, W / 2, ty - 16, 10, a * (0.6 + 0.4 * Math.sin(t * 3)));
  ctx.drawImage(C.title, tx, ty);
  ctx.globalAlpha = 1;
  // shine sweep across the gold
  const sw = inv(T.titleShine[0], T.titleShine[1], t);
  if (sw > 0 && sw < 1) {
    const [s, sx] = makeCanvas(C.titleMask.width, C.titleMask.height);
    const bx = lerp(-60, s.width + 60, easeInOut(sw));
    sx.fillStyle = 'rgba(255,255,240,0.9)';
    for (let y = 0; y < s.height; y++) sx.fillRect(Math.round(bx - y * 0.6), y, 7, 1);
    sx.fillStyle = 'rgba(255,255,240,0.45)';
    for (let y = 0; y < s.height; y++) sx.fillRect(Math.round(bx - y * 0.6) + 10, y, 3, 1);
    sx.globalCompositeOperation = 'destination-in'; sx.drawImage(C.titleMask, 0, 0);
    ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(s, tx + C.titleMaskOff, ty + C.titleMaskOff);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // twinkles around the logo
  const spots = [[tx + 8, ty + 10], [tx + C.title.width - 10, ty + 34], [tx + C.title.width * 0.42, ty + 2], [tx + 30, ty + C.title.height - 8], [tx + C.title.width * 0.7, ty + C.title.height - 4]];
  spots.forEach(([x, y], i) => { const ph = (t * 0.9 + i * 0.37) % 1.6; if (ph < 0.5) sparkle(ctx, Math.round(x), Math.round(y), 3, a * Math.sin(ph / 0.5 * Math.PI)); });
  // subtitle with flourishes
  const sy = ty + C.title.height + 6;
  const sa = a * clamp(inv(T.titleIn[0] + 0.6, T.titleIn[1] + 0.5, t));
  const sw2 = C.subtitle.width / S;
  ctx.globalAlpha = sa; ctx.fillStyle = '#e8c27a';
  const cx = W / 2;
  for (const dir of [-1, 1]) {
    const x0 = cx + dir * (sw2 / 2 + 6), x1 = cx + dir * (sw2 / 2 + 46);
    line(ctx, x0, sy + 6, x1, sy + 6, '#c99a52');
    ctx.fillStyle = '#ffe39a'; ctx.fillRect(Math.round(x1) - 1, sy + 5, 3, 3); ctx.fillStyle = '#c99a52'; ctx.fillRect(Math.round(x1), sy + 4, 1, 5); ctx.fillRect(Math.round(x1) - 2, sy + 6, 5, 1);
    ctx.fillStyle = '#ffe39a'; ctx.fillRect(Math.round(x0) + dir * 2, sy + 6, 1, 1);
  }
  ctx.globalAlpha = 1;
  uctx.globalAlpha = sa;
  const ux = Math.round(cx * S - C.subtitle.width / 2), uy = sy * S - 4;
  uctx.drawImage(C.subtitleSh, ux, uy + 2); uctx.drawImage(C.subtitle, ux, uy);
  uctx.globalAlpha = 1;
}

// ---------- cinematic letterbox + fades ----------
export function drawLetterbox(ctx, t) {
  const k = 1 - easeInOut(clamp(inv(T.beat1, T.beat1 + 0.8, t)));
  const h = Math.round(24 * k);
  if (h <= 0) return;
  ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
}
export function drawFade(ctx, t) {
  const a = 1 - easeInOut(clamp(inv(T.fadeIn[0], T.fadeIn[1], t)));
  if (a <= 0) return;
  ctx.fillStyle = `rgba(5,3,8,${a})`; ctx.fillRect(0, 0, W, H);
}

// ---------- in-world speech bubble (Beat 0) ----------
function bubbleBox(ctx, x, y, w, h, tail) {
  const OUT = '#2b1d26', FILL = '#fbf3dd', SH = '#e8d7b2', DROP = 'rgba(26,16,30,0.35)';
  ctx.fillStyle = DROP; ctx.fillRect(x + 2, y + h + 1, w - 2, 1); ctx.fillRect(x + w, y + 2, 1, h - 1);
  ctx.fillStyle = OUT; ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1); ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  ctx.fillStyle = FILL; ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = SH; ctx.fillRect(x + 2, y + h - 3, w - 4, 1); ctx.fillRect(x + w - 3, y + 3, 1, h - 5);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 2, Math.min(10, w - 8), 1);
  if (tail) {
    const [tx, ty] = tail;    // tip
    for (let k = 0; k < 6; k++) {
      const xx = tx - 4 + Math.round(k * 0.6), yy = y + h - 1 + k;
      if (yy > ty) break;
      ctx.fillStyle = OUT; ctx.fillRect(xx - 1, yy, 1, 1); ctx.fillRect(xx + Math.max(1, 5 - k), yy, 1, 1);
      ctx.fillStyle = FILL; if (5 - k > 0) ctx.fillRect(xx, yy, Math.max(0, 5 - k), 1);
    }
  }
}

export function drawBubbles(ctx, uctx, p, t) {
  for (const key of ['line1', 'line2']) {
    const d = DIALOGUE[key];
    for (const b of d.bubbles) {
      const [s, e] = b.show;
      if (t < s || t > e + 0.18) continue;
      const full = b.segs.map(x => x[0]).join('');
      const lines = wrap(uctx, full, 300);
      uctx.font = FONT_BODY;
      const maxW = Math.max(...lines.map(l => uctx.measureText(l).width));
      const bw = Math.ceil(maxW / S) + 14, bh = lines.length * 11 + 9;
      const head = [ELM.x + ELM.head, ELM.seat - ELM.seatRow + off(p, F.ground)];
      const tip = [head[0] - 5, head[1] - 2];
      let bx = Math.min(W - 8 - bw, tip[0] + 22 - bw), by = tip[1] - 8 - bh;
      const pop = t < s + 0.18 ? easeOutBack(clamp((t - s) / 0.18)) : (t > e ? 1 - clamp((t - e) / 0.18) : 1);
      const ww = Math.max(8, Math.round(bw * pop)), hh = Math.max(6, Math.round(bh * pop));
      const cx = bx + bw - ww + Math.round((ww - bw) * -0.0), cy = by + bh - hh;
      bubbleBox(ctx, Math.round(bx + (bw - ww) * 0.8), cy, ww, hh, pop > 0.9 ? tip : null);
      if (pop < 0.95) continue;
      const { text } = revealText(b.segs, d.at, t);
      drawWrapped(uctx, lines, text, (bx + 7) * S, (by + 4) * S, 22, '#3b2418');
    }
  }
}

function drawWrapped(uctx, lines, revealed, x, y, lh, color) {
  uctx.font = FONT_BODY;
  let left = revealed.length;
  lines.forEach((ln, i) => {
    if (left <= 0) return;
    const n = Math.min(ln.length, left);
    const img = crispLine(ln, color);
    const wpx = n >= ln.length ? img.width : Math.ceil(uctx.measureText(ln.slice(0, n)).width) + 4;
    uctx.drawImage(img, 0, 0, wpx, img.height, Math.round(x - 4), Math.round(y + i * lh - 3), wpx, img.height);
    left -= ln.length + 1;
  });
}

// ---------- Elminster speech HUD (slides in at Beat 1) ----------
// A compact box at the top centre, under the stage sign: it sits over the sky, so it never
// covers the hero (left), the rats (centre) or the action belt (bottom right).
export const HUD = { x: 202, y: 60, w: 236, h: 54 };
const boxNow = { h: HUD.h };                                  // the box grows a row for long lines
export const boxBottom = () => HUD.y + boxNow.h;
export const inHUD = (gx, gy) => gx >= HUD.x && gx < HUD.x + HUD.w && gy >= HUD.y - 8 && gy < HUD.y + boxNow.h;
const PW = 36;                                   // portrait well: the 72px portrait at 1:1 on the 2x UI canvas
let snortAt = null;                              // Beat 8: Elminster's amused pipe-puff snort
export function snort(t) { snortAt = t; }
const _frames = new Map();
function woodFrame(ctx, x, y, w, h) {
  const key = w + 'x' + h;
  if (!_frames.has(key)) {
    const cv = document.createElement('canvas'); cv.width = w + 6; cv.height = h + 6;
    paintFrame(cv.getContext('2d'), 1, 1, w, h);
    _frames.set(key, cv);
  }
  ctx.drawImage(_frames.get(key), x - 1, y - 1);
}
function paintFrame(ctx, x, y, w, h) {
  const O = '#140b0c';
  const px = (c, xx, yy, ww = 1, hh = 1) => { ctx.fillStyle = c; ctx.fillRect(xx, yy, ww, hh); };
  // soft drop shadow
  px('rgba(10,6,12,0.28)', x + 4, y + 5, w, h); px('rgba(10,6,12,0.32)', x + 2, y + 3, w, h);
  px(O, x, y, w, h);
  // carved oak frame: grain running along each side, bevel lit from the top-left
  const WOOD = ['#3d2414', '#56361d', '#6e4727', '#875a31', '#a1703f', '#b98a52'];
  const B = 6;
  for (let yy = 1; yy < h - 1; yy++) for (let xx = 1; xx < w - 1; xx++) {
    const e = Math.min(xx - 1, yy - 1, w - 2 - xx, h - 2 - yy); if (e >= B) continue;
    const horiz = Math.min(yy - 1, h - 2 - yy) < Math.min(xx - 1, w - 2 - xx);
    const g = horiz ? Math.sin(xx * 0.21 + yy * 1.7 + Math.sin(xx * 0.05) * 3) : Math.sin(yy * 0.21 + xx * 1.7 + Math.sin(yy * 0.05) * 3);
    let k = 2 + (g > 0.6 ? 1 : g < -0.7 ? -1 : 0);
    const topLeft = (yy - 1 === e && yy - 1 < h / 2) || (xx - 1 === e && xx - 1 < w / 2);
    if (e === 0) k = topLeft ? 5 : 1;                          // outer bevel
    else if (e === 1) k = topLeft ? 4 : k - 1;
    else if (e === B - 2) k = topLeft ? 1 : 4;                 // inner bevel (reversed: carved in)
    else if (e === B - 1) k = 0;
    px(WOOD[Math.max(0, Math.min(5, k))], x + xx, y + yy);
  }
  // gold inlay running round the frame
  const gi = 3;
  px('#8a5f1e', x + gi, y + gi, w - gi * 2, 1); px('#8a5f1e', x + gi, y + h - gi - 1, w - gi * 2, 1);
  px('#8a5f1e', x + gi, y + gi, 1, h - gi * 2); px('#8a5f1e', x + w - gi - 1, y + gi, 1, h - gi * 2);
  for (let i = 0; i < w - gi * 2; i += 7) { px('#e8c068', x + gi + i, y + gi); px('#e8c068', x + gi + i + 3, y + h - gi - 1); }
  // parchment: warm centre, toasted edges (dithered), fibres and a couple of old stains
  const ppx = x + B, ppy = y + B, pw = w - B * 2, ph = h - B * 2;
  const PAR = ['#b58d58', '#cba571', '#dcbf8c', '#e9d3a6', '#f2e2bd', '#f8edd2'];
  for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) {
    const e = Math.min(xx, yy, pw - 1 - xx, ph - 1 - yy);
    const n = hash(xx * 31 + yy * 7, 77), lump = Math.sin(xx * 0.09 + yy * 0.05) * 0.5 + Math.sin(xx * 0.031 - yy * 0.11) * 0.5;
    let t = 4.15 + lump * 0.12 - Math.max(0, 5 - e) * 0.42 - (yy / ph) * 0.3;
    if (n > 0.965) t -= 0.7; else if (n < 0.02) t += 0.7;
    const b = ((xx + yy) & 1) ? 0.25 : -0.25;
    px(PAR[Math.max(0, Math.min(5, Math.round(t + (e < 6 ? b : 0))))], ppx + xx, ppy + yy);
  }
  // faint watermark: Elminster's sigil (a ring with a seven-pointed star), bottom right
  const wx = ppx + pw - 26, wy = ppy + ph - 25;
  ctx.globalAlpha = 0.13; ctx.fillStyle = '#6b4023';
  for (let a = 0; a < 96; a++) { const r = 16, an = a / 96 * Math.PI * 2; ctx.fillRect(Math.round(wx + Math.cos(an) * r), Math.round(wy + Math.sin(an) * r), 1, 1); ctx.fillRect(Math.round(wx + Math.cos(an) * (r - 3)), Math.round(wy + Math.sin(an) * (r - 3)), 1, 1); }
  for (let k = 0; k < 7; k++) { const a0 = -Math.PI / 2 + k * Math.PI * 2 / 7, a1 = a0 + Math.PI * 2 / 7 * 3; for (let i = 0; i <= 20; i++) { const f = i / 20, r = 12; ctx.fillRect(Math.round(wx + (Math.cos(a0) * (1 - f) + Math.cos(a1) * f) * r), Math.round(wy + (Math.sin(a0) * (1 - f) + Math.sin(a1) * f) * r), 1, 1); } }
  ctx.globalAlpha = 1;
  // inner shadow where the parchment tucks under the frame
  px('rgba(60,30,10,0.35)', ppx, ppy, pw, 1); px('rgba(60,30,10,0.2)', ppx, ppy + 1, pw, 1); px('rgba(60,30,10,0.3)', ppx, ppy, 1, ph);
  // brass corner caps with a little sapphire
  for (const [cx, cy, fx, fy] of [[x - 1, y - 1, 1, 1], [x + w - 10, y - 1, -1, 1], [x - 1, y + h - 10, 1, -1], [x + w - 10, y + h - 10, -1, -1]]) {
    px(O, cx, cy, 11, 11);
    px('#9a7026', cx + 1, cy + 1, 9, 9);
    px('#d9a948', cx + 2, cy + 2, 7, 7);
    px('#f6d888', cx + 2, cy + 2, 7, 1); px('#f6d888', cx + 2, cy + 2, 1, 7);
    px('#7a5418', cx + 2, cy + 8, 7, 1); px('#7a5418', cx + 8, cy + 2, 1, 7);
    px(O, cx + 4, cy + 4, 3, 3); px('#3f86c4', cx + 4, cy + 4, 3, 3); px('#9fd4ff', cx + 4, cy + 4, 1, 1); px('#1d3f6a', cx + 6, cy + 6, 1, 1);
    // filigree tails running along the frame
    for (let i = 0; i < 6; i++) { px('#c99a3c', cx + 5 + fx * (6 + i) + (fx < 0 ? 0 : 0), cy + 5 + (i % 3 === 1 ? -fy : 0)); px('#c99a3c', cx + 5 + (i % 3 === 1 ? -fx : 0), cy + 5 + fy * (6 + i)); }
  }
}

export function drawHUD(ctx, uctx, t) {
  if (t < T.hudIn[0]) return;
  const k = easeOutBack(clamp(inv(T.hudIn[0], T.hudIn[1], t)));
  const y = Math.round(HUD.y - (1 - k) * 90), x = HUD.x;      // drops in from above
  const d = hudLine(t);
  const full = d.segs.map(s => s[0]).join('');
  const tx = x + PW + 18, lines = wrap(uctx, full, (HUD.w - PW - 28) * S);
  const hh = HUD.h + Math.max(0, lines.length - 3) * 12;      // a fourth line just makes the box taller
  boxNow.h = hh;
  woodFrame(ctx, x, y, HUD.w, hh);
  // portrait well: gilded bevel with rivets
  const pwx = x + 8, pwy = y + 9;
  ctx.fillStyle = '#140b0c'; ctx.fillRect(pwx - 3, pwy - 3, PW + 6, PW + 6);
  ctx.fillStyle = '#7a5418'; ctx.fillRect(pwx - 2, pwy - 2, PW + 4, PW + 4);
  ctx.fillStyle = '#d9a948'; ctx.fillRect(pwx - 2, pwy - 2, PW + 3, PW + 3);
  ctx.fillStyle = '#f6d888'; ctx.fillRect(pwx - 2, pwy - 2, PW + 3, 1); ctx.fillRect(pwx - 2, pwy - 2, 1, PW + 3);
  ctx.fillStyle = '#9a7026'; ctx.fillRect(pwx - 1, pwy - 1, PW + 2, PW + 2);
  ctx.fillStyle = '#140b0c'; ctx.fillRect(pwx, pwy, PW, PW);
  for (const [rx, ry] of [[pwx - 1, pwy - 1], [pwx + PW, pwy - 1], [pwx - 1, pwy + PW], [pwx + PW, pwy + PW]]) { ctx.fillStyle = '#fff1b8'; ctx.fillRect(rx, ry, 1, 1); }
  // nameplate: a crimson ribbon with forked tails and gold edging
  const nx = x + 14, ny = y - 8, nw = 68;
  const tail = (sx, dir, pass) => {
    for (let r = 0; r < 10; r++) {
      const notch = r >= 2 && r <= 7 ? 3.5 - Math.abs(r - 4.5) * 1.2 : 0;
      const len = 8 - Math.max(0, notch);
      const x0 = dir < 0 ? sx - len : sx, yy = ny + 3 + r;
      if (pass === 0) { ctx.fillStyle = '#140b0c'; ctx.fillRect(x0 - 1, yy - 1, len + 2, 3); }
      else { ctx.fillStyle = r < 2 ? '#8e2c3a' : r > 7 ? '#4e121c' : '#6a1e2a'; ctx.fillRect(x0, yy, len, 1); }
    }
    if (pass) { ctx.fillStyle = '#3a0c14'; ctx.fillRect(dir < 0 ? sx - 1 : sx, ny + 3, 1, 10); }
  };
  for (const pass of [0, 1]) { tail(nx, -1, pass); tail(nx + nw, 1, pass); }
  ctx.fillStyle = '#140b0c'; ctx.fillRect(nx - 1, ny - 1, nw + 2, 14);
  ctx.fillStyle = '#7b2430'; ctx.fillRect(nx, ny, nw, 12);
  ctx.fillStyle = '#a3384a'; ctx.fillRect(nx, ny, nw, 2);
  ctx.fillStyle = '#4e121c'; ctx.fillRect(nx, ny + 10, nw, 2);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(nx + 2, ny + 1, nw - 4, 1); ctx.fillRect(nx + 2, ny + 10, nw - 4, 1);
  // portrait (UI canvas, 1:1 pixels)
  const speaking = speakingAt(t);
  const pb = speaking && Math.floor(t / 0.18) % 2 ? -1 : 0;
  const PX = pwx * S, PY = pwy * S;
  uctx.save();
  uctx.beginPath(); uctx.rect(PX, PY, PW * S, PW * S); uctx.clip();
  const snD = t - snortAt, snorting = snortAt !== null && snD >= 0 && snD < 1.15;
  const pf = snorting ? 2 : speaking ? [1, 0, 1, 1][Math.floor(t / 0.11) % 4] : ((t % 3.7) < 0.14 ? 2 : 0);
  uctx.imageSmoothingEnabled = false;
  uctx.drawImage(C.portrait[pf], PX, PY + pb);
  if (pb) uctx.drawImage(C.portrait[pf], 0, 71, 72, 1, PX, PY + 72 + pb, 72, -pb);
  for (let i = 0; i < 12; i++) {                               // pipe smoke curling off the portrait
    const spawn = Math.floor(t / 0.3) * 0.3 - i * 0.3, age = t - spawn; if (age < 0 || age > 3.4) continue;
    const sx = PX + PORTRAIT_PIPE[0] + Math.sin(spawn * 2.7 + age * 2) * (1 + age * 1.6), sy = PY + PORTRAIT_PIPE[1] - 1 - age * 11 + pb;
    uctx.globalAlpha = 0.55 * (1 - age / 3.4); uctx.fillStyle = '#e9e4ee'; uctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  }
  if (snorting) {                                              // the snort: two fat rings blown out of the pipe
    for (let j = 0; j < 2; j++) {
      const age = snD - j * 0.22; if (age < 0) continue;
      const r = 2 + age * 14, cxr = PX + PORTRAIT_PIPE[0] + age * 9, cyr = PY + PORTRAIT_PIPE[1] - 2 - age * 8;
      uctx.globalAlpha = 0.75 * (1 - snD / 1.15);
      uctx.fillStyle = '#efeaf2';
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; uctx.fillRect(Math.round(cxr + Math.cos(a) * r), Math.round(cyr + Math.sin(a) * r * 0.8), 2, 2); }
    }
  }
  uctx.globalAlpha = 1;
  uctx.restore();
  // name text
  const nX = Math.round((nx + nw / 2) * S - C.nameS.width / 2), nY = Math.round((ny + 6) * S - C.nameS.height / 2);
  uctx.drawImage(C.nameSSh, nX, nY + 2);
  uctx.drawImage(C.nameS, nX, nY);
  // dialogue text
  if (k > 0.98) {
    const { text, done } = d.skip && t >= d.skip ? { text: full, done: true } : revealText(d.segs, d.at, t);
    drawWrapped(uctx, lines, text, tx * S, (y + 9) * S, 23, '#3b2418');
    if (done) {
      const bob = Math.floor(t * 3) % 2;
      const ax = x + HUD.w - 15, ay = y + hh - 12 + bob;
      ctx.fillStyle = '#140b0c'; ctx.fillRect(ax - 1, ay - 1, 7, 1);
      for (let r = 0; r < 3; r++) { ctx.fillStyle = '#140b0c'; ctx.fillRect(ax + r - 1, ay + r, 7 - r * 2, 1); ctx.fillStyle = r === 0 ? '#ffe39a' : '#d9a53f'; ctx.fillRect(ax + r, ay + r, 5 - r * 2, 1); }
    }
  }
}

export { d20 };
