"use client";

import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";

// ExpressBanner is the home-page entry point into the dedicated 24-hour delivery
// flow. The caller renders it only when express coverage exists - decided on the
// server (getCachedExpressAvailable), so it is in the first paint rather than
// appearing after a client fetch and shifting the page.
export function ExpressBanner() {
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
          24-hour delivery near you
        </p>
        <p className="mt-0.5 text-sm text-white/85">Check whether your area is covered, and see what&rsquo;s in stock at your nearest hub.</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="h-5 w-5" />
      </span>
    </Link>
  );
}
