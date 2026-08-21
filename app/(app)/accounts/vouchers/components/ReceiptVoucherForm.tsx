"use client";

import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";
import { isReceiptUuid } from "../receipt/receipt-voucher-utils";
import { ReceiptVoucherApiForm } from "../receipt/ReceiptVoucherApiForm";

interface ReceiptVoucherFormProps {
  onDone?: () => void;
  /** Legacy localStorage numeric id OR backend UUID string. */
  voucherId?: number | string;
  readOnly?: boolean;
  onEdit?: () => void;
}

/**
 * Receipt entry point.
 * - New / UUID ids → API-backed ReceiptVoucherApiForm
 * - Legacy numeric ids → existing dual-entry demo form (Payment/Contra untouched)
 */
export function ReceiptVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: ReceiptVoucherFormProps) {
  const apiId =
    typeof voucherId === "string" && isReceiptUuid(voucherId)
      ? voucherId
      : undefined;
  const legacyNumeric =
    typeof voucherId === "number"
      ? voucherId
      : typeof voucherId === "string" && /^\d+$/.test(voucherId)
        ? Number(voucherId)
        : undefined;

  if (apiId || voucherId == null || voucherId === "") {
    return (
      <ReceiptVoucherApiForm
        voucherId={apiId}
        readOnly={readOnly}
        onDone={onDone}
        onEdit={onEdit}
      />
    );
  }

  const cancelHref = legacyNumeric
    ? `/accounts/vouchers/view/${legacyNumeric}`
    : "/accounts/vouchers?tab=receipt";

  return (
    <VoucherDualEntryForm
      voucherType="receipt"
      cancelHref={cancelHref}
      voucherId={legacyNumeric}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
