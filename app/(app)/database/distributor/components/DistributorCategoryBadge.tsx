"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { DistributorCategory } from "@/lib/distributor/distributor-scoring";
import { formatCategoryLabel } from "@/lib/distributor/distributor-scoring";

export function DistributorCategoryBadge({
  category,
  className,
}: {
  category: DistributorCategory;
  className?: string;
}) {
  const cfg = {
    A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    B: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    C: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  }[category];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        cfg.bg,
        cfg.text,
        cfg.border,
        className,
      )}
    >
      {formatCategoryLabel(category)}
    </span>
  );
}

export function ConversionStatusBadge({
  status,
}: {
  status: "not_converted" | "draft_customer" | "customer_completed";
}) {
  const cfg = {
    not_converted: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      label: "Not Converted",
    },
    draft_customer: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Draft Customer",
    },
    customer_completed: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      label: "Converted",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        cfg.bg,
        cfg.text,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "customer_completed"
            ? "bg-emerald-500"
            : status === "draft_customer"
              ? "bg-amber-400"
              : "bg-slate-400",
        )}
      />
      {cfg.label}
    </span>
  );
}
