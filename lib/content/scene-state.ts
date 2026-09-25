import type { Project } from '@/lib/schema/content';
import { elementPoints, stripPoints } from '@/lib/geometry/bounds';
import { focusInfo } from '@/lib/geometry/focus';
import { zoomBox, type ViewBox } from '@/lib/geometry/zoom';
import type { Part } from '@/lib/schema/content';
import type { Point } from '@/lib/geometry/breadboard';

/**
 * What the diagram shows at a given step (jumper.html:455-461).
 *
 * Spec 12: never show the full circuit when a step-by-step view is possible.
 * Everything placed so far is visible; everything later is hidden; whatever
 * arrived in this step is marked fresh so it can glow.
 */

export interface SceneState {
  visible: Set<string>;
  fresh: Set<string>;
}

export function sceneState(project: Project, stepIndex: number, showAll = false): SceneState {
  if (showAll) {
    return { visible: new Set(project.elements.map((e) => e.id)), fresh: new Set() };
  }
  const visible = new Set<string>();
  project.steps
    .slice(0, stepIndex + 1)
    .forEach((s) => (s.add ?? []).forEach((id) => visible.add(id)));
  return { visible, fresh: new Set(project.steps[stepIndex]?.add ?? []) };
}

/**
 * The view box for a step: either the whole board, or a frame around what this
 * step asks the student to do.
 */
export function stepViewBox(
  project: Project,
  stepIndex: number,
  parts: Record<string, Part>,
  zoom: boolean,
): ViewBox {
  const view = project.view as ViewBox;
  if (!zoom || !project.usesBreadboard) return view;

  const step = project.steps[stepIndex];
  if (!step) return view;

  const { fresh } = sceneState(project, stepIndex);
  const points: Point[] = [];

  for (const target of step.focus ?? []) {
    const fi = focusInfo(target);
    points.push({ x: fi.x, y: fi.y }, { x: fi.x + fi.dx, y: fi.y + fi.dy });
  }
  for (const el of project.elements) {
    if (fresh.has(el.id)) points.push(...elementPoints(el, parts));
  }
  for (const strip of step.highlightStrips ?? []) {
    points.push(...stripPoints(strip));
  }

  return zoomBox(points, view);
}

/** A plain-language description of the step, for the diagram's aria-label. */
export function sceneLabel(project: Project, stepIndex: number): string {
  const step = project.steps[stepIndex];
  return step
    ? `Wiring diagram for ${project.name}, step ${stepIndex + 1}: ${step.title}`
    : `Wiring diagram for ${project.name}`;
}
