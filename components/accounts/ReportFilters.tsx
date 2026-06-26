"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CASH_BRANCH_OPTIONS } from "@/lib/accounts/banking-book-utils";
import { WAREHOUSE_FILTER_OPTIONS } from "@/lib/accounts/inventory-accounting-data";
import {
  DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { CollectionFollowUpStatus } from "@/lib/accounts/receivables-data";
import { cn } from "@/lib/utils";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground";
const filterControlClass = "h-8 text-xs mt-1";

export const REPORT_BRANCH_OPTIONS = CASH_BRANCH_OPTIONS.filter((b) => b !== "all");

export function ReportFilterRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>{children}</div>
  );
}

export function ReportDateRangeFilter({
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
}: {
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: DateRangePresetId) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  const handlePresetChange = (value: DateRangePresetId) => {
    onPresetChange(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  return (
    <>
      <div className="space-y-1 min-w-[140px]">
        <Label className={filterLabelClass}>Date Range</Label>
        <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePresetId)}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESET_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" && (
        <>
          <div className="space-y-1">
            <Label className={filterLabelClass}>From</Label>
            <Input
              type="date"
              className={cn(filterControlClass, "mt-0 w-36")}
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className={filterLabelClass}>To</Label>
            <Input
              type="date"
              className={cn(filterControlClass, "mt-0 w-36")}
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        </>
      )}
    </>
  );
}

/** GST Summary uses separate From / To labels without preset wrapper label */
export function ReportFromToDateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label className={filterLabelClass}>From Date</Label>
        <Input
          type="date"
          className={cn(filterControlClass, "mt-0 w-36")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className={filterLabelClass}>To Date</Label>
        <Input
          type="date"
          className={cn(filterControlClass, "mt-0 w-36")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>
    </>
  );
}

export function ReportAsOnDateFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className={filterLabelClass}>As On Date</Label>
      <Input
        type="date"
        className={cn(filterControlClass, "mt-0 w-36")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ReportBranchFilter({
  value,
  onChange,
  options = REPORT_BRANCH_OPTIONS,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className={filterLabelClass}>Branch</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
          <SelectValue placeholder="All branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All branches</SelectItem>
          {options.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export type ReportBasis = "accrual" | "cash";

export function ReportBasisFilter({
  value,
  onChange,
}: {
  value: ReportBasis;
  onChange: (value: ReportBasis) => void;
}) {
  return (
    <div className="space-y-1 min-w-[120px]">
      <Label className={filterLabelClass}>Report Basis</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ReportBasis)}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[120px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="accrual">Accrual</SelectItem>
          <SelectItem value="cash">Cash</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportLedgerFilter({
  value,
  onChange,
  ledgers,
}: {
  value: string;
  onChange: (value: string) => void;
  ledgers: { id: number; name: string }[];
}) {
  return (
    <div className="space-y-1 min-w-[180px]">
      <Label className={filterLabelClass}>Ledger</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[180px]")}>
          <SelectValue placeholder="All ledgers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All ledgers</SelectItem>
          {ledgers.map((l) => (
            <SelectItem key={l.id} value={String(l.id)}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const DAY_BOOK_VOUCHER_TYPES = Object.entries(VOUCHER_TYPE_LABELS) as [VoucherTypeCode, string][];

export function ReportVoucherTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className={filterLabelClass}>Voucher Type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {DAY_BOOK_VOUCHER_TYPES.map(([code, label]) => (
            <SelectItem key={code} value={code}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportCustomerFilter({
  value,
  onChange,
  customers,
}: {
  value: string;
  onChange: (value: string) => void;
  customers: { id: number; customerName: string }[];
}) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className={filterLabelClass}>Customer</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
          <SelectValue placeholder="All customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All customers</SelectItem>
          {customers.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.customerName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportVendorFilter({
  value,
  onChange,
  vendors,
}: {
  value: string;
  onChange: (value: string) => void;
  vendors: { id: number; vendorName: string }[];
}) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className={filterLabelClass}>Supplier</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
          <SelectValue placeholder="All suppliers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All suppliers</SelectItem>
          {vendors.map((v) => (
            <SelectItem key={v.id} value={String(v.id)}>
              {v.vendorName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportWarehouseFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[150px]">
      <Label className={filterLabelClass}>Warehouse</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[150px]")}>
          <SelectValue placeholder="All warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All warehouses</SelectItem>
          {WAREHOUSE_FILTER_OPTIONS.map((w) => (
            <SelectItem key={w} value={w}>
              {w}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportProductFilter({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (value: string) => void;
  products: { id: number; productName: string }[];
}) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className={filterLabelClass}>Product</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
          <SelectValue placeholder="All products" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All products</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.productName}>
              {p.productName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const COLLECTION_STATUS_OPTIONS: { value: CollectionFollowUpStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "follow_up_due", label: "Follow-up Due" },
  { value: "promise_to_pay", label: "Promise to Pay" },
  { value: "partially_collected", label: "Partially Collected" },
  { value: "collected", label: "Collected" },
  { value: "escalated", label: "Escalated" },
];

export function ReportCollectionStatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[150px]">
      <Label className={filterLabelClass}>Collection Status</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[150px]")}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {COLLECTION_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** @deprecated Use ReportFilterRow + individual filter components */
export function ReportFilterBar({
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  branch,
  onBranch,
  extra,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  branch: string;
  onBranch: (v: string) => void;
  extra?: React.ReactNode;
}) {
  const [preset, setPreset] = React.useState<DateRangePresetId>("custom");

  return (
    <ReportFilterRow>
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={setPreset}
        onDateFromChange={onDateFrom}
        onDateToChange={onDateTo}
      />
      <ReportBranchFilter value={branch || "all"} onChange={onBranch} />
      {extra}
    </ReportFilterRow>
  );
}

export function useReportDateRange(initialPreset: DateRangePresetId = "this_month") {
  const initial = React.useMemo(
    () => {
      const { from, to } = resolveDateRangePreset(initialPreset);
      return { preset: initialPreset, from, to };
    },
    [initialPreset],
  );
  const [preset, setPreset] = React.useState<DateRangePresetId>(initial.preset);
  const [dateFrom, setDateFrom] = React.useState(initial.from);
  const [dateTo, setDateTo] = React.useState(initial.to);
  return { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo };
}
