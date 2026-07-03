"use client";

import { formatINR } from "../invoices/invoice-utils";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

export function AdjustmentSummaryCard({
  variant,
  partyLabel,
  partyName,
  docNo,
  linkedNo,
  originalAmount,
  alreadyAdjusted,
  balanceAllowed,
}: {
  variant: "credit" | "debit";
  partyLabel: string;
  partyName: string;
  docNo: string;
  linkedNo?: string;
  originalAmount: number;
  alreadyAdjusted: number;
  balanceAllowed: number;
}) {
  const linkedLabel = variant === "credit" ? "Sales Order No." : "PO No.";
  const docLabel = variant === "credit" ? "Invoice No." : "Purchase Invoice No.";
  const adjustedLabel = variant === "credit" ? "Already Credited" : "Already Debited";
  const balanceLabel = variant === "credit" ? "Balance Credit Allowed" : "Balance Debit Allowed";

  return (
    <div className="rounded-lg border border-brand-200/60 bg-brand-50/30 p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px] text-slate-800">
      <div>
        <p className={ACCOUNTS_FILTER_LABEL_CLASS}>{partyLabel}</p>
        <p className="font-medium mt-0.5">{partyName || "—"}</p>
      </div>
      <div>
        <p className={ACCOUNTS_FILTER_LABEL_CLASS}>{docLabel}</p>
        <p className="font-mono font-medium mt-0.5">{docNo || "—"}</p>
      </div>
      {linkedNo ? (
        <div>
          <p className={ACCOUNTS_FILTER_LABEL_CLASS}>{linkedLabel}</p>
          <p className="font-mono mt-0.5">{linkedNo}</p>
        </div>
      ) : null}
      <div>
        <p className={ACCOUNTS_FILTER_LABEL_CLASS}>Original Amount</p>
        <p className="font-semibold tabular-nums mt-0.5">{formatINR(originalAmount)}</p>
      </div>
      <div>
        <p className={ACCOUNTS_FILTER_LABEL_CLASS}>{adjustedLabel}</p>
        <p className="font-semibold tabular-nums text-amber-800 mt-0.5">{formatINR(alreadyAdjusted)}</p>
      </div>
      <div>
        <p className={ACCOUNTS_FILTER_LABEL_CLASS}>{balanceLabel}</p>
        <p className="font-semibold tabular-nums text-emerald-700 mt-0.5">{formatINR(balanceAllowed)}</p>
      </div>
    </div>
  );
}
