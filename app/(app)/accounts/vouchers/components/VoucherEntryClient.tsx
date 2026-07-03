"use client";

import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import { voucherTypeToUrl } from "../voucher-routes";
import type { VoucherTypeCode } from "../../masters/masters-data";

interface VoucherEntryClientProps {
  voucherType: VoucherTypeCode;
  onDone?: () => void;
  voucherId?: number;
  titleOverride?: string;
  readOnly?: boolean;
  cancelHref?: string;
  onEdit?: () => void;
}

export function VoucherEntryClient({
  voucherType,
  onDone,
  voucherId,
  titleOverride,
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
    <ZohoVoucherEntryForm
      voucherType={voucherType}
      cancelHref={cancelHref}
      voucherId={voucherId}
      titleOverride={titleOverride}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
      showFinancialYear={voucherType === "journal"}
      breadcrumbSection="Transactions"
    />
  );
}
