// Customer auth store (Zustand, persisted). Holds the customer JWT and profile.
// On creation it registers a token getter with the API client so authenticated
// requests attach the bearer token without a circular import.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setTokenGetter } from "@/lib/api";

interface CustomerProfile {
  id: string;
  phone: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  customer: CustomerProfile | null;
  isAuthenticated: () => boolean;
  login: (token: string, customer: CustomerProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      customer: null,
      isAuthenticated: () => !!get().token,
      login: (token, customer) => set({ token, customer }),
      logout: () => set({ token: null, customer: null }),
    }),
    { name: "ootybites-auth" },
  ),
);

// Wire the API client to read the current customer token.
setTokenGetter(() => useAuthStore.getState().token);
