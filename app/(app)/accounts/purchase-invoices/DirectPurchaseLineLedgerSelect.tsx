"use client";

import { useMemo } from "react";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { getActivePostingLedgers, hierarchyBreadcrumb } from "@/lib/accounts/coa-hierarchy";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { PurchaseNature } from "./purchase-invoices-data";
import { ledgerMatchesPurchaseNature } from "./purchase-invoice-direct-utils";
import { cn } from "@/lib/utils";
import { DP_TABLE_INPUT_CLASS } from "./direct-purchase-form-ui";

export function DirectPurchaseLineLedgerSelect({
  purchaseNature,
  coaRecords,
  value,
  fallbackLabel,
  onChange,
  disabled,
}: {
  purchaseNature: PurchaseNature;
  coaRecords: ChartOfAccount[];
  value: number | null;
  fallbackLabel?: string;
  onChange: (ledger: ChartOfAccount) => void;
  disabled?: boolean;
}) {
  const options = useMemo(() => {
    return getActivePostingLedgers(coaRecords)
      .filter((ledger) => ledgerMatchesPurchaseNature(ledger, purchaseNature, coaRecords))
      .sort((a, b) => a.accountName.localeCompare(b.accountName))
      .map((ledger) => {
        const path = hierarchyBreadcrumb(coaRecords, ledger.id);
        return {
          value: String(ledger.id),
          label: ledger.accountCode
            ? `${ledger.accountCode} · ${ledger.accountName}`
            : ledger.accountName,
          sublabel: path,
          searchText: `${ledger.accountCode ?? ""} ${ledger.accountName} ${path}`,
        };
      });
  }, [coaRecords, purchaseNature]);

  const selectedValue = value != null ? String(value) : "";

  return (
    <AutocompleteSelect
      key={purchaseNature}
      options={options}
      value={selectedValue}
      onChange={(id) => {
        const ledger = coaRecords.find((r) => r.id === Number(id));
        if (ledger) onChange(ledger);
      }}
      placeholder="Select ledger…"
      searchPlaceholder="Search ledgers…"
      disabled={disabled}
      className={cn(DP_TABLE_INPUT_CLASS, "text-left")}
      popoverClassName="min-w-[min(420px,92vw)] w-[max(var(--radix-popover-trigger-width),420px)]"
      renderTriggerLabel={() => {
        if (selectedValue) {
          const opt = options.find((o) => o.value === selectedValue);
          if (opt) return <span className="truncate">{opt.label.split(" · ").pop() ?? opt.label}</span>;
        }
        if (fallbackLabel?.trim()) {
          return <span className="truncate">{fallbackLabel}</span>;
        }
        return <span className="text-muted-foreground">Select ledger…</span>;
      }}
    />
  );
}
