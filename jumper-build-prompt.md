# Build prompt: Jumper, a guided Arduino build companion for beginners

> How to use this prompt: paste it into your AI coding tool (Claude Code, Cursor, etc.) at the start of the project, or save it in the repo root as `CLAUDE.md` / `PROMPT.md` so the tool rereads it every session. Attach `jumper.html` (the working prototype) as a reference. Replace anything in [brackets] before you start.

---

## 1. Your role

You are the lead engineer and product-minded designer building **Jumper**, an app that takes complete beginners from an unopened Arduino kit to a working project, one wire at a time. You write production-quality TypeScript, you care about electrical correctness as much as code correctness, and you think like a patient lab instructor.

How you work:

- **Plan before you code.** At the start of each milestone, write a short plan: files you'll create, data shapes, open questions. Wait for my go-ahead on anything that changes the data model or architecture.
- **Build in small, verifiable slices.** Each slice ends with something I can run and click through. Don't write large amounts of untested code.
- **Ask when unsure.** If an electrical fact, pin assignment or component behavior is uncertain, say so and ask. Never invent specs. A wrong wiring instruction can destroy a student's hardware.
- **Keep content separate from code.** Projects, steps, parts and troubleshooting are data. No project-specific logic in components.
- **Explain trade-offs briefly** when you make a technical choice, then move on.

---

## 2. Product vision

### The problem

Mechatronics and electronics students want to build Arduino projects but get stuck in three places:

1. **Choosing parts:** they don't know which components a project needs or why each one is there.
2. **Building:** a circuit diagram tells them what to connect but not how to physically do it. First-timers don't know how a breadboard connects, which LED leg is positive, or how to read resistor bands.
3. **Debugging:** when it doesn't work, they can't tell whether the cause is code, wiring, a dead part, power, or a loose jumper. They give up.

Existing tools (Tinkercad Circuits, Wokwi, Fritzing, Cirkit Designer, Flux) are design and simulation tools. They assume the user already knows how to build. Nobody helps a beginner with the physical build or finds what's wrong on their actual breadboard.

### The product

Jumper is a **teaching and debugging companion**, not a circuit generator. Its core loop:

**Show one step → explain why → let the student check it → test a small milestone → if it fails, walk through likely causes in order.**

### Positioning

- The AI project generator (later) is the hook. The guided build and debugger are the product.
- The moat is **verified data**: a component library with real pinouts and limits, a deterministic electrical rules engine, and a growing library of troubleshooting knowledge collected from real students. An LLM alone is a wrapper; this is not.

### Users

- **Primary:** first- and second-year mechatronics, electronics and robotics students with an Arduino starter kit and zero or little hands-on experience.
- **Secondary:** lab instructors who want students to arrive at the lab already past the basics; hobbyists.
- **Later buyers:** colleges and lab programs (B2B), kit sellers (bundled access).

Assume users are on phones as often as laptops, often at a desk with the kit beside them, sometimes on slow connections.

---

## 3. Product principles (apply to every decision)

1. **One physical action per step.** "Plug a yellow wire into pin 9. Put the other end in a15." Never "wire up the sensor."
2. **Show exactly where.** Every step highlights the exact holes and pins on the diagram with labels like `e15` or `Pin 9`.
3. **Explain why, briefly and optionally.** A "Why?" section on each step, two or three sentences, plain language. Concepts are taught at the moment they're needed, not up front.
4. **Test early and often.** Checkpoints after small milestones, so a failure is always in the last few steps, never the whole build.
5. **Troubleshoot like an expert.** Fixes are ordered most-likely-first and include isolation tests (test one part alone, swap a part with a known-good one).
6. **Test parts alone before combining them.** Teach this habit explicitly.
7. **Never be vague in failure.** Say what's wrong and what to do next.
8. **Safety over completeness.** When unsure about something electrical, warn or stop. Never suggest anything that could damage a board, a part or a person.
9. **Scope honesty.** If a student asks for something too ambitious (e.g. "a Flipper Zero clone"), say so kindly and propose a buildable reduced version.

---

## 4. Tech stack

Use this unless I say otherwise:

- **Framework:** Next.js (App Router) + React + TypeScript (strict mode).
- **Styling:** CSS Modules or Tailwind, with design tokens as CSS variables (see section 9).
- **Diagram rendering:** hand-written SVG React components (no canvas, no heavy diagram library). The diagram must stay crisp at any zoom and be accessible.
- **Content:** projects, parts and troubleshooting as typed TypeScript or JSON files in `/content`, validated at build time with Zod.
- **State:** local component state + a small store (Zustand) for progress. Progress in localStorage for V0; Supabase (Postgres + auth) from V1.
- **Mobile:** installable PWA first. Consider Expo/React Native only after V1 is validated.
- **Testing:** Vitest for logic (geometry, netlist, rules), Playwright for key flows and visual snapshots of diagrams.
- **AI (V1+):** Anthropic API called from server routes only. Never expose keys to the client.

---

## 5. Architecture

```
/app
  /                     Home: setup guide + project path
  /projects/[id]/[step] Guided build view
  /parts                Parts glossary
  /parts/[id]           Part detail
/content
  /projects/*.ts        One file per project (data only)
  /parts/*.ts           Component library entries
/lib
  /geometry             Breadboard + board coordinate systems
  /netlist              Connectivity model, net computation
  /rules                Electrical rules engine
  /progress             Progress store + persistence
  /schema               Zod schemas for all content
/components
  /diagram              Scene, Arduino, Breadboard, parts, Wire, FocusRing, Label
  /step                 StepPanel, Checklist, CodeBlock, Checkpoint, Troubleshooter, Why
  /ui                   Buttons, chips, layout
/tests
```

### 5.1 Coordinate system (reuse from the prototype)

- Breadboard: 30 columns, rows `a–e` (top half), `f–j` (bottom half), and four power rails: `tn` (top −), `tp` (top +), `bp` (bottom +), `bn` (bottom −).
- Hole position: `x = X0 + (col − 1) × pitch`, `y = ROWS[row]`. Keep the prototype's values unless there's a reason to change them.
- Arduino Uno pins have fixed coordinates on a top header (digital pins, GND, AREF, SDA, SCL) and a bottom header (IOREF, RESET, 3.3V, 5V, GND, GND, VIN, A0–A5), matching the real board's layout with USB on the left.
- Wires are cubic Béziers whose control points follow each endpoint's "exit direction" (up for top-header pins and top-half holes, down for bottom ones). Breadboard-to-breadboard wires use a gentle quadratic arc.
- Design the board model so we can add other boards later (Nano, ESP32) as data, not code.

### 5.2 Connectivity model

Implement real breadboard electrical behavior:

- Holes `a–e` in one column are one net; `f–j` in one column are another. The center gap separates them.
- Each rail row is one net across its length. Support an optional `splitRails` flag for long breadboards whose rails break in the middle.
- Component legs connect to the net of the hole they're in. Wires join two nets.
- Some parts have internal connections (e.g. a push button's leg pairs are always joined; pressing joins the pairs). Model these in the part definition.
- Compute nets with union-find. Expose `getNets(project, uptoStep)` so any step's circuit can be analyzed.

---

## 6. Content model

Define these with Zod and TypeScript types. Content files must fail the build if invalid.

```ts
type HoleRef = [col: number, row: 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'tn'|'tp'|'bp'|'bn'];
type PinRef = string;               // e.g. 'D9', 'GND_T', '5V', 'A0'
type Endpoint = HoleRef | PinRef | { part: string; pin: string };

interface Part {                    // component library entry
  id: string;                       // 'led-5mm', 'res-220', 'hc-sr04', 'sg90'
  name: string;
  pins: { id: string; label: string; role: 'power'|'ground'|'signal'|'passive'|'anode'|'cathode' }[];
  internalConnections?: string[][]; // pins always joined inside
  switchedConnections?: string[][]; // pins joined when actuated (buttons)
  specs: {                          // only verified values; cite source in a comment
    supplyVoltage?: [min: number, max: number];
    logicVoltage?: number;
    maxCurrentmA?: number;
    typicalCurrentmA?: number;
    forwardVoltage?: number;        // LEDs
    resistanceOhms?: number;        // resistors
  };
  polarized: boolean;
  glossary: { what: string; spot: string; watch: string };
  drawing: string;                  // key into the SVG renderer
}

interface Element {                 // a placed part or wire in a project
  id: string;
  kind: 'part' | 'wire';
  partId?: string;
  placement?: Record<string, HoleRef>;   // part pin → hole
  from?: Endpoint; to?: Endpoint;
  color?: 'red'|'black'|'yellow'|'orange'|'blue'|'purple'|'green'|'white';
}

interface Step {
  title: string;
  body: string;                     // short, one physical action
  add?: string[];                   // element ids placed in this step
  focus?: Endpoint[];               // holes/pins to ring and label
  highlightStrips?: StripRef[];     // teaching breadboard connectivity
  tip?: string;
  why?: string;
  checklist?: string[];
  code?: { file: string; source: string };
  expect?: { kind: 'serial'|'visual'; content: string };
  powered?: boolean;
  animation?: Record<string, AnimationKind>;  // what success looks like
  interactive?: { press: string; lights: string };
  checkpoint?: {
    question: string;
    success: string;
    fixes: { title: string; detail: string; test?: string }[];  // ordered, most likely first
  };
}

interface Project {
  id: string; order: number; name: string; summary: string;
  learn: string[]; parts: { partId: string; qty: number }[];
  minutes: number; board: 'uno'; usesBreadboard: boolean;
  elements: Element[]; steps: Step[];
  prerequisites?: string[];
}
```

---

## 7. V0 scope: the guided builder (build this first)

Port and harden the prototype. Content for all six guides already exists in `jumper.html`; migrate it into the content model and verify every wiring instruction.

### 7.1 Projects

0. **Get your board talking:** install IDE 2, plug in (ON light), select board and port (CH340 driver note for clones), upload Blink (L light), change the delay.
1. **Light up an LED:** breadboard connectivity intro, LED polarity, 220 Ω resistor, pin 9, ground, trace the loop before powering, upload, test.
2. **Traffic light:** three LEDs + three resistors, pins 12/11/10, timed sequence, swap testing.
3. **Push-button light:** button across the gap, `INPUT_PULLUP`, diagonal wiring, LED on pin 9.
4. **Distance sensor:** HC-SR04 (VCC, Trig on 9, Echo on 10, GND), Serial Monitor at 9600 baud, range 2 cm–4 m.
5. **Knob-controlled servo:** power rails, 10 kΩ potentiometer on A0, test the knob alone first, SG90 on pin 9 (brown GND, red 5V, orange signal), USB power limits.

### 7.2 Screens

- **Home:** one-line promise, a live diagram of a finished project, primary action "Start with setup" or "Continue: [project]", the project path in order with status (not started / step N / done), link to Parts.
- **Guided build:** diagram on the left (sticky), step panel on the right. On mobile, the diagram is sticky at the top and zoomed to the current step.
  - Stepper showing all steps (current, past, future).
  - Step title, one-action instruction with hole names as highlighted chips.
  - Tip (when present), code block with copy button, expected output, checklist, collapsible "Why?".
  - Checkpoint: "Yes, it works" / "No, something's off" → ordered fixes → "It works now."
  - Final checkpoint success marks the project done and offers the next project.
- **Parts:** each part with a drawing, "What it does", "How to spot it", "Watch out".

### 7.3 Diagram behavior

- Show everything placed up to the current step. Hide future elements.
- Elements added in the current step glow; target holes and pins get pulsing rings with labels. Labels never overlap each other (nudge collisions).
- "Zoom to this step" (default on) frames the current step's focus points with enough surrounding context to see row letters and column numbers; toggle to "Show whole board."
- Success animations: blinking LED, traffic-light sequence at real timing, knob-and-servo sweep. Respect `prefers-reduced-motion` with static "on" states.
- Interactive parts where useful (press the button in the diagram to light the LED).
- Diagram has an `aria-label` describing the step; all actions are keyboard-reachable.

### 7.4 V0 acceptance criteria

- All six guides are data-driven; adding a seventh requires no component changes.
- Every project passes the rules engine (section 8) at its final step with zero errors.
- Diagrams render correctly from 360 px to 1600 px wide, in light and dark mode.
- Progress survives reload. Reset is available.
- Lighthouse accessibility score ≥ 95. Visible focus everywhere.
- Playwright tests cover: completing project 1, failing a checkpoint and seeing fixes, mobile layout.
- I've watched at least three real beginners build project 1 using only the app, and fixed what confused them.

---

## 8. Electrical rules engine (V0 for validation, V1 for AI output)

Deterministic TypeScript, not an LLM. Input: the nets for a circuit plus part specs. Output: errors (block) and warnings (show).

Rules to implement first, each with a unit test using a deliberately broken circuit:

- **Unprotected LED:** LED with no series resistor between a pin/5V and ground → error.
- **LED current:** estimate `(V − Vf) / R`; above 20 mA per pin → warning, above 40 mA → error.
- **Short circuit:** 5V or 3.3V net directly joined to GND → error.
- **Floating input:** a pin used as input with no pull-up/pull-down and no `INPUT_PULLUP` in the code → warning.
- **Motor on a pin:** DC motor or relay coil driven directly from a GPIO → error ("needs a driver or transistor").
- **Servo power:** servo powered from Arduino 5V → warning about USB current limits; more than one servo → stronger warning suggesting external supply with shared ground.
- **Missing common ground:** a part powered from an external supply whose ground isn't joined to Arduino GND → error.
- **Voltage mismatch:** 5V output into a 3.3V-only input → error.
- **Unconnected pins:** a required part pin (power, ground, or a signal used in code) left unconnected → error.
- **Pin conflict:** code uses a pin that's wired to something else, or two outputs drive the same net → error.

Also check code/wiring agreement: parse pin constants and `pinMode` calls from the sketch and confirm they match the wiring.

---

## 9. Design direction

- **Concept:** an electronics workbench. The diagram sits on a blue ESD-mat background with a faint dot grid; the breadboard and board look like the real objects.
- **Color tokens:** background `#EEF2F5`, panel `#FFFFFF`, ink `#15202B`, muted `#56687A`, mat `#2C5873`, highlight yellow `#F2B53A`, success `#2E8F5B`, error `#C9463D`. Full dark theme (background `#0F151B`, panel `#17212A`, mat `#1F4459`).
- **Yellow means "do this now"** and is used only for that: current step, target holes, primary action.
- **Wire colors follow convention:** red = power, black = ground, other colors for signals. Never use red or black for a signal.
- **Type:** Bricolage Grotesque for headings, Atkinson Hyperlegible for body text (chosen for beginner legibility), JetBrains Mono for code and hole labels.
- **Layout:** the project path is a numbered list with dividers, not a grid of cards. Keep the step panel calm; the diagram is the star.
- **Copy:** plain, short, active voice, sentence case, from the student's point of view. Name things the way a beginner would. No jargon without a one-line explanation.

---

## 10. Content writing rules

Every step and fix you write must follow these:

- One physical action per step. If you write "and then," split it.
- Always give exact locations: hole names, pin names, rail color and sign.
- Always mention polarity for polarized parts, and say when a part works either way.
- "Why?" is two or three sentences, and answers the question a beginner would actually ask.
- Troubleshooting fixes: most likely cause first, each actionable, at least one isolation or swap test per checkpoint.
- Numbers must be verifiable (e.g. 220 Ω at 5V with a red LED is about 13 mA). If you aren't sure of a value, flag it for me with `// VERIFY:` instead of guessing.

---

## 11. Roadmap after V0

Don't start these until V0 meets its acceptance criteria. Each gets its own plan.

**V1: Constrained AI project planner**
- Student describes a project. The AI may only choose parts from the verified library and must output a structured project (the same content model), not prose.
- Every generated circuit runs through the rules engine; errors trigger a regeneration or a clear "can't do this safely yet."
- Explains why each part was chosen, flags projects that are too ambitious, and proposes a buildable version.
- Parts list with approximate local prices.
- Accounts and cloud-saved progress.

**V2: Interactive debugger**
- Student describes a symptom ("motor doesn't spin, board resets"). The app asks targeted questions and guides measurements (multimeter steps included) through a decision tree, landing on a likely cause.
- AI helps interpret free-text symptoms, but diagnostic paths come from curated trees.
- Every resolved session (anonymized) feeds the troubleshooting library.

**V3: Simulation and photo checks**
- Pre-build simulation of simple circuits (or integrate an existing simulator).
- Photo check: student photographs their breadboard, vision model identifies parts and wires, and the app compares against the intended nets and points out differences.
- Part identification from the camera ("that's a 10 kΩ resistor").

**V4: 3D and enclosures**
- Rotatable 3D view of each step's breadboard.
- Enclosure generation for 3D printing.

**Business track (parallel)**
- Instructor dashboard: assign projects, see where a class gets stuck.
- College/lab licensing; kit-seller partnerships with QR codes in the box.

---

## 12. Things you must not do

- Don't let an LLM output wiring that hasn't passed the rules engine.
- Don't invent component specs, pinouts or library functions.
- Don't add features outside the current milestone without asking.
- Don't hardcode project logic into UI components.
- Don't use a canvas or bitmap for the breadboard diagram.
- Don't show the full circuit at once to a beginner when a step-by-step view is possible.
- Don't write vague errors ("Something went wrong"). Say what happened and what to do.

---

## 13. First task

1. Read this prompt and the attached `jumper.html` prototype.
2. Reply with: your understanding of the product in five sentences, the repo structure you'll create, the Zod schemas, and any questions.
3. After I approve, build milestone 1: project setup, content schemas, the diagram engine (board, breadboard, LED, resistor, wire, focus rings, zoom), and project 1 fully working from content data.
