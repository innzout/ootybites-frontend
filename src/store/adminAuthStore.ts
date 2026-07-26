// Admin auth store (Zustand, persisted) — separate from the customer store and
// keyed differently, so the two JWT audiences never mix on the client.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAdminTokenGetter } from "@/lib/api";

interface AdminAuthState {
  token: string | null;
  isAuthenticated: () => boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: () => !!get().token,
      login: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: "ootybites-admin-auth" },
  ),
);

// Wire the API client to read the current admin token.
setAdminTokenGetter(() => useAdminAuthStore.getState().token);
