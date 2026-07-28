"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import { getOpenBillsForVendor } from "@/lib/accounts/payables-data";
import { getOpenInvoicesForCustomer } from "@/lib/accounts/receivables-data";
import { resolveAutoPartyFromLedger } from "@/lib/accounts/voucher-ledger-groups";
import { getCustomerById, getVendorById } from "@/lib/accounts/transaction-master-fetch";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export interface VoucherDocAllocation {
  documentId: number;
  documentNo: string;
  amount: number;
}

interface VoucherDocumentAllocationPanelProps {
  mode: "receipt" | "payment";
  partyLedger: ChartOfAccount | null;
  coaRecords: ChartOfAccount[];
  readOnly?: boolean;
  selected: Record<number, boolean>;
  amounts: Record<number, string>;
  onSelectedChange: (next: Record<number, boolean>) => void;
  onAmountsChange: (next: Record<number, string>) => void;
  onApplyTotalToLedger?: (total: number) => void;
  className?: string;
}

function formatDocDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

export function VoucherDocumentAllocationPanel({
  mode,
  partyLedger,
  coaRecords,
  readOnly = false,
  selected,
  amounts,
  onSelectedChange,
  onAmountsChange,
  onApplyTotalToLedger,
  className,
}: VoucherDocumentAllocationPanelProps) {
  const partyRef = useMemo(() => {
    if (!partyLedger) return null;
    const auto = resolveAutoPartyFromLedger(partyLedger, coaRecords);
    if (!auto.contactId) return null;
    if (mode === "receipt") {
      const customer = getCustomerById(auto.contactId);
      if (!customer) return null;
      return { contactId: auto.contactId, contactName: customer.customerName, kind: "customer" as const };
    }
    const vendor = getVendorById(auto.contactId);
    if (!vendor) return null;
    return { contactId: auto.contactId, contactName: vendor.vendorName, kind: "vendor" as const };
  }, [partyLedger, coaRecords, mode]);

  const documents = useMemo(() => {
    if (!partyRef) return [];
    if (partyRef.kind === "customer") {
      return getOpenInvoicesForCustomer(partyRef.contactId).map((inv) => ({
        id: inv.invoiceId,
        no: inv.invoiceNo,
        date: inv.invoiceDate,
        outstanding: inv.outstanding,
        href: `/accounts/invoices/${inv.invoiceId}`,
        label: "Sales Invoice",
      }));
    }
    return getOpenBillsForVendor(partyRef.contactId).map((bill) => ({
      id: bill.billId,
      no: bill.billNo,
      date: bill.billDate,
      outstanding: bill.outstanding,
      href: `/accounts/purchase-invoices/${bill.billId}`,
      label: "Purchase Invoice",
    }));
  }, [partyRef]);

  const allocationTotal = useMemo(
    () =>
      documents.reduce((sum, doc) => {
        if (!selected[doc.id]) return sum;
        return sum + (Number(amounts[doc.id]) || 0);
      }, 0),
    [documents, selected, amounts],
  );

  if (!partyLedger) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-muted/10 px-3 py-4", className)}>
        <p className="text-xs text-muted-foreground">
          Select an account / ledger to view open invoices or bills for allocation.
        </p>
      </div>
    );
  }

  if (!partyRef) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-muted/10 px-3 py-4", className)}>
        <p className="text-xs text-muted-foreground">
          This ledger is not linked to a customer or supplier. Invoice allocation is available for
          receivable / payable party ledgers only.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("border border-border/60 rounded-lg overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-b border-border/60">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Against {mode === "receipt" ? "Sales Invoice" : "Purchase Invoice"}
          </p>
          <p className="text-[11px] text-muted-foreground">{partyRef.contactName}</p>
        </div>
        {allocationTotal > 0 && onApplyTotalToLedger && !readOnly && (
          <button
            type="button"
            className="text-[11px] text-brand-600 hover:underline shrink-0"
            onClick={() => onApplyTotalToLedger(allocationTotal)}
          >
            Apply {formatMoney(allocationTotal)} to ledger amount
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">
          No open {mode === "receipt" ? "sales invoices" : "purchase invoices"} for this party.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[520px]">
            <thead className="border-b border-border/60 bg-muted/10">
              <tr>
                {!readOnly && <th className="w-8 px-2 py-2" />}
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Document</th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-24">Date</th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-28">Outstanding</th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-32">Allocate</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const isSelected = Boolean(selected[doc.id]);
                return (
                  <tr key={doc.id} className="border-b border-border/40 hover:bg-muted/5">
                    {!readOnly && (
                      <td className="px-2 py-1.5 align-middle">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            onSelectedChange({ ...selected, [doc.id]: Boolean(checked) });
                            if (checked && !amounts[doc.id]) {
                              onAmountsChange({
                                ...amounts,
                                [doc.id]: String(doc.outstanding),
                              });
                            }
                          }}
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-brand-700 font-semibold truncate">{doc.no}</span>
                        <Link
                          href={doc.href}
                          className="text-muted-foreground hover:text-brand-600 shrink-0"
                          title={`View ${doc.label}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{formatDocDate(doc.date)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(doc.outstanding)}</td>
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        <span className="block text-right tabular-nums">
                          {isSelected ? formatMoney(Number(amounts[doc.id]) || 0) : "—"}
                        </span>
                      ) : (
                        <AccountsMoneyInput
                          compact
                          className="h-8 text-xs w-full max-w-[120px] ml-auto"
                          value={Number(amounts[doc.id]) || 0}
                          onChange={(v) => onAmountsChange({ ...amounts, [doc.id]: String(v) })}
                          disabled={!isSelected}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {allocationTotal > 0 && (
              <tfoot>
                <tr className="bg-muted/10">
                  <td colSpan={readOnly ? 4 : 5} className="px-3 py-2 text-right text-xs font-semibold">
                    Selected allocation: {formatMoney(allocationTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

export function buildDocAllocationsFromState(
  selected: Record<number, boolean>,
  amounts: Record<number, string>,
): VoucherDocAllocation[] {
  return Object.entries(selected)
    .filter(([id, on]) => on && (Number(amounts[Number(id)]) || 0) > 0)
    .map(([id]) => ({
      documentId: Number(id),
      documentNo: "",
      amount: Number(amounts[Number(id)]) || 0,
    }));
}
