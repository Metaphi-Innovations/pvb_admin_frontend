"use client";

import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { useConsumeVoucherFormToast } from "@/lib/accounts/use-consume-voucher-form-toast";

export function VoucherFormToastHost({ ready = true }: { ready?: boolean }) {
  const { toast, showToast, dismissToast } = useAccountsToast();
  useConsumeVoucherFormToast(showToast, ready);
  return <AccountsToast toast={toast} onDismiss={dismissToast} />;
}
