import Link from 'next/link';
import { Scene } from '@/components/diagram/Scene';
import { ProjectPath, ContinueButton, ResetProgress } from '@/components/ui/ProjectPath';
import { PROJECTS, getProject } from '@/content/projects';
import { PARTS } from '@/content/parts';

export default function Home() {
  const demo = getProject('first-light')!;

  return (
    <>
      <section className="grid items-center gap-8 pb-14 pt-3 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.25fr)] lg:gap-11 lg:pt-7">
        <div>
          <h1 className="text-[clamp(36px,5.2vw,62px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
            Your first Arduino projects, one wire at a time.
          </h1>
          <p className="mb-7 mt-5 max-w-[34ch] text-[19px] text-muted">
            A setup guide and beginner builds. Every step shows exactly which hole to use, explains
            why, and helps you find the problem when something doesn&apos;t work.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <ContinueButton projects={PROJECTS} />
            <Link
              href="/parts"
              className="inline-flex items-center gap-2 rounded-[10px] px-4.5 py-3 font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-panel"
            >
              Meet your parts
            </Link>
          </div>
        </div>
        <div>
          <div className="mat">
            <Scene
              project={demo}
              stepIndex={demo.steps.length - 1}
              parts={PARTS}
              showAll
              animation={{ led1: 'blink' }}
              label="A finished LED circuit with the LED blinking"
            />
          </div>
          <p className="mx-1 mt-2.5 text-sm text-muted">
            Project 1, finished: pin 9 blinks an LED through a 220 Ω resistor.
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-5 border-b-2 border-ink pb-3">
          <h2 className="text-[28px] font-extrabold">Build them in order</h2>
          <p className="text-[15px] text-muted">Each project uses a skill from the one before.</p>
        </div>
        <ProjectPath projects={PROJECTS} />
      </section>

      <div className="flex flex-wrap justify-between gap-3 pb-12 pt-5 text-sm text-muted">
        <span>Progress is saved in this browser.</span>
        <ResetProgress />
      </div>
    </>
  );
}
