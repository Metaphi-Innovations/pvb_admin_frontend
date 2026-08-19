"use client";

import { LedgerHierarchySelect } from "@/components/accounts/LedgerHierarchySelect";
import type { LedgerDropdownItem } from "@/services/ledger.service";
import type { PurchaseNature } from "./purchase-invoices-data";
import { cn } from "@/lib/utils";
import { DP_TABLE_INPUT_CLASS } from "./direct-purchase-form-ui";

export function DirectPurchaseLineLedgerSelect({
  value,
  fallbackLabel,
  onChange,
  disabled,
}: {
  purchaseNature?: PurchaseNature;
  value: string | number | null;
  fallbackLabel?: string;
  onChange: (ledger: LedgerDropdownItem) => void;
  disabled?: boolean;
}) {
  const selectedId = typeof value === "string" && value.trim() ? value : null;

  return (
    <LedgerHierarchySelect
      value={selectedId}
      onChange={onChange}
      fallbackLabel={fallbackLabel}
      disabled={disabled}
      className={cn(DP_TABLE_INPUT_CLASS, "text-left")}
    />
  );
}
