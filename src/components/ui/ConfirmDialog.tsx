"use client";

import { useEffect, useId } from "react";
import { useConfirmStore } from "@/lib/confirm";
import { Button } from "@/components/ui/Button";

// ConfirmDialog is the single centered confirmation modal for the whole app.
// Mounted once in the root layout; driven imperatively via askConfirm().
export function ConfirmDialog() {
  const { open, options, respond } = useConfirmStore();
  const titleId = useId();

  // Close on Escape (treated as cancel).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") respond(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, respond]);

  if (!open || !options) return null;

  const danger = options.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
        onClick={() => respond(false)}
      />

      {/* Modal card */}
      <div className="animate-pop-in relative w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-xl">
        <h2 id={titleId} className="font-display text-lg font-bold text-ink">
          {options.title}
        </h2>
        {options.message && <p className="mt-2 text-sm leading-relaxed text-muted">{options.message}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => respond(false)}>
            {options.cancelText ?? "Cancel"}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => respond(true)} autoFocus>
            {options.confirmText ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
