"use client";

// Recently viewed — a device-local history of products the shopper opened, so we
// can surface a "Recently viewed" strip on the home and product pages. Persisted
// (like cart/wishlist) so it survives reloads and drives re-engagement on return.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentItem {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  imageUrl?: string;
}

const MAX = 12;

interface RecentState {
  items: RecentItem[];
  // record moves the product to the front (most-recent-first), de-duplicated.
  record: (item: RecentItem) => void;
  clear: () => void;
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      record: (item) =>
        set((s) => ({
          items: [item, ...s.items.filter((i) => i.id !== item.id)].slice(0, MAX),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "ootybites-recent" },
  ),
);
