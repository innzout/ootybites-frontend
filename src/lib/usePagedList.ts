"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PageResult<T> {
  items: T[];
  total: number;
}

/**
 * "Load more" pagination over a server-paginated list, for phone-first
 * screens where page buttons are awkward. Page 1 loads whenever `deps` change
 * (a filter or search); loadMore appends the next page.
 *
 * Stale responses are discarded: if the filter changes while a request is in
 * flight, the late answer for the old filter must not overwrite the new list.
 */
export function usePagedList<T>(
  fetchPage: (page: number) => Promise<PageResult<T>>,
  deps: unknown[],
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Bumped on every reload; a response from an older generation is ignored.
  const generation = useRef(0);

  const reload = useCallback(() => {
    if (!enabled) return;
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    fetchPage(1)
      .then((r) => {
        if (gen !== generation.current) return;
        setItems(r.items);
        setTotal(r.total);
        setPage(1);
      })
      .catch((e) => gen === generation.current && setError(e))
      .finally(() => gen === generation.current && setLoading(false));
    // fetchPage is rebuilt by the caller whenever its filters change, and
    // those filters are what `deps` lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(reload, [reload]);

  const loadMore = useCallback(() => {
    const gen = generation.current;
    setLoadingMore(true);
    fetchPage(page + 1)
      .then((r) => {
        if (gen !== generation.current) return;
        setItems((prev) => [...prev, ...r.items]);
        setTotal(r.total);
        setPage((p) => p + 1);
      })
      .catch((e) => gen === generation.current && setError(e))
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ...deps]);

  return { items, total, loading, loadingMore, error, reload, loadMore, hasMore: items.length < total };
}
