import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES_XP,
  MAX_PLAYABLE_STAGE,
  STAGE1_WAVES,
  STAGE1_RULES,
  STAGE3_ORDER,
  STAGES,
  commandStrikeDamageStage1,
  mystraActiveForStage,
  stageDef,
  isStageCleared,
  canAdvanceStage,
  isTrackUnlocked,
  cheapestUnlockedTrack,
  heroLevelForXP,
  xpBandProgress,
  surgeCooldownLeft,
  attacksPerAction,
  surgeSwingCount,
  formatRestCountdown,
  sanitizeHeroName,
  commitHeroName,
  heroDisplayName,
  normalizeHeroStyle,
  randomHeroStyle,
  computeHeroSheet,
  DEFAULT_HERO_STYLE,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  FACIAL_HAIRS,
  CAPE_COLORS,
  TABARD_COLORS,
  VOICE_BARKS,
  BACKGROUNDS,
  KIT_FOCUSES,
  FIGHTING_STYLES,
} from '../js/progression.js';

test('Stage 1, Stage 2 & Stage 3 Freeplay XP math matches Freeplay Plan (120 -> 220 -> 300 Level 2 -> 330 XP)', () => {
  const s1KillsXP = 6 * RULES_XP.ratXP + 3 * RULES_XP.gobXP + RULES_XP.snikXP;
  assert.equal(s1KillsXP, 110);
  const s1Total = s1KillsXP + RULES_XP.stage1ClearXP;
  assert.equal(s1Total, 120);
  assert.equal(heroLevelForXP(s1Total), 1);

  const s2KillsXP = STAGES[2].goblins * RULES_XP.s2GobXP + STAGES[2].beetles * RULES_XP.s2BeetleXP;
  const s2Total = s2KillsXP + RULES_XP.stage2ClearXP;
  assert.equal(s2Total, 100);
  assert.equal(s1Total + s2Total, 220);
  assert.equal(heroLevelForXP(s1Total + s2Total), 1);

  // Stage 3: 6 Giant Rats (9 XP) + 2 Giant Fire Beetles (13 XP) + 4 Goblin Minions (5 XP) + 10 XP clear = 110 XP
  const s3Waves12XP = 6 * RULES_XP.s3RatXP + 2 * RULES_XP.s3BeetleXP;
  assert.equal(s3Waves12XP, 80);
  assert.equal(s1Total + s2Total + s3Waves12XP, RULES_XP.lvl2XP);
  assert.equal(heroLevelForXP(300), 2);
  assert.equal(heroLevelForXP(900), 3);

  const s3Total = s3Waves12XP + 4 * RULES_XP.s3GobXP + RULES_XP.stage3ClearXP;
  assert.equal(s3Total, 110);
  assert.equal(s1Total + s2Total + s3Total, 330);

  // Check XP band math for Level 1 and Level 2
  assert.ok(Math.abs(xpBandProgress(220, 1) - 220 / 300) < 1e-6);
  assert.ok(Math.abs(xpBandProgress(330, 2) - 30 / 600) < 1e-6);

  // Check Short Rest timer & Action Surge helpers
  assert.equal(surgeCooldownLeft(-999, 120), 0);
  assert.equal(surgeCooldownLeft(null, 120), 0);
  assert.equal(surgeCooldownLeft(100, 145), 45);
  assert.equal(surgeCooldownLeft(100, 195), 0);
  assert.equal(attacksPerAction(1), 1);
  assert.equal(attacksPerAction(2), 1);
  assert.equal(attacksPerAction(5), 2);
  assert.equal(surgeSwingCount(1), 0);
  assert.equal(surgeSwingCount(2), 2);
  assert.equal(surgeSwingCount(11), 3);
  assert.equal(formatRestCountdown(90), '1:30');
  assert.equal(formatRestCountdown(4.2), '0:05');
  assert.equal(formatRestCountdown(0), '0:00');
});

test('Stage definitions, Stage 3 wave order, and Next Stage unlock rules cap progress at Stage 3', () => {
  assert.equal(MAX_PLAYABLE_STAGE, 3);
  assert.equal(stageDef(1).name, 'Old Skull Meadow');
  assert.equal(stageDef(1).quota, 10);
  assert.equal(stageDef(2).name, "Hedrun's Turnip Fields");
  assert.equal(stageDef(2).quota, 12);
  assert.equal(stageDef(2).goblins, 7);
  assert.equal(stageDef(2).beetles, 5);
  assert.equal(stageDef(3).name, "Hedrun's Cider Barn");
  assert.equal(stageDef(3).quota, 12);
  assert.equal(stageDef(3).rats, 6);
  assert.equal(stageDef(3).beetles, 2);
  assert.equal(stageDef(3).goblins, 4);
  assert.equal(STAGE3_ORDER.length, 12);
  assert.equal(STAGE3_ORDER.filter(k => k === 'rat').length, 6);
  assert.equal(STAGE3_ORDER.filter(k => k === 'beetle').length, 2);
  assert.equal(STAGE3_ORDER.filter(k => k === 'gob').length, 4);
  assert.deepEqual(STAGE3_ORDER.slice(8), ['gob', 'gob', 'gob', 'gob']);

  assert.equal(isStageCleared(9, 1), false);
  assert.equal(isStageCleared(10, 1), true);
  assert.equal(canAdvanceStage({ stage: 1, quota: 10, stage1Ready: false }), false);
  assert.equal(canAdvanceStage({ stage: 1, quota: 10, stage1Ready: true }), true);
  assert.equal(canAdvanceStage({ stage: 1, quota: 10, stage1Ready: true, transitioning: true }), false);
  assert.equal(canAdvanceStage({ stage: 2, quota: 11 }), false);
  assert.equal(canAdvanceStage({ stage: 2, quota: 12 }), true);
  assert.equal(canAdvanceStage({ stage: 3, quota: 11 }), false);
  assert.equal(canAdvanceStage({ stage: 3, quota: 12 }), false);
});

test('Stage 2 unlocks Armour Drills and Scavenging; cheapestUnlockedTrack selects across all 6 tracks', () => {
  assert.equal(isTrackUnlocked('weapon', 1), true);
  assert.equal(isTrackUnlocked('armour', 1), false);
  assert.equal(isTrackUnlocked('armour', 2), true);
  assert.equal(isTrackUnlocked('scavenging', 2), true);
  assert.equal(isTrackUnlocked('footwork', 2), false);
  assert.equal(isTrackUnlocked('footwork', 3), true);
  assert.equal(isTrackUnlocked('conditioning', 2), false);
  assert.equal(isTrackUnlocked('conditioning', 4), true);
  assert.equal(isTrackUnlocked('tactics', 4), false);
  assert.equal(isTrackUnlocked('tactics', 5), true);

  const grow = (base, rate) => p => { let c = base; for (let i = 0; i < p; i++) c = Math.ceil(c * rate); return c; };
  const tracks = [
    { id: 'weapon', name: 'Weapon Drills', cost: grow(10, 1.13) },
    { id: 'armour', name: 'Armour Drills', cost: grow(15, 1.13) },
    { id: 'footwork', name: 'Footwork', cost: grow(25, 1.15) },
    { id: 'tactics', name: 'Tactics', cost: grow(100, 1.13) },
    { id: 'scavenging', name: 'Scavenging', cost: grow(20, 1.13) },
    { id: 'conditioning', name: 'Conditioning', cost: grow(50, 1.13) },
  ];
  // Stage 1: only weapon unlocked even if others were hypothetically cheaper
  assert.equal(cheapestUnlockedTrack(tracks, [4, 0, 0, 0, 0, 0], 1).track.id, 'weapon');
  // Stage 2: weapon R4 costs 17 while armour R0 costs 15 -> picks Armour Drills R1
  const s2Arm = cheapestUnlockedTrack(tracks, [4, 0, 0, 0, 0, 0], 2);
  assert.equal(s2Arm.track.id, 'armour');
  assert.equal(s2Arm.nextRank, 1);
  assert.equal(s2Arm.cost, 15);
  // Stage 2: weapon R6 (22), armour R3 (23), scavenging R0 (20) -> picks Scavenging R1
  const s2Scav = cheapestUnlockedTrack(tracks, [6, 3, 0, 0, 0, 0], 2);
  assert.equal(s2Scav.track.id, 'scavenging');
  assert.equal(s2Scav.cost, 20);
  // Higher stages select Footwork, Conditioning, and Tactics when cheapest
  assert.equal(cheapestUnlockedTrack(tracks, [10, 10, 0, 0, 10, 0], 3).track.id, 'footwork');
  assert.equal(cheapestUnlockedTrack(tracks, [18, 18, 15, 0, 15, 0], 4).track.id, 'conditioning');
  assert.equal(cheapestUnlockedTrack(tracks, [25, 25, 20, 0, 25, 15], 5).track.id, 'tactics');
});

test('Hero name sanitization, display formatting, style & build normalization', () => {
  assert.equal(sanitizeHeroName('  Sir<Aldric>!@# '), 'SirAldric ');
  assert.equal(commitHeroName('   '), 'Sellsword');
  assert.equal(commitHeroName('Garrett'), 'Garrett');
  assert.equal(heroDisplayName({ name: 'Aldric', epithet: 'the Bold' }), 'Aldric the Bold');
  const norm = normalizeHeroStyle({ skin: 'bogus', hairColor: 'neon', capeColor: 'rainbow', background: 'fake', kit: 'none', fightingStyle: 'bad', scar: 1 });
  assert.equal(norm.skin, DEFAULT_HERO_STYLE.skin);
  assert.equal(norm.hairColor, DEFAULT_HERO_STYLE.hairColor);
  assert.equal(norm.capeColor, DEFAULT_HERO_STYLE.capeColor);
  assert.equal(norm.background, DEFAULT_HERO_STYLE.background);
  assert.equal(norm.kit, DEFAULT_HERO_STYLE.kit);
  assert.equal(norm.fightingStyle, DEFAULT_HERO_STYLE.fightingStyle);
  assert.equal(norm.scar, true);
});

test('Hero Sheet computes 18 skills, AC, and build bonuses cleanly', () => {
  const sheet = computeHeroSheet({ ...DEFAULT_HERO_STYLE, background: 'criminal', kit: 'skirmisher', fightingStyle: 'defense' }, 1);
  assert.equal(sheet.skills.length, 18);
  assert.equal(sheet.ac, 17);
  assert.equal(sheet.toHit, 6);
  assert.equal(sheet.bonuses.goldBonus, 0.10);
  assert.ok(BACKGROUNDS.some(b => b.id === sheet.bg.id));
  assert.ok(KIT_FOCUSES.some(k => k.id === sheet.kit.id));
  assert.ok(FIGHTING_STYLES.some(f => f.id === sheet.fs.id));
});

test('Randomiser generates valid option IDs across all palettes', () => {
  let s = 17;
  const rng = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 20; i++) {
    const st = randomHeroStyle(rng);
    assert.ok(SKIN_TONES.some(x => x.id === st.skin));
    assert.ok(HAIR_STYLES.some(x => x.id === st.hairStyle));
    assert.ok(HAIR_COLORS.some(x => x.id === st.hairColor));
    assert.ok(EYE_COLORS.some(x => x.id === st.eyeColor));
    assert.ok(FACIAL_HAIRS.some(x => x.id === st.facialHair));
    assert.ok(CAPE_COLORS.some(x => x.id === st.capeColor));
    assert.ok(TABARD_COLORS.some(x => x.id === st.tabardColor));
    assert.ok(VOICE_BARKS.some(x => x.id === st.voice));
  }
});

test('Stage 1 waves, hero abilities, Command Strike damage, and Mystra Patience stage gating match spec', () => {
  const totalStage1Kills = STAGE1_WAVES.reduce((acc, w) => acc + w.count, 0);
  assert.equal(totalStage1Kills, 10);
  assert.deepEqual(STAGE1_WAVES.map(w => [w.kind, w.count]), [
    ['rat', 2],
    ['rat', 2],
    ['rat', 2],
    ['gob', 1],
    ['gob', 2],
    ['snik', 1],
  ]);

  assert.equal(STAGE1_RULES.heroHP, 12);
  assert.equal(STAGE1_RULES.heroAC, 16);
  assert.equal(STAGE1_RULES.toHit, 5);
  assert.equal(STAGE1_RULES.dmgBonus, 3);
  assert.equal(STAGE1_RULES.roundClockSec, 2.4);
  assert.equal(STAGE1_RULES.commandStrikeCooldownSec, 0.25);
  assert.equal(STAGE1_RULES.coinLifeSec, 8);
  assert.equal(STAGE1_RULES.ratClockSec, 3.2);
  assert.equal(STAGE1_RULES.gobClockSec, 3.2);
  assert.equal(STAGE1_RULES.snikClockSec, 3.4);

  assert.equal(commandStrikeDamageStage1(0.10, 1), 1);
  assert.equal(commandStrikeDamageStage1(0.10, 2.2), 3);

  assert.equal(mystraActiveForStage(1), true);
  assert.equal(mystraActiveForStage(2), true);
  assert.equal(mystraActiveForStage(3), true);
  assert.equal(mystraActiveForStage(4), true);
  assert.equal(mystraActiveForStage(5), false);
});

