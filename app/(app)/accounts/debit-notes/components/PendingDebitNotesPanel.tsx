"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsTableEmpty,
} from "@/components/accounts/AccountsTableListing";
import { accountsActionColClass } from "@/components/accounts/AccountsTableActions";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import { cn } from "@/lib/utils";
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

function PendingDebitNotesTable({ toolbarFiltered }: { toolbarFiltered: PendingDebitNoteRow[] }) {
  const router = useRouter();
  const visible = useAccountsFilteredRows(toolbarFiltered);

  return (
    <AccountsTableScroll>
      <AccountsTable className="table-fixed w-full">
        <colgroup>
          <col className="w-[9%]" />
          <col className="w-[7%]" />
          <col className="w-[14%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[6%]" />
          <col className="w-[9%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[6%]" />
        </colgroup>
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
              label="Action"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {toolbarFiltered.length === 0 ? (
            <AccountsTableEmpty
              colSpan={11}
              message="No purchase returns pending debit note. Returns appear here when ready for dispatch or dispatched without a debit note."
            />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={11} message="No records match the column filters." />
          ) : (
            visible.map((row) => (
              <AccountsTableRow key={row.returnId}>
                <AccountsTableCell mono className="font-semibold text-brand-700 truncate">
                  {row.returnNumber}
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums whitespace-nowrap">{row.returnDate}</AccountsTableCell>
                <AccountsTableCell className="accounts-col-party font-medium truncate" title={row.supplierName}>
                  {row.supplierName}
                </AccountsTableCell>
                <AccountsTableCell mono className="truncate">{row.poNumber}</AccountsTableCell>
                <AccountsTableCell mono className="truncate">{row.grnNo || "—"}</AccountsTableCell>
                <AccountsTableCell mono className="truncate">{row.dispatchNo || row.packingNo || "—"}</AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {row.totalReturnQty}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="tabular-nums">
                  {formatINR(row.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="tabular-nums">
                  {formatINR(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-medium tabular-nums">
                  {formatINR(row.totalAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[11px] bg-brand-600 hover:bg-brand-700 text-white gap-1 whitespace-nowrap"
                    onClick={() => router.push(`${DEBIT_NOTES_LIST_PATH}/new?returnId=${row.returnId}`)}
                  >
                    <Plus className="w-3 h-3" /> Create
                  </Button>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

export function PendingDebitNotesPanel() {
  const [rows, setRows] = useState<PendingDebitNoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [dispatchFilter, setDispatchFilter] = useState("all");

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

  return (
    <div className="accounts-listing-card flex flex-col flex-1 min-h-0">
      <AccountsListingFilterCard>
        <ReportSearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search return no., supplier, PO, GRN…"
          className="min-w-[180px] flex-1 max-w-sm"
        />
        <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
            <SelectValue placeholder="Dispatch status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All dispatch statuses</SelectItem>
            <SelectItem value="Ready for Dispatch" className="text-xs">Ready for Dispatch</SelectItem>
            <SelectItem value="Dispatched" className="text-xs">Dispatched</SelectItem>
          </SelectContent>
        </Select>
      </AccountsListingFilterCard>

      <AccountsListingTableCard>
        <AccountsColumnFilterProvider
          rows={toolbarFiltered}
          getCellValue={getCellValue}
          columnConfig={columnConfig}
          defaultSortKey="returnDate"
          defaultSortDir="desc"
        >
          <PendingDebitNotesTable toolbarFiltered={toolbarFiltered} />
        </AccountsColumnFilterProvider>
      </AccountsListingTableCard>
    </div>
  );
}
