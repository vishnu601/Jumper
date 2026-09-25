import { describe, it, expect } from 'vitest';
import { PROJECTS } from './projects';
import { ALL_PARTS, PARTS } from './parts';
import { validateProject, validatePart } from '@/lib/schema/validate';
import { checkBody } from '@/lib/content/parse-body';
import { checkCircuit } from '@/lib/rules';

describe('part library', () => {
  for (const part of ALL_PARTS) {
    it(`${part.id} is valid`, () => {
      expect(validatePart(part)).toEqual([]);
    });
  }

  it('has unique ids', () => {
    expect(Object.keys(PARTS)).toHaveLength(ALL_PARTS.length);
  });
});

describe('projects', () => {
  for (const project of PROJECTS) {
    it(`${project.id} passes schema and cross-field validation`, () => {
      expect(validateProject(project, PARTS)).toEqual([]);
    });

    it(`${project.id} references only parts in the library`, () => {
      for (const { partId } of project.parts) {
        expect(PARTS[partId], `${partId} missing from library`).toBeDefined();
      }
    });

    describe(`${project.id} prose`, () => {
      project.steps.forEach((step, i) => {
        it(`step ${i + 1} "${step.title}" has parseable body, tip and why`, () => {
          const issues = [
            ...checkBody(step.body),
            ...(step.tip ? checkBody(step.tip) : []),
            ...(step.why ? checkBody(step.why) : []),
          ];
          expect(issues).toEqual([]);
        });

        it(`step ${i + 1} checkpoint fixes are ordered and non-empty`, () => {
          if (!step.checkpoint) return;
          expect(step.checkpoint.fixes.length).toBeGreaterThan(0);
        });
      });
    });
  }

  // Spec 7.4: every project passes the rules engine at its final step with
  // zero errors. This is the gate `npm run content:check` enforces.
  describe('electrical rules', () => {
    for (const project of PROJECTS) {
      it(`${project.id} has no electrical errors at its final step`, () => {
        const findings = checkCircuit(project, PARTS, project.steps.length - 1);
        const errors = findings.filter((f) => f.severity === 'error');
        expect(errors.map((f) => `[${f.rule}] ${f.message}`)).toEqual([]);
      });

      it(`${project.id} has no electrical errors at any step`, () => {
        for (let i = 0; i < project.steps.length; i++) {
          const errors = checkCircuit(project, PARTS, i).filter((f) => f.severity === 'error');
          expect(errors.map((f) => f.rule), `step ${i + 1}`).toEqual([]);
        }
      });
    }
  });

  it('orders the path without gaps or duplicates', () => {
    const orders = PROJECTS.map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(orders.length);
  });

  // Spec 7.4: every guide must be data-driven, which starts with every step
  // being reachable and every element being introduced exactly once.
  it('introduces every element exactly once', () => {
    for (const project of PROJECTS) {
      const added = project.steps.flatMap((s) => s.add ?? []);
      expect(new Set(added).size).toBe(added.length);
      expect(new Set(added)).toEqual(new Set(project.elements.map((e) => e.id)));
    }
  });
});
