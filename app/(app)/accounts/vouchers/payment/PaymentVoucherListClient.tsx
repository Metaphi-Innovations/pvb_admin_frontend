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
import { PaymentVoucherService } from "@/services/payment-voucher.service";
import {
  PAYMENT_BANK_TRANSACTION_MODE_LABELS,
  PAYMENT_PARTY_KIND_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentVoucherListItem,
  type PaymentVoucherStatus,
} from "@/types/payment-voucher.types";
import {
  formatSrNo,
  isDraftEditable,
  partyDisplayName,
  paymentEditPath,
  paymentViewPath,
  toMoneyNumber,
} from "./payment-voucher-utils";

function statusKey(
  status: PaymentVoucherStatus,
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

export function PaymentVoucherListClient() {
  const router = useRouter();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentVoucherListItem[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await PaymentVoucherService.list({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: (statusFilter as PaymentVoucherStatus) || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments.");
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
            placeholder: "Search draft no., supplier, UTR…",
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
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
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
          recordLabel="payments"
        />
      }
    >
      {error ? (
        <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      ) : null}

      <AccountsTable minWidth={1200}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Draft No.
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Date
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Branch
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Paid To Type
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Supplier / Customer / Ledger
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Mode
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
              Paid From
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
              Gross
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
              Net Paid
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
              <AccountsTableCell colSpan={11} className="accounts-table-empty">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading payments…
                </span>
              </AccountsTableCell>
            </AccountsTableRow>
          ) : rows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={11} className="accounts-table-empty">
                No payment vouchers found.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            rows.map((row) => {
              const id = row.payment_voucher_id;
              const canEdit = isDraftEditable(row.status);
              return (
                <AccountsTableRow key={id} className="group">
                  <AccountsTableCell mono>
                    <Link
                      href={paymentViewPath(id)}
                      className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                    >
                      {formatSrNo(row.sr_no)}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="tabular-nums text-xs">
                    {String(row.voucher_date).slice(0, 10)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">
                    {row.warehouse?.warehouse_name || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">
                    {PAYMENT_PARTY_KIND_LABELS[row.party_kind] || row.party_kind}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[180px] truncate">
                    {partyDisplayName(row)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {PAYMENT_BANK_TRANSACTION_MODE_LABELS[row.transaction_mode] ||
                      row.transaction_mode}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[160px] truncate">
                    {row.cash_bank_ledger?.ledger_name || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money>
                    <MoneyAmount amount={toMoneyNumber(row.gross_party_amount)} />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money>
                    <MoneyAmount amount={toMoneyNumber(row.net_bank_amount)} />
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusBadge
                      status={statusKey(row.status)}
                      label={PAYMENT_STATUS_LABELS[row.status] || row.status}
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
                        onClick={() => router.push(paymentViewPath(id))}
                      />
                      {canEdit ? (
                        <AccountsEditAction
                          title="Edit"
                          onClick={() => router.push(paymentEditPath(id))}
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
              <AccountsTableCell colSpan={11} className="text-xs text-muted-foreground">
                Showing {rows.length} of {total} payments
              </AccountsTableCell>
            </AccountsTableRow>
          </AccountsTableFoot>
        ) : null}
      </AccountsTable>
    </AccountsTableListing>
  );
}
