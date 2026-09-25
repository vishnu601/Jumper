import { hole, holeLabel, STANDARD_BREADBOARD, type BreadboardDef, type Row } from './breadboard';
import { UNO, type BoardDef } from './board';
import { isHoleRef, isPartPinRef, type Endpoint } from '@/lib/schema/content';
import type { PartPinResolver } from './wire';

/**
 * Focus rings and their labels (jumper.html:421-453).
 *
 * `dy` is which side of the target the label sits on, chosen so it never
 * covers the hole a student is being told to use.
 */

export interface FocusInfo {
  x: number;
  y: number;
  label: string;
  dx: number;
  dy: number;
}

/** Rows whose label is better placed below the hole. (jumper.html:429) */
const LABEL_BELOW: readonly string[] = ['a', 'b', 'c', 'd', 'e', 'bp', 'bn'];

export interface FocusOptions {
  breadboard?: BreadboardDef;
  board?: BoardDef;
  partPin?: PartPinResolver;
  partPinLabel?: (elementId: string, pinId: string) => string;
}

export function focusInfo(target: Endpoint | string, opts: FocusOptions = {}): FocusInfo {
  const bb = opts.breadboard ?? STANDARD_BREADBOARD;
  const board = opts.board ?? UNO;

  if (isHoleRef(target)) {
    const [col, row] = target as [number, Row];
    const p = hole(col, row, bb);
    return {
      x: p.x,
      y: p.y,
      label: holeLabel(col, row),
      dx: 0,
      dy: LABEL_BELOW.includes(row) ? 16 : -16,
    };
  }

  if (isPartPinRef(target)) {
    const resolved = opts.partPin?.(target.part, target.pin);
    if (!resolved) throw new Error(`Cannot place part pin ${target.part}.${target.pin}`);
    return {
      x: resolved.x,
      y: resolved.y,
      label: opts.partPinLabel?.(target.part, target.pin) ?? target.pin,
      dx: -30,
      dy: 0,
    };
  }

  const pin = board.pins[target];
  if (pin) {
    return { x: pin.x, y: pin.y, label: pin.label, dx: 0, dy: pin.side === 'top' ? -16 : 18 };
  }

  const spot = board.spots[target];
  if (spot) return { x: spot.x, y: spot.y, label: spot.label, dx: 0, dy: spot.dy };

  throw new Error(`Unknown focus target: ${target}`);
}

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  cx: number;
  cy: number;
}

/**
 * Lays out focus labels, nudging each away from ones already placed.
 * Spec 7.3: labels never overlap each other.
 */
export function layoutLabels(infos: FocusInfo[]): LabelBox[] {
  const placed: LabelBox[] = [];
  const h = 15;

  for (const fi of infos) {
    const w = fi.label.length * 5.4 + 12;
    const x = fi.x + fi.dx - w / 2;
    let y = fi.y + fi.dy - h / 2;

    for (let tries = 0; tries < 5; tries++) {
      const hit = placed.some(
        (r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y,
      );
      if (!hit) break;
      y += fi.dy >= 0 ? 17 : -17;
    }

    placed.push({ x, y, w, h, text: fi.label, cx: x + w / 2, cy: y + 10.8 });
  }

  return placed;
}
