"use client";

import Image from "next/image";
import { ArrowDown } from "lucide-react";

// The storefront's brand moment: a real photograph of the Nilgiris behind the
// one sentence that says what this shop actually sells.
//
// This replaced a generated WebGL ridge line (HillsCanvas, still in the repo but
// no longer used). The shader cost zero download, which the photo does not — so
// the photo is served as a single WebP master that next/image narrows to the
// device's width and re-encodes to AVIF where supported, and it is marked
// priority because it IS the LCP element. Source art lives outside public/ in
// assets/hero-source (the originals are ~13 MP and must never be served).
//
// Still deliberately not a full-screen takeover: it stays short enough that
// products remain in reach on a phone, because this is a shop before it is a
// brand site. The .hero-hills gradient underneath still shows if the image
// fails, so the hero is never blank.

export function NilgiriHero({ firstName }: { firstName?: string }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-hills relative -mx-4 mb-8 overflow-hidden sm:mx-0 sm:rounded-3xl"
    >
      {/* The photograph: above the gradient, below the scrim. */}
      <Image
        src="/hero/nilgiris-2560.webp"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Contrast scrim. The photo has bright cloud and pale sky at the top, so
          text legibility must not depend on what happens to be behind it — this
          guarantees a dark ground under the copy regardless of the crop the
          device lands on. Keeps white body copy and the amber eyebrow past AA. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brand-900/55 to-brand-900/90"
      />

      <div className="relative flex min-h-[320px] flex-col justify-end p-6 sm:min-h-[420px] sm:p-10">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-accent-300">
          Fresh from Ooty
        </p>

        <h1
          id="hero-heading"
          className="mt-2 max-w-2xl font-display text-[1.75rem] font-extrabold leading-[1.08] text-white sm:text-4xl lg:text-5xl"
        >
          Grown in the Nilgiris,
          <br />
          packed the week you order.
        </h1>

        <p className="mt-3 max-w-md text-sm text-cream/90 sm:text-base">
          {firstName
            ? `Good to see you, ${firstName}. Tea, honey, oils and varki — straight from the hills.`
            : "Tea, honey, cold-pressed oils and small-batch varki — straight from the hills to your door."}
        </p>

        <a
          href="#products"
          className="group mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-bold text-brand-800 shadow-soft transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
        >
          Browse the shop
          <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
        </a>
      </div>
    </section>
  );
}
