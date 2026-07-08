import { type HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  glow?: "teal" | "pink" | "none";
}

export function Card({ glow = "none", className = "", children, ...rest }: Props) {
  const glowClass = glow === "teal" ? "teal-glow" : glow === "pink" ? "pink-glow" : "";
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 ${glowClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
