import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface SessionState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "travelsuite.session" }
  )
);

/**
 * The persisted session is only known after localStorage hydrates on the
 * client. Route guards must wait for this before redirecting, otherwise a
 * logged-in user flashes to /login on every hard navigation. `.persist` is
 * only attached when `window` exists at module load, so it's undefined
 * during SSR/build — treat that as "not hydrated yet".
 */
export function useSessionHydrated() {
  return useSyncExternalStore(
    (onChange) => {
      const unsubscribe = useSessionStore.persist?.onFinishHydration(onChange);
      return () => unsubscribe?.();
    },
    () => useSessionStore.persist?.hasHydrated() ?? false,
    () => false
  );
}
