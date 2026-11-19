"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

// Hosts next.config.mjs is configured to optimise. Anything else (a banner URL
// an admin pasted from elsewhere) is passed through unoptimised rather than
// thrown on — next/image hard-errors at runtime on an unconfigured host, and a
// storefront must not white-screen because of one bad image URL.
const OPTIMISED_HOSTS = ["res.cloudinary.com"];

// The API's own upload path (images stored without Cloudinary). Must match the
// remotePatterns entry in next.config.mjs.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

function canOptimise(url: string) {
  try {
    const u = new URL(url);
    if (API_ORIGIN && u.origin === API_ORIGIN && u.pathname.startsWith("/uploads/")) return true;
    return OPTIMISED_HOSTS.includes(u.hostname);
  } catch {
    return false; // relative or malformed — let next/image handle it as-is
  }
}

interface RemoteImageProps {
  src: string | null | undefined;
  alt: string;
  /** Responsive hint, e.g. "(min-width: 1024px) 25vw, 50vw". Without this the
   *  browser downloads a full-width source for a thumbnail. */
  sizes: string;
  className?: string;
  /** Set on the single largest above-the-fold image only (the PDP hero). Every
   *  other image should stay lazy — eager-loading a grid regresses LCP. */
  priority?: boolean;
  /** Rendered when src is missing or the fetch fails. */
  fallback?: React.ReactNode;
}

// Single image primitive for all product/banner imagery. Uses next/image `fill`,
// so every call site must position it inside a container that already has a
// fixed aspect ratio — that is what keeps CLS at zero.
export function RemoteImage({
  src,
  alt,
  sizes,
  className,
  priority,
  fallback,
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-full items-center justify-center text-sm text-brand-300">
            No image
          </div>
        )}
      </>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!canOptimise(src)}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
