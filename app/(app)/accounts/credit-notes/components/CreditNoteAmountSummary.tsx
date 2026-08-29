"use client";

import type { ReactNode } from "react";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { formatSignedRoundOff } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";

function SummaryRow({
  label,
  value,
  strong,
  signed,
  valueSlot,
}: {
  label: string;
  value: number;
  strong?: boolean;
  signed?: boolean;
  valueSlot?: ReactNode;
}) {
  return (
    <div
      className={
        strong
          ? "flex items-center justify-between gap-4 py-1.5 border-t border-border/60"
          : "flex items-center justify-between gap-4 py-0.5"
      }
    >
      <span className={strong ? "so-grand-total-label" : "so-summary-label"}>{label}</span>
      {valueSlot ?? (
        <span className={strong ? "so-grand-total-value tabular-nums" : "so-summary-value tabular-nums"}>
          {signed ? formatSignedRoundOff(value) : formatMoney(value)}
        </span>
      )}
    </div>
  );
}

export function CreditNoteAmountSummary({
  taxable,
  cgst,
  sgst,
  igst,
  gst,
  roundOff,
  total,
  interstate,
  locked = false,
  roundOffSlot,
}: {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  gst: number;
  roundOff: number;
  total: number;
  interstate: boolean;
  locked?: boolean;
  /** Editable Round Off control (same pattern as Debit Note). */
  roundOffSlot?: ReactNode;
}) {
  const showGst = gst > 0.004 || cgst > 0.004 || sgst > 0.004 || igst > 0.004;
  const showIntra = showGst && !interstate && (cgst > 0.004 || sgst > 0.004);
  const showInter = showGst && interstate && igst > 0.004;
  const showRoundOff = Boolean(roundOffSlot) || Math.abs(roundOff) > 0.004 || !locked;

  return (
    <VoucherFormSectionCard title="Amount Summary" className="lg:sticky lg:top-3 lg:z-10">
      <div className="space-y-1.5 so-invoice-summary">
          <SummaryRow label="Taxable / Basic Amount" value={taxable} />
          {showIntra ? <SummaryRow label="CGST" value={cgst} /> : null}
          {showIntra ? <SummaryRow label="SGST" value={sgst} /> : null}
          {showInter ? <SummaryRow label="IGST" value={igst} /> : null}
          {showGst ? <SummaryRow label="Total GST" value={gst} /> : null}
          {showRoundOff ? (
            <SummaryRow
              label="Round Off"
              value={roundOff}
              signed
              valueSlot={
                roundOffSlot && !locked ? (
                  <div className="flex items-center justify-end min-w-[5.5rem]">{roundOffSlot}</div>
                ) : undefined
              }
            />
          ) : null}
          <SummaryRow label="Credit Note Amount" value={total} strong />
        </div>
      {locked ? null : (
        <p className="text-[10px] text-muted-foreground pt-1">
          Preview only. Backend totals are authoritative when saving.
        </p>
      )}
    </VoucherFormSectionCard>
  );
}
