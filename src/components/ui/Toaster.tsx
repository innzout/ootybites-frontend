"use client";

import { Check, X, Info } from "lucide-react";
import { useToastStore, type ToastType } from "@/lib/toast";
import { cn } from "@/lib/cn";

const styles: Record<ToastType, { chip: string; icon: React.ReactNode }> = {
  success: { chip: "bg-brand-600 text-white", icon: <Check className="h-4 w-4" /> },
  error: { chip: "bg-red-600 text-white", icon: <X className="h-4 w-4" /> },
  info: { chip: "bg-ink text-cream", icon: <Info className="h-4 w-4" /> },
};

// Toaster renders transient toast chips (top-center), auto-dismissed after 3s.
// Mounted once in the root layout; driven imperatively via toast.success(...).
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const s = styles[t.type];
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition-all",
              s.chip,
            )}
          >
            {s.icon}
            {t.message}
          </button>
        );
      })}
    </div>
  );
}
