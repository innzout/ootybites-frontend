import type { Order, OrderStatus } from "@/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

// The happy-path journey (placed → delivered). `cancelled` is off-path.
const STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: "placed", label: "Order placed", hint: "We’ve received your order" },
  { status: "delivered", label: "Delivered", hint: "Enjoy your Ooty bites!" },
];

// OrderTimeline renders a vertical stepper showing progress through the order
// state machine, stamping each reached step with the time it happened (from the
// status history) and surfacing any notes.
export function OrderTimeline({ order }: { order: Order }) {
  const history = order.history ?? [];
  // First timestamp/note recorded for each status.
  const at = (s: OrderStatus) => history.find((h) => h.status === s);

  if (order.status === "cancelled") {
    const c = at("cancelled");
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-red-700">Order cancelled</p>
        {c?.note && <p className="mt-1 text-sm text-red-600">Reason: {c.note}</p>}
        {c && <p className="mt-1 text-xs text-red-400">{formatDate(c.created_at)}</p>}
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <ol className="relative">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const entry = at(step.status);
        const last = i === STEPS.length - 1;
        return (
          <li key={step.status} className="flex gap-3 pb-6 last:pb-0">
            {/* Rail + dot */}
            <div className="relative flex flex-col items-center">
              <span
                className={cn(
                  "z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                  done ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted",
                  isCurrent && "ring-4 ring-brand-500/15",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {!last && (
                <span className={cn("absolute top-6 h-full w-0.5", i < currentIndex ? "bg-brand-500" : "bg-line")} />
              )}
            </div>
            {/* Text */}
            <div className="pt-0.5">
              <p className={cn("text-sm font-semibold", done ? "text-ink" : "text-muted")}>{step.label}</p>
              <p className="text-xs text-muted">{step.hint}</p>
              {entry && <p className="mt-0.5 text-xs text-brand-600">{formatDate(entry.created_at)}</p>}
              {entry?.note && entry.note !== "Order placed" && (
                <p className="mt-0.5 text-xs text-muted">{entry.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
