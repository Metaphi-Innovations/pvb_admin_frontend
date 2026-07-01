"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-2 border-b border-border/40 last:border-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );
}

export function LedgerTransactionViewSheet({
  row,
  open,
  onClose,
}: {
  row: CoaTransactionRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  const voucherHref = row.viewHref ?? (row.voucherId ? `/accounts/vouchers/view/${row.voucherId}` : null);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="truncate">{row.voucherNo}</SheetTitle>
          <SheetDescription>
            {row.voucherType} · {row.date}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-1">
          <DetailRow label="Reference No." value={row.referenceNo} />
          <DetailRow
            label="Particulars / Narration"
            value={<span className="whitespace-pre-wrap break-words">{row.narration}</span>}
          />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <DetailRow
              label="Debit (₹)"
              value={
                row.debit ? (
                  <MoneyAmount amount={row.debit} className="text-sm font-semibold" />
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              label="Credit (₹)"
              value={
                row.credit ? (
                  <MoneyAmount amount={row.credit} className="text-sm font-semibold" />
                ) : (
                  "—"
                )
              }
            />
          </div>
          <DetailRow
            label="Running Balance"
            value={
              <MoneyAmount
                amount={row.runningBalance}
                side={row.runningBalanceType}
                sideBadge
                className="text-sm font-semibold"
              />
            }
          />
          {voucherHref && (
            <Link
              href={voucherHref}
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-brand-700 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {row.viewLabel ? `Open ${row.viewLabel}` : "Open Voucher"}
            </Link>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
