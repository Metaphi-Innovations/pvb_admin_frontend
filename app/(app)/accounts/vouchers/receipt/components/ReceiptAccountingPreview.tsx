"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { ReceiptFormState } from "../receipt-voucher-utils";
import { computeReceiptPreview, toMoneyNumber } from "../receipt-voucher-utils";

type PreviewLine = { ledger: string; debit: number; credit: number };

export function ReceiptAccountingPreview({
  form,
  partyLedgerName,
  defaultOpen = false,
}: {
  form: ReceiptFormState;
  partyLedgerName?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const preview = computeReceiptPreview(form);

  const lines = useMemo(() => {
    const result: PreviewLine[] = [];
    const bankName = form.cash_bank_ledger_name || "Cash / Bank";
    if (preview.netBank > 0) {
      result.push({ ledger: bankName, debit: preview.netBank, credit: 0 });
    }

    for (const adj of form.adjustments) {
      const amt = toMoneyNumber(adj.amount);
      if (amt <= 0) continue;
      const name =
        adj.adjustment_type === "CUSTOMER_TDS"
          ? "TDS Receivable"
          : adj.adjustment_type === "ROUND_OFF"
            ? "Round Off"
            : adj.ledger_name || adj.adjustment_type;
      const isCredit =
        adj.adjustment_type === "OTHER" || adj.adjustment_type === "ROUND_OFF"
          ? adj.entry_type === "CREDIT"
          : false;
      result.push({
        ledger: name,
        debit: isCredit ? 0 : amt,
        credit: isCredit ? amt : 0,
      });
    }

    const creditName =
      form.party_kind === "OTHER_LEDGER"
        ? form.other_ledger_name || "Other Ledger"
        : partyLedgerName ||
          (form.party_kind === "SUPPLIER_REFUND" ? "Supplier" : "Customer");

    if (preview.gross > 0) {
      result.push({ ledger: creditName, debit: 0, credit: preview.gross });
    }

    return result;
  }, [form, partyLedgerName, preview.gross, preview.netBank]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3.5 py-2 bg-muted/20 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Accounting Preview
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="px-3.5 py-2">
          <p className="text-[11px] text-muted-foreground mb-2">
            Preview only — backend posting remains authoritative.
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1.5 text-left text-xs font-semibold">Ledger</th>
                <th className="py-1.5 text-right text-xs font-semibold w-[120px]">Debit</th>
                <th className="py-1.5 text-right text-xs font-semibold w-[120px]">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={`${line.ledger}-${idx}`} className="border-b border-border/50">
                  <td className="py-1.5 text-xs">{line.ledger}</td>
                  <td className="py-1.5 text-xs text-right tabular-nums">
                    {line.debit > 0 ? formatMoney(line.debit) : "—"}
                  </td>
                  <td className="py-1.5 text-xs text-right tabular-nums">
                    {line.credit > 0 ? formatMoney(line.credit) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
