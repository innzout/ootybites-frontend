"use client";

import { useState } from "react";
import { Copy, Check, Phone, MapPin, MessageCircle } from "lucide-react";
import type { Order } from "@/types";
import { toast } from "@/lib/toast";

// Everything a delivery rider needs for one drop, in a form that can be handed
// over in one action. Staff were otherwise retyping the name, phone and address
// out of the order screen into WhatsApp, which is slow and gets digits wrong.
//
// The map link prefers the customer's dropped pin (exact) over the typed address
// (approximate) — that pin is the whole point of the checkout map picker.

/** Google Maps link: coordinates when the customer pinned one, else the address. */
function mapsLink(order: Order): string {
  if (order.ship_lat != null && order.ship_lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${order.ship_lat},${order.ship_lng}`;
  }
  const q = [order.ship_line1, order.ship_line2, order.ship_city, order.ship_state, order.ship_pincode]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function fullAddress(order: Order): string {
  return [order.ship_line1, order.ship_line2, order.ship_city, order.ship_state]
    .filter(Boolean)
    .join(", ")
    .concat(` - ${order.ship_pincode}`);
}

/** The plain-text block that gets copied or sent. */
function handoffText(order: Order): string {
  const lines = [
    `Ootybites delivery — ${order.order_number}`,
    `Name: ${order.ship_name}`,
    `Phone: ${order.ship_phone}`,
    `Address: ${fullAddress(order)}`,
  ];
  if (order.delivery_note) lines.push(`Note: ${order.delivery_note}`);
  if (order.ship_lat == null || order.ship_lng == null) {
    // Be explicit when there is no pin, so the rider knows to expect a rough
    // location rather than assuming the link is exact.
    lines.push("(No map pin on this order — address is approximate)");
  }
  lines.push(`Map: ${mapsLink(order)}`);
  return lines.join("\n");
}

export function DeliveryHandoff({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);
  const text = handoffText(order);
  const hasPin = order.ship_lat != null && order.ship_lng != null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Delivery details copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context and permission; tell the user rather
      // than failing silently with a button that looks like it worked.
      toast.error("Could not copy — select the text below and copy manually.");
    }
  }

  const action =
    "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-400 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Send to delivery person</p>
        <button type="button" onClick={copy} className={action} aria-label="Copy delivery details">
          {copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy details"}
        </button>
      </div>

      {/* The exact text that will be copied/sent — no surprises about what goes out. */}
      <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-line bg-white p-3 font-sans text-xs leading-relaxed text-ink">
        {text}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          className={action}
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
        <a className={action} href={`tel:${order.ship_phone}`}>
          <Phone className="h-3.5 w-3.5" /> Call customer
        </a>
        <a className={action} href={mapsLink(order)} target="_blank" rel="noopener noreferrer">
          <MapPin className="h-3.5 w-3.5" />
          {hasPin ? "Open pinned location" : "Open address (no pin)"}
        </a>
      </div>

      {!hasPin && (
        <p className="mt-2 text-[11px] text-accent-600">
          This order has no map pin — the link searches the typed address, which may be imprecise.
        </p>
      )}
    </div>
  );
}
