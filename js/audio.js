// ─────────────────────────────────────────────────────────────
//  Audio: "Shadowdale Morning" (procedural pastoral chiptune-meets-
//  chamber score), dawn ambience (wind, birdsong, distant cowbell),
//  Foley (footsteps, pipe puffs, crow, UI) and Elminster's VO.
//  Everything is scheduled against the cinematic clock so it stays
//  locked to the visuals (and supports seeking/replay).
// ─────────────────────────────────────────────────────────────
import { T, DIALOGUE } from './timeline.js';
import { VOICE_RAW } from './assets.js';
import { heroFootsteps, RUSTLES } from './actors.js';
import { combatCues, CB } from './combat.js';
import { mulberry } from './util.js';
import { HUD_TIMES } from './hud.js';
import { VOICE_BARKS, findOption } from './progression.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() { this.ctx = null; this.voices = {}; this.muted = false; this.heroVoice = 'gruff'; }
  setHeroVoice(id) { this.heroVoice = findOption(VOICE_BARKS, id).id; }
  previewBark(id = this.heroVoice) {
    if (!this.ctx || !this.session) return;
    this.shout(this.ctx.currentTime + 0.01, Math.floor(Math.random() * 5), id);
  }

  async init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.master.connect(comp); comp.connect(c.destination);
    this.reverb = c.createConvolver(); this.reverb.buffer = this.makeIR(2.8);
    this.revOut = c.createGain(); this.revOut.gain.value = 0.32; this.reverb.connect(this.revOut); this.revOut.connect(this.master);
    this.noise = this.makeNoise(3);
    for (const [k, buf] of Object.entries(VOICE_RAW)) {
      try { this.voices[k] = await c.decodeAudioData(buf.slice(0)); } catch (e) { console.warn('voice decode failed', k, e); }
    }
  }

  makeIR(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); const r = mulberry(7 + ch); for (let i = 0; i < len; i++) { const tt = i / len; d[i] = (r() * 2 - 1) * Math.pow(1 - tt, 3.2) * (i < c.sampleRate * 0.012 ? 0 : 1); } }
    return b;
  }
  makeNoise(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    const r = mulberry(3); for (let i = 0; i < len; i++) d[i] = r() * 2 - 1; return b;
  }

  // ---- session (one playthrough) ----
  start(seek = 0) {
    this.stop();
    const c = this.ctx;
    this.t0 = c.currentTime + 0.08 - seek;      // cinematic t = currentTime - t0
    const S = this.session = {};
    S.out = c.createGain(); S.out.gain.value = this.muted ? 0 : 1; S.out.connect(this.master);
    S.rev = c.createGain(); S.rev.connect(this.reverb);
    S.music = c.createGain(); S.music.gain.value = 0.5; S.duck = c.createGain(); S.music.connect(S.duck); S.duck.connect(S.out);
    S.musicRev = c.createGain(); S.musicRev.gain.value = 0.55; S.music.connect(S.musicRev); S.musicRev.connect(S.rev);
    S.amb = c.createGain(); S.amb.gain.value = 0.9; S.amb.connect(S.out);
    S.sfx = c.createGain(); S.sfx.gain.value = 0.9; S.sfx.connect(S.out);
    S.voice = c.createGain(); S.voice.gain.value = 1.15; S.voice.connect(S.out);
    const vr = c.createGain(); vr.gain.value = 0.07; S.voice.connect(vr); vr.connect(S.rev);
    S.nodes = [];
    this.events = this.buildEvents().filter(e => e.t >= seek - 0.01).sort((a, b) => a.t - b.t);
    this.ptr = 0;
    this.live = [];
    this.startWind(seek);
    // voices already underway at the seek point
    for (const d of Object.values(DIALOGUE)) {
      const buf = this.voices[d.clip]; if (!buf) continue;
      if (seek > d.at && seek < d.at + buf.duration) this.playVoice(d, seek, seek - d.at);
    }
  }
  stop() {
    if (!this.session) return;
    const S = this.session, c = this.ctx;
    S.out.gain.setTargetAtTime(0, c.currentTime, 0.05);
    const nodes = S.nodes; setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { S.out.disconnect(); S.rev.disconnect(); } catch (e) {} }, 400);
    this.session = null;
  }
  setMuted(m) { this.muted = m; if (this.session) this.session.out.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05); }
  now() { return this.ctx.currentTime - this.t0; }
  at(t) { return this.t0 + t; }

  // cues decided during live play (Beat 2): fired when due; ones that are already stale are dropped
  addLive(cues) {
    if (!this.session || !cues.length) return;
    for (const c of cues) this.live.push(c);
    this.live.sort((a, b) => a.t - b.t);
  }
  update(t) {
    if (!this.session) return;
    const horizon = t + 0.3;
    while (this.live.length && this.live[0].t < horizon) {
      const c = this.live.shift();
      if (c.void || c.t < t - 0.15) continue;
      try { this.cue(Math.max(this.ctx.currentTime, this.at(c.t)), c); } catch (err) { console.warn(err); }
    }
    while (this.ptr < this.events.length && this.events[this.ptr].t < horizon) {
      const e = this.events[this.ptr++];
      try { e.fn(Math.max(this.ctx.currentTime, this.at(e.t))); } catch (err) { console.warn(err); }
    }
  }

  // ---- event list ----
  buildEvents() {
    const ev = [];
    const add = (t, fn) => ev.push({ t, fn });
    // ===== music =====
    const BEAT = 0.796, BAR = BEAT * 3, M0 = 0.8;
    const CH = { D: [50, [62, 66, 69]], G: [43, [59, 62, 67]], Bm: [47, [59, 62, 66]], A: [45, [57, 61, 64]], Em: [40, [59, 64, 67]] };
    const PROG = [['D'], ['G'], ['Bm'], ['A'], ['D'], ['G'], ['Em', 'A'], ['D']];
    const MEL = [
      [], [],
      [[78, 1], [81, 1], [83, 1]], [[81, 2], [76, 1]], [[78, 1], [76, .5], [74, .5], [76, 1]], [[74, 2], [71, 1]], [[79, 1], [78, 1], [76, 1]], [[74, 3]],
      [[81, 1], [78, 1], [81, 1]], [[83, 2], [79, 1]], [[78, 1], [74, 1], [78, 1]], [[76, 3]], [[78, .5], [79, .5], [81, 1], [78, 1]], [[79, 1], [83, 1], [86, 1]], [[85, 1], [83, 1], [81, 1]], [[86, 3]],
    ];
    for (let bar = 0; bar < 120; bar++) {          // ~4.8 min: Beat 2 is live and can run long
      const bt = M0 + bar * BAR;
      const chords = PROG[bar % 8];
      const half = chords.length > 1;
      chords.forEach((ck, ci) => {
        const [root, tones] = CH[ck];
        const st = bt + (half ? ci * BEAT * 1.5 : 0), len = half ? BAR / 2 : BAR;
        // lute arpeggio (6 eighths per bar)
        const pat = [root + 12, tones[0], tones[1], tones[2], tones[1], tones[0]];
        const n = half ? 3 : 6;
        for (let i = 0; i < n; i++) {
          const idx = half ? [0, 2, 3][i] : i;
          const tt = st + i * BEAT / 2;
          const vel = (i === 0 ? 0.15 : 0.1) * (bar < 1 ? 0.75 : 1);
          add(tt, at => this.pluck(at, pat[idx], vel, (i % 2 ? 0.25 : -0.2)));
        }
        if (bar >= 1) add(st, at => this.pad(at, tones.map(x => x - 12 + 12), len, 0.018));
        if (bar >= 1) add(st, at => this.bass(at, root, len * 0.95, 0.12));
      });
      // flute melody
      const mel = MEL[bar % 16] || [];
      let beatPos = 0;
      for (const [m, b] of mel) { const tt = bt + beatPos * BEAT; const dur = b * BEAT; add(tt, at => this.flute(at, m, dur * 0.96, bar >= 8 ? 0.075 : 0.065)); beatPos += b; }
      // Beat 1: a perkier percussion layer joins as the HUD arrives
      if (bt >= T.beat1 - 0.2) {
        add(bt, at => this.drum(at, 0.32)); add(bt + BEAT * 2, at => this.drum(at, 0.16));
        for (let i = 1; i < 6; i += 2) add(bt + i * BEAT / 2, at => this.tamb(at, 0.05));
        add(bt + BEAT * 1, at => this.tamb(at, 0.035));
      }
    }
    // ===== title stinger =====
    add(0.3, at => this.swell(at, 1.4, 0.07));
    add(0.95, at => this.timpani(at, 38, 0.5));
    [86, 90, 93, 98, 102].forEach((m, i) => add(T.titleShine[0] + i * 0.085, at => this.bell(at, mtof(m), 0.05, 2.2, 3.01, (i - 2) * 0.3)));
    add(T.titleShine[0] + 0.5, at => this.shimmer(at, 0.9, 0.025));
    // ===== ambience =====
    const r = mulberry(42);
    for (let t = 1.2; t < 300;) { const type = Math.floor(r() * 3); const pan = r() * 1.6 - 0.8; const g = 0.025 + r() * 0.03; add(t, at => this.bird(at, type, pan, g, r)); t += 0.7 + r() * 2.2; }
    add(9.6, at => this.bell(at, 560, 0.022, 1.8, 1.43, -0.5, true));
    add(17.4, at => this.bell(at, 540, 0.02, 1.8, 1.43, -0.6, true));
    // ===== foley =====
    for (const st of heroFootsteps()) add(st.t, at => this.step(at, (st.x - 320) / 360));
    for (const pt of [T.puff1, 15.2, T.puff2]) { add(pt, at => this.inhale(at, 0.6)); add(pt + 0.55, at => this.exhale(at, 0.6)); }
    add(T.crowFlee, at => { this.caw(at, 0.12); this.caw(at + 0.32, 0.12); this.flaps(at, 0.12); });
    for (const d of [DIALOGUE.line1, DIALOGUE.line2]) for (const b of d.bubbles) add(b.show[0], at => this.pop(at));
    add(T.beat1, at => this.whoosh(at, 0.55, 0.06));
    add(T.hudIn[0] + 0.3, at => this.knock(at));
    add(T.hudIn[0] + 0.1, at => this.paper(at));
    // game HUD: each panel lands with a soft wooden thock; the purse clinks, the goal tags pop
    for (const [k, d] of [['plate', 0.45], ['sign', 0.5], ['belt', 0.45], ['next', 0.4]]) add(HUD_TIMES[k] + d * 0.55, at => this.knock(at));
    add(HUD_TIMES.purse + 0.25, at => this.bell(at, 2350, 0.018, 0.5, 2.76, 0.6));
    for (const k of ['soon', 'now']) add(HUD_TIMES[k] + 0.12, at => this.pop(at));
    for (const rt of RUSTLES) add(rt, at => { this.rustle(at, 0.35); if (CB.eyes.includes(rt)) this.squeak(at + 0.25, 0.35); });
    // ===== Beat 1: the fight =====
    add(T.line4 - 0.05, at => this.paper(at));
    for (const c of combatCues()) add(c.t, at => { if (!c.void) this.cue(at, c); });
    // ===== voice =====
    // (voice-over removed: Elminster's lines are shown as text only)
    return ev;
  }

  // ---- voice ----
  playVoice(d, t, offset) {
    const buf = this.voices[d.clip]; if (!buf || !this.session) return;
    const c = this.ctx, S = this.session;
    const src = c.createBufferSource(); src.buffer = buf; src.connect(S.voice);
    const at = Math.max(c.currentTime, this.at(t));
    src.start(at, offset); S.nodes.push(src);
    const end = at + buf.duration - offset;
    S.duck.gain.setTargetAtTime(0.42, at - 0.05, 0.12);
    S.duck.gain.setTargetAtTime(1.0, end - 0.2, 0.4);
  }
  // Animal-Crossing-style elder-wizard mumble burble triggered per revealed syllable
  mumble(ch = 'a', tone = 0) {
    if (!this.ctx || !this.session) return;
    const c = this.ctx, S = this.session, at = c.currentTime + 0.004;
    const lower = String(ch).toLowerCase();
    const code = lower.charCodeAt(0) || 97;
    const formants = { a: 740, e: 560, i: 430, o: 610, u: 470, '?': 780, '!': 720 };
    const fForm = formants[lower] || (430 + (code % 9) * 48);
    const pitchMul = lower === '?' ? 1.18 : lower === '!' ? 1.1 : 1;
    const f0 = (138 + ((code * 7 + tone * 3) % 7) * 5.5) * pitchMul;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(fForm * 0.9, at);
    bp.frequency.exponentialRampToValueAtTime(fForm * 1.12, at + 0.045);
    const g = c.createGain();
    bp.connect(g); g.connect(S.voice);
    this.env(g, at, 0.008, 0.065, 0.048);
    const o1 = c.createOscillator(); o1.type = 'triangle';
    o1.frequency.setValueAtTime(f0, at);
    o1.frequency.exponentialRampToValueAtTime(f0 * (lower === '?' ? 1.14 : 0.93), at + 0.055);
    o1.connect(bp); o1.start(at); o1.stop(at + 0.065);
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = 'sawtooth'; o2.frequency.setValueAtTime(f0 * 0.5, at);
    g2.gain.value = 0.22; o2.connect(g2); g2.connect(bp);
    o2.start(at); o2.stop(at + 0.065);
  }

  // ---- instruments ----
  env(g, at, a, peak, dec, end = 0.0008) { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(end, at + a + dec); }
  osc(type, f, at, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at); o.start(at); o.stop(at + dur); this.session.nodes.push(o); return o; }
  nz(at, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.start(at, Math.random() * 2); s.stop(at + dur); this.session.nodes.push(s); return s; }
  panner(p, dest) { const c = this.ctx; if (c.createStereoPanner) { const s = c.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); s.connect(dest); return s; } return dest; }

  pluck(at, m, vel, pan = 0) {
    const c = this.ctx, f = mtof(m);
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(Math.min(9000, f * 9), at); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), at + 0.35);
    const o1 = this.osc('triangle', f, at, 1.9), o2 = this.osc('square', f * 1.003, at, 1.9);
    const g2 = c.createGain(); g2.gain.value = 0.22; o2.connect(g2); g2.connect(lp); o1.connect(lp);
    lp.connect(g); g.connect(this.panner(pan, this.session.music));
    this.env(g, at, 0.004, vel, 1.7);
  }
  flute(at, m, dur, vel) {
    const c = this.ctx, f = mtof(m), S = this.session;
    const g = c.createGain(), o = this.osc('sine', f, at, dur + 0.3), o2 = this.osc('triangle', f, at, dur + 0.3);
    const g2 = c.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g); o.connect(g);
    const lfo = this.osc('sine', 5.2, at, dur + 0.3), lg = c.createGain();
    lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.006, at + Math.min(0.35, dur * 0.6));
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    // slight scoop up into each note
    o.frequency.setValueAtTime(f * 0.985, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.05);
    const n = this.nz(at, dur + 0.3), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 1.4;
    const ng = c.createGain(); n.connect(bp); bp.connect(ng); ng.connect(g);
    ng.gain.setValueAtTime(0.0001, at); ng.gain.linearRampToValueAtTime(0.25, at + 0.04); ng.gain.linearRampToValueAtTime(0.06, at + 0.2);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vel, at + 0.07); g.gain.setValueAtTime(vel * 0.92, at + Math.max(0.08, dur - 0.08)); g.gain.linearRampToValueAtTime(0.0001, at + dur + 0.16);
    const out = this.panner(0.05, S.music); g.connect(out);
    const sendG = c.createGain(); sendG.gain.value = 0.5; g.connect(sendG); sendG.connect(S.rev);
  }
  pad(at, ms, dur, vel) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 950; lp.Q.value = 0.4;
    for (const m of ms) for (const det of [-7, 7]) { const o = this.osc('sawtooth', mtof(m), at, dur + 1.3); o.detune.value = det; o.connect(lp); }
    lp.connect(g); g.connect(this.session.music);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vel, at + 0.8); g.gain.setValueAtTime(vel, at + dur); g.gain.linearRampToValueAtTime(0.0001, at + dur + 1.2);
  }
  bass(at, m, dur, vel) {
    const c = this.ctx, g = c.createGain(), o = this.osc('triangle', mtof(m), at, dur + 0.5);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    o.connect(lp); lp.connect(g); g.connect(this.session.music);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vel, at + 0.03); g.gain.exponentialRampToValueAtTime(vel * 0.5, at + 0.6); g.gain.setValueAtTime(vel * 0.5, at + dur); g.gain.linearRampToValueAtTime(0.0001, at + dur + 0.35);
  }
  bell(at, f, vel, decay, ratio = 3.5, pan = 0, distant = false) {
    const c = this.ctx, S = this.session;
    const car = this.osc('sine', f, at, decay + 0.2), mod = this.osc('sine', f * ratio, at, decay + 0.2), mg = c.createGain();
    mg.gain.setValueAtTime(f * 2.2, at); mg.gain.exponentialRampToValueAtTime(f * 0.05, at + decay);
    mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain(); car.connect(g);
    const dest = distant ? S.amb : S.sfx;
    const p = this.panner(pan, dest); g.connect(p);
    const sg = c.createGain(); sg.gain.value = distant ? 1.6 : 0.6; g.connect(sg); sg.connect(S.rev);
    this.env(g, at, 0.003, vel, decay);
  }
  timpani(at, m, vel) {
    const c = this.ctx, o = this.osc('sine', mtof(m) * 1.6, at, 2.2), g = c.createGain();
    o.frequency.exponentialRampToValueAtTime(mtof(m), at + 0.25);
    o.connect(g); g.connect(this.session.sfx); const sg = c.createGain(); sg.gain.value = 0.8; g.connect(sg); sg.connect(this.session.rev);
    this.env(g, at, 0.005, vel, 2.0);
  }
  drum(at, vel) {
    const c = this.ctx, o = this.osc('sine', 120, at, 0.45), g = c.createGain();
    o.frequency.exponentialRampToValueAtTime(52, at + 0.18); o.connect(g); g.connect(this.session.music); this.env(g, at, 0.004, vel, 0.38);
    const n = this.nz(at, 0.08), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; const ng = c.createGain(); n.connect(lp); lp.connect(ng); ng.connect(this.session.music); this.env(ng, at, 0.002, vel * 0.25, 0.06);
  }
  tamb(at, vel) {
    const c = this.ctx, n = this.nz(at, 0.16), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const g = c.createGain(); n.connect(hp); hp.connect(g); g.connect(this.panner(0.3, this.session.music)); this.env(g, at, 0.003, vel, 0.12);
  }
  swell(at, dur, vel) {
    const c = this.ctx, n = this.nz(at, dur + 0.3), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(400, at); bp.frequency.exponentialRampToValueAtTime(5000, at + dur);
    const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.session.sfx); const sg = c.createGain(); sg.gain.value = 0.8; g.connect(sg); sg.connect(this.session.rev);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vel, at + dur); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.3);
  }
  shimmer(at, dur, vel) {
    const r = mulberry(5);
    for (let i = 0; i < 14; i++) { const tt = at + r() * dur; this.bell(tt, 2400 + r() * 2600, vel * (0.5 + r()), 0.6, 2.0, r() * 1.6 - 0.8); }
  }
  bird(at, type, pan, vel, r) {
    const c = this.ctx, S = this.session;
    const g = c.createGain(); g.gain.value = 0; const p = this.panner(pan, S.amb); g.connect(p);
    const sg = c.createGain(); sg.gain.value = 0.7; g.connect(sg); sg.connect(S.rev);
    const o = this.osc('sine', 3000, at, 2.2); o.connect(g);
    let t = at;
    const note = (f0, f1, d) => { o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + d * 0.25); g.gain.linearRampToValueAtTime(0.0001, t + d); t += d + 0.02 + r() * 0.05; };
    if (type === 0) { const n = 3 + Math.floor(r() * 4); for (let i = 0; i < n; i++) { const b = 3600 + r() * 1800; note(b, b * (0.8 + r() * 0.5), 0.05 + r() * 0.03); } }
    else if (type === 1) { const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const b = 1700 + r() * 900; note(b, b * (1.1 + r() * 0.3), 0.14 + r() * 0.12); } }
    else { for (let i = 0; i < 3; i++) { note(4300, 4100, 0.07); note(3300, 3200, 0.09); t += 0.04; } }
  }
  startWind(seek) {
    const c = this.ctx, S = this.session;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.0001;
    n.connect(bp); bp.connect(g); g.connect(S.amb); n.start(); S.nodes.push(n);
    const r = mulberry(9); const now = c.currentTime;
    g.gain.linearRampToValueAtTime(0.05, now + 2);
    for (let i = 1; i < 60; i++) { g.gain.linearRampToValueAtTime(0.03 + r() * 0.045, now + 2 + i * 1.4); bp.frequency.linearRampToValueAtTime(380 + r() * 380, now + 2 + i * 1.4); }
  }
  step(at, pan) {
    const c = this.ctx, n = this.nz(at, 0.12), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 600; bp.Q.value = 0.7;
    const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(pan, this.session.sfx)); this.env(g, at, 0.006, 0.07, 0.09);
    const o = this.osc('sine', 95, at, 0.1), og = c.createGain(); o.frequency.exponentialRampToValueAtTime(55, at + 0.08); o.connect(og); og.connect(this.session.sfx); this.env(og, at, 0.004, 0.05, 0.07);
  }
  inhale(at, pan) {
    const c = this.ctx, n = this.nz(at, 0.7), lp = c.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 900; lp.Q.value = 0.6;
    const g = c.createGain(); n.connect(lp); lp.connect(g); g.connect(this.panner(pan, this.session.sfx));
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.018, at + 0.45); g.gain.linearRampToValueAtTime(0.0001, at + 0.55);
  }
  exhale(at, pan) {
    const c = this.ctx, n = this.nz(at, 0.9), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, at); bp.frequency.exponentialRampToValueAtTime(500, at + 0.7); bp.Q.value = 0.8;
    const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(pan, this.session.sfx)); this.env(g, at, 0.03, 0.045, 0.75);
  }
  caw(at, pan) {
    const c = this.ctx, o = this.osc('sawtooth', 560, at, 0.3); o.frequency.exponentialRampToValueAtTime(380, at + 0.22);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 3;
    const g = c.createGain(); o.connect(bp); bp.connect(g); g.connect(this.panner(pan, this.session.amb));
    const sg = c.createGain(); sg.gain.value = 0.5; g.connect(sg); sg.connect(this.session.rev);
    this.env(g, at, 0.02, 0.06, 0.22);
  }
  flaps(at, pan) { for (let i = 0; i < 6; i++) { const c = this.ctx, tt = at + i * 0.09, n = this.nz(tt, 0.06), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const g = c.createGain(); n.connect(lp); lp.connect(g); g.connect(this.panner(pan, this.session.amb)); this.env(g, tt, 0.005, 0.03 * (1 - i / 7), 0.05); } }
  pop(at) { const c = this.ctx, o = this.osc('sine', 520, at, 0.12), g = c.createGain(); o.frequency.exponentialRampToValueAtTime(900, at + 0.06); o.connect(g); g.connect(this.panner(0.5, this.session.sfx)); this.env(g, at, 0.003, 0.04, 0.09); }
  whoosh(at, dur, vel) {
    const c = this.ctx, n = this.nz(at, dur + 0.2), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1;
    bp.frequency.setValueAtTime(250, at); bp.frequency.exponentialRampToValueAtTime(1600, at + dur);
    const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(-0.5, this.session.sfx));
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vel, at + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, at + dur);
  }
  knock(at) {
    const c = this.ctx, o = this.osc('sine', 180, at, 0.2), g = c.createGain(); o.frequency.exponentialRampToValueAtTime(120, at + 0.1); o.connect(g); g.connect(this.panner(-0.5, this.session.sfx)); this.env(g, at, 0.002, 0.14, 0.14);
    const n = this.nz(at, 0.03), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const ng = c.createGain(); n.connect(hp); hp.connect(ng); ng.connect(this.session.sfx); this.env(ng, at, 0.001, 0.05, 0.02);
  }
  paper(at) { const c = this.ctx, n = this.nz(at, 0.4), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.9; const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(-0.5, this.session.sfx)); g.gain.setValueAtTime(0.0001, at); for (let i = 0; i < 8; i++) g.gain.linearRampToValueAtTime(i % 2 ? 0.004 : 0.03, at + i * 0.04); g.gain.linearRampToValueAtTime(0.0001, at + 0.38); }
  rustle(at, pan) { const c = this.ctx, n = this.nz(at, 0.6), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.7; const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(pan, this.session.sfx)); g.gain.setValueAtTime(0.0001, at); for (let i = 0; i < 12; i++) g.gain.linearRampToValueAtTime(Math.random() * 0.05, at + i * 0.04); g.gain.linearRampToValueAtTime(0.0001, at + 0.55); }
  squeak(at, pan) { const c = this.ctx, o = this.osc('sine', 2700, at, 0.12), g = c.createGain(); o.frequency.exponentialRampToValueAtTime(3500, at + 0.05); o.frequency.exponentialRampToValueAtTime(2900, at + 0.1); o.connect(g); g.connect(this.panner(pan, this.session.sfx)); this.env(g, at, 0.005, 0.02, 0.09); }

  // ---- combat ----
  cue(at, c) {
    const pan = c.pan ?? 0.25;
    switch (c.k) {
      case 'burst': this.thump(at, 70, 0.22); this.rustle(at, pan); this.grit(at, 0.5, 0.05, pan); break;
      case 'land': this.thump(at, 110, 0.06); break;
      case 'squeak': this.squeak(at, pan); this.squeak(at + 0.09, pan); break;
      case 'draw': this.shing(at); break;
      case 'dice': this.dice(at); break;
      case 'diceLand': this.bell(at, c.hit ? 1320 : 520, c.hit ? 0.03 : 0.02, c.hit ? 0.35 : 0.2, c.hit ? 2.0 : 1.41, 0); break;
      case 'swing': this.whoosh(at, 0.16, 0.12); break;
      case 'hit': this.thwack(at); break;
      case 'crit': this.thwack(at); this.thwack(at + 0.02); this.bell(at, 1760, 0.035, 0.9, 2.0, 0); this.bell(at + 0.06, 2637, 0.025, 0.9, 2.0, 0); this.timpani(at, 38, 0.3); break;
      case 'fumble': this.whoosh(at, 0.22, 0.05); this.thump(at + 0.15, 70, 0.08); break;
      case 'ward': this.thump(at, 90, 0.08); this.shimmer(at, 0.35, 0.012); break;
      case 'shout': this.shout(at, c.i || 0); break;
      case 'cs': this.zing(at, c.i || 0); break;
      case 'focus': this.bell(at, 2093, 0.014, 0.25, 1.0, 0.3); this.bell(at + 0.05, 3136, 0.01, 0.22, 1.0, 0.3); break;
      case 'heal': this.bell(at, 1318, 0.008, 0.4, 1.0, -0.3); break;
      case 'chime': [0, 0.11, 0.22].forEach((d, i) => this.bell(at + d, [1568, 1976, 2349][i], 0.022, 0.9, 1.0, 0.2)); break;
      case 'paper': this.paper(at); break;
      case 'zip': { const c2 = this.ctx, o = this.osc('triangle', 1150, at, 0.09), g = c2.createGain(); o.frequency.exponentialRampToValueAtTime(2500, at + 0.07); o.connect(g); g.connect(this.panner(0.15, this.session.sfx)); this.env(g, at, 0.004, 0.05, 0.06); break; }
      case 'roll': [0, 0.07, 0.15, 0.24, 0.35, 0.48].forEach((d, i) => this.bell(at + d, 2600 - i * 300, 0.009, 0.09, 2.0, 0.3)); this.bell(at + 0.62, 820, 0.007, 0.2, 1.0, 0.3); break;
      case 'whiff': this.whoosh(at, 0.22, 0.05); break;
      // Beat 5: goblins over the wall
      case 'hedge': this.rustle(at, 0.35); this.grit(at, 0.3, 0.035, 0.3); break;
      case 'gob': { const c2 = this.ctx; [0, 0.09, 0.19].forEach((d, i) => { const o = this.osc('square', 640 - i * 110 + (c.i || 0) * 25, at + d, 0.07), g = c2.createGain(); o.frequency.exponentialRampToValueAtTime(340 - i * 45, at + d + 0.06); o.connect(g); g.connect(this.panner(0.35, this.session.sfx)); this.env(g, at + d, 0.003, 0.045, 0.05); }); break; }
      case 'gobDie': { const c2 = this.ctx, o = this.osc('square', 540, at, 0.22), g = c2.createGain(); o.frequency.exponentialRampToValueAtTime(150, at + 0.2); o.connect(g); g.connect(this.panner(0.3, this.session.sfx)); this.env(g, at, 0.004, 0.06, 0.17); break; }
      case 'cry': { const c2 = this.ctx; [0, 0.3].forEach((d, i) => { const o = this.osc('square', 820 - i * 180, at + d, 0.14), g = c2.createGain(); o.frequency.exponentialRampToValueAtTime(430 - i * 130, at + d + 0.12); o.connect(g); g.connect(this.panner(0.15 + i * 0.25, this.session.sfx)); this.env(g, at + d, 0.004, 0.05 - i * 0.018, 0.11); }); break; }
      case 'clang': { const v = c.v === undefined ? 1 : c.v; this.bell(at, 654, 0.022 * v, 0.5, 3.37, 0.3); this.bell(at + 0.004, 987, 0.015 * v, 0.34, 4.19, 0.3); this.bell(at + 0.002, 1568, 0.009 * v, 0.18, 5.31, 0.3); break; }
      case 'equip': this.bell(at, 880, 0.02, 0.4, 2.0, 0.1); this.bell(at + 0.09, 1318, 0.018, 0.4, 2.0, 0.1); this.thump(at + 0.02, 180, 0.05); break;
      case 'ding': this.bell(at, 2637, 0.026, 0.7, 2.0, 0.1); this.bell(at + 0.08, 3516, 0.016, 0.6, 2.0, 0.1); this.bell(at + 0.2, 2637, 0.011, 0.5, 2.0, 0.1); break;
      case 'launch': { this.whoosh(at, 0.3, 0.12); const c2 = this.ctx, o = this.osc('sine', 230, at, 0.5), g = c2.createGain(); o.frequency.exponentialRampToValueAtTime(990, at + 0.42); o.connect(g); g.connect(this.panner(0.2, this.session.sfx)); this.env(g, at, 0.02, 0.06, 0.4); break; }
      case 'death': { const c2 = this.ctx, o = this.osc('triangle', 1900, at, 0.22), g = c2.createGain(); o.frequency.exponentialRampToValueAtTime(3400, at + 0.05); o.frequency.exponentialRampToValueAtTime(1200, at + 0.2); o.connect(g); g.connect(this.panner(0.3, this.session.sfx)); this.env(g, at, 0.004, 0.035, 0.18); break; }
      case 'pop': this.pop(at); this.grit(at, 0.25, 0.035, 0.3); break;
      case 'bite': this.snap(at); break;
      case 'hurt': this.thump(at, 90, 0.16); break;
      case 'tink': this.bell(at, 2900 + c.i * 140, 0.012, 0.18, 2.76, 0.3); break;
      case 'clink': { const f = 1568 * Math.pow(2, c.i * 2 / 12); this.bell(at, f, 0.028, 0.45, 2.76, 0.8); this.bell(at + 0.03, f * 1.5, 0.012, 0.3, 2.76, 0.8); break; }
      case 'xp': this.bell(at, 1760, 0.016, 0.6, 1.0, -0.6); this.bell(at + 0.07, 2637, 0.012, 0.6, 1.0, -0.6); break;
      case 'levelup':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.bell(at + i * 0.075, f, 0.032, 1.15, 1.5, 0));
        this.shimmer(at + 0.12, 0.85, 0.02);
        this.timpani(at, 43, 0.28);
        break;
      case 'surge':
        this.shing(at);
        this.bell(at + 0.03, 987.77, 0.028, 0.55, 1.41, -0.2);
        this.bell(at + 0.09, 1479.98, 0.024, 0.65, 1.41, -0.1);
        this.whoosh(at + 0.04, 0.24, 0.16);
        break;
      case 'potion':
        this.pop(at);
        [587.33, 739.99, 880, 1174.66].forEach((f, i) => this.bell(at + 0.05 + i * 0.055, f, 0.022, 0.65, 1.0, 0.15));
        break;
    }
  }
  thump(at, f, vel) { const c = this.ctx, o = this.osc('sine', f * 1.6, at, 0.3), g = c.createGain(); o.frequency.exponentialRampToValueAtTime(f * 0.6, at + 0.18); o.connect(g); g.connect(this.session.sfx); this.env(g, at, 0.003, vel, 0.22); }
  grit(at, dur, vel, pan) { const c = this.ctx, n = this.nz(at, dur), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8; const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(pan, this.session.sfx)); g.gain.setValueAtTime(0.0001, at); for (let i = 0; i < 10; i++) g.gain.linearRampToValueAtTime(Math.random() * vel, at + i * dur / 10); g.gain.linearRampToValueAtTime(0.0001, at + dur); }
  shing(at) {
    const c = this.ctx, n = this.nz(at, 0.45), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(2200, at); bp.frequency.exponentialRampToValueAtTime(6500, at + 0.3);
    const g = c.createGain(); n.connect(bp); bp.connect(g); g.connect(this.panner(0.1, this.session.sfx));
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.07, at + 0.05); g.gain.exponentialRampToValueAtTime(0.0008, at + 0.42);
    this.bell(at + 0.18, 3520, 0.014, 0.9, 1.41, 0.1);
  }
  dice(at) { for (let i = 0; i < 5; i++) { const tt = at + i * 0.07 + i * i * 0.006; this.knockHi(tt, 0.05 - i * 0.007); } }
  knockHi(at, vel) { const c = this.ctx, o = this.osc('square', 900 + Math.random() * 500, at, 0.03), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; const g = c.createGain(); o.connect(lp); lp.connect(g); g.connect(this.panner(0.1, this.session.sfx)); this.env(g, at, 0.001, vel * 0.5, 0.025); }
  thwack(at) {
    const c = this.ctx;
    const n = this.nz(at, 0.12), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, at); lp.frequency.exponentialRampToValueAtTime(400, at + 0.1);
    const g = c.createGain(); n.connect(lp); lp.connect(g); g.connect(this.panner(0.25, this.session.sfx)); this.env(g, at, 0.001, 0.22, 0.11);
    const o = this.osc('sine', 160, at, 0.25), og = c.createGain(); o.frequency.exponentialRampToValueAtTime(45, at + 0.2); o.connect(og); og.connect(this.session.sfx); this.env(og, at, 0.002, 0.3, 0.2);
    const sg = c.createGain(); sg.gain.value = 0.5; g.connect(sg); sg.connect(this.session.rev);
  }
  // the hero's bark: a short, punchy formant burst ("HA!") parameterized by chosen voice personality
  shout(at, i, voiceId = this.heroVoice) {
    const c = this.ctx, vb = findOption(VOICE_BARKS, voiceId || this.heroVoice);
    const f0 = vb.f0 + ((i * 37) % 5) * 7;
    const o = this.osc('sawtooth', f0 * 1.12, at, 0.3);
    o.frequency.exponentialRampToValueAtTime(f0 * vb.sweep, at + 0.2);
    const mix = c.createGain(), out = this.panner(-0.15, this.session.sfx);
    const gains = [1, 0.6, 0.25], qs = [6, 8, 10];
    vb.formants.forEach((f, idx) => {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = qs[idx];
      const g = c.createGain(); g.gain.value = gains[idx]; o.connect(bp); bp.connect(g); g.connect(mix);
    });
    mix.connect(out); this.env(mix, at + 0.02, 0.015, 0.5, 0.16);
    const n = this.nz(at, 0.08), hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1600; hp.Q.value = 0.8;
    const ng = c.createGain(); n.connect(hp); hp.connect(ng); ng.connect(out); this.env(ng, at, 0.005, 0.05, 0.06);
    const sg = c.createGain(); sg.gain.value = 0.35; mix.connect(sg); sg.connect(this.session.rev);
  }
  // a Command Strike landing: a bright little metallic zing over a soft tap, stepping up the scale on a flurry
  zing(at, i) {
    const step = [0, 2, 4, 7, 9, 12][i % 6];
    this.bell(at, 2637 * Math.pow(2, step / 12), 0.02, 0.22, 1.41, 0.25);
    this.knockHi(at, 0.09);
    const c = this.ctx, n = this.nz(at, 0.05), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = c.createGain(); n.connect(hp); hp.connect(g); g.connect(this.panner(0.25, this.session.sfx)); this.env(g, at, 0.001, 0.06, 0.04);
  }
  snap(at) { const c = this.ctx, n = this.nz(at, 0.05), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800; const g = c.createGain(); n.connect(hp); hp.connect(g); g.connect(this.panner(0.2, this.session.sfx)); this.env(g, at, 0.001, 0.09, 0.04); this.squeak(at + 0.02, 0.25); }
}
