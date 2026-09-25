import { describe, it, expect } from 'vitest';
import { checkCircuit, errorsOnly } from './index';
import { firstLight } from '@/content/projects/first-light';
import { PARTS } from '@/content/parts';
import type { Part, Project } from '@/lib/schema/content';

const LAST = firstLight.steps.length - 1;

/** A 47 Ω resistor, used to build an over-current fixture. */
const res47: Part = {
  ...PARTS['res-220'],
  id: 'res-47',
  name: '47 Ω resistor',
  specs: { resistanceOhms: 47 },
};

/** A 100 Ω resistor: over the 20 mA warning line but under the 40 mA error. */
const res100: Part = {
  ...PARTS['res-220'],
  id: 'res-100',
  name: '100 Ω resistor',
  specs: { resistanceOhms: 100 },
};

const parts = { ...PARTS, 'res-47': res47, 'res-100': res100 };

/** Project 1 with its elements swapped out, keeping the step structure. */
function variant(id: string, elements: Project['elements']): Project {
  const ids = elements.map((e) => e.id);
  return {
    ...firstLight,
    id,
    elements,
    steps: [{ title: 'build', body: 'build it', add: ids }],
  };
}

describe('project 1 as authored', () => {
  // Spec 7.4: every project must pass the rules engine at its final step with
  // zero errors. This is that criterion, enforced.
  it('produces no findings at all at the final step', () => {
    expect(checkCircuit(firstLight, PARTS, LAST)).toEqual([]);
  });

  it('produces no findings at any step along the way', () => {
    for (let i = 0; i <= LAST; i++) {
      expect(checkCircuit(firstLight, PARTS, i), `step ${i + 1}`).toEqual([]);
    }
  });
});

describe('unprotected-led', () => {
  const broken = variant('no-resistor', [
    {
      id: 'led1',
      kind: 'part',
      partId: 'led-5mm-red',
      placement: { anode: [15, 'e'], cathode: [16, 'e'] },
    },
    { id: 'w1', kind: 'wire', from: 'D9', to: [15, 'a'], color: 'yellow' },
    // The resistor is gone: the cathode column goes straight to the rail.
    { id: 'w3', kind: 'wire', from: [16, 'b'], to: [18, 'tn'], color: 'green' },
    { id: 'w2', kind: 'wire', from: 'GND_T', to: [2, 'tn'], color: 'black' },
  ]);

  it('errors when an LED reaches ground with no resistor', () => {
    const findings = checkCircuit(broken, parts, 0);
    expect(findings.map((f) => f.rule)).toContain('unprotected-led');
    expect(errorsOnly(findings)).toHaveLength(1);
  });

  it('names the offending element and says what to add', () => {
    const [f] = checkCircuit(broken, parts, 0);
    expect(f.elementIds).toEqual(['led1']);
    expect(f.message).toMatch(/220/);
  });

  it('stays quiet when the resistor is present', () => {
    expect(checkCircuit(firstLight, PARTS, LAST)).toEqual([]);
  });

  // An LED with one leg in mid-air is not "unprotected", it is unfinished.
  // Reporting it here would be a false alarm mid-build.
  it('does not fire on an incomplete loop', () => {
    const halfBuilt = variant('half', [
      {
        id: 'led1',
        kind: 'part',
        partId: 'led-5mm-red',
        placement: { anode: [15, 'e'], cathode: [16, 'e'] },
      },
      { id: 'w1', kind: 'wire', from: 'D9', to: [15, 'a'], color: 'yellow' },
    ]);
    expect(checkCircuit(halfBuilt, parts, 0)).toEqual([]);
  });
});

describe('led-current', () => {
  function withResistor(partId: string, id: string) {
    return variant(id, [
      {
        id: 'led1',
        kind: 'part',
        partId: 'led-5mm-red',
        placement: { anode: [15, 'e'], cathode: [16, 'e'] },
      },
      { id: 'r1', kind: 'part', partId, placement: { p1: [16, 'b'], p2: [18, 'tn'] } },
      { id: 'w1', kind: 'wire', from: 'D9', to: [15, 'a'], color: 'yellow' },
      { id: 'w2', kind: 'wire', from: 'GND_T', to: [2, 'tn'], color: 'black' },
    ]);
  }

  it('is silent at 220 Ω, which is about 13.6 mA', () => {
    expect(checkCircuit(withResistor('res-220', 'ok'), parts, 0)).toEqual([]);
  });

  it('warns at 100 Ω, which is 30 mA', () => {
    const findings = checkCircuit(withResistor('res-100', 'warn'), parts, 0);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('warning');
    expect(findings[0].rule).toBe('led-current');
    expect(findings[0].message).toMatch(/30 mA/);
  });

  it('errors at 47 Ω, which is over 60 mA', () => {
    const findings = checkCircuit(withResistor('res-47', 'error'), parts, 0);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].rule).toBe('led-current');
  });

  it('shows its working and recommends a real resistor value', () => {
    const [f] = checkCircuit(withResistor('res-47', 'error2'), parts, 0);
    // (5 - 2.0) / 47 = 63.8 mA; the smallest safe resistor is 150 Ω.
    expect(f.message).toMatch(/63\.8 mA/);
    expect(f.message).toMatch(/5 V − 2 V/);
    expect(f.message).toMatch(/at least 150 Ω/);
  });
});

describe('short-circuit', () => {
  const shorted = variant('shorted', [
    { id: 'w1', kind: 'wire', from: '5V', to: [5, 'bp'], color: 'red' },
    { id: 'w2', kind: 'wire', from: 'GND_B1', to: [5, 'bp'], color: 'black' },
  ]);

  it('errors when 5V is joined to GND', () => {
    const findings = checkCircuit(shorted, parts, 0);
    expect(findings.map((f) => f.rule)).toEqual(['short-circuit']);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].message).toMatch(/directly to GND/);
  });

  it('does not fire when the rails are kept apart', () => {
    const fine = variant('fine', [
      { id: 'w1', kind: 'wire', from: '5V', to: [5, 'bp'], color: 'red' },
      { id: 'w2', kind: 'wire', from: 'GND_B1', to: [5, 'bn'], color: 'black' },
    ]);
    expect(checkCircuit(fine, parts, 0)).toEqual([]);
  });

  it('catches a short through the 3.3 V rail too', () => {
    const shorted33 = variant('shorted33', [
      { id: 'w1', kind: 'wire', from: '3V3', to: [5, 'bp'], color: 'red' },
      { id: 'w2', kind: 'wire', from: 'GND_B1', to: [5, 'bp'], color: 'black' },
    ]);
    const findings = checkCircuit(shorted33, parts, 0);
    expect(findings[0].message).toMatch(/3\.3 V supply/);
  });
});

describe('engine', () => {
  it('runs only the rules it is given', () => {
    const broken = variant('none', [
      {
        id: 'led1',
        kind: 'part',
        partId: 'led-5mm-red',
        placement: { anode: [15, 'e'], cathode: [16, 'e'] },
      },
      { id: 'w1', kind: 'wire', from: 'D9', to: [15, 'a'], color: 'yellow' },
      { id: 'w3', kind: 'wire', from: [16, 'b'], to: [18, 'tn'], color: 'green' },
      { id: 'w2', kind: 'wire', from: 'GND_T', to: [2, 'tn'], color: 'black' },
    ]);
    expect(checkCircuit(broken, parts, 0, { rules: [] })).toEqual([]);
  });
});
