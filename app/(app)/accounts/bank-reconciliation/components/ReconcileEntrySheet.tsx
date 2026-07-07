"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import {
  getAuditForRow,
  markBookEntryReconciled,
  type ManualReconGridRow,
} from "@/lib/accounts/manual-bank-reconciliation-data";
import { ReconEntryStatusBadge } from "./ReconEntryStatusBadge";
import { cn } from "@/lib/utils";

interface ReconcileEntrySheetProps {
  row: ManualReconGridRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: "reconcile" | "view";
}

export function ReconcileEntrySheet({
  row,
  open,
  onOpenChange,
  onSuccess,
  mode,
}: ReconcileEntrySheetProps) {
  const [bankProcessingDate, setBankProcessingDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isView = mode === "view" || row?.status === "reconciled";
  const audit = row ? getAuditForRow(row.rowKey) : [];

  useEffect(() => {
    if (!row || !open) return;
    setBankProcessingDate(row.bankProcessingDate || "");
    setRemarks(row.remarks);
    setError("");
  }, [row, open]);

  const handleReconcile = () => {
    if (!row) return;
    setBusy(true);
    setError("");
    const result = markBookEntryReconciled({
      rowKey: row.rowKey,
      bankProcessingDate,
      remarks,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess();
    onOpenChange(false);
  };

  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Landmark className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{row.voucherNo}</SheetTitle>
              <SheetDescription>{row.partyName}</SheetDescription>
            </div>
            <ReconEntryStatusBadge status={row.status} />
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoField label="Voucher No." value={row.voucherNo} mono />
            <InfoField label="Voucher Type" value={row.voucherTypeLabel} />
            <InfoField label="Entry Date (Books)" value={row.entryDate} />
            <InfoField label="Party Name" value={row.partyName} className="col-span-2" />
            <InfoField label="Debit Amount" value={formatMoneyOrDash(row.debitAmount)} />
            <InfoField label="Credit Amount" value={formatMoneyOrDash(row.creditAmount)} />
          </div>

          {row.narration && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Narration</p>
              <p className="text-xs text-foreground bg-muted/20 rounded-lg border border-border/60 px-3 py-2">
                {row.narration}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Bank Processing Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={bankProcessingDate}
              min={row.entryDate}
              disabled={isView}
              onChange={(e) => setBankProcessingDate(e.target.value)}
              className={cn(
                "h-9 text-sm rounded-lg border border-border",
                error && "border-red-400",
              )}
            />
            {!isView && (
              <p className="text-xs text-muted-foreground">
                Must be on or after entry date ({row.entryDate})
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks (optional)</Label>
            <Textarea
              rows={2}
              value={remarks}
              disabled={isView}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes for audit trail…"
              className="text-sm rounded-lg"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}

          {row.status === "reconciled" && (
            <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                Reconciliation Info
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <span className="text-muted-foreground">Reconciled By</span>
                  <p className="font-medium">{row.reconciledBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reconciled On</span>
                  <p className="font-medium">{row.reconciledOn?.slice(0, 10)}</p>
                </div>
              </div>
            </div>
          )}

          {audit.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Audit Trail
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {audit.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs"
                  >
                    <p className="font-medium capitalize">{a.action.replace("_", " ")}</p>
                    <p className="text-muted-foreground mt-0.5">
                      Bank date {a.bankProcessingDate} · {a.reconciledBy} · {a.reconciledOn.slice(0, 16).replace("T", " ")}
                    </p>
                    {a.remarks && <p className="mt-0.5">Remarks: {a.remarks}</p>}
                    {a.previousValues?.bankProcessingDate && (
                      <p className="text-muted-foreground mt-0.5">
                        Previous bank date: {a.previousValues.bankProcessingDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => onOpenChange(false)}>
            {isView ? "Close" : "Cancel"}
          </Button>
          {!isView && (
            <Button
              size="sm"
              className="h-9 text-sm font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              disabled={busy || !bankProcessingDate}
              onClick={handleReconcile}
            >
              <Check className="w-4 h-4" />
              Mark as Reconciled
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InfoField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-medium mt-0.5", mono && "font-mono text-brand-700")}>{value}</p>
    </div>
  );
}
