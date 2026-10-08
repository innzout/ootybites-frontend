"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { listExpressAreas } from "@/lib/endpoints";

// ExpressBanner is the home-page entry point into the dedicated 24-hour delivery
// flow. It only renders when express coverage exists (at least one area has a
// hub), so shoppers never tap through to an empty screen.
export function ExpressBanner() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    listExpressAreas()
      .then((d) => setAvailable((d.areas ?? []).length > 0))
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  return (
    <Link
      href="/express"
      className="group flex items-center gap-4 overflow-hidden rounded-3xl bg-brand-gradient p-5 text-white shadow-product transition-transform hover:-translate-y-0.5 sm:p-6"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        <Zap className="h-6 w-6 fill-current" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">Ootybites Express</p>
        <p className="mt-0.5 font-display text-lg font-extrabold leading-tight sm:text-xl">
          24-Hour Delivery in your area
        </p>
        <p className="mt-0.5 text-sm text-white/85">Choose your area and see what&rsquo;s in stock near you.</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="h-5 w-5" />
      </span>
    </Link>
  );
}
