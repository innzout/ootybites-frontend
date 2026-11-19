"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banner } from "@/types";
import { cn } from "@/lib/cn";
import { RemoteImage } from "@/components/ui/RemoteImage";

// BannerCarousel renders active promo banners as an auto-rotating slideshow.
// Each slide navigates to its link_url when clicked (internal route or external
// URL); banners without a link are shown but not clickable.
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  // Hovering or focusing the carousel holds the current slide.
  const [paused, setPaused] = useState(false);

  // Auto-advance every 5s (only when there's more than one slide). Content that
  // moves by itself has to be pausable, and should not start at all for
  // someone who has asked their system for reduced motion - the dots still
  // let them change slide by hand.
  useEffect(() => {
    if (count <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-brand-50"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Slides track */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((b) => (
          <BannerSlide key={b.id} banner={b} />
        ))}
      </div>

      {/* Dots */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerSlide({ banner }: { banner: Banner }) {
  const inner = (
    // The fixed heights live on this wrapper so the image can use `fill`: the
    // slot is reserved before the image arrives and nothing shifts.
    <div className="relative h-40 w-full shrink-0 basis-full sm:h-64 md:h-72">
      {/* Through the shared image primitive rather than a bare <img>. A raw tag
          downloaded every slide at full size on page load, including the ones
          scrolled off to the side; this lazy-loads off-screen slides and serves
          Cloudinary banners resized and as AVIF/WebP. */}
      <RemoteImage
        src={banner.image_url}
        alt={banner.title ?? "Promotion"}
        sizes="(min-width: 1152px) 1120px, 100vw"
      />
      {banner.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-4 sm:p-6">
          <p className="font-display text-lg font-bold text-white drop-shadow sm:text-2xl">{banner.title}</p>
        </div>
      )}
    </div>
  );

  // Defense-in-depth: only follow safe targets (relative path or http(s)).
  // Rejects javascript:/data: etc. even if one slipped past server validation.
  const safe = isSafeLink(banner.link_url);
  if (!safe) return inner;

  // Internal paths use next/link for client nav; external URLs use a plain anchor.
  const isInternal = safe.startsWith("/");
  return isInternal ? (
    <Link href={safe} className="w-full shrink-0 basis-full">
      {inner}
    </Link>
  ) : (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="w-full shrink-0 basis-full">
      {inner}
    </a>
  );
}

// isSafeLink returns the URL if it's a relative path or http(s), else null.
function isSafeLink(url?: string | null): string | null {
  if (!url) return null;
  const v = url.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return null;
}
