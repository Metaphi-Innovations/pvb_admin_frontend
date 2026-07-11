"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AccountsGenerateAction,
  AccountsTableActionCell,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsListingFilterCard,
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  filterPendingDebitNotes,
  listPendingDebitNoteReturns,
  type PendingDebitNoteRow,
} from "../pending-debit-notes-data";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "../note-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";
import { Label } from "@/components/ui/label";

function PendingDebitNotesTable({
  toolbarFiltered,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  toolbarFiltered: PendingDebitNoteRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const visible = useAccountsFilteredRows(toolbarFiltered);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  return (
    <>
      <AccountsTable minWidth={1040}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Return No." colKey="returnNumber" />
            <SortTh label="Date" colKey="returnDate" filterType="date" />
            <SortTh label="Supplier" colKey="supplierName" className="accounts-col-party" />
            <SortTh label="PO No." colKey="poNumber" />
            <SortTh label="GRN No." colKey="grnNo" />
            <SortTh label="Dispatch" colKey="dispatchNo" />
            <SortTh label="Qty" colKey="totalReturnQty" filterType="amount" align="right" />
            <SortTh label="Taxable" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="GST" colKey="gstAmount" filterType="amount" align="right" />
            <SortTh label="Total" colKey="totalAmount" filterType="amount" align="right" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("single")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={11}
              message="No purchase returns pending debit note."
            />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={11} message="No records match the column filters." />
          ) : (
            pagedRows.map((row) => (
              <AccountsTableRow key={row.returnId}>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate text-xs">
                  {row.returnNumber}
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs whitespace-nowrap">{row.returnDate}</AccountsTableCell>
                <AccountsTableCell className="accounts-col-party font-medium truncate text-xs" title={row.supplierName}>
                  {row.supplierName}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">{row.poNumber}</AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">{row.grnNo || "—"}</AccountsTableCell>
                <AccountsTableCell mono className="truncate text-xs">{row.dispatchNo || row.packingNo || "—"}</AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums text-xs">{row.totalReturnQty}</AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs tabular-nums">
                  {formatINR(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs font-medium tabular-nums">
                  {formatINR(row.totalAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                  <AccountsTableActionCell variant="single">
                    <AccountsGenerateAction
                      title="Create Debit Note"
                      onClick={() => router.push(`${DEBIT_NOTES_LIST_PATH}/new?returnId=${row.returnId}`)}
                    />
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
      {visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="pending returns"
        />
      ) : null}
    </>
  );
}

export function PendingDebitNotesPanel() {
  const [rows, setRows] = useState<PendingDebitNoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [dispatchFilter, setDispatchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const refresh = useCallback(() => setRows(listPendingDebitNoteReturns()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const toolbarFiltered = useMemo(
    () => filterPendingDebitNotes(rows, search, dispatchFilter),
    [rows, search, dispatchFilter],
  );

  const getCellValue = useCallback((row: PendingDebitNoteRow, key: string) => {
    if (key === "dispatchNo") return row.dispatchNo || row.packingNo || "";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      returnNumber: { type: "text" as const },
      returnDate: { type: "date" as const },
      supplierName: { type: "text" as const },
      poNumber: { type: "text" as const },
      grnNo: { type: "text" as const },
      dispatchNo: { type: "text" as const },
      totalReturnQty: { type: "amount" as const },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      totalAmount: { type: "amount" as const },
    }),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [search, dispatchFilter, pageSize]);

  return (
    <AccountsTableListing
      toolbar={
        <AccountsListingFilterCard>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search return no., supplier, PO, GRN…"
            className="min-w-[180px] flex-1 max-w-sm"
          />
          <div className="space-y-0.5 flex-shrink-0">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Dispatch</Label>
            <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
              <SelectTrigger className="h-8 w-[148px] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                <SelectItem value="Ready for Dispatch" className="text-xs">Ready for Dispatch</SelectItem>
                <SelectItem value="Dispatched" className="text-xs">Dispatched</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AccountsListingFilterCard>
      }
    >
      <AccountsColumnFilterProvider
        rows={toolbarFiltered}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey="returnDate"
        defaultSortDir="desc"
      >
        <PendingDebitNotesTable
          toolbarFiltered={toolbarFiltered}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
