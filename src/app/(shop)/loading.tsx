import { ProductCardSkeleton } from "@/components/ui/Skeleton";

// Streaming fallback for every storefront route. All of them are force-dynamic,
// so the server waits on the API before it can send the page; without this the
// browser sat on the *previous* page with no feedback after a navigation.
// Shaped like the product grid so the layout doesn't jump when real data lands.
export default function ShopLoading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-44 w-full rounded-2xl bg-surface sm:h-56" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
