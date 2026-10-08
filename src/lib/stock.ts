// Stock helpers shared by the card + detail views. Drives the scarcity nudge
// ("Only N left") — a light, honest urgency cue based on real inventory.

import type { Variant } from "@/types";

// At or below this many units we surface the low-stock nudge.
export const LOW_STOCK = 5;

// Total sellable units across a product's active variants.
export function activeStock(variants: Variant[]): number {
  return variants.filter((v) => v.is_active).reduce((n, v) => n + v.stock_qty, 0);
}

// True when stock is positive but low enough to nudge.
export function isLowStock(qty: number): boolean {
  return qty > 0 && qty <= LOW_STOCK;
}
