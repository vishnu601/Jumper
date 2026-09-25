import { UNO, type BoardDef } from '@/lib/geometry/board';

/** The Arduino, ported from jumper.html:231-256. */
export function Board({
  board = UNO,
  powered,
  lledAnim,
}: {
  board?: BoardDef;
  powered: boolean;
  lledAnim?: string;
}) {
  const f1 = (n: number) => Math.round(n * 10) / 10;

  return (
    <g aria-hidden="true">
      <rect x="20" y="70" width="300" height="230" rx="10" fill="#137C83" stroke="#0B5C62" strokeWidth="2" />
      <circle cx="34" cy="288" r="5" fill="#0C5055" />
      <circle cx="310" cy="104" r="5" fill="#0C5055" />
      <circle cx="310" cy="270" r="5" fill="#0C5055" />

      {/* USB socket */}
      <rect x="4" y="96" width="54" height="44" rx="2" fill="#C2C8CD" stroke="#8C949A" />
      <rect x="12" y="104" width="30" height="28" fill="#9AA2A8" />
      {/* Barrel jack */}
      <rect x="4" y="238" width="46" height="40" rx="3" fill="#1C1C1C" />
      <circle cx="28" cy="258" r="9" fill="#333" />
      {/* Reset button */}
      <rect x="64" y="77" width="16" height="16" rx="2" fill="#CFCFCF" />
      <circle cx="72" cy="85" r="4.5" fill="#B7372F" />

      {/* The main chip */}
      <rect x="150" y="196" width="150" height="34" rx="2" fill="#1A1A1A" />
      {Array.from({ length: 14 }, (_, i) => {
        const x = f1(156 + i * 10.3);
        return (
          <g key={i}>
            <rect x={x} y="192" width="3" height="4" fill="#C5C5C5" />
            <rect x={x} y="230" width="3" height="4" fill="#C5C5C5" />
          </g>
        );
      })}

      <text x="68" y="186" fontFamily="var(--font-head)" fontWeight="800" fontSize="24" fill="#fff" opacity=".9">
        UNO
      </text>

      {/* Header strips */}
      <rect x="90" y="80" width="120" height="12" fill="#151515" />
      <rect x="214" y="80" width="96" height="12" fill="#151515" />
      <rect x="136" y="278" width="84" height="12" fill="#151515" />
      <rect x="226" y="278" width="72" height="12" fill="#151515" />

      {Object.values(board.pins).map((p) => (
        <g key={p.id}>
          <rect x={p.x - 2.5} y={p.y - 2.5} width="5" height="5" fill="#3E3E3E" />
          {p.side === 'top' ? (
            <text
              x={p.x + 2.2}
              y="98"
              transform={`rotate(-90 ${p.x + 2.2} 98)`}
              textAnchor="end"
              fontSize="6"
              fill="#fff"
              opacity=".85"
              fontFamily="sans-serif"
            >
              {p.lab}
            </text>
          ) : (
            <text
              x={p.x + 2.2}
              y="272"
              transform={`rotate(-90 ${p.x + 2.2} 272)`}
              fontSize="6"
              fill="#fff"
              opacity=".85"
              fontFamily="sans-serif"
            >
              {p.lab}
            </text>
          )}
        </g>
      ))}

      {/* The built-in L light, wired to pin 13 inside the board. */}
      <rect x="131" y="118" width="8" height="4" fill="#5B4A1F" />
      <rect
        className={`led-glow ${lledAnim ? `a-${lledAnim}` : ''}`}
        x="131"
        y="118"
        width="8"
        height="4"
        fill="#FFC23A"
        style={{ filter: 'drop-shadow(0 0 4px #FFB300)' }}
      />
      <text x="143" y="123" fontSize="6" fill="#fff" fontFamily="sans-serif">
        L
      </text>

      {/* The ON light */}
      <rect
        x="289"
        y="146"
        width="8"
        height="4"
        fill={powered ? '#48E27A' : '#1E4D2E'}
        style={powered ? { filter: 'drop-shadow(0 0 4px #48E27A)' } : undefined}
      />
      <text x="285" y="150.5" textAnchor="end" fontSize="6" fill="#fff" fontFamily="sans-serif">
        ON
      </text>
    </g>
  );
}
