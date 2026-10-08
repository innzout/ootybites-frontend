"use client";

import { useSyncExternalStore } from "react";
import { getDeviceFlag, onDeviceFlag, type DeviceFlag } from "@/lib/deviceStatus";

// React binding for lib/deviceStatus. The server snapshot is deliberately the
// conservative one (see SSR_DEFAULTS) so server HTML and the first client paint
// agree, then the real value arrives on hydration without a mismatch warning.
export function useDeviceFlag(flag: DeviceFlag): boolean {
  return useSyncExternalStore(
    (cb) => onDeviceFlag(flag, cb),
    () => getDeviceFlag(flag),
    () => true,
  );
}
