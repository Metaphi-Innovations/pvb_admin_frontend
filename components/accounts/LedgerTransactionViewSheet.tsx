"use client";

import { useEffect } from "react";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";

/** Adapter for legacy CoaTransactionRow sheet API — prefer useTransactionDetailsDrawer directly. */
export function LedgerTransactionViewSheet({
  row,
  open,
  onClose,
}: {
  row: CoaTransactionRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const { openTransaction, closeTransaction, drawer } = useTransactionDetailsDrawer();

  useEffect(() => {
    if (open && row) {
      openTransaction({ type: "general_ledger", row });
    }
    if (!open) {
      closeTransaction();
    }
  }, [open, row, openTransaction, closeTransaction]);

  return <>{drawer}</>;
}
