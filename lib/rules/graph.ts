import type { Netlist } from '@/lib/netlist';
import { partPinNode } from '@/lib/netlist';
import type { Part, Project } from '@/lib/schema/content';

/**
 * A view of the circuit as a graph whose vertices are nets and whose edges are
 * two-terminal components. Wires and breadboard strips have already collapsed
 * into nets by this point, so an edge is always a real part.
 *
 * This is what lets a rule ask "is there a resistor between this LED and
 * ground?" rather than pattern-matching on the content.
 */

export interface ComponentEdge {
  elementId: string;
  partId: string;
  /** 'led' | 'resistor' | other drawing key. */
  kind: string;
  ohms: number;
  netA: number;
  netB: number;
  pinA: string;
  pinB: string;
}

export interface CircuitGraph {
  edges: ComponentEdge[];
  /** net id -> edges touching it. */
  adjacency: Map<number, ComponentEdge[]>;
}

export function buildGraph(
  project: Project,
  parts: Record<string, Part>,
  nets: Netlist,
  visible: Set<string>,
): CircuitGraph {
  const edges: ComponentEdge[] = [];

  for (const el of project.elements) {
    if (el.kind !== 'part' || !visible.has(el.id)) continue;
    const part = parts[el.partId];
    if (!part || part.pins.length !== 2) continue;

    const [p1, p2] = part.pins;
    const netA = nets.netOf(partPinNode(el.id, p1.id));
    const netB = nets.netOf(partPinNode(el.id, p2.id));
    if (netA === undefined || netB === undefined || netA === netB) continue;

    edges.push({
      elementId: el.id,
      partId: part.id,
      kind: part.drawing,
      ohms: part.specs.resistanceOhms ?? 0,
      netA,
      netB,
      pinA: p1.id,
      pinB: p2.id,
    });
  }

  const adjacency = new Map<number, ComponentEdge[]>();
  for (const e of edges) {
    for (const n of [e.netA, e.netB]) {
      const list = adjacency.get(n);
      if (list) list.push(e);
      else adjacency.set(n, [e]);
    }
  }

  return { edges, adjacency };
}

export interface PathResult {
  /** The net the search reached. */
  target: number;
  /** Total resistance of resistor edges along the path, in ohms. */
  ohms: number;
  edges: ComponentEdge[];
}

/**
 * Breadth-first search from `start` to any net in `targets`, never crossing
 * `excludeEdge`. Returns the shortest path, which for the series circuits this
 * engine sees is the path current actually takes.
 *
 * A more general solver (parallel branches, multiple sources) is the right
 * answer once projects need it; this is deliberately the simple correct thing
 * for the circuits in scope, and is honest about that rather than pretending
 * to a generality it does not have.
 */
export function findPath(
  graph: CircuitGraph,
  start: number,
  targets: Set<number>,
  excludeEdge?: string,
): PathResult | null {
  if (targets.has(start)) return { target: start, ohms: 0, edges: [] };

  const queue: number[] = [start];
  const seen = new Set<number>([start]);
  const cameBy = new Map<number, ComponentEdge>();

  while (queue.length) {
    const net = queue.shift()!;
    for (const edge of graph.adjacency.get(net) ?? []) {
      if (edge.elementId === excludeEdge) continue;
      const other = edge.netA === net ? edge.netB : edge.netA;
      if (seen.has(other)) continue;
      seen.add(other);
      cameBy.set(other, edge);

      if (targets.has(other)) {
        const path: ComponentEdge[] = [];
        let cur = other;
        while (cur !== start) {
          const e = cameBy.get(cur)!;
          path.unshift(e);
          cur = e.netA === cur ? e.netB : e.netA;
        }
        return {
          target: other,
          ohms: path.reduce((sum, e) => sum + e.ohms, 0),
          edges: path,
        };
      }
      queue.push(other);
    }
  }

  return null;
}
