"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Area, Hub } from "@/types";
import { adminCreateArea, adminUpdateArea, adminListHubs } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { useFieldErrors } from "@/lib/useFieldErrors";
import { required, pincode, maxLength } from "@/lib/validators";

const schema = {
  code: [required, maxLength(10)],
  name: [required, maxLength(120)],
  pincode: [pincode],
};

export function AreaForm({ area }: { area?: Area }) {
  const router = useRouter();
  const editing = !!area;
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [form, setForm] = useState({
    code: area?.code ?? "",
    name: area?.name ?? "",
    pincode: area?.pincode ?? "",
    hub_id: area?.hub_id ?? "",
  });
  const { errors, validateAll, revalidatePatch, validateOnBlur } = useFieldErrors(schema);
  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
    revalidatePatch(p as Record<string, unknown>);
  }
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminListHubs().then((d) => setHubs(d.hubs ?? [])).catch(() => setHubs([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateAll(form)) return;
    setSaving(true);
    try {
      const body = {
        code: form.code,
        name: form.name,
        city: "Chennai",
        pincode: form.pincode,
        hub_id: form.hub_id || null,
        is_active: editing ? area.is_active : true,
      };
      if (editing) {
        await adminUpdateArea(area.id, body);
        toast.success("Area updated");
      } else {
        await adminCreateArea(body);
        toast.success("Area added");
      }
      router.push("/admin/areas");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save area");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${area.name}` : "New area"}
      subtitle="A pincode belongs to one hub — orders from it auto-route to that hub (Chennai)."
      breadcrumbs={[{ label: "Areas", href: "/admin/areas" }, { label: editing ? "Edit" : "New" }]}
      backHref="/admin/areas"
      onSubmit={submit}
      saving={saving}
      disabled={!form.code || !form.name || !form.pincode}
      submitLabel={editing ? "Save changes" : "Add area"}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" requiredMark placeholder="SIR" value={form.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} onBlur={() => validateOnBlur("code", form.code)} error={errors.code} />
        <Input label="Area name" requiredMark placeholder="Siruseri" value={form.name} onChange={(e) => patch({ name: e.target.value })} onBlur={() => validateOnBlur("name", form.name)} error={errors.name} />
        <Input label="Pincode" requiredMark inputMode="numeric" maxLength={6} placeholder="603103" value={form.pincode} onChange={(e) => patch({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} onBlur={() => validateOnBlur("pincode", form.pincode)} error={errors.pincode} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Hub</span>
          <select
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm"
            value={form.hub_id}
            onChange={(e) => setForm({ ...form, hub_id: e.target.value })}
          >
            <option value="">— None —</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>
      </div>
    </FormShell>
  );
}
