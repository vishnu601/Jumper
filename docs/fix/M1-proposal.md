# Jumper Fix — M1 proposal (for review before any code)

Answers section 18 items 2 and 3 of `docs/prompts/fix-mode.md`. Nothing here is built yet.

---

## 1. Understanding, in five sentences

Jumper Fix is for the student who did **not** start in Jumper: the circuit is already built, it is 11pm, and they don't know whether the fault is the code, a wire, the power, the part or the board. It replaces the forum's ten simultaneous guesses with one card at a time — a question, a test, or a measurement — chosen cheapest-and-most-likely-first by a deterministic engine, until one cause crosses a confidence threshold or the engine honestly says it doesn't know. It also answers the question nobody else asks — "is this part even alive?" — with a 60-second isolated health check per component, because students burn nights on code when the sensor was dead in the packet. All the diagnostic knowledge (faults, probes, outcomes, fixes) is Zod-validated content, so the engine never contains a symptom's name and lab instructors can author without doing probability math. Safety outranks everything: danger signs stop the flow before any diagnosis, mains and lithium and anything over 12 V are refused kindly, and every fix changes exactly one thing and then retests.

---

## 2. How it connects to what already exists

| Existing module | How Fix uses it | What has to change |
|---|---|---|
| **Component library** (`content/parts/*.ts`, `partSchema`) | `Fault.appliesTo.parts`, `HealthCheck.partId`, the parts picker, and the glossary text on probe cards all key off the same `Part` ids. One library, never a parallel list. | Today it holds 5 parts (uno, breadboard, jumper wires, red LED, 220 Ω). V0 Fix names ~17. See question Q1 — I want to extend `partSchema`, not fork it. |
| **Diagram engine** (`components/diagram/Scene.tsx`, `lib/geometry/*`) | Probe diagrams ("just the HC-SR04 and its four wires") and every health-check wiring step are drawn by `Scene` with a zoomed `view` and focus rings — the same renderer, no second drawing path. | `Scene` currently takes a `Project`. I'll shape a fix diagram/health-check circuit as the same `{ view, elements, steps }` triple and reuse `projectSchema`'s pieces, so `Scene` needs **no** change. |
| **Rules engine** (`lib/rules`, `lib/netlist`) | Section 8.4: the wiring form becomes a synthetic project → `getNets` → `checkCircuit`. Each `Finding.rule` maps to fault weights through a content table (`content/fix/rule-map.ts`), so rule output enters the engine by the same `Effects` path as a probe answer. | No engine change. The map is content. Rules currently implemented are 3 of the 10 in the main prompt — Fix will want `missing-common-ground`, `unconnected-pin`, `pin-conflict` for M4, not M1. |
| **Progress store** (`lib/progress`, zustand + localStorage) | Same pattern for the fix session (answers, undo stack, ruled-out set). | New store, same shape of thing. |
| **Content validation** (`lib/schema/validate.ts`, `content/content.test.ts`, `npm run content:check`) | Fix content validates in the same test run, so bad diagnostic content fails the build exactly like bad project content does. | Add `validateFixContent()` alongside `validateProject()`. |
| **Sketches** (`content/sketches/index.ts`) | Probe and health-check sketches live here, next to `blink`, and are shown with the existing `CodeBlock`. | Add test sketches. |

---

## 3. Files M1 adds

```
/lib/fix
  schema.ts               Zod for every fix content type (source of truth, types inferred)
  validate.ts             cross-file checks: dangling faultIds, unreachable faults, priors, sources
  /engine
    weights.ts            weight -> multiplier config + thresholds, the only tunable numbers
    state.ts              FixState, init from (symptom, board, parts), apply, undo
    update.ts             scoring + normalisation + ruled-out set
    select.ts             next-probe choice (forced phase, then info-gain / cost)
    stop.ts               threshold, confirms, probe cap, no-confident-answer summary
    index.ts              next(state, content) -> { kind: 'probe' } | { kind: 'cause' } | { kind: 'unresolved' }
    engine.test.ts        unit tests for the above
    scenarios.test.ts     scripted-student scenario harness (every fault found <= 8 probes)
/content/fix
  index.ts                assembled + validated content bundle
  symptoms.ts             symptom taxonomy (V0 subset for M1)
  faults/led-doesnt-light.ts
  faults/upload-fails.ts
  probes/shared.ts        safety probes + probes used by several symptoms
  probes/led-doesnt-light.ts
  probes/upload-fails.ts
  rule-map.ts             rules-engine Finding.rule -> Effects  (stub in M1, used in M4)
  fix.test.ts             content validation test, wired into `npm run content:check`
/app/fix
  page.tsx                bare entry: pick symptom + parts
  [symptom]/page.tsx      bare runner (unstyled; design lands in M2)
/components/fix
  ProbeCard.tsx           prompt + outcome buttons + "I'm not sure" / "I can't do this"
  CausePanel.tsx          cause, fix steps, why, verify, "did it work?"
  Trail.tsx               "what we know so far"
docs/fix/M1-proposal.md   this file
PARTS_SOURCES.md          sources / your sign-off per claim (section 16) — created in M1, appended forever
```

---

## 4. Final Zod schemas

Deviations from the draft interfaces in section 6 are flagged **[change]** and need your approval before I code.

```ts
// lib/fix/schema.ts
import { z } from 'zod';

export const weightSchema = z.enum([
  'confirms', 'strong', 'weak', 'neutral', 'against', 'rules_out',
]);

/** faultId -> weight. The single currency of evidence: probe outcomes, code
 *  checks, upload-error matches, serial patterns and rules-engine findings all
 *  produce this shape, so the engine has exactly one update path. [change] */
export const effectsSchema = z.record(z.string().min(1), weightSchema);

export const boardIdSchema = z.enum(['uno']);           // Nano/Mega/ESP32 later
export const faultCategorySchema = z.enum([
  'power', 'upload', 'code', 'wiring', 'part', 'board', 'environment',
]);

/** [change] Section 5 and section 9 both need a symptom record; section 6 had
 *  no type for one. It also carries the forced sweep (7.3.1) so that ordering
 *  is content, never a switch statement in the engine (rule 17). */
export const symptomSchema = z.object({
  id: z.string().min(1),                      // 'led-doesnt-light'
  category: z.enum([
    'board-and-upload', 'code-and-serial', 'outputs', 'inputs', 'motors',
    'displays', 'other',
  ]),
  label: z.string().min(1),                   // "LED doesn't light"
  /** How students actually search. Drives the public page (section 9). */
  searchPhrases: z.array(z.string().min(1)).min(3),
  /** One plain-language paragraph for the public page. Human-written. */
  blurb: z.string().min(1),
  parts: z.array(z.string().min(1)).default([]),
  boards: z.array(boardIdSchema).default(['uno']),
  /** Ordered probe ids asked before info-gain selection begins. */
  sweep: z.array(z.string().min(1)).default([]),
  slug: z.string().min(1),                    // '/fix/<slug>'
});

export const faultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),                   // student-facing, not jargon
  category: faultCategorySchema,
  appliesTo: z.object({
    symptoms: z.array(z.string().min(1)).min(1),
    parts: z.array(z.string().min(1)).optional(),
    boards: z.array(boardIdSchema).optional(),
  }),
  prior: z.number().gt(0).lte(1),             // gt(0): a zero prior is unreachable
  fix: z.object({
    /** One action each. Validated: no step contains " and then ". */
    steps: z.array(z.string().min(1)).min(1),
    why: z.string().min(1),
    verify: z.string().min(1),
  }),
  danger: z.boolean().default(false),
  sources: z.array(z.string().min(1)).optional(),
  /** [change] Either `sources` or `signoff` must be present (section 16). */
  signoff: z.string().optional(),
  /** [change] REQUIRED FOR 7.5. Ground truth for the scenario harness:
   *  probeId -> the outcome a student with this fault truthfully gives.
   *  Doubles as an authoring completeness check — a probe relevant to this
   *  fault with no answer here fails validation, so content can't half-exist. */
  answers: z.record(z.string().min(1), z.string().min(1)).default({}),
});

export const probeOutcomeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  effects: effectsSchema.default({}),
  next: z.string().min(1).optional(),         // forced follow-up probe
  /** [change] Some answers mean "you're in the wrong fault tree": hand off. */
  handoff: z.string().min(1).optional(),      // symptom id
});

export const probeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['question', 'test', 'measure']),
  prompt: z.string().min(1),                  // short enough to read aloud (13)
  detail: z.string().optional(),              // one action per line
  cost: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  needs: z.array(z.enum(['multimeter', 'spare-part', 'spare-wire'])).default([]),
  sketch: z.object({
    file: z.string().min(1), source: z.string().min(1), expect: z.string().min(1),
  }).optional(),
  diagram: z.string().min(1).optional(),      // id into the fix diagram registry
  appliesTo: z.object({
    symptoms: z.array(z.string().min(1)).optional(),
    parts: z.array(z.string().min(1)).optional(),
  }),
  outcomes: z.array(probeOutcomeSchema).min(2),
  requires: z.array(z.object({
    probe: z.string().min(1), outcome: z.string().min(1),
  })).default([]),
  /** [change] 'safety' probes are forced ahead of everything (3.1, 16). */
  phase: z.enum(['safety', 'normal']).default('normal'),
  /** [change] Tie-break signal for 7.3.3, declared not inferred. */
  splitsCodeFromHardware: z.boolean().default(false),
  /** [change] Some probes require power off; the UI must say so. */
  powerOff: z.boolean().default(false),
});

/** [change] A health check's circuit is a mini project so `Scene` is reused
 *  unchanged; `steps` is the existing stepSchema from lib/schema/content.ts. */
export const healthCheckSchema = z.object({
  partId: z.string().min(1),
  slug: z.string().min(1),                    // '/check/<slug>'
  needs: z.array(z.string().min(1)).min(1),
  noMultimeter: z.boolean(),
  circuit: z.object({
    view: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    elements: z.array(elementSchema),         // reused from lib/schema/content
    steps: z.array(stepSchema).min(1),        // reused
  }),
  sketch: z.object({ file: z.string().min(1), source: z.string().min(1) }).optional(),
  expected: z.string().min(1),
  results: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    verdict: z.enum(['healthy', 'faulty', 'inconclusive']),
    explanation: z.string().min(1),
    nextChecks: z.array(z.string().min(1)).optional(),
  })).min(2),
  sources: z.array(z.string()).optional(),
  signoff: z.string().optional(),
});

export const uploadErrorSchema = z.object({
  id: z.string().min(1),
  patterns: z.array(z.string().min(1)).min(1),   // regex source strings
  meaning: z.string().min(1),
  faults: effectsSchema,
  /** [change] Content cannot ship until the exact wording is confirmed
   *  against real IDE output — the build warns while this is false. */
  verified: z.boolean().default(false),
});

export const serialPatternSchema = z.object({
  id: z.string().min(1),
  test: z.enum(['garbled', 'empty', 'constant', 'rails-0', 'rails-1023', 'nan', 'regex']),
  regex: z.string().optional(),
  meaning: z.string().min(1),
  faults: effectsSchema,
}).refine((p) => p.test !== 'regex' || !!p.regex, {
  message: 'test "regex" needs a regex',
});

/** [change] Section 8.4 glue, as content: a rules-engine finding becomes
 *  evidence without the engine knowing any rule names. */
export const ruleMapSchema = z.object({
  rule: z.string().min(1),                    // Finding.rule from lib/rules
  faults: effectsSchema,
});
```

**Cross-file validation** (`lib/fix/validate.ts`, run by `npm run content:check`):

1. Every faultId in any `effects` / `answers` exists.
2. Every probe/symptom/outcome/handoff id referenced exists; `requires` names a real probe **and** a real outcome of it.
3. Every symptom has ≥ 2 faults; every fault is referenced by ≥ 1 probe outcome with a non-neutral weight (otherwise it can never be raised).
4. Every fault has `sources` or `signoff`.
5. For each fault, for every probe eligible under its symptoms/parts, `answers[probeId]` exists and names a real outcome of that probe.
6. No fix step contains " and then " (rule: one action per step).
7. No `sweep` entry is missing from the probe set; safety probes are never in a sweep (they're forced globally).
8. Priors are within (0, 1]; they need not sum to 1 — the engine normalises over the live candidate set.

---

## 5. Weight-to-multiplier config

```ts
// lib/fix/engine/weights.ts — the only tunable numbers in the module.
export const MULTIPLIER = {
  confirms: 20,
  strong:    4,
  weak:      1.7,
  neutral:   1,
  against:   0.4,
  rules_out: 0,
} as const;

export const ENGINE = {
  /** 7.4 present-a-cause threshold on the normalised top score. */
  presentAt: 0.7,
  /** ...and at least this many non-neutral supporting answers. */
  minSupport: 1,
  /** 7.4 hard stop -> "no confident answer" summary. */
  maxProbes: 15,
  /** 7.5 CI budget: every fault found within this many probes. */
  scenarioBudget: 8,
  /** 7.3.2 value = expectedEntropyDrop / (cost ** costExponent). */
  costExponent: 1,
  /** 7.3.3 tie-break bonus for a probe that splits code from hardware. */
  splitBonus: 1.05,
  /** Below this share a fault is dropped from the live set entirely. */
  pruneBelow: 0.005,
} as const;
```

**Update** (`update.ts`): `score_f *= MULTIPLIER[w]` for each effect, then renormalise so scores sum to 1. `rules_out` (or a fix the student reports didn't work) moves the fault to `ruledOut` — a set the engine never reads back, so principle 8 holds structurally rather than by arithmetic. `confirms` additionally sets `confirmedBy`, which `stop.ts` treats as an immediate present-the-cause regardless of share.

**Selection** (`select.ts`), making 7.3.2 concrete: for probe `p`, treat each outcome `o` as having likelihood `L(o) = Σ_f score_f · MULTIPLIER[w(f,o)]`, normalise the `L(o)` across outcomes to get `P(o)`, compute the posterior for each outcome, and score the probe as `Σ_o P(o) · [H(prior) − H(posterior_o)] / cost^costExponent`. Deterministic, no sampling, unit-testable.

---

## 6. Content draft — "LED doesn't light"

Symptom `led-doesnt-light` · category `outputs` · parts: uno, breadboard, red LED, 220 Ω resistor, jumper wires · slug `/fix/led-not-lighting`.
Search phrases: "arduino led not working", "led not lighting arduino", "led doesn't turn on arduino uno", "breadboard led not glowing".
Sweep: `safety-danger-signs` → `on-light` → `direct-5v-test`.

### Faults

| id | prior | category | title |
|---|---|---|---|
| `led-backwards` | 0.20 | wiring | The LED is in the wrong way round |
| `led-legs-same-strip` | 0.14 | wiring | Both LED legs are in the same connected strip |
| `gnd-path-missing` | 0.13 | wiring | Nothing joins the LED's circuit back to GND |
| `pin-mismatch` | 0.12 | code | The pin in the code isn't the pin the wire is in |
| `pin-not-output` | 0.09 | code | The pin was never set to OUTPUT |
| `sketch-not-uploaded` | 0.08 | upload | The sketch on the board isn't this sketch |
| `loose-leg` | 0.08 | wiring | A leg or wire end isn't pushed fully in |
| `resistor-too-large` | 0.06 | wiring | The resistor is far too large, so the LED is lit but invisible |
| `rail-not-fed` | 0.05 | wiring | The breadboard rail being used isn't connected to the board |
| `led-dead` | 0.05 | part | The LED itself is dead |

Fixes (abbreviated here; full `steps`/`why`/`verify` prose written into the content file on approval):

- **`led-backwards`** — steps: (1) Unplug the USB cable. (2) Pull the LED out of the breadboard. (3) Find the short leg, next to the flat notch on the rim — that's the negative leg. (4) Push the LED back in with the short leg in the column that leads to the resistor and GND. (5) Plug the USB cable back in. *Why:* an LED is a diode — it only passes current one way, and backwards it simply sits there, undamaged and dark. *Verify:* the LED should light as soon as the board powers up and runs your sketch.
- **`led-legs-same-strip`** — the legs share one 5-hole column, so current takes the copper strip and skips the LED entirely. Steps: unplug; move one leg one column along; replug.
- **`gnd-path-missing`** — the resistor's far column has no wire to a GND pin (or to a − rail that itself reaches GND). One black wire, one action.
- **`pin-mismatch`** — the number in `digitalWrite` isn't the pin the yellow wire sits in. Fix changes **the wire**, not the code, so only one thing moves.
- **`pin-not-output`** — no `pinMode(pin, OUTPUT)` in `setup()`: the pin stays a high-impedance input and can't source current. Caught statically in M4 too.
- **`resistor-too-large`** — 10 kΩ (brown-black-orange) instead of 220 Ω (red-red-brown) gives roughly 0.3 mA, which is real current but almost no visible light. *Numbers: (5 V − 2.0 V) / 10 000 Ω ≈ 0.3 mA vs (5 V − 2.0 V) / 220 Ω ≈ 13.6 mA — consistent with the 220 Ω figure already in project 1.*
- **`led-dead`** — only reachable after wiring has been re-checked and the LED has lit nothing in the direct-5V test AND a swap or a second LED confirms (rule 17: never blame the part first).

### Probes

| id | kind | cost | prompt |
|---|---|---|---|
| `safety-danger-signs` | question | 1 | Is anything smoking, smelling burnt, or too hot to touch? *(phase: safety, global)* |
| `on-light` | question | 1 | Is the small green ON light on the Arduino lit? |
| `direct-5v-test` | test | 2 | Power off. Move the wire that runs from the pin to the LED's column so it goes to the **5V** pin instead. Leave the resistor exactly where it is. Power on. Does the LED light? *(splitsCodeFromHardware: true, powerOff: true)* |
| `legs-different-columns` | question | 1 | Are the LED's two legs in two different numbered columns? |
| `long-leg-side` | question | 1 | The LED's long leg — is it in the column the wire from the board arrives at, or the column the resistor leads to GND from? |
| `gnd-wire-present` | question | 1 | Follow the resistor's far end. Does a wire run from that column to a GND pin on the board? |
| `resistor-bands` | question | 1 | What are the first three colour bands on the resistor? (red-red-brown / brown-black-orange / something else) |
| `blink-builtin` | test | 3 | Upload the Blink example (it uses the board's own LED, no wiring). Does the tiny L light next to pin 13 blink? *(splitsCodeFromHardware: true)* |
| `code-pin-matches-wire` | question | 1 | Does the pin number in your `digitalWrite` line match the numbered pin the wire is actually plugged into? |
| `reseat` | test | 2 | Power off. Push both LED legs and both wire ends fully down into their holes. Power on. Does it light now? *(powerOff: true)* |
| `swap-led` | test | 4 | Swap in a different LED, same holes, same way round. Does the new one light? *(needs: spare-part)* |

Representative outcome → effects (full table in the content file):

- `direct-5v-test` → **`lights`**: `rules_out` `led-dead`, `led-backwards`, `led-legs-same-strip`, `gnd-path-missing`, `loose-leg`; `strong` `pin-mismatch`, `pin-not-output`, `sketch-not-uploaded`. → **`stays-dark`**: `rules_out` `pin-mismatch`, `pin-not-output`, `sketch-not-uploaded`; `strong` `led-backwards`, `gnd-path-missing`, `led-legs-same-strip`, `loose-leg`.
  *This is the single highest-value probe in the tree: one wire move splits code from hardware, and it never asks the student to remove the resistor (section 10).*
- `long-leg-side` → **`gnd-side`**: `confirms` `led-backwards`. → **`pin-side`**: `rules_out` `led-backwards`. → **`cant-tell`**: no effects, probe skipped.
- `on-light` → **`no`**: `strong` `sketch-not-uploaded`, and `handoff: 'upload-fails'` (the board isn't running anything; the LED tree is the wrong tree).
- `blink-builtin` → **`no-blink`**: `handoff: 'upload-fails'`. → **`blinks`**: `against` `sketch-not-uploaded` — the board and the upload path work.

### Scenario tests for this symptom

`scenarios.test.ts` drives the engine with a scripted student who answers from `fault.answers`. Each case asserts: the right fault is presented, within `scenarioBudget` (8), and that `safety-danger-signs` was probe #1.

| hidden fault | key truthful answers | expected path length |
|---|---|---|
| `led-backwards` | safety `no` → on-light `yes` → direct-5v `stays-dark` → legs-different `yes` → long-leg `gnd-side` (confirms) | ≤ 5 |
| `pin-mismatch` | direct-5v `lights` → code-pin-matches `no` | ≤ 4 |
| `gnd-path-missing` | direct-5v `stays-dark` → gnd-wire-present `no` | ≤ 4 |
| `led-legs-same-strip` | direct-5v `stays-dark` → legs-different `no` | ≤ 4 |
| `resistor-too-large` | direct-5v `stays-dark` → legs `yes` → long-leg `pin-side` → resistor-bands `brown-black-orange` | ≤ 6 |
| `led-dead` | direct-5v `stays-dark`, wiring answers all correct, reseat `no`, swap-led `lights` (confirms) | ≤ 8 |

Plus the invariant tests from 7.5: safety-first ordering, undo restores exact prior state (deep-equal on the whole `FixState`), and a fault ruled out by "the fix didn't work" is never presented again in the same session.

---

## 7. Content draft — "Upload fails"

Symptom `upload-fails` · category `board-and-upload` · slug `/fix/arduino-upload-fails`.
Search phrases: "avrdude not in sync", "arduino upload error", "arduino port greyed out", "arduino not detected", "board at com3 is not available".
Sweep: `safety-danger-signs` → `on-light` → `port-listed` → `port-appears-on-replug`.

### Faults

| id | prior | category | title |
|---|---|---|---|
| `wrong-port-selected` | 0.16 | upload | The wrong port is selected in Tools → Port |
| `charge-only-cable` | 0.14 | upload | The USB cable only carries power, not data |
| `missing-usb-driver` | 0.12 | upload | The CH340 clone driver isn't installed |
| `wrong-board-selected` | 0.11 | upload | The wrong board is selected in Tools → Board |
| `pins-0-1-occupied` | 0.10 | wiring | Something is wired to pins 0 and 1, the USB serial lines |
| `old-bootloader-clone` | 0.09 | upload | A clone Uno needing the "Old Bootloader" processor option |
| `port-held-by-another-program` | 0.07 | upload | Another program is holding the port open |
| `board-not-powered` | 0.07 | power | The board isn't powering up at all |
| `usb-hub-or-adapter` | 0.05 | environment | A hub, dock or charge-adapter in the way |
| `short-browning-out-board` | 0.05 | power | A short in the circuit pulls the board down mid-upload — **danger: true** |
| `compile-error-not-upload` | 0.04 | code | It isn't an upload failure — the sketch never compiled |

Note on `board-not-powered`: presented with an instruction to try a different USB cable **and** a different USB port before anything is called dead, and never a conclusion of "damaged board" in V0 — I'd rather end on "no confident answer, take it to your lab" than tell a student to buy a board (principle 10). Flagging that as a deliberate content decision for you to confirm.

### Probes

| id | kind | cost | prompt |
|---|---|---|---|
| `safety-danger-signs` | question | 1 | *(shared, phase: safety)* |
| `on-light` | question | 1 | Is the small green ON light on the Arduino lit? |
| `port-listed` | question | 1 | Open Tools → Port. Is any port listed? (one / more than one / none / not sure) |
| `port-appears-on-replug` | test | 2 | Look at the port list. Unplug the board, look again, plug it back in, look again. Did a port disappear and come back? |
| `error-family` | question | 1 | Which of these does your error look most like? *(outcomes are the `UploadError` families, shown as their plain-language meanings, not raw text — see Q3)* |
| `disconnect-pins-0-1` | test | 2 | Power off. Unplug anything connected to pins 0 (RX) and 1 (TX). Power on and upload again. Does it upload? *(powerOff: true)* |
| `close-other-programs` | test | 1 | Close the Serial Monitor and any other program using the port, then upload again. Does it upload? |
| `bare-board-upload` | test | 3 | Disconnect every wire from the board, then upload the Blink example. Does it upload? *(splitsCodeFromHardware: true)* |
| `try-other-cable` | test | 3 | Try a different USB cable — ideally one you know transfers files from a phone. Does a port appear now? *(needs: spare-part)* |
| `direct-not-hub` | question | 1 | Is the board plugged straight into the computer, or through a hub, dock or adapter? |
| `try-old-bootloader` | test | 3 | In Tools → Processor, choose the "Old Bootloader" option, then upload again. Does it upload? |
| `board-origin` | question | 1 | Is the board an official Arduino (holds the Arduino logo, usually costs a lot more) or an inexpensive clone? |

Representative outcome → effects:

- `port-listed` → **`none`**: `strong` `charge-only-cable`, `missing-usb-driver`, `board-not-powered`, `usb-hub-or-adapter`; `rules_out` `wrong-port-selected`, `old-bootloader-clone`.
- `port-appears-on-replug` → **`yes`**: `rules_out` `charge-only-cable`, `missing-usb-driver`; `strong` `wrong-port-selected`, `wrong-board-selected`, `old-bootloader-clone`, `pins-0-1-occupied`. → **`no`**: `strong` `charge-only-cable`, `missing-usb-driver`. This one probe splits "the computer can't see the board at all" from "it can see it but the handshake fails", which is the whole upload tree in half.
- `bare-board-upload` → **`uploads`**: `confirms`-level evidence for `pins-0-1-occupied` / `short-browning-out-board` (the circuit is the problem); a follow-up `next: 'disconnect-pins-0-1'` narrows which.
- `on-light` → **`no`**: `strong` `board-not-powered`, `charge-only-cable`; `against` everything selection-related.
- `board-origin` → **`official`**: `rules_out` `old-bootloader-clone`, `missing-usb-driver` (a genuine Uno uses the on-board ATmega16U2 and needs no extra driver). **`clone`**: `weak` both. *// VERIFY: I'm confident genuine Unos need no separate driver on current macOS/Windows; confirm before ship.*

### Scenario tests

| hidden fault | key truthful answers | budget |
|---|---|---|
| `charge-only-cable` | on-light `yes` → port-listed `none` → port-appears-on-replug `no` → try-other-cable `port-appears` (confirms) | ≤ 5 |
| `wrong-port-selected` | port-listed `more-than-one` → port-appears-on-replug `yes` → error-family `not-in-sync` → (selection branch) | ≤ 6 |
| `missing-usb-driver` | port-listed `none` → replug `no` → try-other-cable `still-none` → board-origin `clone` | ≤ 6 |
| `pins-0-1-occupied` | replug `yes` → bare-board-upload `uploads` → disconnect-pins-0-1 `uploads` (confirms) | ≤ 5 |
| `old-bootloader-clone` | replug `yes` → bare-board `still-fails` → board-origin `clone` → try-old-bootloader `uploads` (confirms) | ≤ 6 |
| `port-held-by-another-program` | error-family `port-busy` → close-other-programs `uploads` (confirms) | ≤ 4 |

---

## 8. Questions (blocking ones marked ⛔)

**⛔ Q1 — `Fault.answers` (scenario ground truth).** Section 7.5 needs a scripted student, and the only honest source for "what would a student with this exact fault answer" is the content author. I propose the `answers` map above, validated for completeness. It is a data-model change, so I want explicit approval. The alternative — encoding scripted students in the test file — drifts from content silently, which is the failure mode we're trying to avoid.

**⛔ Q2 — part library scope.** V0 health checks name ~17 parts; we have 5. Full `Part` records need pins, specs, polarity, glossary and an SVG `drawing` each — that's real work and real datasheet sourcing. My recommendation: extend the **same** library incrementally, adding `category` and `photo` to `partSchema` now so the Fix parts picker can list a part before its diagram exists, with `drawing` becoming optional and a health check refusing to publish without one. Yes to that, or do you want the full 17 sourced up front in M3?

**⛔ Q3 — real error text.** Section 8.2 says verify exact wording against current Arduino IDE 2 and avrdude, and section 17 forbids inventing error messages. I will not write regexes from memory. Can you paste real output for: not-in-sync, port busy / access denied, board-not-found, and a missing-header compile error, from the IDE version your students actually run? Until then `error-family` ships showing plain-language descriptions only (no raw strings), every `UploadError` stays `verified: false`, and the build warns.

**Q4 — session logging and share links.** M5/M6 need a server. V0 has localStorage only, no Supabase. Do I keep everything client-side through M5 (share links encode the session in the URL — works offline, no backend, but long URLs and no analytics), or stand up Supabase at M5?

**Q5 — board scope for V0.** Confirming Uno only for M1–M7, with `boardIdSchema` written to extend.

**Q6 — routes and nav.** `/fix` and `/check` as top-level siblings of `/projects` and `/parts`, with Fix promoted on the home page. Agreed?

**Q7 — "one action per step" enforcement.** I want validation rule 6 above (rejecting " and then " in a fix step) to be a hard build failure. It will occasionally be annoying to author around. Hard fail, or warning?

**Q8 — LED symptom overlap.** `resistor-too-large` really produces "LED is dim", a separate symptom in section 5. I've kept it in `led-doesnt-light` because a 10 kΩ LED in daylight reads as "not lighting" to a student. Confirm that faults may legitimately live in several symptom trees (`appliesTo.symptoms` is already a list).

---

## 9. What I build the moment you approve (M1)

1. `lib/fix/schema.ts` + `validate.ts`, wired into `npm run content:check` so bad fix content fails the build.
2. `lib/fix/engine/*` — pure `next(state, content)`, weights config, undo.
3. `scenarios.test.ts` — the harness plus the 12 scenarios above, all under 8 probes.
4. The two symptom content files as drafted, every claim carrying a source or a `// VERIFY:` awaiting your sign-off in `PARTS_SOURCES.md`.
5. A deliberately bare `/fix` UI that runs a diagnosis end to end — enough to click through a wrong-port setup and a backwards LED, no design work (that's M2).

**M1 is done when** every scenario test passes in CI and you can sit at a real Uno with a backwards LED and a wrong port selected and reach the right cause in the browser.
