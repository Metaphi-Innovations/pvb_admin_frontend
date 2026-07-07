"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, History, Pencil, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { SectionTabs, StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
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

export default function AuditTrailPageClient() {
  const mounted = useClientMounted();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [user, setUser] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [status, setStatus] = useState("all");
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
        module,
        category,
        user,
        activityType,
        status,
      }),
    [allRows, search, dateFrom, dateTo, module, category, user, activityType, status],
  );

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const hasFilters =
    search.trim() !== "" ||
    module !== "all" ||
    user !== "all" ||
    activityType !== "all" ||
    status !== "all" ||
    category !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setModule("all");
    setUser("all");
    setActivityType("all");
    setStatus("all");
    setCategory("all");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, module, category, user, activityType, status, pageSize]);

  const handleExport = useCallback(() => exportAuditTrailCsv(filtered), [filtered]);

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
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Audit Trail")}
      title="Audit Trail"
      description="Chronological log of accounting actions, approvals and data changes."
      filters={
        <ReportFilterRow
          end={
            <AccountsExportMenu
              onExcel={handleExport}
              onPdf={handleExport}
              disabled={!mounted || filtered.length === 0}
            />
          }
        >
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="User, module, reference, action…"
          />
          <div className="space-y-0.5 min-w-[130px]">
            <Label className={filterLabelClass}>User</Label>
            <Select value={user} onValueChange={setUser}>
              <SelectTrigger className={cn(filterControlClass, "w-[130px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_TRAIL_USER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5 min-w-[140px]">
            <Label className={filterLabelClass}>Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className={cn(filterControlClass, "w-[140px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_TRAIL_MODULE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5 min-w-[120px]">
            <Label className={filterLabelClass}>Activity Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className={cn(filterControlClass, "w-[120px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_TRAIL_ACTIVITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5 min-w-[120px]">
            <Label className={filterLabelClass}>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className={cn(filterControlClass, "w-[120px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_TRAIL_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </ReportFilterRow>
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
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                        {card.label}
                      </p>
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {categoryCounts[card.id]}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{card.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <AccountsSummaryBar
              className="border-t border-border/60 lg:grid-cols-4"
              items={[
                { label: "Total Records", value: String(allRows.length) },
                { label: "Filtered Results", value: String(filtered.length) },
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
          filtered.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        <AccountsTable minWidth={1400}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>Date & Time</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>User Name</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Role</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Module</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Voucher / Reference No.</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Activity Type</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Action Performed</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Old Value</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>New Value</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-10 text-center" uppercase>
                View
              </AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {!mounted ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={11} className="accounts-table-empty">
                  Loading…
                </AccountsTableCell>
              </AccountsTableRow>
            ) : paged.length === 0 ? (
              <AccountsTableEmpty
                colSpan={11}
                message="No audit records found for the selected filters."
                onClear={hasFilters ? clearFilters : undefined}
              />
            ) : (
              paged.map((r) => (
                <AccountsTableRow key={r.id}>
                  <AccountsTableCell className="tabular-nums whitespace-nowrap text-xs">
                    {formatDateTime(r.dateTime)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium">{r.user}</AccountsTableCell>
                  <AccountsTableCell className="text-xs text-muted-foreground">{r.role}</AccountsTableCell>
                  <AccountsTableCell className="text-xs">{r.module}</AccountsTableCell>
                  <AccountsTableCell mono className="font-semibold text-brand-700 text-xs whitespace-nowrap">
                    {r.reference}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{r.activityType}</AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[160px] truncate" title={r.action}>
                    {r.action}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[120px] truncate text-muted-foreground" title={r.oldValue}>
                    {r.oldValue}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[120px] truncate" title={r.newValue}>
                    {r.newValue}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge status={r.status} />
                  </AccountsTableCell>
                  <AccountsTableCell className="text-center w-10">
                    <button
                      type="button"
                      onClick={() => setViewRecord(r)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-brand-700 hover:bg-brand-50 transition-colors"
                      aria-label={`View audit details for ${r.reference}`}
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableListing>

      <AuditTrailDetailSheet
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
      />
    </AccountsPageShell>
  );
}
