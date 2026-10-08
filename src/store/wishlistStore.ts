"use client";

// Wishlist — a device-local favourites list (persisted like the cart). Stores a
// small product snapshot so the wishlist page renders without a refetch.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishItem {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  imageUrl?: string;
}

interface WishlistState {
  items: WishItem[];
  has: (id: string) => boolean;
  toggle: (item: WishItem) => void;
  remove: (id: string) => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((i) => i.id === id),
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.id === item.id)
            ? { items: s.items.filter((i) => i.id !== item.id) }
            : { items: [item, ...s.items] },
        ),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      count: () => get().items.length,
    }),
    { name: "ootybites-wishlist" },
  ),
);
