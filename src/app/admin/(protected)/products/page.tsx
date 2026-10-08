"use client";
import { askConfirm } from "@/lib/confirm";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Product } from "@/types";
import { adminListProducts, adminDeleteProduct, adminUpdateProduct } from "@/lib/adminEndpoints";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { useServerTable } from "@/components/admin/useServerTable";
import { GridActions } from "@/components/admin/GridActions";
import { DataGrid } from "@/components/admin/DataGrid";
import { col, sortCol, actionCol } from "@/components/admin/gridHelpers";

// Code-split: AG Grid is heavy — load it lazily and keep it out of the initial bundle.

function priceRange(p: Product): string {
  const prices = p.variants.map((v) => v.price);
  if (prices.length === 0) return "—";
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? formatPrice(lo) : `${formatPrice(lo)} – ${formatPrice(hi)}`;
}

const LOW_STOCK = 5;

function stockInfo(p: Product): { total: number; out: boolean; low: boolean } {
  const active = p.variants.filter((v) => v.is_active);
  const total = active.reduce((n, v) => n + v.stock_qty, 0);
  const out = active.length > 0 && active.every((v) => v.stock_qty <= 0);
  const low = !out && active.some((v) => v.stock_qty <= LOW_STOCK);
  return { total, out, low };
}

type Visibility = "" | "true" | "false";
type StockFilter = "" | "in" | "low" | "out";

const visibilityFilters: { value: Visibility; label: string }[] = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Hidden" },
];
const stockFilters: { value: StockFilter; label: string }[] = [
  { value: "", label: "Any stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out of stock" },
];

export default function AdminProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Visibility>("");
  const [stock, setStock] = useState<StockFilter>("");

  // Debounce the search box into the query that drives the fetch.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetcher = useCallback(
    (p: { page: number; limit: number; sort?: string; order?: "asc" | "desc" }) =>
      adminListProducts({
        ...p,
        q,
        active: active || undefined,
        stock: stock || undefined,
      }).then((d) => ({ rows: d.products ?? [], total: d.total ?? 0 })),
    [q, active, stock],
  );
  const grid = useServerTable<Product>(fetcher, { limit: 20, deps: [q, active, stock] });

  async function toggleVisible(p: Product) {
    await adminUpdateProduct(p.id, {
      name: p.name,
      slug: p.slug,
      description: p.description,
      is_active: !p.is_active,
    });
    grid.reload();
  }

  async function removeProduct(id: string) {
    if (!(await askConfirm({ title: "Delete product?", message: "This removes the product and all its variants.", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteProduct(id);
    grid.reload();
  }

  const columnDefs = [
    sortCol<Product>("name", "Product", {
      minWidth: 240,
      cellRenderer: (p: ICellRendererParams<Product>) => {
        const prod = p.data;
        if (!prod) return null;
        const primary = prod.images.find((i) => i.is_primary) ?? prod.images[0];
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-brand-50">
              {primary ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primary.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[8px] text-brand-300">No img</div>
              )}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-ink">{prod.name}</span>
                {!prod.is_active && <Badge tone="neutral">Hidden</Badge>}
              </div>
              <span className="text-xs text-muted">{prod.slug}</span>
            </div>
          </div>
        );
      },
    }),
    col<Product>("variants", "Variants", {
      maxWidth: 110,
      sortable: false,
      valueGetter: (p) => p.data?.variants.length ?? 0,
      cellRenderer: (p: ICellRendererParams<Product>) => (
        <Badge tone="brand">{p.value} variant{p.value === 1 ? "" : "s"}</Badge>
      ),
    }),
    col<Product>("variants", "Price", {
      colId: "price",
      minWidth: 130,
      sortable: false,
      cellRenderer: (p: ICellRendererParams<Product>) => (p.data ? <span className="text-muted">{priceRange(p.data)}</span> : null),
    }),
    col<Product>("variants", "Stock", {
      colId: "stock",
      minWidth: 120,
      sortable: false,
      valueGetter: (p) => (p.data ? stockInfo(p.data).total : 0),
      cellRenderer: (p: ICellRendererParams<Product>) => {
        if (!p.data) return null;
        const s = stockInfo(p.data);
        if (s.out) return <Badge tone="danger">Out of stock</Badge>;
        if (s.low) return <Badge tone="warning">Low · {s.total}</Badge>;
        return <span className="text-muted">{s.total} in stock</span>;
      },
    }),
    actionCol<Product>("", (p) => (
      <GridActions
        toggle={{ label: p.is_active ? "Hide" : "Show", onClick: () => toggleVisible(p) }}
        onEdit={() => router.push(`/admin/products/${p.id}/edit`)}
        onDelete={() => removeProduct(p.id)}
      />
    ), { minWidth: 240, maxWidth: 260 }),
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${grid.total} in catalog`}
        breadcrumbs={[{ label: "Products" }]}
        action={
          <Button onClick={() => router.push("/admin/products/new")}>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value as Visibility)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500"
        >
          {visibilityFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={stock}
          onChange={(e) => setStock(e.target.value as StockFilter)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500"
        >
          {stockFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted">Click the Product header to sort</span>
      </div>
      <DataGrid<Product>
        rowData={grid.rows}
        columnDefs={columnDefs}
        loading={grid.loading}
        getRowId={(p) => p.id}
        onServerSort={grid.onServerSort}
        emptyText={q || active || stock ? "No products match these filters." : "No products yet — add your first."}
      />

      <Pagination page={grid.page} total={grid.total} limit={grid.limit} onPage={grid.setPage} />
    </div>
  );
}
