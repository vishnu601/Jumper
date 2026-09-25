'use client';

import Link from 'next/link';
import { Body, InlineText } from './Body';
import { CodeBlock } from './CodeBlock';
import { Checklist } from './Checklist';
import { Checkpoint } from './Checkpoint';
import { playPop, playClick } from '@/lib/sounds';
import type { Project } from '@/lib/schema/content';

/** The right-hand panel: everything the student reads and acts on. */
export function StepPanel({
  project,
  stepIndex,
  nextProject,
}: {
  project: Project;
  stepIndex: number;
  nextProject?: { id: string; name: string };
}) {
  const step = project.steps[stepIndex];
  const total = project.steps.length;
  const isLast = stepIndex === total - 1;

  return (
    <section
      className="min-w-0 rounded-2xl border border-line bg-panel px-4 pb-5 pt-4.5 sm:px-6 sm:pb-6 sm:pt-5.5"
      aria-labelledby="step-title"
    >
      <nav className="mb-4.5 flex flex-wrap gap-1.5" aria-label="Steps">
        {project.steps.map((s, i) => (
          <Link
            key={i}
            href={`/projects/${project.id}/${i + 1}`}
            aria-label={`Step ${i + 1}: ${s.title}`}
            aria-current={i === stepIndex ? 'step' : undefined}
            onClick={() => playPop()}
            className={
              i === stepIndex
                ? 'grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-on-accent'
                : i < stepIndex
                  ? 'grid h-8 w-8 place-items-center rounded-lg bg-line/70 text-sm font-bold text-ink'
                  : 'grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-muted shadow-[inset_0_0_0_1.5px_var(--line)]'
            }
          >
            {i + 1}
          </Link>
        ))}
      </nav>

      <p className="mb-1 text-sm text-muted">
        Step {stepIndex + 1} of {total}
      </p>
      <h2 id="step-title" tabIndex={-1} className="mb-3 text-2xl font-extrabold sm:text-[28px]">
        {step.title}
      </h2>

      <Body text={step.body} />

      {step.tip && (
        <p className="my-3.5 border-l-[3px] border-line-strong py-0.5 pl-3 text-[15px] text-muted">
          <InlineText text={step.tip} />
        </p>
      )}

      {step.code && <CodeBlock file={step.code.file} source={step.code.source} />}

      {step.expect && (
        <div className="my-3.5 rounded-xl p-3 shadow-[inset_0_0_0_1.5px_var(--line)]">
          <h3 className="mb-1.5 font-body text-[15px]">What you should see</h3>
          <pre className="overflow-x-auto font-mono text-[13px] leading-[1.55] text-muted">
            {step.expect.content}
          </pre>
        </div>
      )}

      {step.checklist && (
        <Checklist items={step.checklist} projectId={project.id} stepIndex={stepIndex} />
      )}

      {step.why && (
        <details className="why my-4 border-t border-line pt-3">
          {/* The chevron is drawn in CSS and rotates on open; without it the
              summary reads as a heading rather than something to click. */}
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold [&::-webkit-details-marker]:hidden">
            Why?
          </summary>
          <div className="pl-4 pt-2 text-muted">
            <Body text={step.why} />
          </div>
        </details>
      )}

      {step.checkpoint && (
        <Checkpoint
          checkpoint={step.checkpoint}
          project={project}
          stepIndex={stepIndex}
          isLast={isLast}
          nextProject={nextProject}
        />
      )}

      <div className="mt-5 flex justify-between gap-2.5 border-t border-line pt-4.5">
        {stepIndex > 0 ? (
          <Link
            href={`/projects/${project.id}/${stepIndex}`}
            onClick={() => playClick()}
            className="rounded-[10px] px-4 py-2.5 font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-bg"
          >
            Back
          </Link>
        ) : (
          <Link
            href="/"
            onClick={() => playClick()}
            className="rounded-[10px] px-4 py-2.5 font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-bg"
          >
            All projects
          </Link>
        )}
        {stepIndex < total - 1 && (
          <Link
            href={`/projects/${project.id}/${stepIndex + 2}`}
            onClick={() => playPop()}
            className="rounded-[10px] bg-accent px-4 py-2.5 font-bold text-on-accent hover:brightness-105"
          >
            Next step
          </Link>
        )}
      </div>
    </section>
  );
}
