"use client";

import { StandardVoucherForm } from "@/components/accounts/voucher-form/StandardVoucherForm";
import { isJournalUuid } from "./journal-voucher-utils";
import { JournalVoucherApiForm } from "./JournalVoucherApiForm";

interface JournalVoucherFormProps {
  onDone?: () => void;
  /** Legacy localStorage numeric id OR backend UUID string. */
  voucherId?: number | string;
  readOnly?: boolean;
  onEdit?: () => void;
}

/**
 * Journal entry point.
 * - New / UUID ids → API-backed JournalVoucherApiForm (one Dr + one Cr)
 * - Legacy numeric ids → existing StandardVoucherForm demo (isolated)
 */
export function JournalVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: JournalVoucherFormProps) {
  const apiId =
    typeof voucherId === "string" && isJournalUuid(voucherId)
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
      <JournalVoucherApiForm
        voucherId={apiId}
        readOnly={readOnly}
        onDone={onDone}
        onEdit={onEdit}
      />
    );
  }

  const cancelHref = legacyNumeric
    ? `/accounts/vouchers/view/${legacyNumeric}`
    : "/accounts/vouchers?tab=journal";

  return (
    <StandardVoucherForm
      voucherType="journal"
      cancelHref={cancelHref}
      voucherId={legacyNumeric}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
