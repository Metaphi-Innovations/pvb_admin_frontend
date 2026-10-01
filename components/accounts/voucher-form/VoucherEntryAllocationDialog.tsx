"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherEntryAllocation } from "@/lib/accounts/voucher-form-model";
import { useOpenVoucherDocuments } from "@/components/accounts/VoucherInlineDocumentSelect";

interface VoucherEntryAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "receipt" | "payment";
  partyLedger: ChartOfAccount | null;
  coaRecords: ChartOfAccount[];
  entryAmount: number;
  allocations: VoucherEntryAllocation[];
  onSave: (allocations: VoucherEntryAllocation[], total: number) => void;
}

function formatDocDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function VoucherEntryAllocationDialog({
  open,
  onOpenChange,
  mode,
  partyLedger,
  coaRecords,
  entryAmount,
  allocations,
  onSave,
}: VoucherEntryAllocationDialogProps) {
  const documents = useOpenVoucherDocuments(mode, partyLedger, coaRecords);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const docLabel = mode === "payment" ? "Purchase Invoice" : "Invoice";
  const docLabelPlural = mode === "payment" ? "purchase invoices" : "sales invoices";

  useEffect(() => {
    if (!open) return;
    const sel: Record<number, boolean> = {};
    const amt: Record<number, string> = {};
    for (const a of allocations) {
      if (a.documentId) {
        sel[a.documentId] = true;
        amt[a.documentId] = String(a.allocatedAmount);
      }
    }
    setSelected(sel);
    setAmounts(amt);
  }, [open, allocations]);

  const total = useMemo(
    () =>
      roundMoney(
        documents.reduce((s, doc) => {
          if (!selected[doc.id]) return s;
          return s + (Number(amounts[doc.id]) || 0);
        }, 0),
      ),
    [documents, selected, amounts],
  );

  const docType = mode === "payment" ? "bill" : "invoice";

  const handleSave = () => {
    const next: VoucherEntryAllocation[] = documents
      .filter((doc) => selected[doc.id] && (Number(amounts[doc.id]) || 0) > 0)
      .map((doc) => ({
        documentType: docType,
        documentId: doc.id,
        documentNumber: doc.no,
        outstandingAmount: doc.outstanding,
        allocatedAmount: roundMoney(Number(amounts[doc.id]) || 0),
      }));
    onSave(next, total);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{docLabel} Allocation</DialogTitle>
          <DialogDescription className="text-xs">
            Allocate across multiple open {docLabelPlural}. Total must equal the entry amount (
            {formatMoney(entryAmount)}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border border-border rounded-lg">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="border-b border-border bg-muted/20 sticky top-0 z-10">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">
                  {docLabel} No.
                </th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-24">
                  Date
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-28">
                  Original Amount
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-28">
                  Outstanding
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-32">
                  Allocation
                </th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-28">
                  Remaining
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const isOn = Boolean(selected[doc.id]);
                const allocAmt = Number(amounts[doc.id]) || 0;
                const over = allocAmt > doc.outstanding + 0.009;
                const remaining = roundMoney(Math.max(0, doc.outstanding - allocAmt));
                return (
                  <tr key={doc.id} className="border-b border-border/40">
                    <td className="px-2 py-1.5">
                      <Checkbox
                        checked={isOn}
                        onCheckedChange={(c) => {
                          const on = Boolean(c);
                          setSelected((prev) => ({ ...prev, [doc.id]: on }));
                          if (on && !amounts[doc.id]) {
                            setAmounts((prev) => ({ ...prev, [doc.id]: String(doc.outstanding) }));
                          }
                        }}
                      />
                    </td>
                    <td className="px-2 py-1.5 font-mono text-brand-700 font-semibold">{doc.no}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{formatDocDate(doc.documentDate)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(doc.originalAmount)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(doc.outstanding)}</td>
                    <td className="px-2 py-1.5">
                      <AccountsMoneyInput
                        compact
                        className="h-8 text-xs w-full max-w-[120px] ml-auto"
                        value={allocAmt}
                        onChange={(v) => setAmounts((prev) => ({ ...prev, [doc.id]: String(v) }))}
                        disabled={!isOn}
                      />
                      {over && (
                        <p className="text-[10px] text-red-600 text-right mt-0.5">Exceeds outstanding</p>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {isOn ? formatMoney(remaining) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {documents.length === 0 && (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">No open documents.</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Selected total:{" "}
            <span
              className={
                Math.abs(total - roundMoney(entryAmount)) < 0.009
                  ? "font-semibold text-foreground"
                  : "font-semibold text-amber-700"
              }
            >
              {formatMoney(total)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleSave}
              disabled={
                total <= 0 ||
                documents.some(
                  (d) =>
                    selected[d.id] && (Number(amounts[d.id]) || 0) > d.outstanding + 0.009,
                )
              }
            >
              Apply Allocation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
