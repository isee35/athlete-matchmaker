"use client";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "squad";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   "bg-teal-600 hover:bg-teal-500 text-white border border-teal-500",
  secondary: "bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border)]",
  ghost:     "bg-transparent hover:bg-[var(--surface-2)] text-[var(--muted-light)] border border-transparent",
  danger:    "bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800",
  squad:     "bg-gradient-to-r from-teal-600 to-pink-600 hover:from-teal-500 hover:to-pink-500 text-white font-bold border-0",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, disabled, className = "", children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
