import {
  projectSchema,
  partSchema,
  isHoleRef,
  isPartPinRef,
  type Project,
  type Part,
  type Endpoint,
} from './content';

/**
 * Cross-field content checks that a per-field schema cannot express.
 *
 * These run from `npm run content:check` and from a Vitest test, so bad content
 * fails the test suite rather than reaching a student as a wrong instruction.
 */

export interface ContentIssue {
  where: string;
  message: string;
}

function endpointPartRef(e: Endpoint | string): { part: string; pin: string } | null {
  return isPartPinRef(e) ? e : null;
}

export function validateProject(
  project: unknown,
  parts: Record<string, Part>,
): ContentIssue[] {
  const parsed = projectSchema.safeParse(project);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      where: i.path.join('.') || '(root)',
      message: i.message,
    }));
  }

  const p: Project = parsed.data;
  const issues: ContentIssue[] = [];
  const at = (s: string) => `${p.id}: ${s}`;

  const elementIds = new Set(p.elements.map((e) => e.id));
  if (elementIds.size !== p.elements.length) {
    issues.push({ where: at('elements'), message: 'duplicate element id' });
  }

  // Every element is introduced by exactly one step. An element that is never
  // added would be invisible for the whole build; one added twice would glow
  // as "new" in two different steps.
  const addedIn = new Map<string, number>();
  p.steps.forEach((step, i) => {
    for (const id of step.add ?? []) {
      if (!elementIds.has(id)) {
        issues.push({
          where: at(`steps[${i}].add`),
          message: `"${id}" is not an element of this project`,
        });
        continue;
      }
      const first = addedIn.get(id);
      if (first !== undefined) {
        issues.push({
          where: at(`steps[${i}].add`),
          message: `"${id}" was already added in step ${first + 1}`,
        });
      } else {
        addedIn.set(id, i);
      }
    }
  });

  for (const id of elementIds) {
    if (!addedIn.has(id)) {
      issues.push({
        where: at('elements'),
        message: `"${id}" is never added by any step, so it would never be drawn`,
      });
    }
  }

  // Collect part pins referenced by wires, so an off-board part (servo leads)
  // counts as connected even with an empty placement.
  const wiredPartPins = new Set<string>();
  for (const el of p.elements) {
    if (el.kind !== 'wire') continue;
    for (const end of [el.from, el.to]) {
      const ref = endpointPartRef(end);
      if (ref) wiredPartPins.add(`${ref.part}:${ref.pin}`);
    }
  }

  for (const el of p.elements) {
    if (el.kind !== 'part') continue;
    const part = parts[el.partId];
    if (!part) {
      issues.push({
        where: at(`elements.${el.id}`),
        message: `unknown partId "${el.partId}"`,
      });
      continue;
    }
    const pinIds = new Set(part.pins.map((pin) => pin.id));
    for (const pinId of Object.keys(el.placement)) {
      if (!pinIds.has(pinId)) {
        issues.push({
          where: at(`elements.${el.id}.placement`),
          message: `"${pinId}" is not a pin on ${part.id}`,
        });
      }
    }
    for (const pin of part.pins) {
      const required = pin.role === 'power' || pin.role === 'ground' || pin.role === 'signal';
      if (!required) continue;
      const connected = pin.id in el.placement || wiredPartPins.has(`${el.id}:${pin.id}`);
      if (!connected) {
        issues.push({
          where: at(`elements.${el.id}`),
          message: `${part.name} pin "${pin.label}" (${pin.role}) is not connected`,
        });
      }
    }
  }

  // Wires and focus targets may only name elements that exist.
  for (const el of p.elements) {
    if (el.kind !== 'wire') continue;
    for (const end of [el.from, el.to]) {
      const ref = endpointPartRef(end);
      if (ref && !elementIds.has(ref.part)) {
        issues.push({
          where: at(`elements.${el.id}`),
          message: `wire references unknown element "${ref.part}"`,
        });
      }
    }
  }

  p.steps.forEach((step, i) => {
    for (const f of step.focus ?? []) {
      const ref = endpointPartRef(f);
      if (ref && !elementIds.has(ref.part)) {
        issues.push({
          where: at(`steps[${i}].focus`),
          message: `unknown element "${ref.part}"`,
        });
      }
      if (typeof f === 'string' || isHoleRef(f)) continue;
    }
    if (step.animation) {
      for (const id of Object.keys(step.animation)) {
        // Animations may target board landmarks (the built-in L light) as well
        // as elements, so only flag ids that look like neither.
        if (!elementIds.has(id) && !['lled', 'onled'].includes(id)) {
          issues.push({
            where: at(`steps[${i}].animation`),
            message: `"${id}" is neither an element nor a board light`,
          });
        }
      }
    }
    if (step.interactive) {
      for (const id of [step.interactive.press, step.interactive.lights]) {
        if (!elementIds.has(id)) {
          issues.push({
            where: at(`steps[${i}].interactive`),
            message: `unknown element "${id}"`,
          });
        }
      }
    }
  });

  return issues;
}

export function validatePart(part: unknown): ContentIssue[] {
  const parsed = partSchema.safeParse(part);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      where: i.path.join('.') || '(root)',
      message: i.message,
    }));
  }
  const p = parsed.data;
  const issues: ContentIssue[] = [];
  const pinIds = new Set(p.pins.map((pin) => pin.id));
  for (const group of [...(p.internalConnections ?? []), ...(p.switchedConnections ?? [])]) {
    for (const pinId of group) {
      if (!pinIds.has(pinId)) {
        issues.push({
          where: `${p.id}.connections`,
          message: `"${pinId}" is not a pin on this part`,
        });
      }
    }
  }
  return issues;
}
