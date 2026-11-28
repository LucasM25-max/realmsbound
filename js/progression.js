// ─────────────────────────────────────────────────────────────
//  Pure progression rules, stage definitions, hero build & customiser
//  data/helpers (decoupled from DOM/canvas for unit testing).
// ─────────────────────────────────────────────────────────────

export const RULES_XP = {
  ratXP: 8,
  gobXP: 12,
  snikXP: 26,
  stage1ClearXP: 10,
  s2GobXP: 8,
  s2BeetleXP: 7,
  stage2ClearXP: 9,
  s3RatXP: 9,
  s3GobXP: 5,
  s3BeetleXP: 13,
  stage3ClearXP: 10,
  lvl2XP: 300,
  lvl3XP: 900,
  heroLvHP: 8,
  shortRestSec: 90,
};

export const TRACK_UNLOCK_STAGE = {
  weapon: 1,
  armour: 2,
  scavenging: 2,
  footwork: 3,
  conditioning: 4,
  tactics: 5,
};

export const MAX_PLAYABLE_STAGE = 3;

export const STAGE1_WAVES = Object.freeze([
  { wave: 1, label: '2 Giant Rats', kind: 'rat', count: 2 },
  { wave: 2, label: '2 Giant Rats', kind: 'rat', count: 2 },
  { wave: 3, label: '2 Giant Rats', kind: 'rat', count: 2 },
  { wave: 4, label: '1 Goblin Minion', kind: 'gob', count: 1 },
  { wave: 5, label: '2 Goblin Minions', kind: 'gob', count: 2 },
  { wave: 6, label: 'Snikkit', kind: 'snik', count: 1 },
]);

export const STAGE1_RULES = Object.freeze({
  heroHP: 12,
  heroAC: 16,
  toHit: 5,
  dmgBonus: 3,
  avgWeaponHit: 10,
  roundClockSec: 2.4,
  commandStrikePct: 0.10,
  commandStrikeCooldownSec: 0.25,
  coinLifeSec: 8,
  ratAC: 12,
  ratHP: 7,
  ratToHit: 4,
  ratDmgMin: 1,
  ratDmgMax: 2,
  ratClockSec: 3.2,
  ratWalkSec: 1.8,
  gobAC: 12,
  gobHP: 7,
  gobToHit: 4,
  gobDmg: 2,
  gobClockSec: 3.2,
  gobWalkSec: 1.8,
  snikAC: 12,
  snikHP: 10,
  snikToHit: 4,
  snikDmg: 2,
  snikClockSec: 3.4,
});

export function commandStrikeDamageStage1(csPct = STAGE1_RULES.commandStrikePct, strikeMult = 1, avgHit = STAGE1_RULES.avgWeaponHit) {
  return Math.max(1, Math.ceil(avgHit * (csPct || 0.10) * (strikeMult || 1)));
}

export function mystraActiveForStage(stage = 1) {
  const stg = stage || 1;
  return stg >= 1 && stg <= 4;
}

export const STAGE3_ORDER = [
  'rat', 'rat', 'rat', 'beetle',
  'rat', 'rat', 'rat', 'beetle',
  'gob', 'gob', 'gob', 'gob',
];

export const STAGES = {
  1: { id: 1, name: 'Old Skull Meadow', shortName: 'Old Skull Meadow', quota: 10, clearXP: 10, kind: 'rat' },
  2: { id: 2, name: "Hedrun's Turnip Fields", shortName: "Hedrun's Turnip Fields", quota: 12, clearXP: 9, kind: 'gob', hasWaves: true, goblins: 7, beetles: 5 },
  3: { id: 3, name: "Hedrun's Cider Barn", shortName: "Hedrun's Cider Barn", quota: 12, clearXP: 10, kind: 'rat', hasWaves: true, rats: 6, goblins: 4, beetles: 2 },
};

export function heroLevelForXP(xp = 0) {
  if ((xp || 0) >= RULES_XP.lvl3XP) return 3;
  if ((xp || 0) >= RULES_XP.lvl2XP) return 2;
  return 1;
}

export function xpBandProgress(xp = 0, level = 1) {
  const lv = Math.max(1, level | 0);
  if (lv >= 2) {
    const span = Math.max(1, RULES_XP.lvl3XP - RULES_XP.lvl2XP);
    return Math.max(0, Math.min(1, ((xp || 0) - RULES_XP.lvl2XP) / span));
  }
  return Math.max(0, Math.min(1, (xp || 0) / RULES_XP.lvl2XP));
}

export function surgeCooldownLeft(usedAt = -999, nowS = 0, shortRestSec = RULES_XP.shortRestSec) {
  if (!Number.isFinite(usedAt) || usedAt < 0) return 0;
  return Math.max(0, usedAt + shortRestSec - (nowS || 0));
}

export function attacksPerAction(level = 1) {
  const lv = Math.max(1, level | 0);
  if (lv >= 20) return 4;
  if (lv >= 11) return 3;
  if (lv >= 5) return 2;
  return 1;
}

export function surgeSwingCount(level = 1) {
  const lv = Math.max(1, level | 0);
  if (lv < 2) return 0;
  return Math.max(2, attacksPerAction(lv));
}

export function formatRestCountdown(remainSec = 0) {
  const rem = Math.max(0, Math.ceil(remainSec || 0));
  const mm = Math.floor(rem / 60);
  const ss = String(rem % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function stageDef(n = 1) {
  const id = Math.max(1, n | 0);
  if (STAGES[id]) return STAGES[id];
  return {
    id,
    name: `Shadowdale Road · ${id}`,
    shortName: `Stage ${id}`,
    quota: Math.min(20, 12 + Math.floor((id - 2) / 2)),
    clearXP: 16 + id * 2,
    kind: id % 2 === 0 ? 'gob' : 'rat',
    hasWaves: true,
  };
}

export function isStageCleared(quota, stage = 1) {
  return (quota || 0) >= stageDef(stage).quota;
}

export function canAdvanceStage({ stage = 1, quota = 0, stage1Ready = false, transitioning = false } = {}) {
  if (transitioning) return false;
  const stg = stage || 1;
  if (stg >= MAX_PLAYABLE_STAGE) return false;
  if (stg === 1) return !!stage1Ready && isStageCleared(quota, 1);
  return isStageCleared(quota, stg);
}

export function isTrackUnlocked(trackId, stage = 1) {
  const req = TRACK_UNLOCK_STAGE[trackId] || 1;
  return (stage || 1) >= req;
}

export function cheapestUnlockedTrack(tracks = [], ranks = [], stage = 1) {
  let best = null;
  for (let i = 0; i < tracks.length; i++) {
    const tr = tracks[i];
    if (!tr || !isTrackUnlocked(tr.id, stage)) continue;
    const rank = ranks[i] || 0;
    const cost = typeof tr.cost === 'function' ? tr.cost(rank) : Infinity;
    if (!best || cost < best.cost) {
      best = { track: tr, index: i, rank, nextRank: rank + 1, cost };
    }
  }
  return best;
}

// ---------- Hero Visual Appearance & Voice Customiser ----------
export const SKIN_TONES = [
  { id: 'fair', label: 'Porcelain', swatch: '#f9d8c0', ramp: ['#5c3228', '#8c5342', '#bd7a62', '#df9f80', '#f4bfa2', '#fde0cb'] },
  { id: 'peach', label: 'Rosy', swatch: '#f2be9a', ramp: ['#542a1e', '#844634', '#b4684d', '#d68d6c', '#eeb18c', '#fbd6b4'] },
  { id: 'warm', label: 'Warm', swatch: '#eaae84', ramp: ['#4a2219', '#7a3f2c', '#a85f43', '#cf8761', '#eaae84', '#f8d2aa'] },
  { id: 'olive', label: 'Olive', swatch: '#d6a472', ramp: ['#462816', '#724628', '#9b663c', '#bc8756', '#d8a674', '#efc596'] },
  { id: 'umber', label: 'Umber', swatch: '#a66b46', ramp: ['#341a10', '#583120', '#7c4a31', '#9c6343', '#ba7e59', '#d69d76'] },
  { id: 'deep', label: 'Ebony', swatch: '#724630', ramp: ['#22100a', '#3b1e14', '#562e20', '#71402e', '#8c553e', '#a96f54'] },
];

export const HAIR_STYLES = [
  { id: 'fringe', label: 'Wind Fringe' },
  { id: 'parted', label: 'Side Part' },
  { id: 'crop', label: 'Soldier Crop' },
  { id: 'swept', label: 'Swept Back' },
  { id: 'braid', label: 'Long Braid' },
];

export const HAIR_COLORS = [
  { id: 'chestnut', label: 'Chestnut', swatch: '#70452a', ramp: ['#1e100a', '#341c12', '#52301d', '#70452a', '#8f5d37', '#b07a48'] },
  { id: 'raven', label: 'Raven', swatch: '#2a2a36', ramp: ['#0d0d14', '#181822', '#262634', '#383848', '#4f5062', '#6e7084'] },
  { id: 'auburn', label: 'Copper', swatch: '#9c4024', ramp: ['#32100a', '#561b10', '#7c2b18', '#9e3e22', '#c05832', '#df7c4c'] },
  { id: 'flaxen', label: 'Flaxen', swatch: '#d6a84c', ramp: ['#4c3210', '#74501c', '#9c722a', '#c2943a', '#dfb856', '#f4d982'] },
  { id: 'ash', label: 'Ash', swatch: '#7d7872', ramp: ['#242220', '#3d3a36', '#58544e', '#76716a', '#969088', '#b9b2a8'] },
  { id: 'silver', label: 'Silver', swatch: '#cfd5e0', ramp: ['#343844', '#525868', '#747c8e', '#9aa2b4', '#c2cad8', '#e6ebf4'] },
];

export const EYE_COLORS = [
  { id: 'cobalt', label: 'Cobalt', swatch: '#3a6aa8', iris: '#3a6aa8', portrait: '#3d78c8' },
  { id: 'emerald', label: 'Emerald', swatch: '#3c9654', iris: '#388e4c', portrait: '#46a85c' },
  { id: 'amber', label: 'Amber', swatch: '#d8922c', iris: '#c87e22', portrait: '#e29e34' },
  { id: 'hazel', label: 'Hazel', swatch: '#8a6234', iris: '#7a5428', portrait: '#9c703a' },
  { id: 'violet', label: 'Violet', swatch: '#7d52b8', iris: '#7448ae', portrait: '#8e62cc' },
];

export const FACIAL_HAIRS = [
  { id: 'clean', label: 'Clean-Shaven' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'mustache', label: 'Mustache' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'beard', label: 'Full Beard' },
];

export const CAPE_COLORS = [
  { id: 'forest', label: 'Forest', swatch: '#3f7640', ramp: ['#0f2416', '#173620', '#22492a', '#2f5e34', '#3f7640', '#56904c', '#7aac62'], portrait: ['#0c1d12', '#14301c', '#1f4628', '#2b5d33', '#3a7640', '#4f904c', '#6aa85c', '#8cc070'] },
  { id: 'crimson', label: 'Crimson', swatch: '#982c2c', ramp: ['#2a0c0e', '#441418', '#621c22', '#80262a', '#9e3436', '#bc4846', '#d8665e'], portrait: ['#22090b', '#381014', '#52181c', '#6e2024', '#8b2a2e', '#a83c3c', '#c6544e', '#df766c'] },
  { id: 'royal', label: 'Royal Blue', swatch: '#325a9c', ramp: ['#0d182c', '#162846', '#203a62', '#2c4d80', '#3a629e', '#4f7cbc', '#6c9cd6'], portrait: ['#0a1222', '#122038', '#1b3052', '#26426e', '#32568c', '#446eaa', '#5e8bc6', '#80aee0'] },
  { id: 'charcoal', label: 'Charcoal', swatch: '#4a4e5a', ramp: ['#14151a', '#20222a', '#2f323d', '#404452', '#555a6a', '#6e7486', '#8e94a6'], portrait: ['#101116', '#1a1c24', '#272a34', '#363a46', '#484d5c', '#5e6474', '#788092', '#969eb0'] },
  { id: 'ochre', label: 'Ochre', swatch: '#b87c2c', ramp: ['#341e0a', '#4e3012', '#6a441a', '#865a22', '#a4702c', '#c28a3e', '#dea85a'], portrait: ['#2a1808', '#42260e', '#5c3816', '#764b1e', '#926026', '#ae7834', '#c8944a', '#e0b268'] },
  { id: 'plum', label: 'Dusk Plum', swatch: '#6d4486', ramp: ['#1e1228', '#301c40', '#45285a', '#5c3674', '#74488e', '#8e5ea8', '#ab7cc2'], portrait: ['#180e20', '#261634', '#38204a', '#4c2c62', '#623b7c', '#7a4e96', '#9466b0', '#b086ca'] },
];

export const TABARD_COLORS = [
  { id: 'leather', label: 'Sellsword Tan', swatch: '#a46c3e', ramp: ['#2a1a10', '#45291a', '#623c24', '#83522f', '#a46c3e', '#c48a52', '#dcaa70'] },
  { id: 'crimson', label: 'Shadow Crimson', swatch: '#9c2c2c', ramp: ['#2a0c0e', '#461418', '#641e22', '#84282c', '#a23838', '#c0504a', '#dc6e64'] },
  { id: 'navy', label: 'Dalelands Navy', swatch: '#2e4e84', ramp: ['#0e1828', '#182842', '#223a60', '#2e4e7e', '#3c629a', '#527ab4', '#7098ce'] },
  { id: 'emerald', label: 'Moss Green', swatch: '#346a3c', ramp: ['#0e2012', '#16341c', '#204828', '#2a5e34', '#387442', '#4e8e54', '#6cac6c'] },
  { id: 'slate', label: 'Iron Slate', swatch: '#586070', ramp: ['#181b22', '#262b36', '#383e4c', '#4c5466', '#626b80', '#7e889e', '#9ea8be'] },
  { id: 'cream', label: 'Sun Cream', swatch: '#d6bc8e', ramp: ['#3c2e1c', '#5c482e', '#7e6644', '#a0845c', '#bea276', '#d8be92', '#eed8b0'] },
];

export const VOICE_BARKS = [
  { id: 'gruff', label: 'Gruff', desc: 'Low & gravelly', f0: 146, formants: [720, 1180, 2400], sweep: 0.88 },
  { id: 'cheerful', label: 'Cheerful', desc: 'Bright & eager', f0: 184, formants: [840, 1420, 2750], sweep: 1.08 },
  { id: 'stoic', label: 'Stoic', desc: 'Steady & measured', f0: 132, formants: [640, 1120, 2250], sweep: 0.96 },
  { id: 'cocky', label: 'Cocky', desc: 'Quick & sharp', f0: 174, formants: [820, 1380, 2850], sweep: 1.14 },
  { id: 'weary', label: 'Weary', desc: 'Dry & seasoned', f0: 126, formants: [620, 1040, 2150], sweep: 0.84 },
  { id: 'noble', label: 'Noble', desc: 'Crisp & ringing', f0: 162, formants: [780, 1320, 2650], sweep: 1.02 },
];

export const NAME_PRESETS = ['Aldric', 'Rowan', 'Tamsin', 'Bram', 'Garrett', 'Kaelen', 'Lyra', 'Corin'];

export const EPITHETS = [
  { id: '', label: 'None', stage: 1 },
  { id: 'the Bold', label: 'the Bold', stage: 1 },
  { id: 'the Steady', label: 'the Steady', stage: 1 },
  { id: 'the Turnip-Saviour', label: 'the Turnip-Saviour', stage: 2 },
];

// ---------- Hero Build, Background, Kit & 18 Skills (UI-overview §4 + Freeplay §2.3) ----------
export const BACKGROUNDS = [
  { id: 'soldier', label: 'Soldier', skills: ['ath', 'itm'], perk: '+10% Command Strike', cmdBonus: 0.10, goldBonus: 0, regenBonus: 0, xpBonus: 0 },
  { id: 'criminal', label: 'Criminal', skills: ['sle', 'ste'], perk: '+10% Gold Find', cmdBonus: 0, goldBonus: 0.10, regenBonus: 0, xpBonus: 0 },
  { id: 'acolyte', label: 'Acolyte', skills: ['ins', 'rel'], perk: '+15% Vigour Regen', cmdBonus: 0, goldBonus: 0, regenBonus: 0.15, xpBonus: 0 },
  { id: 'sage', label: 'Sage', skills: ['arc', 'his'], perk: '+8% Skill Event Lore', cmdBonus: 0, goldBonus: 0, regenBonus: 0, xpBonus: 0.08 },
];

export const KIT_FOCUSES = [
  { id: 'vanguard', label: 'Vanguard', perk: '+1 Weapon Damage', dmgBonus: 1, toHitBonus: 0, goldBonus: 0 },
  { id: 'skirmisher', label: 'Skirmisher', perk: '+1 To-Hit Precision', dmgBonus: 0, toHitBonus: 1, goldBonus: 0 },
  { id: 'purse', label: 'Purse', perk: '+8% Coin Plunder', dmgBonus: 0, toHitBonus: 0, goldBonus: 0.08 },
];

export const FIGHTING_STYLES = [
  { id: 'great_weapon', label: 'Great Weapon', perk: '+1 Greatsword DMG', dmgBonus: 1, acBonus: 0, toHitBonus: 0 },
  { id: 'defense', label: 'Defense', perk: '+1 Armour Class', dmgBonus: 0, acBonus: 1, toHitBonus: 0 },
  { id: 'dueling', label: 'Dueling', perk: '+1 Blade To-Hit', dmgBonus: 0, acBonus: 0, toHitBonus: 1 },
  { id: 'blind', label: 'Blind Fighting', perk: '+1 Precision & Spores', dmgBonus: 0, acBonus: 0, toHitBonus: 1 },
];

export const HERO_SKILLS = [
  { id: 'ath', short: 'Athletics', ab: 'str', note: 'Shoves, barricades, and Skill Events.' },
  { id: 'acr', short: 'Acrobatics', ab: 'dex', note: 'Balance across bridges and trap dodges.' },
  { id: 'sle', short: 'Sleight', ab: 'dex', note: 'Picks locks and frees cocooned allies.' },
  { id: 'ste', short: 'Stealth', ab: 'dex', note: 'Lowers Warrens ambush Alertness.' },
  { id: 'arc', short: 'Arcana', ab: 'int', note: 'Inspects Elven seals & Weave runes.' },
  { id: 'his', short: 'History', ab: 'int', note: 'Recalls Dalelands & Netherese lore.' },
  { id: 'inv', short: 'Investigate', ab: 'int', note: 'Finds hidden caches and false stones.' },
  { id: 'nat', short: 'Nature', ab: 'int', note: 'Reads beast dens and fungal spores.' },
  { id: 'rel', short: 'Religion', ab: 'int', note: 'Identifies cults and unholy shrines.' },
  { id: 'ani', short: 'Handling', ab: 'wis', note: 'Calms hounds, mounts, and chickens.' },
  { id: 'ins', short: 'Insight', ab: 'wis', note: 'Spots goblin bluffs and Zhent bribes.' },
  { id: 'med', short: 'Medicine', ab: 'wis', note: 'Steadies wounds and poison recovery.' },
  { id: 'per', short: 'Perception', ab: 'wis', note: 'Spots tripwires and secret chests.' },
  { id: 'sur', short: 'Survival', ab: 'wis', note: 'Tracks packs and weathered trails.' },
  { id: 'dec', short: 'Deception', ab: 'cha', note: 'Harper disguises in urban patrols.' },
  { id: 'itm', short: 'Intimidate', ab: 'cha', note: 'Rattles goblin raiders mid-wave.' },
  { id: 'prf', short: 'Perform', ab: 'cha', note: 'Bards & inn rumours for Renown.' },
  { id: 'prs', short: 'Persuasion', ab: 'cha', note: 'Haggles with merchants & Watch.' },
];

const FIGHTER_BASE_SKILLS = ['per', 'sur']; // Fighter starts proficient in 2 skills + Human +1 ('inv')
export const BASE_ABILITY_SCORES = Object.freeze({ str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 });

export const DEFAULT_HERO_STYLE = Object.freeze({
  name: 'Sellsword',
  epithet: '',
  hoodUp: true,
  skin: 'warm',
  hairStyle: 'fringe',
  hairColor: 'chestnut',
  eyeColor: 'cobalt',
  facialHair: 'stubble',
  scar: false,
  capeColor: 'forest',
  tabardColor: 'leather',
  voice: 'gruff',
  background: 'soldier',
  kit: 'vanguard',
  fightingStyle: 'great_weapon',
});

export const ELMINSTER_PICK_STYLE = Object.freeze({
  name: 'Aldric',
  epithet: 'the Bold',
  hoodUp: false,
  skin: 'warm',
  hairStyle: 'fringe',
  hairColor: 'chestnut',
  eyeColor: 'cobalt',
  facialHair: 'stubble',
  scar: false,
  capeColor: 'forest',
  tabardColor: 'crimson',
  voice: 'gruff',
  background: 'soldier',
  kit: 'vanguard',
  fightingStyle: 'great_weapon',
});

export function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

export function fmtMod(m) {
  return m >= 0 ? `+${m}` : String(m);
}

export function computeHeroSheet(style = DEFAULT_HERO_STYLE, level = 1) {
  const st = normalizeHeroStyle(style);
  const bg = findOption(BACKGROUNDS, st.background);
  const kit = findOption(KIT_FOCUSES, st.kit);
  const fs = findOption(FIGHTING_STYLES, st.fightingStyle);
  const pb = level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : 2;
  const scores = { ...BASE_ABILITY_SCORES };
  const mods = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, abilityMod(v)]));
  const profSet = new Set([...FIGHTER_BASE_SKILLS, 'inv', ...(bg.skills || [])]);
  const skills = HERO_SKILLS.map(sk => {
    const prof = profSet.has(sk.id);
    const bonus = mods[sk.ab] + (prof ? pb : 0);
    return { ...sk, prof, bonus };
  });
  return {
    scores,
    mods,
    pb,
    ac: 16 + (fs.acBonus || 0),
    toHit: pb + mods.str + (kit.toHitBonus || 0) + (fs.toHitBonus || 0),
    dmgFlat: mods.str + (kit.dmgBonus || 0) + (fs.dmgBonus || 0),
    saves: { str: mods.str + pb, con: mods.con + pb },
    bg,
    kit,
    fs,
    skills,
    bonuses: {
      cmdBonus: bg.cmdBonus || 0,
      goldBonus: (bg.goldBonus || 0) + (kit.goldBonus || 0),
      regenBonus: bg.regenBonus || 0,
      xpBonus: bg.xpBonus || 0,
      dmgBonus: (kit.dmgBonus || 0) + (fs.dmgBonus || 0),
      toHitBonus: (kit.toHitBonus || 0) + (fs.toHitBonus || 0),
      acBonus: fs.acBonus || 0,
    },
  };
}

export function sanitizeHeroName(raw) {
  const cleaned = String(raw ?? '')
    .replace(/[^A-Za-z0-9 '\-]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, 14);
  return cleaned;
}

export function commitHeroName(raw) {
  const s = sanitizeHeroName(raw).trim();
  return s || 'Sellsword';
}

export function heroDisplayName(style = DEFAULT_HERO_STYLE) {
  const name = commitHeroName(style?.name);
  const ep = style?.epithet ? ` ${style.epithet}` : '';
  return `${name}${ep}`;
}

export function normalizeHeroStyle(style = {}) {
  const pickId = (arr, v, def) => (arr.some(x => x.id === v) ? v : def);
  return {
    name: commitHeroName(style.name || DEFAULT_HERO_STYLE.name),
    epithet: EPITHETS.some(e => e.id === style.epithet) ? style.epithet : '',
    hoodUp: style.hoodUp === undefined ? DEFAULT_HERO_STYLE.hoodUp : !!style.hoodUp,
    skin: pickId(SKIN_TONES, style.skin, DEFAULT_HERO_STYLE.skin),
    hairStyle: pickId(HAIR_STYLES, style.hairStyle, DEFAULT_HERO_STYLE.hairStyle),
    hairColor: pickId(HAIR_COLORS, style.hairColor, DEFAULT_HERO_STYLE.hairColor),
    eyeColor: pickId(EYE_COLORS, style.eyeColor, DEFAULT_HERO_STYLE.eyeColor),
    facialHair: pickId(FACIAL_HAIRS, style.facialHair, DEFAULT_HERO_STYLE.facialHair),
    scar: !!style.scar,
    capeColor: pickId(CAPE_COLORS, style.capeColor, DEFAULT_HERO_STYLE.capeColor),
    tabardColor: pickId(TABARD_COLORS, style.tabardColor, DEFAULT_HERO_STYLE.tabardColor),
    voice: pickId(VOICE_BARKS, style.voice, DEFAULT_HERO_STYLE.voice),
    background: pickId(BACKGROUNDS, style.background, DEFAULT_HERO_STYLE.background),
    kit: pickId(KIT_FOCUSES, style.kit, DEFAULT_HERO_STYLE.kit),
    fightingStyle: pickId(FIGHTING_STYLES, style.fightingStyle, DEFAULT_HERO_STYLE.fightingStyle),
  };
}

export function randomHeroStyle(rng = Math.random, current = DEFAULT_HERO_STYLE) {
  const pick = arr => arr[Math.floor(rng() * arr.length) % arr.length];
  return normalizeHeroStyle({
    name: pick(NAME_PRESETS),
    epithet: current?.epithet || '',
    hoodUp: rng() > 0.6,
    skin: pick(SKIN_TONES).id,
    hairStyle: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS).id,
    eyeColor: pick(EYE_COLORS).id,
    facialHair: pick(FACIAL_HAIRS).id,
    scar: rng() > 0.65,
    capeColor: pick(CAPE_COLORS).id,
    tabardColor: pick(TABARD_COLORS).id,
    voice: pick(VOICE_BARKS).id,
    background: current?.background || DEFAULT_HERO_STYLE.background,
    kit: current?.kit || DEFAULT_HERO_STYLE.kit,
    fightingStyle: current?.fightingStyle || DEFAULT_HERO_STYLE.fightingStyle,
  });
}

export function findOption(arr, id) {
  return arr.find(x => x.id === id) || arr[0];
}
