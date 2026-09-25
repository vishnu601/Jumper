/**
 * Board (microcontroller) definitions.
 *
 * Pin coordinates ported verbatim from the prototype (jumper.html:211-215).
 * The layout matches a real Uno with the USB port on the left: the top header
 * runs SCL..D0 left to right, the bottom header IOREF..A5.
 *
 * Boards are data, not code (spec 5.1) so a Nano or ESP32 is a new record here
 * and nothing else changes.
 */

export type PinSide = 'top' | 'bot';

export type PinRole = 'digital' | 'analog' | 'power' | 'ground' | 'other';

export interface BoardPin {
  id: string;
  /** Silkscreen text, e.g. "13", "5V". */
  lab: string;
  /** How a focus label names it, e.g. "Pin 13", "5V". */
  label: string;
  x: number;
  y: number;
  side: PinSide;
  role: PinRole;
}

/** A labelled point on the board that is not a pin (USB socket, status LEDs). */
export interface BoardSpot {
  id: string;
  x: number;
  y: number;
  label: string;
  dy: number;
}

export interface BoardDef {
  id: string;
  name: string;
  /** Operating voltage of the logic pins. */
  logicVoltage: number;
  /** Manufacturer's per-pin recommendation, in mA. */
  maxPinCurrentMa: number;
  pins: Record<string, BoardPin>;
  spots: Record<string, BoardSpot>;
  /** Pin ids that are ground, all joined internally. */
  groundPins: readonly string[];
  /** Pin ids that source a supply rail, mapped to their voltage. */
  supplyPins: Readonly<Record<string, number>>;
}

function roleOf(id: string): PinRole {
  if (id.startsWith('GND')) return 'ground';
  if (id === '5V' || id === '3V3' || id === 'VIN' || id === 'IOREF') return 'power';
  if (/^D\d+$/.test(id)) return 'digital';
  if (/^A\d+$/.test(id)) return 'analog';
  return 'other';
}

const TOP_HEADER: [string, string, number][] = [
  ['SCL', 'SCL', 96],
  ['SDA', 'SDA', 108],
  ['AREF', 'AREF', 120],
  ['GND_T', 'GND', 132],
  ['D13', '13', 144],
  ['D12', '12', 156],
  ['D11', '11', 168],
  ['D10', '10', 180],
  ['D9', '9', 192],
  ['D8', '8', 204],
  ['D7', '7', 220],
  ['D6', '6', 232],
  ['D5', '5', 244],
  ['D4', '4', 256],
  ['D3', '3', 268],
  ['D2', '2', 280],
  ['D1', '1', 292],
  ['D0', '0', 304],
];

const BOTTOM_HEADER: [string, string, number][] = [
  ['IOREF', 'IOREF', 142],
  ['RESET', 'RESET', 154],
  ['3V3', '3.3V', 166],
  ['5V', '5V', 178],
  ['GND_B1', 'GND', 190],
  ['GND_B2', 'GND', 202],
  ['VIN', 'VIN', 214],
  ['A0', 'A0', 232],
  ['A1', 'A1', 244],
  ['A2', 'A2', 256],
  ['A3', 'A3', 268],
  ['A4', 'A4', 280],
  ['A5', 'A5', 292],
];

const pins: Record<string, BoardPin> = {};

for (const [id, lab, x] of TOP_HEADER) {
  pins[id] = {
    id,
    lab,
    // Numeric silkscreen reads as "Pin 9"; named pins keep their name. (jumper.html:213)
    label: /^\d+$/.test(lab) ? `Pin ${lab}` : lab,
    x,
    y: 86,
    side: 'top',
    role: roleOf(id),
  };
}

for (const [id, lab, x] of BOTTOM_HEADER) {
  pins[id] = { id, lab, label: lab, x, y: 284, side: 'bot', role: roleOf(id) };
}

/** Landmarks used by the setup project, which has no breadboard. (jumper.html:217-221) */
const spots: Record<string, BoardSpot> = {
  usb: { id: 'usb', x: 31, y: 118, label: 'USB port', dy: -30 },
  onled: { id: 'onled', x: 293, y: 148, label: 'ON light', dy: -16 },
  lled: { id: 'lled', x: 135, y: 120, label: 'L light', dy: 20 },
};

export const UNO: BoardDef = {
  id: 'uno',
  name: 'Arduino Uno',
  logicVoltage: 5,
  // ATmega328P datasheet 32.1: 20 mA DC per I/O pin. Absolute max is 40 mA.
  maxPinCurrentMa: 20,
  pins,
  spots,
  groundPins: ['GND_T', 'GND_B1', 'GND_B2'],
  supplyPins: { '5V': 5, '3V3': 3.3 },
};

export const BOARDS: Record<string, BoardDef> = { uno: UNO };

export function getBoard(id: string): BoardDef {
  const b = BOARDS[id];
  if (!b) throw new Error(`Unknown board: ${id}`);
  return b;
}

export function isPinId(id: string, board: BoardDef = UNO): boolean {
  return id in board.pins;
}
