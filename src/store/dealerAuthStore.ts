// Dealer auth store (Zustand, persisted) — a third, separate JWT audience,
// keyed distinctly so dealer/admin/customer tokens never mix on the client.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setDealerTokenGetter } from "@/lib/api";

interface DealerProfile {
  id: string;
  name: string;
  username: string;
}

interface DealerAuthState {
  token: string | null;
  dealer: DealerProfile | null;
  isAuthenticated: () => boolean;
  login: (token: string, dealer: DealerProfile) => void;
  logout: () => void;
}

export const useDealerAuthStore = create<DealerAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      dealer: null,
      isAuthenticated: () => !!get().token,
      login: (token, dealer) => set({ token, dealer }),
      logout: () => set({ token: null, dealer: null }),
    }),
    { name: "ootybites-dealer-auth" },
  ),
);

setDealerTokenGetter(() => useDealerAuthStore.getState().token);
