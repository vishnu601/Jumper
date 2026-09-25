import type { Project } from '@/lib/schema/content';
import { blink } from '@/content/sketches';

/**
 * Project 1, ported from jumper.html:676-722.
 *
 * The wiring is unchanged from the prototype: LED long leg e15 / short leg
 * e16, a 220 Ω resistor from b16 to the top − rail at column 18, pin 9 to a15,
 * and GND to the same rail at column 2. Those claims are what a student acts
 * on, so the port preserves them exactly; only the markup changed.
 */
export const firstLight: Project = {
  id: 'first-light',
  order: 1,
  name: 'Light up an LED',
  summary: 'Wire your first circuit on a breadboard and make an LED blink.',
  learn: ['How a breadboard connects', 'LED direction', 'Why LEDs need resistors'],
  parts: [
    { partId: 'led-5mm-red', qty: 1 },
    { partId: 'res-220', qty: 1 },
    { partId: 'jumper-wires', qty: 2 },
    { partId: 'breadboard', qty: 1 },
  ],
  minutes: 20,
  board: 'uno',
  usesBreadboard: true,
  view: [0, 0, 880, 395],
  elements: [
    {
      id: 'led1',
      kind: 'part',
      partId: 'led-5mm-red',
      placement: { anode: [15, 'e'], cathode: [16, 'e'] },
      display: { color: 'red' },
    },
    {
      id: 'r1',
      kind: 'part',
      partId: 'res-220',
      placement: { p1: [16, 'b'], p2: [18, 'tn'] },
      display: { bands: ['red', 'red', 'brown', 'gold'] },
    },
    { id: 'w1', kind: 'wire', from: 'D9', to: [15, 'a'], color: 'yellow' },
    { id: 'w2', kind: 'wire', from: 'GND_T', to: [2, 'tn'], color: 'black' },
  ],
  steps: [
    {
      title: 'Meet the breadboard',
      highlightStrips: [
        { col: 5, from: 'a', to: 'e' },
        { col: 9, from: 'f', to: 'j' },
        { rail: 'tp' },
      ],
      body: `Metal strips hidden inside the breadboard connect certain holes. The highlighted holes show the pattern.

Each short column of five holes is connected: **a–e** is one group and **f–j** is another. The gap in the middle keeps the two halves apart.

The long rows along the edges, marked [[+rail]] and [[-rail]], are connected all the way across. These are the power rails.`,
      tip: "Some long breadboards split the rails halfway along. If the red or blue line has a break, the two halves aren't connected.",
      why: "Putting two legs in the same column connects them, just like twisting wires together. That's how you build circuits without soldering.",
    },
    {
      title: 'Place the LED',
      add: ['led1'],
      focus: [
        [15, 'e'],
        [16, 'e'],
      ],
      body: `Find the LED's **longer leg**. That's the positive side, called the anode.

Push the long leg into [[e15]] and the short leg into [[e16]].`,
      tip: "If the legs have been trimmed to the same length, look for the flat edge on the LED's rim. The flat side is the negative (short) leg.",
      why: "An LED lets electricity flow only one way, from the long leg to the short leg. If it's backwards it simply won't light. It won't be damaged, so it's safe to flip.",
      checklist: ['Long leg in e15', 'Short leg in e16', 'Both legs pushed in until they stop'],
    },
    {
      title: 'Add the resistor',
      add: ['r1'],
      focus: [
        [16, 'b'],
        [18, 'tn'],
      ],
      body: `Find the resistor with bands **red, red, brown** (and a gold band). That's 220 Ω.

Put one leg in [[b16]], the same column as the LED's short leg. Put the other leg in the top [[-rail]], around column 18.

Resistors work either way round.`,
      why: 'Without a resistor, the LED would draw too much current from the Arduino pin and could burn out the LED or damage the pin. 220 Ω keeps the current around 13 mA: bright, but safe.',
    },
    {
      title: 'Connect pin 9',
      add: ['w1'],
      focus: ['D9', [15, 'a']],
      body: `Plug a yellow jumper wire into **pin 9** on the Arduino's top row of pins.

Put the other end in [[a15]], the column with the LED's long leg.`,
      why: 'Pin 9 is a switch your code controls. When the code turns it on, it sends 5 volts down this wire to the LED\'s long leg.',
    },
    {
      title: 'Connect ground',
      add: ['w2'],
      focus: ['GND_T', [2, 'tn']],
      body: `Plug a black wire into the **GND** pin next to pin 13.

Put the other end in the top [[-rail]], at the far left.`,
      why: 'Electricity needs a complete loop to flow. Ground (GND) is the path back to the Arduino. By habit, black means ground and red means power, so you can read a circuit at a glance.',
    },
    {
      title: 'Trace the loop before powering',
      body: `Before you plug in the USB cable, follow the path with your finger:

Pin 9 → yellow wire → column 15 → LED → column 16 → resistor → blue rail → black wire → GND.

A break anywhere in that loop means the LED won't light.`,
      why: 'Checking a circuit before powering it is a habit engineers use on every build. It catches most mistakes while they\'re still easy to fix.',
      checklist: [
        'Yellow wire goes from pin 9 to a15',
        'LED long leg in e15, short leg in e16',
        'Resistor goes from b16 to the blue rail',
        'Black wire goes from GND to the same blue rail',
      ],
    },
    {
      title: 'Upload the code',
      powered: true,
      code: { file: 'first_light.ino', source: blink },
      body: `Plug in the USB cable. In the IDE, choose **File → New Sketch**, replace everything with this code, and click **Upload**.`,
      why: '`pinMode` sets pin 9 as an output. Everything inside `loop()` repeats forever: on, wait one second, off, wait one second.',
    },
    {
      title: 'Test it',
      powered: true,
      animation: { led1: 'blink' },
      body: `Your LED should turn on for one second, then off for one second, over and over. The diagram shows what to expect.`,
      expect: { kind: 'visual', content: 'The LED blinks: one second on, one second off.' },
      checkpoint: {
        question: 'Is your LED blinking?',
        success:
          'You built a complete circuit and controlled it with code. Every Arduino project builds on this.',
        fixes: [
          {
            title: 'Check the upload finished',
            detail:
              'Look for "Done uploading" in the IDE. If you see an error, go back to Get your board talking.',
          },
          {
            title: 'Flip the LED',
            detail:
              'A backwards LED is the most common reason it stays dark. Swap its legs. This is safe.',
          },
          {
            title: 'Push every leg and wire in firmly',
            detail:
              "A half-inserted leg doesn't touch the metal inside. Press each one until it stops.",
          },
          {
            title: 'Check the rail',
            detail:
              'The resistor and the black wire must be in the same rail row, and on the same side of any break in the rail.',
          },
          {
            title: 'Test the LED on its own',
            detail:
              'Move the yellow wire from pin 9 to the 5V pin. If the LED now lights steadily, the circuit is fine and the problem is the code or the pin number. If it stays dark, the problem is the LED, resistor or wiring.',
            test: 'Put the wire back on pin 9 afterwards.',
          },
        ],
      },
    },
  ],
};
