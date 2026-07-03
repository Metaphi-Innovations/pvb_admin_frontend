"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  FileText,
  Download,
  Printer,
  Paperclip,
} from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { cn } from "@/lib/utils";
import {
  formatDetailMoney,
  formatTransactionStatus,
  resolveTransactionDetail,
  type TransactionDetail,
  type TransactionDetailRef,
} from "@/lib/accounts/transaction-detail-data";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-foreground text-right font-medium">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const cfg =
    normalized.includes("post") || normalized.includes("paid") || normalized.includes("approv")
      ? { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" }
      : normalized.includes("pending") || normalized.includes("unpaid") || normalized.includes("draft")
        ? { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" }
        : normalized.includes("reject") || normalized.includes("cancel")
          ? { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" }
          : { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {formatTransactionStatus(status)}
    </span>
  );
}

export function TransactionDetailsDrawer({
  detail,
  open,
  onClose,
}: {
  detail: TransactionDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!detail) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[min(40vw,560px)] w-full">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-mono text-brand-700 truncate">{detail.voucherNumber}</SheetTitle>
              <SheetDescription className="truncate">
                {detail.voucherType} · {detail.voucherDate}
              </SheetDescription>
            </div>
            <StatusPill status={detail.status} />
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div>
            <SectionHeading label="Basic Information" />
            <InfoRow label="Voucher Number" value={<span className="font-mono text-brand-700">{detail.voucherNumber}</span>} />
            <InfoRow label="Voucher Type" value={detail.voucherType} />
            <InfoRow label="Voucher Date" value={detail.voucherDate} />
            <InfoRow label="Posting Date" value={detail.postingDate} />
            <InfoRow label="Status" value={<StatusPill status={detail.status} />} />
          </div>

          {(detail.partyName || detail.gstin || detail.pan) && (
            <div>
              <SectionHeading label="Party Information" />
              <InfoRow label="Party Name" value={detail.partyName} />
              <InfoRow label="Party Type" value={detail.partyType} />
              <InfoRow label="GSTIN" value={detail.gstin} />
              <InfoRow label="PAN" value={detail.pan} />
            </div>
          )}

          <div>
            <SectionHeading label="Accounting Information" />
            <InfoRow label="Debit Ledger" value={detail.debitLedger} />
            <InfoRow label="Credit Ledger" value={detail.creditLedger} />
            <InfoRow label="Expense Head" value={detail.expenseHead} />
            <InfoRow label="Bank / Cash Ledger" value={detail.bankCashLedger} />
            <InfoRow label="TDS Section" value={detail.tdsSection} />
            <InfoRow label="TDS %" value={detail.tdsPercent} />
            <InfoRow label="TDS Amount" value={detail.tdsAmount != null ? formatDetailMoney(detail.tdsAmount) : undefined} />
            <InfoRow label="GST Details" value={detail.gstDetails} />
            <InfoRow label="Reference Number" value={detail.referenceNumber} />
          </div>

          {detail.ledgerLines && detail.ledgerLines.length > 0 && (
            <div>
              <SectionHeading label="Ledger Lines" />
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-2.5 py-2 text-left font-semibold">Ledger</th>
                      <th className="px-2.5 py-2 text-right font-semibold">Dr</th>
                      <th className="px-2.5 py-2 text-right font-semibold">Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.ledgerLines.map((line, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="px-2.5 py-2">{line.ledgerName}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {line.debit > 0 ? <MoneyAmount amount={line.debit} className="text-xs justify-end" /> : "—"}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {line.credit > 0 ? <MoneyAmount amount={line.credit} className="text-xs justify-end" /> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <SectionHeading label="Financial Details" />
            <InfoRow label="Taxable Amount" value={formatDetailMoney(detail.taxableAmount)} />
            <InfoRow label="GST Amount" value={formatDetailMoney(detail.gstAmount)} />
            <InfoRow label="Discount" value={formatDetailMoney(detail.discount)} />
            <InfoRow label="Net Amount" value={formatDetailMoney(detail.netAmount)} />
            <InfoRow
              label="Total Amount"
              value={<MoneyAmount amount={detail.totalAmount} className="text-xs font-semibold" />}
            />
            {(detail.debit != null || detail.credit != null) && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <InfoRow
                  label="Debit"
                  value={detail.debit ? <MoneyAmount amount={detail.debit} className="text-xs" /> : "—"}
                />
                <InfoRow
                  label="Credit"
                  value={detail.credit ? <MoneyAmount amount={detail.credit} className="text-xs" /> : "—"}
                />
              </div>
            )}
          </div>

          {detail.narration && (
            <div>
              <SectionHeading label="Narration" />
              <p className="text-xs text-foreground whitespace-pre-wrap break-words bg-muted/20 rounded-lg p-3 border border-border/50">
                {detail.narration}
              </p>
            </div>
          )}

          {(detail.createdBy || detail.approvedBy || detail.approvalStatus) && (
            <div>
              <SectionHeading label="Approval Information" />
              <InfoRow label="Created By" value={detail.createdBy} />
              <InfoRow label="Approved By" value={detail.approvedBy} />
              <InfoRow label="Approval Date" value={detail.approvalDate} />
              <InfoRow label="Approval Status" value={detail.approvalStatus ? formatTransactionStatus(detail.approvalStatus) : undefined} />
            </div>
          )}

          {detail.attachments.length > 0 && (
            <div>
              <SectionHeading label="Attachments" />
              <div className="space-y-2">
                {detail.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{att.fileName}</p>
                    </div>
                    {att.dataUrl && (
                      <a
                        href={att.dataUrl}
                        download={att.fileName}
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter className="flex-row gap-2 justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href={detail.sourceHref} onClick={onClose}>
              <ExternalLink className="w-3.5 h-3.5" />
              Open Original Voucher
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function useTransactionDetailsDrawer() {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [open, setOpen] = useState(false);

  const openTransaction = useCallback((ref: TransactionDetailRef) => {
    const resolved = resolveTransactionDetail(ref);
    if (!resolved) return;
    setDetail(resolved);
    setOpen(true);
  }, []);

  const closeTransaction = useCallback(() => {
    setOpen(false);
    setDetail(null);
  }, []);

  return {
    detail,
    open,
    openTransaction,
    closeTransaction,
    drawer: (
      <TransactionDetailsDrawer detail={detail} open={open} onClose={closeTransaction} />
    ),
  };
}
