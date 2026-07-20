"use client";

import React, { useEffect, useState } from "react";
import {
  formatBankReconAt,
  getBankReconDisplayForVoucher,
  type BankReconDisplayInfo,
} from "@/lib/accounts/bank-recon-display";
import { TALLY_EVENT } from "@/lib/accounts/bank-recon-tally-types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground break-words">{value ?? "—"}</span>
    </div>
  );
}

/**
 * Read-only Bank Reconciliation block for Payment / Receipt / Contra voucher views.
 * Reads BankReconTallyLink from localStorage — never invents timestamps.
 */
export function VoucherBankReconciliationSection({
  voucherId,
  voucherNumber,
}: {
  voucherId: number;
  voucherNumber?: string | null;
}) {
  const [info, setInfo] = useState<BankReconDisplayInfo>(() =>
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

  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        Bank Reconciliation
      </p>
      <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
        <InfoRow label="Status" value={info.statusLabel} />
        <InfoRow label="Bank Date" value={info.isReconciled && info.bankDate ? info.bankDate : "—"} />
        <InfoRow
          label="Reconciled By"
          value={info.isReconciled && info.reconciledBy ? info.reconciledBy : "—"}
        />
        <InfoRow
          label="Reconciled At"
          value={
            info.isReconciled && info.reconciledAt
              ? formatBankReconAt(info.reconciledAt)
              : "—"
          }
        />
      </div>
    </div>
  );
}
