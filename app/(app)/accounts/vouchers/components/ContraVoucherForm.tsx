"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";

type ContraType = "cash_to_bank" | "bank_to_cash" | "bank_to_bank";

interface ContraVoucherFormProps {
  onDone?: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function ContraVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: ContraVoucherFormProps) {
  const [contraType, setContraType] = useState<ContraType>("cash_to_bank");

  const coaRecords = useCoaRecords();
  const bankLedgers = useMemo(
    () => getLedgersUnderSubGroupName("Bank Accounts", coaRecords),
    [coaRecords],
  );
  const cashLedgers = useMemo(
    () => getLedgersUnderSubGroupName("Cash-in-Hand", coaRecords),
    [coaRecords],
  );

  const ledgerFilter = useMemo(() => {
    const fromPool =
      contraType === "cash_to_bank"
        ? cashLedgers
        : contraType === "bank_to_cash"
          ? bankLedgers
          : bankLedgers;
    const toPool =
      contraType === "cash_to_bank"
        ? bankLedgers
        : contraType === "bank_to_cash"
          ? cashLedgers
          : bankLedgers;
    const allowed = new Set([...fromPool, ...toPool].map((l) => l.id));
    return (ledger: ChartOfAccount) => allowed.has(ledger.id);
  }, [contraType, bankLedgers, cashLedgers]);

  const contraExtraHeader = (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(140px,200px)_1fr] gap-1.5 sm:gap-4 sm:items-start">
      <label className="text-xs font-medium text-foreground sm:pt-2.5">Contra Type</label>
      <div className="max-w-md space-y-1">
        <Select
          value={contraType}
          onValueChange={(v) => setContraType(v as ContraType)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash_to_bank" className="text-xs">Cash To Bank</SelectItem>
            <SelectItem value="bank_to_cash" className="text-xs">Bank To Cash</SelectItem>
            <SelectItem value="bank_to_bank" className="text-xs">Bank To Bank</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Typical: Dr destination (Cash/Bank) · Cr source (Bank/Cash)
        </p>
      </div>
    </div>
  );

  const cancelHref = voucherId
    ? `/accounts/vouchers/view/${voucherId}`
    : "/accounts/vouchers?tab=contra";

  return (
    <VoucherDualEntryForm
      voucherType="contra"
      cancelHref={cancelHref}
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
      contraExtraHeader={contraExtraHeader}
      contraLedgerFilter={ledgerFilter}
    />
  );
}
