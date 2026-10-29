// Pure field validators — mirror backend/internal/validators so client and
// server share one error language. Each returns an error string or null.

export type Validator = (value: string) => string | null;

export const required: Validator = (v) =>
  v.trim() === "" ? "This field is required" : null;

export const phoneIN: Validator = (v) =>
  /^[6-9]\d{9}$/.test(v.trim()) ? null : "Enter a valid 10-digit mobile number";

export const pincode: Validator = (v) =>
  /^[1-9]\d{5}$/.test(v.trim()) ? null : "Enter a valid 6-digit pincode";

export const otp: Validator = (v) =>
  /^\d{6}$/.test(v.trim()) ? null : "Enter the 6-digit code";

export const minLength =
  (n: number): Validator =>
  (v) =>
    v.trim().length >= n ? null : `Must be at least ${n} characters`;

export const positiveNumber: Validator = (v) =>
  Number(v) > 0 ? null : "Must be greater than zero";

export const nonNegativeNumber: Validator = (v) =>
  v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0
    ? null
    : "Enter a number (0 or more)";

// Mirrors the server's coupon rule (handlers.AdminCreateCoupon) so an admin is
// told here rather than after a round trip.
export const percent: Validator = (v) => {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 && n <= 100
    ? null
    : "Enter a percentage between 1 and 100";
};

export const email: Validator = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : "Enter a valid email address";

export const maxLength =
  (n: number): Validator =>
  (v) =>
    v.trim().length <= n ? null : `Must be ${n} characters or fewer`;

// A site path ("/products/ooty-tea") or an absolute http(s) URL.
export const linkTarget: Validator = (v) => {
  const t = v.trim();
  if (t.startsWith("/")) return null;
  return /^https?:\/\/[^\s]+$/.test(t) ? null : "Use a path like /products/ooty-tea or a full https:// URL";
};

/**
 * Makes a validator tolerate an empty value, for genuinely optional fields.
 * Without this an optional phone or email is either unchecked or wrongly
 * demanded — the checks below only run once something has been typed.
 */
export const optional =
  (...checks: Validator[]): Validator =>
  (v) =>
    v.trim() === "" ? null : firstError(v, ...checks);

// Run a set of validators against one value; returns the first error or null.
export function firstError(value: string, ...checks: Validator[]): string | null {
  for (const check of checks) {
    const err = check(value);
    if (err) return err;
  }
  return null;
}

// Validate a record of fields against per-field validator lists. Returns an
// error.fields-shaped map (empty when everything passes).
export function validateFields(
  values: Record<string, string>,
  schema: Record<string, Validator[]>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, checks] of Object.entries(schema)) {
    const err = firstError(values[field] ?? "", ...checks);
    if (err) errors[field] = err;
  }
  return errors;
}
