import type { Project } from '@/lib/schema/content';
import { setup } from './setup';
import { firstLight } from './first-light';

/** The project path, in build order (spec 7.1). */
export const PROJECTS: Project[] = [setup, firstLight].sort((a, b) => a.order - b.order);

export const PROJECTS_BY_ID: Record<string, Project> = Object.fromEntries(
  PROJECTS.map((p) => [p.id, p]),
);

export function getProject(id: string): Project | undefined {
  return PROJECTS_BY_ID[id];
}

export function nextProject(id: string): Project | undefined {
  const i = PROJECTS.findIndex((p) => p.id === id);
  return i === -1 ? undefined : PROJECTS[i + 1];
}
