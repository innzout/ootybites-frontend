import { cn } from "@/lib/cn";

// Card is the standard surface: white, hairline border, rounded, soft shadow.
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-line bg-white shadow-sm shadow-ink/[0.03]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
