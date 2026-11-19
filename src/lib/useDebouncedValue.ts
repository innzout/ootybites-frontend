"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delayMs`. Used for search
 * boxes that drive a server request, so typing "varki" sends one request rather
 * than five.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return settled;
}
