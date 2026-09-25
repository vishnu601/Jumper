import { getNets, groundNets, supplyNets, gpioNets, partPinNode, type Netlist } from '@/lib/netlist';
import { UNO, type BoardDef } from '@/lib/geometry/board';
import type { Part, Project } from '@/lib/schema/content';
import { buildGraph, findPath, type CircuitGraph } from './graph';

/**
 * Deterministic electrical rules (spec 8). No LLM: given nets and part specs,
 * the same circuit always produces the same findings.
 *
 * Adding a rule is appending to RULES. Existing rules are never edited to make
 * a new one fit.
 */

export type Severity = 'error' | 'warning';

export interface Finding {
  severity: Severity;
  /** Stable id, used in tests and later in the UI. */
  rule: string;
  /** What is wrong and what to do about it. Never vague (spec 3.7). */
  message: string;
  elementIds?: string[];
}

export interface RuleContext {
  project: Project;
  parts: Record<string, Part>;
  board: BoardDef;
  nets: Netlist;
  graph: CircuitGraph;
  visible: Set<string>;
  /** Nets driven by a GPIO pin. */
  gpio: Map<number, string[]>;
  /** Nets held at a supply voltage. */
  supplies: Map<number, number>;
  /** Ground nets. */
  grounds: Set<number>;
  /** The sketch shown at this step, when there is one. */
  sketch?: string;
}

export type Rule = (ctx: RuleContext) => Finding[];

/** Every net that can push current: a GPIO output or a supply rail. */
function driverNets(ctx: RuleContext): Map<number, number> {
  const out = new Map<number, number>();
  for (const [net, volts] of ctx.supplies) out.set(net, volts);
  for (const [net] of ctx.gpio) {
    if (!out.has(net)) out.set(net, ctx.board.logicVoltage);
  }
  return out;
}

function ledElements(ctx: RuleContext) {
  return ctx.project.elements.flatMap((el) => {
    if (el.kind !== 'part' || !ctx.visible.has(el.id)) return [];
    const part = ctx.parts[el.partId];
    if (!part || part.drawing !== 'led') return [];
    const anode = part.pins.find((p) => p.role === 'anode');
    const cathode = part.pins.find((p) => p.role === 'cathode');
    if (!anode || !cathode) return [];
    const anodeNet = ctx.nets.netOf(partPinNode(el.id, anode.id));
    const cathodeNet = ctx.nets.netOf(partPinNode(el.id, cathode.id));
    if (anodeNet === undefined || cathodeNet === undefined) return [];
    return [{ el, part, anodeNet, cathodeNet }];
  });
}

/**
 * Series resistance around an LED: from its anode back to whatever drives it,
 * plus from its cathode onward to ground. Returns null when the LED is not in
 * a complete loop, which is not this rule's business to report.
 */
function ledLoop(ctx: RuleContext, led: ReturnType<typeof ledElements>[number]) {
  const drivers = driverNets(ctx);
  const toDriver = findPath(ctx.graph, led.anodeNet, new Set(drivers.keys()), led.el.id);
  const toGround = findPath(ctx.graph, led.cathodeNet, ctx.grounds, led.el.id);
  if (!toDriver || !toGround) return null;
  return {
    volts: drivers.get(toDriver.target)!,
    ohms: toDriver.ohms + toGround.ohms,
    driverNet: toDriver.target,
  };
}

/** An LED across a supply and ground with nothing to limit its current. */
export const unprotectedLed: Rule = (ctx) => {
  const findings: Finding[] = [];
  for (const led of ledElements(ctx)) {
    const loop = ledLoop(ctx, led);
    if (!loop || loop.ohms > 0) continue;
    findings.push({
      severity: 'error',
      rule: 'unprotected-led',
      message: `${led.part.name} "${led.el.id}" has no resistor between it and ground. Add a series resistor (220 Ω is the usual choice at 5 V) in the same column as one of its legs, or the LED and the pin driving it can both be damaged.`,
      elementIds: [led.el.id],
    });
  }
  return findings;
};

/**
 * Estimated LED current, (V - Vf) / R. Above the board's per-pin rating this
 * is a warning; above the absolute maximum it is an error.
 */
export const ledCurrent: Rule = (ctx) => {
  const findings: Finding[] = [];
  const warnAt = ctx.board.maxPinCurrentMa; // 20 mA on an Uno
  const errorAt = warnAt * 2; // 40 mA, the ATmega328P absolute maximum

  for (const led of ledElements(ctx)) {
    const loop = ledLoop(ctx, led);
    if (!loop || loop.ohms <= 0) continue;

    const vf = led.part.specs.forwardVoltage ?? 2.0;
    const headroom = loop.volts - vf;
    if (headroom <= 0) continue;

    const mA = (headroom / loop.ohms) * 1000;
    const rounded = Math.round(mA * 10) / 10;
    if (mA <= warnAt) continue;

    const needed = Math.ceil(headroom / (warnAt / 1000));
    findings.push({
      severity: mA > errorAt ? 'error' : 'warning',
      rule: 'led-current',
      message: `${led.part.name} "${led.el.id}" would draw about ${rounded} mA ((${loop.volts} V − ${vf} V) ÷ ${loop.ohms} Ω), over the ${warnAt} mA a pin should supply. Use a resistor of at least ${needed} Ω.`,
      elementIds: [led.el.id],
    });
  }
  return findings;
};

/** A supply rail joined straight to ground. */
export const shortCircuit: Rule = (ctx) => {
  const findings: Finding[] = [];
  for (const [net, volts] of ctx.supplies) {
    if (!ctx.grounds.has(net)) continue;
    findings.push({
      severity: 'error',
      rule: 'short-circuit',
      message: `The ${volts} V supply is connected directly to GND. Remove the wire joining them before plugging in the board: a short across the supply can reset the board, overheat the USB port, or damage the regulator.`,
    });
  }
  return findings;
};

export const RULES: Rule[] = [unprotectedLed, ledCurrent, shortCircuit];

export interface CheckOptions {
  board?: BoardDef;
  sketch?: string;
  rules?: Rule[];
}

/** Runs the rules engine over a project as it stands after `uptoStep`. */
export function checkCircuit(
  project: Project,
  parts: Record<string, Part>,
  uptoStep: number,
  opts: CheckOptions = {},
): Finding[] {
  const board = opts.board ?? UNO;
  const nets = getNets(project, uptoStep, parts, { board });

  const visible = new Set<string>();
  project.steps
    .slice(0, uptoStep + 1)
    .forEach((s) => (s.add ?? []).forEach((id) => visible.add(id)));

  const graph = buildGraph(project, parts, nets, visible);

  const ctx: RuleContext = {
    project,
    parts,
    board,
    nets,
    graph,
    visible,
    gpio: gpioNets(nets, board),
    supplies: supplyNets(nets, board),
    grounds: groundNets(nets, board),
    sketch: opts.sketch,
  };

  return (opts.rules ?? RULES).flatMap((rule) => rule(ctx));
}

export function errorsOnly(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.severity === 'error');
}

export { buildGraph, findPath };
