"use client";

import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import { computeInvoiceTaxBreakup } from "@/lib/accounts/bank-recon-matching";
import type { UnpaidInvoiceOption } from "../bank-reconciliation-data";

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function InvoiceAllocationPanel({
  title,
  invoices,
  allocations,
  transactionAmount,
  amountLabel,
  onAllocationChange,
  onPayInFull,
  onClearAll,
  onSelectInvoice,
}: {
  title: string;
  invoices: UnpaidInvoiceOption[];
  allocations: Record<string, string>;
  transactionAmount: number;
  amountLabel: string;
  onAllocationChange: (invoiceId: string, value: string) => void;
  onPayInFull: (invoiceId: string, balance: number) => void;
  onClearAll: () => void;
  onSelectInvoice?: (invoiceId: string) => void;
}) {
  const totalAllocated = invoices.reduce((sum, inv) => {
    const v = Number(allocations[String(inv.id)] || 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  const bankUnaccounted = Math.max(0, transactionAmount - totalAllocated);

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
        <p className="text-xs text-muted-foreground">No outstanding invoices found for this party.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <button
          type="button"
          className="text-[10px] text-brand-600 hover:underline"
          onClick={onClearAll}
        >
          Clear Applied Amount
        </button>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {invoices.map((inv) => {
          const key = String(inv.id);
          const applied = Number(allocations[key] || 0);
          const breakup = computeInvoiceTaxBreakup(
            applied,
            inv.balance,
            inv.grandTotal,
            inv.taxableAmount,
            inv.taxAmount,
          );
          const isSelected = applied > 0;

          return (
            <div
              key={inv.id}
              className={`rounded-lg border p-3 space-y-2 transition-colors ${
                isSelected ? "border-brand-300 bg-brand-50/30" : "border-border/60 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelectInvoice?.(key)}
                >
                  <p className="text-xs font-semibold text-foreground">{inv.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Invoice Date {formatDisplayDate(inv.invoiceDate)}
                  </p>
                </button>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <AccountsMoneyInput
                    className="h-8 w-28 text-xs text-right tabular-nums"
                    value={allocations[key] ?? ""}
                    onChange={(v) => onAllocationChange(key, String(v))}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    className="text-[10px] text-brand-600 hover:underline whitespace-nowrap"
                    onClick={() =>
                      onPayInFull(key, Math.min(inv.balance, transactionAmount))
                    }
                  >
                    Apply {formatMoney(Math.min(inv.balance, transactionAmount))}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] rounded-md bg-muted/20 p-2">
                <span className="text-muted-foreground">Taxable value</span>
                <span className="text-right tabular-nums">{formatMoney(inv.taxableAmount)}</span>
                <span className="text-muted-foreground">GST / Tax</span>
                <span className="text-right tabular-nums">{formatMoney(inv.taxAmount)}</span>
                <span className="text-muted-foreground">Invoice gross</span>
                <span className="text-right tabular-nums font-medium">{formatMoney(inv.grandTotal)}</span>
                <span className="text-muted-foreground">Outstanding</span>
                <span className="text-right tabular-nums font-semibold text-brand-700">
                  {formatMoney(inv.balance)}
                </span>
              </div>

              {applied > 0 && (
                <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-2 space-y-0.5">
                  <p>
                    Applied breakup: Taxable {formatMoney(breakup.taxableApplied)} · GST{" "}
                    {formatMoney(breakup.taxApplied)}
                  </p>
                  {applied < inv.balance - 0.01 && (
                    <p className="text-amber-700">
                      Remaining on invoice: {formatMoney(inv.balance - applied)} — map via
                      adjustments (TDS, discount, etc.)
                    </p>
                  )}
                </div>
              )}

              {applied > inv.balance + 0.01 && (
                <p className="text-[10px] text-red-600">
                  Exceeds outstanding ({formatMoney(inv.balance)})
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border/60 bg-slate-50/80 p-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground uppercase text-[10px] font-semibold">
            Cash applied (INR)
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(totalAllocated)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">{amountLabel}</span>
          <span className="font-medium tabular-nums">{formatMoney(transactionAmount)}</span>
        </div>
        {bankUnaccounted > 0.01 && (
          <div className="flex justify-between gap-2 pt-1 border-t border-border/40">
            <span className="text-amber-700 font-medium">Unaccounted bank amount</span>
            <span className="font-semibold tabular-nums text-amber-700">
              {formatMoney(bankUnaccounted)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function buildAllocationSummary(
  invoices: UnpaidInvoiceOption[],
  allocations: Record<string, string>,
): { label: string; recordId: number | null; remarks: string } {
  const parts: string[] = [];
  let primaryId: number | null = null;
  let primaryLabel = "";

  for (const inv of invoices) {
    const amt = Number(allocations[String(inv.id)] || 0);
    if (amt <= 0) continue;
    const breakup = computeInvoiceTaxBreakup(
      amt,
      inv.balance,
      inv.grandTotal,
      inv.taxableAmount,
      inv.taxAmount,
    );
    parts.push(
      `${inv.label}:${amt}(Taxable ${breakup.taxableApplied}, GST ${breakup.taxApplied})`,
    );
    if (!primaryId) {
      primaryId = inv.id;
      primaryLabel = inv.label;
    }
  }

  return {
    label: primaryLabel || parts.map((p) => p.split(":")[0]).join(", "),
    recordId: primaryId,
    remarks: parts.length ? `Alloc: ${parts.join("; ")}` : "",
  };
}
