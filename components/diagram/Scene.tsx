'use client';

import { useId } from 'react';
import { Board } from './Board';
import { Breadboard, Strip } from './Breadboard';
import { Wire } from './Wire';
import { Focus } from './Focus';
import { getPartRenderer } from './parts';
import { sceneState, stepViewBox, sceneLabel } from '@/lib/content/scene-state';
import { STANDARD_BREADBOARD } from '@/lib/geometry/breadboard';
import { getBoard } from '@/lib/geometry/board';
import type { Part, Project } from '@/lib/schema/content';
import type { ViewBox } from '@/lib/geometry/zoom';
import './diagram.css';

export interface SceneProps {
  project: Project;
  stepIndex: number;
  parts: Record<string, Part>;
  /** Show the finished circuit rather than progress up to this step. */
  showAll?: boolean;
  zoom?: boolean;
  /** Overrides the step's own animation map (used by the home page hero). */
  animation?: Record<string, string>;
  label?: string;
  /** Renders the interactive element as pressed. */
  pressed?: boolean;
  className?: string;
}

/**
 * The whole diagram. Composes board, breadboard, parts, wires and focus rings
 * from project data; it has no knowledge of any specific project or part.
 */
export function Scene({
  project,
  stepIndex,
  parts,
  showAll = false,
  zoom = true,
  animation,
  label,
  pressed = false,
  className,
}: SceneProps) {
  const titleId = useId();
  const step = project.steps[stepIndex];
  const { visible, fresh } = sceneState(project, stepIndex, showAll);
  const anim = animation ?? (showAll ? {} : step?.animation ?? {});
  const powered = showAll ? true : !!step?.powered;
  const bb = STANDARD_BREADBOARD;
  const board = getBoard(project.board);

  const viewBox: ViewBox = showAll
    ? (project.view as ViewBox)
    : stepViewBox(project, stepIndex, parts, zoom);

  // Parts first, then wires, so a wire always lies over the part it reaches.
  const shown = project.elements.filter((e) => visible.has(e.id));
  const ordered = [...shown.filter((e) => e.kind !== 'wire'), ...shown.filter((e) => e.kind === 'wire')];

  return (
    <svg
      className={`scene ${className ?? ''}`}
      viewBox={viewBox.join(' ')}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{label ?? sceneLabel(project, stepIndex)}</title>

      <Board board={board} powered={powered} lledAnim={anim.lled} />
      {project.usesBreadboard && <Breadboard bb={bb} />}

      {!showAll &&
        (step?.highlightStrips ?? []).map((strip, i) => <Strip key={i} strip={strip} bb={bb} />)}

      {ordered.map((el) => {
        const isFresh = fresh.has(el.id);
        const groupClass = `el${isFresh ? ' is-new' : ''}`;

        if (el.kind === 'wire') {
          return (
            <g key={el.id} className={groupClass} data-id={el.id}>
              <Wire wire={el} />
            </g>
          );
        }

        const part = parts[el.partId];
        const Renderer = part ? getPartRenderer(part.drawing) : null;
        if (!part || !Renderer) return null;

        const lit = pressed && step?.interactive?.lights === el.id;
        return (
          <g key={el.id} className={`${groupClass}${lit ? ' lit' : ''}`} data-id={el.id}>
            {Renderer({ element: el, part, bb, anim: anim[el.id] })}
          </g>
        );
      })}

      {!showAll && step?.focus && step.focus.length > 0 && <Focus targets={step.focus} />}
    </svg>
  );
}
