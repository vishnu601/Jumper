import { describe, it, expect } from 'vitest';
import { hole, parseHoleName, holeLabel, STANDARD_BREADBOARD } from './breadboard';
import { UNO } from './board';
import { wireGeometry, wireSamples, resolveEndpoint } from './wire';
import { focusInfo, layoutLabels } from './focus';
import { zoomBox } from './zoom';

describe('breadboard', () => {
  it('places column 1 at x0 and steps by the pitch', () => {
    expect(hole(1, 'a')).toEqual({ x: 380, y: 136 });
    expect(hole(2, 'a').x).toBe(396);
    expect(hole(15, 'e')).toEqual({ x: 604, y: 200 });
  });

  it('parses hole names students would type', () => {
    expect(parseHoleName('e15')).toEqual({ col: 15, row: 'e' });
    expect(parseHoleName('tn18')).toEqual({ col: 18, row: 'tn' });
    expect(parseHoleName('E15')).toBeNull();
    expect(parseHoleName('e0')).toBeNull();
    expect(parseHoleName('e31')).toBeNull();
  });

  it('labels rails by name and holes by coordinate', () => {
    expect(holeLabel(18, 'tn')).toBe('− rail');
    expect(holeLabel(15, 'e')).toBe('e15');
  });

  it('has 30 columns', () => {
    expect(STANDARD_BREADBOARD.cols).toBe(30);
  });
});

describe('board', () => {
  it('puts the digital header on top and the analog header below', () => {
    expect(UNO.pins.D9).toMatchObject({ x: 192, y: 86, side: 'top', label: 'Pin 9' });
    expect(UNO.pins.A0).toMatchObject({ x: 232, y: 284, side: 'bot', label: 'A0' });
  });

  it('labels numeric pins as "Pin n" and named pins as themselves', () => {
    expect(UNO.pins.D13.label).toBe('Pin 13');
    expect(UNO.pins['5V'].label).toBe('5V');
    expect(UNO.pins.GND_T.label).toBe('GND');
  });

  it('knows its supply and ground pins', () => {
    expect(UNO.supplyPins['5V']).toBe(5);
    expect(UNO.groundPins).toContain('GND_B2');
  });
});

describe('wire routing', () => {
  it('exits a top-header pin upward', () => {
    expect(resolveEndpoint('D9').n).toEqual([0, -1]);
  });

  it('exits a bottom-header pin downward', () => {
    expect(resolveEndpoint('A0').n).toEqual([0, 1]);
  });

  it('exits a top-half hole upward and a bottom-half hole downward', () => {
    expect(resolveEndpoint([15, 'a']).n).toEqual([0, -1]);
    expect(resolveEndpoint([15, 'j']).n).toEqual([0, 1]);
  });

  it('uses a cubic curve from pin to breadboard', () => {
    const g = wireGeometry('D9', [15, 'a']);
    expect(g.d).toMatch(/^M192 86 C/);
    expect(g.q).toBeUndefined();
  });

  it('uses a quadratic arc between two breadboard holes', () => {
    const g = wireGeometry([10, 'j'], [9, 'bn']);
    expect(g.d).toMatch(/Q/);
    expect(g.c1).toBeUndefined();
  });

  it('samples five points that start and end on the endpoints', () => {
    const g = wireGeometry('D9', [15, 'a']);
    const pts = wireSamples(g);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 192, y: 86 });
    expect(pts[4]).toEqual({ x: 604, y: 136 });
  });

  it('honours an overridden exit normal', () => {
    const g = wireGeometry('5V', [18, 'e'], { n2: [0, 1] });
    expect(g.b.n).toEqual([0, 1]);
  });
});

describe('focus labels', () => {
  it('labels a board pin above the top header', () => {
    expect(focusInfo('D9')).toMatchObject({ label: 'Pin 9', dy: -16 });
  });

  it('labels a board landmark using its spot offset', () => {
    expect(focusInfo('usb')).toMatchObject({ label: 'USB port', dy: -30 });
  });

  it('names a rail hole by its rail', () => {
    expect(focusInfo([18, 'tn'])).toMatchObject({ label: '− rail' });
  });

  it('separates labels that would overlap', () => {
    // e15 and e16 are one pitch apart, so their labels collide.
    const boxes = layoutLabels([focusInfo([15, 'e']), focusInfo([16, 'e'])]);
    const overlaps =
      boxes[0].x < boxes[1].x + boxes[1].w &&
      boxes[0].x + boxes[0].w > boxes[1].x &&
      boxes[0].y < boxes[1].y + boxes[1].h &&
      boxes[0].y + boxes[0].h > boxes[1].y;
    expect(overlaps).toBe(false);
  });
});

describe('zoom box', () => {
  const view = [0, 0, 880, 395] as const;

  it('returns the whole view when there is nothing to focus', () => {
    expect(zoomBox([], view)).toEqual(view);
  });

  // viewBox values are rounded to one decimal, so the aspect ratio matches to
  // about three places rather than exactly.
  it('frames tight points with padding and keeps the aspect ratio', () => {
    const box = zoomBox([{ x: 604, y: 200 }, { x: 620, y: 200 }], view);
    expect(box[2] / box[3]).toBeCloseTo(view[2] / view[3], 2);
    expect(box[2]).toBeLessThan(view[2]);
    // Padded well past the 16px between the two points, so the row letters and
    // column numbers stay in frame (spec 7.3).
    expect(box[2]).toBeGreaterThanOrEqual(480);
  });

  it('stays inside the project view', () => {
    const box = zoomBox([{ x: 0, y: 0 }], view);
    expect(box[0]).toBeGreaterThanOrEqual(view[0]);
    expect(box[1]).toBeGreaterThanOrEqual(view[1]);
    expect(box[0] + box[2]).toBeLessThanOrEqual(view[0] + view[2] + 0.01);
  });

  it('falls back to the whole board when points are too spread out', () => {
    expect(zoomBox([{ x: 10, y: 10 }, { x: 870, y: 380 }], view)).toEqual(view);
  });
});
