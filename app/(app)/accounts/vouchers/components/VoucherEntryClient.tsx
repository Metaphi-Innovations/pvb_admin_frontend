"use client";

import type { ReactNode } from "react";
import { StandardVoucherForm } from "@/components/accounts/voucher-form/StandardVoucherForm";
import { voucherTypeToUrl } from "../voucher-routes";
import type { ChartOfAccount } from "../../data";
import type { VoucherTypeCode } from "../../masters/masters-data";
import type { VoucherLedgerScope } from "@/lib/accounts/voucher-quick-add-ledger";

interface VoucherEntryClientProps {
  voucherType: VoucherTypeCode;
  onDone?: () => void;
  voucherId?: number;
  titleOverride?: string;
  readOnly?: boolean;
  cancelHref?: string;
  onEdit?: () => void;
  showFinancialYear?: boolean;
  strictPostValidation?: boolean;
  ledgerFilter?: (ledger: ChartOfAccount) => boolean;
  quickAddScope?: VoucherLedgerScope;
  extraHeader?: ReactNode;
}

/** Journal-style voucher entry using the shared standard form. */
export function VoucherEntryClient({
  voucherType,
  onDone,
  voucherId,
  readOnly = false,
  cancelHref: cancelHrefProp,
  onEdit,
}: VoucherEntryClientProps) {
  const cancelHref =
    cancelHrefProp ??
    (voucherId
      ? `/accounts/vouchers/view/${voucherId}`
      : `/accounts/vouchers?tab=${voucherTypeToUrl(voucherType)}`);

  return (
    <StandardVoucherForm
      voucherType={voucherType}
      cancelHref={cancelHref}
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
