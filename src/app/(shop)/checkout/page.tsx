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
  expressCheck,
  type ShippingInput,
} from "@/lib/endpoints";
import type { Address } from "@/types";
import { validateFields, required, phoneIN, pincode } from "@/lib/validators";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { askConfirm } from "@/lib/confirm";
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useHydrated } from "@/lib/useHydrated";
import { AddressFields, DEFAULT_STATE } from "@/components/shop/AddressFields";
import { AddressBook } from "@/components/checkout/AddressBook";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import type { ExpressResult } from "@/components/checkout/DeliveryMethod";

const emptyShipping: ShippingInput = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: DEFAULT_STATE,
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
  lat: a.lat,
  lng: a.lng,
});

// Checkout orchestration. The address book, order summary and delivery-method
// panels are their own components — this file owns only state and submission,
// which is the part worth reading when the order flow changes.
export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal());
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const cartHydrated = useHydrated(useCartStore);
  const authHydrated = useHydrated(useAuthStore);
  const logout = useAuthStore((s) => s.logout);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"saved" | "new">("new");
  const [saveNew, setSaveNew] = useState(true);

  const [ship, setShip] = useState<ShippingInput>(emptyShipping);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [express, setExpress] = useState<ExpressResult | null>(null);
  const [checkingExpress, setCheckingExpress] = useState(false);

  // Check 24-hour (hub) availability whenever a full pincode is entered. This
  // drives which fulfilment flow the order takes: express (local hub stock, 24h)
  // vs standard (central stock, 3–5 days).
  useEffect(() => {
    const pin = ship.pincode.trim();
    if (!/^[1-9]\d{5}$/.test(pin) || items.length === 0) {
      setExpress(null);
      setCheckingExpress(false);
      return;
    }
    let live = true;
    setCheckingExpress(true);
    const t = setTimeout(() => {
      expressCheck(pin, items)
        .then((r) => live && setExpress(r))
        .catch(() => live && setExpress(null))
        .finally(() => live && setCheckingExpress(false));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ship.pincode, items]);

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

  // A cart edit invalidates any applied discount — the amount was calculated
  // against the old lines. Clearing it stops the summary showing a saving the
  // server will not honour at placement.
  useEffect(() => {
    setDiscount(0);
    setCouponMsg(null);
  }, [items]);

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

    // Placing an order is a commitment (COD, dispatched from Ooty) and is one of
    // the actions the project rules require a confirmation for.
    const ok = await askConfirm({
      title: "Place this order?",
      message: `${formatPrice(Math.max(0, subtotal - discount))} payable on delivery to ${ship.city} - ${ship.pincode}.`,
      confirmText: "Place order",
    });
    if (!ok) return;

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
      const order = await placeOrder(items, ship, code.trim() || undefined, deliveryNote.trim() || undefined);
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

  // Both the cart and the session come from localStorage, so the server renders
  // "empty cart / signed out" and the client renders the truth — React was
  // reporting "Hydration failed… server HTML didn't match" on every checkout and
  // throwing away the server tree. Wait for both stores before deciding.
  if (!cartHydrated || !authHydrated) {
    return (
      <div className="py-20 text-center" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Please sign in to check out.</p>
        {/* Plain navigation belongs in a link, not a button driving router.push
            — this keeps middle-click and open-in-new-tab working. */}
        <Link href="/login?next=/checkout" className={buttonClasses({}, "mt-4")}>
          Sign in
        </Link>
      </div>
    );
  }
  if (items.length === 0) {
    // Dead end otherwise: landing on checkout with an empty cart left the
    // customer on a bare sentence with no way back into the shop.
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/" className={buttonClasses({}, "mt-4")}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-4 font-display text-xl font-bold text-ink">Delivery address</h1>

        <AddressBook
          addresses={addresses}
          selectedId={selectedId}
          mode={mode}
          onPick={pickSaved}
          onNew={newAddress}
        />

        {/* Address form — for a new address, or when the book is empty. */}
        {(mode === "new" || addresses.length === 0) && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <AddressFields value={ship} set={(patch) => setShip((s) => ({ ...s, ...patch }))} errors={errors} />
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
              Save this address for next time
            </label>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="delivery-note" className="mb-1 block text-sm font-medium text-ink">
            Delivery instructions (optional)
          </label>
          <textarea
            id="delivery-note"
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="E.g. Leave at the gate, call on arrival, landmark…"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
      </div>

      <OrderSummary
        code={code}
        onCodeChange={setCode}
        onApplyCoupon={applyCoupon}
        couponMsg={couponMsg}
        subtotal={subtotal}
        discount={discount}
        expressChecking={checkingExpress}
        expressResult={express}
        error={error}
        placing={placing}
        onPlace={submit}
      />
    </div>
  );
}
