"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vendor } from "@/types";
import { adminCreateVendor, adminUpdateVendor } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { useFieldErrors } from "@/lib/useFieldErrors";
import { required, optional, phoneIN, maxLength } from "@/lib/validators";

// Module-level: stable identity for the hook's memoisation.
const schema = {
  name: [required, maxLength(120)],
  // Optional, but must be a real mobile number once something is typed.
  phone: [optional(phoneIN)],
  location: [required, maxLength(120)],
  notes: [maxLength(500)],
};

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
  const { errors, validateAll, revalidatePatch, validateOnBlur } = useFieldErrors(schema);

  // Patch + re-check only what changed, so a corrected field clears its error.
  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
    revalidatePatch(p as Record<string, unknown>);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateAll(form)) return;
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
        <Input label="Name" requiredMark value={form.name} onChange={(e) => patch({ name: e.target.value })} onBlur={() => validateOnBlur("name", form.name)} error={errors.name} />
        <Input label="Phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => patch({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} onBlur={() => validateOnBlur("phone", form.phone)} error={errors.phone} />
        <Input label="Location" requiredMark value={form.location} onChange={(e) => patch({ location: e.target.value })} onBlur={() => validateOnBlur("location", form.location)} error={errors.location} />
        <Input label="Notes" value={form.notes} onChange={(e) => patch({ notes: e.target.value })} onBlur={() => validateOnBlur("notes", form.notes)} error={errors.notes} />
      </div>
    </FormShell>
  );
}
