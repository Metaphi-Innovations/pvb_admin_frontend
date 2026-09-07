"use client";

import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import type { LedgerDropdownItem } from "@/services/ledger.service";
import { cn } from "@/lib/utils";

/**
 * Service invoice line ledger — generic COA dropdown, manual-posting ledgers only.
 */
export function ServiceInvoiceLineLedgerSelect({
  value,
  fallbackLabel,
  onChange,
  disabled,
  className,
}: {
  value: string | null;
  fallbackLabel?: string;
  onChange: (ledger: LedgerDropdownItem) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <GenericLedgerHierarchySelect
      value={value}
      onChange={onChange}
      fallbackLabel={fallbackLabel}
      disabled={disabled}
      className={cn("h-8 text-xs text-left", className)}
      compact
      placeholder="Select ledger…"
      query={{ status: "ACTIVE" }}
    />
  );
}
