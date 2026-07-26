"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import {
  validateCoupon,
  placeOrder,
  listAddresses,
  createAddress,
  type ShippingInput,
} from "@/lib/endpoints";
import type { Address } from "@/types";
import { validateFields, required, phoneIN, pincode } from "@/lib/validators";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatPrice } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const emptyShipping: ShippingInput = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

const toShipping = (a: Address): ShippingInput => ({
  name: a.name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  city: a.city,
  state: a.state,
  pincode: a.pincode,
});

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal());
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const logout = useAuthStore((s) => s.logout);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"saved" | "new">("new");
  const [saveNew, setSaveNew] = useState(true);

  const [ship, setShip] = useState<ShippingInput>(emptyShipping);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved addresses; preselect the default.
  useEffect(() => {
    if (!isAuthed) return;
    listAddresses()
      .then((d) => {
        const list = d.addresses ?? [];
        setAddresses(list);
        if (list.length > 0) {
          const def = list.find((a) => a.is_default) ?? list[0];
          setSelectedId(def.id);
          setShip(toShipping(def));
          setMode("saved");
        }
      })
      .catch(() => setAddresses([]));
  }, [isAuthed]);

  const set = (k: keyof ShippingInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setShip((s) => ({ ...s, [k]: e.target.value }));

  function pickSaved(a: Address) {
    setSelectedId(a.id);
    setShip(toShipping(a));
    setMode("saved");
    setErrors({});
  }
  function newAddress() {
    setSelectedId(null);
    setShip(emptyShipping);
    setMode("new");
    setErrors({});
  }

  if (!isAuthed) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Please sign in to check out.</p>
        <Button className="mt-4" onClick={() => router.push("/login")}>
          Sign in
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="py-20 text-center text-muted">Your cart is empty.</p>;
  }

  async function applyCoupon() {
    setCouponMsg(null);
    if (!code.trim()) return;
    try {
      const res = await validateCoupon(items, code.trim());
      if (res.valid) {
        setDiscount(res.discount);
        setCouponMsg(`Coupon applied — you save ${formatPrice(res.discount)}`);
      } else {
        setDiscount(0);
        setCouponMsg(res.reason ?? "Coupon not valid");
      }
    } catch (ex) {
      setDiscount(0);
      setCouponMsg(ex instanceof ApiException ? ex.message : "Could not validate coupon");
    }
  }

  async function submit() {
    setError(null);
    const errs = validateFields(ship as unknown as Record<string, string>, {
      name: [required],
      phone: [phoneIN],
      line1: [required],
      city: [required],
      state: [required],
      pincode: [pincode],
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPlacing(true);
    try {
      // Save a brand-new address to the book if requested.
      if (mode === "new" && saveNew) {
        try {
          await createAddress({ ...ship, is_default: addresses.length === 0 });
        } catch {
          /* non-fatal — still place the order */
        }
      }
      const order = await placeOrder(items, ship, code.trim() || undefined);
      clear();
      toast.success("Order placed!");
      router.push(`/orders/${order.id}`);
    } catch (ex) {
      if (ex instanceof ApiException && ex.status === 401) {
        logout();
        router.push("/login");
        return;
      }
      setError(ex instanceof ApiException ? ex.message : "Could not place order");
      if (ex instanceof ApiException && ex.fields) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(ex.fields)) {
          mapped[k.startsWith("shipping.") ? k.slice("shipping.".length) : k] = v;
        }
        setErrors(mapped);
      }
    } finally {
      setPlacing(false);
    }
  }

  const total = Math.max(0, subtotal - discount);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-4 font-display text-xl font-bold text-ink">Delivery address</h1>

        {/* Saved addresses */}
        {addresses.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pickSaved(a)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  mode === "saved" && selectedId === a.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-line bg-white hover:border-brand-300",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{a.name}</span>
                  {a.is_default && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}
                </p>
                <p className="text-sm text-muted">{a.phone}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={newAddress}
              className={cn(
                "rounded-2xl border border-dashed p-4 text-left text-sm font-semibold transition-colors",
                mode === "new" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted hover:border-brand-300",
              )}
            >
              + Deliver to a new address
            </button>
          </div>
        )}

        {/* Address form — for a new address, or editing the selected one */}
        {(mode === "new" || addresses.length === 0) && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={ship.name} onChange={set("name")} error={errors.name} />
              <Input label="Phone" value={ship.phone} onChange={set("phone")} error={errors.phone} />
              <div className="sm:col-span-2">
                <Input label="Address line 1" value={ship.line1} onChange={set("line1")} error={errors.line1} />
              </div>
              <div className="sm:col-span-2">
                <Input label="Address line 2 (optional)" value={ship.line2 ?? ""} onChange={set("line2")} />
              </div>
              <Input label="City" value={ship.city} onChange={set("city")} error={errors.city} />
              <Input label="State" value={ship.state} onChange={set("state")} error={errors.state} />
              <Input label="Pincode" value={ship.pincode} onChange={set("pincode")} error={errors.pincode} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
              Save this address for next time
            </label>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display font-bold text-ink">Order summary</h2>

        <div className="mt-4 flex gap-2">
          <input
            className="h-10 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500"
            placeholder="Coupon code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button variant="secondary" onClick={applyCoupon}>
            Apply
          </Button>
        </div>
        {couponMsg && <p className="mt-2 text-xs text-muted">{couponMsg}</p>}

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-brand-600">
              <span>Discount</span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <span>Total (COD)</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button className="mt-4 w-full" loading={placing} onClick={submit}>
          Place order (Cash on Delivery)
        </Button>
      </aside>
    </div>
  );
}
