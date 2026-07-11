"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, History, Pencil, UserCheck } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
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
  ReportStatusMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  countActiveMoreFilters,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { SectionTabs, AccountsColumnFilterProvider, AccountsColumnHeader, SortTh, useAccountsColumnFilterContext, useAccountsFilteredRows } from "@/app/(app)/accounts/components/AccountsUI";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  AUDIT_TRAIL_ACTIVITY_OPTIONS,
  AUDIT_TRAIL_CATEGORY_LABELS,
  AUDIT_TRAIL_MODULE_OPTIONS,
  AUDIT_TRAIL_STATUS_OPTIONS,
  AUDIT_TRAIL_USER_OPTIONS,
  countAuditTrailByCategory,
  filterAuditTrail,
  type AuditTrailCategory,
  type AuditTrailRecord,
} from "@/lib/accounts/audit-trail-data";
import { accountsDataService } from "@/lib/accounts/accounts-data-service";
import { AuditTrailDetailSheet } from "./components/AuditTrailDetailSheet";

type CategoryFilter = "all" | AuditTrailCategory;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All Records" },
  { id: "user_activity", label: "User Wise Activity Log" },
  { id: "voucher_approval", label: "Voucher Approval Log" },
  { id: "edit_delete", label: "Edit / Delete Log" },
];

const AUDIT_MODULE_OPTIONS = AUDIT_TRAIL_MODULE_OPTIONS.filter((o) => o.value !== "all");
const AUDIT_USER_OPTIONS = AUDIT_TRAIL_USER_OPTIONS.filter((o) => o.value !== "all");
const AUDIT_ACTIVITY_OPTIONS = AUDIT_TRAIL_ACTIVITY_OPTIONS.filter((o) => o.value !== "all");
const AUDIT_STATUS_OPTIONS = AUDIT_TRAIL_STATUS_OPTIONS.filter((o) => o.value !== "all");

const CATEGORY_CARDS: {
  id: AuditTrailCategory;
  label: string;
  hint: string;
  icon: typeof History;
}[] = [
  {
    id: "user_activity",
    label: "User Wise Activity Log",
    hint: "Exports, views & user actions",
    icon: History,
  },
  {
    id: "voucher_approval",
    label: "Voucher Approval Log",
    hint: "Approvals & rejections",
    icon: UserCheck,
  },
  {
    id: "edit_delete",
    label: "Edit / Delete Log",
    hint: "Creates, edits, posts & deletes",
    icon: Pencil,
  },
];

function formatDateTime(iso: string): string {
  const [date, time] = iso.split("T");
  if (!date) return iso;
  const [y, m, d] = date.split("-");
  const t = time?.slice(0, 5) ?? "";
  return `${d}-${m}-${y}${t ? ` ${t}` : ""}`;
}

function exportAuditTrailCsv(rows: AuditTrailRecord[]) {
  const headers = [
    "Date & Time",
    "User Name",
    "Role",
    "Module",
    "Voucher / Reference No.",
    "Activity Type",
    "Action Performed",
    "Old Value",
    "New Value",
    "Status",
    "Category",
    "Details",
  ];
  const lines = rows.map((r) =>
    [
      formatDateTime(r.dateTime),
      r.user,
      r.role,
      r.module,
      r.reference,
      r.activityType,
      r.action,
      r.oldValue,
      r.newValue,
      r.status,
      AUDIT_TRAIL_CATEGORY_LABELS[r.category],
      r.details,
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

const AuditTrailRow = memo(function AuditTrailRow({
  row,
  onView,
}: {
  row: AuditTrailRecord;
  onView: (row: AuditTrailRecord) => void;
}) {
  return (
    <AccountsTableRow>
      <AccountsTableCell className="tabular-nums whitespace-nowrap text-xs">
        {formatDateTime(row.dateTime)}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs font-medium">{row.user}</AccountsTableCell>
      <AccountsTableCell className="text-xs text-muted-foreground">{row.role}</AccountsTableCell>
      <AccountsTableCell className="text-xs">{row.module}</AccountsTableCell>
      <AccountsTableCell mono className="font-semibold text-brand-700 text-xs whitespace-nowrap">
        {row.reference}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs">{row.activityType}</AccountsTableCell>
      <AccountsTableCell className="text-xs max-w-[160px] truncate" title={row.action}>
        {row.action}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs max-w-[120px] truncate text-muted-foreground"
        title={row.oldValue}
      >
        {row.oldValue}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs max-w-[120px] truncate" title={row.newValue}>
        {row.newValue}
      </AccountsTableCell>
      <AccountsTableCell className="text-center w-10">
        <button
          type="button"
          onClick={() => onView(row)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-brand-700 hover:bg-brand-50"
          aria-label={`View audit details for ${row.reference}`}
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </button>
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
  setPageSize,
  handleView,
}: {
  mounted: boolean;
  filtered: AuditTrailRecord[];
  hasFilters: boolean;
  clearFilters: () => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  handleView: (row: AuditTrailRecord) => void;
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
    <AccountsTable minWidth={1400}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date & Time" colKey="dateTime" filterType="date" />
          <SortTh label="User Name" colKey="user" />
          <SortTh label="Role" colKey="role" />
          <SortTh label="Module" colKey="module" />
          <SortTh label="Voucher / Reference No." colKey="reference" />
          <SortTh label="Activity Type" colKey="activityType" />
          <SortTh label="Action Performed" colKey="action" />
          <SortTh label="Old Value" colKey="oldValue" />
          <SortTh label="New Value" colKey="newValue" />
          <AccountsColumnHeader label="View" colKey="_view" sortable={false} filterable={false} align="center" className="w-10" />
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
          paged.map((r) => <AuditTrailRow key={r.id} row={r} onView={handleView} />)
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function AuditTrailPageClient() {
  const mounted = useClientMounted();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [viewRecord, setViewRecord] = useState<AuditTrailRecord | null>(null);

  const allRows = useMemo(
    () => (mounted ? accountsDataService.getAuditTrail() : []),
    [mounted],
  );

  const categoryCounts = useMemo(() => countAuditTrailByCategory(allRows), [allRows]);

  const filtered = useMemo(
    () =>
      filterAuditTrail(allRows, {
        search,
        dateFrom,
        dateTo,
        module: modules,
        category,
        user: users,
        activityType: activityTypes,
        status: statuses,
      }),
    [allRows, search, dateFrom, dateTo, modules, category, users, activityTypes, statuses],
  );

  const moreFiltersActiveCount = countActiveMoreFilters({
    user: users,
    activityType: activityTypes,
    status: statuses,
  });

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary("module", "Modules", modules, AUDIT_MODULE_OPTIONS, () => setModules([])),
      buildEntityFilterSummary("user", "Users", users, AUDIT_USER_OPTIONS, () => setUsers([])),
      buildEntityFilterSummary(
        "activityType",
        "Activity Types",
        activityTypes,
        AUDIT_ACTIVITY_OPTIONS,
        () => setActivityTypes([]),
      ),
      buildEntityFilterSummary("status", "Statuses", statuses, AUDIT_STATUS_OPTIONS, () => setStatuses([])),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [modules, users, activityTypes, statuses]);

  const getCellValue = useCallback(
    (row: AuditTrailRecord, key: string) => {
      if (key === "dateTime") return row.dateTime;
      return (row as unknown as Record<string, unknown>)[key];
    },
    [],
  );

  const columnConfig = useMemo(
    () => ({
      dateTime: { type: "date" as const },
      user: { type: "text" as const },
      role: { type: "text" as const },
      module: { type: "text" as const },
      reference: { type: "text" as const },
      activityType: { type: "text" as const },
      action: { type: "text" as const },
      oldValue: { type: "text" as const },
      newValue: { type: "text" as const },
    }),
    [],
  );

  const hasFilters =
    search.trim() !== "" ||
    isMultiFilterActive(modules) ||
    isMultiFilterActive(users) ||
    isMultiFilterActive(activityTypes) ||
    isMultiFilterActive(statuses) ||
    category !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setModules([]);
    setUsers([]);
    setActivityTypes([]);
    setStatuses([]);
    setCategory("all");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, modules, category, users, activityTypes, statuses, pageSize]);

  const handleView = useCallback((row: AuditTrailRecord) => setViewRecord(row), []);

  const tabCounts = useMemo(
    () => ({
      all: allRows.length,
      user_activity: categoryCounts.user_activity,
      voucher_approval: categoryCounts.voucher_approval,
      edit_delete: categoryCounts.edit_delete,
    }),
    [allRows.length, categoryCounts],
  );

  return (
    <AccountsColumnFilterProvider
      rows={filtered}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="dateTime"
      defaultSortDir="desc"
    >
      <AuditTrailPageBody
        mounted={mounted}
        allRows={allRows}
        filtered={filtered}
        categoryCounts={categoryCounts}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        tabCounts={tabCounts}
        category={category}
        setCategory={setCategory}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        search={search}
        setSearch={setSearch}
        modules={modules}
        setModules={setModules}
        users={users}
        setUsers={setUsers}
        activityTypes={activityTypes}
        setActivityTypes={setActivityTypes}
        statuses={statuses}
        setStatuses={setStatuses}
        filterSummaryItems={filterSummaryItems}
        moreFiltersActiveCount={moreFiltersActiveCount}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        handleView={handleView}
        viewRecord={viewRecord}
        setViewRecord={setViewRecord}
      />
    </AccountsColumnFilterProvider>
  );
}

function AuditTrailPageBody({
  mounted,
  allRows,
  filtered,
  categoryCounts,
  hasFilters,
  clearFilters,
  tabCounts,
  category,
  setCategory,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  search,
  setSearch,
  modules,
  setModules,
  users,
  setUsers,
  activityTypes,
  setActivityTypes,
  statuses,
  setStatuses,
  filterSummaryItems,
  moreFiltersActiveCount,
  page,
  setPage,
  pageSize,
  setPageSize,
  handleView,
  viewRecord,
  setViewRecord,
}: {
  mounted: boolean;
  allRows: AuditTrailRecord[];
  filtered: AuditTrailRecord[];
  categoryCounts: ReturnType<typeof countAuditTrailByCategory>;
  hasFilters: boolean;
  clearFilters: () => void;
  tabCounts: Record<string, number>;
  category: CategoryFilter;
  setCategory: (v: CategoryFilter) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  modules: string[];
  setModules: (v: string[]) => void;
  users: string[];
  setUsers: (v: string[]) => void;
  activityTypes: string[];
  setActivityTypes: (v: string[]) => void;
  statuses: string[];
  setStatuses: (v: string[]) => void;
  filterSummaryItems: ReportFilterSummaryItem[];
  moreFiltersActiveCount: number;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  handleView: (row: AuditTrailRecord) => void;
  viewRecord: AuditTrailRecord | null;
  setViewRecord: (row: AuditTrailRecord | null) => void;
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
      description="Chronological log of accounting actions, approvals and data changes."
      filters={
        <>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={handleExport}
                onPdf={handleExport}
                disabled={!mounted || columnFilteredRows.length === 0}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="User, module, reference, action…"
            />
            <ReportStatusMultiFilter
              values={modules}
              onChange={setModules}
              options={AUDIT_MODULE_OPTIONS}
              label="Module"
            />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportStatusMultiFilter
                values={users}
                onChange={setUsers}
                options={AUDIT_USER_OPTIONS}
                label="User"
              />
              <ReportStatusMultiFilter
                values={activityTypes}
                onChange={setActivityTypes}
                options={AUDIT_ACTIVITY_OPTIONS}
                label="Activity Type"
              />
              <ReportStatusMultiFilter
                values={statuses}
                onChange={setStatuses}
                options={AUDIT_STATUS_OPTIONS}
                label="Status"
              />
            </ReportMoreFilters>
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        subheader={
          <SectionTabs
            tabs={CATEGORY_TABS}
            active={category}
            onChange={(id) => setCategory(id as CategoryFilter)}
            counts={tabCounts}
            compact
          />
        }
        summary={
          <div className="border-b border-border bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 px-3 py-2">
              {CATEGORY_CARDS.map((card) => {
                const Icon = card.icon;
                const active = category === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setCategory(active ? "all" : card.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-brand-400 bg-brand-50"
                        : "border-border bg-white hover:bg-muted/30",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        active ? "bg-brand-600" : "bg-muted",
                      )}
                    >
                      <Icon
                        className={cn("w-4 h-4", active ? "text-white" : "text-muted-foreground")}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                        {card.label}
                      </p>
                      <p className="text-base font-bold text-foreground leading-tight">
                        {categoryCounts[card.id]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{card.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <AccountsSummaryBar
              className="border-t border-border/60 lg:grid-cols-4"
              items={[
                { label: "Total Records", value: String(allRows.length) },
                { label: "Filtered Results", value: String(columnFilteredRows.length) },
                {
                  label: "User Activity",
                  value: String(categoryCounts.user_activity),
                },
                {
                  label: "Approvals & Edits",
                  value: String(categoryCounts.voucher_approval + categoryCounts.edit_delete),
                },
              ]}
            />
          </div>
        }
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
          setPageSize={setPageSize}
          handleView={handleView}
        />
      </AccountsTableListing>

      <AuditTrailDetailSheet
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
      />
    </AccountsPageShell>
  );
}
