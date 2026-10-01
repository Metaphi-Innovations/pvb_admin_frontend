"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import {
  listPendingDispatchesForCustomer,
  type PendingDispatchInvoiceRow,
} from "@/lib/accounts/dispatch-invoice-bridge";
import { formatMoney } from "@/lib/accounts/money-format";

function formatDispatchDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function formatPendingDispatchLabel(row: PendingDispatchInvoiceRow): string {
  const qtyLabel = `${row.totalQty} ${row.qtyUnit}`;
  return `${row.dispatchNo} | ${row.soNumber} | ${formatDispatchDate(row.dispatchDate)} | ${row.warehouse} | ${qtyLabel} | ${formatMoney(row.invoiceValue)}`;
}

export interface SalesInvoiceDispatchSelectProps {
  customerId: string;
  value: string;
  onChange: (dispatchId: string, row: PendingDispatchInvoiceRow | null) => void;
  disabled?: boolean;
}

export function SalesInvoiceDispatchSelect({
  customerId,
  value,
  onChange,
  disabled,
}: SalesInvoiceDispatchSelectProps) {
  const pendingRows = useMemo(
    () => (customerId ? listPendingDispatchesForCustomer(Number(customerId)) : []),
    [customerId],
  );

  const options = useMemo(
    () => [
      { value: "", label: "Manual invoice (no dispatch)" },
      ...pendingRows.map((row) => ({
        value: row.dispatchId,
        label: formatPendingDispatchLabel(row),
      })),
    ],
    [pendingRows],
  );

  const handleChange = (dispatchId: string) => {
    if (!dispatchId) {
      onChange("", null);
      return;
    }
    const row = pendingRows.find((r) => r.dispatchId === dispatchId) ?? null;
    onChange(dispatchId, row);
  };

  if (!customerId) return null;

  if (pendingRows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">
          No pending dispatch found for this customer. You can create a manual invoice.
        </p>
      </div>
    );
  }

  return (
    <SearchableSelect
      label="Dispatch / Sales Order"
      options={options}
      value={value}
      onChange={handleChange}
      placeholder="Select dispatch to invoice…"
      disabled={disabled}
    />
  );
}
