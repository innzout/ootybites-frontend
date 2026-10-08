"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { adminCreateProduct, adminAddImage, adminCreateVariant, adminListCategories } from "@/lib/adminEndpoints";
import type { Category } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { ImageUpload } from "@/components/admin/ImageUpload";

const UNITS = ["mg", "g", "kg", "ml", "l", "nos", "packets"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type VForm = { label: string; unit: string; unit_value: string; mrp: string; price: string; stock_qty: string };
const emptyVariant: VForm = { label: "", unit: "g", unit_value: "", mrp: "", price: "", stock_qty: "" };

// Full-screen create form for a product: name, image and one or more variants
// (price & stock) in a single step. Deeper edits happen on the Edit page.
export function ProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<VForm[]>([{ ...emptyVariant }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminListCategories().then((d) => setCategories(d.categories ?? [])).catch(() => setCategories([]));
  }, []);

  function setVariant(i: number, patch: Partial<VForm>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function addVariant() {
    setVariants((vs) => [...vs, { ...emptyVariant }]);
  }
  function removeVariant(i: number) {
    setVariants((vs) => (vs.length === 1 ? vs : vs.filter((_, idx) => idx !== i)));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Enter a product name (min 2 characters)";
    if (!image.trim()) e.image = "A product image is required";
    if (variants.some((v) => !v.unit_value.trim() || !v.price.trim() || v.stock_qty.trim() === "")) {
      e.variants = "Each variant needs size, price and stock";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const product = await adminCreateProduct({
        name: name.trim(),
        slug: slugify(name),
        description: desc.trim() || undefined,
        is_active: active,
        category_id: categoryId || null,
      });
      await adminAddImage(product.id, image.trim(), true);
      for (const v of variants) {
        const price = Number(v.price);
        await adminCreateVariant(product.id, {
          label: v.label.trim() || `${v.unit_value} ${v.unit}`,
          unit: v.unit,
          unit_value: Number(v.unit_value),
          mrp: v.mrp.trim() ? Number(v.mrp) : price,
          price,
          stock_qty: Number(v.stock_qty),
          is_active: true,
        });
      }
      toast.success("Product created");
      router.push("/admin/products");
    } catch (ex) {
      setErrors({ form: ex instanceof ApiException ? ex.message : "Could not create product" });
      setSaving(false);
    }
  }

  return (
    <FormShell
      title="New product"
      subtitle="Add the product, its image and at least one variant (price & stock)."
      breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "New" }]}
      backHref="/admin/products"
      onSubmit={submit}
      saving={saving}
      submitLabel="Create product"
      error={errors.form}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Input label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        {name && <p className="-mt-2 text-xs text-muted">slug: {slugify(name)}</p>}

        {categories.length > 0 && (
          <label className="flex max-w-xs flex-col gap-1">
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

        {/* Variants */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Variants *</p>
            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add variant
            </button>
          </div>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="rounded-xl border border-line p-2.5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <input className="col-span-2 rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Label (auto)" value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} />
                  <select className="rounded-lg border border-line px-2 py-1.5 text-sm" value={v.unit} onChange={(e) => setVariant(i, { unit: e.target.value })}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Unit val" value={v.unit_value} onChange={(e) => setVariant(i, { unit_value: e.target.value })} />
                  <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="MRP" value={v.mrp} onChange={(e) => setVariant(i, { mrp: e.target.value })} />
                  <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Price" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input className="w-28 rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Stock qty" value={v.stock_qty} onChange={(e) => setVariant(i, { stock_qty: e.target.value })} />
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(i)} className="ml-auto inline-flex items-center gap-1 text-sm text-red-600 hover:underline">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.variants && <p className="mt-1 text-xs text-red-600">{errors.variants}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Publish (visible in the shop)
        </label>
      </div>
    </FormShell>
  );
}
