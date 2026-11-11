"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Hub, Dealer } from "@/types";
import { adminCreateHub, adminUpdateHub, adminListDealers } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { MapPicker } from "@/components/shop/MapPicker";
import { useFieldErrors } from "@/lib/useFieldErrors";
import { required, maxLength } from "@/lib/validators";

const schema = { name: [required, maxLength(120)] };

export function HubForm({ hub }: { hub?: Hub }) {
  const router = useRouter();
  const editing = !!hub;
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [name, setName] = useState(hub?.name ?? "");
  const [dealerId, setDealerId] = useState(hub?.dealer_id ?? "");
  // The hub pin is the origin of every delivery route drawn on the orders map,
  // so without it those orders can only offer "start from my location".
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    hub?.lat != null && hub?.lng != null ? { lat: hub.lat, lng: hub.lng } : null,
  );
  const { errors, validateAll, revalidate, validateOnBlur } = useFieldErrors(schema);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminListDealers().then((d) => setDealers(d.dealers ?? [])).catch(() => setDealers([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateAll({ name })) return;
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateHub(hub.id, {
          name,
          dealer_id: dealerId || null,
          is_active: hub.is_active,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
        });
        toast.success("Hub updated");
      } else {
        await adminCreateHub({
          name,
          dealer_id: dealerId || null,
          is_active: true,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
        });
        toast.success("Hub created");
      }
      router.push("/admin/hubs");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save hub");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${hub.name}` : "New hub"}
      subtitle="A hub is a fulfilment centre run by a dealer. After saving, use Manage to assign areas and receive stock."
      breadcrumbs={[{ label: "Hubs", href: "/admin/hubs" }, { label: editing ? "Edit" : "New" }]}
      backHref="/admin/hubs"
      onSubmit={submit}
      saving={saving}
      disabled={!name.trim()}
      submitLabel={editing ? "Save changes" : "Add hub"}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Hub name" requiredMark placeholder="Siruseri Hub" value={name} onChange={(e) => { setName(e.target.value); revalidate("name", e.target.value); }} onBlur={() => validateOnBlur("name", name)} error={errors.name} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Dealer</span>
          <select className="h-10 rounded-xl border border-line bg-white px-3 text-sm" value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
            <option value="">— None —</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">
          Hub location <span className="font-normal text-muted">(optional)</span>
        </p>
        <p className="mb-2 text-xs text-muted">
          Drop a pin where this hub dispatches from. The orders map draws each delivery route
          starting here; without it those orders can only offer directions from the rider&rsquo;s own
          location.
        </p>
        <MapPicker onPick={(loc) => setPin({ lat: loc.lat, lng: loc.lng })} initial={pin ?? undefined} />
        {pin && (
          <p className="mt-1.5 text-xs font-medium text-brand-600">
            ð Pinned at {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
          </p>
        )}
      </div>
    </FormShell>
  );
}
