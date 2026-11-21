# REALMSBOUND — Stage 1 prototype

A hand-pixeled idle-RPG slice: a sellsword arrives at Old Skull Meadow at dawn, meets an
ancient wizard, and learns to fight rats. Everything is procedural pixel art + procedural
WebAudio; there are no external assets.

## Running it

```
python3 tools/serve.py 8081     # no-store dev server; /b/<build>/ versioned module paths
```

Open `http://localhost:8081/`. The corner stamp shows the exact build you're running
(recomputed on every page load), so a stale preview is impossible to mistake.

## What's in Stage 1

- **Beat 0 — the walk.** The sellsword strolls in from the west gate; Elminster smokes his
  pipe on the fence and talks you through the HUD. Camera pans and settles on the village.
- **Beat 1 — first blood.** Two rats burst from the burrow. Scripted fight: real d20 rolls,
  a d20 bounces in over the hero's head (HIT / MISS / CRIT / FUMBLE), damage numbers,
  hit-stop, death pops, XP motes and coins fly to the HUD. Ends HP 9/12, 50 XP, 2/10 rats.
- **Beat 2 — Command Strike (live, unscripted).** Two more rats. Click a beast: the hero
  shouts "HA!" and lands a Command Strike (10% of weapon damage, min 1), and a gold
  reticle marks it as his **focus target** — he swings at the focused rat first, and steps
  in to reach it. Command Strikes are throttled: 2.2 s between taps. The hero's round is
  a stately **6 s** (rats nip in every 4.25 s, goblins 4.75 s). Elminster nudges you (a
  gauntlet cursor + pointer demo appear if you dawdle, and he has opinions if you spam).
  The fight runs on a deterministic event store until both rats pop; the pace is yours.
- **Beat 3 — Coins (live).** Beat 2's rats drop two coppers each — and nobody picks them
  up for you. Coins rest on the path, glinting; tap one and it zips to the purse with a
  clink that climbs in pitch for each quick pickup in a row — and the gauntlet sweeps up
  any coin resting close by, so a cluster takes one tap, not four. Once the fight is over
  a 5 s countdown starts (nobody loots mid-swing): a coin left too long rolls off to the
  burrow and is gone. Elminster introduces, nudges, and passes judgement — "Every last
  copper. Thou art part magpie." if you pocket all four (the purse then reads **9 cp**),
  or "The meadow keeps its tithe." if you don't.
- **Beat 4 — the Quota Bar.** A pause to point at the stage sign: a spotlight falls on
  it, the four filled pockets ripple gold, and Elminster explains the road onward —
  then two more Giant Rats burst from the grass and are fought down by the book, so
  the bar proves itself, ticking up to 6/10 before the goblins come.
- **Beat 5 — Goblins!** Three Goblin Minions vault the dry-stone wall, one at a time.
  Real rounds by the book — except the die has plans for the middle one: a scripted
  natural 20 punts him skyward to vanish with a "ding" like a struck star. Their copper
  (4–8 each) rests on the grass with a short fuse for the player to tap. (Quota: 9/10.)
- **Beat 6 — the Training Yard.** With the purse full (13 cp if you tapped four), the
  Train tab pulses gold under a spotlight: "Thou hast coin. Spend it!" The Training
  screen fills most of the stage and the meadow waits, dimmed, behind it. All six
  drills of the design plan (§5.6) are on the board, two cards to a page: **Weapon
  Drills** (+10% damage), **Armour Drills** (+5% health), **Footwork** (−1% round
  time), **Tactics** (+10% command strike), **Scavenging** (+2% gold find) and
  **Conditioning** (+5% mending) — ranks without number, each ~10% dearer than the
  last, Weapon Drills opening at 10 cp because the purse holds 13. Buying pops the
  rank pip, spills the copper clink by clink, and floats the drill's gain off the
  card; milestone ranks (×2 damage at 10, coins that pick themselves up at
  Scavenging 5…) explode a gold stamp across the card and earn a word from
  Elminster. The NOW tag retargets the next Weapon Drills rank; T reopens the yard
  any time, and the tab gives a brief gold hop whenever some drill is freshly
  affordable.

- **Beat 7 — Snikkit.** Quota 9/10. One last goblin vaults the wall — wearing Mistress
  Jhaele's pie tin for a helm and clutching the pie itself, held high like a trophy.
  "PIE IS MINE! FAT WIZARD CANT CATCH SNIKKIT!" his own little speech bubble crows.
  Elminster: "…That is Mistress Jhaele's blueberry pie. From the Old Skull Inn. Fetch
  it back." Snikkit turns tail; the pie is heavy and his nerve is short, so every
  couple of seconds he trips and tumbles all the way back to the hero's sword — and
  the player's Command Strikes stagger him mid-waddle (the gauntlet pointer says so).
  He can never make the wall. When he falls, the tin and the pie arc into the grass
  beside 25 cp of stolen copper (5 coins of 5, no fuse — loot, not litter); tap both
  treasures and the loot card pops: **Snikkit's Pie Tin** — Helm · Common, +1 max HP,
  with the **Half-Eaten Blueberry Pie** trinket noted alongside. Quota: 10/10.

- **Beat 8 — First Equip.** Elminster, amused: "A helmet. Of sorts. Wear it. Gear
  changes thee, outside and in." The Gear tab pulses gold under a spotlight (click it,
  or press G) and the **GEAR** screen opens over the dimmed meadow — the same cut as
  the Training Yard. Left: the Sellsword on his practice mat ringed by the **ten
  paper-doll slots** — helm, amulet, armour, cloak, weapon, shield, boots, trinket
  and two rings — empty slots a dim silhouette of what could go there, worn pieces
  lit in gold. Right: the **satchel**, a paged list (three rows a page, brass
  chevrons to browse) with each treasure's stat and a green-arrowed **EQUIP** plate;
  a worn piece's plate reads **WORN** and takes it off again, and clicking a worn
  slot sheds it too. Equip the tin and the world changes: the hero's sprite wears it
  (a silver dish with a berry stain, on the hood), the HP bar reads **13/13**, "+1
  MAX HP" floats off the row, the screen bows out, and Elminster's portrait blows a
  fat smoke ring — a single snort: "…It suits thee, sellsword. Gods help thee."
  G reopens the screen any time.

- **Beat 9 — Level Two.** The last XP mote brims the bar (Snikkit, a named minion,
  is worth triple) and the meadow holds its breath: a pillar of gold around the
  Sellsword, **LEVEL 2!** in ringing letters, and the padlock on the belt's second
  socket springs open — **ACTION SURGE**, lit and waiting. The surge is theatre for
  now: the socket glows, the level shield reads 2, the "next unlock" preview
  retires, but the button does nothing yet. Elminster: "The Weave sings in thy
  bones. Or that is the pie."

- **Locks.** Until Elminster points them out, the Train and Gear belt tiles sit
  behind chains and a padlock (a locked tap rattles, nothing more). In the Training
  Yard only **Weapon Drills** is taught in Stage 1 — the other five paths are
  greyed, chained and padlocked, their buy strips reading **LOCKED**.

## Controls

| input | effect |
|---|---|
| Click / Space / Enter | start |
| Click a rat (Beat 2) | Command Strike + focus target |
| Click a coin (Beat 3) | pocket it — and any coin near it (rising-pitch clink streak) |
| Click the dialogue box | finish the line instantly |
| T / Train tile (Beat 6) | open / close the Training Yard |
| ← / → or 1–6 (Beat 6) | pick a drill; click a card (or the selected card) to buy |
| G / Gear tile (Beat 8) | open / close the Gear screen; ↑ ↓ or 1–9 pick, ← → turn the page, Enter equips (or sheds) |
| M | mute · R | replay |
| `?t=37.5` | freeze on a frame (testing) |
| `?autoplay` | skip the start gate (testing) |
| `?taps=39:0,40.9:1` | script Beat 2 clicks: `time:ratIndex` (testing) |
| `?coins=8` | scripted coin taps: pocket the first N resting coins, goblin copper included (testing) |

## Tech

Vanilla ES modules, zero dependencies, 640×360 native upscaled ×2 with smoothing off.
`tools/shoot.py` (Playwright) freezes frames for review; test hooks `__ready`, `__state()`,
`__render(t)`, `__click(x,y)`, `__ratPoints()`, `__coinPoints()`.
