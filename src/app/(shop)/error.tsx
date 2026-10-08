"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";

// Storefront error boundary. Every shop page is force-dynamic and fetches from
// the API on render, so a backend blip used to surface Next's raw error screen.
// This keeps the shell (navbar/footer) intact and offers a real way forward.
export default function ShopError({
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
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-300/30 text-accent-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-5 font-serif text-2xl text-ink">We couldn&apos;t load this page</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        This is usually temporary. Give it another go — your cart is saved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClasses({ variant: "outline" })}>
          Back to shop
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-muted/70">Reference: {error.digest}</p>
      )}
    </div>
  );
}
