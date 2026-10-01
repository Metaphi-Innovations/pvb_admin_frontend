"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * HRMS-wide Active / Inactive control for master & configuration records.
 * ON = Active · OFF = Inactive (brand orange when on).
 *
 * size="sm" — compact table/list Status column (default)
 * size="md" — Add/Edit forms (slightly larger hit target)
 */
export function HrActiveStatusSwitch({
  checked,
  onCheckedChange,
  disabled,
  showLabel = false,
  size = "sm",
  className,
  id,
}: {
  checked: boolean;
  onCheckedChange: (active: boolean) => void;
  disabled?: boolean;
  /** Optional text beside toggle — off by default; ON/OFF is enough. */
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center",
        size === "sm" ? "gap-1.5" : "gap-2",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        size={size === "sm" ? "sm" : "default"}
        aria-label={checked ? "Active" : "Inactive"}
      />
      {showLabel && (
        <span
          className={cn(
            "font-medium leading-none",
            size === "sm" ? "text-[11px]" : "text-xs",
            checked ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {checked ? "Active" : "Inactive"}
        </span>
      )}
    </div>
  );
}

export function activeStatusToastMessage(entityName: string, nextActive: boolean): string {
  return `${entityName} ${nextActive ? "activated" : "deactivated"} successfully.`;
}

export function deactivateInUseDescription(
  recordName: string,
  count: number,
  assignedNoun: string,
  entityLower: string,
): string {
  return `${recordName} is currently assigned to ${count} ${assignedNoun}. Existing records will remain unchanged, but this ${entityLower} will not be available for new assignments.`;
}
