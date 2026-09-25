import { z } from 'zod';
import { BREADBOARD_ROWS, STANDARD_BREADBOARD } from '@/lib/geometry/breadboard';
import { UNO } from '@/lib/geometry/board';

/**
 * Zod is the source of truth for every content type (spec 6). TypeScript types
 * are inferred from these schemas, never declared alongside them, so a schema
 * and its type cannot drift apart.
 */

const ROW_IDS = Object.keys(BREADBOARD_ROWS) as [string, ...string[]];

export const rowSchema = z.enum(ROW_IDS);

/** [col, row] — "e15" is [15, 'e']. */
export const holeRefSchema = z.tuple([
  z.number().int().min(1).max(STANDARD_BREADBOARD.cols),
  rowSchema,
]);

/** A board pin id, validated against the board's actual pin list. */
export const pinRefSchema = z.string().refine((id) => id in UNO.pins, {
  message: 'not a pin on this board',
});

/** A pin on a placed part, for parts that sit off the breadboard (servo leads). */
export const partPinRefSchema = z.object({
  part: z.string().min(1),
  pin: z.string().min(1),
});

export const endpointSchema = z.union([holeRefSchema, pinRefSchema, partPinRefSchema]);

export const wireColorSchema = z.enum([
  'red',
  'black',
  'yellow',
  'orange',
  'blue',
  'purple',
  'green',
  'white',
]);

export const pinRoleSchema = z.enum([
  'power',
  'ground',
  'signal',
  'passive',
  'anode',
  'cathode',
]);

export const partPinSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: pinRoleSchema,
});

/**
 * Only verified values belong here. Anything uncertain is flagged with a
 * `// VERIFY:` comment in the part file rather than guessed (spec 10).
 */
export const partSpecsSchema = z.object({
  supplyVoltage: z.tuple([z.number(), z.number()]).optional(),
  logicVoltage: z.number().optional(),
  maxCurrentmA: z.number().optional(),
  typicalCurrentmA: z.number().optional(),
  forwardVoltage: z.number().optional(),
  resistanceOhms: z.number().optional(),
});

export const partSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pins: z.array(partPinSchema),
  /** Pins joined inside the part, always. */
  internalConnections: z.array(z.array(z.string())).optional(),
  /** Pins joined only while the part is actuated (a pressed button). */
  switchedConnections: z.array(z.array(z.string())).optional(),
  specs: partSpecsSchema,
  polarized: z.boolean(),
  glossary: z.object({
    what: z.string().min(1),
    spot: z.string().min(1),
    watch: z.string().min(1),
  }),
  /** Key into the diagram's renderer registry. */
  drawing: z.string().min(1),
});

const partElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('part'),
  partId: z.string().min(1),
  /** part pin id -> breadboard hole. Omitted pins are unconnected. */
  placement: z.record(z.string(), holeRefSchema).default({}),
  /** Renderer hints that carry no electrical meaning (LED body colour, bands). */
  display: z.record(z.string(), z.unknown()).optional(),
});

const wireElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('wire'),
  from: endpointSchema,
  to: endpointSchema,
  color: wireColorSchema,
  /** Override the exit normal when the default would route the wire badly. */
  n1: z.tuple([z.number(), z.number()]).optional(),
  n2: z.tuple([z.number(), z.number()]).optional(),
});

export const elementSchema = z.discriminatedUnion('kind', [
  partElementSchema,
  wireElementSchema,
]);

/** A run of breadboard holes highlighted to teach connectivity. */
export const stripRefSchema = z.union([
  z.object({ col: z.number().int().min(1), from: rowSchema, to: rowSchema }),
  z.object({ rail: rowSchema }),
]);

export const checkpointSchema = z.object({
  question: z.string().min(1),
  success: z.string().min(1),
  /** Ordered most-likely-first (spec 3.5). */
  fixes: z
    .array(
      z.object({
        title: z.string().min(1),
        detail: z.string().min(1),
        test: z.string().optional(),
      }),
    )
    .min(1),
});

export const stepSchema = z.object({
  title: z.string().min(1),
  /** Token markup; see lib/content/parse-body.ts. */
  body: z.string().min(1),
  add: z.array(z.string()).optional(),
  focus: z.array(z.union([endpointSchema, z.string()])).optional(),
  highlightStrips: z.array(stripRefSchema).optional(),
  tip: z.string().optional(),
  why: z.string().optional(),
  checklist: z.array(z.string()).optional(),
  code: z.object({ file: z.string().min(1), source: z.string().min(1) }).optional(),
  expect: z.object({ kind: z.enum(['serial', 'visual']), content: z.string() }).optional(),
  powered: z.boolean().optional(),
  animation: z.record(z.string(), z.string()).optional(),
  interactive: z.object({ press: z.string(), lights: z.string() }).optional(),
  checkpoint: checkpointSchema.optional(),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  name: z.string().min(1),
  summary: z.string().min(1),
  learn: z.array(z.string()).min(1),
  parts: z.array(z.object({ partId: z.string().min(1), qty: z.number().int().min(1) })),
  minutes: z.number().int().min(1),
  board: z.literal('uno'),
  usesBreadboard: z.boolean(),
  /** SVG viewBox for "show whole board": [x, y, w, h]. */
  view: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  elements: z.array(elementSchema),
  steps: z.array(stepSchema).min(1),
  prerequisites: z.array(z.string()).optional(),
});

export type HoleRef = z.infer<typeof holeRefSchema>;
export type PartPinRef = z.infer<typeof partPinRefSchema>;
export type Endpoint = z.infer<typeof endpointSchema>;
export type WireColor = z.infer<typeof wireColorSchema>;
export type PartPin = z.infer<typeof partPinSchema>;
export type Part = z.infer<typeof partSchema>;
export type PartElement = z.infer<typeof partElementSchema>;
export type WireElement = z.infer<typeof wireElementSchema>;
export type Element = z.infer<typeof elementSchema>;
export type StripRef = z.infer<typeof stripRefSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Project = z.infer<typeof projectSchema>;

export function isHoleRef(e: Endpoint | string): e is HoleRef {
  return Array.isArray(e);
}

export function isPartPinRef(e: Endpoint | string): e is PartPinRef {
  return typeof e === 'object' && e !== null && !Array.isArray(e);
}
