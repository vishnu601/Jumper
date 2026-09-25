# Architecture

How Jumper is put together, why it's shaped this way, and where to add things.

---

## The one idea

**Everything a student sees is generated from validated content.** A project file says which parts
exist, where their legs sit, and what each step adds. The diagram, the instructions, the checkpoint
fixes and the electrical analysis all read that same data. Nothing is drawn by hand twice, so the
picture cannot disagree with the words.

The corollary: **no project knowledge lives in a component**, and no component knowledge lives in a
page. If you find yourself writing `if (projectId === 'first-light')`, the model is wrong.

---

## Layers

Each layer knows only about the ones below it.

```
app/              routes, server components, page composition
components/       diagram (SVG) · step (build UI) · ui
lib/rules         electrical findings over a netlist
lib/netlist       union-find connectivity
lib/geometry      breadboard + board coordinate systems
lib/schema        Zod schemas — the source of truth for every content shape
content/          data only
```

### `lib/geometry` — where things physically are

- `breadboard.ts` — 30 columns, rows `a–e` / `f–j`, four power rails (`tn`, `tp`, `bp`, `bn`).
  Hole position is `x = X0 + (col − 1) × pitch`, `y = ROWS[row]`.
- `board.ts` — `BoardDef`: Uno pin coordinates on a top and bottom header, matching a real board
  with USB on the left, plus landmarks (`usb`, `onled`, `lled`) for the setup project that has no
  breadboard. Boards are data so a Nano or ESP32 is a new record, not new code.
- `wire.ts` — cubic Béziers whose control points follow each endpoint's exit normal (up for top
  headers and the top breadboard half, down for the bottom), so wires leave a hole the way a real
  one does instead of cutting across the board.
- `focus.ts`, `bounds.ts`, `zoom.ts` — what the current step should highlight, and the viewBox that
  frames it.

### `lib/netlist` — what is connected to what

Union-find over four node kinds:

```
h:<col>:<row>           a breadboard hole
p:<pinId>               a pin on the board
e:<elementId>:<pinId>   a part pin not in a hole (servo flying leads)
```

Real breadboard behaviour: `a–e` in a column are one net, `f–j` another, the centre gap separates
them, each rail row is one net. Parts contribute `internalConnections` (always joined) and
`switchedConnections` (joined only while actuated — a pressed button).

`getNets(project, uptoStep, parts)` returns the circuit **as it stands at that step**, which is what
lets step 4 be analysed differently from step 8.

### `lib/rules` — is this circuit sane?

`graph.ts` turns nets into a graph whose vertices are nets and whose edges are two-terminal parts.
Wires and strips have already collapsed into nets, so an edge is always a real component. That's
what lets a rule ask *"is there a resistor between this LED and ground?"* instead of pattern-matching
on content.

Rules are pure functions `(RuleContext) => Finding[]`. Adding one means appending to `RULES`;
existing rules are never edited to make a new one fit.

**Implemented:** `unprotected-led`, `led-current` ((V−Vf)/R, warn above 20 mA, error above 40 mA),
`short-circuit`.
**Specified but not yet written:** floating input, motor on a pin, servo power, missing common
ground, voltage mismatch, unconnected pins, pin conflict. Several of these need the board database
(see `docs/kit/proposal.md`) because they depend on per-pin capabilities the current `BoardDef`
doesn't carry.

Deterministic by design: the same circuit always produces the same findings. No model in the loop.

### `lib/schema` — the contract

Zod schemas are the source of truth; TypeScript types are **inferred** from them
(`z.infer`), never declared alongside, so a schema and its type cannot drift.

`validate.ts` holds the cross-field checks a per-field schema can't express:

- every element is introduced by exactly one step (never added twice, never invisible)
- every required part pin (power, ground, signal) ends up connected
- wires, focus targets, animations and interactive refs name elements that exist
- part placements only name pins that part actually has

These run from `npm run content:check` and from Vitest, so **bad content fails the test suite**
rather than shipping.

### `components/diagram` — drawing it

`Scene` composes `Board`, `Breadboard`, part renderers (`parts.tsx`, keyed by the part's `drawing`
field) and `Wire`, then applies focus rings and the step's viewBox. Hand-written SVG throughout:
crisp at any zoom, themeable through the same CSS variables as the rest of the app, and describable
to a screen reader. `lib/content/scene-state.ts` computes what is visible, new, and focused at a
given step.

### `components/step` — saying it

`GuidedBuild` owns the step lifecycle; `StepPanel`, `Body` (token markup parsed by
`lib/content/parse-body.ts`), `Checklist`, `CodeBlock` and `Checkpoint` render it. Checkpoint fixes
are ordered most-likely-first and each is actionable.

### `lib/progress`

Zustand plus localStorage, with a `useHydrated` guard so server and client markup agree on first
paint.

---

## Design tokens

Defined once as CSS variables in `app/globals.css` and mapped into Tailwind's theme, so dark mode is
a redefinition of the variables rather than a `dark:` on every element — and the SVG diagram picks
up the same values automatically.

**Yellow (`--accent`) means "do this now"** and is used for nothing else: current step, target holes,
primary action. Wire colours follow the workshop convention — red is power, black is ground, never a
signal.

---

## Testing

| Layer | Tool | What's covered |
|---|---|---|
| geometry, netlist, rules, content, parsing | Vitest | 110 tests across 5 files |
| full flows | Playwright | 10 specs |

The e2e specs cover more than the happy path: checkpoint failure and recovery, progress surviving a
reload, the zoom toggle, the diagram's screen-reader description, full keyboard reachability, no
horizontal overflow at 360 px on any step, and 404s for unknown projects or steps.

Rules tests work by building deliberately broken circuits and asserting the finding.

---

## How to add things

**A part** — new file in `content/parts/`, export it from `index.ts`. Give it pins with roles
(`power`, `ground`, `signal`, `anode`, `cathode`), only specs you can source, a `polarized` flag,
glossary copy (`what` / `spot` / `watch`), and a `drawing` key. If the drawing key is new, add a
renderer in `components/diagram/parts.tsx`. **Unsourced numbers get `// VERIFY:`, not a guess.**

**A project** — new file in `content/projects/`, export it from `index.ts`. Declare `elements`
(parts with hole placements, plus wires), then `steps` that each `add` some of them. Content
validation will tell you if an element is never added, added twice, or left unconnected.

**A board** — today, a new `BoardDef` in `lib/geometry/board.ts`. This is being reworked: see
`docs/kit/proposal.md` for the split between sourced electrical data (`content/boards/`) and drawing
coordinates, which several unwritten rules depend on.

**A rule** — a pure function appended to `RULES` in `lib/rules/index.ts`, plus a test with a
circuit that triggers it. Messages say what happened *and* what to do; never "something went wrong".

---

## Planned modules

Specified in `docs/`, not built:

- **Jumper Fix** (`docs/prompts/fix-mode.md`, `docs/fix/M1-proposal.md`) — guided diagnosis for a
  circuit that's already built and not working. A deterministic engine scores candidate faults from
  probe answers; all diagnostic knowledge is content. Static checks on pasted code, errors and
  serial output feed the same engine, as do rules-engine findings.
- **Jumper Kit** (`docs/kit/proposal.md`) — sourced board database, part inventory, and matching
  projects against what a student actually owns.
- **Photo check** (`docs/fix/vision-proposal.md`) — a vision model producing *observations* the
  student confirms, never conclusions, feeding the same deterministic engine.

The through-line: models may gather evidence; only deterministic code decides.
