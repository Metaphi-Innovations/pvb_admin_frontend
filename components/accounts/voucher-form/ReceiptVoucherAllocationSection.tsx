"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import {
  applyReceiptAllocation,
  getOpenInvoicesForCustomer,
  getReceiptAllocationByVoucherId,
  type CustomerInvoiceOutstandingRow,
} from "@/lib/accounts/receivables-data";
import { resolveAutoPartyFromLedger } from "@/lib/accounts/voucher-ledger-groups";
import { getCustomerById } from "@/lib/accounts/transaction-master-fetch";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherEntryAllocation } from "@/lib/accounts/voucher-form-model";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import { cn } from "@/lib/utils";

function formatDocDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

export interface ReceiptVoucherAllocationSectionProps {
  partyLedger: ChartOfAccount | null;
  coaRecords: ChartOfAccount[];
  receiptAmount: number;
  allocations: VoucherEntryAllocation[];
  onAllocationsChange: (allocations: VoucherEntryAllocation[]) => void;
  /** Form fields locked (view mode) — still allow post-posted adjust when enabled. */
  readOnly?: boolean;
  /** Posted / approved receipt with remaining On Account balance. */
  allowPostedAdjust?: boolean;
  voucherId?: number;
  onPostedAdjustSaved?: () => void;
  className?: string;
}

/**
 * Inline invoice allocation for Receipt Voucher.
 * Shown automatically after a customer ledger is selected.
 * Allocations flow into the credit entry and are applied on post via existing posting path.
 */
export function ReceiptVoucherAllocationSection({
  partyLedger,
  coaRecords,
  receiptAmount,
  allocations,
  onAllocationsChange,
  readOnly = false,
  allowPostedAdjust = false,
  voucherId,
  onPostedAdjustSaved,
  className,
}: ReceiptVoucherAllocationSectionProps) {
  const [adjusting, setAdjusting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const customer = useMemo(() => {
    if (!partyLedger) return null;
    const auto = resolveAutoPartyFromLedger(partyLedger, coaRecords);
    if (!auto.contactId) return null;
    const c = getCustomerById(auto.contactId);
    if (!c) return null;
    return { id: c.id, name: c.customerName };
  }, [partyLedger, coaRecords]);

  const openInvoices = useMemo((): CustomerInvoiceOutstandingRow[] => {
    if (!customer) return [];
    const open = getOpenInvoicesForCustomer(customer.id);
    const byId = new Map(open.map((inv) => [inv.invoiceId, inv]));

    // Keep invoices already allocated on this receipt visible for adjust / edit.
    for (const a of allocations) {
      if (!a.documentId || byId.has(a.documentId)) continue;
      byId.set(a.documentId, {
        invoiceId: a.documentId,
        invoiceNo: a.documentNumber || `INV-${a.documentId}`,
        invoiceDate: "",
        dueDate: "",
        taxableValue: 0,
        gstAmount: 0,
        invoiceAmount: a.outstandingAmount || a.allocatedAmount,
        paidAmount: 0,
        creditNote: 0,
        outstanding: a.outstandingAmount || a.allocatedAmount,
        daysOverdue: 0,
        status: "unpaid",
        ageingBucket: "",
      });
    }
    return Array.from(byId.values());
  }, [customer, allocations]);

  const selected = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (const a of allocations) {
      if (a.documentId) map[a.documentId] = true;
    }
    return map;
  }, [allocations]);

  const amounts = useMemo(() => {
    const map: Record<number, string> = {};
    for (const a of allocations) {
      if (a.documentId) map[a.documentId] = String(a.allocatedAmount);
    }
    return map;
  }, [allocations]);

  const allocatedTotal = useMemo(
    () => roundMoney(allocations.reduce((s, a) => s + (a.allocatedAmount || 0), 0)),
    [allocations],
  );
  const remaining = roundMoney(Math.max(0, receiptAmount - allocatedTotal));

  const editable = !readOnly || adjusting;

  useEffect(() => {
    if (!allowPostedAdjust) setAdjusting(false);
  }, [allowPostedAdjust, voucherId]);

  if (!partyLedger) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-muted/10 px-3 py-4", className)}>
        <p className="text-xs text-muted-foreground">
          Select a customer ledger to allocate this receipt against outstanding invoices.
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-muted/10 px-3 py-4", className)}>
        <p className="text-xs text-muted-foreground">
          Invoice allocation is available when the credit account is a customer (Sundry Debtor) ledger.
        </p>
      </div>
    );
  }

  const syncFromState = (nextSelected: Record<number, boolean>, nextAmounts: Record<number, string>) => {
    const next: VoucherEntryAllocation[] = openInvoices
      .filter((inv) => nextSelected[inv.invoiceId] && (Number(nextAmounts[inv.invoiceId]) || 0) > 0)
      .map((inv) => ({
        documentType: "invoice" as const,
        documentId: inv.invoiceId,
        documentNumber: inv.invoiceNo,
        outstandingAmount: inv.outstanding,
        allocatedAmount: roundMoney(Number(nextAmounts[inv.invoiceId]) || 0),
      }));
    onAllocationsChange(next);
  };

  const handleSavePostedAdjust = () => {
    if (voucherId == null) return;
    setSaving(true);
    setSaveError(null);
    const lines = allocations
      .filter((a) => a.documentId && a.allocatedAmount > 0)
      .map((a) => ({ invoiceId: a.documentId!, amount: roundMoney(a.allocatedAmount) }));
    const err = applyReceiptAllocation(voucherId, lines);
    setSaving(false);
    if (err) {
      setSaveError(err);
      return;
    }
    setAdjusting(false);
    onPostedAdjustSaved?.();
  };

  return (
    <div className={cn("border border-border/60 rounded-lg overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 bg-muted/20 border-b border-border/60">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Outstanding Invoices</p>
          <p className="text-[11px] text-muted-foreground truncate">{customer.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] tabular-nums">
          <span>
            Receipt Amount:{" "}
            <strong className="text-foreground">{formatMoney(receiptAmount)}</strong>
          </span>
          <span>
            Allocated: <strong className="text-foreground">{formatMoney(allocatedTotal)}</strong>
          </span>
          <span>
            Remaining Receipt Balance:{" "}
            <strong className={remaining > 0.009 ? "text-amber-700" : "text-foreground"}>
              {formatMoney(remaining)}
            </strong>
          </span>
        </div>
      </div>

      {allowPostedAdjust && readOnly && !adjusting && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-amber-50/60">
          <p className="text-[11px] text-amber-900">
            This receipt has an On Account / unallocated balance. You can adjust invoice allocations
            without re-posting the voucher.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "px-2.5 shrink-0 border-amber-300")}
            onClick={() => {
              // Prefill from stored allocation when opening adjust mode
              if (voucherId != null) {
                const record = getReceiptAllocationByVoucherId(voucherId);
                if (record?.lines.length) {
                  const open = getOpenInvoicesForCustomer(customer.id);
                  const openMap = new Map(open.map((i) => [i.invoiceId, i]));
                  onAllocationsChange(
                    record.lines.map((l) => ({
                      documentType: "invoice" as const,
                      documentId: l.invoiceId,
                      documentNumber:
                        openMap.get(l.invoiceId)?.invoiceNo ?? `INV-${l.invoiceId}`,
                      outstandingAmount:
                        (openMap.get(l.invoiceId)?.outstanding ?? 0) + l.amount,
                      allocatedAmount: l.amount,
                    })),
                  );
                }
              }
              setAdjusting(true);
              setSaveError(null);
            }}
          >
            Adjust Allocation
          </Button>
        </div>
      )}

      {openInvoices.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">
          No open sales invoices for this customer.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="border-b border-border/60 bg-muted/10">
              <tr>
                {editable && <th className="w-8 px-2 py-2" />}
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">
                  Invoice
                </th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-24">
                  Date
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-28">
                  Invoice Amount
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-28">
                  Outstanding Amount
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-32">
                  Allocate Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {openInvoices.map((inv) => {
                const isSelected = Boolean(selected[inv.invoiceId]);
                return (
                  <tr key={inv.invoiceId} className="border-b border-border/40 hover:bg-muted/5">
                    {editable && (
                      <td className="px-2 py-1.5 align-middle">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const nextSel = { ...selected, [inv.invoiceId]: Boolean(checked) };
                            const nextAmt = { ...amounts };
                            if (checked && !nextAmt[inv.invoiceId]) {
                              const cap = Math.min(
                                inv.outstanding,
                                remaining + (Number(amounts[inv.invoiceId]) || 0),
                              );
                              nextAmt[inv.invoiceId] = String(roundMoney(cap));
                            }
                            syncFromState(nextSel, nextAmt);
                          }}
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-brand-700 font-semibold truncate">
                          {inv.invoiceNo}
                        </span>
                        <Link
                          href={`/accounts/invoices/${inv.invoiceId}`}
                          className="text-muted-foreground hover:text-brand-600 shrink-0"
                          title="View Sales Invoice"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {inv.invoiceDate ? formatDocDate(inv.invoiceDate) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatMoney(inv.invoiceAmount)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                      {formatMoney(inv.outstanding)}
                    </td>
                    <td className="px-2 py-1.5">
                      {editable ? (
                        <AccountsMoneyInput
                          compact
                          className="h-8 text-xs w-full max-w-[120px] ml-auto"
                          value={Number(amounts[inv.invoiceId]) || 0}
                          onChange={(v) => {
                            syncFromState(
                              { ...selected, [inv.invoiceId]: true },
                              { ...amounts, [inv.invoiceId]: String(v) },
                            );
                          }}
                          disabled={!isSelected}
                        />
                      ) : (
                        <span className="block text-right tabular-nums">
                          {isSelected ? formatMoney(Number(amounts[inv.invoiceId]) || 0) : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/10">
                <td
                  colSpan={editable ? 6 : 5}
                  className="px-3 py-2 text-right text-xs"
                >
                  <span className="text-muted-foreground mr-3">
                    Remaining Receipt Balance:{" "}
                    <strong className="text-foreground">{formatMoney(remaining)}</strong>
                  </span>
                  <span className="font-semibold">
                    Total Allocated: {formatMoney(allocatedTotal)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {adjusting && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border/60 bg-muted/10">
          {saveError && <p className="text-xs text-red-600 mr-auto">{saveError}</p>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "px-2.5")}
            disabled={saving}
            onClick={() => {
              setAdjusting(false);
              setSaveError(null);
              onPostedAdjustSaved?.();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "px-2.5 bg-brand-600 hover:bg-brand-700 text-white")}
            disabled={saving}
            onClick={handleSavePostedAdjust}
          >
            Save Allocation
          </Button>
        </div>
      )}
    </div>
  );
}

/** Hydrate credit-entry allocations from the receipt allocation store. */
export function hydrateReceiptEntryAllocations(
  voucherId: number,
  customerId: number | null,
): VoucherEntryAllocation[] {
  const record = getReceiptAllocationByVoucherId(voucherId);
  if (!record?.lines.length) return [];
  const open =
    customerId != null ? getOpenInvoicesForCustomer(customerId) : [];
  const openMap = new Map(open.map((i) => [i.invoiceId, i]));
  return record.lines.map((l) => ({
    documentType: "invoice" as const,
    documentId: l.invoiceId,
    documentNumber: openMap.get(l.invoiceId)?.invoiceNo ?? `INV-${l.invoiceId}`,
    outstandingAmount: (openMap.get(l.invoiceId)?.outstanding ?? 0) + l.amount,
    allocatedAmount: l.amount,
  }));
}
