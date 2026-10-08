// Admin auth store (Zustand, persisted) — separate from the customer store and
// keyed differently, so the two JWT audiences never mix on the client.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAdminTokenGetter } from "@/lib/api";
import type { AdminRole } from "@/lib/adminEndpoints";

interface AdminAuthState {
  token: string | null;
  adminId: string | null;
  role: AdminRole | null;
  name: string | null;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
  login: (token: string) => void;
  setProfile: (p: { id: string; role: AdminRole; name?: string | null }) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      adminId: null,
      role: null,
      name: null,
      isAuthenticated: () => !!get().token,
      isSuperAdmin: () => get().role === "super_admin",
      login: (token) => set({ token }),
      setProfile: (p) => set({ adminId: p.id, role: p.role, name: p.name ?? null }),
      logout: () => set({ token: null, adminId: null, role: null, name: null }),
    }),
    { name: "ootybites-admin-auth" },
  ),
);

// Wire the API client to read the current admin token.
setAdminTokenGetter(() => useAdminAuthStore.getState().token);
