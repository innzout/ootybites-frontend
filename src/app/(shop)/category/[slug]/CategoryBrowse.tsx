"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { listProducts, type ProductQuery } from "@/lib/endpoints";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

const SORTS: { value: NonNullable<ProductQuery["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name (A–Z)" },
];

const PAGE_SIZE = 12;

// Client grid for a single category — seeded with the server-rendered first page
// (SEO), then sort + load-more run client-side against the fixed category id.
export function CategoryBrowse({
  categoryId,
  initialProducts,
  initialTotal,
}: {
  categoryId: string;
  initialProducts: Product[];
  initialTotal: number;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NonNullable<ProductQuery["sort"]>>("newest");
  const [loading, setLoading] = useState(false);
  const seeded = useRef(true); // first render already has server data for "newest"

  const fetchPage = useCallback(
    (pageToLoad: number, replace: boolean) => {
      setLoading(true);
      listProducts({ category: categoryId, sort, page: pageToLoad, limit: PAGE_SIZE })
        .then((d) => {
          setTotal(d.total ?? 0);
          setProducts((prev) => (replace ? d.products ?? [] : [...prev, ...(d.products ?? [])]));
        })
        .catch(() => {
          if (replace) setProducts([]);
        })
        .finally(() => setLoading(false));
    },
    [categoryId, sort],
  );

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

  const hasMore = products.length < total;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {total} product{total === 1 ? "" : "s"}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as NonNullable<ProductQuery["sort"]>)}
          aria-label="Sort products"
          className="h-10 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none focus:border-brand-500"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No products in this category yet.</p>
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
  );
}
