# Jumper

A guided Arduino build companion for beginners.

Most Arduino tutorials show you a finished photo and wish you luck. Jumper shows one wire at a time:
which hole, why it goes there, and what to check when it doesn't work. Every diagram is generated
from content data, so the picture can never drift from the instructions.

**Status: V0 — the guided builder works end to end.** Two projects, a component glossary,
a real breadboard connectivity model and a deterministic electrical rules engine.
The troubleshooting module (Jumper Fix) is specified but not built — see [docs/](docs/).

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run test` | Vitest — geometry, netlist, rules, content validation |
| `npm run test:e2e` | Playwright — full build flow, a11y, mobile layout |
| `npm run content:check` | Validate all content files |
| `npm run check` | Content check + `tsc --noEmit` + lint |

Content is validated by the test suite, so a project that references a missing part,
adds an element twice, or leaves a required pin unconnected **fails the build** rather
than reaching a student as a wrong instruction.

---

## What's here

- **Guided builds** — `/projects/[id]/[step]`. One action per step, exact hole names,
  a "why" for each, checkpoints with ordered fixes, and progress saved locally.
- **Diagram engine** — hand-written SVG. A real Uno pin layout, a 30-column breadboard,
  Bézier-routed wires, focus rings and a zoom between step view and whole board.
  No canvas, no diagram library; it stays crisp at any zoom and is readable by a screen reader.
- **Connectivity model** — union-find over holes, rails, board pins and part pins.
  `getNets(project, uptoStep)` makes any step's circuit analysable.
- **Rules engine** — deterministic checks over the netlist (unprotected LED, LED current,
  short circuit). Same circuit, same findings, every time. No LLM.
- **Parts glossary** — `/parts`, with what each part is, how to spot it, and what to watch for.

## Projects

1. **Setup** — install the IDE, plug in the board, pick board and port, upload, make it yours.
2. **First light** — breadboard basics, LED, resistor, pin 9, ground, trace the loop, upload, test.

---

## Repo layout

```
app/          Next.js App Router pages
components/   diagram/ (SVG), step/ (build UI), ui/
content/      projects, parts, sketches — data only, no logic
lib/          geometry, netlist, rules, schema, progress, content parsing
tests/        Playwright end-to-end specs
docs/         module specs and design proposals
```

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for how the layers fit together and how to add
a board, a part or a project.

## Docs

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — layers, data flow, extension points
- [`jumper-build-prompt.md`](jumper-build-prompt.md) — the product spec V0 was built from
- [`docs/prompts/fix-mode.md`](docs/prompts/fix-mode.md) — spec for the troubleshooting module
- [`docs/fix/M1-proposal.md`](docs/fix/M1-proposal.md) — diagnosis engine design, awaiting review
- [`docs/kit/proposal.md`](docs/kit/proposal.md) — board database and part inventory
- [`docs/fix/vision-proposal.md`](docs/fix/vision-proposal.md) — photo-based circuit check

## Ground rules for contributions

Two, and they matter more than style:

1. **Never invent electrical facts.** Pinouts, specs, library behaviour and error messages are
   sourced or flagged `// VERIFY:`. A confident wrong number wastes a beginner's night.
2. **Knowledge is content, not code.** Projects, parts and troubleshooting live in `/content`
   as validated data. No project logic inside a component.
