"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Banner, Product } from "@/types";
import { adminCreateBanner, adminUpdateBanner, adminListProducts } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { ImageUpload } from "@/components/admin/ImageUpload";

export function BannerForm({ banner }: { banner?: Banner }) {
  const router = useRouter();
  const editing = !!banner;
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    image: banner?.image_url ?? "",
    title: banner?.title ?? "",
    link: banner?.link_url ?? "",
    sort: banner ? String(banner.sort_order) : "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load a broad page for the link picker (banners link to at most one product).
    adminListProducts({ limit: 100, sort: "name", order: "asc" }).then((d) => setProducts(d.products ?? [])).catch(() => setProducts([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        image_url: form.image.trim(),
        title: form.title.trim() || null,
        link_url: form.link.trim() || null,
        sort_order: Number(form.sort) || 0,
        is_active: editing ? banner.is_active : true,
      };
      if (editing) {
        await adminUpdateBanner(banner.id, body);
        toast.success("Banner updated");
      } else {
        await adminCreateBanner(body);
        toast.success("Banner added");
      }
      router.push("/admin/banners");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save banner");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? "Edit banner" : "New banner"}
      subtitle="Promo image shown on the storefront home."
      breadcrumbs={[{ label: "Banners", href: "/admin/banners" }, { label: editing ? "Edit" : "New" }]}
      backHref="/admin/banners"
      onSubmit={submit}
      saving={saving}
      disabled={!form.image.trim()}
      submitLabel={editing ? "Save changes" : "Add banner"}
      error={error}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Image URL" placeholder="Upload below, or paste a URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <Input label="Title (optional caption)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <ImageUpload folder="ootybites/banners" onUploaded={(url) => setForm((f) => ({ ...f, image: url }))} label={editing ? "Replace image" : "Upload banner image"} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Link to product</span>
            <select
              className="h-10 rounded-xl border border-line bg-white px-3 text-sm"
              value=""
              onChange={(e) => e.target.value && setForm((f) => ({ ...f, link: `/products/${e.target.value}` }))}
            >
              <option value="">Choose a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </label>
          <Input label="Link URL (or custom)" placeholder="/products/ooty-tea or https://…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </div>

        <div className="w-28">
          <Input label="Sort order" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
        </div>

        {form.image && (
          <div className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image} alt="" className="h-40 w-full object-cover" />
          </div>
        )}
      </div>
    </FormShell>
  );
}
