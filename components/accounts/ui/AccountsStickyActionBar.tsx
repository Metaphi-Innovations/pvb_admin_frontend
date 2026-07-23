"use client";

import { VoucherFormActionBar, type VoucherFormActionBarProps } from "@/components/accounts/voucher-form/VoucherFormActionBar";

/**
 * Sticky bottom action bar — Cancel | Save Draft · Save & Post.
 * Same behavior as VoucherFormActionBar; preferred Accounts UI name.
 */
export function AccountsStickyActionBar(props: VoucherFormActionBarProps) {
  return <VoucherFormActionBar {...props} />;
}

export type { VoucherFormActionBarProps as AccountsStickyActionBarProps };
