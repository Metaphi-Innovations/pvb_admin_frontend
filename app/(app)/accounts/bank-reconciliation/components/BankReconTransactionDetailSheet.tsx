"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Check,
  Clock,
  FileText,
  Link2,
  Paperclip,
  User,
} from "lucide-react";
import type { BankReconActivityEvent, BankReconTransaction } from "../bank-reconciliation-v2-data";
import {
  BankReconMatchStatusBadge,
  BankReconSourceBadge,
  BankReconVerificationStatusBadge,
} from "./BankReconBadges";

const TIMELINE_ICON: Record<BankReconActivityEvent["tone"], { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-500" },
  slate: { bg: "bg-slate-100", border: "border-slate-200", icon: "text-slate-500" },
  purple: { bg: "bg-purple-50", border: "border-purple-100", icon: "text-purple-500" },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-xs text-foreground text-right font-medium min-w-0">{value}</span>
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

interface BankReconTransactionDetailSheetProps {
  transaction: BankReconTransaction | null;
  open: boolean;
  onClose: () => void;
}

export function BankReconTransactionDetailSheet({
  transaction,
  open,
  onClose,
}: BankReconTransactionDetailSheetProps) {
  if (!transaction) return null;

  const amount = transaction.deposit || transaction.withdrawal;
  const amountLabel = transaction.deposit > 0 ? "Deposit" : "Withdrawal";
  const isManual = transaction.source === "Manual" || transaction.source === "Manual + Statement";
  const displayRef =
    transaction.reference || transaction.utrNumber || transaction.chequeNo || "No reference";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[480px]">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base truncate">Transaction Details</SheetTitle>
              <SheetDescription className="line-clamp-2 mt-0.5">
                {displayRef} · {transaction.bookDate || transaction.statementDate || "—"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {isManual && transaction.manualTransactionNumber ? (
            <div className="bg-brand-50/60 rounded-lg border border-brand-100 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-700">Manual Transaction</p>
              <p className="font-mono text-xs font-semibold text-brand-700 mt-0.5">
                {transaction.manualTransactionNumber}
              </p>
            </div>
          ) : null}

          <div>
            <SectionHeading label="Transaction Details" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3 py-1">
              <DetailRow label="Source" value={<BankReconSourceBadge source={transaction.source} />} />
              {transaction.manualEntryStatus ? (
                <DetailRow label="Manual Entry Status" value={transaction.manualEntryStatus} />
              ) : null}
              {transaction.transactionMode ? (
                <DetailRow label="Transaction Mode" value={transaction.transactionMode} />
              ) : null}
              <DetailRow label="Book Date" value={transaction.bookDate ?? "—"} />
              <DetailRow label="Transaction Date" value={transaction.transactionDate ?? "—"} />
              <DetailRow label="Expected Clearing Date" value={transaction.expectedClearingDate ?? "—"} />
              <DetailRow label="Statement Date" value={transaction.statementDate || "—"} />
              <DetailRow label="Value Date" value={transaction.valueDate || "—"} />
              <DetailRow label="Reconciliation Date" value={transaction.reconciliationDate ?? "—"} />
              <DetailRow label="Reference Number" value={transaction.reference || "—"} />
              {transaction.utrNumber ? <DetailRow label="UTR Number" value={transaction.utrNumber} /> : null}
              <DetailRow label="Cheque Number" value={transaction.chequeNo ?? "—"} />
              {transaction.referenceStatus ? (
                <DetailRow label="Reference Status" value={transaction.referenceStatus} />
              ) : null}
              <DetailRow
                label={amountLabel}
                value={
                  <span className={transaction.deposit > 0 ? "text-emerald-700" : "text-red-700"}>
                    {formatMoneyOrDash(amount)}
                  </span>
                }
              />
              <DetailRow
                label="Narration"
                value={<span className="font-normal text-left block">{transaction.narration}</span>}
              />
              {transaction.bankNarration ? (
                <DetailRow label="Bank Narration" value={transaction.bankNarration} />
              ) : null}
              {transaction.importedNarration ? (
                <DetailRow label="Imported Narration" value={transaction.importedNarration} />
              ) : null}
              <DetailRow label="Party / Ledger" value={transaction.partyLedger} />
              {transaction.partyType ? <DetailRow label="Party Type" value={transaction.partyType} /> : null}
              {transaction.expectedVoucherType ? (
                <DetailRow label="Expected Voucher Type" value={transaction.expectedVoucherType} />
              ) : null}
              <DetailRow label="Match Status" value={<BankReconMatchStatusBadge status={transaction.matchStatus} />} />
              <DetailRow
                label="Verification Status"
                value={<BankReconVerificationStatusBadge status={transaction.verificationStatus} />}
              />
            </div>
          </div>

          {transaction.internalRemarks || transaction.followUpNote ? (
            <div>
              <SectionHeading label="Remarks" />
              <div className="bg-muted/20 rounded-xl border border-border/50 px-3 py-1">
                {transaction.internalRemarks ? (
                  <DetailRow label="Internal Remarks" value={transaction.internalRemarks} />
                ) : null}
                {transaction.followUpNote ? (
                  <DetailRow label="Follow-up Note" value={transaction.followUpNote} />
                ) : null}
              </div>
            </div>
          ) : null}

          {transaction.attachments && transaction.attachments.length > 0 ? (
            <div>
              <SectionHeading label="Attachments" />
              <ul className="space-y-1.5">
                {transaction.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg px-2.5 py-1.5 border border-border/60"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{a.fileName}</span>
                    <span className="text-[10px] text-muted-foreground">{a.category}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(transaction.createdBy || transaction.updatedBy) && (
            <div>
              <SectionHeading label="Audit" />
              <div className="bg-muted/20 rounded-xl border border-border/50 px-3 py-1">
                {transaction.createdBy ? (
                  <DetailRow label="Created By" value={transaction.createdBy} />
                ) : null}
                {transaction.createdOn ? (
                  <DetailRow
                    label="Created On"
                    value={new Date(transaction.createdOn).toLocaleString("en-IN")}
                  />
                ) : null}
                {transaction.updatedBy ? (
                  <DetailRow label="Last Updated By" value={transaction.updatedBy} />
                ) : null}
                {transaction.updatedOn ? (
                  <DetailRow
                    label="Last Updated On"
                    value={new Date(transaction.updatedOn).toLocaleString("en-IN")}
                  />
                ) : null}
                {transaction.cancelReason ? (
                  <DetailRow label="Cancel Reason" value={transaction.cancelReason} />
                ) : null}
              </div>
            </div>
          )}

          <div>
            <SectionHeading label="Related Record" />
            {transaction.relatedRecord ? (
              <div className="bg-muted/20 rounded-xl border border-border/50 px-3 py-1">
                <DetailRow label="Voucher Type" value={transaction.relatedRecord.voucherType} />
                <DetailRow
                  label="Voucher Number"
                  value={
                    <span className="font-mono text-brand-700">{transaction.relatedRecord.voucherNumber}</span>
                  }
                />
                <DetailRow label="Customer" value={transaction.relatedRecord.customer} />
                <DetailRow label="Invoice Reference" value={transaction.relatedRecord.invoiceReference} />
                <DetailRow label="Match Confidence" value={transaction.relatedRecord.matchConfidence} />
                {transaction.relatedRecord.matchMethod ? (
                  <DetailRow label="Match Method" value={transaction.relatedRecord.matchMethod} />
                ) : null}
                {transaction.relatedRecord.matchedBy ? (
                  <DetailRow label="Matched By" value={transaction.relatedRecord.matchedBy} />
                ) : null}
                {transaction.relatedRecord.matchedOn ? (
                  <DetailRow
                    label="Matched On"
                    value={new Date(transaction.relatedRecord.matchedOn).toLocaleString("en-IN")}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-1">
                No related voucher linked yet. Use Categorize or Auto Match to link this transaction.
              </p>
            )}
          </div>

          <div>
            <SectionHeading label="Activity Timeline" />
            <div className="space-y-0">
              {transaction.activity.map((event, idx) => {
                const tone = TIMELINE_ICON[event.tone];
                const isLast = idx === transaction.activity.length - 1;
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0",
                          tone.bg,
                          tone.border,
                        )}
                      >
                        {event.tone === "emerald" ? (
                          <Check className={cn("w-3.5 h-3.5", tone.icon)} />
                        ) : event.tone === "purple" ? (
                          <User className={cn("w-3.5 h-3.5", tone.icon)} />
                        ) : event.tone === "amber" ? (
                          <Link2 className={cn("w-3.5 h-3.5", tone.icon)} />
                        ) : (
                          <Clock className={cn("w-3.5 h-3.5", tone.icon)} />
                        )}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border/60 my-1 min-h-[12px]" />}
                    </div>
                    <div className={cn("pb-3 min-w-0 flex-1", isLast && "pb-0")}>
                      <p className="text-xs font-semibold text-foreground">{event.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{event.detail}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{event.actor}</span>
                        <Calendar className="w-3 h-3 ml-1" />
                        <span>{event.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
