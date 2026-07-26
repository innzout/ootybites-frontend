import { cn } from "@/lib/cn";

// Spinner — a minimal loading indicator used across shop and admin.
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent",
        className,
      )}
    />
  );
}
