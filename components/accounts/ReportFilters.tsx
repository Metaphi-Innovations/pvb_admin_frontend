"use client";

/** Accounts reports filter bar — consumed only by `/accounts` pages and report clients. */

import React from "react";
import { useClientMounted } from "@/lib/use-client-mounted";
import { Input } from "@/components/ui/input";
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
import { X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { AccountsFilterDateRangeSection } from "@/components/accounts/AccountsFilterDateRangeSection";
import { Switch } from "@/components/ui/switch";
import { ReportMultiSelect } from "@/components/accounts/ReportMultiSelect";
import type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";

import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ACCOUNTS_FILTER_SELECT_CLASS,
  ACCOUNTS_DATE_FILTER_WIDTH_CLASS,
  ACCOUNTS_PRESET_SELECT_WIDTH_CLASS,
} from "@/lib/accounts/accounts-typography";

const filterLabelClass = ACCOUNTS_FILTER_LABEL_CLASS;
const filterControlClass = cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0");
const filterSelectClass = cn(ACCOUNTS_FILTER_CONTROL_CLASS, ACCOUNTS_FILTER_SELECT_CLASS, "mt-0");

/** Shared compact filter label + control classes for accounts listing/report pages */
export {
  ACCOUNTS_FILTER_LABEL_CLASS,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_SELECT_CLASS,
  ACCOUNTS_DATE_FILTER_WIDTH_CLASS,
  ACCOUNTS_PRESET_SELECT_WIDTH_CLASS,
};

export const REPORT_BRANCH_OPTIONS = CASH_BRANCH_OPTIONS.filter((b) => b !== "all");

export function ReportFilterRow({
  children,
  end,
  className,
}: {
  children: React.ReactNode;
  /** Right-aligned actions (e.g. Export) — pinned to extreme right of the filter row */
  end?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-2 w-full min-w-0", className)}>
      <div className="flex flex-nowrap items-end gap-x-2 min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin]">
        {children}
      </div>
      {end ? (
        <div className="ml-auto flex items-end gap-1.5 flex-shrink-0 self-end">{end}</div>
      ) : null}
    </div>
  );
}

export function ReportFilterResetButton({
  onClick,
  disabled,
  className,
  /** When true, button is hidden unless `active` is true. */
  showOnlyWhenActive,
  active,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  showOnlyWhenActive?: boolean;
  active?: boolean;
}) {
  if (showOnlyWhenActive && !active) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-7 px-2.5 text-xs font-medium rounded-md border border-border text-muted-foreground",
        "hover:bg-muted/40 hover:text-foreground disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
    >
      Reset
    </button>
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
  const mounted = useClientMounted();

  return (
    <div className={cn("space-y-0.5 min-w-[200px] flex-1 basis-[200px] max-w-md", className)}>
      <span className={filterLabelClass}>Search</span>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(filterControlClass, "mt-0 pr-8 w-full")}
        />
        {mounted && value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
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
  presetOptions = DATE_RANGE_PRESET_OPTIONS,
  inlineCustomDates = true,
}: {
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: DateRangePresetId) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  presetOptions?: { id: DateRangePresetId; label: string }[];
  /** When false, From/To fields are not rendered inline (use separate date filters). */
  inlineCustomDates?: boolean;
}) {
  const handlePresetChange = (value: DateRangePresetId) => {
    onPresetChange(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      onDateFromChange(from);
      onDateToChange(to);
      return;
    }
    if (!dateFrom || !dateTo) {
      const { from, to } = resolveDateRangePreset("last_month");
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  return (
    <div className="space-y-0.5 shrink-0">
      <span className={cn(filterLabelClass, "inline-flex items-center gap-1")}>
        <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden />
        Date Range
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePresetId)}>
          <SelectTrigger
            className={cn(filterSelectClass, ACCOUNTS_PRESET_SELECT_WIDTH_CLASS, "shrink-0")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetOptions.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {inlineCustomDates && preset === "custom" && (
          <>
            <AccountsDateInput
              value={dateFrom}
              onChange={onDateFromChange}
              aria-label="From date"
              className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
            />
            <span className="text-xs text-[#9CA3AF] select-none px-0.5" aria-hidden>
              —
            </span>
            <AccountsDateInput
              value={dateTo}
              onChange={onDateToChange}
              aria-label="To date"
              className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
            />
          </>
        )}
      </div>
    </div>
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
    <div className="space-y-0.5 min-w-[220px]">
      <AccountsFilterDateRangeSection
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
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
    <div className="space-y-0.5">
      <span className={filterLabelClass}>As On Date</span>
      <AccountsDateInput
        value={value}
        onChange={onChange}
        className={cn("mt-0", ACCOUNTS_DATE_FILTER_WIDTH_CLASS)}
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
    <div className="space-y-0.5 min-w-[140px]">
      <span className={filterLabelClass}>Branch</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[140px]")}>
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
    <div className="space-y-0.5 min-w-[120px]">
      <span className={filterLabelClass}>Report Basis</span>
      <Select value={value} onValueChange={(v) => onChange(v as ReportBasis)}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[120px]")}>
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
    <div className="space-y-0.5 min-w-[180px]">
      <span className={filterLabelClass}>Ledger</span>
      <Select value={value || (required ? undefined : "all")} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[180px]")}>
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

export function ReportLedgerGroupFilter({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (value: string) => void;
  groups: { id: number; name: string }[];
}) {
  return (
    <div className="space-y-0.5 min-w-[180px]">
      <span className={filterLabelClass}>Ledger Group</span>
      <Select value={value || "all"} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[180px]")}>
          <SelectValue placeholder="All groups" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All groups</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={String(g.id)}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportShowZeroBalanceToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[140px] h-8">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        Include zero balance
      </span>
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
    <div className="space-y-0.5 min-w-[150px]">
      <span className={filterLabelClass}>Voucher Type</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[150px]")}>
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
    <div className="space-y-0.5 min-w-[130px]">
      <span className={filterLabelClass}>Financial Year</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[130px]")}>
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
    <div className="space-y-0.5 min-w-[140px]">
      <span className={filterLabelClass}>Voucher Type</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[140px]")}>
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
    <div className="space-y-0.5 min-w-[160px]">
      <span className={filterLabelClass}>Customer</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[160px]")}>
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

export function ReportPaymentStatusFilter<T extends string>({
  value,
  onChange,
  options,
  label = "Payment Status",
}: {
  value: T | "all";
  onChange: (value: T | "all") => void;
  options: { value: T | "all"; label: string }[];
  label?: string;
}) {
  return (
    <div className="space-y-0.5 min-w-[150px]">
      <span className={filterLabelClass}>{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v as T | "all")}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-full min-w-[150px]")}>
          <SelectValue placeholder="All statuses" />
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

export function ReportSalespersonFilter({
  value,
  onChange,
  salespeople,
}: {
  value: string;
  onChange: (value: string) => void;
  salespeople: string[];
}) {
  return (
    <div className="space-y-0.5 min-w-[160px]">
      <span className={filterLabelClass}>Salesperson</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[160px]")}>
          <SelectValue placeholder="All salespeople" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All salespeople</SelectItem>
          {salespeople.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
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
    <div className="space-y-0.5 min-w-[160px]">
      <span className={filterLabelClass}>Supplier</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[160px]")}>
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

export function ReportPartyFilter({
  value,
  onChange,
  parties,
}: {
  value: string;
  onChange: (value: string) => void;
  parties: { id: string; name: string; kind?: "customer" | "vendor" }[];
}) {
  return (
    <div className="space-y-0.5 min-w-[180px]">
      <span className={filterLabelClass}>Party</span>
      <Select value={value || "all"} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[180px]")}>
          <SelectValue placeholder="All parties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All parties</SelectItem>
          {parties.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.kind === "vendor" ? `${p.name} (Vendor)` : `${p.name} (Customer)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportTrialBalanceViewTypeFilter({
  value,
  onChange,
}: {
  value: "normal" | "detailed";
  onChange: (value: "normal" | "detailed") => void;
}) {
  return (
    <div className="space-y-0.5 min-w-[120px] shrink-0">
      <span className={filterLabelClass}>View Type</span>
      <Select value={value} onValueChange={(v) => onChange(v as "normal" | "detailed")}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[120px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="detailed">Detailed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportIncludeOpeningBalanceToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-h-8">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        Include opening balance
      </span>
    </div>
  );
}

export function ReportFromDateFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-0.5 shrink-0">
      <span className={filterLabelClass}>From Date</span>
      <AccountsDateInput
        value={value}
        onChange={onChange}
        aria-label="From date"
        className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
      />
    </div>
  );
}

export function ReportToDateFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-0.5 shrink-0">
      <span className={filterLabelClass}>To Date</span>
      <AccountsDateInput
        value={value}
        onChange={onChange}
        aria-label="To date"
        className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
      />
    </div>
  );
}

export function ReportParticularSearchFilter({
  value,
  onChange,
  placeholder = "Search particular…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const mounted = useClientMounted();
  return (
    <div className="space-y-0.5 min-w-[180px] flex-1 basis-[180px] max-w-xs shrink-0">
      <span className={filterLabelClass}>Search Particular</span>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(filterControlClass, "mt-0 pr-8 w-full")}
        />
        {mounted && value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ReportViewTypeFilter({
  value,
  onChange,
}: {
  value: "summary" | "detailed";
  onChange: (value: "summary" | "detailed") => void;
}) {
  return (
    <div className="space-y-0.5 min-w-[130px]">
      <span className={filterLabelClass}>View Type</span>
      <Select value={value} onValueChange={(v) => onChange(v as "summary" | "detailed")}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[130px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="summary">Summary</SelectItem>
          <SelectItem value="detailed">Detailed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportWarehouseFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}) {
  const warehouseOptions = options?.length ? options : WAREHOUSE_FILTER_OPTIONS;
  return (
    <div className="space-y-0.5 min-w-[150px]">
      <span className={filterLabelClass}>Warehouse</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[150px]")}>
          <SelectValue placeholder="All warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All warehouses</SelectItem>
          {warehouseOptions.map((w) => (
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
    <div className="space-y-0.5 min-w-[160px]">
      <span className={filterLabelClass}>Product</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[160px]")}>
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
    <div className="space-y-0.5 min-w-[140px]">
      <span className={filterLabelClass}>State</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[140px]")}>
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
    <div className="space-y-0.5 min-w-[150px]">
      <span className={filterLabelClass}>View By</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[150px]")}>
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
    <div className="space-y-0.5 min-w-[150px]">
      <span className={filterLabelClass}>Collection Status</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[150px]")}>
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
    <div className="space-y-0.5 min-w-[160px]">
      <span className={filterLabelClass}>TDS Section</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[160px]")}>
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
    <div className="space-y-0.5 min-w-[140px]">
      <span className={filterLabelClass}>Party Type</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[140px]")}>
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
    <div className="space-y-0.5 min-w-[120px]">
      <span className={filterLabelClass}>Payment</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[120px]")}>
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

export { ReportMoreFilters } from "@/components/accounts/ReportMoreFilters";
export { ReportFilterSummary } from "@/components/accounts/ReportFilterSummary";
export { ReportFilterField } from "@/components/accounts/AccountsReportLayout";
export type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";

export function ReportBranchMultiFilter({
  values,
  onChange,
  options = REPORT_BRANCH_OPTIONS,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options?: readonly string[];
}) {
  const selectOptions: ReportMultiSelectOption[] = options.map((b) => ({
    value: b,
    label: b,
  }));
  return (
    <ReportMultiSelect
      label="Branch"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Branch"
      allLabel="All Branches"
      minWidthClass="min-w-[140px]"
    />
  );
}

export function ReportWarehouseMultiFilter({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
}) {
  const selectOptions: ReportMultiSelectOption[] = options
    .filter((w) => w !== "all")
    .map((w) => ({ value: w, label: w }));
  return (
    <ReportMultiSelect
      label="Warehouse"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Warehouse"
      allLabel="All Warehouses"
      minWidthClass="min-w-[150px]"
    />
  );
}

export function ReportVoucherTypeMultiFilter({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options?: { value: string; label: string }[];
}) {
  const selectOptions: ReportMultiSelectOption[] = (options ?? DAY_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all")).map(
    (o) => ({ value: o.value, label: o.label }),
  );
  return (
    <ReportMultiSelect
      label="Voucher Type"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Type"
      allLabel="All Types"
      minWidthClass="min-w-[150px]"
    />
  );
}

export function ReportCustomerMultiFilter({
  values,
  onChange,
  customers,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  customers: { id: number; customerName: string; customerCode?: string }[];
}) {
  const selectOptions: ReportMultiSelectOption[] = customers.map((c) => ({
    value: String(c.id),
    label: c.customerName,
    searchText: c.customerCode ?? "",
  }));
  return (
    <ReportMultiSelect
      label="Customer"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Customer"
      allLabel="All Customers"
      minWidthClass="min-w-[160px]"
    />
  );
}

export function ReportVendorMultiFilter({
  values,
  onChange,
  vendors,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  vendors: { id: number; vendorName: string; vendorCode?: string }[];
}) {
  const selectOptions: ReportMultiSelectOption[] = vendors.map((v) => ({
    value: String(v.id),
    label: v.vendorName,
    searchText: v.vendorCode ?? "",
  }));
  return (
    <ReportMultiSelect
      label="Supplier"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Supplier"
      allLabel="All Suppliers"
      minWidthClass="min-w-[160px]"
    />
  );
}

export function ReportPartyMultiFilter({
  values,
  onChange,
  parties,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  parties: { id: string; name: string; kind?: "customer" | "vendor" }[];
}) {
  const selectOptions: ReportMultiSelectOption[] = parties.map((p) => ({
    value: p.id,
    label: p.kind === "vendor" ? `${p.name} (Vendor)` : `${p.name} (Customer)`,
    group: p.kind === "vendor" ? "Vendors" : "Customers",
  }));
  return (
    <ReportMultiSelect
      label="Party"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Party"
      allLabel="All Parties"
      minWidthClass="min-w-[180px]"
      grouped
    />
  );
}

export function ReportLedgerMultiFilter({
  values,
  onChange,
  ledgers,
  label = "Ledger",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  ledgers: { id: number; name: string; group?: string }[];
  label?: string;
}) {
  const selectOptions: ReportMultiSelectOption[] = ledgers.map((l) => ({
    value: String(l.id),
    label: l.name,
    group: l.group,
  }));
  return (
    <ReportMultiSelect
      label={label}
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Ledger"
      allLabel={`All ${label}s`}
      minWidthClass="min-w-[180px]"
      grouped={ledgers.some((l) => l.group)}
    />
  );
}

export function ReportLedgerGroupMultiFilter({
  values,
  onChange,
  groups,
  label = "Ledger Group",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  groups: { id: number; name: string }[];
  label?: string;
}) {
  const selectOptions: ReportMultiSelectOption[] = groups.map((g) => ({
    value: String(g.id),
    label: g.name,
  }));
  return (
    <ReportMultiSelect
      label={label}
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Group"
      allLabel="All Groups"
      minWidthClass="min-w-[180px]"
    />
  );
}

export function ReportSalespersonMultiFilter({
  values,
  onChange,
  salespeople,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  salespeople: string[];
}) {
  const selectOptions: ReportMultiSelectOption[] = salespeople.map((name) => ({
    value: name,
    label: name,
  }));
  return (
    <ReportMultiSelect
      label="Salesperson"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Salesperson"
      allLabel="All Salespeople"
      minWidthClass="min-w-[160px]"
    />
  );
}

export function ReportProductMultiFilter({
  values,
  onChange,
  products,
  label = "Product",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  products: { value: string; label: string; searchText?: string }[];
  label?: string;
}) {
  const selectOptions: ReportMultiSelectOption[] = products.map((p) => ({
    value: p.value,
    label: p.label,
    searchText: p.searchText,
  }));
  return (
    <ReportMultiSelect
      label={label}
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Product"
      allLabel="All Products"
      minWidthClass="min-w-[160px]"
    />
  );
}

export function ReportStatusMultiFilter<T extends string>({
  values,
  onChange,
  options,
  label = "Status",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  const selectOptions: ReportMultiSelectOption[] = options.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  return (
    <ReportMultiSelect
      label={label}
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Status"
      allLabel="All Statuses"
      minWidthClass="min-w-[150px]"
    />
  );
}

export function ReportTdsSectionMultiFilter({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const sections = getActiveTDSMasters();
  const selectOptions: ReportMultiSelectOption[] = sections.map((s) => ({
    value: getTdsSectionCode(s),
    label: `${getTdsSectionCode(s)} — ${s.sectionName}`,
    searchText: s.sectionName,
  }));
  return (
    <ReportMultiSelect
      label="TDS Section"
      values={values}
      onChange={onChange}
      options={selectOptions}
      entityName="Section"
      allLabel="All Sections"
      minWidthClass="min-w-[170px]"
    />
  );
}

/** GST Period (month) filter for GST reports */
export function ReportGstPeriodFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-0.5 min-w-[140px]">
      <span className={filterLabelClass}>GST Period</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[140px]")}>
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Company GST registration (GSTIN) filter */
export function ReportGstRegistrationFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-0.5 min-w-[200px]">
      <span className={filterLabelClass}>GST Registration</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterSelectClass, "mt-0 w-[200px]")}>
          <SelectValue placeholder="All registrations" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
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
  const [preset, setPreset] = React.useState<DateRangePresetId>("this_month");

  React.useEffect(() => {
    if (preset === "custom" && !dateFrom && !dateTo) {
      const { from, to } = resolveDateRangePreset("this_month");
      onDateFrom(from);
      onDateTo(to);
    }
  }, [preset, dateFrom, dateTo, onDateFrom, onDateTo]);

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
