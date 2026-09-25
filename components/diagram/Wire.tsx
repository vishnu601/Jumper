import { wireGeometry, type ResolveOptions } from '@/lib/geometry/wire';
import type { WireElement } from '@/lib/schema/content';

/** Wire colours, ported from jumper.html:225. */
export const WIRE_COLORS: Record<string, string> = {
  red: '#D93A34',
  black: '#2A2A2A',
  yellow: '#E9B824',
  orange: '#EC7A1C',
  blue: '#2F6FD6',
  purple: '#8B4FD1',
  green: '#2FA14E',
  white: '#E8E8E8',
};

/**
 * A jumper wire, ported from jumper.html:384-394.
 *
 * Three strokes stacked: a dark shadow, the wire colour, and a thin offset
 * highlight. That is what makes it read as a round physical wire lying on the
 * board rather than a line drawn between two points.
 */
export function Wire({ wire, resolve }: { wire: WireElement; resolve?: ResolveOptions }) {
  const g = wireGeometry(wire.from, wire.to, { n1: wire.n1, n2: wire.n2 }, resolve);
  const color = WIRE_COLORS[wire.color] ?? WIRE_COLORS.white;

  return (
    <>
      <path d={g.d} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="6.5" strokeLinecap="round" />
      <path d={g.d} fill="none" stroke={color} strokeWidth="4.4" strokeLinecap="round" />
      <path
        d={g.d}
        fill="none"
        stroke="#fff"
        strokeOpacity=".25"
        strokeWidth="1.2"
        strokeLinecap="round"
        transform="translate(-.8 -.8)"
      />
      {/* The metal pins at each end. */}
      {[g.a, g.b].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.8" fill="#D2D7DC" stroke="#555" strokeWidth=".8" />
      ))}
    </>
  );
}
