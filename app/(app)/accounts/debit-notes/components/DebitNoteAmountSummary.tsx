"use client";

/**
 * Debit Note Amount Summary — visual/structure mirror of CreditNoteAmountSummary.
 * Uses DN totals + DN terminology; does not recalculate tax.
 */

import { formatMoney, computeAutomaticRoundOff, roundMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { formatSignedRoundOff } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import { AutoRoundOffDisplay } from "@/components/accounts/voucher-form/AutoRoundOffDisplay";

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
  valueSlot?: React.ReactNode;
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

export function DebitNoteAmountSummary({
  taxable,
  cgst,
  sgst,
  igst,
  gst,
  roundOff: roundOffProp,
  total: totalProp,
  interstate,
  locked = false,
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
}) {
  const showGst = gst > 0.004 || cgst > 0.004 || sgst > 0.004 || igst > 0.004;
  const showIntra = showGst && !interstate && (cgst > 0.004 || sgst > 0.004);
  const showInter = showGst && interstate && igst > 0.004;

  const unrounded = roundMoney(taxable + gst);
  const autoRoundOff = computeAutomaticRoundOff(unrounded);
  const autoTotal = roundMoney(unrounded + autoRoundOff);
  const roundOff = locked ? roundOffProp : autoRoundOff;
  const total = locked ? totalProp : autoTotal;
  const showRoundOff = Math.abs(roundOff) > 0.004 || !locked;

  return (
    <VoucherFormSectionCard title="Amount Summary" className="lg:sticky lg:top-3 lg:z-10">
      <div className="space-y-1.5 so-invoice-summary">
        <SummaryRow label="Taxable / Basic Amount" value={taxable} />
        {showIntra ? <SummaryRow label="Input CGST" value={cgst} /> : null}
        {showIntra ? <SummaryRow label="Input SGST" value={sgst} /> : null}
        {showInter ? <SummaryRow label="Input IGST" value={igst} /> : null}
        {showGst ? <SummaryRow label="Total GST" value={gst} /> : null}
        {showRoundOff ? (
          <SummaryRow
            label="Round Off"
            value={roundOff}
            signed
            valueSlot={
              locked ? undefined : (
                <div className="flex items-center justify-end min-w-[5.5rem]">
                  <AutoRoundOffDisplay value={roundOff} />
                </div>
              )
            }
          />
        ) : null}
        <SummaryRow label="Debit Note Amount" value={total} strong />
      </div>
      {locked ? null : (
        <p className="text-[10px] text-muted-foreground pt-1">
          Round off is calculated automatically. Backend totals are authoritative when saving.
        </p>
      )}
    </VoucherFormSectionCard>
  );
}
