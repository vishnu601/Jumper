import type { Part } from '@/lib/schema/content';

/**
 * Standard 5 mm through-hole indicator LED.
 *
 * forwardVoltage is the value the "about 13 mA" figure in project 1 rests on,
 * so it is stated rather than assumed: 2.0 V is typical for a red 5 mm LED at
 * ~15 mA (Kingbright WP7113ID datasheet, Vf typ 2.0 V / max 2.5 V at 20 mA).
 * Other colours differ substantially — green and blue run 3.0-3.4 V — so when
 * projects 2+ introduce them they need their own part records, not this one
 * with a different display colour.
 *
 * maxCurrentmA 20 is the continuous forward current these parts are rated for.
 */
export const led5mmRed: Part = {
  id: 'led-5mm-red',
  name: 'Red LED',
  pins: [
    { id: 'anode', label: 'long leg (+)', role: 'anode' },
    { id: 'cathode', label: 'short leg (−)', role: 'cathode' },
  ],
  specs: {
    forwardVoltage: 2.0,
    maxCurrentmA: 20,
    typicalCurrentmA: 15,
  },
  polarized: true,
  glossary: {
    what: 'Lights up when current flows through it the right way.',
    spot: 'The long leg is positive (anode). A flat edge on the rim marks the negative leg (cathode).',
    watch: 'Always pair it with a resistor. Without one it can burn out in seconds.',
  },
  drawing: 'led',
};
