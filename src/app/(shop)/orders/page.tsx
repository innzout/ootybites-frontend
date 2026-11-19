"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import { listOrders } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useHydrated } from "@/lib/useHydrated";
import { usePagedList } from "@/lib/usePagedList";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 10;

const FILTERS = [
  { status: "", label: "All" },
  { status: "placed", label: "In progress" },
  { status: "delivered", label: "Delivered" },
  { status: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const router = useRouter();
  // Gated on hydration: the session lives in localStorage, so reading it
  // straight away showed signed-in customers "Please sign in" for a moment.
  const hydrated = useHydrated(useAuthStore);
  const isAuthed = useAuthStore((s) => s.isAuthenticated()) && hydrated;
  const logout = useAuthStore((s) => s.logout);
  const [status, setStatus] = useState("");

  const fetchPage = useCallback(
    (page: number) =>
      listOrders({ status, page, limit: PAGE_SIZE }).then((d) => ({ items: d.orders ?? [], total: d.total ?? 0 })),
    [status],
  );
  const list = usePagedList<Order>(fetchPage, [status], { enabled: isAuthed });

  // An expired session is a sign-in problem, not a failed list.
  useEffect(() => {
    if (list.error instanceof ApiException && list.error.status === 401) {
      logout();
      router.replace("/login?next=/orders");
    }
  }, [list.error, logout, router]);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20" aria-busy="true">
        <Spinner />
      </div>
    );
  }
  if (!isAuthed) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Please sign in to see your orders.</p>
        <Link href="/login?next=/orders" className={buttonClasses({}, "mt-4")}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Your orders</h1>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter orders">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            role="tab"
            aria-selected={status === f.status}
            onClick={() => setStatus(f.status)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              status === f.status
                ? "bg-brand-gradient text-white shadow-sm shadow-brand-500/25"
                : "border border-line bg-white text-muted hover:text-brand-600",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.error && list.items.length === 0 ? (
        // Used to fall through to "You have no orders yet".
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white py-12 text-center text-sm text-muted">
          Could not load your orders.
          <Button variant="outline" onClick={list.reload}>
            Try again
          </Button>
        </div>
      ) : list.items.length === 0 ? (
        status ? (
          <p className="rounded-2xl border border-line bg-white py-12 text-center text-sm text-muted">
            No {FILTERS.find((f) => f.status === status)?.label.toLowerCase()} orders.
          </p>
        ) : (
          // A new customer's first visit: give them the way into the shop.
          <div className="py-16 text-center">
            <p className="text-muted">You have no orders yet.</p>
            <Link href="/" className={buttonClasses({}, "mt-4")}>
              Start shopping
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {list.items.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-brand-50/40">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{o.order_number}</p>
                  <p className="text-sm text-muted">{formatDate(o.placed_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-ink">{formatPrice(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
          {list.hasMore && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <Button variant="outline" onClick={list.loadMore} loading={list.loadingMore}>
                Show more orders
              </Button>
              <span className="text-xs text-muted">
                Showing {list.items.length} of {list.total}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
