"use client";

import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";
import { isPaymentUuid } from "../payment/payment-voucher-utils";
import { PaymentVoucherApiForm } from "../payment/PaymentVoucherApiForm";

interface PaymentVoucherFormProps {
  onDone?: () => void;
  /** Legacy localStorage numeric id OR backend UUID string. */
  voucherId?: number | string;
  readOnly?: boolean;
  onEdit?: () => void;
}

/**
 * Payment entry point.
 * - New / UUID ids → API-backed PaymentVoucherApiForm
 * - Legacy numeric ids → existing dual-entry demo form (Receipt/Contra untouched)
 */
export function PaymentVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: PaymentVoucherFormProps) {
  const apiId =
    typeof voucherId === "string" && isPaymentUuid(voucherId)
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
      <PaymentVoucherApiForm
        voucherId={apiId}
        readOnly={readOnly}
        onDone={onDone}
        onEdit={onEdit}
      />
    );
  }

  const cancelHref = legacyNumeric
    ? `/accounts/vouchers/view/${legacyNumeric}`
    : "/accounts/vouchers?tab=payment";

  return (
    <VoucherDualEntryForm
      voucherType="payment"
      cancelHref={cancelHref}
      voucherId={legacyNumeric}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
