"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  buildAccountingEntryPreview,
  FUND_TRANSFER_MODE_LABELS,
  getFundTransferById,
} from "@/lib/accounts/fund-transfer-data";
import { cn } from "@/lib/utils";

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

export default function FundTransferDetailClient({ transferId }: { transferId: number }) {
  const router = useRouter();
  const transfer = useMemo(() => getFundTransferById(transferId), [transferId]);

  const accountingLines = useMemo(
    () => (transfer ? buildAccountingEntryPreview(transfer) : []),
    [transfer],
  );

  if (!transfer) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Fund Transfer", "/accounts/banking/fund-transfer")}
        title="Transfer not found"
        description="This fund transfer may have been removed."
      >
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Link href="/accounts/banking/fund-transfer" className="text-brand-600 hover:underline">
            Back to Fund Transfer
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Fund Transfer", "/accounts/banking/fund-transfer")}
      title={transfer.transferNo}
      description={`${transfer.fromAccountName} → ${transfer.toAccountName}`}
      actions={
        <button
          type="button"
          onClick={() => router.push("/accounts/banking/fund-transfer")}
          className="h-8 px-3 text-xs border border-border rounded-lg hover:bg-muted/40 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
      }
      layout="standard"
    >
      <div className="max-w-3xl space-y-4">
        <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Transfer Details</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">View only — completed transfers cannot be edited.</p>
            </div>
            <StatusBadge status={transfer.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Transfer Date" value={transfer.transferDate} />
            <DetailField label="Transfer No." value={<span className="font-mono font-semibold text-brand-700">{transfer.transferNo}</span>} />
            <DetailField label="From Account" value={transfer.fromAccountName} />
            <DetailField label="To Account" value={transfer.toAccountName} />
            <DetailField label="Amount" value={<span className={cn(MONEY_AMOUNT_CLASS, "font-semibold")}>{formatMoney(transfer.amount)}</span>} />
            <DetailField label="Mode" value={FUND_TRANSFER_MODE_LABELS[transfer.transferMode]} />
            <DetailField label="Reference No." value={transfer.referenceNo || "—"} />
            <DetailField label="Narration" value={transfer.narration || "—"} />
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Attachment</p>
            {transfer.attachmentName ? (
              <div className="flex items-center gap-2 text-xs bg-muted/20 border border-border rounded-lg px-3 py-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 truncate font-medium">{transfer.attachmentName}</span>
                {transfer.attachmentDataUrl && (
                  <a
                    href={transfer.attachmentDataUrl}
                    download={transfer.attachmentName}
                    className="p-1 hover:bg-muted rounded"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-brand-600" />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No attachment uploaded.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <p className="text-sm font-semibold text-foreground">Accounting Entry Preview</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Contra voucher posted to General Ledger, Bank Book and Cash Book.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-left font-semibold">Ledger</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Debit (₹)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {accountingLines.map((line) => (
                  <tr key={line.ledgerName} className="border-b border-border/60">
                    <td className="px-4 py-2">{line.ledgerName}</td>
                    <td className={cn("px-4 py-2 text-right tabular-nums", line.debit > 0 && "font-medium")}>
                      {line.debit > 0 ? formatMoney(line.debit) : "—"}
                    </td>
                    <td className={cn("px-4 py-2 text-right tabular-nums", line.credit > 0 && "font-medium")}>
                      {line.credit > 0 ? formatMoney(line.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20 border-t border-border font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(transfer.amount)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(transfer.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px]">
          <div>
            <span className="text-muted-foreground">Created By</span>
            <p className="font-medium">{transfer.createdBy}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created Date</span>
            <p className="font-medium">{transfer.createdDate}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Updated By</span>
            <p className="font-medium">{transfer.updatedBy}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Updated Date</span>
            <p className="font-medium">{transfer.updatedDate}</p>
          </div>
        </div>
      </div>
    </AccountsPageShell>
  );
}
