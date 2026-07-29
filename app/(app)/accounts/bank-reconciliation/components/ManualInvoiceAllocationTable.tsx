"use client";

import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { UnpaidInvoiceOption } from "../bank-reconciliation-data";

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ManualInvoiceAllocationTable({
  invoices,
  allocations,
  transactionAmount,
  errors,
  onAllocationChange,
  onToggleInvoice,
  selectedIds,
}: {
  invoices: UnpaidInvoiceOption[];
  allocations: Record<string, string>;
  transactionAmount: number;
  errors: Record<string, string>;
  onAllocationChange: (invoiceId: string, value: string) => void;
  onToggleInvoice: (invoiceId: string, checked: boolean, balance: number) => void;
  selectedIds: Set<string>;
}) {
  const totalAllocated = invoices.reduce((sum, inv) => {
    const v = Number(allocations[String(inv.id)] || 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-center">
        <p className="text-xs text-muted-foreground">No outstanding invoices for this party.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0 z-[1]">
              <tr className="border-b border-border">
                <th className="w-8 px-2 py-2" aria-label="Select" />
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Invoice No.</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Invoice Date</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Due Date</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Invoice Amt</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Outstanding</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap min-w-[100px]">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const key = String(inv.id);
                const applied = Number(allocations[key] || 0);
                const isSelected = selectedIds.has(key) || applied > 0;
                const rowError = errors[`allocation_${key}`];

                return (
                  <tr
                    key={inv.id}
                    className={cn(
                      "border-b border-border/60",
                      isSelected && "bg-brand-50/40",
                    )}
                  >
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={isSelected}
                        onChange={(e) => onToggleInvoice(key, e.target.checked, inv.balance)}
                      />
                    </td>
                    <td className="px-2 py-1.5 font-mono font-semibold text-brand-700 whitespace-nowrap">
                      {inv.label}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatDisplayDate(inv.invoiceDate)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatDisplayDate(inv.dueDate)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                      {formatMoney(inv.grandTotal)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap">
                      {formatMoney(inv.balance)}
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <AccountsMoneyInput
                        className={cn(
                          "h-8 w-full min-w-[88px] text-xs text-right tabular-nums",
                          rowError && "border-red-400",
                        )}
                        value={allocations[key] ?? ""}
                        onChange={(v) => onAllocationChange(key, String(v))}
                        placeholder="0"
                        disabled={!isSelected}
                      />
                      {rowError ? (
                        <p className="text-[10px] text-red-500 mt-0.5">{rowError}</p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs rounded-lg bg-muted/20 border border-border/60 px-3 py-2">
        <span className="text-muted-foreground">
          Allocated{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatMoney(totalAllocated)}</span>
          {" "}of{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatMoney(transactionAmount)}</span>
        </span>
        {errors.allocations ? (
          <span className="text-red-600 font-medium">{errors.allocations}</span>
        ) : totalAllocated > transactionAmount + 0.01 ? (
          <span className="text-red-600 font-medium">Total exceeds transaction amount</span>
        ) : null}
      </div>
    </div>
  );
}
