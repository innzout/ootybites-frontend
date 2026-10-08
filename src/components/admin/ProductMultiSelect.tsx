"use client";

import { useEffect, useRef, useState } from "react";
import { searchProducts } from "@/lib/endpoints";
import type { Product } from "@/types";
import { cn } from "@/lib/cn";

const LIMIT = 6; // limited paginated records per page

// ProductMultiSelect is a searchable, paginated multi-select lookup: the field
// shows chips for selected products; clicking it opens an overlay with a search
// box, a paginated list (Prev/Next), and click-to-toggle selection. It keeps a
// local id→name map so chips render even for products not on the current page.
export function ProductMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const boxRef = useRef<HTMLDivElement>(null);

  // Fetch a page (debounced on the query).
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      searchProducts(q, page, LIMIT)
        .then((d) => {
          const list = d.products ?? [];
          setRows(list);
          setTotal(d.total ?? 0);
          setNames((m) => {
            const next = { ...m };
            for (const p of list) next[p.id] = p.name;
            return next;
          });
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [open, q, page]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = new Set(value);
  function toggle(p: Product) {
    setNames((m) => ({ ...m, [p.id]: p.name }));
    onChange(selected.has(p.id) ? value.filter((id) => id !== p.id) : [...value, p.id]);
  }
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div ref={boxRef} className="relative">
      {/* Field with chips */}
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-10 cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 text-sm"
      >
        {value.length === 0 && <span className="px-1 text-muted">Select products…</span>}
        {value.map((id) => (
          <span key={id} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {names[id] ?? "…"}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== id));
              }}
              className="text-brand-500 hover:text-brand-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Overlay */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-2 shadow-xl">
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search products…"
            className="mb-2 h-9 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <p className="p-3 text-center text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted">No products found.</p>
            ) : (
              rows.map((p) => {
                const on = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-brand-50",
                      on && "bg-brand-50",
                    )}
                  >
                    <span className="text-ink">{p.name}</span>
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                        on ? "border-brand-500 bg-brand-500 text-white" : "border-line",
                      )}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {/* Pagination */}
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs text-muted">
            <span>
              {value.length} selected · {total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-line px-2 py-0.5 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {page}/{pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-line px-2 py-0.5 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
