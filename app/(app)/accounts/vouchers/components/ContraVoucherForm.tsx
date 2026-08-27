"use client";

import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";
import { isContraUuid } from "../contra/contra-voucher-utils";
import { ContraVoucherApiForm } from "../contra/ContraVoucherApiForm";

interface ContraVoucherFormProps {
  onDone?: () => void;
  /** Legacy localStorage numeric id OR backend UUID string. */
  voucherId?: number | string;
  readOnly?: boolean;
  onEdit?: () => void;
}

/**
 * Contra entry point.
 * - New / UUID ids → API-backed ContraVoucherApiForm
 * - Legacy numeric ids → existing dual-entry demo form
 */
export function ContraVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: ContraVoucherFormProps) {
  const apiId =
    typeof voucherId === "string" && isContraUuid(voucherId)
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
      <ContraVoucherApiForm
        voucherId={apiId}
        readOnly={readOnly}
        onDone={onDone}
        onEdit={onEdit}
      />
    );
  }

  const cancelHref = legacyNumeric
    ? `/accounts/vouchers/view/${legacyNumeric}`
    : "/accounts/vouchers?tab=contra";

  return (
    <VoucherDualEntryForm
      voucherType="contra"
      cancelHref={cancelHref}
      voucherId={legacyNumeric}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
