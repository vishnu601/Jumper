'use client';

import { useProgress, tickKey } from '@/lib/progress/store';
import { useHydrated } from '@/lib/progress/useHydrated';
import { playTick } from '@/lib/sounds';

export function Checklist({
  items,
  projectId,
  stepIndex,
}: {
  items: string[];
  projectId: string;
  stepIndex: number;
}) {
  const hydrated = useHydrated();
  const ticks = useProgress((s) => s.ticks);
  const tick = useProgress((s) => s.tick);

  return (
    <ul className="my-3.5 list-none p-0" data-testid="checklist">
      {items.map((item, i) => {
        const key = tickKey(projectId, stepIndex, i);
        return (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2.5 py-1.5">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 flex-none accent-ok"
                checked={hydrated ? !!ticks[key] : false}
                onChange={(e) => { tick(key, e.target.checked); playTick(); }}
              />
              <span>{item}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
