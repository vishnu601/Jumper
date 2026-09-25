import {
  hole,
  STANDARD_BREADBOARD,
  BREADBOARD_ROWS,
  type BreadboardDef,
  type Row,
} from '@/lib/geometry/breadboard';
import { stripPoints } from '@/lib/geometry/bounds';
import type { StripRef } from '@/lib/schema/content';

const f1 = (n: number) => Math.round(n * 10) / 10;

/** The breadboard, ported from jumper.html:258-280. */
export function Breadboard({ bb = STANDARD_BREADBOARD }: { bb?: BreadboardDef }) {
  // One path for all 420 holes: 420 separate <rect> nodes would be the single
  // biggest thing in the DOM on this page.
  const holes = Array.from({ length: bb.cols }, (_, ci) =>
    (Object.keys(bb.rows) as Row[])
      .map((r) => {
        const h = hole(ci + 1, r, bb);
        return `M${f1(h.x - 2.2)} ${f1(h.y - 2.2)}h4.4v4.4h-4.4z`;
      })
      .join(''),
  ).join('');

  return (
    <g aria-hidden="true">
      <rect x="360" y="74" width="504" height="284" rx="8" fill="#F3F3EE" stroke="#CFCFC6" strokeWidth="1.5" />
      {/* The centre gap. */}
      <rect x="366" y="211" width="492" height="10" rx="2" fill="#E1E1DA" />

      {/* Rail lines, printed on the real board, so these keep their own colours. */}
      <line x1="374" y1="83" x2="850" y2="83" stroke="#3B6FD8" strokeWidth="1.6" />
      <line x1="374" y1="117" x2="850" y2="117" stroke="#D8413B" strokeWidth="1.6" />
      <line x1="374" y1="315" x2="850" y2="315" stroke="#D8413B" strokeWidth="1.6" />
      <line x1="374" y1="349" x2="850" y2="349" stroke="#3B6FD8" strokeWidth="1.6" />

      {([
        ['tn', '−', '#3B6FD8'],
        ['tp', '+', '#D8413B'],
        ['bp', '+', '#D8413B'],
        ['bn', '−', '#3B6FD8'],
      ] as const).map(([r, sym, col]) => (
        <g key={r}>
          <text x="367" y={bb.rows[r] + 3} fontSize="10" fontWeight="700" textAnchor="middle" fill={col} fontFamily="sans-serif">
            {sym}
          </text>
          <text x="857" y={bb.rows[r] + 3} fontSize="10" fontWeight="700" textAnchor="middle" fill={col} fontFamily="sans-serif">
            {sym}
          </text>
        </g>
      ))}

      <path d={holes} fill="#6F7275" />

      {[1, 5, 10, 15, 20, 25, 30].map((c) => (
        <g key={c}>
          <text x={hole(c, 'a', bb).x} y="127" fontSize="6.5" textAnchor="middle" fill="#8A8D90" fontFamily="sans-serif">
            {c}
          </text>
          <text x={hole(c, 'a', bb).x} y="311" fontSize="6.5" textAnchor="middle" fill="#8A8D90" fontFamily="sans-serif">
            {c}
          </text>
        </g>
      ))}

      {'abcdefghij'.split('').map((r) => (
        <g key={r}>
          <text x="368" y={BREADBOARD_ROWS[r as Row] + 2.5} fontSize="7" textAnchor="middle" fill="#8A8D90" fontFamily="sans-serif">
            {r}
          </text>
          <text x="856" y={BREADBOARD_ROWS[r as Row] + 2.5} fontSize="7" textAnchor="middle" fill="#8A8D90" fontFamily="sans-serif">
            {r}
          </text>
        </g>
      ))}

      {/* Rails broken in the middle get a visible gap, matching the real board. */}
      {bb.splitRails &&
        (['tn', 'tp', 'bp', 'bn'] as Row[]).map((r) => (
          <rect
            key={`split-${r}`}
            x={hole(bb.splitAfter, r, bb).x + bb.pitch / 2 - 3}
            y={bb.rows[r] - 6}
            width="6"
            height="12"
            fill="#F3F3EE"
          />
        ))}
    </g>
  );
}

/** A run of holes highlighted to teach connectivity. (jumper.html:282-289) */
export function Strip({ strip, bb = STANDARD_BREADBOARD }: { strip: StripRef; bb?: BreadboardDef }) {
  if ('rail' in strip) {
    return (
      <rect
        x="372"
        y={bb.rows[strip.rail as Row] - 7}
        width="480"
        height="14"
        rx="5"
        fill="rgba(242,181,58,.38)"
        stroke="#E0A21F"
        strokeWidth="1.5"
      />
    );
  }
  const [a, b] = stripPoints(strip, bb);
  return (
    <rect
      x={a.x - 7}
      y={a.y - 7}
      width="14"
      height={b.y - a.y + 14}
      rx="5"
      fill="rgba(242,181,58,.38)"
      stroke="#E0A21F"
      strokeWidth="1.5"
    />
  );
}
