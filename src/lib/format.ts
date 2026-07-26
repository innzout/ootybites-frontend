// Presentation helpers — currency, dates, unit labels.

import type { Unit } from "@/types";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

// formatPrice renders a rupee amount, e.g. 249 -> "₹249.00".
export function formatPrice(amount: number): string {
  return inr.format(amount);
}

// formatUnit renders a variant's unit, e.g. (500, "g") -> "500 g".
export function formatUnit(value: number, unit: Unit): string {
  const n = Number.isInteger(value) ? value : value.toFixed(2);
  return `${n} ${unit}`;
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// formatDate renders an ISO timestamp as "21 Jul 2026".
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

// daysSince returns whole days elapsed since an ISO timestamp — used by the
// admin order list "days since placed" ageing column.
export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}
