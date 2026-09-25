import { hole, exitsUp, type BreadboardDef, STANDARD_BREADBOARD, type Row, type Point } from './breadboard';
import { UNO, type BoardDef } from './board';
import { isHoleRef, isPartPinRef, type Endpoint } from '@/lib/schema/content';

/**
 * Wire routing, ported from the prototype (jumper.html:358-394).
 *
 * Each endpoint has an "exit direction": pins on the top header and holes in
 * the top half leave upward, everything on the bottom leaves downward. Control
 * points follow that normal, so a wire looks like it was pushed into the hole
 * rather than drawn to it. Breadboard-to-breadboard wires use a gentle arc
 * instead, because two same-direction normals would make an ugly loop.
 */

export type Normal = readonly [number, number];

export interface WireEnd extends Point {
  n: Normal;
  kind: 'pin' | 'bb' | 'part';
}

/** Resolves a part pin that sits off the breadboard (servo leads). */
export type PartPinResolver = (elementId: string, pinId: string) => WireEnd | null;

export interface ResolveOptions {
  breadboard?: BreadboardDef;
  board?: BoardDef;
  partPin?: PartPinResolver;
}

export function resolveEndpoint(e: Endpoint, opts: ResolveOptions = {}): WireEnd {
  const bb = opts.breadboard ?? STANDARD_BREADBOARD;
  const board = opts.board ?? UNO;

  if (isHoleRef(e)) {
    const p = hole(e[0], e[1] as Row, bb);
    return { x: p.x, y: p.y, n: [0, exitsUp(e[1] as Row) ? -1 : 1], kind: 'bb' };
  }
  if (isPartPinRef(e)) {
    const resolved = opts.partPin?.(e.part, e.pin);
    if (!resolved) throw new Error(`Cannot place part pin ${e.part}.${e.pin}`);
    return resolved;
  }
  const pin = board.pins[e];
  if (!pin) throw new Error(`Unknown board pin: ${e}`);
  return { x: pin.x, y: pin.y, n: [0, pin.side === 'top' ? -1 : 1], kind: 'pin' };
}

export interface WireGeometry {
  a: WireEnd;
  b: WireEnd;
  /** Quadratic control point, for breadboard-to-breadboard runs. */
  q?: Point;
  /** Cubic control points, for everything else. */
  c1?: Point;
  c2?: Point;
  d: string;
}

const f1 = (n: number) => Math.round(n * 10) / 10;

export function wireGeometry(
  from: Endpoint,
  to: Endpoint,
  overrides: { n1?: Normal; n2?: Normal } = {},
  opts: ResolveOptions = {},
): WireGeometry {
  const a = { ...resolveEndpoint(from, opts) };
  const b = { ...resolveEndpoint(to, opts) };
  if (overrides.n1) a.n = overrides.n1;
  if (overrides.n2) b.n = overrides.n2;

  const dist = Math.hypot(b.x - a.x, b.y - a.y);

  if (a.kind === 'bb' && b.kind === 'bb') {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const px = -(b.y - a.y) / dist;
    const py = (b.x - a.x) / dist;
    const k = dist * 0.18;
    const q = { x: mx + px * k * (px > 0 ? -1 : 1), y: my - Math.abs(py) * k };
    return {
      a,
      b,
      q,
      d: `M${a.x} ${a.y} Q${f1(q.x)} ${f1(q.y)} ${b.x} ${b.y}`,
    };
  }

  const k = Math.max(28, Math.min(100, dist * 0.4));
  const c1 = { x: a.x + a.n[0] * k, y: a.y + a.n[1] * k };
  const c2 = { x: b.x + b.n[0] * k, y: b.y + b.n[1] * k };
  return {
    a,
    b,
    c1,
    c2,
    d: `M${a.x} ${a.y} C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${b.x} ${b.y}`,
  };
}

/** Five points along the curve, used to size the zoom box. */
export function wireSamples(g: WireGeometry): Point[] {
  const pts: Point[] = [];
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const u = 1 - t;
    if (g.q) {
      pts.push({
        x: u * u * g.a.x + 2 * u * t * g.q.x + t * t * g.b.x,
        y: u * u * g.a.y + 2 * u * t * g.q.y + t * t * g.b.y,
      });
    } else {
      const c1 = g.c1!;
      const c2 = g.c2!;
      pts.push({
        x: u * u * u * g.a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * g.b.x,
        y: u * u * u * g.a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * g.b.y,
      });
    }
  }
  return pts;
}
