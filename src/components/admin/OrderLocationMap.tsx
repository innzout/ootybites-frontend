"use client";

import { MapPin, ExternalLink, Navigation } from "lucide-react";
import { useMapsConfig } from "@/components/shop/MapsConfig";
import { directionsUrl, latLngParam } from "@/lib/googleMaps";


// OrderLocationMap shows the customer's delivery pin for an order: an embedded
// Google map (Maps Embed API, gated on the key) plus an always-working
// "Open in Google Maps" link. Renders nothing when the order has no pin.
export function OrderLocationMap({ lat, lng, label }: { lat?: number | null; lng?: number | null; label?: string }) {
  const { apiKey: KEY } = useMapsConfig();
  if (lat == null || lng == null) return null;
  const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
  // Origin is the rider's own location: this single-order view does not load
  // the hub's coordinates. The orders map, which does, routes from the hub.
  const route = directionsUrl("My+Location", latLngParam(lat, lng));

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <MapPin className="h-4 w-4 text-brand-600" /> Delivery pin
        </span>
        <a
          href={gmaps}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          Open in Google Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {KEY ? (
        <iframe
          title={label ? `Delivery location for ${label}` : "Delivery location"}
          className="h-56 w-full rounded-xl border border-line"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${lat},${lng}&zoom=16`}
        />
      ) : (
        <a
          href={gmaps}
          target="_blank"
          rel="noreferrer"
          className="flex h-24 items-center justify-center rounded-xl border border-dashed border-line bg-surface text-sm text-muted hover:text-brand-600"
        >
          View delivery location on Google Maps →
        </a>
      )}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
        <a
          href={route}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Navigation className="h-3.5 w-3.5" /> Directions
        </a>
      </div>
    </div>
  );
}
