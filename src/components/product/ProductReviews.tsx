"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import {
  listProductReviews,
  saveReview,
  deleteReview,
  type ProductReviews as ReviewsPayload,
} from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useHydrated } from "@/lib/useHydrated";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { askConfirm } from "@/lib/confirm";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const MAX_BODY = 1000;

/** Read-only row of five stars. */
function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn("h-4 w-4", n <= Math.round(value) ? "fill-accent-500 text-accent-500" : "text-line")}
        />
      ))}
    </span>
  );
}

/** Clickable star rating used in the write form. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <Star className={cn("h-7 w-7 transition-colors", n <= value ? "fill-accent-500 text-accent-500" : "text-line hover:text-accent-300")} />
        </button>
      ))}
    </div>
  );
}

/**
 * Reviews for one product.
 *
 * Visibility is signed-in-only by design, so this renders a sign-in prompt
 * rather than a review list for logged-out visitors — and because anonymous
 * visitors (including crawlers) never see ratings, the product page emits no
 * AggregateRating structured data for them.
 *
 * Writing is restricted further: the API only accepts a review from a customer
 * with a delivered order containing this product, and tells us up front via
 * `can_review` so the form is shown only when it would succeed.
 */
export function ProductReviews({ productId }: { productId: string }) {
  const pathname = usePathname();
  const authHydrated = useHydrated(useAuthStore);
  const isAuthed = useAuthStore((s) => s.isAuthenticated()) && authHydrated;

  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    listProductReviews(productId)
      .then((d) => {
        setData(d);
        // Seed the form with an existing review so "edit" is the same UI.
        if (d.mine) {
          setRating(d.mine.rating);
          setBody(d.mine.body);
        }
      })
      .catch(() => {
        setData(null);
        setFailed(true);
      });
  }, [productId]);

  useEffect(() => {
    if (isAuthed) load();
  }, [isAuthed, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (rating < 1) {
      setFormError("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    try {
      await saveReview(productId, rating, body.trim());
      toast.success(data?.mine ? "Review updated" : "Thanks for your review!");
      load();
    } catch (ex) {
      setFormError(ex instanceof ApiException ? ex.message : "Could not save your review.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMine(id: string) {
    // Deleting is destructive and not undoable, so it is confirmed.
    const ok = await askConfirm({
      title: "Delete your review?",
      message: "This removes your rating and comment for this product.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteReview(id);
      setRating(0);
      setBody("");
      toast.success("Review deleted");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not delete your review.");
    }
  }

  // Logged out — do not reveal review content or counts.
  // Before the session is known (server render, and the first client paint)
  // show the section's heading and a placeholder the same size as the sign-in
  // prompt. A bare spinner here had no heading and a different height, so the
  // page jumped for every visitor once the session resolved.
  if (!authHydrated) {
    return (
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-display text-lg font-bold text-ink">Reviews</h2>
        <div
          className="mt-3 flex min-h-[8.5rem] items-center justify-center rounded-2xl border border-line bg-surface"
          aria-busy="true"
        >
          <Spinner />
        </div>
      </section>
    );
  }

  if (!isAuthed) {
    return (
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-display text-lg font-bold text-ink">Reviews</h2>
        <div className="mt-3 flex min-h-[8.5rem] flex-col items-center justify-center rounded-2xl border border-line bg-surface px-4 py-6 text-center">
          <p className="text-sm text-muted">Sign in to read reviews from other customers.</p>
          {/* Come back to this product afterwards rather than the home page. */}
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClasses({}, "mt-4")}>
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">Reviews</h2>
        {data && data.count > 0 && (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Stars value={data.average} />
            {data.average.toFixed(1)} · {data.count} {data.count === 1 ? "review" : "reviews"}
          </span>
        )}
      </div>

      {failed && (
        <p role="alert" className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
          Could not load reviews just now.{" "}
          <button type="button" onClick={load} className="font-semibold text-brand-600 underline">
            Try again
          </button>
        </p>
      )}

      {!data && !failed && (
        <div className="py-8 text-center" aria-busy="true">
          <Spinner />
        </div>
      )}

      {data && (
        <>
          {/* Write / edit — only when a delivered order earns it. */}
          {data.can_review ? (
            <form onSubmit={submit} className="mt-4 rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">
                {data.mine ? "Your review" : "Rate this product"}
              </p>
              <div className="mt-2">
                <StarPicker value={rating} onChange={(n) => { setRating(n); setFormError(null); }} />
              </div>
              <label htmlFor="review-body" className="mt-3 block text-sm font-medium text-ink">
                Comment (optional)
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
                rows={3}
                maxLength={MAX_BODY}
                placeholder="How was it?"
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
              />
              <p className="mt-1 text-right text-xs text-muted">
                {body.length}/{MAX_BODY}
              </p>
              {formError && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {formError}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Button type="submit" loading={saving}>
                  {data.mine ? "Update review" : "Submit review"}
                </Button>
                {data.mine && (
                  <button
                    type="button"
                    onClick={() => removeMine(data.mine!.id)}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
              You can review this once an order containing it has been delivered.
            </p>
          )}

          {/* Everyone else's reviews. */}
          <div className="mt-5 flex flex-col gap-4">
            {data.reviews.length === 0 ? (
              <p className="text-sm text-muted">No reviews yet.</p>
            ) : (
              data.reviews.map((r) => (
                <article key={r.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-sm font-semibold text-ink">
                      {r.customer_name || "Customer"}
                    </span>
                    {data.mine?.id === r.id && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        You
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted">{formatDate(r.created_at)}</span>
                  </div>
                  {r.body && (
                    <p className="mt-2 whitespace-pre-line break-words text-sm text-ink">{r.body}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
