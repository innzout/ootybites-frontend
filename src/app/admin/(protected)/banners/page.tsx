"use client";
import { askConfirm } from "@/lib/confirm";

import { useCallback, useEffect, useState } from "react";
import type { Banner, Product } from "@/types";
import {
  adminListBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  adminListProducts,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImageUpload } from "@/components/admin/ImageUpload";

// A shared product-link picker: choosing a product fills the link with its
// storefront path; the text field still allows any custom/external URL.
function LinkFields({
  products,
  link,
  onLink,
}: {
  products: Product[];
  link: string;
  onLink: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Link to product</span>
        <select
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm"
          value=""
          onChange={(e) => e.target.value && onLink(`/products/${e.target.value}`)}
        >
          <option value="">Choose a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Link URL (or custom)"
        placeholder="/products/ooty-tea or https://…"
        value={link}
        onChange={(e) => onLink(e.target.value)}
      />
    </div>
  );
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [image, setImage] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [sort, setSort] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    adminListBanners()
      .then((d) => setBanners(d.banners ?? []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    adminListProducts()
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await adminCreateBanner({
        image_url: image.trim(),
        title: title.trim() || null,
        link_url: link.trim() || null,
        sort_order: Number(sort) || 0,
        is_active: true,
      });
      setImage("");
      setTitle("");
      setLink("");
      setSort("0");
      load();
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not create banner");
    } finally {
      setCreating(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Banners" subtitle="Promo images shown on the storefront home" />

      {/* Create */}
      <Card className="mb-6 p-4">
        <form onSubmit={create} className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">New banner</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Image URL"
              placeholder="Upload below, or paste a URL"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
            <Input label="Title (optional caption)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <ImageUpload folder="ootybites/banners" onUploaded={setImage} label="Upload banner image" />
          <LinkFields products={products} link={link} onLink={setLink} />
          <div className="w-28">
            <Input label="Sort order" value={sort} onChange={(e) => setSort(e.target.value)} />
          </div>
          {image && (
            <div className="overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-32 w-full object-cover" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <Button type="submit" loading={creating} disabled={!image.trim()}>
              Add banner
            </Button>
          </div>
        </form>
      </Card>

      {/* List */}
      {banners.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">No banners yet — add your first above.</Card>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <BannerRow key={b.id} banner={b} products={products} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerRow({
  banner,
  products,
  onChanged,
}: {
  banner: Banner;
  products: Product[];
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(banner.title ?? "");
  const [image, setImage] = useState(banner.image_url);
  const [link, setLink] = useState(banner.link_url ?? "");
  const [sort, setSort] = useState(String(banner.sort_order));
  const [busy, setBusy] = useState(false);

  async function save(active = banner.is_active) {
    setBusy(true);
    try {
      await adminUpdateBanner(banner.id, {
        image_url: image.trim(),
        title: title.trim() || null,
        link_url: link.trim() || null,
        sort_order: Number(sort) || 0,
        is_active: active,
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!(await askConfirm({ title: "Delete banner?", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteBanner(banner.id);
    onChanged();
  }

  return (
    <Card className="p-3.5">
      <div className="flex gap-4">
        <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-brand-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={banner.is_active ? "success" : "neutral"}>
              {banner.is_active ? "Active" : "Hidden"}
            </Badge>
            {link && <span className="truncate text-xs text-muted">→ {link}</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="h-9 rounded-lg border border-line px-2 text-sm"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="h-9 rounded-lg border border-line px-2 text-sm"
              placeholder="Image URL"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <ImageUpload folder="ootybites/banners" onUploaded={setImage} label="Replace image" />
          <LinkFields products={products} link={link} onLink={setLink} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted">
              <span>Sort</span>
              <input
                className="h-9 w-16 rounded-lg border border-line px-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => save()} loading={busy}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => save(!banner.is_active)} disabled={busy}>
              {banner.is_active ? "Hide" : "Show"}
            </Button>
            <button onClick={remove} className="text-sm font-medium text-red-600 hover:underline">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
