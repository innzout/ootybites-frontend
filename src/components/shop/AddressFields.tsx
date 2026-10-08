"use client";

import { useEffect, useState } from "react";
import { listCities } from "@/lib/endpoints";
import { Input } from "@/components/ui/Input";
import { MapPicker, type PickedLocation } from "@/components/shop/MapPicker";

// The shared delivery-address value shape used by both the account page and
// checkout. Kept here so the two forms never drift apart.
export interface AddressValue {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number | null;
  lng?: number | null;
}

export const DEFAULT_STATE = "Tamil Nadu";

// A fresh address with the state pre-filled to the state we sell in.
export const emptyAddress: AddressValue = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: DEFAULT_STATE,
  pincode: "",
};

// AddressFields renders the mandatory-marked address inputs, a Google-Maps pin
// picker, a city dropdown constrained to serviceable cities (from admin Areas),
// and the state fixed to Tamil Nadu. `set` applies a partial patch so callers
// keep their own state container.
export function AddressFields({
  value,
  set,
  errors = {},
}: {
  value: AddressValue;
  set: (patch: Partial<AddressValue>) => void;
  errors?: Record<string, string>;
}) {
  const [cities, setCities] = useState<string[]>([]);
  const [areaNote, setAreaNote] = useState<string | null>(null);

  useEffect(() => {
    listCities()
      .then((d) => setCities(d.cities ?? []))
      .catch(() => setCities([]));
  }, []);

  // Ensure state defaults to Tamil Nadu even if the caller passed a blank.
  useEffect(() => {
    if (!value.state) set({ state: DEFAULT_STATE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill the city from the pincode via the free India Post API — helps even
  // when the map picker isn't available. Only fills an empty city (never clobbers
  // a choice), and only accepts a city we actually deliver to when a list exists.
  useEffect(() => {
    const pin = (value.pincode || "").trim();
    if (!/^[1-9]\d{5}$/.test(pin) || value.city) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        const district: string | undefined = data?.[0]?.PostOffice?.[0]?.District;
        if (!live || !district) return;
        if (cities.length === 0) set({ city: district });
        else {
          const match = cities.find((c) => c.toLowerCase() === district.toLowerCase());
          if (match) set({ city: match });
        }
      } catch {
        /* postal lookup is best-effort */
      }
    }, 450);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pincode, cities]);

  // Google falls back to a Plus Code ("CM75+C3 Ooty") when a point has no street
  // address. It pinpoints a spot but is useless written on a parcel, so it must
  // not land in Address line 1.
  const isPlusCode = (t: string) => /^[23456789C-HJ-NP-V]{4,}\+[23456789C-HJ-NP-V]{2,}/i.test(t.trim());

  function onPick(loc: PickedLocation) {
    // Always capture the exact pin so it can be saved on the address/order.
    const patch: Partial<AddressValue> = { lat: loc.lat, lng: loc.lng };
    if (loc.pincode) patch.pincode = loc.pincode;

    // Only accept a mapped city if we actually deliver there; otherwise leave the
    // dropdown for the shopper.
    const serviceable = !!loc.city && (cities.length === 0 || cities.includes(loc.city));
    if (serviceable) patch.city = loc.city;
    if (loc.line1 && !value.line1 && !isPlusCode(loc.line1)) patch.line1 = loc.line1;
    set(patch);

    // Previously the city dropdown was just left blank with no explanation, so a
    // customer pinning an address outside the delivery area saw the pin land,
    // some fields fill, and no reason why the city never did.
    if (loc.city && !serviceable) {
      setAreaNote(`We don't deliver to ${loc.city} yet — pick the nearest city we serve below.`);
    } else {
      setAreaNote(null);
    }
  }

  const hasPin = value.lat != null && value.lng != null;

  return (
    <div className="flex flex-col gap-4">
      <MapPicker
        onPick={onPick}
        initial={hasPin ? { lat: value.lat as number, lng: value.lng as number } : undefined}
      />
      {hasPin && !areaNote && (
        <p className="-mt-2 text-xs font-medium text-brand-600">📍 Delivery location pinned on the map.</p>
      )}
      {areaNote && (
        <p className="-mt-2 text-xs font-medium text-accent-600" aria-live="polite">
          {areaNote}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" requiredMark value={value.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
        <Input label="Phone" requiredMark value={value.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} />
        <div className="sm:col-span-2">
          <Input label="Address line 1" requiredMark value={value.line1} onChange={(e) => set({ line1: e.target.value })} error={errors.line1} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Address line 2 (optional)" value={value.line2 ?? ""} onChange={(e) => set({ line2: e.target.value })} />
        </div>

        {/* City — constrained to serviceable cities from admin Areas. */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">
            City<span className="ml-0.5 text-red-500">*</span>
          </span>
          {cities.length > 0 ? (
            <select
              value={value.city}
              onChange={(e) => set({ city: e.target.value })}
              aria-invalid={!!errors.city}
              className={`h-10 rounded-xl border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 ${
                errors.city ? "border-red-500" : "border-line"
              }`}
            >
              <option value="">Select your city…</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            // No serviceable cities configured yet → fall back to free text.
            <Input value={value.city} onChange={(e) => set({ city: e.target.value })} error={errors.city} />
          )}
          {errors.city && <span className="text-xs text-red-600">{errors.city}</span>}
        </label>

        {/* State — fixed to where we deliver. */}
        <Input label="State" requiredMark value={value.state || DEFAULT_STATE} readOnly className="bg-surface" error={errors.state} />

        <Input label="Pincode" requiredMark value={value.pincode} onChange={(e) => set({ pincode: e.target.value })} error={errors.pincode} />
      </div>
    </div>
  );
}
