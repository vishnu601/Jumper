import {
  STANDARD_BREADBOARD,
  TOP_GROUP,
  BOTTOM_GROUP,
  RAIL_ROWS,
  isRail,
  type BreadboardDef,
  type Row,
} from '@/lib/geometry/breadboard';
import { UNO, type BoardDef } from '@/lib/geometry/board';
import { isHoleRef, isPartPinRef, type Endpoint, type Part, type Project } from '@/lib/schema/content';

/**
 * Real breadboard electrical behaviour (spec 5.2).
 *
 * Nodes are addressed by string key:
 *   h:<col>:<row>      a breadboard hole
 *   p:<pinId>          a pin on the board
 *   e:<elementId>:<pinId>  a part pin that is not in a hole (servo flying leads)
 */

export type NodeKey = string;

export const holeNode = (col: number, row: Row | string): NodeKey => `h:${col}:${row}`;
export const pinNode = (pinId: string): NodeKey => `p:${pinId}`;
export const partPinNode = (elementId: string, pinId: string): NodeKey =>
  `e:${elementId}:${pinId}`;

class UnionFind {
  private parent = new Map<NodeKey, NodeKey>();

  add(k: NodeKey): void {
    if (!this.parent.has(k)) this.parent.set(k, k);
  }

  find(k: NodeKey): NodeKey {
    this.add(k);
    let root = k;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Path compression.
    let cur = k;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: NodeKey, b: NodeKey): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  keys(): NodeKey[] {
    return [...this.parent.keys()];
  }
}

export interface Net {
  id: number;
  nodes: NodeKey[];
}

export interface Netlist {
  nets: Net[];
  /** node key -> net id. Nodes never mentioned by the circuit are absent. */
  nodeToNet: Map<NodeKey, number>;
  netOf(node: NodeKey): number | undefined;
  /** True when both nodes are electrically the same point. */
  connected(a: NodeKey, b: NodeKey): boolean;
  /** Every node on the same net as the given one. */
  nodesOn(net: number): NodeKey[];
}

export interface NetlistOptions {
  breadboard?: BreadboardDef;
  board?: BoardDef;
  /** Parts whose switchedConnections should be treated as closed. */
  actuated?: Set<string>;
}

/** Resolves a content endpoint to a node key. */
export function endpointNode(e: Endpoint): NodeKey {
  if (isHoleRef(e)) return holeNode(e[0], e[1]);
  if (isPartPinRef(e)) return partPinNode(e.part, e.pin);
  return pinNode(e);
}

/**
 * Computes connectivity for a project as it stands after `uptoStep`
 * (inclusive). Pass -1 for an empty board, or steps.length-1 for the finished
 * circuit.
 */
export function getNets(
  project: Project,
  uptoStep: number,
  parts: Record<string, Part>,
  opts: NetlistOptions = {},
): Netlist {
  const bb = opts.breadboard ?? STANDARD_BREADBOARD;
  const board = opts.board ?? UNO;
  const actuated = opts.actuated ?? new Set<string>();
  const uf = new UnionFind();

  const visible = new Set<string>();
  project.steps.slice(0, uptoStep + 1).forEach((s) => (s.add ?? []).forEach((id) => visible.add(id)));

  if (project.usesBreadboard) {
    // Each five-hole terminal group is one net. The centre gap joins nothing,
    // which is exactly why a button placed across it stays open until pressed.
    for (let col = 1; col <= bb.cols; col++) {
      for (const group of [TOP_GROUP, BOTTOM_GROUP]) {
        for (let i = 1; i < group.length; i++) {
          uf.union(holeNode(col, group[0]), holeNode(col, group[i]));
        }
      }
    }
    // Each rail runs the length of the board, unless this board's rails are
    // broken in the middle.
    for (const rail of RAIL_ROWS) {
      for (let col = 2; col <= bb.cols; col++) {
        if (bb.splitRails && col === bb.splitAfter + 1) continue;
        uf.union(holeNode(col - 1, rail), holeNode(col, rail));
      }
    }
  }

  // Seed every board pin so that helpers such as supplyNets() and the
  // unconnected-pin rule can ask about a pin the circuit never touches.
  for (const pin of Object.values(board.pins)) uf.add(pinNode(pin.id));

  // All the board's GND pins are joined inside the board.
  const [firstGnd, ...restGnd] = board.groundPins;
  for (const g of restGnd) uf.union(pinNode(firstGnd), pinNode(g));

  for (const el of project.elements) {
    if (!visible.has(el.id)) continue;

    if (el.kind === 'wire') {
      uf.union(endpointNode(el.from), endpointNode(el.to));
      continue;
    }

    const part = parts[el.partId];
    if (!part) continue;

    // A leg in a hole joins that hole's net.
    for (const [pinId, ref] of Object.entries(el.placement)) {
      uf.union(partPinNode(el.id, pinId), holeNode(ref[0], ref[1]));
    }
    // Pins joined inside the part, always.
    for (const group of part.internalConnections ?? []) {
      for (let i = 1; i < group.length; i++) {
        uf.union(partPinNode(el.id, group[0]), partPinNode(el.id, group[i]));
      }
    }
    // Pins joined only while the part is actuated.
    if (actuated.has(el.id)) {
      for (const group of part.switchedConnections ?? []) {
        for (let i = 1; i < group.length; i++) {
          uf.union(partPinNode(el.id, group[0]), partPinNode(el.id, group[i]));
        }
      }
    }
  }

  const byRoot = new Map<NodeKey, NodeKey[]>();
  for (const k of uf.keys()) {
    const root = uf.find(k);
    const list = byRoot.get(root);
    if (list) list.push(k);
    else byRoot.set(root, [k]);
  }

  const nets: Net[] = [];
  const nodeToNet = new Map<NodeKey, number>();
  let id = 0;
  for (const nodes of byRoot.values()) {
    nets.push({ id, nodes });
    for (const n of nodes) nodeToNet.set(n, id);
    id++;
  }

  return {
    nets,
    nodeToNet,
    netOf: (node) => nodeToNet.get(node),
    connected: (a, b) => {
      const na = nodeToNet.get(a);
      const nb = nodeToNet.get(b);
      return na !== undefined && na === nb;
    },
    nodesOn: (net) => nets[net]?.nodes ?? [],
  };
}

/** Net ids that the board drives as a supply, mapped to voltage. */
export function supplyNets(net: Netlist, board: BoardDef = UNO): Map<number, number> {
  const out = new Map<number, number>();
  for (const [pinId, volts] of Object.entries(board.supplyPins)) {
    const n = net.netOf(pinNode(pinId));
    if (n !== undefined) out.set(n, volts);
  }
  return out;
}

/** Net ids that are ground. */
export function groundNets(net: Netlist, board: BoardDef = UNO): Set<number> {
  const out = new Set<number>();
  for (const pinId of board.groundPins) {
    const n = net.netOf(pinNode(pinId));
    if (n !== undefined) out.add(n);
  }
  return out;
}

/** Net ids driven by a GPIO pin, mapped to the pin ids that reach them. */
export function gpioNets(net: Netlist, board: BoardDef = UNO): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const pin of Object.values(board.pins)) {
    if (pin.role !== 'digital' && pin.role !== 'analog') continue;
    const n = net.netOf(pinNode(pin.id));
    if (n === undefined) continue;
    const list = out.get(n);
    if (list) list.push(pin.id);
    else out.set(n, [pin.id]);
  }
  return out;
}

export { isRail };
