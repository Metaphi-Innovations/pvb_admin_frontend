"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
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
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  AccountsColumnHeader,
  SortTh,
  StatusBadge,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterState, ColumnValueOption } from "@/lib/accounts/column-filter-types";
import type { BankBookDisplayRow, BankBookSummary } from "./bank-book-data";
import { formatBankBookDate } from "./bank-book-data";

export function BankBookTable({
  openingRow,
  transactionRows,
  summary,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  sortKey,
  sortDir,
  onSort,
  onRemoveSort,
  filters,
  onFilterChange,
  loading = false,
}: {
  openingRow: BankBookDisplayRow;
  transactionRows: BankBookDisplayRow[];
  summary: BankBookSummary;
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRemoveSort?: () => void;
  filters?: {
    voucherType?: string;
    voucherNo?: string;
    particular?: string;
    reference?: string;
    bankDate?: string;
    reconStatus?: string;
    status?: string;
  };
  onFilterChange?: (column: string, value: AccountsColumnFilterState | undefined) => void;
  loading?: boolean;
}) {
  const reconOptions: ColumnValueOption[] = useMemo(
    () => [
      { value: "UNRECONCILED", count: 0 },
      { value: "RECONCILED", count: 0 },
      { value: "PARTIAL", count: 0 },
      { value: "DISPUTED", count: 0 },
    ],
    []
  );

  const statusOptions: ColumnValueOption[] = useMemo(
    () => [
      { value: "POSTED", count: 0 },
      { value: "DRAFT", count: 0 },
      { value: "CANCELLED", count: 0 },
      { value: "REVERSED", count: 0 },
    ],
    []
  );

  const particularOptions: ColumnValueOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of transactionRows) {
      if (r.particular && r.particular.trim()) {
        counts.set(r.particular, (counts.get(r.particular) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [transactionRows]);

  const referenceOptions: ColumnValueOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of transactionRows) {
      if (r.reference && r.reference !== "—" && r.reference.trim()) {
        counts.set(r.reference, (counts.get(r.reference) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [transactionRows]);

  const voucherNoOptions: ColumnValueOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of transactionRows) {
      if (r.voucherNo && r.voucherNo !== "—" && r.voucherNo.trim()) {
        counts.set(r.voucherNo, (counts.get(r.voucherNo) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [transactionRows]);

  return (
    <>
      <AccountsTableScroll className="flex-1 min-h-0 h-full">
        <AccountsTable minWidth={1400} className="text-xs">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh
                label="Date"
                colKey="date"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterable={false}
              />
              <SortTh
                label="Voucher Type"
                colKey="voucherType"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterable={false}
              />
              <SortTh
                label="Voucher No."
                colKey="voucherNo"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterType="text"
                valueOptions={voucherNoOptions}
                filterValue={
                  filters?.voucherNo
                    ? {
                        type: "text",
                        textValue: filters.voucherNo,
                        selectedValues: filters.voucherNo.split(",").filter(Boolean),
                      }
                    : undefined
                }
                onFilterChange={(val) => onFilterChange?.("voucherNo", val)}
              />
              <SortTh
                label="Particular"
                colKey="particular"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterType="text"
                valueOptions={particularOptions}
                filterValue={
                  filters?.particular
                    ? {
                        type: "text",
                        textValue: filters.particular,
                        selectedValues: filters.particular.split(",").filter(Boolean),
                      }
                    : undefined
                }
                onFilterChange={(val) => onFilterChange?.("particular", val)}
              />
              <SortTh
                label="Reference"
                colKey="reference"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterType="text"
                valueOptions={referenceOptions}
                filterValue={
                  filters?.reference
                    ? {
                        type: "text",
                        textValue: filters.reference,
                        selectedValues: filters.reference.split(",").filter(Boolean),
                      }
                    : undefined
                }
                onFilterChange={(val) => onFilterChange?.("reference", val)}
              />
              <SortTh
                label="Receipt"
                colKey="receipt"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterable={false}
                align="right"
              />
              <SortTh
                label="Payment"
                colKey="payment"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterable={false}
                align="right"
              />
              <AccountsColumnHeader
                label="Running Balance"
                colKey="runningBalance"
                sortable={true}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterable={false}
                align="right"
              />
              <AccountsColumnHeader
                label="Bank Date"
                colKey="bankDate"
                sortable={true}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterType="date"
                filterValue={
                  filters?.bankDate
                    ? { type: "date", dateFrom: filters.bankDate, dateTo: filters.bankDate }
                    : undefined
                }
                onFilterChange={(val) => onFilterChange?.("bankDate", val)}
              />
              <AccountsColumnHeader
                label="Recon Status"
                colKey="reconStatus"
                sortable={true}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterType="status"
                valueOptions={reconOptions}
                filterValue={
                  filters?.reconStatus
                    ? {
                        type: "status",
                        selectedValues: filters.reconStatus.split(",").filter(Boolean),
                      }
                    : undefined
                }
                onFilterChange={(val) => onFilterChange?.("reconStatus", val)}
              />
              <AccountsColumnHeader
                label="Status"
                colKey="status"
                sortable={true}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                onRemoveSort={onRemoveSort}
                filterType="status"
                valueOptions={statusOptions}
                filterValue={
                  filters?.status
                    ? {
                        type: "status",
                        selectedValues: filters.status.split(",").filter(Boolean),
                      }
                    : undefined
                }
                onFilterChange={(val) => onFilterChange?.("status", val)}
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {page === 1 && <BankBookTableRow row={openingRow} />}
            {transactionRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={11} className="accounts-table-empty">
                  {loading ? "Loading transactions..." : "No Bank Book transactions found for the selected period."}
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              transactionRows.map((row, index) => (
                <BankBookTableRow key={`${row.rowKey}-${index}`} row={row} />
              ))
            )}
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow className="bg-muted/20 font-semibold">
              <AccountsTableCell colSpan={5} className="text-xs text-foreground py-2">
                Total (Summary)
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2">
                {formatMoney(summary.totalReceipts)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2">
                {formatMoney(summary.totalPayments)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2">
                <MoneyAmount
                  amount={summary.closingBalance}
                  side={summary.closingBalanceType}
                  sideBadge
                  className="text-xs justify-end font-semibold"
                />
              </AccountsTableCell>
              <AccountsTableCell className="py-2" colSpan={3} />
            </AccountsTableRow>
          </AccountsTableFoot>
        </AccountsTable>
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <div className="flex-shrink-0 border-t border-border">
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            recordLabel="transactions"
          />
        </div>
      )}
    </>
  );
}

function ReconStatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "RECONCILED") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Reconciled
      </span>
    );
  }
  if (normalized === "DISPUTED") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
        Disputed
      </span>
    );
  }
  if (normalized === "PARTIAL") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
      Unreconciled
    </span>
  );
}

function BankBookTableRow({ row }: { row: BankBookDisplayRow }) {
  const isOpening = row.kind === "opening";

  return (
    <AccountsTableRow
      className={cn(
        isOpening && "bg-muted/20 font-medium",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">
        {formatBankBookDate(row.date)}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">{row.voucherType}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {row.voucherNo === "—" ? (
          <span className="text-muted-foreground">—</span>
        ) : row.voucherHref ? (
          <Link
            href={row.voucherHref}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.voucherNo}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2 max-w-[200px] truncate", isOpening && "text-muted-foreground")}
        title={row.particular}
      >
        {row.particularLedgerId && !isOpening ? (
          <Link
            href={`/accounts/masters/chart-of-accounts?node=${row.particularLedgerId}`}
            className="text-xs font-medium text-brand-700 hover:underline truncate block"
          >
            {row.particular}
          </Link>
        ) : (
          row.particular
        )}
      </AccountsTableCell>
      <AccountsTableCell
        className="py-2 max-w-[160px] truncate font-mono text-xs text-muted-foreground"
        title={row.reference}
      >
        {row.reference}
      </AccountsTableCell>
      <MoneyCell amount={row.receipt} dashIfZero className="accounts-table-td py-2" />
      <MoneyCell amount={row.payment} dashIfZero className="accounts-table-td py-2" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap py-2">
        {isOpening ? (
          <span className="text-xs">
            {formatBalanceAmount(row.runningBalance, row.runningBalanceType)}
          </span>
        ) : (
          <MoneyAmount
            amount={row.runningBalance}
            side={row.runningBalanceType}
            sideBadge
            className="text-xs justify-end"
          />
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2 tabular-nums text-[11px]">
        {isOpening ? "—" : row.bankDate ? formatBankBookDate(row.bankDate) : "—"}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2 text-[11px]">
        {isOpening ? "—" : <ReconStatusBadge status={row.reconStatus} />}
      </AccountsTableCell>
      {!isOpening && row.status && row.status !== "—" ? (
        <AccountsTableCell className="whitespace-nowrap py-2">
          <StatusBadge status={row.status.toLowerCase()} />
        </AccountsTableCell>
      ) : (
        <AccountsTableCell className="py-2 text-muted-foreground">—</AccountsTableCell>
      )}
    </AccountsTableRow>
  );
}
