"use client";

/**
 * Direct Credit Note Supporting Ledger selector.
 * Uses the generic COA hierarchy dropdown, limited to ACTIVE ledgers that allow manual posting.
 */

import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import { cn } from "@/lib/utils";

export function CreditNoteLedgerSelect({
  value,
  fallbackLabel,
  placeholder,
  disabled,
  onChange,
  className,
}: {
  value: string;
  fallbackLabel?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (ledgerId: string, ledgerName: string) => void;
  className?: string;
}) {
  return (
    <GenericLedgerHierarchySelect
      value={value || null}
      onChange={(ledger) => onChange(ledger.ledgerId, ledger.ledgerName)}
      fallbackLabel={fallbackLabel}
      disabled={disabled}
      className={cn("h-[30px] text-xs text-left font-normal", className)}
      compact
      placeholder={placeholder || "Select supporting ledger…"}
      query={{ status: "ACTIVE" }}
    />
  );
}
