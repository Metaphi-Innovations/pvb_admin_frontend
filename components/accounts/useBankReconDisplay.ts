"use client";

import { useEffect, useState } from "react";
import {
  getBankReconDisplayForVoucher,
  type BankReconDisplayInfo,
} from "@/lib/accounts/bank-recon-display";
import { TALLY_EVENT } from "@/lib/accounts/bank-recon-tally-types";

/** Live BankReconTallyLink lookup for report tables (Bank Book / GL). */
export function useBankReconDisplay(
  voucherId?: number | null,
  voucherNumber?: string | null,
): BankReconDisplayInfo {
  const [info, setInfo] = useState(() =>
    getBankReconDisplayForVoucher({ voucherId, voucherNumber }),
  );

  useEffect(() => {
    const refresh = () => {
      setInfo(getBankReconDisplayForVoucher({ voucherId, voucherNumber }));
    };
    refresh();
    window.addEventListener(TALLY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TALLY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [voucherId, voucherNumber]);

  return info;
}
