import type { Project } from '@/lib/schema/content';
import { blinkFast } from '@/content/sketches';

/**
 * Project 0, ported from jumper.html:632-674.
 *
 * No breadboard and no elements: every step is about the IDE, the cable and
 * the board's own lights, so `focus` targets board landmarks (usb, onled,
 * lled) rather than holes.
 */
export const setup: Project = {
  id: 'setup',
  order: 0,
  name: 'Get your board talking',
  summary:
    'Install the software, connect your board and upload your first program. No wiring yet.',
  learn: ['Arduino IDE', 'Boards and ports', 'Uploading code'],
  parts: [
    { partId: 'arduino-uno', qty: 1 },
  ],
  minutes: 15,
  board: 'uno',
  usesBreadboard: false,
  view: [0, 52, 345, 262],
  elements: [],
  steps: [
    {
      title: 'Install the Arduino IDE',
      body: `The IDE is the free program you use to write code and send it to the board. Download **Arduino IDE 2** from **arduino.cc/en/software** and install it like any other app.

On Windows, say yes if the installer asks to install USB drivers. You'll need them.`,
      why: 'An Arduino has no screen or keyboard. You write code on your computer, the IDE translates it into instructions the board\'s chip understands, and then sends them over USB.',
      checkpoint: {
        question: 'Did the IDE open with an empty sketch showing `setup()` and `loop()`?',
        success: 'Your workshop is ready.',
        fixes: [
          {
            title: 'Download it again from arduino.cc',
            detail:
              'Avoid third-party download sites so you get the current, official version.',
          },
          {
            title: 'Make sure the install finished',
            detail:
              'On a Mac, drag the app into Applications before opening it. On Windows, restart the computer if the installer asks.',
          },
        ],
      },
    },
    {
      title: 'Plug in the board',
      focus: ['usb', 'onled'],
      powered: true,
      body: `Connect the board to your computer with its USB cable. Uno boards usually use a square USB-B cable, like a printer cable.

A small green light marked **ON** should come on.`,
      tip: "Keep the board on a desk or its box, not on anything metal. Metal under the board can connect pins that shouldn't touch.",
      why: 'The USB cable does two jobs: it powers the board with 5 volts, and it carries your code to it.',
      checkpoint: {
        question: 'Is the ON light lit?',
        success: 'The board has power.',
        fixes: [
          {
            title: 'Try a different cable',
            detail:
              'Some cables can only charge and have no data wires. Use one you know works with a printer or another board.',
          },
          {
            title: 'Try another USB port',
            detail: 'Plug straight into the computer, not a hub or a keyboard.',
          },
          {
            title: 'Check what the board is sitting on',
            detail:
              'Lift it off any metal, foil or loose wires. If the light still stays off, the board may be faulty.',
            test: 'Ask a lab instructor to try it on their computer.',
          },
        ],
      },
    },
    {
      title: 'Pick your board and port',
      focus: ['usb'],
      powered: true,
      body: `In the IDE, open **Tools → Board → Arduino AVR Boards** and choose **Arduino Uno**.

Then open **Tools → Port** and pick the one that mentions Arduino Uno. On Windows it looks like **COM3**; on a Mac, like **/dev/cu.usbmodem…** or **/dev/cu.usbserial…**.`,
      why: 'The board setting tells the IDE which chip to translate your code for. The port tells it which USB connection to send the code through.',
      checkpoint: {
        question: 'Could you find and select a port?',
        success: 'The IDE can reach your board.',
        fixes: [
          {
            title: 'Find the right one by unplugging',
            detail:
              'Unplug the board, open Tools → Port and note the list. Plug it back in and check again. The new entry is your board.',
            test: 'Unplug, look at the list, plug back in, look again.',
          },
          {
            title: 'Install the CH340 driver (clone boards)',
            detail:
              'Many affordable Uno clones use a USB chip marked CH340, near the USB port. Search "CH340 driver" for your operating system, install it, then restart the IDE.',
          },
          {
            title: 'Close other programs using the board',
            detail:
              'Another IDE window, a Serial Monitor or 3D-printer software can hold the port. Close them and look again.',
          },
        ],
      },
    },
    {
      title: 'Upload your first program',
      focus: ['lled'],
      powered: true,
      animation: { lled: 'blink' },
      body: `Open **File → Examples → 01.Basics → Blink**, then click **Upload** (the right-pointing arrow at the top left).

Wait for **Done uploading** at the bottom. The small light marked **L** should blink: one second on, one second off.`,
      why: 'The L light is wired to pin 13 inside the board. Blink switches pin 13 on and off, so it tests the IDE, cable, port and board before you wire anything.',
      checkpoint: {
        question: 'Did it say "Done uploading", and is the L light blinking?',
        success: 'Your computer and board are talking.',
        fixes: [
          {
            title: 'Read the error message',
            detail:
              '"Not in sync" or "programmer is not responding" almost always means the wrong board or port. Redo the previous step.',
          },
          {
            title: '"Port busy" or "access denied"',
            detail:
              'Close the Serial Monitor and any other program using the board, then upload again.',
          },
          {
            title: 'Using a Nano instead of an Uno?',
            detail:
              'Choose Tools → Board → Arduino Nano, then Tools → Processor → ATmega328P (Old Bootloader) for most clones.',
          },
          {
            title: 'Blinking, but was it already blinking?',
            detail:
              'Many boards come with Blink preloaded. The next step proves your own upload worked.',
          },
        ],
      },
    },
    {
      title: 'Make it yours',
      focus: ['lled'],
      powered: true,
      animation: { lled: 'fast' },
      code: { file: 'Blink (edited)', source: blinkFast },
      body: `In the Blink code, change both \`delay(1000);\` lines to \`delay(200);\` and upload again.

The L light should now blink quickly.`,
      why: '`delay(1000)` pauses for 1000 milliseconds, which is one second. A smaller number means a shorter pause and faster blinking.',
      checkpoint: {
        question: 'Is it blinking faster now?',
        success:
          "That was your code running on real hardware. You're ready to build circuits.",
        fixes: [
          {
            title: 'Change both delays',
            detail: "One controls how long the light is on, the other how long it's off.",
          },
          {
            title: 'Check the upload finished',
            detail:
              'Look for "Done uploading" again. If there\'s an error, the fixes in the previous step apply.',
          },
        ],
      },
    },
  ],
};
