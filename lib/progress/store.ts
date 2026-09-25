'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Progress, persisted to localStorage (spec 7.4: progress survives reload,
 * reset is available). The key matches the prototype's so an early tester's
 * saved progress carries over.
 */

export type CheckpointAnswer = 'yes' | 'no';

interface ProgressState {
  /** project id -> completed. */
  done: Record<string, boolean>;
  /** project id -> 1-based step to resume at. */
  at: Record<string, number>;
  /** "projectId:stepIndex" -> answer. */
  checkpoints: Record<string, CheckpointAnswer>;
  /** "projectId:stepIndex:itemIndex" -> ticked. */
  ticks: Record<string, boolean>;

  visit(projectId: string, step: number): void;
  answer(projectId: string, stepIndex: number, value: CheckpointAnswer): void;
  complete(projectId: string): void;
  tick(key: string, value: boolean): void;
  reset(): void;
}

export const checkpointKey = (projectId: string, stepIndex: number) => `${projectId}:${stepIndex}`;
export const tickKey = (projectId: string, stepIndex: number, i: number) =>
  `${projectId}:${stepIndex}:${i}`;

/**
 * localStorage does not exist while prerendering, and zustand's persist
 * middleware silently disables itself (and its `persist` API) when storage is
 * missing. A no-op store on the server keeps the middleware attached and keeps
 * the server from ever reading a visitor's data.
 */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function safeStorage(): StateStorage {
  return typeof window === 'undefined' ? noopStorage : window.localStorage;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      done: {},
      at: {},
      checkpoints: {},
      ticks: {},

      visit: (projectId, step) =>
        set((s) => (s.done[projectId] ? s : { at: { ...s.at, [projectId]: step } })),

      answer: (projectId, stepIndex, value) =>
        set((s) => ({
          checkpoints: { ...s.checkpoints, [checkpointKey(projectId, stepIndex)]: value },
        })),

      complete: (projectId) =>
        set((s) => {
          const at = { ...s.at };
          delete at[projectId];
          return { done: { ...s.done, [projectId]: true }, at };
        }),

      tick: (key, value) => set((s) => ({ ticks: { ...s.ticks, [key]: value } })),

      reset: () => set({ done: {}, at: {}, checkpoints: {}, ticks: {} }),
    }),
    {
      name: 'jumper.progress.v1',
      storage: createJSONStorage(() => safeStorage()),
    },
  ),
);
