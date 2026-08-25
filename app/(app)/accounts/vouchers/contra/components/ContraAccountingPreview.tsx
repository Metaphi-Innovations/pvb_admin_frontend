"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { ContraFormState } from "../contra-voucher-utils";
import { computeContraPreview } from "../contra-voucher-utils";

export function ContraAccountingPreview({
  form,
  fromWarehouseName,
  toWarehouseName,
  defaultOpen = true,
}: {
  form: ContraFormState;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const preview = computeContraPreview(form, {
    from: fromWarehouseName,
    to: toWarehouseName,
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3.5 py-2 bg-muted/20 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Accounting Impact
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="px-3.5 py-2.5 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Preview only — To Account is Debit, From Account is Credit. Backend
            posting remains authoritative.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Transfer To (Debit)
              </p>
              <p className="font-medium text-foreground mt-0.5">{preview.debitName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Transfer From (Credit)
              </p>
              <p className="font-medium text-foreground mt-0.5">
                {preview.creditName}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Amount
              </p>
              <p className="font-medium tabular-nums text-foreground mt-0.5">
                {preview.amount > 0 ? formatMoney(preview.amount) : "—"}
              </p>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1.5 text-left text-xs font-semibold">Ledger</th>
                <th className="py-1.5 text-right text-xs font-semibold w-[120px]">
                  Debit
                </th>
                <th className="py-1.5 text-right text-xs font-semibold w-[120px]">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-1.5 text-xs font-medium">{preview.debitName}</td>
                <td className="py-1.5 text-xs text-right tabular-nums">
                  {preview.amount > 0 ? formatMoney(preview.amount) : "—"}
                </td>
                <td className="py-1.5 text-xs text-right tabular-nums text-muted-foreground">
                  —
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 text-xs font-medium">{preview.creditName}</td>
                <td className="py-1.5 text-xs text-right tabular-nums text-muted-foreground">
                  —
                </td>
                <td className="py-1.5 text-xs text-right tabular-nums">
                  {preview.amount > 0 ? formatMoney(preview.amount) : "—"}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 text-xs font-semibold">Totals</td>
                <td className="pt-2 text-xs text-right tabular-nums font-semibold">
                  {preview.amount > 0 ? formatMoney(preview.totalDebit) : "—"}
                </td>
                <td className="pt-2 text-xs text-right tabular-nums font-semibold">
                  {preview.amount > 0 ? formatMoney(preview.totalCredit) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
