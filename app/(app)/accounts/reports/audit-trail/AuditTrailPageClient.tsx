"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
  ACCOUNTS_DEFAULT_PAGE_SIZE,
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  ReportFinancialYearFilter,
  ReportVoucherTypeMultiFilter,
  ReportStatusMultiFilter,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  SortTh,
  StatusBadge,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  AUDIT_TRAIL_ACTION_OPTIONS,
  AUDIT_TRAIL_USER_OPTIONS,
  AUDIT_TRAIL_VOUCHER_TYPE_OPTIONS,
  filterAuditTrail,
  formatAuditTrailDate,
  formatAuditTrailTime,
  type AuditTrailRecord,
} from "@/lib/accounts/audit-trail-data";
import { accountsDataService } from "@/lib/accounts/accounts-data-service";
import {
  ensureFinancialYearsCurrent,
  loadFinancialYears,
} from "@/app/(app)/accounts/masters/masters-data";
import { defaultDayBookFyDateRange } from "@/lib/accounts/day-book-data";

function exportAuditTrailCsv(rows: AuditTrailRecord[]) {
  const headers = [
    "Date",
    "Time",
    "Voucher Type",
    "Voucher No.",
    "User",
    "Action",
    "Particular",
    "Before Alteration",
    "After Alteration",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      formatAuditTrailDate(r.dateTime),
      formatAuditTrailTime(r.dateTime),
      r.voucherType,
      r.voucherNo,
      r.user,
      r.action,
      r.particular,
      r.beforeAlteration,
      r.afterAlteration,
      r.status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audit-trail.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const AuditTrailRow = memo(function AuditTrailRow({ row }: { row: AuditTrailRecord }) {
  return (
    <AccountsTableRow>
      <AccountsTableCell className="tabular-nums whitespace-nowrap text-xs">
        {formatAuditTrailDate(row.dateTime)}
      </AccountsTableCell>
      <AccountsTableCell className="tabular-nums whitespace-nowrap text-xs text-muted-foreground">
        {formatAuditTrailTime(row.dateTime)}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">{row.voucherType}</AccountsTableCell>
      <AccountsTableCell mono className="font-semibold text-brand-700 text-xs whitespace-nowrap">
        {row.voucherNo}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs font-medium whitespace-nowrap">{row.user}</AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">{row.action}</AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap font-medium">
        {row.particular}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs max-w-[140px] truncate text-muted-foreground tabular-nums"
        title={row.beforeAlteration}
      >
        {row.beforeAlteration}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs max-w-[140px] truncate tabular-nums"
        title={row.afterAlteration}
      >
        {row.afterAlteration}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">
        <StatusBadge status={row.status.toLowerCase()} />
      </AccountsTableCell>
    </AccountsTableRow>
  );
});

function AuditTrailTableBody({
  mounted,
  filtered,
  hasFilters,
  clearFilters,
  page,
  setPage,
  pageSize,
}: {
  mounted: boolean;
  filtered: AuditTrailRecord[];
  hasFilters: boolean;
  clearFilters: () => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filtered);
  const paged = useMemo(
    () => columnFilteredRows.slice((page - 1) * pageSize, page * pageSize),
    [columnFilteredRows, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  return (
    <AccountsTable minWidth={1480}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Time" colKey="time" />
          <SortTh label="Voucher Type" colKey="voucherType" />
          <SortTh label="Voucher No." colKey="voucherNo" />
          <SortTh label="User" colKey="user" />
          <SortTh label="Action" colKey="action" filterType="status" />
          <SortTh label="Particular" colKey="particular" />
          <SortTh label="Before Alteration" colKey="beforeAlteration" />
          <SortTh label="After Alteration" colKey="afterAlteration" />
          <SortTh label="Status" colKey="status" filterType="status" />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {!mounted ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={10} className="accounts-table-empty">
              Loading…
            </AccountsTableCell>
          </AccountsTableRow>
        ) : filtered.length === 0 ? (
          <AccountsTableEmpty
            colSpan={10}
            message="No audit records found for the selected filters."
            onClear={hasFilters ? clearFilters : undefined}
          />
        ) : columnFilteredRows.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={10} className="accounts-table-empty">
              No records match the column filters.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          paged.map((r) => <AuditTrailRow key={r.id} row={r} />)
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function AuditTrailPageClient() {
  const mounted = useClientMounted();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [search, setSearch] = useState("");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [fyReady, setFyReady] = useState(false);

  useEffect(() => {
    ensureFinancialYearsCurrent();
    const { fyId, from, to } = defaultDayBookFyDateRange();
    setFinancialYearId(fyId);
    setDateFrom(from);
    setDateTo(to);
    setPreset("custom");
    setFyReady(true);
  }, [setDateFrom, setDateTo, setPreset]);

  const allRows = useMemo(
    () => (mounted ? accountsDataService.getAuditTrail() : []),
    [mounted],
  );

  const filtered = useMemo(
    () =>
      !fyReady
        ? []
        : filterAuditTrail(allRows, {
            search,
            dateFrom,
            dateTo,
            financialYearId,
            voucherType: voucherTypes,
            user: users,
            action: actions,
          }),
    [allRows, fyReady, search, dateFrom, dateTo, financialYearId, voucherTypes, users, actions],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const fyLabel =
      financialYearId === "all"
        ? null
        : loadFinancialYears().find((f) => String(f.id) === financialYearId)?.name;

    return [
      fyLabel
        ? {
            id: "fy",
            label: "Financial Year",
            value: fyLabel,
            onRemove: () => {
              setFinancialYearId("all");
            },
          }
        : null,
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        AUDIT_TRAIL_VOUCHER_TYPE_OPTIONS,
        () => setVoucherTypes([]),
      ),
      buildEntityFilterSummary("user", "Users", users, AUDIT_TRAIL_USER_OPTIONS, () =>
        setUsers([]),
      ),
      buildEntityFilterSummary(
        "action",
        "Actions",
        actions,
        AUDIT_TRAIL_ACTION_OPTIONS,
        () => setActions([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [financialYearId, voucherTypes, users, actions]);

  const getCellValue = useCallback((row: AuditTrailRecord, key: string) => {
    if (key === "date") return row.dateTime.slice(0, 10);
    if (key === "time") return formatAuditTrailTime(row.dateTime);
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      time: { type: "text" as const },
      voucherType: { type: "text" as const },
      voucherNo: { type: "text" as const },
      user: { type: "text" as const },
      action: { type: "status" as const },
      particular: { type: "text" as const },
      beforeAlteration: { type: "text" as const },
      afterAlteration: { type: "text" as const },
      status: { type: "status" as const },
    }),
    [],
  );

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      setFinancialYearId(fyId);
      if (fyId !== "all") {
        const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
        if (fy) {
          setDateFrom(fy.startDate);
          const today = new Date().toISOString().slice(0, 10);
          setDateTo(today < fy.endDate ? today : fy.endDate);
          setPreset("custom");
        }
      }
    },
    [setDateFrom, setDateTo, setPreset],
  );

  const hasFilters =
    search.trim() !== "" ||
    isMultiFilterActive(voucherTypes) ||
    isMultiFilterActive(users) ||
    isMultiFilterActive(actions) ||
    financialYearId !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setVoucherTypes([]);
    setUsers([]);
    setActions([]);
    setFinancialYearId("all");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, financialYearId, voucherTypes, users, actions, pageSize]);

  return (
    <AccountsColumnFilterProvider
      rows={filtered}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="desc"
    >
      <AuditTrailPageBody
        mounted={mounted}
        filtered={filtered}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        financialYearId={financialYearId}
        onFinancialYearChange={handleFinancialYearChange}
        search={search}
        setSearch={setSearch}
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        users={users}
        setUsers={setUsers}
        actions={actions}
        setActions={setActions}
        filterSummaryItems={filterSummaryItems}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    </AccountsColumnFilterProvider>
  );
}

function AuditTrailPageBody({
  mounted,
  filtered,
  hasFilters,
  clearFilters,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  financialYearId,
  onFinancialYearChange,
  search,
  setSearch,
  voucherTypes,
  setVoucherTypes,
  users,
  setUsers,
  actions,
  setActions,
  filterSummaryItems,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  mounted: boolean;
  filtered: AuditTrailRecord[];
  hasFilters: boolean;
  clearFilters: () => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  financialYearId: string;
  onFinancialYearChange: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
  users: string[];
  setUsers: (v: string[]) => void;
  actions: string[];
  setActions: (v: string[]) => void;
  filterSummaryItems: ReportFilterSummaryItem[];
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(filtered);
  const handleExport = useCallback(
    () => exportAuditTrailCsv(columnFilteredRows),
    [columnFilteredRows],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Audit Trail")}
      title="Audit Trail"
      description="Voucher alteration register — created, modified and deleted accounting entries."
      filters={
        <>
          <ReportFilterRow
            end={
              <>
                <AccountsClearAllColumnFiltersButton />
                <AccountsExportMenu
                  onExcel={handleExport}
                  onPdf={handleExport}
                  disabled={!mounted || columnFilteredRows.length === 0}
                />
              </>
            }
          >
            <ReportFinancialYearFilter
              value={financialYearId}
              onChange={onFinancialYearChange}
            />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={AUDIT_TRAIL_VOUCHER_TYPE_OPTIONS}
            />
            <ReportStatusMultiFilter
              values={users}
              onChange={setUsers}
              options={AUDIT_TRAIL_USER_OPTIONS}
              label="User"
            />
            <ReportStatusMultiFilter
              values={actions}
              onChange={setActions}
              options={AUDIT_TRAIL_ACTION_OPTIONS}
              label="Action"
            />
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Voucher no., particular, user…"
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        footer={
          columnFilteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        <AuditTrailTableBody
          mounted={mounted}
          filtered={filtered}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
