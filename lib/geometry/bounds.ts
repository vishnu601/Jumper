import { hole, STANDARD_BREADBOARD, type BreadboardDef, type Point, type Row } from './breadboard';
import { wireGeometry, wireSamples, type ResolveOptions } from './wire';
import type { Element, Part, StripRef } from '@/lib/schema/content';

/**
 * The points an element occupies, used to frame the zoom box
 * (jumper.html:408-419). These are deliberately generous: the LED's bulb sits
 * well above its legs, so its bounds include a point 26px up.
 */

export interface BoundsOptions extends ResolveOptions {
  breadboard?: BreadboardDef;
}

export function elementPoints(
  el: Element,
  parts: Record<string, Part>,
  opts: BoundsOptions = {},
): Point[] {
  const bb = opts.breadboard ?? STANDARD_BREADBOARD;

  if (el.kind === 'wire') {
    return wireSamples(wireGeometry(el.from, el.to, { n1: el.n1, n2: el.n2 }, opts));
  }

  const part = parts[el.partId];
  const holes = Object.values(el.placement).map((ref) => hole(ref[0], ref[1] as Row, bb));
  if (!part || holes.length === 0) return holes;

  if (part.drawing === 'led') {
    const anode = el.placement.anode ? hole(el.placement.anode[0], el.placement.anode[1] as Row, bb) : holes[0];
    // The bulb is drawn above the legs (jumper.html:292).
    return [...holes, { x: anode.x, y: anode.y - 26 }];
  }

  return holes;
}

/** The rectangle a highlighted strip covers. (jumper.html:468-471) */
export function stripPoints(strip: StripRef, bb: BreadboardDef = STANDARD_BREADBOARD): Point[] {
  if ('rail' in strip) {
    return [
      { x: bb.x0, y: bb.rows[strip.rail as Row] },
      { x: bb.x0 + (bb.cols - 1) * bb.pitch, y: bb.rows[strip.rail as Row] },
    ];
  }
  return [hole(strip.col, strip.from as Row, bb), hole(strip.col, strip.to as Row, bb)];
}
