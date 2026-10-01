"use client";

import { cn } from "@/lib/utils";
import {
  SALES_INVOICE_TAB_META,
  SALES_INVOICE_VISIBLE_TABS,
  type SalesInvoiceTabId,
} from "./sales-invoice-tab-data";

export function SalesInvoicesTabs({
  value,
  onChange,
  counts,
}: {
  value: SalesInvoiceTabId;
  onChange: (tab: SalesInvoiceTabId) => void;
  counts: Partial<Record<SalesInvoiceTabId, number | null>>;
}) {
  return (
    <div className="flex items-end gap-0 border-b border-border overflow-x-auto">
      {SALES_INVOICE_VISIBLE_TABS.map((tab) => {
        const active = value === tab;
        const count = counts[tab];
        const label = SALES_INVOICE_TAB_META[tab].label;
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
