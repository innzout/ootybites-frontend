"use client";

import type { Address } from "@/types";
import { cn } from "@/lib/cn";

// Saved-address picker. Presentational: the page owns which address is selected
// and whether the "new address" form is showing.
export function AddressBook({
  addresses,
  selectedId,
  mode,
  onPick,
  onNew,
}: {
  addresses: Address[];
  selectedId: string | null;
  mode: "saved" | "new";
  onPick: (a: Address) => void;
  onNew: () => void;
}) {
  if (addresses.length === 0) return null;

  return (
    // radiogroup rather than a list of buttons: choosing a delivery address is a
    // single-choice selection, and this is what tells a screen reader that.
    <div className="mb-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved delivery addresses">
      {addresses.map((a) => {
        const selected = mode === "saved" && selectedId === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(a)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              selected ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:border-brand-300",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{a.name}</span>
              {a.is_default && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  Default
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}
            </p>
            <p className="text-sm text-muted">{a.phone}</p>
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={mode === "new"}
        onClick={onNew}
        className={cn(
          "rounded-2xl border border-dashed p-4 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          mode === "new"
            ? "border-brand-500 bg-brand-50 text-brand-700"
            : "border-line text-muted hover:border-brand-300",
        )}
      >
        + Deliver to a new address
      </button>
    </div>
  );
}
