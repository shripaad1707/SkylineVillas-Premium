import { useSyncExternalStore } from 'react';

/**
 * The intro gate. The opening loader covers the page while the hero photo and
 * fonts arrive; the hero's own entrance (headline masks, image settle) waits
 * for this so it plays as the loader lifts instead of underneath it.
 *
 * Opens immediately when there is no loader (reduced motion, or a repeat visit
 * in the same tab session).
 */
let done = false;
const listeners = new Set<() => void>();

export function markIntroDone() {
  if (done) return;
  done = true;
  listeners.forEach((fn) => fn());
}

export function isIntroDone() {
  return done;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True once the loader has started lifting. */
export function useIntroDone() {
  return useSyncExternalStore(subscribe, isIntroDone, () => true);
}
