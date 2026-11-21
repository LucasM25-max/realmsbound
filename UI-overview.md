Here is the complete **UI, Upgrades & Progression Systems Specification** for *Realmsbound* up to **Stage 1,000**, aligned seamlessly with your stretched 25-stage Tutorial, slower `11–1,000` economy, Elminster’s disappearance, Regional Bastions, and full future hooks for **2024 Character Respecs**, **New Character Creation (Guild Roster)**, and **Set-Length Campaigns** (*Ravenloft: The Horrors Within*, *Arcana Unleashed: Deadfall*, etc.).

---

# Part 1: Master Unlock Timeline (Stages 1 → 1,000)

To keep the game effortless to learn despite deep D&D mechanics, systems unlock via **Progressive Disclosure**—never showing a button until you are ready to use it.

| Unlock Point | Feature / Screen Unlocked | Hero Lv (Typical) | Prestige Cycle |
|---|---|---|---|
| **Stage 1** | **Battlefield Screen**, Visible d20s, Command Strikes, **Training Tab** (*Weapon Drills* `10 cp`), **Gear Equip**, **Name & Look Customiser** | Lv 1 | Run 1 |
| **Stage 2–4** | *Armour Drills, Scavenging* (auto-collect at Rank 5), **Hero Tab** (Full Kit/Background), **Action Surge** (`Lv 2` at Stg 3), **Second Wind & Potions** (`Conditioning` at Stg 4) | Lv 1 → 2 | Run 1 |
| **Stage 5–10** | **Materials Pouch**, **Buy `×10/×25/Max`**, *Tactics* Training (`Stg 5`), **Champion Subclass `19–20` Crit** (`Lv 3` at Stg 8), **Blacksmith Forge**, **Auto-Advance** (`Stg 10`) | Lv 2 → 3 | Run 1 |
| **Stage 12–19** | **Skill Events & Tactical Mind** (`Stg 12`), **Conditions** (`Stg 13`), **ASI/Feat Cards & Salvage/Arcane Dust & Heroic Inspiration** (`Lv 4` at Stg 15), **Elites** (`Stg 16`), **Gambits Slot 1** (`Stg 17`), **Bestiary & Offline Letters** (`Stg 19`) | Lv 3 → 4 | Run 1 |
| **Stage 20–25** | **2× Speed & Dice Ladder Preview** (`Stg 20`), **Auto-Salvage Filter**, **Hero Lv 5: Extra Attack**, **Freeplay World Map**, **Shadowdale Town Hub**, **Daily Bounty Board**, **War Table Teaser** *(Elminster vanishes!)* | Lv 4 → 5 | Run 1 |
| **Stage 26–45** | **8 Faerûn Faction Boards** (`Stg 26`), **Saved Loadouts (`3` slots)** (`Stg 40`), **Weapon Enchanting `+1`** (needed for Werewolves at `Stg 36–40`) | Lv 5 | Run 1 |
| **Stage 50** | **PRESTIGE ("Retell the Legend") & Hall of Legends** + **Mirror of Rebuilding (Basic Respec)** | Lv 5 → 6 | **Prestige #1** |
| **Stage 65–100** | **First Regional Bastion: Freedale** (`Stg 65`), **Guild Roster Slot #2** (`Stg 100` — create/switch a 2nd hero!), **Campaign War Table Opens** (`Stg 100` — *The Black Network* intro), **Realms Mastery Training Sub-tab** (`Stg 100`), **3× Game Speed** *(Hall of Legends)* | Lv 6 → 7 | Prestiges #2–3 |
| **Stage 101–200** | **Urban Crew Bribes/Allies** (`Stg 125`), **Black Coach Events** (`Stg 150`), **Upper City Manor Bastion** (`Stg 165`), **Enchanting `+2`** (`Stg 150+`), **Two Extra Attacks (`3` swings/Action)** (`Lv 11` later, or *Indomitable* at `Lv 9`), **Full Class/Species Respec Tier 1** *(via Hall of Legends / Prestige Milestone)* | Lv 7 → 8 | Prestiges #4–6 |
| **Stage 201–300** | **Wandering Isle Bastion** (`Stg 238`), **Fairy Trod Stage-Skips**, **Trinket Slot #2 & Loadout #3**, **Advanced Chained Gambits** (`Stg 250`), **Windskiff Travel** (`Stg 300`), **Campaign Slot: *Ravenloft: The Horrors Within*** *(unlocked once Roster ≥ 2 heroes!)* | Lv 8 → 10 | Prestiges #7–10 |
| **Stage 301–400** | **The Terror Bastion** (`Stg 335`), **Aurora's Survival Gear Shop** (`Stg 301+`), **Enchanting `+3`**, **4× Game Speed** *(Hall of Legends)*, **Two Extra Attacks (`Lv 11`)**, **Chardalyn-Forged Weapons** (`Stg 400`) | Lv 10 → 11 | Prestiges #11–14 |
| **Stage 401–500** | **Dallabad Oasis Bastion** (`Stg 425`), **Mechanical Wonder Companion Slot** (`Stg 430`), **Genie Court Elemental Pacts** (`Stg 475`), **Mythic Runes (`+4/+5` Enchanting)** & **Multiclassing / Prestige Classes** (`Stg 500`), **Campaign Slot: *Arcana Unleashed: Deadfall*** *(Lv 11+ campaign!)* | Lv 11 → 13 | Prestiges #15–19 |
| **Stage 501–800** | **High-Magic Bastions** (*Ilighôn Grove, Shade Spire, Skuld Vault*), **Thayan Spell Tattoos** (passive auto-cast slots via Red Wizard Renown), **Superior Critical `18–20`** (`Lv 15`), **Evolving Magic Items** | Lv 14 → 18 | Prestiges #20–28 |
| **Stage 801–1,000** | **First Epic Boon (`Lv 19`)**, **Three Extra Attacks (`4` swings/Action — `Lv 20`)**, **Epic Constellation (`Epic Lv 1–10+`, stat cap `→ 30`)**, **Artifact Slot**, **2nd Prestige Layer Teaser (*"Ascend Beyond Toril"*)** at **Stage 1,000** | Lv 19 → 20+ | Prestiges #29–35 |

---

# Part 2: Every Screen & Sub-Screen (Detailed UX & Layout)

To ensure a player never feels buried in menus, the game uses **one persistent frame** with **6 Clean Bottom Tabs** (plus a **War Table / World Overlay**).

## 1. The Battlefield Screen (Home — Stage 1)
* **Top Status Strip:**
  * *Left:* Region Badge + Stage Name + **Hazard Icons** (hover/tap for 1-line summary: *"Extreme Cold: −15% Round Speed — Counter with Warm Clothing"*).
  * *Centre:* **Kill Quota Bar** (`18/25`), Boss Skull Countdown (`Boss in 2 stages`), and **Push / Farm Mode Toggle**.
  * *Right:* **Auto-Advance** (`Stg 10`), **Speed Toggle (`1× / 2× / 3× / 4×`)**, and **Settings / Skip**.
* **The "3-Goal" Ribbon (Directly under Top Strip):**
  * **NOW:** Pulsing button showing the cheapest optimal Training/Forge buy (*"Weapon Drills Rank 42 — 4.2 gp"*). Clicking buys it without leaving combat!
  * **SOON:** XP Progress Bar toward next Hero Level, displaying the upcoming feature icon (*"Lv 11: Two Extra Attacks"*).
  * **HORIZON:** Next major milestone (*"Stage 300: Queen Forfallen"* or *"Prestige Ready: +14 Renown"*).
* **Centre Arena (`480×270` Pixel Viewport):**
  * **Left Side:** Your active Hero sprite (live paper-doll gear + Forge aura), **Mechanical Wonder / Pet** (`Stg 430+`), HP bar (with *Bloodied* cracks `<50%`), circular **Round Clock**, and Condition icons.
  * **Right Side:** Approaching monster waves, **Elites** (coloured outlines), **Gilded Spawns** (golden sparkle), and **Boss Timer Bar**.
  * **Floating Popups:** Tumbling pixel **d20s** (2 dice for Advantage/Disadvantage), colour-coded damage numbers (`White, Gold Crit, Grey Graze, Green Heal, Purple Magic, Red Taken`), **Wandering Event Banners** (*Black Coach, Lost Merchant, Shrine, Mimic*), and **Skill Event Pause Cards**.
* **Bottom Action Tray:**
  * **Class & Ability Bar:** Up to 5 crisp hotkeys—*Second Wind*, *Action Surge*, *Healing Potion*, *Heroic Inspiration Reroll*, and a **Modular Class Mechanic Slot** (for Fighter: *Tactical Master* mastery swap at Lv 9; swaps automatically if you respec to *Barbarian Rage*, *Rogue Sneak Combo*, *Wizard Spellbook Cycle*, etc.).
  * **Purse & Navigation:** Live `cp / sp / gp / pp` ticker + the 6 Main Tabs below.

---

## 2. Training Yard Tab (Stage 1 — *Resets on Prestige*)
Simple vertical rows with **Buy `×1 / ×10 / ×25 / Next Milestone (×2)`** toggles at the top.

### Sub-Tab A: Martial Drills (`Stages 1–1,000`)
| Track | Base Cost | Growth | Effect per Rank | Milestone `×2` & Special Unlocks |
|---|---|---|---|---|
| **Weapon Drills** | `10 cp` | `×1.13` | `+Weapon Damage Multiplier` | `×2` Damage at Ranks `10, 25, 50, 100, 150, 200, 300…` |
| **Armour Drills** | `15 cp` | `×1.13` | `+Max HP & Flat Damage Reduction` | `×2` HP at same milestones |
| **Scavenging** | `20 cp` | `×1.14` | `+Gold Find %` | **Rank 5:** Auto-Collect Coins; **Rank 50/150/300:** `+Material & Chest Drop %` |
| **Footwork** | `25 cp` | `×1.15` | `−Round Clock Time` (down to `0.6s` floor) | **Milestones:** Extra *Command Strike* hits per tap & *Auto-Command clicks/sec* |
| **Conditioning** | `50 cp` | `×1.14` | `+Between-Wave HP Regen & Potion Heal %` | **Milestones:** `+1 Potion Capacity` & faster Short Rest cooldown (`90s → 60s`) |
| **Tactics** | `1 sp` | `×1.16` | `+Command Strike % & +Crit Damage %` | **Ranks 250 & 500:** **`+1` Critical Hit Range** (massive endgame spikes!) |

### Sub-Tab B: Realms Mastery (`Unlocks Stage 100 & Stage 500`)
Late-game gold sinks so excess platinum keeps scaling your run before Prestige walls:
* **Guild Logistics (`Stg 100`):** Boosts passive **Bastion** output for the current run.
* **Lair Breaker (`Stg 100`):** Reduces Boss **Legendary Resistance** charges & increases **Boss Timer (`+5s/+10s`)**.
* **Survival Conditioning (`Stg 200`):** Gold-bought resistance against regional hazards (*Rusting, Cold, Heat, Mirages*).
* **Weave Overcharge (`Stg 500`):** Amplifies **Enchantment**, **Thayan Tattoo**, and **Evolving Item** multipliers.

---

## 3. Gear & Forge Tab (`Stage 1 → 1,000`)
All upgrades here—except Forge Levels above your *Masterwork Floor*—are **100% Permanent across Prestiges**.

### Sub-Tab A: Paper-Doll, Loadouts & Evolving Gear
* **12 Visible Equipment Slots:** *Main Hand, Off Hand/Shield, Armour, Helm, Cloak, Gloves, Boots, Belt, Amulet, Ring ×2, Trinket*.
* **3 Saved Loadouts (`Stg 40`):** One-tap switch between *"Wave Cleave"*, *"Boss Crit-Fisher"*, and *"Survival Tank"* (automatically swaps gear + Weapon Masteries + Gambits!).
* **Smart Comparison:** Every dropped item shows a clear **Green `↑ +14% DPS`** or **Red `↓ Incompatible`** tag, plus a single **"Equip Best"** safety button.
* **Evolving / Artifact Slot (`Stg 500` / `Stg 800+`):** Reserved frame for items that track kill/quest conditions directly on the item card (e.g., *Calimemnon Shard*, *Sword of the Dales*, or future *Arcana Unleashed* Evolving Items) to unlock dormant tiers!

### Sub-Tab B: The Smithy (4 Parallel Upgrade Axes)
1. **Forge Level (`Stg 10` — Gold + Monster Materials):** Infinite linear `%` item power boost. Every 10 levels upgrades sprite VFX (*Sheen → Glow → Particles → Aura*). *(Resets down to your Hall of Legends "Masterwork Floor" on Prestige.)*
2. **Dice Ladder (`Stg 20` — Materials + Forge Milestones):** Permanently upgrades a weapon’s rolled damage dice: **`d6 → d8 → d10 → d12 → 2d8 → 2d10 → 3d8 → 3d10 → 4d12…`**. You literally watch more pixel dice roll on hits!
3. **Enchantment (`Stg 36` — Arcane Dust):** Bounded D&D power **`+1 → +2 → +3`** (adds straight to To-Hit & Damage, plus bypasses Werewolf/Monster resistances). **Mythic Runes (`+4 / +5`)** unlock at Stage 450+.
4. **Quality Reforge (`Stg 75` — Materials + Arcane Dust):** Upgrades item grade **`Crude → Standard → Fine → Masterwork → Heirloom`**, tightening dice min-rolls and adding extra affix lines.

### Sub-Tab C: Inventory, Salvage & Loot Filter
* **Bag of Holding Upgrades:** Expands inventory slots (`40 → 80 → 160+`).
* **Auto-Salvage Filter (`Stg 25`):** Checkboxes to instantly crush Common/Uncommon/Duplicate drops into **Arcane Dust** & **Materials** while keeping upgrades or Set pieces.

### Sub-Tab D: Glamour (Transmog) & Heraldry
* Apply any collected visual look over any item without changing stats, customize your shield/cloak **Coat of Arms** (*Escutcheon, Division, Charge, Tinctures* from FRHoF), and equip earned **Golden/Obsidian/Spellfire Pixel Dice** skins.

---

## 4. Hero, Respec & Guild Roster Tab (`Stages 1 → 1,000`)
This tab is specifically architected to start cleanly as your Tutorial Human Fighter and grow seamlessly into **full 2024 Character Creation, Class Respeccing, and Multi-Character Campaigns**.

### Sub-Tab A: Active Hero Sheet & Build
* **Core Stats & Bounded Accuracy:** Displays STR/DEX/CON/INT/WIS/CHA, Proficiency Bonus (`+2 → +6`), AC, To-Hit, Save Bonuses, and **18 Skill Proficiencies** (with clear hover tooltips showing their idle & Skill Event jobs).
* **Weapon Mastery Bar (`3 → 6` Slots):** Shows equipped Masteries (*Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex*) + Fighter Lv 9 **Tactical Master** quick-toggle.
* **Feat & Boon Tarot Grid (`Stg 15+`):**
  * Categorized cleanly into **Origin Feats**, **Fighting Styles**, **General Feats / ASIs**, **Epic Boons (`Lv 19+`)**, and **Reserved Special Slots** (*Dark Gift Feats* for Ravenloft & *Arcane/Familiar Feats* for Arcana Unleashed).
  * Every Feat card includes a **5-second looping `"Try It"` battlefield preview** and exact **DPS / Survival delta**.
* **Epic Constellation (`Post-Lv 20` / `Stg 850+`):** Once you pass `355,000 XP`, XP continues into **Epic Levels**, awarding `+1 Epic Point` per level into a simple 4-spoke star (*Might, Fortune, Precision, Endurance*) and a new **Epic Boon** every 5 Epic Levels (ability cap rises to `30`).

### Sub-Tab B: Mirror of Rebuilding *(Full 2024 Respec — Unlocks Stage 50 / Expands Stage 100+)*
Easy 3-step guided respec wizard (costs Gold or a Free Respec Token earned from Prestiges/Bosses):
* **Tier 1 (`Stg 50` — Basic Build Respec):** Reassign Ability Scores, Background, Fighting Styles, and Feats.
* **Tier 2 (`Stg 100` / Phase 3 Expansion — Full 2024 Reincarnation):** Respec your active hero into **ANY D&D 2024 option** while preserving your permanent Hero Level (`XP`), Bestiary, Prestige Renown, and Campaign progress:
  * **All 12+1 2024 Classes (with unique Idle Combat Engines):**
    * *Fighter* (Multi-Attack + Action Surge), *Barbarian* (Rage Meter + Reckless Advantage), *Rogue* (Sneak Attack Crit-Combo), *Wizard* (Auto-Cycling Spell Slots + Arcane Recovery), *Cleric* (Channel Divinity + Aura Heals/Radiant), *Paladin* (Crit-Triggered Divine Smite), *Ranger* (Hunter's Mark + Beast/Approach Volley), *Monk* (Focus Flurry + Deflect), *Bard* (Inspiration Buffs + Song Cycles), *Druid* (Wild Shape Stance Swap + Nature), *Sorcerer* (Metamagic Double-Cast), *Warlock* (Short-Rest Pact Bursts + Eldritch Invocations), plus *Artificer* (Infusion/Construct Engine!).
  * **All 48 PHB Subclasses + Expansion Subclasses:** Cleanly tagged by sourcebook (*PHB 2024*, *Heroes of Faerûn* [8 subclasses like *Bladesinger, Banneret, Spellfire Sorcery*], *Ravenloft: The Horrors Within* [7 horror subclasses like *Grave Cleric, Phantom Rogue, Reanimator Artificer*], *Arcana Unleashed* [8 arcane subclasses like *Arcane Archer, Necromancer, Vestige Warlock*]).
  * **All 10 Core Species + Lineage Expansions:** *Human, Dwarf, Elf, Halfling, Dragonborn, Gnome, Goliath, Orc, Tiefling, Aasimar* — plus reserved slots for Ravenloft's *Dhampir, Hexblood, Lupin, Reborn*!
  * **Multiclass Slot (`Stg 500` / Endgame Unlock):** Add a secondary class dip (e.g., *Fighter 15 / Barbarian 5* or *Paladin 14 / Warlock 6*) using a simplified dual-track selector.
* **Gear Compatibility Safety:** When you respec from Fighter to Wizard or Rogue, a **"Reforge Kit"** prompt automatically converts your currently equipped main-hand/armour base into the new class's equivalent (preserving your Forge Level, Dice Ladder, Rarity, and Enchantment!) or stashes originals in the Vault.

### Sub-Tab C: The Guild Roster *(Create & Assign Characters — Slot 1 at Stg 1, Slot 2 at Stg 100, up to 8+ Slots via Hall of Legends)*
* **Create New Hero Wizard:** Spin up brand-new characters at Lv 1 (or jump-started to `50%` of your highest Hero Level via *"Veteran Recruitment"* unlocked in Hall of Legends!) using the full Species/Class/Background creator.
* **Three Assignment Slots per Roster Character:** Every character card shows an active assignment badge:
  1. **`[ON DUTY: FREEPLAY]`** — Currently fighting on your main Battlefield screen.
  2. **`[GARRISON: BASTION]`** — Assigned to a Regional Bastion (*Freedale, Upper City Manor, Wandering Isle, The Terror, Dallabad*, etc.) to boost passive Gold, Crafting, or Arcane Dust based on their Ability Scores & Skills!
  3. **`[DEPLOYED: CAMPAIGN]`** — Sent into a **Set-Length Campaign** (such as *The Black Network*, *Ravenloft: The Horrors Within*, or *Arcana Unleashed: Deadfall*), either solo or in a 4-hero Party!

---

## 5. Tactics & Gambits Tab (`Stage 17 Slot 1 → 8–10 Slots by Stage 1,000`)
To make FFXII-style automation approachable for everyone:
* **Top Toggle: "Smart Presets" vs "Custom Rules":** Beginners can click one preset button (*"Balanced Survival"*, *"Boss Killer"*, *"Wave Sweeper"*); tinkerers switch to Custom Rules.
* **Card-Based `IF → THEN` Rows:**
  * `[Priority ▲▼]` | **`IF`** `[Condition Pill]` *(e.g. `Hero HP < 40%`, `Enemy is Boss`, `3+ Enemies`, `Afflicted by Rust/Poison`, `Weapon Type Needed: Bludgeoning`)* | **`→ THEN`** `[Action Pill]` *(e.g. `Use Second Wind`, `Action Surge`, `Swap to Loadout #2`, `Focus Target`, `Spend Heroic Inspiration`, `Use Class Ability`)*.
* **Condition & Action Card Book:** Earn new Gambit cards as Boss & Bounty drops, giving automation its own collectible progression!
* **Test Dummy Strip:** A tiny 5-second DPS meter at the bottom shows how often each Gambit fired during your last stage.

---

## 6. World, Town & Meta Tab (`Stage 25+`)
Organized into **5 crisp Sub-Tabs** so nothing gets lost:

### Sub-Tab A: Faerûn Atlas & Stage Selector (`Stg 25`)
* Interactive map of **Regions 0–10 (`Stages 1–1,000`)**.
* Tap any unlocked Stage to **Push** or toggle **Farm Mode** (best for grinding specific Monster Materials or Bestiary Tiers).
* **Reserved "Planar Gate" Marker (`Stage 1,000`):** Sealed doorway at the bottom corner teasing off-world content only *after* conquering Stage 1,000.

### Sub-Tab B: Shadowdale Hub & Regional Bastions (`Stg 25 → Stg 65+`)
* **Shadowdale Hub (Starter Town):**
  * **Old Skull Inn:** *Daily/Weekly Bounty Board* + *Retell the Legend (Prestige)* + Mistress Jhaele's Cosmetics.
  * **The Smithy:** Quick portal to Gear/Forge.
  * **Elminster's Locked Tower:** Displays his 1501 DR departure note, archives all *"While You Were Away"* letters, and unlocks *Sending Quips* + Feat Respecs.
  * **Training Yard & Trophy Hall:** Visualizes your Training Ranks & Boss Trophies.
* **Regional Bastions (Unlocks at Stages `65, 165, 238, 335, 425, 550, 650, 750, 850, 950`):**
  * Each Bastion has **Upgradeable Facility Slots** (*Smithy, Garden, Arcane Study, Barrack, Library, + Faction Specials*) and **Unique Hirelings** (*Orebreaker, Starlights, Flywheel, Braelin Wyngard*).
  * Every real-world hour (or `X` stages cleared), your Bastions trigger a **Bastion Turn**, banking Materials, Dust, Gold, and occasional **Bastion Events** (*Refugees, Extraordinary Opportunity, Attack, Guest*).

### Sub-Tab C: Prestige — *"Hall of Legends"* (`Stg 50`)
Spend **Renown** across **4 Easy-to-Read Trees**:
1. **Path of Might (Red):** Global `% Damage`, `% HP`, Base Crit Multiplier, Boss Timer extensions, and Lair Resistance stripping.
2. **Path of Fortune (Gold):** Global `% Gold Find`, `% XP Gain`, `% Material/Dust Drops`, Offline Progress Cap (`8h → 24h → 72h`).
3. **Path of Swiftness (Blue):** **"The Bard Skips the Boring Bits"** (raise starting stage after Prestige: `11 → 26 → 51 → 101 → 151 → 251 → 401…`), **3× & 4× Game Speed**, faster Stage Transitions, Auto-Command Rate, and **Masterwork Forge Floor** (keep Forge Levels up to X across resets!).
4. **Path of Heroes (Purple):** Extra **Gambit Slots (`2 → 10`)**, **Loadout Slots**, **Trinket Slots (`2 → 3`)**, **Roster Hero Slots (`2 → 8`)**, *"Veteran Recruitment"* starting levels, and unlocking **Full 2024 Classes / Species / Multiclassing**.

### Sub-Tab D: Factions & Aurora's Catalog (`Stg 26+`)
* **8 Faerûn Faction Tracks (`Renown 0 → 50`):** Earn Faction Renown via tagged Bounties & Region Clears. Milestones unlock **Faction Special Bastion Facilities** (*Harper Hideout, Zhentarim Travel Station, Emerald Enclave Grove, Order Tournament Field, Purple Dragon Amethyst Den, Cult Archive, Lords' Alliance Noble Residence, Red Wizard Necropolis*), **Harper Personas** (Skill Event bonuses), and **Thayan Spell Tattoos** (passive auto-cast spells!).
* **Aurora's Whole Realms Catalog (`Stg 26+ / Expands Stg 301`):** Spend Gold/Faction tokens on regional survival gear (*Warm Fungal Clothing, Desert Clothing, Bright Fungal Cloak*), **Cheese Bags** (`1 gp` daily buff consumables!), and **Mechanical Wonder Companions** (`Stg 430+`).

### Sub-Tab E: Bestiary, Trinkets & Legend Sheet (`Stg 19+`)
* **Elminster's Annotated Monster Manual:** Tracks kills per creature (`Tier I: 25`, `II: 250`, `III: 2,500`, `IV: 25,000`, `V: 250,000`) for cumulative `+%` family damage and witty margin notes.
* **Trinket Cabinet:** Collection bonuses for odd D&D trinkets (*Blueberry Pie, Toll Coin, Orb of Damara, Decanter of Endless Water*).
* **"Your Legend So Far":** Shareable D&D character sheet tracking crits, fumbles, monsters slain, and time played.

---

## 7. The War Table: Set-Length Campaigns Screen *(Previewed Stage 25 → Unlocks Stage 100)*

This dedicated mode ensures future campaign modules sit comfortably beside infinite Freeplay without breaking either loop:

### How Campaigns Work (Clean Separation from Freeplay)
1. **Bounded Tabletop Scaling (No `10³¹` Inflation):** Inside a Campaign, your hero's **Training Multiplier & Prestige Renown are disabled** (or converted into small flat perks like `+1 Inspiration` or cosmetic badges). Instead, success depends purely on your **Hero Level, Class/Subclass Choice, Feats, Weapon Masteries, Gambits, and Party Composition**—giving your D&D build choices genuine tactical weight!
2. **Finite Story Nodes (`10–30 Stages` per Module):** Campaigns consist of branching map nodes—**Combat Set-Pieces, Skill Event Puzzles, Traps, Moral Choices, Short/Long Rest Campsites, and Story Bosses**. Resources (*Action Surge, Second Wind, Spell Slots, Potions, Hit Dice*) persist between nodes until you find a Rest site.
3. **Roster Assignment (1–4 Heroes):** Pick up to 4 characters from your **Guild Roster** (or borrow iconic NPC allies like *Alias/Dragonbait* or *Karlach* until you build multiple heroes!) and watch them fight in formation. Play actively (**Tactical Turn Control**) or passively (**Gambit Auto-Run**).
4. **Cross-Mode Rewards:** Beating a Campaign awards **Freeplay Permanent Multipliers**, **Unique Evolving Magic Items**, **Campaign-Only Subclasses/Species**, and **Trophies**.

### Pre-Built Campaign Slots Ready for Expansion
* **Campaign Slot 1 (`Unlocks Stage 100` — Lv 1–10): *"The Black Network"***
  * Follows the Zhentarim iron coin from Shadowdale → Voonlar → Zhentil Keep. Teaches multi-node resource management and party synergy.
* **Campaign Slot 2 (`Unlocks Stage 250+ / Roster ≥ 2` — Modular Tiers): *"Ravenloft: The Horrors Within"***
  * *Unique Subsystem Slots Built Into UI:*
    * **Domains of Dread Selector:** Choose from haunted mini-modules across the 16 Domains (*Barovia / Strahd, Lamordia, Innsmouth cosmic horror*, etc.).
    * **Dread & Fear Meter:** Stress builds on horror ambushes/failed Wisdom saves; counter with *Campfire Respite*, *Investigator* clues, or *Courage* features.
    * **Tarokka Reading Modifiers:** Draw 3 Tarokka cards before a run to shift enemy traits, loot drops, and boss locations.
    * **Dark Gift Bargain Prompts:** Mid-campaign temptations that grant a powerful **Dark Gift Feat** (*Aberrant Anatomy, Living Shadow, Symbiotic Being*, etc.) paired with a real mechanical cost (e.g., *Disadvantage on Death Saves* or *Sunlight vulnerability*).
* **Campaign Slot 3 (`Unlocks Stage 500` — High-Level Lv 11–20): *"Arcana Unleashed: Deadfall"***
  * *Unique Subsystem Slots Built Into UI:*
    * **Operation Deadfall Espionage Map:** Covert infiltration missions across Thay leading to **CR 23 Szass Tam**.
    * **Secrecy / Alertness Meter:** Stealthy *Skill Events*, *Harper Personas*, and *Spell Subterfuge* keep Alertness low; loud, flashy spell/blade bursts spike Alertness, summoning **Thayan Knights & Red Wizard Zulkirs**!
    * **Arcane Society Standing & Evolving Magic Items:** Manage fragile trust among rival arcane societies while leveling up **Evolving Weapons/Staves** across mission milestones.

---

# Part 3: How All Progression Tracks Interlock (Zero Dead Ends)

To verify that all math works together harmoniously through Stage 1,000, every track serves a **distinct job** so none cannibalize each other:

| Progression Track | Resets on Prestige? | Primary Role in Your Power | Why You Never Stop Caring About It |
|---|---|---|---|
| **Training Ranks** | **Yes** | Main linear/milestone `×2` engine to push current-run Gold into DPS/HP | Cheap instant feedback every minute (`Now` goal); resets keep early stages snappy after Prestige |
| **Hall of Legends (Renown)** | **No** *(Meta)* | Global exponential catch-up, Speed (`4×`), Skip-Starts, and QoL | Every wall directly translates into permanent Renown power for the next run |
| **Hero Level (`1–20 + Epic`)** | **No** | Multiplicative D&D *actions* (Extra Attacks `2×/3×/4×`, Crit `19–20/18–20`, Feats, Boons) | Bounded via *Adventurer's Pace* (`√CR`) & *Familiar Foes* (`10%` on re-runs), pacing Lv 1→5 (Stg 25), Lv 13 (Stg 500), Lv 20 (Stg 1,000) |
| **Gear: 4 Upgrade Axes** | **Mostly No** *(Forge caps to Masterwork Floor)* | **Forge** (`%` power), **Dice Ladder** (`d6→4d12` literal extra dice), **Enchant** (`+1→+5` accuracy & resistance pierce), **Quality** (affixes) | Keeps loot exciting at Stage 10, 250, 500, and 900; *Accuracy* stays bounded to D&D AC while *Damage* scales infinitely |
| **Bastions & Factions** | **No** | Passive Materials/Dust/Gold ticks, Survival counters, Special Facilities, Spell Tattoos | Prevents walls caused by Material/Dust shortages and adds long-term world-building |
| **Bestiary & Trinkets** | **No** | Flat `+%` vs creature families + quirky passive slot bonuses | Gives **Farm Mode** a permanent purpose whenever you hit a Boss wall |
| **Gambits & Loadouts** | **No** | Tactical efficiency multiplier (auto-swapping *Bludgeoning vs Oozes*, *Cleave vs Swarms*, *Vex vs Bosses*) | Often breaks a wall *without* needing a Prestige reset just by outsmarting the stage mechanic |
| **Guild Roster & Campaigns** | **No** | Parallel horizontal progression, Class/Species variety, and Artifact unlocks | Gives veterans deep D&D replayability using *Horrors Within*, *Deadfall*, and all 2024 classes |

---

# Part 4: "Complexity Without Confusion" — UX Rules

Even with 12+ classes, 48+ subclasses, 4 gear upgrade axes, Gambits, Bastions, and Campaigns, the game stays effortless to use through **5 strict UI rules**:

1. **One-Tap Smart Defaults Everywhere:**
   * Character builds have **"Recommended Build"** badges; Gear has **"Green ↑ / Equip Best"**; Gambits have **3 One-Tap Presets**; Respec has **"Auto-Convert My Gear."** Casual idle players never have to touch advanced math.
2. **Color-Coded Affordability & Visual Feedback:**
   * You never need to read a rulebook to understand mechanics: **Poisoned** literally turns d20s green and picks the lower red roll; **Advantage** lights the higher die gold; **Dice Ladder** adds extra physical dice onto the screen; **Forge milestones** change your sprite's sword glow.
3. **"Why Am I Stuck?" Wall Helper:**
   * If you fail a Boss Timer twice or stall for 10 minutes, a subtle banner appears under the Boss bar with 3 clickable diagnostic pills:
     * *"Tip: Boss resists Slashing—try swapping to a Bludgeoning Loadout!"*
     * *"Tip: Upgrade Weapon Forge (`+45%` ready with current Pelts)!"*
     * *"Wall Reached: Retell the Legend now for `+18` Renown (`+180%` Power)!"*
4. **Hover/Tap Breakdowns in Plain English:**
   * Tapping your DPS number pops a tiny 4-line receipt: `Base Dice (2d8+5) × Crit Factor (1.35) × Training & Forge (×420) × Renown (×18.5)`. No hidden black-box math.
5. **Zero-Punishment Experimentation:**
   * Failing a Boss simply lets you farm/retry; failing 3 Death Saves gently steps you back 1 stage with zero lost items or gold; and **Training Loadouts + Gambits** swap freely at zero cost.
