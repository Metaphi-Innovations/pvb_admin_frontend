"use client";

/**
 * Debit Note Amount Summary — visual/structure mirror of CreditNoteAmountSummary.
 * Uses DN totals + DN terminology; does not recalculate tax.
 */

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
    <div className={strong ? "cnz-totals__grand" : "cnz-totals__row"}>
      <span>{label}</span>
      {valueSlot ?? (
        <span>{signed ? formatSignedRoundOff(value) : formatMoney(value)}</span>
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
  /** Editable Round Off control (same pattern as Credit Note). */
  roundOffSlot?: ReactNode;
}) {
  // Same visibility rules as CreditNoteAmountSummary
  const showGst = gst > 0.004 || cgst > 0.004 || sgst > 0.004 || igst > 0.004;
  const showIntra = showGst && !interstate && (cgst > 0.004 || sgst > 0.004);
  const showInter = showGst && interstate && igst > 0.004;
  const showRoundOff = Boolean(roundOffSlot) || Math.abs(roundOff) > 0.004 || !locked;

  return (
    <VoucherFormSectionCard title="Amount Summary" compact>
      <div className="cnz-after-table !mt-0 !pt-0 !border-0">
        <div className="cnz-totals">
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
                roundOffSlot && !locked ? (
                  <div className="flex items-center justify-end min-w-[5.5rem]">{roundOffSlot}</div>
                ) : undefined
              }
            />
          ) : null}
          <SummaryRow label="Debit Note Amount" value={total} strong />
        </div>
      </div>
      {locked ? null : (
        <p className="text-[10px] text-muted-foreground px-1 pb-1">
          Preview only. Backend totals are authoritative when saving.
        </p>
      )}
    </VoucherFormSectionCard>
  );
}
