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
