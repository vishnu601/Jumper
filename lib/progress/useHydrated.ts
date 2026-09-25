'use client';

import { useSyncExternalStore } from 'react';

/** Nothing to subscribe to: the value changes once, when React hydrates. */
const subscribe = () => () => {};

/**
 * False on the server and on the first client render, true afterwards.
 *
 * The server cannot know a visitor's progress, so anything derived from the
 * store must render its neutral state until this flips or React will throw the
 * server markup away with a hydration mismatch. Zustand rehydrates from
 * localStorage synchronously during store creation, so once this is true the
 * store already holds the real values.
 *
 * useSyncExternalStore gives React a different server snapshot (false) and
 * client snapshot (true) directly, which is what this needs — the older
 * setState-in-an-effect version caused a second render pass on every mount.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
