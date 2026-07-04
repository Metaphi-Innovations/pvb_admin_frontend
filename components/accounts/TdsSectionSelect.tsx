"use client";

import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getActiveTDSMasters,
  getTdsSectionCode,
  formatTdsRateDisplay,
} from "@/app/(app)/masters/tds/tds-data";
import {
  resolveTdsPayableLedger,
  resolveTdsReceivableLedger,
} from "@/lib/accounts/tds-accounting";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { cn } from "@/lib/utils";

interface TdsSectionSelectProps {
  value: number | null;
  onChange: (masterId: number | null, ledger: ChartOfAccount | null) => void;
  kind: "payable" | "receivable";
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function TdsSectionSelect({
  value,
  onChange,
  kind,
  label = "TDS Section",
  required,
  disabled,
  className,
}: TdsSectionSelectProps) {
  const sections = useMemo(() => getActiveTDSMasters(), []);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={value != null ? String(value) : ""}
        onValueChange={(v) => {
          const masterId = Number(v);
          const ledger =
            kind === "payable"
              ? resolveTdsPayableLedger(masterId)
              : resolveTdsReceivableLedger(masterId);
          onChange(masterId, ledger);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 text-sm rounded-lg">
          <SelectValue placeholder="Select TDS section…" />
        </SelectTrigger>
        <SelectContent>
          {sections.map((t) => (
            <SelectItem key={t.id} value={String(t.id)} className="text-xs">
              {formatTdsRateDisplay(t.tdsRate)} {getTdsSectionCode(t)} — {t.sectionName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
