"use client";

import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import { cn } from "@/lib/utils";

export function DebitNoteLedgerSelect({
  value,
  fallbackLabel,
  placeholder,
  disabled,
  onChange,
  className,
}: {
  value: string;
  fallbackLabel?: string;
  placeholder?: string;
  disabled?: boolean;
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
      placeholder={placeholder || "Select adjustment ledger…"}
      query={{ status: "ACTIVE" }}
    />
  );
}
