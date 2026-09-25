import { focusInfo, layoutLabels, type FocusOptions } from '@/lib/geometry/focus';
import type { Endpoint } from '@/lib/schema/content';

/**
 * Focus rings and labels, ported from jumper.html:434-453.
 *
 * Rings are drawn first and labels second, so a label is never hidden under a
 * later ring. Labels are laid out together so they can avoid each other.
 */
export function Focus({
  targets,
  options,
}: {
  targets: (Endpoint | string)[];
  options?: FocusOptions;
}) {
  const infos = targets.map((t) => focusInfo(t, options));
  const labels = layoutLabels(infos);
  const f1 = (n: number) => Math.round(n * 10) / 10;

  return (
    <g aria-hidden="true">
      {infos.map((fi, i) => (
        <g key={`ring-${i}`}>
          <circle cx={fi.x} cy={fi.y} r="6.5" fill="none" stroke="#F2B53A" strokeWidth="2.4" />
          <circle className="ring-pulse" cx={fi.x} cy={fi.y} r="6.5" fill="none" stroke="#F2B53A" strokeWidth="2" />
        </g>
      ))}
      {labels.map((l, i) => (
        <g key={`label-${i}`}>
          <rect x={f1(l.x)} y={f1(l.y)} width={f1(l.w)} height={l.h} rx="7.5" fill="#F2B53A" stroke="#2A1D00" strokeOpacity=".25" />
          <text
            x={f1(l.cx)}
            y={f1(l.cy)}
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
            fill="#2A1D00"
            fontFamily="var(--font-mono)"
          >
            {l.text}
          </text>
        </g>
      ))}
    </g>
  );
}
