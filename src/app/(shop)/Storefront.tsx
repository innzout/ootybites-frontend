"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Leaf, Mountain, Truck, Search } from "lucide-react";
import type { Product, Banner } from "@/types";
import { listProducts, type ProductQuery, type Category } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { ProductCard } from "@/components/product/ProductCard";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { BannerCarousel } from "@/components/shop/BannerCarousel";
import { ExpressBanner } from "@/components/shop/ExpressBanner";
import { NilgiriHero } from "@/components/shop/NilgiriHero";
import { GamePromo } from "@/components/shop/GamePromo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const FEATURES = [
  { icon: Mountain, title: "Grown in the hills", body: "Everything comes from farms and makers within the Nilgiri range." },
  { icon: Leaf, title: "Small-batch & fresh", body: "We only stock what's just been made or harvested this season." },
  { icon: Truck, title: "Cash on delivery", body: "Carefully packed and dispatched from Ooty — pay when it arrives." },
];

const SORTS: { value: NonNullable<ProductQuery["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name (A–Z)" },
];

const PAGE_SIZE = 12;

// Storefront browse UI. Initial products/categories/banners are fetched on the
// server and passed in so the first grid is server-rendered (SEO) without a
// loading flash; search/sort/category/load-more then run client-side.
export function Storefront({
  initialProducts,
  initialTotal,
  categories,
  banners,
}: {
  initialProducts: Product[];
  initialTotal: number;
  categories: Category[];
  banners: Banner[];
}) {
  const searchParams = useSearchParams();
  const customer = useAuthStore((s) => s.customer);

  // Filters
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<NonNullable<ProductQuery["sort"]>>("newest");

  // Results — seeded from the server so the first paint has products in the HTML.
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Skip the very first client fetch when the initial filters match the server
  // defaults (we already have that data). A ?q= on load counts as a real query.
  const seeded = useRef(q === "" && category === "" && sort === "newest");

  // Keep the search box in sync if the navbar routes here with ?q=.
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    setSearch(urlQ);
    setQ(urlQ);
  }, [searchParams]);

  // Debounce the search box into the query.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (pageToLoad: number, replace: boolean) => {
      setLoading(true);
      listProducts({ q, category: category || undefined, sort, page: pageToLoad, limit: PAGE_SIZE })
        .then((d) => {
          setTotal(d.total ?? 0);
          setProducts((prev) => (replace ? d.products ?? [] : [...prev, ...(d.products ?? [])]));
        })
        .catch(() => {
          if (replace) setProducts([]);
        })
        .finally(() => setLoading(false));
    },
    [q, category, sort],
  );

  // Reset to page 1 and replace whenever a filter changes (but not on the first
  // render when we're already showing the server-seeded default results).
  useEffect(() => {
    if (seeded.current) {
      seeded.current = false;
      return;
    }
    setPage(1);
    fetchPage(1, true);
  }, [fetchPage]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, false);
  }

  const firstName = customer?.name?.trim().split(" ")[0];
  const hasMore = products.length < total;

  return (
    <section>
      {/* Brand hero. Carries the page's single <h1>: a sentence about what the
          shop sells, rather than a greeting — the greeting is still there, but
          as supporting copy, because "Welcome to Ootybites" told a search engine
          nothing about tea, honey or oils. */}
      <NilgiriHero firstName={firstName} />

      {banners.length > 0 && <BannerCarousel banners={banners} />}

      <div className={banners.length > 0 ? "mt-8" : "mt-2"}>
        <ExpressBanner />
      </div>

      {/* Browse: search + categories + sort */}
      <div id="products" className="mt-12 scroll-mt-20">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-[1.75rem]">
              Shop the hills
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Small-batch tea, honey, oils and varki from the Nilgiris.
            </p>
          </div>
          {total > 0 && (
            <p className="text-sm text-muted">
              {total} {total === 1 ? "product" : "products"}
            </p>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NonNullable<ProductQuery["sort"]>)}
            aria-label="Sort products"
            className="h-11 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none focus:border-brand-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            <CategoryChip label="All" active={category === ""} onClick={() => setCategory("")} />
            {categories.map((c) => (
              <CategoryChip key={c.id} label={c.name} active={category === c.id} onClick={() => setCategory(c.id)} />
            ))}
          </div>
        )}

        {/* Results */}
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {q || category ? "No products match your search." : "No products yet."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button variant="outline" onClick={loadMore} loading={loading}>
                  Load more ({total - products.length} more)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Why Ootybites — one quiet band, not three more bordered cards. The page
          was a column of six identically-weighted rounded cards, which flattened
          the hierarchy and left the products looking no more important than the
          reassurance copy. */}
      <div className="mt-16 rounded-3xl bg-surface px-5 py-8 sm:px-8">
        <div className="grid gap-7 sm:grid-cols-3 sm:gap-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arcade: the league + giveaway hook. */}
      <div className="mt-12">
        <GamePromo />
      </div>

      {/* Re-engagement: pick up where you left off. */}
      <RecentlyViewed />
    </section>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-brand-gradient text-white shadow-sm shadow-brand-500/25" : "border border-line bg-white text-muted hover:text-brand-600",
      )}
    >
      {label}
    </button>
  );
}
