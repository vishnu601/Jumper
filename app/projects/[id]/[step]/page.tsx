import { notFound } from 'next/navigation';
import { GuidedBuild } from '@/components/step/GuidedBuild';
import { PROJECTS, getProject, nextProject } from '@/content/projects';
import { PARTS } from '@/content/parts';

/**
 * Steps are 1-based in the URL because that is how they are numbered in the
 * UI; a student who edits the address bar should get what they expect.
 */
export function generateStaticParams() {
  return PROJECTS.flatMap((p) =>
    p.steps.map((_, i) => ({ id: p.id, step: String(i + 1) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const { id, step } = await params;
  const project = getProject(id);
  if (!project) return {};
  return { title: `${project.name}: step ${step} | Jumper` };
}

export default async function StepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const { id, step } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const n = Number(step);
  if (!Number.isInteger(n) || n < 1 || n > project.steps.length) notFound();

  const next = nextProject(project.id);

  return (
    <GuidedBuild
      project={project}
      stepIndex={n - 1}
      parts={PARTS}
      nextProject={next ? { id: next.id, name: next.name } : undefined}
    />
  );
}
