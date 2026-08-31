"use client";

import {
  TransactionViewHero,
  buildVoucherViewMeta,
  voucherStatusToBadgeKey,
} from "@/components/accounts/voucher-form/TransactionViewHero";
import type { ReceiptVoucherStatus } from "@/types/receipt-voucher.types";
import { RECEIPT_STATUS_LABELS } from "@/types/receipt-voucher.types";

export function ReceiptViewHero({
  draftNo,
  accountingVoucherNo,
  voucherDate,
  branchName,
  modeLabel,
  partyLabel,
  netBank,
  status,
  className,
}: {
  draftNo: string;
  accountingVoucherNo?: string | null;
  voucherDate: string;
  branchName?: string;
  modeLabel?: string;
  partyLabel?: string;
  netBank: number;
  status?: ReceiptVoucherStatus | string | null;
  className?: string;
}) {
  return (
    <TransactionViewHero
      className={className}
      statusKey={voucherStatusToBadgeKey(status)}
      statusLabel={
        status
          ? RECEIPT_STATUS_LABELS[status as ReceiptVoucherStatus] || String(status)
          : "—"
      }
      chips={modeLabel ? [modeLabel] : undefined}
      metaItems={buildVoucherViewMeta({
        draftNo,
        accountingVoucherNo,
        voucherDate,
        branchName,
      })}
      partyLabel={partyLabel}
      amountLabel="Net Cash / Bank"
      amount={netBank}
    />
  );
}
