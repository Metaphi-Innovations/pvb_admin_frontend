"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { useClientMounted } from "@/lib/use-client-mounted";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { canEditVoucher, type VoucherTypeCode } from "../voucher-data";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
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
import { accountsDataService } from "@/lib/accounts/accounts-data-service";
interface VoucherListClientProps {
  voucherType: VoucherTypeCode;
  embedded?: boolean;
}

export function VoucherListClient({ voucherType, embedded }: VoucherListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listRefreshKey = searchParams.get("t");
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);

  const records = useMemo(
    () => (mounted ? accountsDataService.getVouchersByType(voucherType) : []),
    [voucherType, mounted, listRefreshKey],
  );

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.referenceNo.toLowerCase().includes(q),
      );
    }
    if (dateFrom) r = r.filter((v) => v.date >= dateFrom);
    if (dateTo) r = r.filter((v) => v.date <= dateTo);
    r.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [records, search, dateFrom, dateTo, sortKey, sortDir]);

  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize, voucherType]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  return (
    <div className={embedded ? "flex flex-col flex-1 min-h-0" : "flex flex-col h-full overflow-hidden"}>
      <AccountsTableListing
        toolbar={
          <AccountsTableToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search voucher no., narration…",
            }}
            filters={
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={setPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            }
          />
        }
        footer={
          mounted && visible.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={visible.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        <AccountsTable minWidth={900}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Voucher No." colKey="voucherNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <AccountsTableHeadCell uppercase>Reference</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-narration">Narration</AccountsTableHeadCell>
              <SortTh label="Amount" colKey="totalDebit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
              <AccountsTableHeadCell align="center" uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>Actions</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {!mounted ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="accounts-table-empty">
                  Loading…
                </AccountsTableCell>
              </AccountsTableRow>
            ) : visible.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="accounts-table-empty">
                  No records found.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paged.map((v) => (
                <AccountsTableRow key={v.id}>
                  <AccountsTableCell className="tabular-nums">{v.date}</AccountsTableCell>
                  <AccountsTableCell mono>
                    <Link
                      href={`/accounts/vouchers/view/${v.id}`}
                      className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                    >
                      {v.voucherNumber}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-muted-foreground">{v.referenceNo || "—"}</AccountsTableCell>
                  <AccountsTableCell className="accounts-col-narration max-w-[200px] truncate">{v.narration || "—"}</AccountsTableCell>
                  <AccountsTableCell align="right" money>
                    <MoneyAmount amount={v.totalDebit} />
                  </AccountsTableCell>
                  <AccountsTableCell align="center">
                    <StatusBadge status={v.status} />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction
                        title="View"
                        onClick={() => router.push(`/accounts/vouchers/view/${v.id}`)}
                      />
                      {canEditVoucher(v) && (
                        <AccountsEditAction
                          title="Edit"
                          onClick={() => router.push(`/accounts/vouchers/edit/${v.id}`)}
                        />
                      )}
                    </AccountsTableActionCell>
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableListing>
    </div>
  );
}
