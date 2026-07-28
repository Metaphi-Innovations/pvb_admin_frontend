"use client";

import { useEffect, useState } from "react";
import { ACCOUNTS_VOUCHERS_UPDATED_EVENT } from "@/lib/accounts/accounts-section-seed";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { getVoucherCacheGeneration } from "@/app/(app)/accounts/vouchers/voucher-data";

/** Re-read posted vouchers when section seed completes or vouchers are saved. */
export function useDayBookDataRefresh(): number {
  const sectionRefresh = useAccountsSectionRefresh();
  const [voucherTick, setVoucherTick] = useState(0);

  useEffect(() => {
    const bump = () => setVoucherTick(getVoucherCacheGeneration());
    window.addEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, bump);
    bump();
    return () => window.removeEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, bump);
  }, []);

  useEffect(() => {
    setVoucherTick(getVoucherCacheGeneration());
  }, [sectionRefresh]);

  return voucherTick + sectionRefresh;
}
