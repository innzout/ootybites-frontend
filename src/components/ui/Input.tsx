import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  // Show a red asterisk after the label to mark the field as mandatory.
  requiredMark?: boolean;
}

// DEFAULT_MAX_LENGTH bounds every text field that does not set its own limit.
//
// Project rule: every input has a max length. Applying it here rather than at
// ~60 call sites means a field can never be left unbounded by omission, and a
// field with a real limit (phone 10, pincode 6) still overrides it. Generous
// on purpose: long values that are legitimately long, such as a Cloudinary
// image URL, must still paste in whole.
export const DEFAULT_MAX_LENGTH = 500;

// Input pairs a label with an inline field error, consuming the same
// error string produced by lib/validators (error.fields shape).
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, requiredMark, maxLength, type, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
            {requiredMark && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          // Browsers ignore maxLength on number/date inputs, so only apply the
          // default where it actually does something.
          maxLength={maxLength ?? (type === "number" || type === "date" ? undefined : DEFAULT_MAX_LENGTH)}
          aria-invalid={!!error}
          // Point assistive tech at the error text so it's announced on focus.
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-10 rounded-xl border bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:ring-2",
            // The focus ring matches the field state — red when errored.
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
              : "border-line focus:border-brand-500 focus:ring-brand-500/25",
            className,
          )}
          {...props}
        />
        {error && (
          <span id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
