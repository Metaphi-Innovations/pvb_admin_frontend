"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  HR_LABEL_CLASS,
  HR_HELPER_CLASS,
  HR_FIELD_SIZE,
  hrSpan,
  type HrSpan,
  type HrFieldSize,
} from "./hr-org-form";

/**
 * Binary setting aligned in the form grid.
 */
export function HrStatusToggle({
  checked,
  onCheckedChange,
  label = "Status",
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  helper,
  span,
  size = "sm",
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  helper?: string;
  span?: HrSpan;
  size?: HrFieldSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5 min-w-0",
        span ? hrSpan(span) : HR_FIELD_SIZE[size],
        className,
      )}
    >
      <p className={HR_LABEL_CLASS}>{label}</p>
      <div className="h-10 flex items-center justify-between gap-3 px-3 rounded-lg border border-border bg-white hover:border-foreground/25 transition-colors">
        <span
          className={cn(
            "text-sm truncate",
            checked ? "text-foreground font-medium" : "text-muted-foreground",
          )}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {helper && <p className={HR_HELPER_CLASS}>{helper}</p>}
    </div>
  );
}
