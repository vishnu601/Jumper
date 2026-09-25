import { describe, it, expect } from 'vitest';
import { getNets, holeNode, pinNode, partPinNode, groundNets, supplyNets, gpioNets } from './index';
import { firstLight } from '@/content/projects/first-light';
import { PARTS } from '@/content/parts';
import { STANDARD_BREADBOARD } from '@/lib/geometry/breadboard';
import type { Project } from '@/lib/schema/content';

const LAST = firstLight.steps.length - 1;
const nets = (upto = LAST, opts = {}) => getNets(firstLight, upto, PARTS, opts);

describe('breadboard connectivity', () => {
  const n = nets();

  it('joins a-e within a column', () => {
    expect(n.connected(holeNode(15, 'a'), holeNode(15, 'e'))).toBe(true);
    expect(n.connected(holeNode(15, 'a'), holeNode(15, 'c'))).toBe(true);
  });

  it('joins f-j within a column', () => {
    expect(n.connected(holeNode(15, 'f'), holeNode(15, 'j'))).toBe(true);
  });

  // The centre gap is the whole reason a button works when placed across it.
  it('does not bridge the centre gap', () => {
    expect(n.connected(holeNode(15, 'e'), holeNode(15, 'f'))).toBe(false);
  });

  it('does not join neighbouring columns', () => {
    expect(n.connected(holeNode(15, 'a'), holeNode(16, 'a'))).toBe(false);
  });

  it('runs a rail the length of the board', () => {
    expect(n.connected(holeNode(1, 'tn'), holeNode(30, 'tn'))).toBe(true);
  });

  it('keeps the four rails separate from each other', () => {
    expect(n.connected(holeNode(5, 'tn'), holeNode(5, 'tp'))).toBe(false);
    expect(n.connected(holeNode(5, 'tn'), holeNode(5, 'bn'))).toBe(false);
  });
});

describe('project 1 at its final step', () => {
  const n = nets();

  // Pin 9 -> yellow wire -> column 15 -> LED long leg.
  it('connects pin 9 to the LED anode through column 15', () => {
    expect(n.connected(pinNode('D9'), holeNode(15, 'a'))).toBe(true);
    expect(n.connected(pinNode('D9'), holeNode(15, 'e'))).toBe(true);
    expect(n.connected(pinNode('D9'), partPinNode('led1', 'anode'))).toBe(true);
  });

  // LED short leg -> column 16 -> resistor -> top - rail -> black wire -> GND.
  it('connects the LED cathode to the resistor through column 16', () => {
    expect(n.connected(partPinNode('led1', 'cathode'), holeNode(16, 'b'))).toBe(true);
    expect(n.connected(partPinNode('led1', 'cathode'), partPinNode('r1', 'p1'))).toBe(true);
  });

  it('returns the resistor to GND through the top minus rail', () => {
    expect(n.connected(partPinNode('r1', 'p2'), holeNode(18, 'tn'))).toBe(true);
    expect(n.connected(partPinNode('r1', 'p2'), holeNode(2, 'tn'))).toBe(true);
    expect(n.connected(partPinNode('r1', 'p2'), pinNode('GND_T'))).toBe(true);
  });

  it('keeps the LED anode and cathode on different nets', () => {
    expect(n.connected(partPinNode('led1', 'anode'), partPinNode('led1', 'cathode'))).toBe(false);
  });

  it('does not short pin 9 to ground', () => {
    expect(n.connected(pinNode('D9'), pinNode('GND_T'))).toBe(false);
  });

  it('joins all the board GND pins internally', () => {
    expect(n.connected(pinNode('GND_T'), pinNode('GND_B1'))).toBe(true);
    expect(n.connected(pinNode('GND_T'), pinNode('GND_B2'))).toBe(true);
  });
});

describe('step-by-step visibility', () => {
  it('has no wire connections before any step runs', () => {
    const n = nets(-1);
    expect(n.connected(pinNode('D9'), holeNode(15, 'a'))).toBe(false);
  });

  // The LED is placed in step 2 (index 1); pin 9 is wired in step 4 (index 3).
  it('does not connect pin 9 until its step', () => {
    expect(nets(2).connected(pinNode('D9'), holeNode(15, 'a'))).toBe(false);
    expect(nets(3).connected(pinNode('D9'), holeNode(15, 'a'))).toBe(true);
  });

  it('places the LED at step 2', () => {
    expect(nets(0).netOf(partPinNode('led1', 'anode'))).toBeUndefined();
    expect(nets(1).connected(partPinNode('led1', 'anode'), holeNode(15, 'e'))).toBe(true);
  });
});

describe('split rails', () => {
  const opts = {
    breadboard: { ...STANDARD_BREADBOARD, splitRails: true, splitAfter: 15 },
  };

  // The prototype's tip warns about this; with a broken rail the ground wire
  // at column 2 can no longer reach the resistor at column 18.
  it('breaks the rail at the split, stranding the resistor from GND', () => {
    const n = nets(LAST, opts);
    expect(n.connected(holeNode(2, 'tn'), holeNode(18, 'tn'))).toBe(false);
    expect(n.connected(partPinNode('r1', 'p2'), pinNode('GND_T'))).toBe(false);
  });

  it('still joins holes on the same side of the split', () => {
    const n = nets(LAST, opts);
    expect(n.connected(holeNode(1, 'tn'), holeNode(15, 'tn'))).toBe(true);
    expect(n.connected(holeNode(16, 'tn'), holeNode(30, 'tn'))).toBe(true);
  });
});

describe('net role helpers', () => {
  const n = nets();

  it('finds the ground net', () => {
    const g = groundNets(n);
    expect(g.has(n.netOf(pinNode('GND_T'))!)).toBe(true);
    expect(g.has(n.netOf(pinNode('D9'))!)).toBe(false);
  });

  it('finds supply nets with their voltages', () => {
    const s = supplyNets(n);
    expect(s.get(n.netOf(pinNode('5V'))!)).toBe(5);
    expect(s.get(n.netOf(pinNode('3V3'))!)).toBe(3.3);
  });

  it('maps GPIO nets back to their pins', () => {
    const g = gpioNets(n);
    expect(g.get(n.netOf(pinNode('D9'))!)).toContain('D9');
  });
});

describe('switched connections', () => {
  // Modelled now because the button in project 3 depends on it; exercised here
  // with a synthetic part so the behaviour is locked in before that content lands.
  const parts = {
    ...PARTS,
    'test-button': {
      id: 'test-button',
      name: 'Test button',
      pins: [
        { id: 'a1', label: 'a1', role: 'passive' as const },
        { id: 'a2', label: 'a2', role: 'passive' as const },
        { id: 'b1', label: 'b1', role: 'passive' as const },
        { id: 'b2', label: 'b2', role: 'passive' as const },
      ],
      internalConnections: [['a1', 'a2'], ['b1', 'b2']],
      switchedConnections: [['a1', 'b1']],
      specs: {},
      polarized: false,
      glossary: { what: 'x', spot: 'x', watch: 'x' },
      drawing: 'button',
    },
  };

  const project: Project = {
    ...firstLight,
    id: 'switch-test',
    elements: [
      {
        id: 'btn',
        kind: 'part',
        partId: 'test-button',
        placement: { a1: [10, 'e'], a2: [12, 'e'], b1: [10, 'f'], b2: [12, 'f'] },
      },
    ],
    steps: [{ title: 'place', body: 'place it', add: ['btn'] }],
  };

  it('always joins the internal leg pairs', () => {
    const n = getNets(project, 0, parts);
    expect(n.connected(partPinNode('btn', 'a1'), partPinNode('btn', 'a2'))).toBe(true);
  });

  it('joins the pairs to each other only when actuated', () => {
    const open = getNets(project, 0, parts);
    expect(open.connected(partPinNode('btn', 'a1'), partPinNode('btn', 'b1'))).toBe(false);

    const pressed = getNets(project, 0, parts, { actuated: new Set(['btn']) });
    expect(pressed.connected(partPinNode('btn', 'a1'), partPinNode('btn', 'b1'))).toBe(true);
  });
});
