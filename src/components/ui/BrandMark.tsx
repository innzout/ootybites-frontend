import Image from "next/image";
import { cn } from "@/lib/cn";

// BrandMark renders the real Ootybites artwork — not a lookalike. It previously
// paired a generic icon with the word "Ootybites" set in Bricolage Grotesque, so
// the actual wordmark (the leaf growing out of the "t", the wave, the custom
// letterforms) never appeared anywhere in the product.
//
// The lockup used here is the WORDMARK (leaf + Ootybites + wave) rather than the
// full logo: the full lockup carries the "FROM OOTY TO HOME" tagline, which at a
// 36px-tall navbar would render about 3px tall and be illegible. The full lockup
// and the circular packaging badge are available as separate files in
// /public/brand (see logo/brand-export/README.txt).
// The colour and single-colour wordmarks come from different source crops, so
// they do NOT share an aspect ratio (1.784 vs 2.082). One shared constant
// squashed the white knockout by ~17% in the navbar and footer, and tripped
// next/image's "width or height modified, but not the other" warning. Keep one
// per variant and read it from the file that is actually rendered.
const ASPECT = {
  colour: 480 / 269,
  mono: 960 / 461,
  badge: 1024 / 1016,
};

export function BrandMark({
  size = "md",
  withWord = true,
  tone = "onLight",
  subtitle,
  className,
}: {
  size?: "sm" | "md";
  withWord?: boolean;
  /** onDark swaps to the white knockout so the mark stays legible on deep green. */
  tone?: "onLight" | "onDark";
  subtitle?: string | null;
  className?: string;
}) {
  // Sized for the letterforms, not the box: the wordmark spends vertical space
  // on the sprout above and the wave below, so "Ootybites" itself is only about
  // 40% of this height. 36px left the text barely legible in the 64px navbar.
  const h = size === "sm" ? 34 : 46;

  // Badge only — the circular packaging mark, also used as the app icon.
  if (!withWord) {
    return (
      <span className={cn("inline-flex flex-col items-center", className)}>
        <Image
          src="/brand/badge.png"
          alt="Ootybites"
          width={Math.round(h * ASPECT.badge)}
          height={h}
          priority
          className={cn(tone === "onDark" && "invert")}
        />
        {subtitle && <span className="mt-1 text-[10px] font-medium text-muted">{subtitle}</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={tone === "onDark" ? "/brand/wordmark-white.png" : "/brand/wordmark.png"}
        alt="Ootybites"
        width={Math.round(h * (tone === "onDark" ? ASPECT.mono : ASPECT.colour))}
        height={h}
        priority
        className="shrink-0"
      />
      {subtitle && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            tone === "onDark" ? "bg-white/15 text-white" : "bg-brand-50 text-brand-700",
          )}
        >
          {subtitle}
        </span>
      )}
    </span>
  );
}
