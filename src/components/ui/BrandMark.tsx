import { cn } from "@/lib/cn";

// BrandMark renders the official OotyBites logo image (the reversed dark-green
// lockup) by default. On the solid Deep-Green nav/footer the lockup's background
// matches the surface, so it blends seamlessly. `withWord={false}` shows just
// the circular mountain badge.
export function BrandMark({
  size = "md",
  withWord = true,
  subtitle,
  className,
}: {
  size?: "sm" | "md";
  withWord?: boolean;
  // Kept for call-site compatibility; the image lockup works on any surface.
  tone?: "onLight" | "onDark";
  subtitle?: string | null;
  className?: string;
}) {
  const h = size === "sm" ? 28 : 38;

  if (!withWord) {
    return (
      <span className={cn("inline-flex flex-col items-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.png" alt="OotyBites" style={{ height: h, width: h }} />
        {subtitle && <span className="mt-1 text-[10px] font-medium text-muted">{subtitle}</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-dark.png" alt="OotyBites" style={{ height: h }} className="w-auto rounded-lg" />
      {subtitle && (
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
          {subtitle}
        </span>
      )}
    </span>
  );
}
