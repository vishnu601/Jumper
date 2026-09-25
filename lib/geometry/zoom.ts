import type { Point } from './breadboard';

export type ViewBox = readonly [number, number, number, number];

const f1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Frames a step's points inside the project's view box (jumper.html:463-484).
 *
 * Padding is generous on purpose: spec 7.3 requires enough surrounding context
 * that the row letters and column numbers stay readable, otherwise a zoomed
 * diagram tells a student "put it here" without saying where "here" is.
 *
 * Falls back to the whole board when the points are too spread out to zoom.
 */
export function zoomBox(points: Point[], view: ViewBox): ViewBox {
  if (points.length === 0) return view;

  const x1 = Math.min(...points.map((p) => p.x)) - 44;
  const x2 = Math.max(...points.map((p) => p.x)) + 44;
  const y1 = Math.min(...points.map((p) => p.y)) - 40;
  const y2 = Math.max(...points.map((p) => p.y)) + 40;

  const aspect = view[2] / view[3];
  let w = Math.max(x2 - x1, 480);
  let h = Math.max(y2 - y1, 200);
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;

  if (w > view[2] || h > view[3]) return view;

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const x = Math.min(Math.max(cx - w / 2, view[0]), view[0] + view[2] - w);
  const y = Math.min(Math.max(cy - h / 2, view[1]), view[1] + view[3] - h);

  return [f1(x), f1(y), f1(w), f1(h)];
}
