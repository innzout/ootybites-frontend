"use client";

// Storefront settings — fetched once from the public /settings endpoint and
// cached. Components read via useSettings(); until the fetch resolves they see
// these defaults (which mirror the DB seed), so the UI never flashes empty.

import { useEffect } from "react";
import { create } from "zustand";
import { listSettings, type StoreSettings } from "@/lib/endpoints";

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "Ootybites",
  tagline: "Taste of the Hills",
  support_email: "",
  support_phone: "",
  store_address: "Ooty, Tamil Nadu",
  standard_delivery_text: "Arrives in 3–5 days",
  express_delivery_text: "Delivered within 24 hours",
  cod_note: "Cash on delivery across India",
  order_number_prefix: "OB",
};

interface SettingsState {
  settings: StoreSettings;
  loaded: boolean;
  load: () => void;
}

const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: () => {
    if (get().loaded) return;
    set({ loaded: true }); // guard against duplicate fetches
    listSettings()
      .then((s) => set({ settings: { ...DEFAULT_SETTINGS, ...s } }))
      .catch(() => set({ loaded: false })); // allow a retry on next mount
  },
}));

// useSettings triggers a one-time fetch and returns the current settings.
export function useSettings(): StoreSettings {
  const settings = useSettingsStore((s) => s.settings);
  const load = useSettingsStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
  return settings;
}
