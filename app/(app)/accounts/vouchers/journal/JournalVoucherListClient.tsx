"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  ACCOUNTS_DEFAULT_PAGE_SIZE,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JournalVoucherService } from "@/services/journal-voucher.service";
import {
  JOURNAL_STATUS_LABELS,
  type JournalVoucherListItem,
  type JournalVoucherStatus,
} from "@/types/journal-voucher.types";
import {
  formatSrNo,
  isDraftEditable,
  journalEditPath,
  journalViewPath,
  ledgerDisplayName,
  toMoneyNumber,
} from "./journal-voucher-utils";

function statusKey(
  status: JournalVoucherStatus,
): "active" | "pending" | "approved" | "rejected" | "draft" | "inactive" | "closed" {
  switch (status) {
    case "POSTED":
    case "APPROVED":
      return "approved";
    case "PENDING_APPROVAL":
      return "pending";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
    case "REVERSED":
      return "closed";
    case "DRAFT":
      return "draft";
    default:
      return "inactive";
  }
}

export function JournalVoucherListClient() {
  const router = useRouter();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<JournalVoucherListItem[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await JournalVoucherService.list({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: (statusFilter as JournalVoucherStatus) || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load journals.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo]);

  return (
    <AccountsTableListing
      toolbar={
        <AccountsTableToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search JV no., ledger, reference…",
          }}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={setPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
              <select
                className="h-8 text-xs border border-border rounded-lg px-2 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {Object.entries(JOURNAL_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      }
      footer={
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          recordLabel="journals"
        />
      }
    >
      {error ? (
        <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      ) : null}

      <AccountsTable minWidth={1100}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              JV No.
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Date
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Debit Ledger
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Credit Ledger
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
              Amount
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Reference
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Status
            </th>
            <th
              className={`px-4 py-2.5 text-right text-xs font-semibold ${accountsActionColClass("multi")}`}
            >
              Actions
            </th>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {loading ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={8} className="accounts-table-empty">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading journals…
                </span>
              </AccountsTableCell>
            </AccountsTableRow>
          ) : rows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={8} className="accounts-table-empty">
                No journal vouchers found.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            rows.map((row) => {
              const id = row.journal_voucher_id;
              const canEdit = isDraftEditable(row.status);
              return (
                <AccountsTableRow key={id} className="group">
                  <AccountsTableCell mono>
                    <Link
                      href={journalViewPath(id)}
                      className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                    >
                      {formatSrNo(row.sr_no)}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs">
                    {String(row.voucher_date).slice(0, 10)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[180px] truncate">
                    {ledgerDisplayName({
                      ledger: row.debit_ledger,
                      snapshot: row.debit_ledger_snapshot,
                    })}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[180px] truncate">
                    {ledgerDisplayName({
                      ledger: row.credit_ledger,
                      snapshot: row.credit_ledger_snapshot,
                    })}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money>
                    <MoneyAmount amount={toMoneyNumber(row.amount)} />
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[140px] truncate text-muted-foreground">
                    {row.reference_number || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge
                      status={statusKey(row.status)}
                      label={JOURNAL_STATUS_LABELS[row.status] || row.status}
                      size="sm"
                      showDot
                    />
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    className={accountsActionColClass("multi")}
                  >
                    <AccountsTableActionCell>
                      <AccountsViewAction
                        title="View"
                        onClick={() => router.push(journalViewPath(id))}
                      />
                      {canEdit ? (
                        <AccountsEditAction
                          title="Edit"
                          onClick={() => router.push(journalEditPath(id))}
                        />
                      ) : null}
                    </AccountsTableActionCell>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })
          )}
        </AccountsTableBody>
        {!loading && rows.length > 0 ? (
          <AccountsTableFoot>
            <AccountsTableRow>
              <AccountsTableCell colSpan={8} className="text-xs text-muted-foreground">
                Showing {rows.length} of {total} journals
              </AccountsTableCell>
            </AccountsTableRow>
          </AccountsTableFoot>
        ) : null}
      </AccountsTable>
    </AccountsTableListing>
  );
}
