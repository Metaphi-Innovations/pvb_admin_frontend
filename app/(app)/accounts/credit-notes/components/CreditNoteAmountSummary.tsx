"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";

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

  const Row = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
    <div className={strong ? "cnz-totals__grand" : "cnz-totals__row"}>
      <span>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );

  return (
    <VoucherFormSectionCard title="Amount Summary" compact>
      <div className="cnz-after-table !mt-0 !pt-0 !border-0">
        <div className="cnz-totals">
          <Row label="Taxable / Basic Amount" value={taxable} />
          {showIntra ? <Row label="CGST" value={cgst} /> : null}
          {showIntra ? <Row label="SGST" value={sgst} /> : null}
          {showInter ? <Row label="IGST" value={igst} /> : null}
          {showGst ? <Row label="Total GST" value={gst} /> : null}
          {Math.abs(roundOff) > 0.004 ? <Row label="Round Off" value={roundOff} /> : null}
          <Row label="Credit Note Amount" value={total} strong />
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
