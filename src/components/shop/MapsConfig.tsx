"use client";

import { createContext, useContext } from "react";

// Delivers the Google Maps browser config from the server to the client
// components that need it.
//
// Why this exists rather than process.env.NEXT_PUBLIC_*: only NEXT_PUBLIC_
// variables are inlined into the client bundle, and that prefix is unavailable
// here. The root layout is a server component, so it can read the unprefixed
// variables and pass them down as props — the value still reaches the browser
// (it must: the Maps JavaScript API runs there), it just arrives in the rendered
// HTML instead of being baked into the JS bundle at build time.
//
// IMPORTANT: this does NOT make the key secret. A Maps JS key is always visible
// to anyone viewing the page, on every site that uses one. The real protection
// is the key's HTTP-referrer and API restrictions in Google Cloud Console —
// lock it to your origins so a copied key is useless elsewhere.
//
// One upside over the build-time prefix: these are read per request, so rotating
// the key is a restart rather than a rebuild.

export interface MapsConfig {
  apiKey?: string;
  /** AdvancedMarkerElement needs a Map ID; DEMO_MAP_ID is Google's dev default. */
  mapId: string;
}

const MapsConfigContext = createContext<MapsConfig>({ mapId: "DEMO_MAP_ID" });

export function MapsConfigProvider({
  apiKey,
  mapId,
  children,
}: {
  apiKey?: string;
  mapId?: string;
  children: React.ReactNode;
}) {
  return (
    <MapsConfigContext.Provider value={{ apiKey, mapId: mapId || "DEMO_MAP_ID" }}>
      {children}
    </MapsConfigContext.Provider>
  );
}

export function useMapsConfig(): MapsConfig {
  return useContext(MapsConfigContext);
}
