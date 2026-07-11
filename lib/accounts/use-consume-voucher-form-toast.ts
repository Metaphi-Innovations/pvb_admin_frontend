"use client";

import { useEffect } from "react";
import { consumeVoucherFormToast } from "@/lib/accounts/voucher-form-toast";

export function useConsumeVoucherFormToast(
  showToast: (msg: string, type?: "success" | "error") => void,
  ready = true,
): void {
  useEffect(() => {
    if (!ready) return;
    const message = consumeVoucherFormToast();
    if (message) showToast(message);
  }, [ready, showToast]);
}
