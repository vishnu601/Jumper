# Jumper Kit — board database, part inventory, and "what can I build?"

Proposal, not built. Two data-model changes need your approval before code (marked ⛔).

---

## 1. What this adds

1. A **board database**: every board a student might own, with exact model numbers and per-pin capabilities, as sourced content.
2. A **part inventory** ("my kit"): the student ticks what they physically have, once.
3. **"What can I build?"**: match the inventory against the project catalog and show what's ready, what's one part away, and what isn't possible yet.

---

## 2. Why the board database pays for itself three times over

It is not just a lookup table for this feature. Three things already in the codebase or specs are currently blocked on it:

- **`lib/rules` is Uno-only by accident.** `BoardDef` carries `logicVoltage` and `maxPinCurrentMa` but nothing about *which* pins do what, so no rule can say "A4 is SDA" or "pin 12 isn't PWM".
- **Fix's static code checks** (`fix-mode.md` §8.1) need "`analogWrite` on a pin that isn't PWM **on the chosen board**". Today that would be a hardcoded `[3,5,6,9,10,11]` — exactly the symptom-specific logic rule 17 forbids.
- **Fix's fault trees** already contain board-specific facts (`old-bootloader-clone`, `missing-usb-driver` depend on which USB chip the board carries). Those belong in the board record, not in fault prose.

So: build this first, and Fix M4 gets board-awareness free.

### 2.1 ⛔ Change 1 — split electrical data from drawing data

`lib/geometry/board.ts` currently merges both: `BoardPin` holds `x`, `y`, `side` (geometry) alongside `role` (electrical), and the whole record is hand-built from coordinate tables. That's right for one board and wrong for ten — most boards need electrical facts immediately but a drawing only when a diagram actually renders them.

```
lib/schema/board.ts      boardSchema — identity + electrical + capabilities (Zod, content)
content/boards/*.ts      uno-r3.ts, uno-r4-minima.ts, nano-v3.ts, mega-2560.ts, esp32-devkit-v1.ts
lib/geometry/board.ts    drawing layer only: pin id -> {x, y, side}, per board, OPTIONAL
```

A board without a drawing is fully usable for inventory matching, code checks and fault filtering; it just can't be the subject of a diagram yet. `getBoard('uno')` keeps working; `UNO` becomes the composition of `content/boards/uno-r3.ts` and the existing coordinate table.

### 2.2 Board schema

```ts
export const pinCapabilitySchema = z.object({
  digital: z.boolean().default(false),
  analogIn: z.boolean().default(false),
  /** True DAC, not PWM. (Uno R4 A0 has one; classic AVR boards have none.) */
  analogOut: z.boolean().default(false),
  pwm: z.boolean().default(false),
  interrupt: z.boolean().default(false),
  i2c: z.enum(['sda', 'scl']).optional(),
  spi: z.enum(['mosi', 'miso', 'sck', 'ss']).optional(),
  serial: z.string().optional(),            // 'rx0', 'tx0', 'rx1', ...
  inputOnly: z.boolean().default(false),    // ESP32 GPIO34-39
  /** Student-facing warnings: "also drives the on-board L light",
   *  "used by USB serial — a part here blocks uploads",
   *  "held high/low at boot; a part here can stop the board starting". */
  warnings: z.array(z.string()).default([]),
});

export const boardSchema = z.object({
  id: z.string().min(1),                    // 'uno-r3'
  name: z.string().min(1),                  // 'Arduino Uno R3'
  /** Exact ordering codes so a student can match the box. */
  modelNumbers: z.array(z.string()).default([]),
  /** How clones present themselves, for the picker and for fault filtering. */
  aliases: z.array(z.string()).default([]),
  mcu: z.string().min(1),
  architecture: z.enum(['avr', 'samd', 'renesas-ra', 'esp32', 'rp2040']),
  clockMhz: z.number().positive(),
  flashKb: z.number().positive(),
  sramKb: z.number().positive(),
  eepromKb: z.number().nonnegative().optional(),
  logicVoltage: z.number().positive(),      // 5 or 3.3 — drives the voltage-mismatch rule
  inputVoltage: z.tuple([z.number(), z.number()]).optional(),
  usbConnector: z.enum(['usb-b', 'mini-b', 'micro-b', 'usb-c']),
  /** Decides missing-driver and old-bootloader faults in Fix. */
  usbSerial: z.enum(['atmega16u2', 'ch340', 'cp2102', 'native', 'other']),
  needsDriver: z.boolean(),
  maxPinCurrentMa: z.number().positive(),
  maxTotalCurrentMa: z.number().positive().optional(),
  pins: z.array(z.object({
    id: z.string().min(1),                  // 'D9', 'A0', '5V'
    silkscreen: z.string().min(1),          // exactly what's printed on the board
    label: z.string().min(1),               // how we name it in prose: "Pin 9"
    role: z.enum(['digital', 'analog', 'power', 'ground', 'other']),
    capabilities: pinCapabilitySchema,
  })).min(1),
  groundPins: z.array(z.string()).min(1),
  supplyPins: z.record(z.string(), z.number()),
  /** Everything above is a claim about hardware. Nothing ships unsourced. */
  sources: z.array(z.string().url()).min(1),
});
```

**Every value comes from the official pinout diagram or datasheet, cited in `sources`, and lands in `PARTS_SOURCES.md`.** I will not type pin capabilities from memory — that's how a student ends up with `analogWrite` on a pin that silently does nothing.

Proposed V1 set (confirm in Q1): Uno R3, Uno R4 Minima, Uno R4 WiFi, Nano (ATmega328P / CH340 clone), Mega 2560, ESP32 DevKit V1. Each is one file plus one sourcing pass.

---

## 3. Inventory and matching

### 3.1 ⛔ Change 2 — projects require *capabilities*, not exact part ids

`projectSchema.parts` is `{ partId, qty }` today. Matched literally against an inventory, that breaks instantly: a student with a green LED and a 330 Ω resistor is told they can't build project 1, which is false and infuriating.

```ts
export const partRequirementSchema = z.union([
  z.object({ kind: z.literal('part'), partId: z.string().min(1) }),
  z.object({
    kind: z.literal('any'),
    category: z.enum(['led', 'resistor', 'button', 'sensor', 'motor', 'display', 'wire', 'board', 'other']),
    /** Numeric windows, checked against Part.specs. */
    resistanceOhms: z.tuple([z.number(), z.number()]).optional(),
    forwardVoltage: z.tuple([z.number(), z.number()]).optional(),
    /** Board requirements expressed as capabilities, not board ids. */
    pinCapabilities: z.array(z.enum(['pwm', 'analogIn', 'interrupt', 'i2c', 'spi'])).optional(),
    note: z.string().optional(),            // "any colour"
  }),
]);

// projectSchema.parts becomes:
parts: z.array(z.object({ need: partRequirementSchema, qty: z.number().int().min(1) }))
```

Project 1 then reads: one board with ≥1 PWM pin, one 5 mm LED (any colour), one resistor 180–470 Ω, one breadboard, three jumper wires. That is both true and matchable. Making this change *now*, with 2 projects, costs an hour. Making it at 20 projects costs a rewrite of all 20.

Consequence worth naming: an "any colour LED" requirement means the rules engine can no longer assume `forwardVoltage: 2.0`. The current-estimate message must use the actual part in the student's inventory, or say "about 13 mA with a red LED" and state the assumption. I'd handle it by keeping the *diagram* pinned to a concrete part and letting the *shopping/matching* layer be loose.

### 3.2 Inventory store

```ts
export const inventorySchema = z.object({
  boards: z.array(z.object({ boardId: z.string(), qty: z.number().int().min(1) })),
  parts: z.array(z.object({ partId: z.string(), qty: z.number().int().min(1) })),
  tools: z.array(z.enum(['multimeter', 'soldering-iron', 'screwdriver'])).default([]),
  updatedAt: z.string(),
});
```

localStorage via the existing `lib/progress` pattern — same store shape, no backend. **Kit presets** matter more than the schema: most students bought one box. One tap on "Elegoo Super Starter Kit" or whatever the common Robu/Amazon kit is should populate 40 parts at once. That needs real kit contents lists from you (Q3) — I won't guess at what's in a box.

### 3.3 The matcher

`lib/kit/match.ts`, pure function, unit-tested:

```ts
matchProject(project, inventory, parts, boards) -> {
  status: 'ready' | 'almost' | 'not-yet',
  missing: { need: PartRequirement, qty: number, suggestion?: string }[],
  substitutions: { need: PartRequirement, using: string }[],   // "using your 330 Ω"
}
```

`almost` = exactly one requirement unmet. **That bucket is the product.** "You can build 4 things now, and 6 more if you buy a ₹20 pack of resistors" is a far better screen than a binary yes/no, and it's the one that gets shared.

Sort: ready first (by project order), then almost, then not-yet. Show substitutions explicitly — "using your 330 Ω resistor instead of 220 Ω; the LED will be slightly dimmer" teaches while it matches.

### 3.4 Where it plugs into Fix

The inventory is not a silo:

- Fix's parts picker (§4.1 step 3) pre-fills from the kit instead of making the student search a list at 11pm.
- Probes with `needs: ['spare-part']` or `['multimeter']` are filtered out for students whose inventory says they don't have one — which is exactly the "I can't do this" tap the engine currently has to waste a probe discovering.
- Health checks list which of the student's own parts have never been tested.

---

## 4. Files

```
/lib/schema/board.ts          boardSchema + inferred types
/content/boards/*.ts          one file per board, each with sources[]
/lib/geometry/board.ts        (refactor) drawing coordinates only, optional per board
/lib/kit
  schema.ts                   inventory + requirement schemas
  match.ts                    matchProject, matchAll
  store.ts                    zustand + localStorage
  match.test.ts
/content/kits/*.ts            starter-kit presets (needs sourcing)
/app/kit/page.tsx             "My kit" — tick what you have, or pick your kit
/app/kit/build/page.tsx       "What can I build?"
```

---

## 5. Honest limitation

With 2 projects in the catalog, "what can I build?" returns at most 2 answers. **This feature's value is a function of catalog size**; it earns its keep somewhere around 15–20 projects.

My recommendation: do the schema changes and the matcher **now** (cheap, unit-tested, and it forces the requirement model before 20 projects get written in the wrong shape), and hold the `/kit/build` screen until the catalog justifies it. The board database, by contrast, pays off immediately — Fix M4 needs it.

---

## 6. Questions

**⛔ Q1 — board list for V1.** Proposed: Uno R3, Uno R4 Minima, Uno R4 WiFi, Nano (CH340 clone), Mega 2560, ESP32 DevKit V1. Each needs a sourcing pass against the official pinout. Right list?

**⛔ Q2 — the requirement model (3.1).** Approve changing `projectSchema.parts` to capability requirements? This is the one change that gets expensive to delay.

**Q3 — kit presets.** Which starter kits do your students actually buy? I need real contents lists (a link or a photo of the box's parts list) — I won't invent kit contents.

**Q4 — model numbers.** Worth carrying ordering codes (A000066 and friends) for genuine boards, given most Indian students hold clones with no code at all? My instinct is yes for genuine, plus `aliases` carrying how clones label themselves, since that's what the student can actually read off the board.
