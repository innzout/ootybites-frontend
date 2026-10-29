"use client";

import { useCallback, useRef, useState } from "react";
import { validateFields, type Validator } from "@/lib/validators";

/**
 * Form error state with the one behaviour every form here was missing: errors
 * clear as the customer fixes them.
 *
 * Previously forms only ever recomputed errors inside submit(), so a message
 * stayed on screen until the next submit attempt. Entering a full 10-digit
 * phone still showed "Enter a valid 10-digit mobile number", and picking a city
 * still showed "This field is required" — the value was correct and the error
 * was simply stale. That reads as a broken form and stops people checking out.
 *
 * Behaviour follows the usual convention: stay quiet until the first submit,
 * then re-validate each field live as it changes, so messages disappear the
 * moment the value becomes valid. Blur validates a touched field even before
 * the first submit, which catches mistakes early without nagging mid-typing.
 */
/**
 * Error state for forms whose validation is bespoke rather than schema-driven
 * (most admin forms), plus server-returned `error.fields`.
 *
 * Same problem as useFieldErrors solves, same rule: a message must disappear
 * when the value it complains about changes. These forms only ever recomputed
 * errors inside submit(), so a field you had just corrected stayed red until
 * you pressed save again.
 */
export function useClearableErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Drop one field's error — call it from that field's onChange. */
  const clearField = useCallback((field: string) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev; // nothing to do, skip the render
      const next = { ...prev };
      delete next[field];
      // A form-level message is stale as soon as any field changes: it came
      // from the failed save, not from the value now on screen.
      delete next.form;
      return next;
    });
  }, []);

  return { errors, setErrors, clearField };
}

export function useFieldErrors(schema: Record<string, Validator[]>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Ref, not state: submit() reads it immediately after setting it, and it must
  // never itself trigger a render.
  const submitted = useRef(false);

  /** Validate everything. Returns true when the form is clean. */
  const validateAll = useCallback(
    (values: Record<string, unknown>) => {
      submitted.current = true;
      const errs = validateFields(values as Record<string, string>, schema);
      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [schema],
  );

  /**
   * Re-check one field after its value changed. Only speaks up once the form
   * has been submitted, so typing a fresh form never flashes red.
   */
  const revalidate = useCallback(
    (field: string, value: unknown) => {
      if (!submitted.current) return;
      const checks = schema[field];
      if (!checks) return;
      setErrors((prev) => {
        const err = validateFields({ [field]: String(value ?? "") }, { [field]: checks })[field];
        if (err === prev[field]) return prev; // no change — skip the render
        const next = { ...prev };
        if (err) next[field] = err;
        else delete next[field];
        return next;
      });
    },
    [schema],
  );

  /** Re-check every field in a patch. Pairs with a partial-update `set`. */
  const revalidatePatch = useCallback(
    (patch: Record<string, unknown>) => {
      for (const [field, value] of Object.entries(patch)) revalidate(field, value);
    },
    [revalidate],
  );

  /** Validate on blur, so a mistake surfaces before submit is ever pressed. */
  const validateOnBlur = useCallback(
    (field: string, value: unknown) => {
      const checks = schema[field];
      if (!checks) return;
      const err = validateFields({ [field]: String(value ?? "") }, { [field]: checks })[field];
      setErrors((prev) => {
        if (err === prev[field]) return prev;
        const next = { ...prev };
        if (err) next[field] = err;
        else delete next[field];
        return next;
      });
    },
    [schema],
  );

  /**
   * Apply server-side field errors (the shared `error.fields` shape). These are
   * authoritative, so they show regardless of submit state.
   */
  const setServerErrors = useCallback((fields: Record<string, string>) => {
    submitted.current = true;
    setErrors(fields);
  }, []);

  /** Drop every error — e.g. when the form is swapped for a different record. */
  const reset = useCallback(() => {
    submitted.current = false;
    setErrors({});
  }, []);

  return { errors, validateAll, revalidate, revalidatePatch, validateOnBlur, setServerErrors, reset };
}
