import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

// Per-variant colour only — the shared disabled affordance (dimmed + not-allowed
// cursor) lives in the base class so every variant gives the same visual cue.
const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-md shadow-brand-500/25 hover:brightness-110 hover:-translate-y-px disabled:translate-y-0",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line bg-white text-ink hover:border-brand-400 hover:text-brand-600",
  ghost: "bg-transparent text-muted hover:bg-brand-50 hover:text-brand-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

// The exact class recipe a Button renders with. Exported so an <a>/<Link> that
// should *look* like a button reuses these classes instead of re-declaring them
// — a real link stays a link (right-click, middle-click, crawlable) while
// staying visually identical to a Button.
export function buttonClasses(
  { variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {},
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  // Default to type="button" so a Button placed inside a <form> never submits it
  // by accident — only an explicit type="submit" does. (Callers can still pass
  // type to override.)
  ({ variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClasses({ variant, size }, className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
