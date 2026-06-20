"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";

type ContraType = "cash_to_bank" | "bank_to_cash" | "bank_to_bank";

interface ContraVoucherFormProps {
  onDone?: () => void;
}

export function ContraVoucherForm({ onDone }: ContraVoucherFormProps) {
  const [contraType, setContraType] = useState<ContraType>("cash_to_bank");

  const bankLedgers = useMemo(() => getLedgersUnderSubGroupName("Bank Accounts"), []);
  const cashLedgers = useMemo(() => getLedgersUnderSubGroupName("Cash-in-Hand"), []);

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

  const extraHeader = (
    <div className="max-w-xs space-y-1">
      <Label className="text-[11px] text-muted-foreground">Contra Type</Label>
      <Select value={contraType} onValueChange={(v) => setContraType(v as ContraType)}>
        <SelectTrigger className="h-9 text-xs bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cash_to_bank" className="text-xs">Cash To Bank</SelectItem>
          <SelectItem value="bank_to_cash" className="text-xs">Bank To Cash</SelectItem>
          <SelectItem value="bank_to_bank" className="text-xs">Bank To Bank</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">
        Typical: Dr destination (Cash/Bank) · Cr source (Bank/Cash)
      </p>
    </div>
  );

  return (
    <ZohoVoucherEntryForm
      key={contraType}
      voucherType="contra"
      cancelHref="/accounts/vouchers?tab=contra"
      onDone={() => onDone?.()}
      breadcrumbSection="Transactions"
      extraHeader={extraHeader}
      ledgerFilter={ledgerFilter}
    />
  );
}
