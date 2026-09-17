"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTableEmpty, AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFilterSummary,
  ReportFinancialYearFilter,
  ReportLedgerFilter,
  ReportMoreFilters,
  ReportVoucherTypeMultiFilter,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  DAY_BOOK_DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { formatDisplayDate, todayIsoDate } from "@/lib/accounts/date-display";
import { formatMoneyString, formatMoneyStringOrDash } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { LedgerService, type LedgerDropdownItem } from "@/services/ledger.service";
import { DayBookApiError, DayBookApiService } from "@/services/day-book.service";
import type {
  DayBookBalanceSideFilter,
  DayBookExportFormat,
  DayBookFiltersConfig,
  DayBookMoreFilters,
  DayBookQueryParams,
  DayBookReportResponse,
  DayBookVoucher,
} from "@/types/day-book.types";

const COL_SPAN = 9;
const PAGE_PATH = "/accounts/reports/day-book";

const EMPTY_MORE: DayBookMoreFilters = {
  ledgerId: "",
  balanceSide: "ALL",
  voucherNumber: "",
  reference: "",
};

function splitParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.toLowerCase() !== "all");
}

function parseBalanceSide(value: string | null): DayBookBalanceSideFilter {
  const upper = (value ?? "").toUpperCase();
  if (upper === "DEBIT" || upper === "CREDIT") return upper;
  return "ALL";
}

function parsePageSize(value: string | null): number {
  const parsed = Number(value);
  if (parsed === 50 || parsed === 100) return parsed;
  return 25;
}

function DayBookSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

function fullVoucherUnbalanced(voucher: DayBookVoucher): boolean {
  if (voucher.is_balanced === false) return true;
  return voucher.voucher_total.is_balanced === false;
}

function displayParty(value: string | null): string {
  return value?.trim() || "—";
}

function DayBookLineTable({ voucher }: { voucher: DayBookVoucher }) {
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-muted-foreground">
          <th className="px-3 py-1.5 text-left font-medium">Ledger Code</th>
          <th className="px-3 py-1.5 text-left font-medium">Ledger Name</th>
          <th className="px-3 py-1.5 text-right font-medium">Debit</th>
          <th className="px-3 py-1.5 text-right font-medium">Credit</th>
          <th className="px-3 py-1.5 text-left font-medium">Branch / Warehouse</th>
          <th className="px-3 py-1.5 text-left font-medium">Narration</th>
        </tr>
      </thead>
      <tbody>
        {voucher.lines.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3 py-2 text-muted-foreground">
              No accounting lines in this view.
            </td>
          </tr>
        ) : (
          voucher.lines.map((line) => (
            <tr key={line.accounting_voucher_line_id} className="border-t border-border/40">
              <td className="px-3 py-1.5 font-mono text-brand-700">{line.ledger_code || "—"}</td>
              <td className="px-3 py-1.5">{line.ledger_name}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatMoneyStringOrDash(line.debit)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatMoneyStringOrDash(line.credit)}</td>
              <td className="px-3 py-1.5">{line.warehouse_name || "—"}</td>
              <td className="px-3 py-1.5 max-w-[240px] truncate" title={line.narration ?? undefined}>
                {line.narration || "—"}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function DayBookPageContent() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useRef(false);
  const appliedDefaults = useRef(false);

  const [filtersConfig, setFiltersConfig] = useState<DayBookFiltersConfig | null>(null);
  const [ledgers, setLedgers] = useState<LedgerDropdownItem[]>([]);
  const [financialYearId, setFinancialYearId] = useState("");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [draftMore, setDraftMore] = useState<DayBookMoreFilters>(EMPTY_MORE);
  const [appliedMore, setAppliedMore] = useState<DayBookMoreFilters>(EMPTY_MORE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [report, setReport] = useState<DayBookReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<DayBookApiError | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mounted || hydrated.current) return;
    hydrated.current = true;
    const fy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
    if (fy && fy !== "all") setFinancialYearId(fy);
    const from = searchParams.get("fromDate") ?? searchParams.get("from");
    const to = searchParams.get("toDate") ?? searchParams.get("to");
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    if (from || to) setPreset("custom");
    setBranches(splitParam(searchParams.get("branch")));
    setVoucherTypes(splitParam(searchParams.get("voucherType")));
    const more: DayBookMoreFilters = {
      ledgerId: searchParams.get("ledgerId") ?? "",
      balanceSide: parseBalanceSide(searchParams.get("balanceSide")),
      voucherNumber: searchParams.get("voucherNumber") ?? "",
      reference: searchParams.get("reference") ?? "",
    };
    setDraftMore(more);
    setAppliedMore(more);
    const urlPage = Number(searchParams.get("page"));
    if (Number.isInteger(urlPage) && urlPage > 0) setPage(urlPage);
    setPageSize(parsePageSize(searchParams.get("pageSize")));
    setReady(true);
  }, [mounted, searchParams]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void DayBookApiService.getFilters(controller.signal)
      .then((config) => setFiltersConfig(config))
      .catch(() => {
        if (!controller.signal.aborted) setFiltersConfig(null);
      });
    void LedgerService.getDropdown({ status: "ACTIVE" }, controller.signal)
      .then((result) => setLedgers(result.ledgers))
      .catch(() => {
        if (!controller.signal.aborted) setLedgers([]);
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!ready || !filtersConfig || appliedDefaults.current) return;
    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId");
    const urlFrom = searchParams.get("fromDate") ?? searchParams.get("from");
    const urlTo = searchParams.get("toDate") ?? searchParams.get("to");
    if ((!urlFy || urlFy === "all") && filtersConfig.defaults.financial_year_id) {
      setFinancialYearId((current) =>
        current && current !== "all" ? current : filtersConfig.defaults.financial_year_id || current,
      );
    }
    if (!urlFrom && !urlTo) {
      if (filtersConfig.defaults.from_date) setDateFrom(filtersConfig.defaults.from_date);
      if (filtersConfig.defaults.to_date) setDateTo(filtersConfig.defaults.to_date);
      setPreset("custom");
    }
    appliedDefaults.current = true;
  }, [filtersConfig, ready, searchParams]);

  const branchOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        value: branch.warehouse_id,
        label: branch.warehouse_name,
      })),
    [filtersConfig],
  );

  const voucherTypeOptions = filtersConfig?.voucher_types ?? [];
  const balanceSideOptions = filtersConfig?.balance_sides ?? [
    { value: "ALL" as const, label: "All" },
    { value: "DEBIT" as const, label: "Debit" },
    { value: "CREDIT" as const, label: "Credit" },
  ];

  const ledgerOptions = useMemo(
    () =>
      ledgers.map((ledger) => ({
        id: ledger.ledgerId,
        name: ledger.ledgerCode ? `${ledger.ledgerCode} — ${ledger.ledgerName}` : ledger.ledgerName,
      })),
    [ledgers],
  );

  const queryParams = useMemo<DayBookQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) return null;
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      branch_ids: branches,
      voucher_types: voucherTypes,
      ledger_id: appliedMore.ledgerId || undefined,
      balance_side: appliedMore.balanceSide,
      voucher_number: appliedMore.voucherNumber.trim() || undefined,
      reference: appliedMore.reference.trim() || undefined,
      page,
      page_size: pageSize,
    };
  }, [appliedMore, branches, dateFrom, dateTo, financialYearId, page, pageSize, voucherTypes]);

  useEffect(() => {
    if (!ready || !queryParams || queryParams.from_date > queryParams.to_date) {
      setReportLoading(false);
      if (!queryParams) setReport(null);
      return;
    }
    const controller = new AbortController();
    setReportLoading(true);
    setReportError(null);
    void DayBookApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setReport(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setReportError(
          error instanceof DayBookApiError
            ? error
            : new DayBookApiError(error instanceof Error ? error.message : "Failed to load Day Book."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });
    return () => controller.abort();
  }, [queryParams, ready, refreshKey]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (financialYearId && financialYearId !== "all") params.set("fy", financialYearId);
    if (dateFrom) params.set("fromDate", dateFrom);
    if (dateTo) params.set("toDate", dateTo);
    if (branches.length > 0) params.set("branch", branches.join(","));
    if (voucherTypes.length > 0) params.set("voucherType", voucherTypes.join(","));
    if (appliedMore.ledgerId) params.set("ledgerId", appliedMore.ledgerId);
    if (appliedMore.balanceSide !== "ALL") params.set("balanceSide", appliedMore.balanceSide);
    if (appliedMore.voucherNumber.trim()) params.set("voucherNumber", appliedMore.voucherNumber.trim());
    if (appliedMore.reference.trim()) params.set("reference", appliedMore.reference.trim());
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 25) params.set("pageSize", String(pageSize));
    const next = params.toString();
    const current = window.location.search.replace(/^\?/, "");
    if (next !== current) {
      router.replace(next ? `${PAGE_PATH}?${next}` : PAGE_PATH, { scroll: false });
    }
  }, [
    appliedMore,
    branches,
    dateFrom,
    dateTo,
    financialYearId,
    page,
    pageSize,
    ready,
    router,
    voucherTypes,
  ]);

  useEffect(() => {
    const visible = new Set((report?.data ?? []).map((voucher) => voucher.accounting_voucher_id));
    setExpanded((current) => {
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [report]);

  const resetPage = useCallback(() => setPage(1), []);

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      setFinancialYearId(fyId);
      resetPage();
      if (!fyId || fyId === "all") return;
      const fy = filtersConfig?.financial_years.find((item) => item.financial_year_id === fyId);
      if (!fy) return;
      const today = todayIsoDate();
      setDateFrom(fy.start_date);
      setDateTo(today >= fy.start_date && today <= fy.end_date ? today : fy.end_date);
      setPreset("custom");
    },
    [filtersConfig, resetPage],
  );

  const handlePresetChange = useCallback(
    (next: DateRangePresetId) => {
      setPreset(next);
      resetPage();
      if (next !== "custom") {
        const range = resolveDateRangePreset(next);
        setDateFrom(range.from);
        setDateTo(range.to);
      }
    },
    [resetPage],
  );

  const applyMoreFilters = useCallback(() => {
    setAppliedMore({
      ledgerId: draftMore.ledgerId,
      balanceSide: draftMore.balanceSide,
      voucherNumber: draftMore.voucherNumber.trim(),
      reference: draftMore.reference.trim(),
    });
    resetPage();
  }, [draftMore, resetPage]);

  const resetFilters = useCallback(() => {
    const fyId = filtersConfig?.defaults.financial_year_id ?? "";
    setFinancialYearId(fyId);
    setDateFrom(filtersConfig?.defaults.from_date ?? "");
    setDateTo(filtersConfig?.defaults.to_date ?? "");
    setPreset("custom");
    setBranches([]);
    setVoucherTypes([]);
    setDraftMore(EMPTY_MORE);
    setAppliedMore(EMPTY_MORE);
    setPage(1);
    setPageSize(25);
  }, [filtersConfig]);

  const toggleExpanded = useCallback((voucherId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(voucherId)) next.delete(voucherId);
      else next.add(voucherId);
      return next;
    });
  }, []);

  const handleExport = useCallback(
    async (format: DayBookExportFormat) => {
      if (!queryParams || exporting) return;
      setExporting(true);
      try {
        await DayBookApiService.exportReport({ ...queryParams, format });
      } catch (error) {
        const message =
          error instanceof DayBookApiError ? error.message : "Failed to export Day Book.";
        showToast(message, "error");
      } finally {
        setExporting(false);
      }
    },
    [exporting, queryParams],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const items: ReportFilterSummaryItem[] = [];
    if (branches.length > 0) {
      const names = branches.map(
        (id) => branchOptions.find((option) => option.value === id)?.label ?? id,
      );
      items.push({
        id: "branch",
        label: "Branches",
        value: names.length === 1 ? names[0] : `${names.length} selected`,
        onRemove: () => {
          setBranches([]);
          resetPage();
        },
      });
    }
    const voucherSummary = buildEntityFilterSummary(
      "voucherType",
      "Voucher Types",
      voucherTypes,
      voucherTypeOptions,
      () => {
        setVoucherTypes([]);
        resetPage();
      },
    );
    if (voucherSummary) items.push(voucherSummary);
    if (appliedMore.ledgerId) {
      items.push({
        id: "ledger",
        label: "Ledger",
        value: ledgerOptions.find((ledger) => ledger.id === appliedMore.ledgerId)?.name ?? "Ledger",
        onRemove: () => {
          const next = { ...appliedMore, ledgerId: "" };
          setAppliedMore(next);
          setDraftMore(next);
          resetPage();
        },
      });
    }
    if (appliedMore.balanceSide !== "ALL") {
      items.push({
        id: "balanceSide",
        label: "Dr / Cr",
        value: appliedMore.balanceSide === "DEBIT" ? "Debit" : "Credit",
        onRemove: () => {
          const next = { ...appliedMore, balanceSide: "ALL" as const };
          setAppliedMore(next);
          setDraftMore(next);
          resetPage();
        },
      });
    }
    if (appliedMore.voucherNumber) {
      items.push({
        id: "voucherNumber",
        label: "Voucher No.",
        value: appliedMore.voucherNumber,
        onRemove: () => {
          const next = { ...appliedMore, voucherNumber: "" };
          setAppliedMore(next);
          setDraftMore(next);
          resetPage();
        },
      });
    }
    if (appliedMore.reference) {
      items.push({
        id: "reference",
        label: "Reference",
        value: appliedMore.reference,
        onRemove: () => {
          const next = { ...appliedMore, reference: "" };
          setAppliedMore(next);
          setDraftMore(next);
          resetPage();
        },
      });
    }
    return items;
  }, [appliedMore, branchOptions, branches, ledgerOptions, resetPage, voucherTypeOptions, voucherTypes]);

  const moreFiltersActive =
    Number(Boolean(appliedMore.ledgerId)) +
    Number(appliedMore.balanceSide !== "ALL") +
    Number(Boolean(appliedMore.voucherNumber)) +
    Number(Boolean(appliedMore.reference));

  const hasFilters =
    branches.length > 0 ||
    voucherTypes.length > 0 ||
    moreFiltersActive > 0 ||
    preset !== "custom" ||
    (filtersConfig?.defaults.financial_year_id != null &&
      financialYearId !== filtersConfig.defaults.financial_year_id) ||
    (filtersConfig?.defaults.from_date != null && dateFrom !== filtersConfig.defaults.from_date) ||
    (filtersConfig?.defaults.to_date != null && dateTo !== filtersConfig.defaults.to_date);

  const needsFinancialYear = ready && (!financialYearId || financialYearId === "all");
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const initialLoading = reportLoading && !report;
  const hasRows = (report?.pagination.total_vouchers ?? 0) > 0;
  const exportDisabled = exporting || !queryParams || !hasRows || Boolean(reportError);
  const summary = report?.summary;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Day Book")}
      title="Day Book"
      description="Chronological register of posted accounting vouchers for the selected period."
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            end={
              <AccountsExportMenu
                onExcel={() => void handleExport("EXCEL")}
                onPdf={() => void handleExport("PDF")}
                disabled={exportDisabled}
              />
            }
          >
            <ReportFinancialYearFilter value={financialYearId || "all"} onChange={handleFinancialYearChange} />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={handlePresetChange}
              onDateFromChange={(value) => {
                setDateFrom(value);
                setPreset("custom");
                resetPage();
              }}
              onDateToChange={(value) => {
                setDateTo(value);
                setPreset("custom");
                resetPage();
              }}
              presetOptions={DAY_BOOK_DATE_RANGE_PRESET_OPTIONS}
            />
            <ReportBranchMultiFilter
              values={branches}
              onChange={(values) => {
                setBranches(values);
                resetPage();
              }}
              labeledOptions={branchOptions}
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={(values) => {
                setVoucherTypes(values);
                resetPage();
              }}
              options={voucherTypeOptions}
            />
            <ReportMoreFilters activeCount={moreFiltersActive}>
              <ReportLedgerFilter
                label="Ledger"
                value={draftMore.ledgerId}
                onChange={(ledgerId) => setDraftMore((current) => ({ ...current, ledgerId }))}
                ledgers={ledgerOptions}
              />
              <div className="space-y-1">
                <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Dr / Cr</span>
                <select
                  value={draftMore.balanceSide}
                  onChange={(event) =>
                    setDraftMore((current) => ({
                      ...current,
                      balanceSide: event.target.value as DayBookBalanceSideFilter,
                    }))
                  }
                  className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}
                >
                  {balanceSideOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Voucher No.</span>
                <input
                  value={draftMore.voucherNumber}
                  onChange={(event) =>
                    setDraftMore((current) => ({ ...current, voucherNumber: event.target.value }))
                  }
                  className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full px-2")}
                  placeholder="Search voucher number"
                />
              </div>
              <div className="space-y-1">
                <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Reference</span>
                <input
                  value={draftMore.reference}
                  onChange={(event) =>
                    setDraftMore((current) => ({ ...current, reference: event.target.value }))
                  }
                  className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full px-2")}
                  placeholder="Document or reference number"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "h-8 text-xs")}
                onClick={applyMoreFilters}
              >
                Apply
              </Button>
            </ReportMoreFilters>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "h-8 text-xs font-medium")}
                onClick={resetFilters}
              >
                Clear Filters
              </Button>
            )}
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
          {needsFinancialYear ? (
            <p className="px-1 text-xs text-red-600">Select a financial year. Day Book does not support All years.</p>
          ) : null}
          {dateInvalid ? (
            <p className="px-1 text-xs text-red-600">From Date must be less than or equal to To Date.</p>
          ) : null}
          {reportError ? (
            <div className="px-1 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{reportError.message}</span>
              {reportError.status !== 400 && reportError.status !== 403 ? (
                <button
                  type="button"
                  className="text-brand-600 hover:underline"
                  onClick={() => setRefreshKey((value) => value + 1)}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {report?.scope.balance_health === "WAREHOUSE_NOT_APPLICABLE" ? (
            <p className="px-1 text-[11px] text-muted-foreground">{report.notes.balance_health}</p>
          ) : null}
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <div className={cn("flex flex-col flex-1 min-h-0", reportLoading && report && "opacity-70")}>
          {initialLoading || !ready ? (
            <DayBookSkeleton />
          ) : (
            <>
              <AccountsTableScroll>
                <AccountsTable minWidth={1180} className="text-xs financial-report">
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      <AccountsColumnHeader label="" colKey="expand" sortable={false} filterable={false} className="w-8" />
                      <AccountsColumnHeader label="Date" colKey="date" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="Voucher Type" colKey="voucherType" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="Voucher No." colKey="voucherNo" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="Ledger / Party Name" colKey="party" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="Narration" colKey="narration" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="Debit" colKey="debit" align="right" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="Credit" colKey="credit" align="right" sortable={false} filterable={false} />
                      <AccountsColumnHeader label="View" colKey="view" sortable={false} filterable={false} />
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {reportError ? (
                      <AccountsTableEmpty colSpan={COL_SPAN} message={reportError.message} />
                    ) : !report || report.data.length === 0 ? (
                      <AccountsTableEmpty
                        colSpan={COL_SPAN}
                        message="No posted accounting transactions found for the selected period."
                        onClear={hasFilters ? resetFilters : undefined}
                      />
                    ) : (
                      report.data.map((voucher) => {
                        const open = expanded.has(voucher.accounting_voucher_id);
                        const unbalanced = fullVoucherUnbalanced(voucher);
                        return (
                          <FragmentRows
                            key={voucher.accounting_voucher_id}
                            voucher={voucher}
                            open={open}
                            unbalanced={unbalanced}
                            onToggle={() => toggleExpanded(voucher.accounting_voucher_id)}
                          />
                        );
                      })
                    )}
                  </AccountsTableBody>
                  {summary && hasRows && !reportError ? (
                    <AccountsTableFoot>
                      <AccountsTableRow className="bg-brand-50/30 font-semibold border-t-2 border-foreground/20">
                        <AccountsTableCell colSpan={6} className="text-xs font-bold py-2">
                          Report Total ({summary.voucher_count} vouchers)
                        </AccountsTableCell>
                        <AccountsTableCell
                          align="right"
                          money
                          className={cn("py-2 font-bold", summary.is_balanced === false && "text-red-600")}
                        >
                          {formatMoneyString(summary.total_debit)}
                        </AccountsTableCell>
                        <AccountsTableCell
                          align="right"
                          money
                          className={cn("py-2 font-bold", summary.is_balanced === false && "text-red-600")}
                        >
                          {formatMoneyString(summary.total_credit)}
                        </AccountsTableCell>
                        <AccountsTableCell className="py-2" />
                      </AccountsTableRow>
                    </AccountsTableFoot>
                  ) : null}
                </AccountsTable>
              </AccountsTableScroll>
              {summary && hasRows && !reportError ? (
                <>
                  {summary.is_balanced === false ? (
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border-t bg-amber-50/80 border-amber-100 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Day Book totals are not balanced. Debit/Credit Difference: {formatMoneyString(summary.difference)}
                    </div>
                  ) : summary.is_balanced === true ? (
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border-t bg-emerald-50/80 border-emerald-100 text-xs text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Total Debit and Total Credit are balanced.
                    </div>
                  ) : null}
                  <div className="flex-shrink-0">
                    <AccountsTablePagination
                      page={report?.pagination.page ?? page}
                      pageSize={report?.pagination.page_size ?? pageSize}
                      totalRecords={report?.pagination.total_vouchers ?? 0}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      recordLabel="vouchers"
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}

function FragmentRows({
  voucher,
  open,
  unbalanced,
  onToggle,
}: {
  voucher: DayBookVoucher;
  open: boolean;
  unbalanced: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <AccountsTableRow className={cn("group", unbalanced && "bg-red-50/40")}>
        <AccountsTableCell className="py-2 w-8">
          <button
            type="button"
            className="p-1 rounded-md hover:bg-muted"
            aria-expanded={open}
            aria-label={open ? "Collapse voucher lines" : "Expand voucher lines"}
            onClick={onToggle}
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </AccountsTableCell>
        <AccountsTableCell className="whitespace-nowrap py-2">
          {formatDisplayDate(voucher.voucher_date)}
        </AccountsTableCell>
        <AccountsTableCell className="whitespace-nowrap py-2">
          <span>{voucher.voucher_type_label}</span>
          {voucher.is_reversal ? (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              Reversal
            </span>
          ) : null}
          {voucher.status === "REVERSED" ? (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              Reversed
            </span>
          ) : null}
        </AccountsTableCell>
        <AccountsTableCell mono className="whitespace-nowrap py-2">
          <span className="font-semibold text-brand-700">{voucher.voucher_number}</span>
        </AccountsTableCell>
        <AccountsTableCell className="max-w-[180px] truncate py-2" title={displayParty(voucher.party_or_reference)}>
          {displayParty(voucher.party_or_reference)}
        </AccountsTableCell>
        <AccountsTableCell
          className="max-w-[220px] truncate py-2 text-muted-foreground"
          title={voucher.narration ?? undefined}
        >
          {voucher.narration || "—"}
          {unbalanced ? (
            <span className="mt-0.5 block text-[10px] font-medium text-red-600">
              Unbalanced voucher. Difference {formatMoneyString(voucher.voucher_total.difference)}
            </span>
          ) : null}
        </AccountsTableCell>
        <AccountsTableCell align="right" money className="whitespace-nowrap py-2">
          {formatMoneyStringOrDash(voucher.total_debit)}
        </AccountsTableCell>
        <AccountsTableCell align="right" money className="whitespace-nowrap py-2">
          {formatMoneyStringOrDash(voucher.total_credit)}
        </AccountsTableCell>
        <AccountsTableCell className="py-2">
          {voucher.view_href ? (
            <Link href={voucher.view_href} className="text-xs font-medium text-brand-700 hover:underline">
              View
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </AccountsTableCell>
      </AccountsTableRow>
      {open ? (
        <AccountsTableRow className="bg-muted/20">
          <AccountsTableCell colSpan={COL_SPAN} className="p-0 border-b border-border/60">
            <div className="pl-8 pr-2 py-1">
              <DayBookLineTable voucher={voucher} />
            </div>
          </AccountsTableCell>
        </AccountsTableRow>
      ) : null}
    </>
  );
}

export default function DayBookPageClient() {
  return (
    <Suspense fallback={<DayBookSkeleton />}>
      <DayBookPageContent />
    </Suspense>
  );
}
