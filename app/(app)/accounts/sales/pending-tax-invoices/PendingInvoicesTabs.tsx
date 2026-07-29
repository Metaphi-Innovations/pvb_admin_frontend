"use client";

import { cn } from "@/lib/utils";
import {
  PENDING_INVOICE_TAB_META,
  type PendingInvoiceTabId,
} from "./pending-invoice-tab-data";

const TABS: PendingInvoiceTabId[] = ["sales_order", "stock_transfer", "sample_order"];

export function PendingInvoicesTabs({
  value,
  onChange,
  counts,
}: {
  value: PendingInvoiceTabId;
  onChange: (tab: PendingInvoiceTabId) => void;
  counts: Record<PendingInvoiceTabId, number | null>;
}) {
  return (
    <div className="flex items-end gap-0 border-b border-border overflow-x-auto">
      {TABS.map((tab) => {
        const active = value === tab;
        const count = counts[tab];
        const label = PENDING_INVOICE_TAB_META[tab].label;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "relative px-3 py-1.5 text-xs transition-colors whitespace-nowrap",
              "border-b-2 -mb-px",
              active
                ? "border-brand-600 bg-brand-50 text-brand-700 font-bold"
                : "border-transparent bg-transparent text-muted-foreground font-medium hover:text-foreground hover:bg-muted/30",
            )}
          >
            {label}
            {count != null ? (
              <span className={cn("ml-1 tabular-nums", active ? "text-brand-600" : "text-muted-foreground")}>
                ({count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
