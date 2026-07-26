import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type Tone = "brand" | "accent" | "info" | "success" | "danger" | "neutral";

const toneChip: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-500/15 text-accent-600",
  info: "bg-blue-50 text-blue-600",
  success: "bg-green-50 text-green-600",
  danger: "bg-red-50 text-red-600",
  neutral: "bg-line text-muted",
};

// StatCard — a KPI tile with an icon chip, label and value.
export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm", toneChip[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
