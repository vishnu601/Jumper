import type { Part } from '@/lib/schema/content';

/**
 * Glossary-only entries. These have no placeable pins: the board and the
 * breadboard are the stage the circuit is built on, and jumper wires are
 * modelled as wire elements rather than parts. They exist here so the parts
 * page can describe them with the same shape as everything else.
 */

export const arduinoUno: Part = {
  id: 'arduino-uno',
  name: 'Arduino Uno',
  pins: [],
  specs: {
    logicVoltage: 5,
    // ATmega328P datasheet 32.1: 20 mA recommended per I/O pin.
    maxCurrentmA: 20,
  },
  polarized: false,
  glossary: {
    what: 'A small computer that reads inputs like buttons and sensors, and controls outputs like lights and motors, using code you write.',
    spot: 'A teal or blue board with a USB port, a large black chip and rows of pin sockets along two edges.',
    watch: "Each pin safely supplies about 20 mA. That's enough for an LED, not a motor.",
  },
  drawing: 'board',
};

export const breadboard: Part = {
  id: 'breadboard',
  name: 'Breadboard',
  pins: [],
  specs: {},
  polarized: false,
  glossary: {
    what: 'Lets you build and change circuits without soldering.',
    spot: 'A white plastic board full of holes, with red and blue lines along the edges.',
    watch: 'Columns a–e and f–j are separate halves. Long boards sometimes split the rails in the middle.',
  },
  drawing: 'breadboard',
};

export const jumperWires: Part = {
  id: 'jumper-wires',
  name: 'Jumper wires',
  pins: [],
  specs: {},
  polarized: false,
  glossary: {
    what: "Connect holes on the breadboard to each other and to the Arduino's pins.",
    spot: 'Coloured wires with a metal pin on each end.',
    watch: 'Use red for power and black for ground. Wires do break inside; if nothing makes sense, swap the wire.',
  },
  drawing: 'jumper-wires',
};
