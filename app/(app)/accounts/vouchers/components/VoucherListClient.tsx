"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  AccountsColumnHeader,
  SortTh,
  AccountsColumnFilterProvider,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "../../components/AccountsUI";
import { canEditVoucher, type VoucherTypeCode } from "../voucher-data";
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

type VoucherRow = ReturnType<typeof accountsDataService.getVouchersByType>[number];

function VoucherListTable({
  mounted,
  page,
  pageSize,
  toolbarFiltered,
  onPageChange,
  onPageSizeChange,
}: {
  mounted: boolean;
  page: number;
  pageSize: number;
  toolbarFiltered: VoucherRow[];
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarFiltered);

  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <>
      <AccountsTable minWidth={900}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Date" colKey="date" filterType="date" />
            <SortTh label="Voucher No." colKey="voucherNumber" />
            <AccountsColumnHeader label="Reference" colKey="referenceNo" sortable={false} />
            <AccountsColumnHeader label="Narration" colKey="narration" sortable={false} className="accounts-col-narration" />
            <SortTh label="Amount" colKey="totalDebit" filterType="amount" align="right" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {!mounted ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={6} className="accounts-table-empty">
                Loading…
              </AccountsTableCell>
            </AccountsTableRow>
          ) : visible.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={6} className="accounts-table-empty">
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
      {mounted && visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </>
  );
}

export function VoucherListClient({ voucherType, embedded }: VoucherListClientProps) {
  const searchParams = useSearchParams();
  const listRefreshKey = searchParams.get("t");
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);

  const records = useMemo(
    () => (mounted ? accountsDataService.getVouchersByType(voucherType) : []),
    [voucherType, mounted, listRefreshKey],
  );

  const getCellValue = useCallback(
    (row: VoucherRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const toolbarFiltered = useMemo(() => {
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
    return r;
  }, [records, search, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize, voucherType]);

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
      >
        <AccountsColumnFilterProvider
          rows={toolbarFiltered}
          getCellValue={getCellValue}
          columnConfig={{
            date: { type: "date" },
            voucherNumber: { type: "text" },
            referenceNo: { type: "text" },
            narration: { type: "text" },
            totalDebit: { type: "amount" },
          }}
          defaultSortKey="date"
          defaultSortDir="desc"
        >
          <VoucherListTable
            mounted={mounted}
            page={page}
            pageSize={pageSize}
            toolbarFiltered={toolbarFiltered}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </AccountsColumnFilterProvider>
      </AccountsTableListing>
    </div>
  );
}
