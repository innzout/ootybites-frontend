"use client";

import { useEffect, useState } from "react";

// Minimal shape of the persist API a zustand store exposes.
interface PersistedStore {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
}

// Reports whether a persisted zustand store has finished reading localStorage.
//
// Auth guards must not decide "not logged in" before rehydration completes, or
// they redirect a perfectly valid session back to the login screen. The guards
// previously approximated this with `useEffect(() => setReady(true), [])`, which
// only proves the component mounted — it says nothing about the store. This asks
// the store directly.
//
// Starts false so the server render and the first client render agree (there is
// no localStorage on the server); the effect then settles it.
export function useHydrated(store: PersistedStore): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);

  return hydrated;
}
