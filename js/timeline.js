// ─────────────────────────────────────────────────────────────
//  REALMSBOUND — Stage 1 timeline: Beat 0 "Cold Open", Beat 1 (auto-battle)
//  and the opening of Beat 2 (Command Strike).
//  Beats 0–1 are scripted: every visual is a pure function of time t, so
//  the sequence can be scrubbed / replayed deterministically. Beat 2 is
//  played live (js/beat2.js); its dialogue lines get their start times
//  when the player triggers them.
// ─────────────────────────────────────────────────────────────

export const W = 640, H = 360;          // native pixel grid
export const UI_SCALE = 2;              // UI/text canvas = 1280x720
export const PAN = 300;                 // camera tilt distance (sky -> meadow)

export const T = {
  fadeIn:      [0.0, 1.4],
  titleIn:     [0.9, 2.6],
  titleShine:  [1.7, 3.1],
  pan:         [3.3, 8.3],             // camera tilts down from dawn sky to the meadow
  heroWalk:    6.0,                    // hero enters from the left
  heroSpeed:   60,                     // px / s
  heroStartX: -70,                     // (sprite frame is padded 14px left for the drawn greatsword)
  heroStopX:   104,                    // the hero holds the left of the screen; foes come from the right
  puff1:       6.7,                    // Elminster draws on his pipe (smoke ring ~0.55s later)
  line1:       8.0,                    // "Ah. A sellsword. Thou'lt do."
  crowFlee:    10.4,
  line2:       12.0,                   // "Welcome to Shadowdale..."
  puff2:       19.15,                  // ring drifts toward the incoming dialogue frame
  beat1:       20.0,                   // speech HUD slides in, letterbox retracts
  hudIn:       [20.05, 20.75],
  line3:       22.05,                  // Beat 1 opener, as the rats burst out: "Rats. Large ones..."
  line4:       28.85,                  // after the first kill: "See that little die?"
  // Beat 2: two more rats; the player learns to click them (Command Strike + focus)
  b2rustles:   [35.5, 35.9, 36.25],
  b2burst:     [36.5, 36.8],
  line5:       36.7,                  // "Thou mayest lend a hand, too…"
};

// Typewriter timing per phrase (onset / offset in seconds relative to each line's start).
// Originally taken from a recorded VO; the VO has been removed and the lines are text-only.
// (Beats 1–5 run VO-free; the clip names linger as documentation of the intended read.)
export const DIALOGUE = {
  line1: {
    clip: 'elminster_s1_b0_01_ah_a_sellsword',
    at: T.line1,
    bubbles: [
      { show: [T.line1 + 0.15, T.line2 - 0.35],
        segs: [['Ah.', 0.28, 0.85], [' A sellsword.', 1.19, 2.2], [" Thou'lt do.", 2.99, 3.75]] },
    ],
  },
  line2: {
    clip: 'elminster_s1_b0_02_welcome_to_shadowdale',
    at: T.line2,
    bubbles: [
      { show: [T.line2 + 0.15, T.line2 + 3.86],
        segs: [['Welcome to Shadowdale.', 0.28, 2.09], [" Lovely, isn't it?", 2.41, 3.73]] },
      { show: [T.line2 + 3.9, T.beat1 + 0.1],
        segs: [['Enjoy the view.', 3.97, 5.08], [" It's about to be overrun by goblins.", 5.46, 7.79]] },
    ],
  },
  line3: {
    clip: 'elminster_s1_b1_01_rats_large_ones',
    at: T.line3,
    hud: true,
    segs: [['Rats.', 0.2, 0.7], [' Large ones.', 1.0, 1.8], [" Thou needn't do a thing.", 2.3, 3.7],
           [' Fighters fight.', 4.0, 4.8], [" 'Tis rather the point of them.", 5.0, 6.6]],
  },
  line4: {
    clip: 'elminster_s1_b1_02_see_that_little_die',
    at: T.line4,
    hud: true,
    segs: [['See that little die?', 0.15, 1.15], [' Every swing is a roll.', 1.45, 2.6], [' High is good.', 3.0, 3.7],
           [' Twenty is very good.', 4.0, 5.2], [' Remember that.', 5.5, 6.3]],
  },
};
// typewriter timing for lines without a recorded read: ~17 characters a second, a breath between sentences
function autoSegs(text, cps = 17) {
  const out = []; let t = 0.2;
  for (const m of text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g)) {
    const seg = (out.length ? ' ' : '') + m.trim(), d = seg.length / cps;
    out.push([seg, t, t + d]); t += d + 0.32;
  }
  return out;
}
const live = (text) => ({ at: Infinity, hud: true, dyn: true, segs: autoSegs(text) });
Object.assign(DIALOGUE, {
  line5: { at: T.line5, hud: true, segs: autoSegs('Thou mayest lend a hand, too. Click a beast to shout a command and strike harder. Go on, poke one.') },
  // the lines below are triggered by play (beat2.js sets .at)
  nudge: live('The rat, sellsword. Click upon it. I shall wait. I am very old, and terribly good at waiting.'),
  line6: live('Splendid. Thou hast discovered pointing. The bards will sing of it.'),
  focus: live("Whichever beast thou point'st at, he strikes next. Mind the little ring."),
  spam:  live('Enthusiastic. I like that. Mostly.'),
  // Beat 3: the coins those rats dropped (beat3.js sets .at)
  line7: live('Coins! Copper, but coins. Tap them before they wander off. Gold is how adventurers grow strong. Also how they buy ale.'),
  coinNudge: live('The coins, sellsword. They grow legs.'),
  line8a: live('Every last copper. Thou art part magpie. I approve.'),
  line8b: live('The meadow keeps its tithe. Quicker fingers next time.'),
  // Beat 4: the quota bar (beat4.js sets .at)
  line9: live('Clear ten foes and the way onward opens. That bar tracks it. Thou\'rt nearly halfway. Don\'t get cocky.'),
  // Beat 5: goblins, and the scheduled miracle (beat5.js sets .at)
  line10: live('Goblins! The cause of all my recent paperwork. Thump them.'),
  line11: live('A natural twenty! The dice smile upon thee. Enjoy it. They are fickle things.'),
  // Beat 6: the first trip to the Training Yard (beat6.js sets .at)
  line12a: live('Thou hast coin. Spend it! Visit the Training Yard and drill thy sword arm.'),
  trainNudge: live('The Train tab, sellsword. Bottom right. It glows for a reason.'),
  line12: live("Every rank makes thee deadlier. There are a great many ranks. I'd start saving."),
  line13: live('…That is Mistress Jhaele\'s blueberry pie. From the Old Skull Inn. Fetch it back.'),
  line14: live('A helmet. Of sorts. Wear it. Gear changes thee, outside and in.'),
  line14b: live('*snort* …It suits thee, sellsword. Gods help thee.'),
  gearNudge: live('The Gear tab, sellsword. Bottom right, the little pack. Gear changes thee — wear thy spoils.'),
  // Beat 9: Stage 1 closing word (beat9.js sets .at)
  line15: live('Ten foes cleared — well on thy way to Level Two, sellsword. Keep swinging!'),
  // milestone quips: two tiers per track (beat6.js sets .at when a ×2-style rank is crossed)
  mq_weapon_0: live('Twice the blow. That pell has a family, thou knowest.'),
  mq_weapon_1: live('Harder still. The rats of Shadowdale grow nervous.'),
  mq_armour_0: live('Twice the hide. I almost regret teaching thee.'),
  mq_armour_1: live('Thou wearest thy drills well. Mostly they are invisible. Mostly.'),
  mq_footwork_0: live('Swifter feet. The meadow applauds. Quietly.'),
  mq_footwork_1: live('Thou art become a blur. A well-drilled blur.'),
  mq_tactics_0: live('A keener eye. Strike where it hurts. It always hurts the rats.'),
  mq_tactics_1: live('Critically improved. My condolences to the vermin.'),
  mq_scavenging_0: live("The true adventurer's art: finding what the fallen drop."),
  mq_scavenging_1: live('The copper picks itself up now. Would that my tower tidied itself so.'),
  mq_conditioning_0: live('Deeper breath, steadier heart. Do not test it overmuch.'),
  mq_conditioning_1: live('Thy stamina shames archmages I could name. I shall not.'),
});
export let elminsterSkipped = false;
export function skipElminster() { elminsterSkipped = true; }
export function resetSkipElminster() { elminsterSkipped = false; }
export function isElminsterSkipped() { return elminsterSkipped; }

export function resetLiveLines() { for (const d of Object.values(DIALOGUE)) if (d.dyn) d.at = Infinity; }
export function lineEnd(d) {
  const s = d.segs || d.bubbles.flatMap(b => b.segs);
  const end = d.at + s[s.length - 1][2];
  if (elminsterSkipped) return Math.min(end, d.at + 0.45);
  if (d.skip && isFinite(d.skip)) return Math.min(end, d.skip + 0.15);
  return end;
}

// the line currently shown in the dialogue box: the most recently started one
export function hudLine(t) {
  let cur = DIALOGUE.line3;
  for (const d of Object.values(DIALOGUE)) if (d.hud && t >= d.at - 0.2 && d.at >= cur.at) cur = d;
  return cur;
}

// Where Elminster is "speaking" (for talk-bob animation)
export function speakingAt(t) {
  if (elminsterSkipped) return false;
  for (const k of Object.keys(DIALOGUE)) {
    const d = DIALOGUE[k];
    if (d.skip && t >= d.skip) continue;
    const segs = d.segs || d.bubbles.flatMap(b => b.segs);
    if (!(t >= d.at)) continue;
    for (const s of segs) if (t >= d.at + s[1] && t <= d.at + s[2]) return true;
  }
  return false;
}

// Typewriter: how many characters of a segment list are revealed at time t
export function revealText(segs, clipAt, t) {
  let out = '';
  for (const [txt, a, b] of segs) {
    const s = clipAt + a, e = clipAt + b;
    if (t >= e) { out += txt; continue; }
    if (t <= s) break;
    const n = Math.floor(txt.length * Math.min(1, (t - s) / Math.max(0.2, (e - s) * 0.85)));
    out += txt.slice(0, n);
    break;
  }
  const full = segs.map(s => s[0]).join('');
  return { text: out, done: out.length >= full.length, full };
}
