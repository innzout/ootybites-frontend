"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Admin error boundary. Kept separate from the storefront one on purpose: staff
// need the actual error text to report a problem, whereas a customer does not.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h1 className="mt-4 font-serif text-xl text-ink">This screen failed to load</h1>
      <p className="mt-2 max-w-md break-words text-sm text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button className="mt-5" onClick={reset}>
        Retry
      </Button>
      {error.digest && (
        <p className="mt-4 text-xs text-muted/70">Reference: {error.digest}</p>
      )}
    </div>
  );
}
