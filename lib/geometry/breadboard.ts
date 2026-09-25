/**
 * Breadboard coordinate system.
 *
 * Ported verbatim from the prototype (jumper.html:205-210). Every number here
 * is load-bearing: the drawing code, the zoom framing and the focus rings all
 * assume these exact values. Do not "tidy" them.
 */

export const BREADBOARD_ROWS = {
  tn: 92,
  tp: 108,
  a: 136,
  b: 152,
  c: 168,
  d: 184,
  e: 200,
  f: 232,
  g: 248,
  h: 264,
  i: 280,
  j: 296,
  bp: 324,
  bn: 340,
} as const;

export type Row = keyof typeof BREADBOARD_ROWS;

/** Rows whose wires and legs exit upward. (jumper.html:207) */
export const TOP_ROWS: readonly Row[] = ['tn', 'tp', 'a', 'b', 'c', 'd', 'e'];

/** The four power rails, in board order. */
export const RAIL_ROWS: readonly Row[] = ['tn', 'tp', 'bp', 'bn'];

/** Human-readable rail names used on focus labels. (jumper.html:208) */
export const RAIL_NAMES: Record<string, string> = {
  tn: '− rail',
  tp: '+ rail',
  bp: '+ rail',
  bn: '− rail',
};

/** The two five-hole terminal groups, top and bottom of the centre gap. */
export const TOP_GROUP: readonly Row[] = ['a', 'b', 'c', 'd', 'e'];
export const BOTTOM_GROUP: readonly Row[] = ['f', 'g', 'h', 'i', 'j'];

export interface BreadboardDef {
  /** x of column 1. */
  x0: number;
  /** Centre-to-centre hole spacing. */
  pitch: number;
  cols: number;
  rows: typeof BREADBOARD_ROWS;
  /**
   * Long breadboards break each rail in the middle. When true, a rail is two
   * nets: columns 1..splitAfter and splitAfter+1..cols.
   */
  splitRails: boolean;
  splitAfter: number;
}

export const STANDARD_BREADBOARD: BreadboardDef = {
  x0: 380,
  pitch: 16,
  cols: 30,
  rows: BREADBOARD_ROWS,
  splitRails: false,
  splitAfter: 15,
};

export interface Point {
  x: number;
  y: number;
}

/** Centre of a hole. (jumper.html:209) */
export function hole(col: number, row: Row, bb: BreadboardDef = STANDARD_BREADBOARD): Point {
  return { x: bb.x0 + (col - 1) * bb.pitch, y: bb.rows[row] };
}

export function isRail(row: Row): boolean {
  return RAIL_ROWS.includes(row);
}

export function exitsUp(row: Row): boolean {
  return TOP_ROWS.includes(row);
}

export function isRow(value: string): value is Row {
  return value in BREADBOARD_ROWS;
}

/**
 * Parses a hole name as students write it: "e15", "a1", "tn18".
 * Returns null rather than throwing so callers can report position.
 */
export function parseHoleName(
  name: string,
  bb: BreadboardDef = STANDARD_BREADBOARD,
): { col: number; row: Row } | null {
  const m = /^([a-j]|tn|tp|bp|bn)(\d{1,2})$/.exec(name.trim());
  if (!m) return null;
  const row = m[1];
  const col = Number(m[2]);
  if (!isRow(row)) return null;
  if (!Number.isInteger(col) || col < 1 || col > bb.cols) return null;
  return { col, row };
}

/** How a hole is written on a focus label: rails get a name, holes get "e15". */
export function holeLabel(col: number, row: Row): string {
  return RAIL_NAMES[row] ?? `${row}${col}`;
}
