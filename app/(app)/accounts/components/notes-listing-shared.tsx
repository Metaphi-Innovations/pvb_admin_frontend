"use client";

import { RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  ReportDateRangeFilter,
  ReportFilterResetButton,
  ReportFilterRow,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { ReportMoreFilters } from "@/components/accounts/ReportMoreFilters";
import { ReportMultiSelect } from "@/components/accounts/ReportMultiSelect";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";
import { cn } from "@/lib/utils";

export interface NotesListingFilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  preset: DateRangePresetId;
  branches: string[];
  parties: string[];
  sources: string[];
  status: string;
  voucherNo: string;
  invoiceNo: string;
}

export const EMPTY_NOTES_FILTERS: NotesListingFilterState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  preset: "this_month",
  branches: [],
  parties: [],
  sources: [],
  status: "all",
  voucherNo: "",
  invoiceNo: "",
};

export function notesListingFiltersActive(
  current: NotesListingFilterState,
  baseline: NotesListingFilterState = EMPTY_NOTES_FILTERS,
): boolean {
  return (
    current.search !== baseline.search ||
    current.dateFrom !== baseline.dateFrom ||
    current.dateTo !== baseline.dateTo ||
    current.preset !== baseline.preset ||
    current.branches.length > 0 ||
    current.parties.length > 0 ||
    current.sources.length > 0 ||
    current.status !== baseline.status ||
    current.voucherNo !== baseline.voucherNo ||
    current.invoiceNo !== baseline.invoiceNo
  );
}

export function NotesListHeaderActions({
  onRefresh,
  onExportExcel,
  onExportPdf,
  exportDisabled,
  createLabel,
  onCreate,
}: {
  onRefresh: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  exportDisabled?: boolean;
  createLabel: string;
  onCreate: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        title="Refresh"
        onClick={onRefresh}
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
      {(onExportExcel || onExportPdf) && (
        <AccountsExportMenu
          onExcel={onExportExcel}
          onPdf={onExportPdf}
          disabled={exportDisabled}
        />
      )}
      <Button
        size="sm"
        className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5 px-2.5"
        onClick={onCreate}
      >
        <Plus className="w-3.5 h-3.5" />
        {createLabel}
      </Button>
    </div>
  );
}

interface NotesListingFilterBarProps {
  filters: NotesListingFilterState;
  partyLabel: "Customer" | "Vendor";
  sourceOptions: ReportMultiSelectOption[];
  branchOptions: ReportMultiSelectOption[];
  partyOptions: ReportMultiSelectOption[];
  statusOptions: { value: string; label: string }[];
  searchPlaceholder: string;
  onChange: (patch: Partial<NotesListingFilterState>) => void;
  onReset: () => void;
}

export function NotesListingFilterBar({
  filters,
  partyLabel,
  sourceOptions,
  branchOptions,
  partyOptions,
  statusOptions,
  searchPlaceholder,
  onChange,
  onReset,
}: NotesListingFilterBarProps) {
  const moreActiveCount =
    (filters.status !== "all" ? 1 : 0) +
    (filters.voucherNo.trim() ? 1 : 0) +
    (filters.invoiceNo.trim() ? 1 : 0);

  return (
    <ReportFilterRow>
      <ReportSearchFilter
        value={filters.search}
        onChange={(search) => onChange({ search })}
        placeholder={searchPlaceholder}
        className="min-w-[180px] flex-1 max-w-sm"
      />
      <ReportDateRangeFilter
        preset={filters.preset}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onPresetChange={(preset) => onChange({ preset })}
        onDateFromChange={(dateFrom) => onChange({ dateFrom, preset: "custom" })}
        onDateToChange={(dateTo) => onChange({ dateTo, preset: "custom" })}
      />
      <ReportMultiSelect
        label="Branch"
        values={filters.branches}
        onChange={(branches) => onChange({ branches })}
        options={branchOptions}
        entityName="Branch"
        minWidthClass="min-w-[120px]"
      />
      <ReportMultiSelect
        label={partyLabel}
        values={filters.parties}
        onChange={(parties) => onChange({ parties })}
        options={partyOptions}
        entityName={partyLabel}
        minWidthClass="min-w-[130px]"
      />
      <ReportMultiSelect
        label="Source"
        values={filters.sources}
        onChange={(sources) => onChange({ sources })}
        options={sourceOptions}
        entityName="Source"
        minWidthClass="min-w-[120px]"
      />
      <ReportMoreFilters activeCount={moreActiveCount}>
        <div className="space-y-1.5">
          <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Status</Label>
          <Select value={filters.status} onValueChange={(status) => onChange({ status })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Voucher Number</Label>
          <Input
            value={filters.voucherNo}
            onChange={(e) => onChange({ voucherNo: e.target.value })}
            placeholder="CN-2026-0001 / DN-…"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Invoice Number</Label>
          <Input
            value={filters.invoiceNo}
            onChange={(e) => onChange({ invoiceNo: e.target.value })}
            placeholder="INV-… / PUR-…"
            className="h-8 text-xs"
          />
        </div>
      </ReportMoreFilters>
      <ReportFilterResetButton
        showOnlyWhenActive
        active={notesListingFiltersActive(filters)}
        onClick={onReset}
      />
    </ReportFilterRow>
  );
}

export function resetNotesListingFilters(defaultPreset: DateRangePresetId = "this_month"): NotesListingFilterState {
  return { ...EMPTY_NOTES_FILTERS, preset: defaultPreset };
}

export const NOTES_MODULE_TABS = [
  { id: "pending", label: "Pending" },
  { id: "records", label: "All" },
] as const;

export const NOTES_STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "posted", label: "Posted" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export const NOTES_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Posted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export function uniqueOptionsFromValues(values: string[]): ReportMultiSelectOption[] {
  return [...new Set(values.filter(Boolean))].sort().map((v) => ({ value: v, label: v }));
}

export function matchesMulti(values: string[], field: string): boolean {
  return values.length === 0 || values.includes(field);
}
