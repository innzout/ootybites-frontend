"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import {
  adminListProducts,
  adminCreateProduct,
  adminDeleteProduct,
  adminUpdateProduct,
  adminAddImage,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImageUpload } from "@/components/admin/ImageUpload";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function priceRange(p: Product): string {
  const prices = p.variants.map((v) => v.price);
  if (prices.length === 0) return "—";
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? formatPrice(lo) : `${formatPrice(lo)} – ${formatPrice(hi)}`;
}

const LOW_STOCK = 5;

// Aggregate stock view for a product's active variants.
function stockInfo(p: Product): { total: number; out: boolean; low: boolean } {
  const active = p.variants.filter((v) => v.is_active);
  const total = active.reduce((n, v) => n + v.stock_qty, 0);
  const out = active.length > 0 && active.every((v) => v.stock_qty <= 0);
  const low = !out && active.some((v) => v.stock_qty <= LOW_STOCK);
  return { total, out, low };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  function load() {
    adminListProducts()
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Enter a product name (min 2 characters)";
    if (!image.trim()) e.image = "A product image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setCreating(true);
    try {
      const product = await adminCreateProduct({
        name: name.trim(),
        slug: slugify(name),
        description: desc.trim() || undefined,
        is_active: active,
      });
      // Attach the uploaded image as primary.
      await adminAddImage(product.id, image.trim(), true);
      setName("");
      setDesc("");
      setImage("");
      setActive(true);
      setErrors({});
      load();
    } catch (ex) {
      setErrors({ form: ex instanceof ApiException ? ex.message : "Could not create product" });
    } finally {
      setCreating(false);
    }
  }

  async function toggleVisible(p: Product) {
    await adminUpdateProduct(p.id, {
      name: p.name,
      slug: p.slug,
      description: p.description,
      is_active: !p.is_active,
    });
    load();
  }

  async function removeProduct(id: string) {
    if (!(await askConfirm({ title: "Delete product?", message: "This removes the product and all its variants.", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteProduct(id);
    load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-4xl">
      <PageHeader title="Products" subtitle={`${products.length} in catalog`} />

      {/* Create form */}
      <Card className="mb-6 p-5">
        <form onSubmit={createProduct} className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink">New product</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Input label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {name && <p className="-mt-1 text-xs text-muted">slug: {slugify(name)}</p>}

          {/* Image (required) */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Product image *</p>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-brand-50">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-brand-300">No image</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <ImageUpload folder="ootybites/products" label="Upload image" onUploaded={setImage} />
                <input
                  className="h-9 w-64 max-w-full rounded-lg border border-line px-2 text-sm"
                  placeholder="…or paste an image URL"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              </div>
            </div>
            {errors.image && <p className="mt-1 text-xs text-red-600">{errors.image}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Publish (visible in the shop)
          </label>

          {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
          <div>
            <Button type="submit" loading={creating}>
              Add product
            </Button>
            <span className="ml-3 text-xs text-muted">Add variants (price &amp; stock) after creating, on Edit.</span>
          </div>
        </form>
      </Card>

      {/* List */}
      {products.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">No products yet — add your first above.</Card>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const primary = p.images.find((i) => i.is_primary) ?? p.images[0];
            return (
              <Card key={p.id} className="flex items-center gap-4 p-3.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {primary ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primary.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-brand-300">No image</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{p.name}</p>
                    {!p.is_active && <Badge tone="neutral">Hidden</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted">{p.slug}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge tone="brand">
                      {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                    </Badge>
                    <span>{priceRange(p)}</span>
                    {(() => {
                      const s = stockInfo(p);
                      if (s.out) return <Badge tone="danger">Out of stock</Badge>;
                      if (s.low) return <Badge tone="warning">Low stock</Badge>;
                      return <span className="text-muted">· {s.total} in stock</span>;
                    })()}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => toggleVisible(p)}
                    className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:border-brand-400 hover:text-brand-600"
                    title={p.is_active ? "Hide from shop" : "Show in shop"}
                  >
                    {p.is_active ? "Hide" : "Show"}
                  </button>
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    Edit
                  </Link>
                  <button onClick={() => removeProduct(p.id)} className="text-sm font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
