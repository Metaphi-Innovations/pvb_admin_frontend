"use client";

/** Accounts reports filter bar — consumed only by `/accounts` pages and report clients. */

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
import {
  loadFinancialYears,
  VOUCHER_TYPE_LABELS,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/masters/masters-data";
import { DAY_BOOK_VOUCHER_TYPE_OPTIONS } from "@/lib/accounts/day-book-data";
import { getActiveTDSMasters, getTdsSectionCode } from "@/app/(app)/masters/tds/tds-data";
import type { CollectionFollowUpStatus } from "@/lib/accounts/receivables-data";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { AccountsFilterDateRangeSection } from "@/components/accounts/AccountsListingFilter";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-7 text-xs mt-0.5";

export const REPORT_BRANCH_OPTIONS = CASH_BRANCH_OPTIONS.filter((b) => b !== "all");

export function ReportFilterRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>{children}</div>
  );
}

export function ReportSearchFilter({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1 min-w-[180px] flex-1", className)}>
      <Label className={filterLabelClass}>Search</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(filterControlClass, "mt-0 pr-8")}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
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
        <div className="space-y-1 min-w-[220px]">
          <AccountsFilterDateRangeSection
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
            size="default"
          />
        </div>
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
    <div className="space-y-1 min-w-[220px]">
      <AccountsFilterDateRangeSection
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        size="default"
      />
    </div>
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
      <AccountsDateInput
        value={value}
        onChange={onChange}
        className="mt-0 w-36"
        size="default"
        aria-label="As on date"
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
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ledgers: { id: number; name: string }[];
  /** When true, hides the "All ledgers" option — ledger selection is mandatory. */
  required?: boolean;
}) {
  return (
    <div className="space-y-1 min-w-[180px]">
      <Label className={filterLabelClass}>Ledger</Label>
      <Select value={value || (required ? undefined : "all")} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[180px]")}>
          <SelectValue placeholder={required ? "Select ledger…" : "All ledgers"} />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="all">All ledgers</SelectItem>}
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

export function DayBookVoucherTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[150px]">
      <Label className={filterLabelClass}>Voucher Type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[150px]")}>
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          {DAY_BOOK_VOUCHER_TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportFinancialYearFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const years = loadFinancialYears();
  return (
    <div className="space-y-1 min-w-[130px]">
      <Label className={filterLabelClass}>Financial Year</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[130px]")}>
          <SelectValue placeholder="All years" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All years</SelectItem>
          {years.map((fy) => (
            <SelectItem key={fy.id} value={String(fy.id)}>
              {fy.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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

export function ReportStateFilter({
  value,
  onChange,
  states,
}: {
  value: string;
  onChange: (value: string) => void;
  states: string[];
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className={filterLabelClass}>State</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
          <SelectValue placeholder="All states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          {states.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportViewByFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1 min-w-[150px]">
      <Label className={filterLabelClass}>View By</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[150px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const COLLECTION_STATUS_OPTIONS: { value: CollectionFollowUpStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "not_contacted", label: "Not Contacted" },
  { value: "follow_up_scheduled", label: "Follow-up Scheduled" },
  { value: "promise_to_pay", label: "Promise to Pay" },
  { value: "part_payment_received", label: "Part Payment Received" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
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

export function ReportTdsSectionFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const sections = React.useMemo(
    () =>
      getActiveTDSMasters().map((t) => ({
        value: getTdsSectionCode(t),
        label: `${getTdsSectionCode(t)} — ${t.sectionName}`,
      })),
    [],
  );

  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className={filterLabelClass}>TDS Section</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
          <SelectValue placeholder="All sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">
            All Sections
          </SelectItem>
          {sections.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportTdsPartyTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className={filterLabelClass}>Party Type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">
            All Types
          </SelectItem>
          <SelectItem value="Supplier" className="text-xs">
            Supplier
          </SelectItem>
          <SelectItem value="Customer" className="text-xs">
            Customer
          </SelectItem>
          <SelectItem value="Contractor" className="text-xs">
            Contractor
          </SelectItem>
          <SelectItem value="Professional" className="text-xs">
            Professional
          </SelectItem>
          <SelectItem value="Employee" className="text-xs">
            Employee
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportTdsPaymentStatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[120px]">
      <Label className={filterLabelClass}>Payment</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "mt-0 w-[120px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">
            All
          </SelectItem>
          <SelectItem value="unpaid" className="text-xs">
            Unpaid
          </SelectItem>
          <SelectItem value="paid" className="text-xs">
            Paid
          </SelectItem>
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
