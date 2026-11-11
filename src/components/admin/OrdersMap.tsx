"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Navigation, Phone, X } from "lucide-react";
import Link from "next/link";
import { useMapsConfig } from "@/components/shop/MapsConfig";
import { loadMaps, directionsUrl, latLngParam } from "@/lib/googleMaps";
import type { OrderMapPoint } from "@/lib/adminEndpoints";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";

// Pin colour by order status, so a glance at the map reads as workload: what is
// waiting, what is out with a dealer, what is done.
const PIN_COLOUR: Record<string, string> = {
  placed: "#dc2626", // red — needs action
  reached_dealer: "#f59e0b", // amber — in progress
  delivered: "#16a34a", // green — done
  cancelled: "#9ca3af", // grey — inert
};

// Ooty, where Ootybites ships from — the fallback centre before any pin loads.
const DEFAULT_CENTER = { lat: 11.4102, lng: 76.695 };

/** An SVG teardrop pin, coloured per status. */
function pinIcon(google: any, status: string) {
  return {
    path: "M12 0C7.03 0 3 4.03 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9z",
    fillColor: PIN_COLOUR[status] ?? "#6b7280",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 1.5,
    anchor: new google.maps.Point(12, 24),
  };
}

/**
 * Interactive map of pinned orders for the admin panel.
 *
 * Shows one marker per order that has a delivery pin, coloured by status, and
 * on selecting a marker can draw the delivery route from the order's hub to the
 * customer.
 *
 * Route rendering uses the Directions API, which is a *separate* API that has
 * to be enabled on the Maps key. When it is not, the request comes back
 * REQUEST_DENIED — so the failure is caught and the panel falls back to a
 * Google Maps deep link, which always works and is what a rider would use on a
 * phone anyway. The admin is told which API to enable rather than being left
 * with a button that silently does nothing.
 */
export function OrdersMap({ points, loading }: { points: OrderMapPoint[]; loading?: boolean }) {
  const { apiKey: KEY, mapId: MAP_ID } = useMapsConfig();
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const rendererRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<OrderMapPoint | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  // ---- Create the map once ----
  useEffect(() => {
    if (!KEY || !divRef.current) return;
    let cancelled = false;
    loadMaps(KEY)
      .then(() => {
        if (cancelled || !divRef.current) return;
        const google = (window as any).google;
        mapRef.current = new google.maps.Map(divRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          mapId: MAP_ID || undefined,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        rendererRef.current = new google.maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true, // our own pins already mark both ends
          polylineOptions: { strokeColor: "#166534", strokeWeight: 5, strokeOpacity: 0.85 },
        });
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [KEY, MAP_ID]);

  // ---- Redraw markers whenever the filtered points change ----
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const google = (window as any).google;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.ship_lat, lng: p.ship_lng },
        map: mapRef.current,
        icon: pinIcon(google, p.status),
        title: `${p.order_number} · ${p.ship_name}`,
      });
      marker.addListener("click", () => {
        setSelected(p);
        setRouteError(null);
        setRouteInfo(null);
        rendererRef.current?.setDirections({ routes: [] });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: p.ship_lat, lng: p.ship_lng });
    });

    // Fit to the pins so the admin lands on the area that has orders rather
    // than having to hunt for them. A single pin would otherwise zoom to the
    // maximum, which loses all context.
    if (points.length === 1) {
      mapRef.current.setCenter({ lat: points[0].ship_lat, lng: points[0].ship_lng });
      mapRef.current.setZoom(15);
    } else if (points.length > 1) {
      mapRef.current.fitBounds(bounds, 48);
    }
  }, [points, ready]);

  // ---- Route from the hub (or store) to the selected order ----
  const showRoute = useCallback((p: OrderMapPoint) => {
    setRouteError(null);
    setRouteInfo(null);
    const google = (window as any).google;
    if (!google || !rendererRef.current) return;
    if (p.hub_lat == null || p.hub_lng == null) {
      setRouteError("This order's hub has no map pin yet — set one in Hubs to draw the route.");
      return;
    }
    new google.maps.DirectionsService().route(
      {
        origin: { lat: p.hub_lat, lng: p.hub_lng },
        destination: { lat: p.ship_lat, lng: p.ship_lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status !== "OK" || !result) {
          setRouteError(
            status === "REQUEST_DENIED"
              ? "In-map routing needs the Directions API enabled on your Google Maps key. Use “Open route in Google Maps” below meanwhile."
              : "Could not work out a route to this address.",
          );
          return;
        }
        rendererRef.current.setDirections(result);
        const leg = result.routes?.[0]?.legs?.[0];
        if (leg) setRouteInfo({ distance: leg.distance?.text ?? "", duration: leg.duration?.text ?? "" });
      },
    );
  }, []);

  if (!KEY) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface text-center">
        <AlertTriangle className="h-5 w-5 text-accent-600" />
        <p className="text-sm text-muted">
          The orders map needs a Google Maps key.
          <br />
          Set <code className="rounded bg-white px-1">GOOGLE_MAPS_API_KEY</code> for the frontend.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={divRef}
        className="h-[32rem] w-full overflow-hidden rounded-2xl border border-line bg-surface"
        role="application"
        aria-label="Map of orders with delivery pins"
      />

      {(!ready || loading) && !failed && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60" aria-busy="true">
          <Spinner />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90">
          <p className="text-sm text-muted">Google Maps could not load.</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        {(["placed", "reached_dealer", "delivered", "cancelled"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_COLOUR[s] }} />
            {s.replace("_", " ")}
          </span>
        ))}
        <span className="ml-auto">{points.length} pinned</span>
      </div>

      {/* Selected-order card */}
      {selected && (
        <div className="absolute bottom-14 left-3 right-3 z-10 rounded-2xl border border-line bg-white p-4 shadow-lg sm:right-auto sm:w-96">
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setSelected(null);
              rendererRef.current?.setDirections({ routes: [] });
            }}
            className="absolute right-2 top-2 rounded-full p-1 text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <Link href={`/admin/orders/${selected.id}`} className="font-semibold text-brand-600 hover:underline">
              {selected.order_number}
            </Link>
            <StatusBadge status={selected.status} />
            {selected.is_express && (
              <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">
                24-hour
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-semibold text-ink">{selected.ship_name}</p>
          <p className="text-sm text-muted">
            {selected.ship_line1}, {selected.ship_city} - {selected.ship_pincode}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatDate(selected.placed_at)} · {formatPrice(selected.total)}
            {selected.hub_name ? ` · from ${selected.hub_name}` : ""}
          </p>

          {routeInfo && (
            <p className="mt-2 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
              {routeInfo.distance} · about {routeInfo.duration} by road
            </p>
          )}
          {routeError && (
            <p role="alert" className="mt-2 rounded-lg bg-surface px-2 py-1 text-xs text-muted">
              {routeError}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => showRoute(selected)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Navigation className="h-3.5 w-3.5" /> Show route
            </button>
            <a
              href={directionsUrl(
                selected.hub_lat != null && selected.hub_lng != null
                  ? latLngParam(selected.hub_lat, selected.hub_lng)
                  : // No hub pin: let Google start from the rider's own location.
                    "My+Location",
                latLngParam(selected.ship_lat, selected.ship_lng),
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand-400 hover:text-brand-600"
            >
              Open route in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            {selected.ship_phone && (
              <a
                href={`tel:${selected.ship_phone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand-400 hover:text-brand-600"
              >
                <Phone className="h-3.5 w-3.5" /> {selected.ship_phone}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

