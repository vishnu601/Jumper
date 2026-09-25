import type { Part } from '@/lib/schema/content';
import { led5mmRed } from './led-5mm';
import { res220 } from './res-220';
import { arduinoUno, breadboard, jumperWires } from './hardware';

export const ALL_PARTS: Part[] = [
  arduinoUno,
  breadboard,
  jumperWires,
  led5mmRed,
  res220,
];

export const PARTS: Record<string, Part> = Object.fromEntries(
  ALL_PARTS.map((p) => [p.id, p]),
);

export function getPart(id: string): Part {
  const p = PARTS[id];
  if (!p) throw new Error(`Unknown part: ${id}`);
  return p;
}
