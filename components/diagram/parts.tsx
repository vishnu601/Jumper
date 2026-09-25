import { hole, type BreadboardDef, type Point, type Row } from '@/lib/geometry/breadboard';
import type { PartElement, Part } from '@/lib/schema/content';

/**
 * Part renderers, keyed by Part.drawing.
 *
 * Adding a part to the library means adding a record in /content/parts and one
 * renderer here. Scene never learns about specific parts (spec 12: no project
 * logic in components).
 */

export interface PartRenderProps {
  element: PartElement;
  part: Part;
  bb: BreadboardDef;
  /** Animation class for this element at this step, if any. */
  anim?: string;
}

export type PartRenderer = (props: PartRenderProps) => React.ReactNode;

const f1 = (n: number) => Math.round(n * 10) / 10;

const LED_COLORS: Record<string, string> = {
  red: '#E8322D',
  yellow: '#F7C325',
  green: '#33C46A',
};

const BAND_COLORS: Record<string, string> = {
  red: '#C62828',
  brown: '#6D4C2F',
  gold: '#C9A227',
  black: '#222',
  orange: '#EF7C1A',
};

function placed(element: PartElement, pin: string, bb: BreadboardDef): Point | null {
  const ref = element.placement[pin];
  return ref ? hole(ref[0], ref[1] as Row, bb) : null;
}

/** LED, ported from jumper.html:291-302. */
const Led: PartRenderer = ({ element, bb, anim }) => {
  const pa = placed(element, 'anode', bb);
  const pc = placed(element, 'cathode', bb);
  if (!pa || !pc) return null;

  const color = LED_COLORS[(element.display?.color as string) ?? 'red'] ?? LED_COLORS.red;
  const cx = (pa.x + pc.x) / 2;
  const cy = Math.min(pa.y, pc.y) - 14;
  // The flat edge on the rim marks the cathode, which is what students are
  // told to look for when the legs have been trimmed.
  const flatX = pc.x > pa.x ? cx + 9.5 : cx - 9.5;

  return (
    <>
      <path
        d={`M${pa.x} ${pa.y} L${cx - 4} ${cy + 7} M${pc.x} ${pc.y} L${cx + 4} ${cy + 7}`}
        stroke="#9AA3AA"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="10.5" fill={color} fillOpacity=".45" stroke={color} strokeWidth="1.5" />
      <circle
        className={`led-glow ${anim ? `a-${anim}` : ''}`}
        cx={cx}
        cy={cy}
        r="10.5"
        fill={color}
        style={{ filter: `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color})` }}
      />
      <circle cx={cx - 3} cy={cy - 3} r="3" fill="#fff" opacity=".55" />
      <line x1={flatX} y1={cy - 6} x2={flatX} y2={cy + 6} stroke="#333" strokeWidth="1.6" />
      <text
        x={pa.x - (pc.x > pa.x ? 6 : -6)}
        y={pa.y - 5}
        fontSize="9"
        fontWeight="700"
        textAnchor="middle"
        fill="#C0392B"
        fontFamily="sans-serif"
      >
        +
      </text>
    </>
  );
};

/** Resistor, ported from jumper.html:305-316. */
const Resistor: PartRenderer = ({ element, bb }) => {
  const p1 = placed(element, 'p1', bb);
  const p2 = placed(element, 'p2', bb);
  if (!p1 || !p2) return null;

  const bands = ((element.display?.bands as string[]) ?? ['red', 'red', 'brown', 'gold']).slice(0, 4);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const L = Math.min(30, d - 10);
  const offs = [-L / 2 + 6, -L / 2 + 10.5, -L / 2 + 15, L / 2 - 6];

  return (
    <>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#A7ADB3" strokeWidth="1.8" strokeLinecap="round" />
      <g transform={`translate(${f1(mx)} ${f1(my)}) rotate(${f1(ang)})`}>
        <rect x={-L / 2} y="-5.5" width={L} height="11" rx="5" fill="#E3C999" stroke="#B89B62" />
        {bands.map((b, i) => (
          <rect key={i} x={f1(offs[i] - 1.4)} y="-5.5" width="2.8" height="11" fill={BAND_COLORS[b] ?? '#222'} />
        ))}
      </g>
    </>
  );
};

export const PART_RENDERERS: Record<string, PartRenderer> = {
  led: Led,
  resistor: Resistor,
};

export function getPartRenderer(drawing: string): PartRenderer | null {
  return PART_RENDERERS[drawing] ?? null;
}
