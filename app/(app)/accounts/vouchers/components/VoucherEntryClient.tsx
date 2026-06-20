"use client";

import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import { voucherTypeToUrl } from "../voucher-routes";
import type { VoucherTypeCode } from "../../masters/masters-data";

interface VoucherEntryClientProps {
  voucherType: VoucherTypeCode;
  onDone?: () => void;
}

export function VoucherEntryClient({ voucherType, onDone }: VoucherEntryClientProps) {
  return (
    <ZohoVoucherEntryForm
      voucherType={voucherType}
      cancelHref={`/accounts/vouchers?tab=${voucherTypeToUrl(voucherType)}`}
      onDone={() => onDone?.()}
      showFinancialYear={voucherType === "journal"}
      breadcrumbSection="Transactions"
    />
  );
}
