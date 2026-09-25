import type { Part } from '@/lib/schema/content';

/**
 * 220 Ω carbon film resistor, the current-limiting resistor in most starter
 * kits. Colour bands red-red-brown, with a gold tolerance band (±5%).
 *
 * Resistors are not polarized: either leg may go either way (spec 10 asks us
 * to say so explicitly wherever a part works both ways).
 */
export const res220: Part = {
  id: 'res-220',
  name: '220 Ω resistor',
  pins: [
    { id: 'p1', label: 'leg', role: 'passive' },
    { id: 'p2', label: 'leg', role: 'passive' },
  ],
  specs: {
    resistanceOhms: 220,
  },
  polarized: false,
  glossary: {
    what: 'Limits how much current flows through part of a circuit.',
    spot: 'A small cylinder with coloured bands. 220 Ω is red, red, brown. 10 kΩ is brown, black, orange.',
    watch: 'It works either way round.',
  },
  drawing: 'resistor',
};
