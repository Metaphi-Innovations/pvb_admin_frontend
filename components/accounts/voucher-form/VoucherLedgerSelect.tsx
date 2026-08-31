"use client";

/**
 * Shared COA hierarchy ledger picker for Receipt / Payment / Journal vouchers.
 */

import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import { cn } from "@/lib/utils";
import type { LedgerDropdownItem } from "@/services/ledger.service";

export function VoucherLedgerSelect({
  value,
  fallbackLabel,
  placeholder = "Select ledger…",
  disabled,
  onChange,
  className,
  excludeSystemGenerated = false,
  allowedPrimaryHeadCodes,
}: {
  value: string;
  fallbackLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (ledger: LedgerDropdownItem) => void;
  className?: string;
  excludeSystemGenerated?: boolean;
  allowedPrimaryHeadCodes?: string[];
}) {
  return (
    <GenericLedgerHierarchySelect
      value={value || null}
      onChange={onChange}
      fallbackLabel={fallbackLabel}
      disabled={disabled}
      compact
      placeholder={placeholder}
      className={cn("h-[30px] text-xs text-left font-normal w-full min-w-0", className)}
      query={{ status: "ACTIVE", allowManualPosting: true }}
      excludeSystemGenerated={excludeSystemGenerated}
      allowedPrimaryHeadCodes={allowedPrimaryHeadCodes}
    />
  );
}
