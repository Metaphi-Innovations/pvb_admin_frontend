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
  defaultOpen = true,
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
            : adj.adjustment_type === "DISCOUNT_ALLOWED"
              ? adj.ledger_name || "Discount Allowed"
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
  const difference =
    Math.round((totalDebit - totalCredit) * 100) / 100;
  const balanced = Math.abs(difference) < 0.01;

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
          Receipt Accounting
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
        <div className={cn("px-3.5 py-2.5 space-y-2", vibrant && "bg-white")}>
          <p
            className={cn(
              "text-[11px]",
              vibrant ? "text-brand-800/70" : "text-muted-foreground",
            )}
          >
            Preview only — backend posting remains authoritative.
          </p>

          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Enter settlement details to preview accounting impact.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lines.map((line, idx) => (
                <li
                  key={`${line.ledger}-${idx}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5",
                    line.debit > 0 ? "bg-emerald-50/70" : "bg-brand-50/50",
                  )}
                >
                  <span className="text-xs font-medium text-navy-900 truncate">
                    {line.ledger}
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums font-bold flex-shrink-0",
                      line.debit > 0 ? "text-emerald-800" : "text-brand-800",
                    )}
                  >
                    {line.debit > 0
                      ? `Dr ${formatMoney(line.debit)}`
                      : `Cr ${formatMoney(line.credit)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
            <div className="rounded-lg bg-muted/30 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Total Debit
              </p>
              <p className="text-xs tabular-nums font-bold text-emerald-800 mt-0.5">
                {formatMoney(totalDebit)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Total Credit
              </p>
              <p className="text-xs tabular-nums font-bold text-brand-800 mt-0.5">
                {formatMoney(totalCredit)}
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg px-2 py-1.5",
                balanced ? "bg-emerald-50" : "bg-amber-50",
              )}
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Difference
              </p>
              <p
                className={cn(
                  "text-xs tabular-nums font-bold mt-0.5",
                  balanced ? "text-emerald-800" : "text-amber-800",
                )}
              >
                {formatMoney(difference)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
