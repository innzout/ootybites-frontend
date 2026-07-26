"use client";

import { useCallback, useEffect, useState } from "react";

export interface ServerTableParams {
  page: number;
  limit: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ServerTableResult<T> {
  rows: T[];
  total: number;
}

// useServerTable centralises the plumbing for a server-paginated + server-sorted
// admin grid: it holds page/sort/order state, refetches whenever they (or the
// caller's `deps`, e.g. a status filter) change, and exposes handlers the
// DataGrid + Pagination controls bind to. This is the reusable "grid interface"
// every admin list view shares.
export function useServerTable<T>(
  fetcher: (p: ServerTableParams) => Promise<ServerTableResult<T>>,
  opts: { limit?: number; deps?: unknown[] } = {},
) {
  const limit = opts.limit ?? 20;
  const deps = opts.deps ?? [];

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string | undefined>();
  const [order, setOrder] = useState<"asc" | "desc" | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    fetcher({ page, limit, sort, order })
      .then((d) => {
        setRows(d.rows ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
    // fetcher is expected to be stable/memoised by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sort, order, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when the external filters change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), deps);

  // Bind to DataGrid.onServerSort — updates sort model and returns to page 1.
  const onServerSort = useCallback((colId: string | null, dir: "asc" | "desc" | null) => {
    setSort(colId ?? undefined);
    setOrder(dir ?? undefined);
    setPage(1);
  }, []);

  return { rows, total, loading, page, setPage, sort, order, onServerSort, limit, reload: load };
}
