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
  vibrant = false,
}: {
  form: ReceiptFormState;
  partyLedgerName?: string;
  defaultOpen?: boolean;
  vibrant?: boolean;
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

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        vibrant ? "border-brand-200 shadow-sm" : "border-border",
      )}
    >
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2 text-left",
          vibrant
            ? "bg-gradient-to-r from-[#FFF4E8] to-[#FFE8CC]"
            : "bg-muted/20",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            vibrant ? "text-[#9A3412]" : "text-muted-foreground",
          )}
        >
          Accounting Preview
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            vibrant ? "text-brand-700" : "text-muted-foreground",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className={cn("px-3.5 py-2", vibrant && "bg-white")}>
          <p
            className={cn(
              "text-[11px] mb-2",
              vibrant ? "text-brand-800/70" : "text-muted-foreground",
            )}
          >
            Preview only — backend posting remains authoritative.
          </p>
          <table className="w-full">
            <thead>
              <tr
                className={cn(
                  "border-b",
                  vibrant ? "border-brand-100 bg-brand-50/40" : "border-border",
                )}
              >
                <th className="py-1.5 px-1 text-left text-xs font-semibold text-navy-800">
                  Ledger
                </th>
                <th className="py-1.5 px-1 text-right text-xs font-semibold text-navy-800 w-[120px]">
                  Debit
                </th>
                <th className="py-1.5 px-1 text-right text-xs font-semibold text-navy-800 w-[120px]">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr
                  key={`${line.ledger}-${idx}`}
                  className={cn(
                    "border-b",
                    vibrant ? "border-brand-50" : "border-border/50",
                    vibrant && idx % 2 === 1 && "bg-[#FFFBF6]",
                  )}
                >
                  <td className="py-1.5 px-1 text-xs font-medium text-navy-900">
                    {line.ledger}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 px-1 text-xs text-right tabular-nums",
                      line.debit > 0 && vibrant && "text-emerald-700 font-semibold",
                    )}
                  >
                    {line.debit > 0 ? formatMoney(line.debit) : "—"}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 px-1 text-xs text-right tabular-nums",
                      line.credit > 0 && vibrant && "text-brand-700 font-semibold",
                    )}
                  >
                    {line.credit > 0 ? formatMoney(line.credit) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {vibrant && lines.length > 0 ? (
              <tfoot>
                <tr className="border-t border-brand-200 bg-brand-50/60">
                  <td className="py-1.5 px-1 text-xs font-semibold text-navy-900">Total</td>
                  <td className="py-1.5 px-1 text-xs text-right tabular-nums font-bold text-emerald-800">
                    {formatMoney(totalDebit)}
                  </td>
                  <td className="py-1.5 px-1 text-xs text-right tabular-nums font-bold text-brand-800">
                    {formatMoney(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      ) : null}
    </div>
  );
}
