"use client";

import type { ReactNode } from "react";
import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
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

/** Journal-style voucher entry (header fields + ledger debit/credit grid). */
export function VoucherEntryClient({
  voucherType,
  onDone,
  voucherId,
  titleOverride,
  readOnly = false,
  cancelHref: cancelHrefProp,
  onEdit,
  showFinancialYear = false,
  strictPostValidation = true,
  ledgerFilter,
  quickAddScope,
  extraHeader,
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
      showFinancialYear={showFinancialYear}
      strictPostValidation={strictPostValidation}
      breadcrumbSection="Transactions"
      ledgerFilter={ledgerFilter}
      quickAddScope={quickAddScope}
      extraHeader={extraHeader}
      entryMode="double"
    />
  );
}
