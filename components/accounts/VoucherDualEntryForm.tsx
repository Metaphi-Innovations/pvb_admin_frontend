"use client";

import { StandardVoucherForm } from "@/components/accounts/voucher-form/StandardVoucherForm";

export type DualEntryVoucherType = "receipt" | "payment" | "contra";

interface VoucherDualEntryFormProps {
  voucherType: DualEntryVoucherType;
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
  breadcrumbSection?: string;
}

/** Receipt, payment and contra — shared standard voucher form. */
export function VoucherDualEntryForm(props: VoucherDualEntryFormProps) {
  return <StandardVoucherForm {...props} />;
}
