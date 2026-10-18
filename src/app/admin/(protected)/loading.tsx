import { Skeleton } from "@/components/ui/Skeleton";

// Streaming fallback for every admin screen.
//
// The admin panel is entirely client-rendered, so navigating to a section had
// to download that route's JS chunk before anything could mount. With no
// loading boundary here, Next kept the *previous* screen on display for that
// whole window with no indication that a click had registered — which reads as
// a frozen page rather than a slow one. The shop route group already had this;
// admin did not.
//
// Shaped like a page header over a table, which is what most admin screens are,
// so the layout does not jump when the real content arrives.
export default function AdminLoading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* PageHeader: title + subtitle */}
      <div className="mb-5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Toolbar: filters / search / primary action */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>

      {/* Table: header strip over rows */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <Skeleton className="h-11 w-full rounded-none" />
        <div className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
