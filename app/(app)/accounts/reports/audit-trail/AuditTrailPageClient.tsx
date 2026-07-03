"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  filterAuditTrail,
  loadAuditTrailRecords,
  type AuditTrailRecord,
} from "@/lib/accounts/audit-trail-data";
import { accountsDataService } from "@/lib/accounts/accounts-data-service";

const MODULE_OPTIONS = [
  "all",
  "Sales Invoice",
  "Stock Transfer Invoice",
  "Purchase Invoice",
  "Receipt Voucher",
  "Payment Voucher",
  "Journal Voucher",
  "Contra Voucher",
  "Credit Note",
  "Fund Transfer",
];

function formatDateTime(iso: string): string {
  const [date, time] = iso.split("T");
  if (!date) return iso;
  const [y, m, d] = date.split("-");
  const t = time?.slice(0, 5) ?? "";
  return `${d}-${m}-${y}${t ? ` ${t}` : ""}`;
}

function exportAuditTrailCsv(rows: AuditTrailRecord[]) {
  const headers = ["Date & Time", "User", "Module", "Action", "Reference", "Details"];
  const lines = rows.map((r) =>
    [formatDateTime(r.dateTime), r.user, r.module, r.action, r.reference, r.details]
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);

  const allRows = useMemo(
    () => (mounted ? accountsDataService.getAuditTrail() : []),
    [mounted],
  );

  const filtered = useMemo(
    () => filterAuditTrail(allRows, { search, dateFrom, dateTo, module }),
    [allRows, search, dateFrom, dateTo, module],
  );

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, module, pageSize]);

  const handleExport = useCallback(() => exportAuditTrailCsv(filtered), [filtered]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Audit Trail")}
      title="Audit Trail"
      description="Chronological log of accounting actions, approvals and data changes."
      filters={
        <ReportFilterRow
          end={<AccountsExportMenu onExcel={handleExport} onPdf={handleExport} disabled={filtered.length === 0} />}
        >
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="User, module, reference, action…"
          />
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-[10px] font-medium uppercase text-muted-foreground leading-none">
              Module
            </Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="h-9 text-[13px] font-medium mt-0.5 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m === "all" ? "All modules" : m}
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
      footer={
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
      }
    >
      <AccountsTableListing>
        <AccountsTableScroll>
          <AccountsTable minWidth={900}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <AccountsTableHeadCell uppercase>Date & Time</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>User</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Module</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Action</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Reference</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Details</AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {!mounted ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={6} className="accounts-table-empty">
                    Loading…
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : paged.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={6} className="accounts-table-empty">
                    No records found.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                paged.map((r) => (
                  <AccountsTableRow key={r.id}>
                    <AccountsTableCell className="tabular-nums whitespace-nowrap">
                      {formatDateTime(r.dateTime)}
                    </AccountsTableCell>
                    <AccountsTableCell>{r.user}</AccountsTableCell>
                    <AccountsTableCell>{r.module}</AccountsTableCell>
                    <AccountsTableCell>{r.action}</AccountsTableCell>
                    <AccountsTableCell mono className="font-semibold text-brand-700">
                      {r.reference}
                    </AccountsTableCell>
                    <AccountsTableCell className="max-w-[280px] truncate">{r.details}</AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
