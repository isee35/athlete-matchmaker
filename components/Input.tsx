import { type InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "_");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--muted-light)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-[var(--surface-2)] border ${error ? "border-red-500" : "border-[var(--border)]"} text-[var(--foreground)] placeholder-[var(--muted)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors ${className}`}
          {...rest}
        />
        {hint && !error && <p className="text-xs text-[var(--muted)]">{hint}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
