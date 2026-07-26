"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import { listOrders } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

export default function OrdersPage() {
  const router = useRouter();
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed) {
      setLoading(false);
      return;
    }
    listOrders()
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-600">Please sign in to see your orders.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Sign in
        </Button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (orders.length === 0) {
    return <p className="py-20 text-center text-neutral-500">You have no orders yet.</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-neutral-800">Your orders</h1>
      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="flex items-center justify-between p-4 hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium text-neutral-800">{o.order_number}</p>
              <p className="text-sm text-neutral-500">{formatDate(o.placed_at)}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">{formatPrice(o.total)}</span>
              <StatusBadge status={o.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
