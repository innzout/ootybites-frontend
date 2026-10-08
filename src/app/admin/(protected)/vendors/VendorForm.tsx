"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vendor } from "@/types";
import { adminCreateVendor, adminUpdateVendor } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";

export function VendorForm({ vendor }: { vendor?: Vendor }) {
  const router = useRouter();
  const editing = !!vendor;
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    phone: vendor?.phone ?? "",
    location: vendor?.location ?? "Ooty",
    notes: vendor?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        name: form.name,
        phone: form.phone || null,
        location: form.location || "Ooty",
        notes: form.notes || null,
        is_active: editing ? vendor.is_active : true,
      };
      if (editing) {
        await adminUpdateVendor(vendor.id, body);
        toast.success("Vendor updated");
      } else {
        await adminCreateVendor(body);
        toast.success("Vendor added");
      }
      router.push("/admin/vendors");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save vendor");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${vendor.name}` : "New vendor"}
      breadcrumbs={[{ label: "Vendors", href: "/admin/vendors" }, { label: editing ? "Edit" : "New" }]}
      backHref="/admin/vendors"
      onSubmit={submit}
      saving={saving}
      disabled={!form.name}
      submitLabel={editing ? "Save changes" : "Add vendor"}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </FormShell>
  );
}
