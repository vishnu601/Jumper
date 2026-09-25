# Build prompt: Jumper Fix, the "my circuit isn't working" debugger and component health check

> How to use this prompt: this is a module of Jumper. Keep the main build prompt (`CLAUDE.md`) in the repo root and save this file as `docs/prompts/fix-mode.md`. At the start of each session on this module, tell your AI coding tool: "Read CLAUDE.md and docs/prompts/fix-mode.md, then continue from PLAN.md." Everything in `CLAUDE.md` (stack, design tokens, content rules, safety rules, the component library and the rules engine) still applies. Where this file is more specific, this file wins.

---

## 1. Your role

You are the lead engineer building **Jumper Fix**, the part of Jumper that helps a student whose circuit is already built and not working. You think like an experienced lab instructor who has seen the same fifty mistakes a thousand times: calm, methodical, and always checking the boring causes first.

How you work:

- Plan each milestone before coding. Show me data shapes and file changes, and wait for approval on anything that changes the data model.
- Build in thin slices I can click through.
- Never invent electrical facts, error messages, pinouts or library behavior. If you're unsure, write `// VERIFY:` and ask me.
- Diagnostic knowledge is **content**, not code. The engine is generic; faults, tests and fixes live in data files.
- A wrong diagnosis wastes a student's night. A dangerous one can hurt them. Correctness beats coverage every time.

---

## 2. The problem this module solves

The guided builds in Jumper only help students who start a project inside the app. Most students arrive differently:

- They followed a YouTube video or a senior's code, and it doesn't work.
- It's late, the submission is tomorrow, and they've already rewired it twice.
- They don't know whether the cause is the code, a wire, a dead part, power, or the board itself.
- They search things like "HC-SR04 always shows 0", "servo not working arduino", or "avrdude not in sync".

Two things fail them today:

1. **Nobody diagnoses systematically.** Forums and chatbots give ten guesses at once. The student tries them randomly and learns nothing.
2. **Nobody suspects the part.** Students lose hours on code and wiring when the sensor was dead from the start.

Jumper Fix answers two questions:

- **"Why isn't my circuit working?"** A guided diagnosis that asks one question or test at a time, cheapest and most likely first, until it finds the cause.
- **"Is this part even working?"** A 60-second health check for each component, tested on its own.

This is also Jumper's **acquisition channel**. Every common problem gets a fast, public, search-friendly page that opens straight into the interactive diagnosis.

---

## 3. Diagnosis principles (the engine and all content must follow these)

1. **Safety first, always.** Before anything else, check for danger signs (see section 10). If any are present, stop and tell the student to unplug.
2. **Boring causes first.** Power, ground, loose wires, wrong port, wrong pin number and baud-rate mismatches cause most failures. Check them before anything clever.
3. **Cheapest test first.** Prefer a question ("Is the ON light lit?") over a test ("Upload this sketch") over a measurement ("Use a multimeter"). Weigh cost against how much the answer narrows things down.
4. **Split the problem in half.** Separate code from hardware, then this part from that part. Example: "Does the Blink example work?" instantly separates board-and-upload problems from project problems.
5. **Isolate before you blame.** Test a suspect part on its own with a known-good circuit and test sketch before concluding it's faulty.
6. **Swap to confirm.** When a part is suspected, swapping it with a known-good one (or moving it to a known-good spot) is often the fastest proof.
7. **One change at a time.** Every fix step asks the student to change exactly one thing and then retest.
8. **Always verify the fix.** After a fix, retest the original symptom. If it's still there, rule that cause out and continue; never loop back to it.
9. **Teach while fixing.** Each identified cause comes with a short "Why this happened" so the student doesn't repeat it.
10. **Say when you don't know.** If the evidence doesn't point anywhere confidently, say so, summarize what's been ruled out, and suggest the next best step (ask an instructor, post the summary to a forum).

---

## 4. User flows

### 4.1 Fix flow ("Something's not working")

1. **Entry.** From the home page, a symptom page (section 9), or a shared link. One prominent action: "Fix my circuit."
2. **Safety check.** One screen, three quick yes/no questions: burning smell or smoke; anything hot to touch; anything connected to mains or a battery above 12 V. Any yes -> safety stop screen.
3. **What are you using?** Pick the board (Uno for V0; design for Nano, Mega and ESP32 later). Pick the parts in the circuit from a searchable list with pictures, grouped by type. Remember recent selections.
4. **What's happening?** Pick a symptom from categories (section 5). Optional extras, each clearly marked optional:
   - Free-text description ("The motor twitches and the board keeps restarting").
   - Paste the code.
   - Paste the error message or the Serial Monitor output.
   - Describe the wiring (a quick pin-by-pin form per part: "HC-SR04 VCC -> 5V, Trig -> pin 9...").
5. **Instant findings.** Before asking questions, run static checks on whatever was provided (sections 7 and 8). If a check finds a definite problem (for example, `Serial.begin(115200)` in the code but garbled output in the Serial Monitor at 9600), show it first as "Likely cause found" with the fix and a verify step.
6. **Guided diagnosis.** One card at a time: a question, a test (with a copyable test sketch and a small diagram when wiring is involved) or a measurement. Answers are buttons, not free text. Every card has "I'm not sure" and "I can't do this" options, which the engine treats as no information and routes around.
7. **Cause found.** Show the cause, the fix as numbered one-action steps, and "Why this happened." Then ask: "Retest. Does it work now?"
   - Yes -> success screen, "What fixed it" summary, option to save or share the session, and a one-tap "Was this helpful?"
   - No -> rule out that cause and continue the diagnosis.
8. **No confident answer.** Show a summary: symptom, parts, everything tested and its result, what's ruled out, and the remaining suspects. Offer "Copy summary" (formatted for a forum post or a WhatsApp message to a senior) and "Check a part" (jump to health checks for the remaining suspects).
9. **Always visible:** a sense of progress ("3 causes ruled out"), Back (undo the last answer), and Start over.

### 4.2 Health check flow ("Is this part working?")

1. Pick a part from the library (search and pictures), or arrive from a diagnosis suggestion.
2. Show what you need (usually the board, the part and a few wires), with a no-multimeter path wherever possible.
3. Show the minimal wiring with the same SVG diagram engine as guided builds (one action per step, hole labels, focus rings).
4. Provide a test sketch with a copy button, and what to expect ("numbers between 2 and 400 that change as you move your hand").
5. Result buttons: "Works as expected", "Something different" (choose from the likely readings), "Nothing at all."
6. Verdict: **Healthy**, **Faulty (replace it)**, or **Inconclusive**, each with the reasoning and what to check next. Never declare a part dead without at least one wiring re-check and, where possible, an alternative test.

### 4.3 Board self-test

A special health check for the Arduino itself, since students often suspect it last:

1. Power and ON light.
2. Upload Blink (separates upload problems from everything else).
3. Serial echo test: the board prints a counter, which checks the USB-serial path and baud rate.
4. Digital pin test: a sketch sets every pin to `INPUT_PULLUP` and prints any pin that reads LOW. The student touches a jumper from GND to each pin in turn and confirms the Serial Monitor reports it. A pin that never changes is suspect.
5. Analog pin test: connect each analog pin to 5V, then to GND, and confirm readings near 1023 and 0.
6. Verdict per pin, plus an overall result.

Warn clearly: the test sketch must never set any pin as OUTPUT while the student is touching pins to GND, and all test connections stay at 5 V or below.

---

## 5. Symptom taxonomy (V0)

Organize symptoms into categories. Each symptom has an id, the plain-language label students would recognize, search phrases, and relevant parts.

**Board and upload**
- Board doesn't power on (no ON light)
- Computer doesn't detect the board / no port listed
- Upload fails with an error
- Upload succeeds but nothing happens
- Board keeps resetting or restarting

**Code and Serial Monitor**
- Code won't compile
- Serial Monitor shows nothing
- Serial Monitor shows garbled symbols
- Readings are stuck at 0, 1023, or one value
- Readings jump around randomly

**Outputs**
- LED doesn't light
- LED is always on / can't be turned off
- LED is dim
- Buzzer silent or only clicking
- Relay doesn't switch, or switches the opposite way

**Inputs and sensors**
- Button does nothing / always reads pressed / acts randomly
- Potentiometer reading doesn't change
- Distance sensor (HC-SR04) reads 0, "no echo", or wrong values
- Temperature sensor (DHT11/DHT22) reads NaN or fails
- IR sensor module always on or always off
- LDR reading doesn't change with light

**Motors**
- Servo doesn't move
- Servo jitters, buzzes or twitches
- DC motor doesn't spin (with L298N or a transistor)
- Motor spins one way only / one motor dead
- Board resets when the motor starts

**Displays**
- 16x2 LCD blank / shows only blocks
- I2C LCD shows nothing
- OLED shows nothing

**Other**
- "It worked yesterday and now it doesn't"
- "Something else" (free text, handed to the AI layer in section 11)

---

## 6. Knowledge model

All of this lives in `/content/fix/` as typed, Zod-validated data. The build fails on invalid content.

```ts
type Weight = 'confirms' | 'strong' | 'weak' | 'neutral' | 'against' | 'rules_out';

interface Fault {
  id: string;                       // 'baud-mismatch', 'hcsr04-trig-echo-swapped'
  title: string;                    // student-facing: "Trig and Echo wires are swapped"
  category: 'power'|'upload'|'code'|'wiring'|'part'|'board'|'environment';
  appliesTo: {
    symptoms: string[];             // symptom ids where this fault is possible
    parts?: string[];               // only relevant if these parts are present
    boards?: string[];
  };
  prior: number;                    // 0-1, how common among students with these symptoms
  fix: {
    steps: string[];                // one action each
    why: string;                    // 2-3 sentences
    verify: string;                 // how to retest the original symptom
  };
  danger?: boolean;                 // if true, show a safety warning with the fix
  sources?: string[];               // datasheet or doc links backing the claim
}

interface Probe {                   // a question, test or measurement
  id: string;
  kind: 'question' | 'test' | 'measure';
  prompt: string;                   // "Is the green ON light lit?"
  detail?: string;                  // how to do it, one action per line
  cost: 1 | 2 | 3 | 4 | 5;          // 1 = glance, 3 = upload a sketch, 5 = multimeter or rewiring
  needs?: ('multimeter' | 'spare-part' | 'spare-wire')[];
  sketch?: { file: string; source: string; expect: string };
  diagram?: string;                 // id of a small wiring snippet
  appliesTo: { symptoms?: string[]; parts?: string[] };
  outcomes: {
    id: string;                     // 'yes', 'no', 'garbled', 'always-0'
    label: string;
    effects: Record<string /* faultId */, Weight>;
    next?: string;                  // optional forced follow-up probe
  }[];
  requires?: { probe: string; outcome: string }[];  // only ask after these answers
}

interface HealthCheck {
  partId: string;
  needs: string[];
  noMultimeter: boolean;
  steps: GuidedStep[];              // reuse the guided-build step type
  sketch?: { file: string; source: string };
  expected: string;
  results: {
    id: string; label: string;
    verdict: 'healthy' | 'faulty' | 'inconclusive';
    explanation: string;
    nextChecks?: string[];
  }[];
}

interface UploadError {
  id: string;
  patterns: string[];               // regexes matched against pasted error text
  meaning: string;                  // plain language
  faults: Record<string, Weight>;   // feeds the engine
}

interface SerialPattern {
  id: string;
  test: 'garbled' | 'empty' | 'constant' | 'rails-0' | 'rails-1023' | 'nan' | 'regex';
  regex?: string;
  meaning: string;
  faults: Record<string, Weight>;
}
```

Keep weights coarse on purpose. Authors (you, me, lab instructors) must be able to write content without doing probability math.

---

## 7. The diagnosis engine

Deterministic TypeScript in `/lib/fix/engine`. No LLM in the loop for choosing the next step or declaring a cause.

### 7.1 State

- Candidate faults: every fault whose `appliesTo` matches the chosen symptom, board and parts.
- A score per fault, starting from its `prior`.
- Answer history (for undo, summaries and logging).
- The ruled-out set.

### 7.2 Updating

Map weights to multipliers (start with: confirms x20, strong x4, weak x1.7, neutral x1, against x0.4, rules_out x0). Apply the effects of each answer, renormalize, and drop faults at 0. Keep the numbers in one config file so we can tune them from real session data.

"I'm not sure" and "I can't do this" apply no effects and mark the probe as skipped; the engine picks a different probe.

### 7.3 Choosing the next probe

1. **Forced order first:** safety probes, then the universal sweep for the symptom category (for example: ON light -> does Blink work? -> correct board and port).
2. Otherwise, for each eligible probe (relevant to the remaining faults, requirements met, not already asked, and the student has what it needs), estimate how much it would narrow things down: the expected reduction in uncertainty across its outcomes, using the current scores. Divide by cost. Pick the best.
3. Break ties toward probes that split code from hardware, then toward lower cost.

### 7.4 Stopping

- If the top fault's share is >= 0.7 and at least one probe supported it, or any outcome "confirms" it: present it.
- If the student reports the fix didn't work: rule that fault out and continue.
- If no eligible probes remain, or the student has answered 15 probes without reaching the threshold: go to the "No confident answer" summary with the top three suspects.

### 7.5 Testability

- The engine is a pure function: `next(state, content) -> probe | result`.
- Write **scenario tests**: a scripted student with a known hidden fault who answers each probe truthfully according to that fault. Every fault in the library must be found within a set number of probes (start at 8) for its main symptom. These tests run in CI, so bad content fails the build.
- Also test that safety probes always come first, undo restores the exact previous state, and ruled-out faults never return.

---

## 8. Static checks (instant findings)

Run these on anything the student pastes, before the guided questions. Each finding feeds weights into the engine, and definite findings are shown immediately.

### 8.1 Code checks (deterministic parsing, not an LLM)

Start with these, each with a unit test:

- A pin used with `digitalWrite` or `analogWrite` but never set with `pinMode(..., OUTPUT)`.
- A button read with `digitalRead` on a pin set as `INPUT`, with no external resistor in the described wiring: suggest `INPUT_PULLUP`.
- `analogWrite` on a pin that isn't PWM on the chosen board (Uno PWM pins: 3, 5, 6, 9, 10, 11).
- The Servo library in use together with `analogWrite` on pins 9 or 10 on an Uno (the library takes over that timer).
- `Serial.print` used but no `Serial.begin`; the baud rate in `Serial.begin` recorded for comparison with the Serial Monitor.
- Pins 0 or 1 used for components while Serial is also in use (they're the USB serial lines, and parts connected there can also block uploads).
- `analogRead` on a digital-only pin number.
- Pin numbers in the code that don't match the wiring the student described.
- Common beginner slips worth their own messages: `=` instead of `==` inside `if`, a semicolon right after `if (...)`, and `delay()` values that look like seconds when milliseconds were meant.
- Library includes or constants that don't match the chosen sensor (for example, a DHT sketch set to the wrong sensor type).

### 8.2 Upload and compile errors

Match pasted error text against the `UploadError` library. Start with these (verify exact wording against current Arduino IDE 2 and avrdude output before shipping):

- Programmer not responding / not in sync -> wrong board or port, something wired to pins 0 or 1, a clone needing the "Old Bootloader" option, or a damaged board.
- Port busy / access denied -> the Serial Monitor or another program is holding the port.
- "No such file or directory" for a header -> library not installed.
- "was not declared in this scope" -> typo, missing include, or missing variable declaration; point at the name.
- "expected ';' before" -> missing semicolon on the line above.
- Board not found / no device on port -> cable, driver (CH340 for many clones), or port.

### 8.3 Serial output patterns

- Garbled characters -> baud mismatch.
- Nothing at all -> no `Serial.begin`, wrong port, the board is resetting, or the code is stuck before the first print.
- Constant 0 or "No echo" from an HC-SR04 sketch -> power, Trig/Echo swapped, timeout, or a faulty sensor.
- Constant 1023 or 0 from `analogRead` -> the analog pin is wired straight to 5V or GND, or the part's other leg is disconnected.
- Values drifting randomly with nothing connected -> floating input.
- NaN from a DHT sketch -> wiring, missing pull-up (bare sensor), wrong sensor type in code, reading too often, or a faulty sensor.

### 8.4 Wiring checks

If the student fills in the wiring form, build a netlist and run the **rules engine from the main Jumper prompt** (missing resistor, short, missing common ground, motor on a pin, servo power, voltage mismatch, unconnected pins, pin conflicts). Its errors become strong evidence for the matching faults.

---

## 9. Public symptom pages (acquisition)

- One server-rendered page per symptom and per part health check, at readable URLs like `/fix/hc-sr04-reads-zero` and `/check/sg90-servo`.
- Each page loads fast on a slow phone connection and shows its static content without JavaScript: a plain-language title matching how students search, a short explanation, the three most common causes, and a large "Diagnose my circuit" button that opens the interactive flow with the symptom and parts pre-selected.
- Proper titles, meta descriptions, canonical URLs, and structured data (FAQ or HowTo where it fits). Generate a sitemap from the content files.
- Content is written and reviewed by us, never AI-generated filler. A thin page hurts more than no page.
- Every finished session can produce a shareable link (read-only, anonymized) showing the symptom, what was tested, and the fix. Students share these with friends and seniors, which is free distribution.

---

## 10. Safety rules (non-negotiable)

- **Stop conditions:** burning smell, smoke, a part too hot to touch, melted plastic, a swollen battery. Response: unplug the USB cable and any other power now, don't touch hot parts, let everything cool, and don't power it again until the cause is found. Then continue the diagnosis with power off (visual checks only).
- **Out of scope:** anything connected to mains (230 V AC in India), including live AC through a relay; lithium battery packs being charged or modified; and supplies above 12 V. Explain kindly that Jumper can't guide this safely and they should work with an instructor present. Offer to diagnose the low-voltage side only, with mains fully disconnected.
- **Measurements:** only guide multimeter use on the low-voltage side. Always say which dial setting and which sockets the probes go in. No series current measurements in V0.
- **Arduino as a voltmeter:** only for voltages at or below 5 V, with a clear warning that anything higher will damage the board.
- **Never suggest** bypassing a resistor to "see if it helps," shorting pins to test, or powering motors from a digital pin.

---

## 11. The AI layer (assistive, never in charge)

Use the Anthropic API from server routes only. The AI may:

- **Parse free text** into structured input: symptom id(s), part ids, and any facts it can extract ("the board restarts when the motor starts" -> evidence for a power brownout). Output must be JSON validated against a schema; low-confidence parses are shown to the student to confirm.
- **Explain** a found cause in simpler words, or in another language, when the student asks.
- **Offer fallback suggestions** when no content covers the symptom: up to three cautious, generic checks, clearly labeled "General suggestions, not a verified diagnosis." Log these sessions to the review queue.
- **Summarize** a session for sharing.

The AI must not:

- Choose the next probe or declare a cause inside a covered symptom.
- Invent test sketches or wiring that haven't passed the rules engine.
- Give any instruction that breaks section 10.

The whole flow must work with the AI switched off.

---

## 12. The learning loop (data flywheel)

- Log each session anonymously: symptom, parts, probes and answers, suggested cause, whether the fix worked, time taken, and where the student quit.
- **Review queue** (admin page): unresolved sessions, sessions where the student said a fix didn't work, "Something else" free text, and AI fallback sessions. For each, I can create a new fault or probe, adjust priors, or mark it as noise.
- **Priors from data:** once a symptom has enough resolved sessions (start at 50), show suggested prior updates based on which faults were actually confirmed. I approve them; nothing updates automatically.
- **Quality metrics** on the admin page: resolution rate per symptom, median probes to resolution, "fix didn't work" rate per fault, and drop-off per probe. A probe where many students tap "I can't do this" needs a clearer explanation or a cheaper alternative.
- No personal data in logs beyond an anonymous session id. Pasted code is stored only if the student opts in.

---

## 13. Screens and design

Follow the Jumper design tokens and typography from `CLAUDE.md`. Additional rules:

- **Calm, one card at a time.** The diagnosis screen shows one probe card. Answers are large buttons, easy to hit with one hand while holding a wire.
- **Progress without pressure:** "4 causes ruled out" rather than a percentage.
- **Yellow still means "do this now."** Use the error red only for safety stops and definite faults, never for normal questions.
- **Evidence trail:** a collapsible "What we know so far" list of answers and findings.
- **Small diagrams:** when a probe involves wiring, show only the relevant snippet (for example, just the HC-SR04 and its four wires), reusing the diagram engine with a zoomed view.
- **Offline:** symptom pages, health checks and the engine work offline once loaded (PWA cache). Logs queue and sync later.
- **Hands-free friendly:** every probe prompt is short enough to be read aloud; leave a hook for text-to-speech later.

Screens: Fix home (symptom search and categories), Safety check, Parts picker, Symptom picker with optional extras, Instant findings, Probe card, Cause and fix, Success, No confident answer summary, Health check list, Health check run, Board self-test, Shared session view, Admin review queue, Admin metrics.

---

## 14. Initial content (I review every item before it ships)

### 14.1 Health checks (V0)

Arduino Uno (self-test), USB cable, LED, resistor (color bands plus multimeter), jumper wire, breadboard (strip continuity using an LED circuit), push button, potentiometer, LDR, buzzer (active and passive), HC-SR04, SG90 servo, DHT11/DHT22, IR obstacle sensor module, relay module (note that many are active-LOW), L298N motor driver with a DC motor, and 16x2 LCD with I2C backpack (include an I2C scanner sketch and the backpack's contrast screw).

### 14.2 Fault trees (V0)

Fully cover these symptoms first, because they're the most common in first projects:

1. Computer doesn't detect the board / upload fails
2. Upload succeeds but nothing happens
3. Serial Monitor shows garbled symbols or nothing
4. LED doesn't light
5. Button does nothing or acts randomly
6. HC-SR04 reads 0 or wrong values
7. Servo doesn't move or jitters
8. Board resets when a motor starts
9. DC motor with L298N doesn't spin
10. I2C LCD blank or shows blocks

### 14.3 Example: how one symptom should be authored

Symptom: **Servo jitters, buzzes or doesn't move** (parts: Uno, SG90).

Faults, each with a rough prior:
- Servo powered from the Arduino's 5V pin and drawing more than USB can supply (common, especially with more than one servo or a load on the arm).
- Missing common ground between an external supply and the Arduino.
- Signal wire on the wrong pin, or the pin in the code doesn't match the wiring.
- Servo library used together with `analogWrite` on pins 9 or 10.
- Loose jumper in the servo's connector.
- Commanding angles the servo can't reach mechanically (buzzing at 0 or 180 degrees).
- Faulty servo (stripped gears or dead motor).

Probes, cheapest first:
1. "Does the board's ON light flicker, or the board restart, when the servo moves?" (question, cost 1)
2. "Is the servo powered from the Arduino's 5V pin, or from a separate supply?" (question, cost 1)
3. "If separate: is that supply's ground connected to an Arduino GND pin?" (question, cost 1)
4. "Remove the arm or any load. Does it still jitter?" (test, cost 2)
5. "Upload the sweep test sketch. Does it sweep smoothly?" (test, cost 3; uses the health-check sketch)
6. "Does the buzzing happen only at the ends of its range?" (question, cost 1)
7. "Swap in another servo if you have one." (test, cost 4, needs a spare part)

Write every symptom at this level of detail before coding its UI.

---

## 15. Milestones

**M1: Engine and content foundation**
Zod schemas, the engine (update, next probe, stop), the scenario test harness, and content for two symptoms (upload fails, LED doesn't light). A bare UI that runs a diagnosis end to end.
*Done when:* all scenario tests pass and I can diagnose a deliberately wrong-port setup and a backwards LED.

**M2: The full fix flow**
Safety check, parts and symptom pickers, probe cards, cause and fix, verify loop, undo, the no-confident-answer summary with copy, polished design, offline support.
*Done when:* three real students with broken circuits (broken on purpose if needed) reach the right cause without my help.

**M3: Health checks and board self-test**
All V0 health checks using the diagram engine, with links from diagnosis to health checks and back.

**M4: Static checks**
Code checks, the upload-error library, serial patterns, and the wiring form feeding the rules engine, all surfaced on the instant findings screen.

**M5: Public pages and sharing**
Server-rendered symptom and check pages, sitemap, structured data, shareable session links.

**M6: Learning loop and AI layer**
Session logging, review queue, metrics, suggested priors, AI free-text parsing and fallback.

**M7: Remaining V0 symptoms**
Complete all ten fault trees in 14.2, each with passing scenario tests.

---

## 16. Acceptance criteria for the module

- Every V0 fault is reachable by scenario test within 8 probes for its main symptom.
- Safety probes always come first; stop conditions always halt the flow.
- The flow works with the AI disabled, and offline after first load.
- Undo and Start over work at any point.
- Public pages score >= 95 on Lighthouse performance and accessibility on a mid-range phone profile.
- Every fix and health-check claim has a source or my sign-off recorded in `PARTS_SOURCES.md`.
- Resolution rate and "fix didn't work" rate are visible on the admin page from day one.

---

## 17. Things you must not do

- Don't let the LLM pick probes or declare causes for covered symptoms.
- Don't show ten possible causes at once. One card at a time.
- Don't blame a part before its wiring has been re-checked and it has been tested alone.
- Don't write fixes that change more than one thing at once.
- Don't guide anything involving mains voltage, charging lithium batteries or supplies above 12 V.
- Don't invent error messages, pin capabilities or library behavior. Verify or flag.
- Don't hardcode symptom-specific logic in components or the engine.
- Don't publish thin or AI-written symptom pages.

---

## 18. First task

1. Read `CLAUDE.md`, this file and the existing codebase.
2. Reply with: your understanding of Jumper Fix in five sentences, how it connects to the existing modules (component library, diagram engine, rules engine), the file structure you'll add, the final Zod schemas, the weight-to-multiplier config, and your questions.
3. Draft the full content (faults, probes, outcomes, fixes) for **"LED doesn't light"** and **"Upload fails"** for my review, including the scenario tests you'll write for them.
4. After I approve, build M1.
