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
import {
  getBankAccountById,
  listBankAccountSelectOptions,
  loadBankAccounts,
  type BankAccountSelectOption,
} from "@/lib/accounts/bank-accounts-data";
import {
  NO_BANK_MAPPED_TO_WAREHOUSE_MESSAGE,
  resolveWarehouseRef,
} from "@/lib/accounts/bank-warehouse-mapping";

export function WarehouseMappedBankAccountSelect({
  warehouseRef,
  value,
  onChange,
  label = "Bank Account",
  required = false,
  disabled = false,
  className,
  placeholder = "Select bank account…",
}: {
  warehouseRef: string | number | null | undefined;
  value: number | null;
  onChange: (accountId: number | null, option?: BankAccountSelectOption) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  useEffect(() => {
    loadBankAccounts();
  }, []);

  const resolvedWarehouse = useMemo(() => resolveWarehouseRef(warehouseRef), [warehouseRef]);

  const options = useMemo(
    () => listBankAccountSelectOptions(warehouseRef),
    [warehouseRef],
  );

  useEffect(() => {
    if (value == null) return;
    if (!options.some((o) => o.id === value)) {
      onChange(null);
    }
  }, [options, value, onChange]);

  const noWarehouse = warehouseRef != null && warehouseRef !== "" && !resolvedWarehouse;
  const empty = options.length === 0;

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {noWarehouse ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Could not resolve warehouse &quot;{String(warehouseRef)}&quot;. Select a valid warehouse first.
        </p>
      ) : empty ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {NO_BANK_MAPPED_TO_WAREHOUSE_MESSAGE}
        </p>
      ) : (
        <Select
          value={value != null ? String(value) : ""}
          onValueChange={(v) => {
            const id = Number(v);
            const opt = options.find((o) => o.id === id);
            onChange(Number.isFinite(id) ? id : null, opt);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 text-sm rounded-lg">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => {
              const ending = opt.accountNumber
                ? String(opt.accountNumber).slice(-4)
                : "";
              const master = getBankAccountById(opt.id);
              const branch = master?.branchName?.trim() || "";
              return (
                <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
                  <span className="font-medium">{opt.bankName || opt.label}</span>
                  {ending ? (
                    <span className="text-muted-foreground ml-1">· …{ending}</span>
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
      {resolvedWarehouse && !empty && (
        <p className="text-[11px] text-muted-foreground">
          Showing accounts mapped to {resolvedWarehouse.warehouseName}.
        </p>
      )}
    </div>
  );
}

export function getBankAccountPrintDetails(accountId: number | null | undefined): {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
} | null {
  if (accountId == null) return null;
  const master = getBankAccountById(accountId);
  if (!master) return null;
  return {
    bankName: master.bankName,
    accountNumber: master.accountNumber,
    ifsc: master.ifsc,
    branchName: master.branchName,
  };
}
