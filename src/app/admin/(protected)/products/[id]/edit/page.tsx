"use client";
import { askConfirm } from "@/lib/confirm";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Variant } from "@/types";
import {
  adminGetProduct,
  adminUpdateProduct,
  adminCreateVariant,
  adminUpdateVariant,
  adminDeleteVariant,
  adminAddImage,
  adminListCategories,
} from "@/lib/adminEndpoints";
import type { Category } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

const UNITS = ["mg", "g", "kg", "ml", "l", "nos", "packets"];

export default function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminGetProduct(id)
      .then((p) => {
        setProduct(p);
        setName(p.name);
        setSlug(p.slug);
        setDescription(p.description ?? "");
        setIsActive(p.is_active);
        setCategoryId(p.category_id ?? "");
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    adminListCategories().then((d) => setCategories(d.categories ?? [])).catch(() => setCategories([]));
  }, []);

  async function saveProduct() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await adminUpdateProduct(id, { name, slug, description, is_active: isActive, category_id: categoryId || null });
      setMsg("Product saved");
      load();
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!product) return <p className="text-muted">Product not found.</p>;

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: product?.name ?? "Edit" }]} />
      <h1 className="mb-4 font-sans text-2xl font-bold tracking-tight text-ink">Edit product</h1>

      {/* Product details */}
      <Card className="mt-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {categories.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500"
              >
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (visible in shop)
        </label>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={saveProduct} loading={saving}>
            Save product
          </Button>
          {msg && <span className="text-sm text-brand-600">{msg}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </Card>

      {/* Variants */}
      <h2 className="mt-6 font-display text-lg font-bold text-ink">Variants</h2>
      <div className="mt-3 space-y-3">
        {product.variants.map((v) => (
          <VariantEditor key={v.id} variant={v} onSaved={load} onDeleted={load} />
        ))}
        <NewVariant productId={id} onCreated={load} />
      </div>

      {/* Images */}
      <h2 className="mt-6 font-display text-lg font-bold text-ink">Images</h2>
      <ImageManager product={product} onChanged={load} />

      <div className="mt-8">
        <Button variant="outline" onClick={() => router.push("/admin/products")}>
          Done
        </Button>
      </div>
    </div>
  );
}

function VariantEditor({
  variant,
  onSaved,
  onDeleted,
}: {
  variant: Variant;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [f, setF] = useState({
    label: variant.label,
    unit: String(variant.unit),
    unit_value: String(variant.unit_value),
    mrp: String(variant.mrp),
    price: String(variant.price),
    stock_qty: String(variant.stock_qty),
    is_active: variant.is_active,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await adminUpdateVariant(variant.id, {
        label: f.label,
        unit: f.unit,
        unit_value: Number(f.unit_value),
        mrp: Number(f.mrp),
        price: Number(f.price),
        stock_qty: Number(f.stock_qty),
        sku: variant.sku,
        is_active: f.is_active,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!(await askConfirm({ title: "Delete variant?", message: variant.label, tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteVariant(variant.id);
    onDeleted();
  }

  return (
    <Card className="p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <select className="rounded-lg border border-line px-2 py-1.5 text-sm" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Unit val" value={f.unit_value} onChange={(e) => setF({ ...f, unit_value: e.target.value })} />
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="MRP" value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} />
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Stock" value={f.stock_qty} onChange={(e) => setF({ ...f, stock_qty: e.target.value })} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
          Active
        </label>
        <Button size="sm" onClick={save} loading={busy}>
          Save
        </Button>
        <button onClick={remove} className="text-sm text-red-600 hover:underline">
          Delete
        </button>
      </div>
    </Card>
  );
}

function NewVariant({ productId, onCreated }: { productId: string; onCreated: () => void }) {
  const [f, setF] = useState({ label: "", unit: "g", unit_value: "", mrp: "", price: "", stock_qty: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      await adminCreateVariant(productId, {
        label: f.label,
        unit: f.unit,
        unit_value: Number(f.unit_value),
        mrp: Number(f.mrp),
        price: Number(f.price),
        stock_qty: Number(f.stock_qty),
      });
      setF({ label: "", unit: "g", unit_value: "", mrp: "", price: "", stock_qty: "" });
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add variant</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <select className="rounded-lg border border-line px-2 py-1.5 text-sm" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Unit val" value={f.unit_value} onChange={(e) => setF({ ...f, unit_value: e.target.value })} />
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="MRP" value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} />
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Stock" value={f.stock_qty} onChange={(e) => setF({ ...f, stock_qty: e.target.value })} />
      </div>
      <Button size="sm" variant="secondary" className="mt-2" onClick={add} loading={busy} disabled={!f.label || !f.price}>
        Add variant
      </Button>
    </Card>
  );
}

function ImageManager({ product, onChanged }: { product: Product; onChanged: () => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function addUrl(imageUrl: string) {
    if (!imageUrl.trim()) return;
    setBusy(true);
    try {
      await adminAddImage(product.id, imageUrl.trim(), product.images.length === 0);
      setUrl("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  const add = () => addUrl(url);

  return (
    <Card className="mt-3 p-4">
      {product.images.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-3">
          {product.images.map((img) => (
            <div key={img.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
              {img.is_primary && (
                <span className="absolute left-1 top-1">
                  <Badge tone="brand">Primary</Badge>
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted">No images yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <ImageUpload
          folder="ootybites/products"
          label="Upload image"
          onUploaded={(u) => addUrl(u)}
        />
        <span className="text-xs text-muted">or</span>
        <div className="flex flex-1 gap-2">
          <input
            className="h-9 min-w-40 flex-1 rounded-lg border border-line px-2 text-sm"
            placeholder="paste an image URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button size="sm" variant="ghost" onClick={add} loading={busy} disabled={!url.trim()}>
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}
