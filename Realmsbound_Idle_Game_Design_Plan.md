# REALMSBOUND — An Idle Adventuring Career
### Game Design Plan v0.1 (Gameplay & Fun-First Design Document)

> **Working title:** *Realmsbound* (placeholder — alternatives: *Legends of the Dale*, *Idle Adventurer: Sage's Errand*)
> **Genre:** Idle / incremental RPG with light active play
> **Visual style:** High-fidelity pixel art ("AAA pixel" — modern lighting, rich animation, juicy feedback)
> **Inspiration:** *Idle Champions of the Forgotten Realms*, tabletop D&D (2024 rules), classic idle games (AdVenture Capitalist milestones, Clicker Heroes stage structure, FFXII gambits for automation)
> **Primary rules source:** D&D Beyond Basic Rules (2024) — https://www.dndbeyond.com/sources/dnd/br-2024
> **Status:** Planning only. No code. This document focuses on gameplay, progression, feel and fun, not technical implementation.

---

## Table of Contents

1. Vision & Design Pillars
2. Terminology (read this first)
3. The Core Gameplay Loops
4. The Idle Battle System
5. Core Progression Systems
6. Gear, Loot & Upgrades
7. Character Creation & Customisation
8. Automation & "Gambits": Idle Depth for Advanced Players
9. **The Tutorial: Prologue "The Sage's Errand" (Stages 1–10)** ← the most detailed section
10. Freeplay Beyond the Tutorial (Stages 11–100+)
11. Prestige: "Retell the Legend"
12. Meta Systems: Bestiary, Trinkets, Bounty Board, Town Hub
13. Pixel Art & "Juice" Direction
14. Pacing Targets & Fun Checklist
15. Campaign Mode (later phase, outline only)
16. Phased Roadmap
17. Risks, Licensing Notes & Open Questions

---

## 1. Vision & Design Pillars

**The elevator pitch:**
*You are a nobody with a sword and a borrowed pack. Elminster of Shadowdale has decided, for reasons he won't explain, that you might be worth something. Fight your way from goblin-infested turnip fields to the Planes themselves, building one hero's career, from Level 1 sellsword to Epic legend, while the numbers climb and the dice keep rolling, even while you sleep.*

### The Five Pillars

| # | Pillar | What it means in practice |
|---|--------|---------------------------|
| 1 | **"You can see the dice."** | D&D's d20 is the heart of the game. Every attack shows a tiny pixel d20 popping out. Natural 20s are huge events; natural 1s are slapstick. Advantage shows **two** dice and the better one glows. Players should *feel* the tabletop. |
| 2 | **D&D-authentic, never D&D homework.** | We use real 2024 concepts (Weapon Mastery, Fighting Styles, Second Wind, Action Surge, feats, CR, XP thresholds, rarity), but every rule becomes a simple, readable game effect. Nobody needs to read a rulebook. |
| 3 | **Always something to want.** | At every moment the player sees three goals: something cheap to buy *now*, something to save for *soon*, and a big milestone *on the horizon* (next stage, next level, next boss). |
| 4 | **One hero, deeply yours.** | Unlike Idle Champions' big roster, this game is about **your** adventurer's career. Their looks, gear, build, titles, trophies and story all build up over time. Customisation is a progression track in its own right. |
| 5 | **Idle when you want, involved when you want.** | Freeplay runs itself, and you can leave it for hours. Active players get rewarded with click strikes, ability timing, boss tactics and build tweaks. Campaign mode (later) is the "fully involved" mode. |

### What makes it different from Idle Champions

| Idle Champions | Realmsbound |
|---|---|
| Roster of many licensed champions in a formation | **One custom hero** (later: a small hired party of companions) |
| Champion levels reset every adventure | **Two-layer levelling:** permanent D&D Hero Level (1–20, then Epic), plus resettable gold-funded Training Ranks |
| Gear comes from chests and is mostly stat sticks | **Visible paper-doll gear** that changes your sprite, with forging, enchanting, dice upgrades and transmog |
| Formation strategy | **Build strategy:** feats, Weapon Mastery, fighting styles, gambit automation rules |
| Story told mostly through adventure text | **Elminster as a live narrator/mentor** who reacts to what you do |

---

## 2. Terminology (read this first)

To avoid confusion, the game separates two kinds of "level":

| Term | Meaning |
|---|---|
| **Stage** | A battlefield "level" you progress through (Stage 1, Stage 2, …). Each Stage has a backdrop, a monster roster and a kill quota. *The tutorial = Stages 1–10.* |
| **Hero Level** | Your character's D&D level (1–20, then Epic Levels). Earned through **XP**. Permanent and never reset. |
| **Training Rank** | Gold-bought idle upgrades (e.g. Weapon Training Rank 37). They go very high and **reset on Prestige**. |
| **Wave** | A group of monsters that walks onto the screen together. |
| **Boss Stage** | Every 5th Stage. A named boss with a timer. |
| **Region** | A block of 25 Stages sharing a biome and monster family (e.g. "The Dalelands"). |
| **Round** | The battle "heartbeat". The hero and every monster act once per Round on their own timers (see §4). |

> **Interpretation note:** The brief asks for "incredible detail for the starting tutorial (the first 10 levels)". This plan reads that as **Stages 1–10**, with Stage 1 scripted beat by beat. Over those 10 Stages the hero also goes from **Hero Level 1 to Hero Level 5**, so the tutorial covers the full classic D&D "Tier 1" power curve and ends on the **Extra Attack** power spike.

---

## 3. The Core Gameplay Loops

Idle games work by stacking loops of different lengths. Each loop has its own reward rhythm.

```
┌──────────────────────── META LOOP (weeks) ───────────────────────────┐
│  Prestige ("Retell the Legend") → Renown → Hall of Legends perks →    │
│  push further each run → unlock Regions, Campaigns, new creator opts  │
│ ┌────────────────────── MACRO LOOP (hours/days) ───────────────────┐ │
│ │  Hero Levels → class features & feats → new builds → gear hunts  │ │
│ │  → Region bosses → Bestiary completion → Town upgrades           │ │
│ │ ┌───────────────────── MESO LOOP (minutes) ────────────────────┐ │ │
│ │ │  Clear Stage quota → next Stage → Boss every 5 → loot chest   │ │ │
│ │ │  → spend gold on Training → equip/forge gear → push again     │ │ │
│ │ │ ┌──────────────────── MICRO LOOP (seconds) ────────────────┐ │ │ │
│ │ │ │  Dice roll → hit/crit → monster pops → coins burst →     │ │ │ │
│ │ │ │  XP ticks → click strikes → ability procs                │ │ │ │
│ │ │ └──────────────────────────────────────────────────────────┘ │ │ │
│ │ └──────────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 Micro loop (every 1–5 seconds)
- **See:** your hero swings, a d20 pops up, the number flies, the monster flinches or explodes into pixels.
- **Get:** coins spray out (copper → silver → gold → platinum as your income grows, which shows your wealth tier at a glance), plus an XP tick on the bar.
- **Do (optional):** tap monsters for **Command Strikes**, tap ability buttons when they glow.

### 3.2 Meso loop (every 1–10 minutes)
- Fill the **kill quota bar** → the **Next Stage arrow** flares gold.
- Every 5th stage: **Boss fight** with a timer → **chest** → loot reveal.
- Spend gold on **Training Ranks** (cheap, constant, satisfying) and **Forge upgrades** (chunkier).
- Equip upgrades (green arrow ↑ comparisons, one tap to equip).
- **Wall moment:** progress slows → choose between farming the previous stage, re-arranging your build, or (later) prestiging.

### 3.3 Macro loop (hours to days)
- **Hero Level-ups** (permanent): new class features, subclass, feats, ability increases.
- Region progression (new biomes, new monster families, Region Boss every 25 stages).
- **Bestiary** collection, **Trinket** collection, **Titles**, cosmetic unlocks.
- Offline progress: come back to a **"While You Were Away" report** (written as one of Elminster's letters).

### 3.4 Meta loop (weeks)
- **Prestige:** "Retell the Legend". Reset stage progress and Training Ranks for **Renown**, which buys permanent multipliers and new features in the **Hall of Legends**.
- Unlock new creator options (species, backgrounds, classes), Campaign mode chapters, and Epic Boons.

### 3.5 The "Three Goals" HUD rule
The HUD **always** shows three goal widgets:
1. **Now:** the cheapest useful purchase (pulses when affordable).
2. **Soon:** next Hero Level (XP bar), with a preview icon of the feature you'll unlock.
3. **Horizon:** the next Boss / Region / milestone, with a countdown in stages.

---

## 4. The Idle Battle System

### 4.1 Screen layout (side-view, pixel)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Stage 3 ▸ Ashaba Riverbank]   Quota ▓▓▓▓▓▓▓░░░ 9/15     [⏩ Auto ▢] │
│                                                                      │
│      (parallax backdrop: sky / far hills / mid scenery / foreground) │
│                                                                      │
│   🧍 HERO        ⚔→       👹 👹  🦟 🦟   ← monsters walk in from right │
│   ▓▓▓▓▓▓░ HP                                                          │
│   Round ◔                                                             │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ [Second Wind ②] [Action Surge ⏳] [Potion x3]   💰 3 gp 4 sp 7 cp     │
│ XP ▓▓▓▓▓▓▓░░░ Lv 2 → 3 (Champion!)     [Training] [Gear] [Hero]      │
└──────────────────────────────────────────────────────────────────────┘
```

- Hero stands **left**; monsters enter **right** in waves and walk/fly toward the hero.
- Ranged attacks (javelins, bows) can hit monsters *while they approach*, which rewards ranged builds with "free" damage.
- The bottom tray holds abilities, potions, currency and menu tabs.

### 4.2 The Round Clock (D&D turns, made idle)
In D&D a round is 6 seconds. In Realmsbound, each combatant has a **Round Clock**, a small circular timer that fills up.

- **Hero base Round = 2.4 seconds** at 1× speed. *Footwork* Training and gear reduce it (floor: 0.6 s).
- When the clock fills, the hero takes their **turn**:
  - **Action:** Attack (1 attack at Hero Level 1, **2 attacks at Level 5** with Extra Attack, 3 at 11, 4 at 20).
  - **Bonus Action:** used automatically by features like Second Wind or Nick (Weapon Mastery).
  - **Reaction:** used for parries, opportunity strikes and "Indomitable" rerolls (later).
- Monsters each have their own Round Clock (fast vermin, slow ogres).
- **Game speed:** 1× at start, then 2× (unlocked Stage 10), 3×/4× via Hall of Legends.

**Why this works:** Extra Attack *literally doubles your swings per turn*. It's a power spike players can see, exactly like at the table.

### 4.3 Attack resolution ("You can see the dice")

**To hit:** `d20 + Proficiency Bonus + Ability Modifier + gear/feat bonuses` vs **monster Armor Class**.

- **Bounded accuracy is kept.** AC and to-hit stay in the D&D range (roughly 10–25). Hit chances usually sit between 55% and 95%, so a miss always *means* something.
- **Damage scales without limit.** HP and damage grow exponentially through Training multipliers, Forge levels and Renown. This is the idle "number go up" layer.

We call this the **"Dice Core, Multiplier Shell"** model:

| Layer | Source | Feel |
|---|---|---|
| **Dice Core** | Weapon die (e.g. Greatsword 2d6), d20 to-hit, crits, advantage | Variance, drama, D&D authenticity |
| **Multiplier Shell** | Training Ranks, Forge Levels, enchantments, Renown, milestone ×2s | Exponential idle growth (1 → 1K → 1M → 1B…) |

**Displayed damage** = (dice result + flat modifiers) × total multiplier.
Early game shows tabletop numbers ("8 damage!"). By the end of the tutorial it is in the low hundreds. Shortly after, thousands, then **K / M / B / T / aa / ab…** notation.

> **Elminster, the first time damage passes 1,000:** *"Legends grow in the telling, and apparently so do thy numbers. Don't let it go to thy head."*

### 4.4 Critical hits, fumbles & advantage
- **Natural 20 = Critical Hit.** Damage dice are doubled (D&D rule), then multiplied. The screen freezes for 2 frames, shakes, the number turns gold, and a "CRIT!" stamp appears in pixel letters.
- **Champion subclass (Hero Level 3):** Improved Critical → crit on **19–20** (later Superior Critical: **18–20**). Crit range upgrades are big, visible milestones.
- **Natural 1 = Fumble** (cosmetic only, **no penalty**). A short comedic animation (the hero slips, the sword bonks a helmet, a bird lands on the hero's head). Players should laugh, not get frustrated.
- **Advantage:** two d20s pop out and the higher one glows. **Disadvantage:** two dice, the lower one glows red.
- Advantage roughly doubles natural-20 chance (5% → 9.75%). Effects that grant advantage (Vex, Topple → Prone) are a core crit-build engine.

### 4.5 Command Strikes (the active "click" layer)
- **Tap or click a monster** for a **Command Strike**: a quick shout and bonus hit that deals a % of your weapon damage (starts at 10%, upgradeable).
- Tapping also **sets focus target** (the hero attacks that monster next). This is a small tactical choice: kill the Stirge draining you, or the Goblin Warrior?
- Later: **Auto-Command** (passive clicks/sec) unlocks through Training, so idle players aren't punished.

### 4.6 Hero abilities (D&D features → buttons)

Rest-based D&D features become **charges and cooldowns**:
- **Short Rest** = triggered automatically after every **Boss kill** *or* every **90 seconds** of combat (a "Catch Thy Breath" campfire flicker icon).
- **Long Rest** = returning to Town, or a Prestige.

| Feature (2024 Fighter) | Hero Level | Game version |
|---|---|---|
| **Second Wind** | 1 | Button with 2 charges (3 at Lv4, 4 at Lv10). Heals (1d10 + Hero Level) × HP multiplier. Regains 1 charge per Short Rest. **Auto-use at a set HP %** unlockable. |
| **Weapon Mastery** | 1 | Passive mastery effect on your equipped weapons (see §4.7). Number of masteries known: 3 → 4 (Lv4) → 5 (Lv10) → 6 (Lv16). |
| **Fighting Style** | 1 | Pick a Fighting Style feat (see §5.5). |
| **Action Surge** | 2 | Big glowing button: instantly take an extra full turn (all attacks). Refreshes each Short Rest. Perfect for opening boss fights. *(2 uses at Lv17.)* |
| **Tactical Mind** | 2 | Spend a Second Wind charge to add 1d10 to a failed **Skill Event** check (see §12.4). |
| **Champion: Improved Critical** | 3 | Crit on 19–20. |
| **Champion: Remarkable Athlete** | 3 | Hero always acts first when a new wave arrives (an "initiative advantage" first strike). After a crit, the hero gets a free reposition/dash animation, plus +Round speed for 1 turn. |
| **Ability Score Improvement / Feat** | 4, 6, 8, 12, 14, 16 | Big choice screen (see §5.5). |
| **Extra Attack** | 5 | 2 attacks per Action. **The tutorial finale reward.** |
| **Tactical Shift** | 5 | Using Second Wind also grants a short dodge (ignore the next hit). |
| **Champion: Additional Fighting Style** | 7 | Second Fighting Style slot. |
| **Indomitable** | 9 | Auto-reroll a failed save against a status effect (Hero Level added). |
| **Tactical Master** | 9 | Swap any weapon's mastery to Push, Sap or Slow (a loadout toggle). |
| **Champion: Heroic Warrior** | 10 | Heroic Inspiration refills at the start of each turn in combat (a free reroll engine). |
| **Two Extra Attacks** | 11 | 3 attacks per Action. |
| **Studied Attacks** | 13 | After a miss, the next attack against that target has advantage. |
| **Champion: Superior Critical** | 15 | Crit on 18–20. |
| **Champion: Survivor** | 18 | Advantage on Death Saves; regen while "Bloodied" (below 50% HP). |
| **Epic Boon** | 19 | Choose an Epic Boon (Combat Prowess, Fate, Irresistible Offense, etc.). |
| **Three Extra Attacks** | 20 | 4 attacks per Action. Then Epic Levels begin (§5.3). |

### 4.7 Weapon Mastery → idle effects
The 2024 Weapon Mastery system is a gift for idle design. Each property becomes a clear, visible combat effect:

| Mastery | 2024 tabletop gist | Realmsbound idle effect | Visual |
|---|---|---|---|
| **Cleave** | Hit → extra attack on an adjacent foe | Each hit has a follow-through strike on the **next monster in the wave** (no ability modifier) | Wide arc trail hitting two sprites |
| **Graze** | Miss → still deal ability-mod damage | **Misses still deal chip damage**. "No swing wasted." | Grey "GRAZE" number |
| **Nick** | Light off-hand attack as part of the Attack action | **Free off-hand strike every turn** (+effective attack speed) | Quick second blade flash |
| **Push** | Push the target 10 ft | Knocks the monster back and **delays its Round Clock by 20%**. Chance to bowl into the monster behind. | Monster slides back, dust puff |
| **Sap** | Target has disadvantage on its next attack | The monster's next attack rolls **with disadvantage** (defensive mastery) | Dizzy stars over the head |
| **Slow** | Speed −10 ft | Monster approach speed & Round speed −15% for 3 s (more ranged hits on approach) | Blue drag lines |
| **Topple** | Con save or Prone | Chance to knock **Prone**: monster loses its next action, and **your attacks against it have advantage** | Monster flips onto its back |
| **Vex** | Advantage on your next attack vs the target | Next attack vs the same target has **advantage** (crit engine) | Target reticle glows |

Weapons keep their official 2024 masteries (e.g. Greatsword = Graze, Greataxe = Cleave, Longsword = Sap, Flail = Sap, Battleaxe = Topple, Maul = Topple, Warhammer = Push, Shortsword = Vex, Scimitar = Nick, Rapier = Vex, Longbow = Slow, Javelin = Slow).

**Build-crafting payoff:** Vex + Champion crit range + Savage Attacker = "Crit Fisher". Topple + Great Weapon Fighting = "Bonebreaker". Cleave + big waves = "Wave Reaper". Players discover these themselves, and Elminster occasionally hints at them.

### 4.8 Hero HP, damage taken & Death Saves
- Monsters roll to hit against the hero's **AC** (e.g. Chain Mail 16, +1 with the Defense style).
- HP regenerates slowly between waves ("catching breath").
- **Potions of Healing** sit in a quick slot, with **auto-drink at X% HP** unlockable.
- **Downed → Death Saving Throws (a dramatic mini-moment):**
  - Time slows, the screen desaturates, and three d20s roll one after another (≥10 = success).
  - **3 successes:** the hero staggers up at 25% HP (once per stage).
  - **3 failures:** **Retreat**. The hero is carried back to the previous Stage (no loss of gold, XP or items. Idle games must never punish harshly).
  - **Natural 20 on a save:** the hero leaps up at **full HP** with a heroic shout and a 10-second damage buff. *This should be a legendary, screenshot-worthy moment.*
- The tutorial protects new players: in Stages 1–2 Elminster casts a shimmering ward ("Mystra's patience") that stops the hero going down.

### 4.9 Heroic Inspiration (the reroll currency)
- A 2024 rule turned into a resource: **Heroic Inspiration** = a glowing d20 token.
- **Use:** reroll any failed d20 (a missed boss attack, a failed death save, a failed skill event).
- **Earn:** boss kills, quest completions, natural 20s (small chance), and the **Human "Resourceful" trait** (+1 token on every Long Rest).
- **Gambit option:** "Auto-spend Inspiration only on Boss attacks."

### 4.10 Monsters
- Monsters are adapted from the Basic Rules creature stat blocks: goblins, kobolds, wolves, worgs, stirges, bugbears, ogres, owlbears, skeletons, zombies, ghouls, dragons and more.
- **Challenge Rating (CR)** sets the monster's **tier**, **XP value** (we use the real CR→XP values: CR 1/8 = 25 XP, CR 1/4 = 50, CR 1/2 = 100, CR 1 = 200, CR 2 = 450, CR 3 = 700…), and which Region it appears in.
- Each monster gets **one signature gamified trait** taken from its stat block, so monsters feel distinct without complexity:
  - *Goblin Warrior:* **Nimble Escape**, occasionally hops back out of melee (rewards ranged/Push builds).
  - *Goblin Boss:* **Redirect Attack**, swaps places with a minion to dodge your hit (kill the minions first!).
  - *Wolf:* **Pack Tactics**, +hit chance when 2+ wolves are on screen; its bite can knock the hero Prone.
  - *Stirge:* **Blood Drain**, latches on and drains HP each Round until killed.
  - *Giant Wolf Spider / Giant Centipede:* **Poisoned** condition on bite.
  - *Bugbear Warrior:* **Long-limbed Grab**, grapples the hero (hero's Round Clock slows until he breaks free).
- **Elites** (from Stage 8 onward): glowing outline + 1 random **affix** (e.g. *Armoured* +2 AC, *Frenzied* faster Round, *Hoarder* drops 5× gold, *Regenerating*).
- **Rare spawn "Gilded" monsters:** a golden-glinting version of any monster (≈1 in 400). Explodes into a fountain of coins and a guaranteed item. Pure joy.

### 4.11 Conditions (status effects)
Conditions from the 2024 Rules Glossary become simple status icons:

| Condition | Game effect |
|---|---|
| **Poisoned** | Disadvantage on attacks (two dice, lower glows) |
| **Prone** | Loses next action; attacks against it have advantage |
| **Frightened** | Can't approach; attacks with disadvantage |
| **Grappled** | Round Clock slowed by 40% |
| **Stunned** | Skips turns; attacks against it have advantage *(later content)* |
| **Restrained** | Webbed: attacks against it have advantage, it has disadvantage |
| **Bloodied** *(2024 term, below half HP)* | Triggers certain feats/features; visual crack overlay on HP bar |

---

## 5. Core Progression Systems

Realmsbound has **several progression tracks running in parallel**, so the player is always close to *something*.

| Track | Currency | Resets on Prestige? | Ceiling | Feel |
|---|---|---|---|---|
| Hero Level | XP | **No** | 20 + infinite Epic | Slow, meaningful, D&D milestones |
| Training Ranks | Gold | **Yes** | Effectively infinite | Fast, constant, "number go up" |
| Ability Scores | Level-ups, rare tomes | No | 20 (30 with Epic) | Rare, chunky |
| Feats | Hero Levels | No (respec costs gold) | Build-defining | Choices & identity |
| Gear & Forge | Loot, Gold, Materials | Gear kept; Forge Levels partly reset | Infinite Forge Levels | Loot dopamine |
| Bestiary | Kills | No | Per-monster tiers | Collection |
| Renown | Prestige | No (it *is* the meta) | Infinite | Long-term power |
| Cosmetics & Titles | Achievements | No | Large catalogue | Self-expression |

### 5.1 Currencies
| Currency | Source | Use |
|---|---|---|
| **Gold (cp/sp/gp/pp)** | Every kill | Training Ranks, Forge, shop, respecs. *Displayed as D&D coins: 1 gp = 10 sp = 100 cp, 1 pp = 10 gp. Early income shows coppers, then silver, gold and platinum showers, so wealth tier is visible. Later abbreviated (e.g. 4.2M gp).* |
| **XP** | Every kill (CR-based), stage clears, quests | Hero Levels |
| **Materials** | Monster-specific drops (Wolf Pelt, Spider Silk, Fire Beetle Gland, Worg Fang…) | Forging and crafting gear |
| **Arcane Dust** | Salvaging unwanted gear | Enchanting (+1/+2/+3), rerolling properties |
| **Heroic Inspiration** | Bosses, quests, Human trait | Rerolls |
| **Renown** | Prestige | Hall of Legends perks |
| **Trophies** | Boss first kills, Region bosses | Cosmetic unlocks, Town decorations, titles |

### 5.2 Hero Level & XP (permanent)
We use **the real 2024 XP thresholds**:

| Hero Level | XP needed | Proficiency Bonus | Headline unlock (Fighter) |
|---|---|---|---|
| 1 | 0 | +2 | Fighting Style, Second Wind, Weapon Mastery (3) |
| 2 | 300 | +2 | **Action Surge**, Tactical Mind |
| 3 | 900 | +2 | **Subclass: Champion** (Improved Critical 19–20) |
| 4 | 2,700 | +2 | **ASI or Feat**, Mastery slot 4, Second Wind ×3 |
| 5 | 6,500 | +3 | **Extra Attack**, Tactical Shift |
| 6 | 14,000 | +3 | ASI or Feat |
| 7 | 23,000 | +3 | Additional Fighting Style |
| 8 | 34,000 | +3 | ASI or Feat |
| 9 | 48,000 | +4 | Indomitable, Tactical Master |
| 10 | 64,000 | +4 | Heroic Warrior, Mastery slot 5, Second Wind ×4 |
| 11 | 85,000 | +4 | **Two Extra Attacks** |
| 12 | 100,000 | +4 | ASI or Feat |
| 13 | 120,000 | +5 | Indomitable ×2, Studied Attacks |
| 14 | 140,000 | +5 | ASI or Feat |
| 15 | 165,000 | +5 | **Superior Critical (18–20)** |
| 16 | 195,000 | +5 | ASI or Feat, Mastery slot 6 |
| 17 | 225,000 | +6 | Action Surge ×2, Indomitable ×3 |
| 18 | 265,000 | +6 | Survivor |
| 19 | 305,000 | +6 | **Epic Boon** |
| 20 | 355,000 | +6 | **Three Extra Attacks** → Epic Levels unlock |

**Gamification of XP:**
- Monsters give **CR-based XP** (authentic), multiplied by an **XP Gain %** stat (gear, Renown, INT, events) so later levels stay achievable at idle pace.
- **Level-up moment:** a pillar of pixel light, a chiptune fanfare, the hero sprite does a victory pose, and a **"New Power" card** flips over showing the new feature with a one-line explanation from Elminster.
- **Preview icons:** the XP bar always shows the *next* feature's icon, so players chase it.

### 5.3 Epic Levels (post-20, infinite)
- After Level 20, XP keeps flowing into **Epic Levels** (Epic 1, 2, 3…).
- Every Epic Level: +1 **Epic Point** to spend in an Epic constellation (small % boosts).
- Every 5 Epic Levels: choose another **Epic Boon** (Boon of Combat Prowess, Boon of Fate, Boon of Irresistible Offense, Boon of Truesight, Boon of the Night Spirit, Boon of Dimensional Travel, Boon of Spell Recall), each with its own upgrade tiers.
- Ability score cap rises to 30 via Epic Boons (as in 2024 rules).

### 5.4 Ability Scores (gamified)
The six abilities each have a clear idle job:

| Ability | Idle effect |
|---|---|
| **Strength** | Melee to-hit & damage; heavy armour without penalty |
| **Dexterity** | Ranged/finesse to-hit & damage; Round speed bonus; AC with light/medium armour |
| **Constitution** | Max HP, HP regen, Death Save bonus |
| **Intelligence** | XP Gain %, better Forge outcomes, identifies item properties faster |
| **Wisdom** | Perception: chance to find **secret chests** mid-stage; resist conditions |
| **Charisma** | Gold Find % from bounties, shop discounts, companion morale (later), more Elminster banter |

- **Creation:** 2024 Standard Array (15, 14, 13, 12, 10, 8) or Point Buy (27 points), then the Background bonus (+2/+1 or +1/+1/+1).
- **Increases:** ASI at feat levels, rare **Manuals & Tomes** (Legendary loot), Epic Boons.

### 5.5 Feats (build identity)
Feats from the Basic Rules, translated into idle effects:

**Origin Feats** (from Background; Humans get an extra one via *Versatile*)
| Feat | Idle version |
|---|---|
| **Savage Attacker** | Once per turn, roll weapon damage dice twice and keep the better result (both dice shown, best glows) |
| **Alert** | Always strike first when a wave arrives; +Proficiency to initiative (an opening free strike) |
| **Skilled** | +3 skill proficiencies → better odds and rewards on Skill Events |
| **Magic Initiate** | Unlocks 2 cantrips + one 1st-level spell as auto-cast abilities (e.g. *Fire Bolt* ranged opener, *Shield of Faith*-style buff) — a gateway to spell systems |

**Fighting Style Feats**
| Feat | Idle version |
|---|---|
| **Great Weapon Fighting** | Two-handed damage dice: 1s and 2s count as 3s (shown as dice "flipping" upward) |
| **Defense** | +1 AC while wearing armour |
| **Archery** | +2 to hit with ranged weapons (bigger approach-phase damage) |
| **Two-Weapon Fighting** | Off-hand strikes add your ability modifier (synergises with Nick) |

**General Feats**
| Feat | Idle version |
|---|---|
| **Ability Score Improvement** | +2 to one score or +1 to two |
| **Grappler** | Chance to grapple a monster: it can't flee/Nimble Escape, and you deal bonus damage against it |

**Feat choice UX:** big tarot-style cards. Each card shows a **"try it" preview** (a 5-second looping animation of the effect) and a projected DPS change. Respec is allowed (gold cost, free in the tutorial).

### 5.6 Training Ranks (the gold sink, resets on Prestige)
Bought at the **Training Yard** tab. This is the "constant small purchases" engine:

| Training track | Effect per rank | Milestone bonuses |
|---|---|---|
| **Weapon Drills** | +damage multiplier | ×2 damage at ranks 10, 25, 50, 100, 200, 300… |
| **Armour Drills** | +HP and damage reduction | ×2 HP at milestones |
| **Footwork** | −Round time (attack speed) | Extra Command Strike per click at milestones |
| **Tactics** | +Command Strike damage, +crit damage | +1 crit range at rank 250 & 500 (huge) |
| **Scavenging** | +Gold Find % | Coins auto-collect at rank 5 (taught in tutorial) |
| **Conditioning** | +HP regen, +potion effect | Potion capacity +1 at milestones |

- **Cost curve:** each rank costs ~8–12% more than the last; milestones are spaced so a ×2 jump arrives every few minutes early on.
- **Buy ×1 / ×10 / ×25 / Max** toggles (unlocked in the tutorial at Stage 4).
- **Milestone celebration:** the rank number explodes, "×2!" stamps on screen, and Elminster sometimes comments.

---

## 6. Gear, Loot & Upgrades

### 6.1 Equipment slots (visible on the pixel paper doll)
**Main Hand · Off Hand/Shield · Armour · Helm · Cloak · Gloves · Boots · Belt · Amulet · Ring ×2 · Trinket**

Every Armour, Helm, Cloak, weapon and shield **changes the hero's sprite**. This is vital to the "my hero's career" fantasy. A level 1 hero in rusty chain mail should look completely different from a level 20 hero in dragon scale.

### 6.2 Mundane base items (from the 2024 Equipment chapter)
These form the **base-item ladder**. Every magic item sits on a base:

- **Armour:** Light (Padded, Leather, Studded Leather) → Medium (Hide, Chain Shirt, Scale Mail, Breastplate, Half Plate) → Heavy (Ring Mail, Chain Mail, Splint, Plate). Base AC follows the 2024 values (e.g. Chain Mail 16, Splint 17, Plate 18).
- **Weapons:** keep their 2024 damage dice, properties (Heavy, Light, Finesse, Two-Handed, Reach, Thrown…) and **Mastery**.
- **Shields:** +2 AC.

### 6.3 Rarity (D&D tiers, pixel colours)
| Rarity | Colour | Typical affixes | Drop feel |
|---|---|---|---|
| Common | White | 0–1 minor | Constant |
| Uncommon | Green | 1–2, or +1 enchant | Frequent |
| Rare | Blue | 2–3, or +2 | Exciting |
| Very Rare | Purple | 3–4, or +3 | Big moment, unique sound |
| Legendary | Orange | Named, unique power | Screen-wide beam of light |
| Artifact | Red/animated | Set-defining | Ultra rare, server-wide toast (later) |

Iconic Basic Rules magic items make great named drops: **Potion of Healing, Bag of Holding** (inventory expansion), **Cloak of Protection, Ring of Protection, Gauntlets of Ogre Power, Boots of Speed, Amulet of Health, Belt of Giant Strength, Flame Tongue, Frost Brand, Dragon Scale Mail, Vorpal Sword, Holy Avenger**. Each gets an idle-friendly power (e.g. *Flame Tongue* adds a fire burn proc; *Vorpal Sword* gives a tiny chance to instantly behead non-boss enemies on a natural 20, with a cartoonish pixel "pop").

### 6.4 The four upgrade axes (this is where the depth lives)
1. **Forge Level** (Gold + Materials, *Blacksmith*): +1 Forge Level = +X% item power. Infinite. Milestones every 10 levels add a visual upgrade (sheen → glow → particles → aura).
2. **Dice Ladder** (Materials, milestone Forge levels): the weapon's damage die steps up: **d6 → d8 → d10 → d12 → 2d8 → 2d10 → 3d8 …** More dice literally roll on screen as the weapon grows. *A signature system, and very gamified.*
3. **Enchantment** (Arcane Dust): **+1 → +2 → +3**, adding to hit & damage (bounded, precious). Beyond +3, "Mythic Runes" (later).
4. **Quality** (crafting/salvage): *Crude → Standard → Fine → Masterwork → Heirloom*, raising stat ranges and adding an affix slot.

**Supporting systems:**
- **Salvage** unwanted items → Arcane Dust + Materials (auto-salvage filter by rarity).
- **Transmog/"Glamour":** apply any unlocked appearance to any item (all cosmetics come from play).
- **Item Sets** (later): "Shadowdale Militia Set", "Zhentarim Blackguard Set".
- **Loadouts:** save 3 gear+feat+gambit setups (e.g. "Boss Killer" vs "Wave Farmer").

### 6.5 Loot presentation (juice)
- Monsters "pop" items in a little arc. Chests shake, glow by rarity, and burst open.
- **Better-item indicator:** green ↑ arrow + DPS delta; tap to equip instantly.
- **Loot filter** (unlocks Stage 10) so idle play doesn't flood the inventory.

---

## 7. Character Creation & Customisation

### 7.1 Phase 1 (launch / vertical slice): "Quick Hero" — Human Fighter
The game opens straight into play (the tutorial starts within 30 seconds). The player customises a **Human Fighter** at a natural pause (after Stage 1, when Elminster asks, *"And what does one call thee, anyway?"*).

**Step 1 — Look (pixel paper doll):**
- Body type (2–4 frames), skin tone (12+), face (8), eye colour, hair style (16+), hair colour (16+), facial hair (10), scars & tattoos (12), voice "bark" set (6: gruff, cheerful, stoic, cocky, weary, noble).
- Idle animation (sword-on-shoulder, leaning, stretching) & victory pose (unlock more later).
- **Heraldry designer:** shield/cloak emblem built from colours + charges (lion, wolf, tower, star of Mystra…).

**Step 2 — Name & epithet.** "Aldric the ___" (epithets unlock through achievements: *the Turnip-Saviour*, *Goblin-Bane*, *Who Fell Down Twice*).

**Step 3 — Background (2024 Basic Rules):** each gives an Origin feat, skills and an ability bonus. Gamified:

| Background | Ability bonus options | Origin Feat | Gameplay flavour |
|---|---|---|---|
| **Soldier** *(recommended)* | STR / DEX / CON | Savage Attacker | Best raw damage start; Athletics & Intimidation skill events |
| **Criminal** | DEX / CON / INT | Alert | Always strike first; lockpick (Sleight of Hand) chest events pay out more |
| **Acolyte** | INT / WIS / CHA | Magic Initiate (Cleric) | Light healing cantrip-style auto-cast; Religion events |
| **Sage** | CON / INT / WIS | Magic Initiate (Wizard) | Ranged cantrip opener; Arcana events; +XP feel |

**Step 4 — Human species traits (2024), gamified:**
- **Resourceful:** +1 Heroic Inspiration on every Long Rest (and +1 max Inspiration).
- **Skillful:** +1 skill proficiency of choice (boosts one Skill Event family).
- **Versatile:** a second **Origin Feat** of choice. Humans get *two* Origin feats, a strong and simple identity.

**Step 5 — Starting kit (the 2024 Fighter equipment options as playstyles):**

| Kit | Contents (2024) | Playstyle tag | Recommended Fighting Style |
|---|---|---|---|
| **A — "Vanguard"** | Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer's Pack, 4 gp | Heavy hitter, Graze (no wasted swings), javelin opener volley | Great Weapon Fighting |
| **B — "Skirmisher"** | Studded Leather, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer's Pack, 11 gp | Fast dual-wield (Nick + Vex), longbow approach damage | Two-Weapon Fighting or Archery |
| **C — "Purse of Fortune"** | 155 gp | Shop your own kit at the Shadowdale smithy (for experienced players; enables Sword & Board: Longsword + Shield + Defense) | Any |

**Step 6 — Fighting Style:** Great Weapon Fighting / Defense / Archery / Two-Weapon Fighting.

**Step 7 — Weapon Masteries (3):** auto-suggested from the kit, with "Why?" tooltips.

> **Default "just let me play" path:** Soldier, Kit A, Great Weapon Fighting, masteries Graze (Greatsword), Sap (Flail), Slow (Javelin). One tap: **"Elminster, choose for me."**

### 7.2 Phase 2+: full Character Creator
- **Species (2024 Basic Rules):** Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling, each with a signature idle trait (e.g. Dragonborn *Breath Weapon* as an AoE active, Orc *Relentless Endurance* as a once-per-stage cheat death, Halfling *Luck* that rerolls natural 1s, Goliath *Large Form* as a boss-phase power-up).
- **Classes:** all 12 (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard), each with an idle "engine" (e.g. Wizard = spell-slot burst cycles; Rogue = Sneak Attack combo on advantage; Barbarian = Rage meter; Paladin = Smite charges on crits).
- **Multiclassing** (late-game, prestige-unlocked) as a deep customisation layer.
- **Multiple hero slots** (a "Guild Roster") so players can run different careers.

---

## 8. Automation & "Gambits": Idle Depth for Advanced Players

The "advanced customisation" hook. Inspired by FFXII, **Gambits** are simple **IF → THEN** rules the hero follows automatically. Slots unlock with progression (first slot at Stage 8 in the tutorial).

| Example gambit | Use |
|---|---|
| IF HP < 40% → Second Wind | Survival |
| IF Boss appears → Action Surge | Burst |
| IF 3+ enemies on screen → swap to Greataxe (Cleave) | Wave clearing |
| IF target is Prone → Command Strike priority | Crit fishing |
| IF Stirge attached → target Stirge | Smart focus |
| IF natural 1 on Boss attack → spend Heroic Inspiration | Reroll economy |
| IF HP < 25% and no Second Wind → drink Potion | Safety net |

- **Conditions** and **actions** are "collected" as cards (dropped by bosses or bought), making automation itself a progression track.
- Gambits make idle play *smart*, reward thinking, and give hardcore players a sandbox.

---

## 9. THE TUTORIAL — Prologue: "The Sage's Errand" (Stages 1–10)

### 9.0 Overview

**Setting:** **Shadowdale**, in the Dalelands of the Forgotten Realms. It's Elminster's home, a pastoral valley beneath the great rock of **Old Skull**, beside the **River Ashaba**, bordered by the elven forest of **Cormanthor**. It's cosy, iconic and safe-feeling, the perfect place for goblins to ruin.

**Story in one line:** Goblins have been raiding Shadowdale's farms. Elminster, too busy (or too lazy) to deal with it himself, "volunteers" a passing sellsword (you) to sort it out. It ends with the discovery that someone is *paying* the goblins: a **black iron coin stamped with a winged serpent, the mark of the Zhentarim**. That hooks Freeplay and the future Campaign mode.

**Starting hero:** Human Fighter, Hero Level 1 (default Soldier background, Kit A "Vanguard": Greatsword, Chain Mail, Flail, Javelins).

**Tutorial design goals:**
1. Teach **one new thing per Stage**, maximum two.
2. The player is **never** more than 20 seconds from a reward.
3. Reach **Hero Level 5 (Extra Attack)** at the finale. The full D&D Tier 1 fantasy in ~25–35 minutes.
4. Elminster is **charming, brief and funny**, never a lecture. Max 2 lines per bubble, ~140 characters.
5. **Skippable** for returning players ("Elminster, I know what I'm doing." → *"Hmph. They all say that."*).

#### Elminster: character & voice guide
- **Who:** the Sage of Shadowdale, ancient Chosen of Mystra, pipe-smoking, white-bearded, sardonic, secretly kind.
- **Voice:** mildly archaic ("thee/thy" used sparingly, not every line), dry wit, fond exasperation, occasional fourth-wall winks about "the glowing buttons".
- **Visual:** a 64×64 pixel portrait in a carved-wood dialogue frame (bottom-left), 6 expressions: *amused, unimpressed, pipe-puff, alarmed, proud, conspiratorial*. Also a small in-world sprite who appears at the battlefield edge, sits on a fence or rock, and smokes his pipe (smoke rings drift across the parallax).
- **Audio:** a soft "mumble-burble" text blip (Animal Crossing-style) with optional full VO later. Unique pipe "puff" SFX on pipe-puff expression.
- **Rules:** never blocks gameplay for more than 3 seconds; taps advance text; if the player is clearly playing well, he shortens his lines ("Thou knowest this already. Carry on.").

#### UI guidance language
- **Spotlight:** the screen dims except a circular highlight around the target UI element.
- **Hand pointer:** a pixel gauntlet points & taps (appears after 6 seconds of inactivity on a required step).
- **Nudge escalation:** 6 s → gauntlet pointer; 15 s → Elminster nudge line; 30 s → element pulses gold + gentle chime.

#### Tutorial pacing & XP map (exact)
Monster XP uses real CR values (Giant Rat / Goblin Minion / Stirge = 25; Giant Fire Beetle = 10; Goblin Warrior / Wolf / Giant Wolf Spider / Giant Centipede / Swarm of Rats = 50; Worg = 100; Goblin Boss / Bugbear Warrior = 200). Named minions give double XP. **Stage Clear bonuses** are tuned so level-ups land on the big moments (assuming no farming; level-ups are never gated, so farmers just level earlier).

| Stage | Name | Kills | Monster XP | Clear bonus | Cumulative XP | Hero Level at end |
|---|---|---|---|---|---|---|
| 1 | Old Skull Meadow | 10 | 275 | 25 | **300** | **2** (Action Surge) |
| 2 | Hedrun's Turnip Fields | 12 | 225 | 25 | 550 | 2 |
| 3 | The Ashaba Ford | 15 | 330 | 20 | **900** | **3** (Champion) |
| 4 | The Burned Waystation | 18 | 800 | 50 | 1,750 | 3 |
| 5 | **BOSS: Skrag's Toll Bridge** | 5 + Boss | 450 | 500 (first kill) | **2,700** | **4** (ASI/Feat) |
| 6 | Edge of Cormanthor | 15 | 625 | 25 | 3,350 | 4 |
| 7 | Silkshadow Hollow | 15 | 625 | 25 | 4,000 | 4 |
| 8 | Mouth of the Warrens | 18 | 850 | 25 | 4,875 | 4 |
| 9 | The Deep Warrens | 20 | 950 | 25 | 5,850 | 4 |
| 10 | **BOSS: Grimjaw's Den** | 6 + Boss | 600 | 50 (first kill) | **6,500** | **5** (Extra Attack!) |

**Target times (first play, 1× speed, light active play):** S1 ≈ 2 min, S2 ≈ 2 min, S3 ≈ 2.5 min, S4 ≈ 3 min, S5 ≈ 3 min, S6–S9 ≈ 3–4 min each, S10 ≈ 4 min. **Total ≈ 30 minutes.**

#### Tutorial teaching map
| Stage | Teaches | Unlocks |
|---|---|---|
| 1 | Auto-battle, dice, Command Strike (tap), coins, quota bar, Next Stage, first Training purchase, Level-up | Training tab, Weapon Drills |
| 2 | **Action Surge** (active ability), more Training tracks, coin auto-collect | Footwork, Scavenging, Character Customiser |
| 3 | **Hero HP, Second Wind, Potions**, focus-targeting (Stirges), Subclass choice | Champion subclass card, Potion slot |
| 4 | **AC & misses**, **Weapon Mastery** (Graze), **loot & equipping**, buy ×10 | Gear tab, Buy-multiplier toggle |
| 5 | **Boss fights & timer**, boss mechanics, chests, **Feat/ASI choice** | Blacksmith (Forge), Auto-advance toggle |
| 6 | **Auto-advance & idle play**, ranged approach damage (Javelins), Materials | Materials pouch |
| 7 | **Conditions** (Poisoned), **Skill Events** (d20 checks outside combat) | Skill Events |
| 8 | **Elites & affixes**, **Gambits** (first automation slot) | Gambits tab (1 slot) |
| 9 | **Offline progress**, **Bestiary**, Heroic Inspiration | Bestiary, Inspiration |
| 10 | Everything combined; **Extra Attack** spike; story hook | Freeplay, Town Hub (Shadowdale), 2× speed, World Map |

---

### 9.1 STAGE 1 — "Old Skull Meadow" (fully scripted)

#### Backdrop: Old Skull Meadow at Dawn
A lush meadow on the outskirts of Shadowdale, just after sunrise. It should immediately say *"cosy fantasy world worth protecting."*

**Parallax layers (back → front):**
1. **Sky:** dawn gradient from peach (#F6C59B) at the horizon to soft lavender (#9C8CC9) at the top. Two slow-drifting pixel clouds with pink underbellies. A faint morning star (a nod to Mystra) twinkles for the first 10 seconds, then fades.
2. **Far layer:** the hulking grey rock of **Old Skull** rising on the left horizon (slight skull-like hollows if you squint). On the far right, the crooked silhouette of the **Twisted Tower of Ashaba** with a single lit window. Distant purple hills.
3. **Mid-far layer:** **Elminster's Tower**, a modest stone tower with a crooked chimney puffing *coloured* smoke (it changes colour every ~20 seconds: green, blue, violet). Thatched rooftops of Shadowdale village, and the **Old Skull Inn** sign swinging gently.
4. **Mid layer:** low dry-stone walls and hedgerows dotted with hawthorn blossom; a wooden fence where Elminster's sprite sits; a scarecrow (later a goblin hides behind it); a burrow mound with suspicious rustling (rat spawn point).
5. **Foreground:** tall grass tufts that sway when sprites walk through them, red & yellow wildflowers, a butterfly that flutters away when combat starts, dew sparkles catching the sunlight.

**Lighting & atmosphere:** warm low sun from the left, long soft shadows, light morning mist hugging the ground in the mid layer (fades by the end of the stage, a subtle sense of time passing).
**Ambient audio:** birdsong, distant cowbell, a rooster at stage start, wind in the grass.
**Music:** "Shadowdale Morning", a gentle pastoral chiptune theme (recorder/flute lead, plucked lute arpeggios). It shifts to a perkier percussion layer when combat starts.

#### Monster roster (Stage 1)
| Monster | Source CR / XP | Count | Game stats (tutorial "tabletop scale") | Behaviour & sprite |
|---|---|---|---|---|
| **Giant Rat** | CR 1/8 / 25 XP | 6 | ~7 HP, AC 12, bite 1d4 | 32×24 sprite, mangy brown fur, red beady eyes, pink tail. 4-frame scurry; squeaks; pops into a puff of fur and 1–3 copper coins. Spawns from the burrow mound in pairs. |
| **Goblin Minion** | CR 1/8 / 25 XP | 3 | ~7 HP, AC 12, dagger 1d4 | 32×32, green-grey skin, oversized dented helmet that wobbles, rusty dagger, sack over shoulder (stolen vegetables). Leaps over the stone wall to enter. Death: helmet spins off and clatters (helmet stays on the ground as decoration for a few seconds). |
| **"Snikkit" (named Goblin Minion)** | CR 1/8 / 50 XP (named ×2) | 1 | ~10 HP, AC 12 | Same base sprite but wearing a **pie tin as a helmet** and clutching a stolen **blueberry pie** from the Old Skull Inn. Runs in *last*, taunts ("Pie is MINE!"), and tries to flee (a gentle introduction to "kill it before it escapes" urgency, but it never succeeds in Stage 1). |

**Damage reality check (default kit):** Greatsword 2d6 + STR mod (+3) = avg 10 → most Stage 1 monsters die in **one hit**. Stage 1 is about satisfaction, not challenge. Every swing should feel powerful.

**Gold:** Giant Rat 1–3 cp, Goblin Minion 4–8 cp, Snikkit 25 cp + guaranteed drop.
**Drop:** **"Snikkit's Pie Tin"** (Helm, Common, +1 max HP, the hero's sprite now wears a pie tin). Funny, memorable and teaches that gear changes your look. Also unlocks the trinket **"Half-Eaten Blueberry Pie"** in the Trinket collection.

#### Stage 1 beat-by-beat script

> Format: **[Trigger]** → *Elminster line* → **UI / player action** → **Reward**

**Beat 0 — Cold open (0:00–0:20, skippable)**
- **[Game launch]** Pixel title card fades: *REALMSBOUND*. Camera pans down from the dawn sky across Old Skull to the meadow. The hero (generic Human Fighter sprite, hood up) walks in from the left along a dirt path. The butterfly flutters past.
- Elminster's sprite is sitting on the fence. He puffs a smoke ring, which drifts into the dialogue frame as it opens.
- *Elminster (pipe-puff):* "Ah. A sellsword. Thou'lt do."
- *Elminster (amused):* "Welcome to Shadowdale. Lovely, isn't it? Enjoy the view. It's about to be overrun by goblins."

**Beat 1 — First enemies & auto-battle (0:20–0:40)**
- **[Burrow mound rustles; 2 Giant Rats burst out]**
- *Elminster (unimpressed):* "Rats. Large ones. Thou needn't do a thing. Fighters fight. 'Tis rather the point of them."
- **UI:** spotlight on the hero → the hero auto-advances and swings. A **pixel d20 pops up showing the roll** (scripted: the first roll is always a 14 or higher to guarantee a hit; first-ever swing can't fumble).
- **Juice:** hit-stop (2 frames), rat bursts into fur, 2 copper coins arc out and auto-collect *for this first kill only*.
- *Elminster (conspiratorial):* "See that little die? Every swing is a roll. High is good. Twenty is *very* good. Remember that."

**Beat 2 — Command Strike (0:40–1:05)**
- **[2 more Giant Rats spawn]**
- *Elminster:* "Thou mayest lend a hand, too. Tap a beast to shout a command and strike harder. Go on, poke one."
- **UI:** spotlight on the nearest rat; gauntlet pointer after 6 s.
- **Player:** taps the rat → **Command Strike** (yellow shout bubble "HA!", small bonus damage).
- Tapping also sets the **focus target** (a little reticle).
- *Elminster (amused):* "Splendid. Thou hast discovered pointing. The bards will sing of it."

**Beat 3 — Coins (1:05–1:20)**
- **[Rats drop coins that now stay on the ground for 5 s, glinting]**
- *Elminster:* "Coins! Copper, but coins. Tap them before they wander off. Gold is how adventurers grow strong. Also how they buy ale."
- **Player:** taps coins (they fly to the purse counter with a satisfying "clink" that rises in pitch for consecutive pickups).
- **Purse reads:** "9 cp".

**Beat 4 — Quota bar (1:20–1:30)**
- **UI:** spotlight on the **quota bar** (top centre): "Old Skull Meadow ▓▓▓▓░░░░░░ 4/10".
- *Elminster:* "Clear ten foes and the way onward opens. That bar tracks it. Thou'rt nearly halfway. Don't get cocky."

**Beat 5 — Goblins enter (1:30–1:50)**
- **[3 Goblin Minions leap over the stone wall, one at a time, helmets wobbling]**
- *Elminster (alarmed):* "Goblins! The cause of all my recent paperwork. Thump them."
- Combat plays out automatically; the player usually taps along.
- **Scripted guaranteed moment:** on the 2nd goblin, the hero rolls a **natural 20**. Screen shake, "CRIT!" stamp, damage doubled, goblin launched off-screen with a "ding" star.
- *Elminster (proud):* "A natural twenty! The dice smile upon thee. Enjoy it. They are fickle things."

**Beat 6 — First Training purchase (1:50–2:10)**
- **[Purse ≥ 50 cp — the game guarantees this by now]**
- **UI:** the **Training** tab button pulses gold. Spotlight.
- *Elminster:* "Thou hast coin. Spend it! Visit the Training Yard and drill thy sword arm."
- **Player:** opens **Training** → spotlight on **Weapon Drills (Rank 0 → 1, cost 50 cp)** → taps **Buy**.
- **Juice:** the hero sprite does a quick practice swing; "+DAMAGE" floats up; Rank number pops.
- *Elminster:* "Every rank makes thee deadlier. There are a great many ranks. I'd start saving."
- The "Now" goal widget on the HUD now displays "Weapon Drills Rank 2 — 56 cp".

**Beat 7 — Snikkit (2:10–2:30)**
- **[Quota 9/10. Snikkit runs in wearing the pie tin, holding the pie]**
- Snikkit (goblin speech bubble): *"Pie is MINE! Fat wizard can't catch Snikkit!"*
- *Elminster (unimpressed):* "…That is Mistress Jhaele's blueberry pie. From the Old Skull Inn. **Fetch it back.**"
- Snikkit tries to run back to the right. Gauntlet pointer on Snikkit: "Tap to focus!" The player's Command Strikes slow him (scripted: he can't escape).
- Snikkit falls: the pie tin spins into the air and lands in the loot arc along with the pie.
- **Loot:** "Snikkit's Pie Tin" (Common Helm). Item card pops up.

**Beat 8 — First equip (2:30–2:45)**
- *Elminster (amused):* "A helmet. Of sorts. Wear it. Gear changes thee, outside and in."
- **UI:** spotlight on the green ↑ arrow on the item card → **Equip**.
- The hero's sprite now wears the pie tin. Elminster's portrait shifts to *pipe-puff* and lets out a single snort.

**Beat 9 — Stage clear & Level Up (2:45–3:05)**
- Quota 10/10 → **"STAGE CLEAR!"** banner unfurls (parchment ribbon). **+25 XP clear bonus** flies into the XP bar.
- XP bar fills → **LEVEL UP!** Pillar of golden light, chiptune fanfare, victory pose (with pie tin).
- **"New Power" card flips over: ACTION SURGE**. *"Once per rest, take an entire extra turn."* (To be used on Stage 2.)
- *Elminster (proud):* "Level Two! Thou art officially less useless. I've known kings who took longer."

**Beat 10 — Next Stage (3:05–3:15)**
- **UI:** spotlight on the **Next Stage ▶** arrow, now pulsing gold on the right edge.
- *Elminster:* "Onward. Farmer Hedrun's turnips won't save themselves. Well, they might. They're very hardy turnips."
- **Player:** taps ▶ → transition: the hero walks off-screen right, the background scrolls (a 1.5 s pixel wipe), Stage 2 loads.

**Beat 10b — Name prompt (on transition)**
- *Elminster:* "And what does one call thee, anyway? I can't keep saying 'sellsword'. Well, I could."
- Opens a **lightweight customiser** (name, hair, skin, face, voice bark). Full kit/background/feat choices come in Stage 2 or can be deferred ("Choose for me").

#### Stage 1 failure/edge-case handling
- **Player does nothing:** the hero still auto-fights; every required tutorial step escalates nudges; the stage still completes (idle-friendly from minute one).
- **Player spams taps:** extra Command Strikes are welcome; Elminster may say *"Enthusiastic. I like that. Mostly."*
- **Player skips dialogue:** each beat's essential instruction stays as a small banner at the top until done.

---

### 9.2 STAGE 2 — "Hedrun's Turnip Fields"
- **Backdrop:** mid-morning. Rolling fields of turnip rows (leafy green tops), a wooden farmhouse with a stone chimney, a broken cart spilling turnips, a frantic farmer (**Hedrun**) waving a pitchfork from his roof in the background. Crows scatter when monsters appear. Golden sunlight, no mist. A turnip with a goblin bite-mark rolls across the foreground occasionally.
- **Music:** "Shadowdale Morning" with an added bouncy bassline.
- **Monsters (12):** **Goblin Minion ×7** (sacks of stolen turnips; drop bonus "Turnip" junk item that sells for 1 cp, a joke), **Giant Fire Beetle ×5** (CR 0, glowing orange abdomen that lights the ground; slow and tanky-looking but weak; they drop the first **Material: Fire Beetle Gland**).
- **Teaches:**
  1. **Action Surge:** when a cluster of 4 goblins charges, time slows slightly. *Elminster: "A crowd! Use that Action Surge. The glowing button. Yes, that one."* → the hero does a blur of double attacks. *"Two turns for the price of one. Recharges after a rest. Or a boss. Or a minute and a half, I'm not fussy."*
  2. **More Training tracks:** Footwork (Round speed) and Scavenging unlock. *"Faster feet mean more swings. More swings mean more dead goblins. It's simple arithmetic."*
  3. **Coin auto-collect:** at Scavenging Rank 5 (cheap), coins fly to you automatically. *"There. No more grovelling for coppers."*
- **Optional full kit/background setup** appears here (default pre-selected).
- **End beat:** Hedrun on his roof: *"My turnips! Bless you, stranger!"* *Elminster: "He's very attached to those turnips."* Reward: **Hedrun's Gratitude**, 3 Potions of Healing (teased for Stage 3).

### 9.3 STAGE 3 — "The Ashaba Ford"
- **Backdrop:** late morning at a shallow stone ford across the **River Ashaba**. Animated water shimmer, stepping stones, reeds and cattails, dragonflies, an old mill wheel turning on the far bank, the Twisted Tower closer on the right skyline. Water splashes when sprites cross.
- **Monsters (15):** **Stirge ×8** (bat-mosquito horrors that flutter in a sine-wave pattern and **latch on** with Blood Drain, staying attached and draining HP each Round until killed), **Goblin Minion ×4**, **Giant Fire Beetle ×3**.
- **Teaches:**
  1. **Hero HP:** a Stirge latches on; the hero's HP bar pulses red. *Elminster (alarmed): "Stirges. Flying noses with a thirst. They'll drink thee dry if thou let'st them."*
  2. **Focus targeting:** tap the attached Stirge to prioritise it.
  3. **Second Wind:** HP dips below 50% (scripted) → Second Wind button glows. *"Catch thy Second Wind. Fighters are stubborn things. Thou hast two of these per rest."*
  4. **Potions:** the potion slot unlocks (3 potions from Hedrun). *"And when stubbornness fails, drink something red."*
  5. **(Stirges never down the hero here; HP floor at 1.)**
- **End beat → Hero Level 3 → Subclass card: CHAMPION.** The screen goes dark except for a single spotlighted d20 that spins and lands on **19**, glowing gold. *Elminster: "Thou art a Champion now. Thy blade finds weak spots more often. Nineteens count as twenties for thee. Don't let it go to thy head."*
  - *(Champion is the only Fighter subclass in the 2024 Basic Rules; future subclasses are a Phase 2+ feature. The card should show greyed "More paths await…" silhouettes as a tease.)*

### 9.4 STAGE 4 — "The Burned Waystation"
- **Backdrop:** midday on the **Old Dale Road**. A burned-out roadside waystation (charred timber frame, smoke curling up), an overturned merchant wagon with scattered crates, a toppled milestone reading "SHADOWDALE 2 / VOONLAR 30". Muted greens and ash greys contrast the cosy earlier stages: *the threat is getting real.* Embers drift in the foreground.
- **Music:** shifts to "Road Trouble", a minor-key variation with snare.
- **Monsters (18):** **Goblin Warrior ×8** (shields, leather armour, scimitars; **Nimble Escape**, occasionally hops backward out of reach), **Wolf ×6** (grey, lean; **Pack Tactics** glow when 2+ wolves; bite can knock the hero Prone, with a short stagger animation), **Goblin Minion ×4**.
- **Teaches:**
  1. **AC & misses:** Goblin Warriors have higher AC. The first few rolls show "MISS" with the d20 and AC compared side-by-side ("12 vs AC 15"). *Elminster: "Armour. Goblins with ambition. Thou'lt miss more. Train harder, or find better steel."*
  2. **Weapon Mastery (Graze):** on a miss, grey "GRAZE 3" damage appears. Spotlight on the mastery icon. *"But thy greatsword never truly misses, does it? Even a glancing blow stings. That is Weapon Mastery."*
  3. **Loot & equipping:** a Wolf drops **"Wolf-Pelt Cloak"** (Common, +HP); a Goblin Warrior drops a **Shield** (comparison UI shows it's worse for a two-hander, which teaches item comparison).
  4. **Buy ×10 toggle** unlocks in Training. *"Buying one rank at a time? How quaint. Try ten."*
- **End beat:** in the wreckage, a toll sign scrawled in goblin: "BRIJ TOL — BOSS SKRAG". *Elminster (unimpressed): "A goblin toll bridge. On MY river. Oh, I don't think so."*

### 9.5 STAGE 5 — BOSS: "Skrag's Toll Bridge"
- **Backdrop:** early afternoon. An old stone bridge over the Ashaba, crudely "fortified" by goblins: spiked barricades, a hand-painted sign "TOL: 1 PIE", a rickety watchtower on stilts with a goblin banner (a crude turnip with teeth). Stolen loot piles up on the bridge (pies, turnips, a confused chicken). The river rushes beneath. Afternoon sun and dramatic clouds rolling in.
- **Music:** "Boss: Petty Tyrant", a brassy chiptune with comedic bassoon stings that turns genuinely intense in the last 25% of boss HP.
- **Pre-boss wave:** **Goblin Warrior ×5** guarding the barricade.
- **Boss: SKRAG TURNIPTEETH** — Goblin Boss (CR 1, 200 XP). Fat goblin, crown made from a bent cooking pot, turnip-shaped teeth, scimitar plus a big toll-bell. Boss HP ×4 for drama (tutorial tuning).
  - **Boss intro card** (Darkest Dungeon/Hades-style splash): *"SKRAG TURNIPTEETH — Self-Crowned Lord of the Bridge."*
  - **Mechanic 1 — "Ring the Toll":** at 75% and 40% HP, he rings his bell and **summons 2 Goblin Minions**.
  - **Mechanic 2 — "Redirect Attack"** (from the Goblin Boss stat block): while minions are alive, he **swaps places** with a minion to dodge some of your hits ("Not me! HIM!"). Teaches: *kill the minions first*.
  - **Boss Timer:** 45 seconds (generous). Boss timers are explained here. If it runs out, Skrag laughs, heals to full and you retry. Tutorial safety: on the first failure, Elminster grants +50% damage ("Mystra's nudge") for the retry.
- **Teaches:**
  1. **Boss stages & timers.** *Elminster: "Every fifth stage, someone important-ish. Beat them before the sand runs out."*
  2. **Action Surge timing:** *"Save thy Surge for the opening. Bosses deserve thy best first impression."*
  3. **Chests:** a big **Boss Chest** drops, shakes, glows **green** and bursts open.
- **Rewards:**
  - +500 XP first-kill bonus → **HERO LEVEL 4** → **ASI / Feat choice** (big tarot cards: *Ability Score Improvement*, *Grappler*, plus Origin/Fighting Style feats where eligible; Elminster recommends "+2 Strength for a straightforward sort like thee"). Free respec during the tutorial.
  - **Second Wind ×3**, **4th Weapon Mastery** slot.
  - **Boss Chest:** guaranteed **Uncommon "+1 Flail of the Toll"** *or* **Iron Helm**, plus **"Skrag's Lucky Toll Coin"** trinket (+5% gold), plus 5 gp.
  - **Unlocks:** **Blacksmith (Forge)** & **Auto-Advance toggle**.
  - The chicken is freed and follows the hero for the next stage (a cosmetic gag; later a collectible pet: "Sir Clucksworth").
- *Elminster (proud): "A toll bridge. Honestly. Well struck, Champion. Thou'rt becoming expensive to replace."*

### 9.6 STAGE 6 — "Edge of Cormanthor"
- **Backdrop:** mid-afternoon at the edge of the vast elven forest of **Cormanthor**. Towering ancient trees with silver-grey bark, shafts of god-rays through the canopy, ferns and mushrooms, ruined elven arches overgrown with ivy (a hint of deep history), fireflies starting to appear as the light dims. Deep greens and teal shadows.
- **Music:** "Under Elder Boughs", mysterious harp arpeggios and woodwind.
- **Monsters (15):** **Wolf ×6**, **Giant Wolf Spider ×4** (drop from the canopy on silk lines, a new entrance type), **Goblin Minion ×5** (now fleeing *into* the forest; they seem frightened of something).
- **Teaches:**
  1. **Auto-Advance & idle play.** *Elminster: "Thou needn't hold my hand, nor I thine. Toggle Auto-Advance and the road takes care of itself. I'm going to have a nap."* (His sprite falls asleep on a log with "Zzz" bubbles for the rest of the stage, a charming way of signalling "this plays itself".)
  2. **Ranged opener (Javelins):** the hero throws javelins at monsters as they approach (Slow mastery). *"Throw something pointy before they arrive. It's only polite."*
  3. **Materials:** Wolf Pelts and Spider Silk drop. The **Materials pouch** opens; the Blacksmith shows they'll be used for upgrades.
  4. **First Forge upgrade:** greatsword Forge Level 0 → 1 (cheap), showing the blade sheen visual.

### 9.7 STAGE 7 — "Silkshadow Hollow"
- **Backdrop:** dusk in a sunken forest hollow choked with spider webs that glisten with dew. Web-wrapped cocoons hang from branches (one wiggles: a rescuable goblin? a deer?), bioluminescent fungi glow blue-green, and the moon rises through a gap in the canopy. Purple and teal palette.
- **Music:** "Silkshadow", tense plucked strings and creaky ambience.
- **Monsters (15):** **Giant Wolf Spider ×5** (Poison bite), **Giant Centipede ×5** (Poison bite, burrowing entrance from the ground), **Stirge ×5**.
- **Teaches:**
  1. **Conditions:** the hero gets **Poisoned** (green bubbles and a status icon). Attacks show **two d20s with the lower glowing red** (disadvantage). *Elminster: "Poisoned. Thou'lt swing like a drunkard until it wears off. Rather like most adventurers on a Tenday."*
  2. **Skill Events:** mid-stage, the combat pauses and a **web-wrapped chest** appears. A **Skill Event card**: *"Tear free the chest (Athletics) or cut it carefully (Sleight of Hand)?"* A big d20 rolls with modifiers shown. Success → bonus loot (guaranteed Uncommon **Boots** this first time). *"Not every problem is solved with a sword. Most, but not every."*
  3. **Tactical Mind:** if the check fails, offer: *"Spend a Second Wind to add 1d10?"* → a second die rolls and adds.
- **Rescue gag:** cutting a cocoon frees **a very grateful goblin minion named Pib** who flees, shouting "Big Mean One in caves! Pays shinies!". This is the first story clue.

### 9.8 STAGE 8 — "Mouth of the Warrens"
- **Backdrop:** night at the base of a rocky hillside near Old Skull. A crude goblin cave entrance framed with tusks and a skull totem, flickering torches, a crooked palisade, a watch-fire with a roasting pot (stolen turnips again). Moonlight blue rim-lighting, warm orange torchlight. Wargs' eyes glint in the darkness before they appear.
- **Music:** "War Drums in the Dark", goblin drum rhythms layered under the main theme.
- **Monsters (18):** **Goblin Warrior ×8**, **Goblin Minion ×6**, **Worg ×2** (big, evil wolves; first **Elite** appears here), **Wolf ×2**.
- **Teaches:**
  1. **Elites & affixes:** a Worg arrives with a glowing red outline: **"Elite — Frenzied"** (faster Round Clock). The tooltip explains affixes. Elites drop extra loot. *Elminster: "That one glows. Glowing things are either valuable or dangerous. Usually both."*
  2. **Gambits (first slot unlocked):** Elminster: *"Thou art going to be busy. Teach thyself some habits. If this, then that. Even a fighter can manage that."* Guided creation of the first gambit: **IF HP < 40% → Second Wind**. Then a test: the hero gets low and automatically uses Second Wind, with a "GAMBIT!" flash.
- **End beat:** an arrow thunks into the palisade next to the hero with a message: "TURN BACK. — G." *Elminster (conspiratorial): "Goblins don't write. Something else is down there."*

### 9.9 STAGE 9 — "The Deep Warrens"
- **Backdrop:** inside the goblin warrens. Rough-hewn tunnels with dripping stalactites, crude wooden supports, piles of stolen goods (pies, turnips, wagon wheels, a farmer's portrait), glowing mushrooms, an underground stream. The **hero's torch light radius** is a visible effect (the edges of the screen are dark; monsters emerge from the darkness). Occasional rumble with dust falling.
- **Music:** "Below Old Skull", echoing low drones, drips, sparse percussion.
- **Monsters (20):** **Goblin Warrior ×8**, **Swarm of Rats ×4** (a squeaking carpet; hits several times per Round for chip damage, weak to Cleave/sweeping attacks), **Goblin Minion ×6**, **Worg ×2**.
- **Teaches:**
  1. **Offline progress:** a "What happens when I leave?" explainer. *Elminster: "Should thou step away, rest assured, thy hero keeps working. I'll write thee a letter of what happened. I write excellent letters."* Shows a sample **"While You Were Away"** parchment.
  2. **Bestiary:** after killing the 25th goblin overall, the **Bestiary** unlocks: Goblin page reaches **Tier I** ("+2% damage vs Goblinoids"), with lore written in Elminster's margin-note voice.
  3. **Heroic Inspiration:** a glowing d20 token is granted (with a Human "Resourceful" tooltip). *"Thy human stubbornness, made manifest. Use it to reroll fate. Once."* It's suggested for the boss.
- **Skill Event:** a **tripwire trap** (Perception check) → success: disarm and gain bonus gold; fail: a falling net (light damage, comedic).

### 9.10 STAGE 10 — BOSS FINALE: "Grimjaw's Den"
- **Backdrop:** a large cavern hall in the heart of the warrens. A crude throne built from a wagon and stolen furniture, a mound of glittering loot, braziers of green flame, goblin graffiti depicting a giant hairy figure smashing tiny "longlegs" (humans). A chasm at the back with a rope bridge. Shafts of moonlight fall through a crack in the ceiling directly onto the battlefield.
- **Music:** "Boss: The Ear-Taker", a full boss theme with heavy drums, low brass and frantic goblin chants, and a heroic key change when the hero levels up mid-fight (see below).
- **Pre-boss wave (6):** **Worg ×2**, **Goblin Warrior ×4**.
- **Boss: GRIMJAW THE EAR-TAKER** — Bugbear Warrior (CR 1, 200 XP). Huge, hairy and hunched, with a necklace of… souvenir ears, a spiked light hammer, and very long arms. Boss HP ×5 (tutorial finale tuning), 60-second timer.
  - **Boss intro card:** *"GRIMJAW THE EAR-TAKER — He Is Paid in Silver, and Ears."*
  - **Mechanic 1 — "Long-limbed Grab"** (Bugbear Grab): grapples the hero (Round Clock slowed by 40%). Command Strikes (tapping fast) help break free, a short active moment for engaged players; idle players break free automatically after 3 s.
  - **Mechanic 2 — "Abduct":** while grappling, he drags the hero toward the chasm. Breaking free in time earns a **"Not Today" bonus chest**.
  - **Mechanic 3 — "Call the Pack":** at 50% HP, he howls; 1 Worg joins.
  - **Phase 2 at 30%:** enraged (red tint, faster Round Clock). Elminster finally steps in for a single dramatic moment:
- **The Elminster moment:** at 30%, Grimjaw swings a killing blow. Time freezes. Elminster appears in a burst of silver-blue light, blocks it with an arcane shield, and says: *"Ahem. I said I'd guide thee. I didn't say I'd watch thee die. **Finish him.**"* The hero gets the **"Chosen's Favour"** buff (+100% damage for 15 s, with a sparkling silver aura).
- **Victory & level-up:** the final blow triggers a **slow-motion crit** (scripted natural 20), Grimjaw topples, the XP bar fills → **HERO LEVEL 5 → EXTRA ATTACK**. The New Power card: *"You now attack twice whenever you take the Attack action."* The music key-changes heroically, and the hero immediately does a double-swing victory flourish.
- *Elminster (proud): "Two swings per turn. Now thou art a proper adventurer. The kind that gets ballads. And bills."*

#### Finale story beat (the hook)
Among Grimjaw's loot pile, the camera zooms in on **a black iron coin stamped with a winged serpent**.
- *Elminster (alarmed, then grim):* "The Zhentarim. The Black Network. They paid a bugbear to stir up goblins on my doorstep." *(pipe-puff)* "Someone wants Shadowdale weak. How tedious. How very… *them*."
- *Elminster (conspiratorial):* "Thou'lt need to be much stronger. Fortunately, the Realms are full of things to hit. Off thou goest."

#### Finale rewards
- **"Choose 1 of 3" Uncommon reward** (big card-pick moment): **+1 Greatsword**, **Cloak of Protection**, or **Gauntlets of Ogre Power**.
- **Grimjaw's Hoard:** 15 gp, Materials bundle, 3 Potions of Healing, 1 Heroic Inspiration.
- **Title unlocked:** *"Saviour of Shadowdale (Mostly)"*.
- **Trophy:** *Grimjaw's Ear Necklace* (Town decoration… or tactfully, his hammer).
- **Unlocks:** **Freeplay** (World Map: The Dalelands Region), **Shadowdale Town Hub**, **2× Game Speed**, **Loot Filter**, **Daily Bounty Board**.

#### Tutorial-complete summary screen ("Your Legend So Far")
A parchment page styled like a D&D character sheet, showing: portrait, level, title, total damage dealt, highest crit, monsters slain by type, gold earned, natural 20s rolled, natural 1s rolled (with a joke), and time played. Shareable screenshot.

---

## 10. Freeplay Beyond the Tutorial (Stages 11–100+)

### 10.1 Structure
- **Regions of 25 Stages**, each with a biome, a monster family and a **Region Boss** at the 25th Stage. Bosses every 5 Stages.
- From Stage 11, the **Multiplier Shell** takes over: monster HP scales ~×1.14–1.18 per stage, gold scales slightly faster than costs early (snowball) and slower later (walls that push Prestige).
- **Farm Mode:** toggle to stay on the current stage for gear/material farming.

### 10.2 First four Regions (Basic Rules monsters)
| Region | Stages | Biome / backdrops | Monster families | Region Boss |
|---|---|---|---|---|
| **The Dalelands** | 11–25 | Farmland, Cormanthor fringe, old battlefields | Goblinoids (Hobgoblin Warrior, Goblin Boss), Wolves/Worgs, Bandits, Kobold Warriors, Gnoll Warriors | **Hobgoblin Captain** with a Zhentarim mercenary banner *(Stage 25)* |
| **Cormanthor Deepwood** | 26–50 | Ancient elven ruins, haunted groves | Giant Spiders, Ettercaps, Dryads (charm), Awakened Trees, Owlbears, Will-o'-Wisps | **Owlbear Matriarch** (Stage 40 mini) → **Green Hag** (Stage 50) |
| **The Moonsea Ruins** | 51–75 | Ruined keeps, crypts, Zhentarim forts | Skeletons, Zombies, Ghouls, Ghasts, Cultists & Cultist Fanatics, Animated Armor, Bandit Captains | **Wight Lord** → **Young Green Dragon** (Stage 75), a huge pixel spectacle |
| **The Underdark Approach** | 76–100 | Fungus caverns, glowing lakes | Grimlocks, Darkmantles, Gray/Ochre Oozes, Nothics, Carrion Crawlers, Gelatinous Cube | **Gelatinous Cube** (Stage 90, with items floating inside it to "rescue") → **Hydra** (Stage 100: heads regrow unless you hit hard enough in one turn) |

Beyond 100: Planar Regions (Elemental Planes, Nine Hells devils, Abyss demons), escalating to **Ancient Dragons, Liches, Vampires, the Tarrasque** as legendary milestones.

### 10.3 Freeplay variety features
- **Biome modifiers:** e.g. *Fog* (−hit chance, +gold), *Blood Moon* (+monster damage, +XP).
- **Wandering events** every few stages: a lost merchant (shop), a shrine (blessing buff), a mimic chest (fight it!), a lone Skill Event.
- **"Gilded" rare spawns** and **Elite packs.**

---

## 11. Prestige: "Retell the Legend"

**Unlocks:** after reaching Stage 50 for the first time (Elminster introduces it).

**Fiction:** the hero returns to the Old Skull Inn, where a bard retells their exploits, each time grander. *"The legend grows in the telling, and so dost thou."* Elminster: *"Start again? Nonsense. Thou'rt starting again, but **better**."*

**Resets:** Stage progress, Training Ranks, gold, part of Forge Levels.
**Keeps:** Hero Level, XP, feats, gear (items & enchantments), Bestiary, cosmetics, titles, trophies, gambits.
**Earns:** **Renown**, based on the highest Stage reached plus boss first kills this run.

### Hall of Legends (Renown spend)
- **Global multipliers:** +damage, +gold, +XP (stacking, infinite).
- **Quality of life:** start each run at Stage X ("The bard skips the boring bits"), faster auto-advance, higher offline cap, 3×/4× speed.
- **Feature unlocks:** extra Gambit slots, extra loadouts, extra Trinket slot, companions (Phase 4).
- **Creator unlocks:** new backgrounds, species, classes (Phase 3) can be earned through Renown milestones and Campaign completions.

**Second layer (later):** *"Ascend through the Planes"*, a deeper reset trading Renown for **Mythic** power (Phase 5).

---

## 12. Meta Systems

### 12.1 The Bestiary ("Elminster's Annotated Monster Manual")
- Every monster has a page that fills in with kills: silhouette → sprite → lore → weaknesses.
- **Tiers by kill count:** I (25), II (250), III (2,500), IV (25,000)… each giving +% damage vs that creature type.
- Lore is written as Elminster's witty margin notes: *"Goblins: cowardly, greedy, inventive. Rather like the Waterdhavian nobility."*
- Completion rewards: titles, cosmetic banners, Renown.

### 12.2 Trinkets
- Uses the 2024 Basic Rules concept of character **Trinkets**: small odd items (e.g. a half-eaten blueberry pie, a goblin's lucky toll coin, a glass eye, a tiny music box).
- Equippable in a **Trinket slot** for a small quirky bonus; the collection book rewards completion.

### 12.3 Bounty Board (Old Skull Inn)
- **Daily/weekly bounties:** "Slay 300 Wolves", "Win a boss fight without Second Wind", "Roll 10 natural 20s".
- Rewards: Arcane Dust, Materials, Inspiration, cosmetic tokens. Optional; never mandatory.

### 12.4 Skill Events
- Random out-of-combat moments (chests, traps, NPCs, ruins, shrines) resolved with an **auto-rolled d20 skill check**, visible and quick (~2 seconds).
- They use the 18 D&D skills (Athletics, Perception, Sleight of Hand, Arcana, Persuasion…). The hero's proficiencies, background and ability scores matter, which gives non-combat build choices real value.
- Idle-friendly: events auto-resolve if the player is away; active players can choose *which* skill to attempt for better odds.

### 12.5 Shadowdale Town Hub (unlocked after the tutorial)
A small, charming pixel town that **grows visibly** as you progress:
- **The Old Skull Inn:** Bounty Board, Prestige ("Retell the Legend"), cosmetic shop (Mistress Jhaele, who forgives you about the pie).
- **The Smithy:** Forge, Dice Ladder, Salvage.
- **Elminster's Tower:** feat respecs, Gambit cards, Epic Boons later, and his quips.
- **Training Yard:** Training Ranks with practice dummies (your hero visibly trains here).
- **Trophy Hall:** displays boss trophies as decorations.
- **Town upgrades** (gold sinks with permanent small bonuses), e.g. upgrading the smithy improves Forge success.

---

## 13. Pixel Art & "Juice" Direction

### 13.1 Style targets
- **Base resolution:** 480×270 (integer-scaled to 1080p ×4 and 4K ×8). Crisp, no blurry scaling.
- **Sprite sizes:** hero 48×48 (lots of gear-layer detail), common monsters 32×32, large monsters 48–64, bosses 64–128, dragons 160+.
- **Palette:** rich but controlled (per-region sub-palettes of ~32 colours), warm cosy Dalelands → eerie Underdark → vivid Planes.
- **"AAA pixel" touches:** dynamic 2D lighting (torches, spells, dawn sun), normal-mapped sprites for subtle shading, particle effects, weather (rain, snow, falling leaves), day/night progression inside stages.
- **Animation:** hero idle 8 frames, attack 6–10 frames per weapon type (greatsword arc ≠ dual-blade flurry ≠ bow draw), hit/death animations for every monster, with unique deaths for bosses.
- **UI style:** parchment, leather and brass "character sheet" aesthetic, with pixel fonts (one readable body font, one decorative heading font), clear number formatting.

### 13.2 Juice checklist (feel is everything in idle games)
- Hit-stop (1–3 frames) on hits, longer on crits.
- Screen shake scaled to impact (crits, boss slams), with an accessibility toggle.
- Damage numbers: white (normal), gold (crit), grey (graze), green (heal), purple (magic), red (damage taken).
- Pixel d20 popups that tumble, with rare "golden dice" cosmetics.
- Coin fountains with rising-pitch pickup sounds.
- Loot beams coloured by rarity.
- Level-up light pillars, rank-milestone "×2!" stamps, quota bar sparkle at 100%.
- Monster death variety: puff, splat, ragdoll launch on crit, "ding" star launch on overkill.
- Elminster's pipe smoke rings drifting across the UI on special moments.

### 13.3 Audio
- Chiptune-meets-orchestral soundtrack (modern "pixel" games like *Sea of Stars* as a quality reference): pastoral Dalelands themes, tense dungeon themes, big boss themes.
- Distinct SFX per weapon type and per natural 20 / natural 1.

---

## 14. Pacing Targets & Fun Checklist

### 14.1 First-session milestones
| Time | Player should have… |
|---|---|
| **0:30** | Killed their first monster and seen a d20 |
| **1:00** | Rolled a natural 20 (guaranteed) and tapped a Command Strike |
| **2:00** | Made their first Training purchase |
| **3:00** | **Levelled up** (Action Surge) and equipped their first item (pie tin!) |
| **8:00** | Become a **Champion** (Level 3) |
| **15:00** | Beaten their **first boss** and made their **first feat/ASI choice** |
| **20:00** | Turned on Auto-Advance and seen the game play itself |
| **30:00** | Reached **Level 5 / Extra Attack**, beaten Grimjaw, discovered the Zhentarim hook, unlocked Freeplay & Town |
| **Day 1** | Reached Stage ~30–40, Level 6–7, first Rare items, 2–3 Gambits |
| **Day 3–5** | First **Prestige** at Stage 50+ |
| **Week 2+** | Level 11 (Two Extra Attacks), Region 3–4, Epic Boon on the horizon |

### 14.2 The Fun Checklist (apply to every new feature)
- [ ] **Is it visible?** Can the player *see* it working on the battlefield?
- [ ] **Is it understandable in one sentence?**
- [ ] **Does it create a choice** (build, timing, priority), or just a number?
- [ ] **Does it have a "moment"** (a sound, a flash, a quip)?
- [ ] **Does it respect idle players?** (No mandatory active play for core progress.)
- [ ] **Does it reward active players?** (Optional bonus for engagement.)
- [ ] **Does it feel like D&D?** Would a tabletop player smile in recognition?

### 14.3 Anti-frustration rules
- No permanent losses from dying, ever.
- Inventory never "fills up" without a solution (auto-salvage, Bag of Holding upgrades).
- Walls should be clearly explained with **suggested actions** ("Try: upgrade Forge, change Mastery to Cleave for wave stages, or Retell the Legend for +38% power").
- Natural 1s are funny, never punishing.

---

## 15. Campaign Mode (later phase: outline only)

Campaigns are **hand-crafted, less idle, more involved** adventures. Think "a D&D module as a game".

- **Structure:** chapters with story nodes, set-piece battles, choices, Skill Event chains, puzzles and unique bosses.
- **More involved combat:** slower, tactical fights where you choose actions each turn (or use smarter gambits), with limited resources (rests matter again).
- **Rewards:** unique legendary items, cosmetic sets, creator unlocks (species/classes), Renown boosts. Campaign rewards should power up Freeplay and vice versa.
- **First campaign concept:** *"The Black Network"*, following the Zhentarim coin from the tutorial: from Shadowdale to Voonlar to Zhentil Keep, featuring Elminster and (licensing permitting) Storm Silverhand.
- Campaigns might have modifiers ("no potions", "Elminster is missing") and difficulty tiers for replay.

---

## 16. Phased Roadmap (gameplay scope only)

| Phase | Scope | Goal |
|---|---|---|
| **1 — Vertical Slice** | Tutorial Stages 1–10 (fully polished), Human Fighter (Champion), Quick Hero customiser, core battle system, Training, basic gear/loot, Forge, 1 Gambit slot, Elminster narration | Prove that the core loop is fun in the first 30 minutes |
| **2 — Core Freeplay** | Stages 11–100 (4 Regions), Hero Levels 1–20, all Fighter features, feats, Dice Ladder, enchanting, Bestiary, Skill Events, Town Hub, Bounty Board, Prestige + Hall of Legends, offline progress | Prove that retention works over days to weeks |
| **3 — Full Character Creator** | All 2024 Basic Rules species & backgrounds; classes added in waves (e.g. Rogue, Wizard, Cleric, Barbarian first); multiple hero slots | Customisation depth & replayability |
| **4 — Campaign Mode & Companions** | First campaign "The Black Network"; hireable companions/party formation | Involved play mode; broaden the audience |
| **5 — Live Ops & Epic** | Epic Levels & Boons, planar Regions, seasonal events, second prestige layer, multiclassing | Long-term engagement |

---

## 17. Risks, Licensing Notes & Open Questions

### 17.1 Licensing (important to flag early)
- The 2024 Basic Rules content is based on **SRD 5.2**, released under **Creative Commons (CC-BY-4.0)**, which covers most mechanics (classes, feats, Weapon Mastery, many monsters and magic items) with attribution.
- **Elminster, Shadowdale, the Forgotten Realms, the Zhentarim, and certain iconic monsters (e.g. Beholders, Mind Flayers)** are **Wizards of the Coast product identity / IP** and are *not* in the SRD. Using them commercially requires a **licence from Wizards of the Coast** (as Idle Champions has).
- **Fallback plan:** design every story element with an original-IP "swap" ready (e.g. an original archmage mentor and an original valley), so the game is viable either way.

### 17.2 Design risks
| Risk | Mitigation |
|---|---|
| D&D bounded accuracy vs idle exponential growth feel at odds | The "Dice Core, Multiplier Shell" split: accuracy stays bounded, damage/HP scale |
| One hero = less variety than a roster | Deep builds, loadouts, gambits, gear visuals; companions in Phase 4 |
| Tutorial feels too long for idle veterans | Skip option; Elminster shortens lines for fast players; everything is tap-through |
| Gambits too complex for casual players | Pre-made "Smart Default" gambits; the first one is guided |
| Number inflation becomes meaningless | Milestone visuals (dice ladder, gear glow tiers), the D&D Hero Level as a stable "true" power marker |

### 17.3 Open questions for you
1. **Platform priority:** PC (Steam) first, mobile first, or both? (This affects tap vs click UX and session-length targets.)
2. **Monetisation stance:** premium (buy once), free-to-play cosmetic-only, or undecided? (This plan assumes no pay-to-win.)
3. **Licensing path:** pursue an official WotC licence, or build with an original-IP mentor/setting and keep Elminster as the "dream" version?
4. **Tone:** is the light comedic tone (pie tins, turnips, Elminster's sarcasm) right, or should it lean more epic/serious?
5. **Companions:** should hired companions come before or after Campaign mode?
6. **Second class for the creator:** which class should follow Fighter? (Suggested: Rogue, for a very different crit/advantage engine.)

---

*End of Design Plan v0.1. Next recommended step: a "Tutorial Paper Prototype" pass, reading through the Stage 1–10 scripts aloud and timing them, before any code is written.*
