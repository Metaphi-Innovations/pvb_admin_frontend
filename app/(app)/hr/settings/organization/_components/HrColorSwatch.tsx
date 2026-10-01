"use client";

import { cn } from "@/lib/utils";
import type { EmploymentStatusColor } from "../../organization-data";
import { EMPLOYMENT_STATUS_COLORS } from "../../organization-data";

const SWATCH: Record<EmploymentStatusColor, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
  violet: "bg-violet-500",
};

export function HrColorSwatch({
  color,
  label,
}: {
  color: EmploymentStatusColor;
  label?: string;
}) {
  const meta = EMPLOYMENT_STATUS_COLORS.find((c) => c.value === color);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", SWATCH[color])} />
      {label ?? meta?.label ?? color}
    </span>
  );
}
