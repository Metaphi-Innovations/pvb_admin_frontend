"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { formatSignedRoundOff } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";

export interface VoucherGstSummaryCardProps {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff?: number;
  grandTotal: number;
  className?: string;
  /** When false, card is hidden. */
  visible?: boolean;
  title?: string;
  taxableLabel?: string;
  /** When false, CGST / SGST / IGST rows are hidden (GST off). */
  showTaxRows?: boolean;
  /** Optional editable Round Off control (replaces static Round Off value). */
  roundOffSlot?: React.ReactNode;
  /**
   * When true, render the summary block only (no outer section card).
   * Used when Amount Summary sits inside Particulars (Credit/Debit Note).
   */
  embedded?: boolean;
}

function Row({
  label,
  value,
  emphasize,
  valueSlot,
  signed,
}: {
  label: string;
  value?: number;
  emphasize?: boolean;
  valueSlot?: React.ReactNode;
  /** When true, preserve sign (Round Off). Default money formatter uses abs. */
  signed?: boolean;
}) {
  return (
    <div
      className={cn(
        "cdn-amount-summary__row flex items-center justify-between gap-4 text-[12px] font-normal",
        emphasize && "pt-1.5 mt-0.5 border-t border-border",
      )}
    >
      <span className={emphasize ? "cdn-grand-total text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      {valueSlot ?? (
        <span
          className={cn(
            "tabular-nums text-right",
            emphasize ? "cdn-grand-total" : "font-normal text-foreground",
          )}
        >
          {signed ? formatSignedRoundOff(value ?? 0) : formatMoney(value ?? 0)}
        </span>
      )}
    </div>
  );
}

function SummaryBody({
  taxableAmount,
  cgstAmount,
  sgstAmount,
  igstAmount,
  roundOff,
  grandTotal,
  taxableLabel,
  showTaxRows,
  roundOffSlot,
}: {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  taxableLabel: string;
  showTaxRows: boolean;
  roundOffSlot?: React.ReactNode;
}) {
  return (
    <div className="cdn-amount-summary max-w-[340px] ml-auto space-y-0.5">
      <Row label={taxableLabel} value={taxableAmount} />
      {showTaxRows ? (
        <>
          <Row label="CGST" value={cgstAmount} />
          <Row label="SGST" value={sgstAmount} />
          <Row label="IGST" value={igstAmount} />
        </>
      ) : null}
      <Row
        label="Round Off"
        value={roundOff}
        signed
        valueSlot={
          roundOffSlot ? (
            <div className="flex items-center justify-end min-w-[5.5rem]">{roundOffSlot}</div>
          ) : undefined
        }
      />
      <Row label="Grand Total" value={grandTotal} emphasize />
    </div>
  );
}

/**
 * Amount / GST summary for Credit / Debit notes.
 * Tax rows are optional; Round Off can be an editable slot.
 */
export function VoucherGstSummaryCard({
  taxableAmount,
  cgstAmount,
  sgstAmount,
  igstAmount,
  roundOff = 0,
  grandTotal,
  className,
  visible = true,
  title = "Amount Summary",
  taxableLabel = "Sub Total",
  showTaxRows = true,
  roundOffSlot,
  embedded = false,
}: VoucherGstSummaryCardProps) {
  if (!visible) return null;

  const body = (
    <SummaryBody
      taxableAmount={taxableAmount}
      cgstAmount={cgstAmount}
      sgstAmount={sgstAmount}
      igstAmount={igstAmount}
      roundOff={roundOff}
      grandTotal={grandTotal}
      taxableLabel={taxableLabel}
      showTaxRows={showTaxRows}
      roundOffSlot={roundOffSlot}
    />
  );

  if (embedded) {
    return (
      <div className={cn("border-t border-border/60 px-3 py-2", className)}>
        <p className="cdn-subsection-title mb-1.5">{title}</p>
        {body}
      </div>
    );
  }

  return (
    <VoucherFormSectionCard title={title} className={className} compact>
      {body}
    </VoucherFormSectionCard>
  );
}
