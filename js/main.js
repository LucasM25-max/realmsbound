// ─────────────────────────────────────────────────────────────
//  REALMSBOUND — boot, input + render loop for Stage 1 · Beats 0–5
// ─────────────────────────────────────────────────────────────
import { W, H, T, UI_SCALE } from './timeline.js';
import { loadAll } from './assets.js';
import { clamp, inv, easeInOut } from './util.js';
import * as world from './world.js';
import * as act from './actors.js';
import * as ui from './ui.js';
import * as hud from './hud.js';
import { AudioEngine } from './audio.js';
import { bloom } from './fx.js';
import * as combat from './combat.js';
import * as beat2 from './beat2.js';
import * as beat3 from './beat3.js';
import * as beat4 from './beat4.js';
import * as beat5 from './beat5.js';
import * as beat6 from './beat6.js';
import * as beat7 from './beat7.js';
import * as beat8 from './beat8.js';
import * as beat9 from './beat9.js';
import { gauntletCursor } from './art/gauntlet.js';
import { DIALOGUE, hudLine, skipElminster, resetSkipElminster, isElminsterSkipped } from './timeline.js';

const game = document.getElementById('game');
const uiC = document.getElementById('ui');
const stage = document.getElementById('stage');
const ctx = game.getContext('2d');
const uctx = uiC.getContext('2d');
ctx.imageSmoothingEnabled = false; uctx.imageSmoothingEnabled = false;

const params = new URLSearchParams(location.search);
const SEEK = params.has('t') ? parseFloat(params.get('t')) : null;   // ?t=12  -> freeze-frame for screenshots
const AUTOPLAY = params.has('autoplay');

let progress = 0, ready = false, started = false, clockStart = 0, audio = null, failed = null;

// ---- fill-viewport scaling (preserving 16:9 aspect ratio) ----
function fit() {
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = document.documentElement.clientHeight || innerHeight;
  const scale = Math.min(vw / W, vh / H);
  stage.style.width = `${Math.round(W * scale)}px`;
  stage.style.height = `${Math.round(H * scale)}px`;
}
addEventListener('resize', fit);
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(document.documentElement);
fit();

// ---- clock ----
function sceneTime() {
  if (SEEK !== null && !started) return SEEK;
  if (!started) return 0;
  if (audio && audio.ctx && audio.session) return audio.now();
  return (performance.now() - clockStart) / 1000;
}

async function begin(seek = 0) {
  if (started && seek === 0 && audio) { audio.start(0); return; }
  started = true;
  clockStart = performance.now() - seek * 1000;
  document.body.classList.add('playing');
  try {
    if (!audio) { audio = new AudioEngine(); await audio.init(); }
    if (audio.ctx.state === 'suspended') await audio.ctx.resume();
    audio.start(seek);
  } catch (e) { console.warn('audio unavailable', e); audio = null; }
}

// ---- input ----
// stage pixels -> the native 640×360 grid
function toGame(e) { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function onActivate() {
  if (!ready) return;
  if (!started) begin(SEEK ?? 0);
}
function triggerSkipElminster(t) {
  if (isElminsterSkipped()) return false;
  skipElminster();
  if (t < T.beat1) {
    clockStart = performance.now() - T.beat1 * 1000;
    if (audio) audio.start(T.beat1);
  } else if (audio && audio.session) {
    audio.paper(audio.ctx.currentTime);
  }
  return true;
}

stage.addEventListener('pointerdown', e => {
  if (!ready) return;
  if (!started) { begin(SEEK ?? 0); return; }
  const t = sceneTime(), [gx, gy] = toGame(e);
  // a modal screen owns every click while it's open (Training or Gear)
  if (beat6.trainingOpen() || beat8.gearOpen()) { if (!beat6.click(gx, gy, t)) beat8.click(gx, gy, t); return; }
  if (beat7.click(gx, gy, t)) return;              // Snikkit's loot card and the spoils in the grass
  if (beat6.click(gx, gy, t)) return;              // the Train tile
  if (beat8.click(gx, gy, t)) return;              // the Gear tile
  if (ui.inSkip(gx, gy, t) && triggerSkipElminster(t)) return;
  // clicking the dialogue box finishes the line (nobody has to wait on an old wizard)
  if (t >= T.hudIn[1] && ui.inHUD(gx, gy)) { const d = hudLine(t); if (!d.skip) d.skip = t; return; }
  if (!beat3.click(gx, gy, t)) beat2.click(gx, gy, t);
});
stage.addEventListener('pointermove', e => { if (!started) return; const [gx, gy] = toGame(e); beat2.hover(gx, gy); beat7.hover(gx, gy); beat8.hover(gx, gy); });
stage.addEventListener('pointerleave', () => { beat2.hover(null, null); beat7.hover(null, null); beat8.hover(null, null); });
stage.addEventListener('wheel', e => { if (started && beat8.gearOpen() && beat8.wheel(e.deltaY)) e.preventDefault(); }, { passive: false });
addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') { if (audio) { audio.setMuted(!audio.muted); muteBtn.classList.toggle('off', audio.muted); hud.setHudMuted(audio.muted); } return; }
  if (e.key === 'r' || e.key === 'R') { if (started) replay(); return; }
  const kt = sceneTime();
  if (started && beat8.gearOpen()) { if (beat8.key(e.key, kt)) return; }            // the Gear screen owns its keys
  else if (started && beat6.trainingOpen()) { if (beat6.key(e.key, kt)) return; }   // the Training screen owns its keys
  else if (started) {
    if ((e.key === 's' || e.key === 'S' || (e.key === 'Escape' && kt < T.beat1)) && triggerSkipElminster(kt)) return;
    if ((e.key === 't' || e.key === 'T') && beat6.key(e.key, kt)) return;
    if ((e.key === 'g' || e.key === 'G') && beat8.key(e.key, kt)) return;
    if (e.key === 'Escape' && beat7.key(e.key, kt)) return;
    if ((e.key === ' ' || e.key === 'Enter') && beat7.key(e.key, kt)) return;
  }
  if (e.key === ' ' || e.key === 'Enter') onActivate();
});
const muteBtn = document.getElementById('mute');
muteBtn.addEventListener('click', e => { e.stopPropagation(); if (audio) { audio.setMuted(!audio.muted); muteBtn.classList.toggle('off', audio.muted); hud.setHudMuted(audio.muted); } });
muteBtn.addEventListener('pointerdown', e => e.stopPropagation());
function replay() {
  beat2.reset();
  beat3.reset();
  beat4.reset();
  beat5.reset();
  beat6.reset();
  beat7.reset();
  beat8.reset();
  beat9.reset();
  resetSkipElminster();
  ui.resetSpeech();
  for (const d of Object.values(DIALOGUE)) delete d.skip;
  clockStart = performance.now(); if (audio) audio.start(0);
}
// the pointer becomes a steel gauntlet whenever playing (pixel-crisp at the stage's scale)
let cursorKey = '';
function updateCursor() {
  const on = started;
  const sc = Math.max(1, Math.min(3, Math.round(stage.getBoundingClientRect().width / W)));
  const key = on ? 'g' + sc : 'd';
  if (key === cursorKey) return;
  cursorKey = key;
  if (!on) {
    stage.style.cursor = '';
    document.body.style.cursor = '';
    muteBtn.style.cursor = '';
    return;
  }
  const g = gauntletCursor(sc);
  const cur = `url(${g.url}) ${g.hx} ${g.hy}, pointer`;
  stage.style.cursor = cur;
  document.body.style.cursor = cur;
  muteBtn.style.cursor = cur;
}

// ---- render ----
function renderScene(t) {
  beat2.step(t);                                   // advance the live fight to t (Beat 2)
  beat3.step(t);                                   // …the coins it drops (Beat 3)
  beat4.step(t);                                   // …the quota-bar spotlight (Beat 4)
  beat5.step(t);                                   // …and the goblin assault (Beat 5)
  beat6.step(t);                                   // …and the first trip to the Training Yard (Beat 6)
  beat7.step(t);                                   // …and Snikkit's pie-heist (Beat 7)
  beat8.step(t);                                   // …and the first equip (Beat 8)
  beat9.step(t);                                   // …and the first level-up (Beat 9)
  const cues = combat.takeLiveCues(); if (audio && started) audio.addLive(cues);
  const p = easeInOut(inv(T.pan[0], T.pan[1], t));
  ctx.clearRect(0, 0, W, H);
  uctx.clearRect(0, 0, uiC.width, uiC.height);
  world.drawSky(ctx, p, t);
  world.drawSun(ctx, p, t);
  world.drawGodRays(ctx, p, t);
  world.drawClouds(ctx, p, t);
  act.drawBirds(ctx, p, t);
  world.drawRange(ctx, p, t);
  world.drawFar(ctx, p, t);
  world.drawMist(ctx, p, t);
  world.drawVillage(ctx, p, t);
  act.drawChimneySmoke(ctx, p, t);
  world.drawNear(ctx, p, t);
  world.drawGround(ctx, p, t);
  world.drawScarecrow(ctx, p, t);
  act.drawCrow(ctx, p, t);
  act.drawBurrowRustle(ctx, p, t);
  act.drawHero(ctx, p, t);
  const hb = act.heroBox(p, t);
  combat.drawCombatWorld(ctx, p, t, hb);
  act.drawElminster(ctx, p, t);
  act.drawPipeSmoke(ctx, p, t);
  act.drawButterflies(ctx, p, t);
  act.drawMotes(ctx, p, t);
  world.drawForeground(ctx, p, t);
  world.drawGrade(ctx, p, t);
  // a hit shakes the world (never the HUD): blit the finished world back onto itself, offset
  const [shx, shy] = combat.combatShake(t);
  if (shx || shy) ctx.drawImage(game, shx, shy);
  bloom(ctx, { threshold: 0.64, strength: 0.5 });
  combat.drawSpotlight(ctx, p, t, hb);
  beat2.drawSpot(ctx, p, t);
  beat3.drawSpot(ctx, p, t);
  ui.drawFade(ctx, t);
  ui.drawLetterbox(ctx, t);
  ui.drawTitle(ctx, uctx, p, t);
  ui.drawBubbles(ctx, uctx, p, t);
  hud.setHudMuted(audio ? audio.muted : false);
  hud.drawGameHUD(ctx, uctx, t);
  beat4.drawSpot(ctx, p, t);                       // Beat 4's spotlight dims the world + HUD…
  beat6.drawSpot(ctx, p, t);                       // …Beat 6's too, on the pulsing Train tile
  beat8.drawSpot(ctx, p, t);                       // …and Beat 8's, on the Gear tile
  ui.drawHUD(ctx, uctx, t);                        // …but never the wizard's own box
  ui.drawSkipButton(ctx, uctx, t);
  combat.drawCombatOverlay(ctx, p, t, hb);
  beat2.drawOverlay(ctx, uctx, p, t);
  beat3.drawOverlay(ctx, uctx, p, t);
  beat4.drawOverlay(ctx, uctx, p, t);
  beat5.drawOverlay(ctx, uctx, p, t);
  beat7.drawOverlay(ctx, uctx, p, t);              // Snikkit, the loot and the loot card
  beat8.drawOverlay(ctx, uctx, p, t);              // the Gear screen
  beat9.drawOverlay(ctx, uctx, p, t);              // the level-up pillar and banner
  beat6.drawOverlay(ctx, uctx, p, t);              // the Training screen draws last: it's modal
  document.body.classList.toggle('hud', t >= hud.HUD_TIMES.purse + 0.3);
}

function frame() {
  const now = performance.now() / 1000;
  try {
    if (failed) { drawError(); }
    else if (!started && SEEK === null) {
      ctx.clearRect(0, 0, W, H); uctx.clearRect(0, 0, uiC.width, uiC.height);
      ui.drawStart(ctx, uctx, now, progress, ready);
    } else if (ready) {
      const t = sceneTime();
      if (audio) audio.update(t);
      renderScene(t);
      if (started && audio && !audio.muted) ui.pollSpeech(t, now, (ch, cur) => audio.mumble(ch, cur.length));
      updateCursor();
    }
  } catch (e) { console.error(e); failed = e; }
  requestAnimationFrame(frame);
}

function drawError() {
  ctx.fillStyle = '#100810'; ctx.fillRect(0, 0, W, H);
  uctx.clearRect(0, 0, uiC.width, uiC.height);
  uctx.fillStyle = '#ff9a9a'; uctx.font = '20px monospace'; uctx.fillText('Error: ' + (failed.message || failed), 40, 60);
}

// ---- boot ----
(async () => {
  requestAnimationFrame(frame);
  // a font that fails to load must not stall us; it just falls back
  try {
    await loadAll(v => { progress = v; });
    ui.buildUI();
    hud.buildHUD();
    world.buildWorld();
    act.buildActors();
    combat.buildCombat();
    beat2.buildBeat2();
    beat2.reset();
    beat3.buildBeat3();
    beat3.reset();
    beat4.buildBeat4();
    beat4.reset();
    beat5.buildBeat5();
    beat5.reset();
    beat6.buildBeat6();
    beat6.reset();
    beat7.buildBeat7();
    beat7.reset();
    beat8.buildBeat8();
    beat8.reset();
    beat9.reset();
    ready = true;
    document.body.classList.add('ready');
    if (AUTOPLAY) begin(SEEK ?? 0);
    window.__ready = true;
  } catch (e) { console.error(e); failed = e; }
})();

// screenshot + test hooks
window.__render = t => { renderScene(t); };
window.__state = () => ({ t: +sceneTime().toFixed(2), started, audio: audio ? audio.ctx.state : null, muted: audio ? audio.muted : null,
  voices: audio ? Object.keys(audio.voices).length : 0, nodes: audio && audio.session ? audio.session.nodes.length : 0, failed: failed ? String(failed) : null,
  quota: combat.hudState(sceneTime()).quota, cp: combat.hudState(sceneTime()).cp,
  replayShown: false, beat2: beat2.debug(), beat3: beat3.debug(), beat4: beat4.debug(), beat5: beat5.debug(), beat6: beat6.debug(), beat7: beat7.debug(), beat8: beat8.debug(), beat9: beat9.debug() });
// test hook: click a point on the native grid at the current time
window.__click = (gx, gy) => { const t = sceneTime(); if (beat6.trainingOpen() || beat8.gearOpen()) return beat6.click(gx, gy, t) ? 'train' : (beat8.click(gx, gy, t) ? 'gear' : null); if (beat7.click(gx, gy, t)) return 'loot'; if (beat6.click(gx, gy, t)) return 'train'; if (beat8.click(gx, gy, t)) return 'gear'; if (ui.inSkip(gx, gy, t) && triggerSkipElminster(t)) return 'skip'; if (t >= T.hudIn[1] && ui.inHUD(gx, gy)) { const d = hudLine(t); if (!d.skip) d.skip = t; return 'hud'; } return beat3.click(gx, gy, t) ? 'coin' : beat2.click(gx, gy, t); };
window.__train = () => beat6.debug();
window.__snik = () => beat7.debug();
window.__gear = () => beat8.debug();
window.__ratPoints = () => beat2.ratPoints(sceneTime());
window.__coinPoints = () => beat3.coinPoints(sceneTime());
window.__goblinPoints = () => beat5.goblinPoints(sceneTime());
// test hook: the launched goblin's live arc position (and whether the launch store flags are set)
window.__launch = () => {
  const s = sceneTime();
  const g = combat.E.rats.find(r => r.launched);
  if (!g) return null;
  const p = combat.launchPos(g, s);
  return { s: +s.toFixed(2), dieAt: g.dieAt, popAt: g.popAt, deathX: g.deathX, depth: g.depth, p: p ? { x: +p.x.toFixed(1), y: +p.y.toFixed(1), k: +p.k.toFixed(2) } : null };
};
