import type { OrderStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";

const tone: Record<OrderStatus, "warning" | "info" | "success" | "danger"> = {
  placed: "warning",
  reached_dealer: "info",
  delivered: "success",
  cancelled: "danger",
};

const labels: Record<OrderStatus, string> = {
  placed: "Placed",
  reached_dealer: "Reached dealer",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// StatusBadge renders a toned pill for an order status.
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={tone[status]}>{labels[status]}</Badge>;
}
