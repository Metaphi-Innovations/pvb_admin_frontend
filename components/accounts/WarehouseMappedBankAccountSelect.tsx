"use client";

import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBankAccountOptions } from "@/hooks/accounts/use-bank-accounts-list";
import type { BankAccountOption } from "@/services/bank-accounts-list.service";

export const NO_BANK_MAPPED_TO_WAREHOUSE_MESSAGE =
  "No bank account is mapped to this warehouse. Please update the Bank Account Master.";

export type BankAccountPrintDetails = {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
};

export type WarehouseMappedBankAccountSelectOption = {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  ledgerId: string;
};

function toSelectOption(
  opt: BankAccountOption,
): WarehouseMappedBankAccountSelectOption | null {
  const id = opt.bankAccountId?.trim();
  if (!id) return null;
  return {
    id,
    label: opt.label,
    bankName: opt.bankName,
    accountNumber: opt.accountNumber,
    ifscCode: opt.ifscCode,
    branchName: opt.branchName,
    ledgerId: opt.ledgerId,
  };
}

export function bankAccountOptionToPrintDetails(
  option: WarehouseMappedBankAccountSelectOption | BankAccountOption | null | undefined,
): BankAccountPrintDetails | null {
  if (!option) return null;
  const bankName =
    "bankName" in option ? option.bankName : "";
  const accountNumber =
    "accountNumber" in option ? option.accountNumber : "";
  if (!bankName && !accountNumber) return null;
  return {
    bankName: bankName || "—",
    accountNumber: accountNumber || "—",
    ifsc:
      "ifscCode" in option
        ? option.ifscCode || "—"
        : "ifsc" in option
          ? String((option as BankAccountPrintDetails).ifsc || "—")
          : "—",
    branchName:
      "branchName" in option ? option.branchName || "—" : "—",
  };
}

/** @deprecated Prefer bankAccountOptionToPrintDetails with API option / snapshot. */
export function getBankAccountPrintDetails(
  _accountId: string | number | null | undefined,
): BankAccountPrintDetails | null {
  return null;
}

export function WarehouseMappedBankAccountSelect({
  warehouseId,
  /** @deprecated Use warehouseId (API UUID). Ignored when warehouseId is set. */
  warehouseRef: _warehouseRef,
  value,
  onChange,
  label = "Bank Account",
  required = false,
  disabled = false,
  className,
  placeholder = "Select bank account…",
  hideHint = false,
  usage,
}: {
  warehouseId?: string | null;
  warehouseRef?: string | number | null;
  value: string | null;
  onChange: (
    accountId: string | null,
    option?: WarehouseMappedBankAccountSelectOption,
  ) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** Hide warehouse mapping hint (Goods invoice compact layout). */
  hideHint?: boolean;
  usage?: "RECEIPT" | "PAYMENT";
}) {
  const resolvedWarehouseId = warehouseId?.trim() || "";
  const hasWarehouse = Boolean(resolvedWarehouseId);

  const optionsQuery = useBankAccountOptions({
    warehouseId: hasWarehouse ? resolvedWarehouseId : undefined,
    usage,
    enabled: true,
  });

  const options = useMemo(() => {
    const rows = optionsQuery.data ?? [];
    return rows
      .map(toSelectOption)
      .filter((o): o is WarehouseMappedBankAccountSelectOption => o != null);
  }, [optionsQuery.data]);

  useEffect(() => {
    if (value == null || value === "") return;
    if (!options.some((o) => o.id === value)) {
      onChange(null);
    }
  }, [options, value, onChange]);

  const empty = !optionsQuery.isLoading && options.length === 0;
  const needsWarehouseHint = required && !hasWarehouse;

  return (
    <div className={cn(hideHint ? "space-y-0 w-full" : "space-y-1", className)}>
      {label ? (
        <Label className="text-xs font-medium">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </Label>
      ) : null}
      {needsWarehouseHint ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Select a warehouse first to load mapped bank accounts.
        </p>
      ) : optionsQuery.isError ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Could not load bank accounts. Please try again.
        </p>
      ) : empty ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {hasWarehouse
            ? NO_BANK_MAPPED_TO_WAREHOUSE_MESSAGE
            : "No active bank accounts available."}
        </p>
      ) : (
        <Select
          value={value ?? ""}
          onValueChange={(v) => {
            const opt = options.find((o) => o.id === v);
            onChange(v || null, opt);
          }}
          disabled={disabled || optionsQuery.isLoading}
        >
          <SelectTrigger className={cn("rounded-lg", hideHint ? "h-8 text-xs" : "h-9 text-sm")}>
            <SelectValue
              placeholder={
                optionsQuery.isLoading ? "Loading bank accounts…" : placeholder
              }
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => {
              const accountNo = (opt.accountNumber || "").trim();
              const branch = (opt.branchName || "").trim();
              return (
                <SelectItem key={opt.id} value={opt.id} className="text-xs">
                  <span className="font-medium">{opt.bankName || opt.label}</span>
                  {accountNo ? (
                    <span className="text-muted-foreground ml-1 font-mono">· {accountNo}</span>
                  ) : null}
                  {branch ? (
                    <span className="text-muted-foreground ml-1">· {branch}</span>
                  ) : null}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
      {hasWarehouse && !empty && !hideHint && !optionsQuery.isLoading ? (
        <p className="text-[11px] text-muted-foreground">
          Showing accounts mapped to this warehouse.
        </p>
      ) : null}
    </div>
  );
}
