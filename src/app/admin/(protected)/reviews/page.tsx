"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import Link from "next/link";
import { askConfirm } from "@/lib/confirm";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import { adminListReviews, adminDeleteReview, type AdminReview } from "@/lib/adminEndpoints";
import { toast } from "@/lib/toast";
import { ApiException } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, sortCol, actionCol } from "@/components/admin/gridHelpers";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn("h-3.5 w-3.5", n <= value ? "fill-accent-500 text-accent-500" : "text-line")}
        />
      ))}
    </span>
  );
}

// Reviews are not public — only the author and admins can see them — so this
// screen is the only place the whole set is visible. Admins moderate by
// deleting; there is no edit, because rewriting a customer's words under their
// name would be worse than removing them.
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  // "low" is the moderation queue: 1-2 star reviews are the ones worth reading first.
  const [rating, setRating] = useState<"" | "low" | "1" | "2" | "3" | "4" | "5">("");
  const shown = reviews.filter((r) =>
    rating === "" ? true : rating === "low" ? r.rating <= 2 : r.rating === Number(rating),
  );
  const [loading, setLoading] = useState(true);

  function load() {
    adminListReviews()
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(r: AdminReview) {
    const ok = await askConfirm({
      title: "Delete this review?",
      message: `${r.rating}★ from ${r.customer_name || "a customer"} on ${r.product_name ?? "this product"}. This cannot be undone.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminDeleteReview(r.id);
      toast.success("Review deleted");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not delete the review");
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    sortCol<AdminReview>("created_at", "Date", {
      minWidth: 120,
      cellRenderer: (p: ICellRendererParams<AdminReview>) => (
        <span className="text-muted">{formatDate(String(p.value))}</span>
      ),
    }),
    col<AdminReview>("product_name", "Product", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<AdminReview>) =>
        p.data?.product_slug ? (
          <Link href={`/products/${p.data.product_slug}`} className="font-semibold text-brand-600 hover:underline">
            {p.value as string}
          </Link>
        ) : (
          <span className="font-semibold text-ink">{(p.value as string) || "—"}</span>
        ),
    }),
    sortCol<AdminReview>("rating", "Rating", {
      minWidth: 120,
      cellRenderer: (p: ICellRendererParams<AdminReview>) => <Stars value={Number(p.value)} />,
    }),
    col<AdminReview>("customer_name", "Customer", {
      minWidth: 160,
      cellRenderer: (p: ICellRendererParams<AdminReview>) => (
        <div className="leading-tight">
          <div className="text-ink">{(p.value as string) || "—"}</div>
          {p.data?.customer_phone && <div className="text-xs text-muted">{p.data.customer_phone}</div>}
        </div>
      ),
    }),
    col<AdminReview>("body", "Comment", {
      minWidth: 240,
      cellRenderer: (p: ICellRendererParams<AdminReview>) => (
        <span className="line-clamp-2 break-words text-muted">{(p.value as string) || "—"}</span>
      ),
    }),
    actionCol<AdminReview>("", (r) => <GridActions onDelete={() => remove(r)} />, {
      minWidth: 120,
      maxWidth: 140,
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Reviews"
        subtitle={`${reviews.length} ${reviews.length === 1 ? "review" : "reviews"} · visible to signed-in customers only`}
      />
      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-4 py-16 text-center">
          <p className="text-muted">No reviews yet.</p>
          <p className="mt-1 text-sm text-muted">
            A customer can review a product once an order containing it has been delivered.
          </p>
        </div>
      ) : (
        <>
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="rating-filter" className="text-sm font-medium text-muted">
            Rating
          </label>
          <select
            id="rating-filter"
            value={rating}
            onChange={(e) => setRating(e.target.value as typeof rating)}
            className="h-9 rounded-full border border-line bg-white px-3 text-sm text-ink"
          >
            <option value="">All ratings</option>
            <option value="low">1–2 stars (needs attention)</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <DataGrid<AdminReview>
        rowData={shown}
        columnDefs={columnDefs}
        getRowId={(r) => r.id}
        searchable="Search by product, customer or comment"
        sortable
        pagination
        pageSize={20}
      />
        </>
      )}
    </div>
  );
}
