"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  ReportFinancialYearFilter,
  ReportStatusMultiFilter,
  ReportFilterSummary,
  ReportFilterResetButton,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { useClientMounted } from "@/lib/use-client-mounted";
import { showToast } from "@/lib/toast";
import {
  AuditTrailApiError,
  AuditTrailApiService,
} from "@/services/audit-trail.service";
import type {
  AuditTrailAction,
  AuditTrailApiRow,
  AuditTrailEntityType,
  AuditTrailExportFormat,
  AuditTrailFiltersConfig,
  AuditTrailQueryParams,
  AuditTrailReportResult,
  AuditTrailSortDirection,
  AuditTrailSortField,
} from "@/types/audit-trail.types";

const TITLE = "Audit Trail";
const DESCRIPTION =
  "Immutable accounts alteration register — one change row per field or status update.";
const COL_SPAN = 11;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_FIELD_MAP: Record<string, AuditTrailSortField> = {
  performed_at: "performed_at",
  entity_type: "entity_type",
  entity_number: "entity_number",
  performed_by_name: "performed_by_name",
  action: "action",
  particular: "particular",
};

function AuditTrailSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

function formatAuditDate(iso: string): string {
  return formatDisplayDate(iso.slice(0, 10), iso);
}

function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const time = iso.split("T")[1];
    return time ? time.slice(0, 5) : "—";
  }
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadgeValue(status: string | null): string {
  if (!status) return "draft";
  return status.toLowerCase().replace(/_/g, " ");
}

const AuditTrailRow = memo(function AuditTrailRow({
  row,
}: {
  row: AuditTrailApiRow;
}) {
  return (
    <AccountsTableRow>
      <AccountsTableCell className="tabular-nums whitespace-nowrap text-xs">
        {formatAuditDate(row.date_time)}
      </AccountsTableCell>
      <AccountsTableCell className="tabular-nums whitespace-nowrap text-xs text-muted-foreground">
        {formatAuditTime(row.date_time)}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs font-medium whitespace-nowrap">
        {row.user_display}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">
        {row.entity_label || row.entity_type_label}
      </AccountsTableCell>
      <AccountsTableCell
        mono
        className="font-semibold text-brand-700 text-xs whitespace-nowrap"
      >
        {row.entity_number ?? "—"}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">
        {row.action_label}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap font-medium">
        {row.particular}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs max-w-[140px] truncate text-muted-foreground tabular-nums"
        title={row.before_alteration}
      >
        {row.before_alteration}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs max-w-[140px] truncate tabular-nums"
        title={row.after_alteration}
      >
        {row.after_alteration}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">
        {row.document_status ? (
          <StatusBadge status={statusBadgeValue(row.document_status)} />
        ) : (
          "—"
        )}
      </AccountsTableCell>
      <AccountsTableCell
        mono
        className="text-xs max-w-[160px] truncate font-semibold text-brand-700"
        title={
          row.accounting_voucher_number
            ? row.accounting_voucher_id ?? row.accounting_voucher_number
            : row.accounting_voucher_id ?? undefined
        }
      >
        {row.accounting_voucher_number ?? "—"}
      </AccountsTableCell>
    </AccountsTableRow>
  );
});

function SortableTh({
  label,
  colKey,
  activeSortKey,
  sortDir,
  onSort,
  sortable = true,
}: {
  label: string;
  colKey: string;
  activeSortKey: string;
  sortDir: AuditTrailSortDirection;
  onSort: (key: string) => void;
  sortable?: boolean;
}) {
  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      sortable={sortable}
      sortKey={activeSortKey}
      sortDir={sortDir}
      onSort={onSort}
      filterable={false}
    />
  );
}

export default function AuditTrailPageClient() {
  const mounted = useClientMounted();
  const appliedDefaults = useRef(false);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");

  const [filtersConfig, setFiltersConfig] =
    useState<AuditTrailFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] =
    useState<AuditTrailSortField>("performed_at");
  const [sortDirection, setSortDirection] =
    useState<AuditTrailSortDirection>("desc");
  const [report, setReport] = useState<AuditTrailReportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<AuditTrailApiError | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    setFiltersError(null);
    void AuditTrailApiService.getFilters(controller.signal)
      .then((config) => {
        if (!controller.signal.aborted) setFiltersConfig(config);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFiltersConfig(null);
        setFiltersError(
          error instanceof AuditTrailApiError
            ? error.message
            : "Failed to load Audit Trail filters.",
        );
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!filtersConfig || appliedDefaults.current) return;
    if (filtersConfig.defaults.financial_year_id) {
      setFinancialYearId(filtersConfig.defaults.financial_year_id);
    }
    if (filtersConfig.defaults.from_date) {
      setDateFrom(filtersConfig.defaults.from_date);
    }
    if (filtersConfig.defaults.to_date) {
      setDateTo(filtersConfig.defaults.to_date);
    }
    setPreset("custom");
    setPageSize(filtersConfig.defaults.page_size || 50);
    setSortField(filtersConfig.defaults.sort_field || "performed_at");
    setSortDirection(filtersConfig.defaults.sort_direction || "desc");
    appliedDefaults.current = true;
  }, [filtersConfig, setDateFrom, setDateTo, setPreset]);

  const entityTypeOptions = useMemo(
    () => filtersConfig?.entity_types ?? [],
    [filtersConfig],
  );

  const actionOptions = useMemo(
    () => filtersConfig?.actions ?? [],
    [filtersConfig],
  );

  const userOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.users ?? []).map((user) => ({
        value: user.user_id,
        label: user.display_name,
        searchText: user.username ?? "",
      })),
    [filtersConfig],
  );

  const queryParams = useMemo<AuditTrailQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    const entityTypeSet = new Set(entityTypeOptions.map((o) => o.value));
    const actionSet = new Set(actionOptions.map((o) => o.value));
    const safeEntityTypes = entityTypes.filter((v): v is AuditTrailEntityType =>
      entityTypeSet.has(v as AuditTrailEntityType),
    );
    const safeActions = actions.filter((v): v is AuditTrailAction =>
      actionSet.has(v as AuditTrailAction),
    );
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      entity_types: safeEntityTypes.length > 0 ? safeEntityTypes : undefined,
      actions: safeActions.length > 0 ? safeActions : undefined,
      user_ids: users.length > 0 ? users : undefined,
      search: debouncedSearch || undefined,
      page,
      page_size: pageSize,
      sort_field: sortField,
      sort_direction: sortDirection,
    };
  }, [
    actionOptions,
    actions,
    dateFrom,
    dateTo,
    debouncedSearch,
    entityTypeOptions,
    entityTypes,
    financialYearId,
    page,
    pageSize,
    sortDirection,
    sortField,
    users,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    entityTypes,
    actions,
    users,
    debouncedSearch,
    sortField,
    sortDirection,
    pageSize,
  ]);

  useEffect(() => {
    if (!queryParams || queryParams.from_date > queryParams.to_date) {
      setReportLoading(false);
      if (!queryParams) setReport(null);
      return;
    }
    const controller = new AbortController();
    setReportLoading(true);
    setReportError(null);
    void AuditTrailApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setReport(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setReportError(
          error instanceof AuditTrailApiError
            ? error
            : new AuditTrailApiError(
                error instanceof Error
                  ? error.message
                  : "Failed to load Audit Trail.",
              ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });
    return () => controller.abort();
  }, [queryParams, retryKey]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setEntityTypes([]);
    setUsers([]);
    setActions([]);
    setPage(1);
    setSortField("performed_at");
    setSortDirection("desc");
    if (filtersConfig?.defaults.financial_year_id) {
      setFinancialYearId(filtersConfig.defaults.financial_year_id);
    }
    if (filtersConfig?.defaults.from_date) {
      setDateFrom(filtersConfig.defaults.from_date);
    }
    if (filtersConfig?.defaults.to_date) {
      setDateTo(filtersConfig.defaults.to_date);
    }
    if (filtersConfig?.defaults.page_size) {
      setPageSize(filtersConfig.defaults.page_size);
    }
    setPreset("custom");
  }, [filtersConfig, setDateFrom, setDateTo, setPreset]);

  const handleFinancialYearChange = useCallback(
    (value: string) => {
      setFinancialYearId(value);
      const fy = filtersConfig?.financial_years.find(
        (item) => item.financial_year_id === value,
      );
      if (fy) {
        setDateFrom(fy.start_date);
        setDateTo(fy.end_date);
        setPreset("custom");
      }
    },
    [filtersConfig, setDateFrom, setDateTo, setPreset],
  );

  const handleSort = useCallback((colKey: string) => {
    const backendField = SORT_FIELD_MAP[colKey];
    if (!backendField) return;
    setSortField((current) => {
      if (current === backendField) {
        setSortDirection((order) => (order === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDirection("desc");
      return backendField;
    });
  }, []);

  const handleExport = useCallback(
    async (format: AuditTrailExportFormat) => {
      if (!queryParams || exporting) return;
      setExporting(true);
      try {
        await AuditTrailApiService.exportReport({
          ...queryParams,
          format,
        });
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to export Audit Trail.",
          "error",
        );
      } finally {
        setExporting(false);
      }
    },
    [exporting, queryParams],
  );

  const rows = report?.rows ?? [];
  const pagination = report?.pagination;
  const totalRows = pagination?.total_rows ?? 0;

  const hasActiveFilters =
    entityTypes.length > 0 ||
    users.length > 0 ||
    actions.length > 0 ||
    Boolean(search.trim());

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const fyLabel =
      filtersConfig?.financial_years.find(
        (fy) => fy.financial_year_id === financialYearId,
      )?.name ?? null;

    return [
      fyLabel
        ? {
            id: "fy",
            label: "Financial Year",
            value: fyLabel,
            onRemove: undefined,
          }
        : null,
      buildEntityFilterSummary(
        "entityType",
        "Entity Types",
        entityTypes,
        entityTypeOptions,
        () => setEntityTypes([]),
      ),
      buildEntityFilterSummary(
        "user",
        "Users",
        users,
        userOptions,
        () => setUsers([]),
      ),
      buildEntityFilterSummary(
        "action",
        "Actions",
        actions,
        actionOptions,
        () => setActions([]),
      ),
      search.trim()
        ? {
            id: "search",
            label: "Search",
            value: search.trim(),
            onRemove: () => setSearch(""),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    actionOptions,
    actions,
    entityTypeOptions,
    entityTypes,
    filtersConfig,
    financialYearId,
    search,
    userOptions,
    users,
  ]);

  const emptyMessage = useMemo(() => {
    if (debouncedSearch) {
      return "No records match the current search.";
    }
    return "No audit records found for the selected filters.";
  }, [debouncedSearch]);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", TITLE)}
        title={TITLE}
        description={DESCRIPTION}
      >
        <AuditTrailSkeleton />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", TITLE)}
      title={TITLE}
      description={DESCRIPTION}
      filters={
        <>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={() => void handleExport("EXCEL")}
                onPdf={() => void handleExport("PDF")}
                disabled={
                  exporting ||
                  reportLoading ||
                  !queryParams ||
                  totalRows === 0
                }
              />
            }
          >
            <ReportFinancialYearFilter
              value={financialYearId || "all"}
              onChange={handleFinancialYearChange}
            />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportStatusMultiFilter
              values={entityTypes}
              onChange={setEntityTypes}
              options={entityTypeOptions}
              label="Entity Type"
            />
            <ReportStatusMultiFilter
              values={actions}
              onChange={setActions}
              options={actionOptions}
              label="Action"
            />
            <ReportStatusMultiFilter
              values={users}
              onChange={setUsers}
              options={userOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              label="User"
            />
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Document no., particular, user…"
            />
          </ReportFilterRow>
          <div className="flex items-center gap-2 w-full">
            <ReportFilterSummary items={filterSummaryItems} />
            <ReportFilterResetButton
              onClick={clearFilters}
              showOnlyWhenActive
              active={hasActiveFilters}
            />
          </div>
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      {filtersError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p>{filtersError}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {reportError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p>{reportError.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <AccountsTableListing
        footer={
          totalRows > 0 ? (
            <AccountsTablePagination
              page={pagination?.page ?? page}
              pageSize={pagination?.page_size ?? pageSize}
              totalRecords={totalRows}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        {reportLoading && rows.length === 0 ? (
          <AuditTrailSkeleton />
        ) : (
          <AccountsTable minWidth={1620}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortableTh
                  label="Date"
                  colKey="performed_at"
                  activeSortKey={sortField}
                  sortDir={sortDirection}
                  onSort={handleSort}
                />
                <AccountsColumnHeader
                  label="Time"
                  colKey="time"
                  sortable={false}
                  filterable={false}
                />
                <SortableTh
                  label="User"
                  colKey="performed_by_name"
                  activeSortKey={sortField}
                  sortDir={sortDirection}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Entity"
                  colKey="entity_type"
                  activeSortKey={sortField}
                  sortDir={sortDirection}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Document No."
                  colKey="entity_number"
                  activeSortKey={sortField}
                  sortDir={sortDirection}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Action"
                  colKey="action"
                  activeSortKey={sortField}
                  sortDir={sortDirection}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Particular"
                  colKey="particular"
                  activeSortKey={sortField}
                  sortDir={sortDirection}
                  onSort={handleSort}
                />
                <AccountsColumnHeader
                  label="Before Alteration"
                  colKey="before_alteration"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="After Alteration"
                  colKey="after_alteration"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Document Status"
                  colKey="document_status"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Accounting Voucher"
                  colKey="accounting_voucher_id"
                  sortable={false}
                  filterable={false}
                />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {!queryParams ? (
                <AccountsTableEmpty
                  colSpan={COL_SPAN}
                  message="Select a financial year and date range to load the audit trail."
                />
              ) : rows.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={COL_SPAN}
                  message={emptyMessage}
                  onClear={hasActiveFilters ? clearFilters : undefined}
                />
              ) : (
                rows.map((row) => <AuditTrailRow key={row.id} row={row} />)
              )}
            </AccountsTableBody>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
