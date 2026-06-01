"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { status as statusTokens, type StatusKey } from "@/lib/tokens";

interface StatusBadgeProps {
  status: StatusKey;
  label?: string;
  showDot?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const labels: Record<StatusKey, string> = {
  active:   "Active",
  inactive: "Inactive",
  pending:  "Pending",
  approved: "Approved",
  rejected: "Rejected",
  draft:    "Draft",
  shipped:  "Shipped",
  overdue:  "Overdue",
  partial:  "Partial",
  closed:   "Closed",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-[11px] gap-1.5",
  lg: "px-3 py-1.5 text-xs gap-1.5",
};

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2 h-2",
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = "md",
  className,
}: StatusBadgeProps) {
  const token = statusTokens[status];
  const text  = label ?? labels[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold border tracking-wide uppercase",
        sizeClasses[size],
        className,
      )}
      style={{
        backgroundColor: token.bg,
        color:           token.text,
        borderColor:     token.border,
      }}
    >
      {showDot && (
        <span
          className={cn("rounded-full flex-shrink-0", dotSizes[size])}
          style={{ backgroundColor: token.dot }}
        />
      )}
      {text}
    </span>
  );
}

// ── Pill variant (no border, softer) ─────────────────────────────────────────
export function StatusPill({
  status,
  label,
  className,
}: Omit<StatusBadgeProps, "showDot" | "size">) {
  const token = statusTokens[status];
  const text  = label ?? labels[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
        className,
      )}
      style={{ backgroundColor: token.bg, color: token.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: token.dot }}
      />
      {text}
    </span>
  );
}

// ── Count badge (notification bubble) ────────────────────────────────────────
export function CountBadge({
  count,
  max = 99,
  variant = "brand",
  className,
}: {
  count: number;
  max?: number;
  variant?: "brand" | "red" | "amber";
  className?: string;
}) {
  if (count <= 0) return null;
  const display = count > max ? `${max}+` : String(count);

  const variantClass = {
    brand: "bg-brand-500 text-white",
    red:   "bg-red-500 text-white",
    amber: "bg-amber-500 text-white",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-[10px] font-bold",
        "min-w-[18px] h-[18px] px-1",
        variantClass,
        className,
      )}
    >
      {display}
    </span>
  );
}
