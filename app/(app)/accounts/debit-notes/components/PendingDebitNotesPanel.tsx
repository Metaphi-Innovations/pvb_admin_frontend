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
  AccountsTableHeadCell,
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
  filterPendingDebitNotes,
  listPendingDebitNoteReturns,
  type PendingDebitNoteRow,
} from "../pending-debit-notes-data";
import { DEBIT_NOTES_LIST_PATH, formatINR } from "../note-utils";

export function PendingDebitNotesPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<PendingDebitNoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [dispatchFilter, setDispatchFilter] = useState("all");

  const refresh = useCallback(() => setRows(listPendingDebitNoteReturns()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(
    () => filterPendingDebitNotes(rows, search, dispatchFilter),
    [rows, search, dispatchFilter],
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
                <AccountsTableHeadCell uppercase>Return No.</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase className="accounts-col-party">Supplier</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>PO No.</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>GRN No.</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Dispatch</AccountsTableHeadCell>
                <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase>Qty</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase>Taxable</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase>GST</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase>Total</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>
                  Action
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {visible.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={12}
                  message="No purchase returns pending debit note. Returns appear here when ready for dispatch or dispatched without a debit note."
                />
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
                    <AccountsTableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
                          row.dispatchStatus === "Dispatched"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-sky-50 text-sky-700",
                        )}
                      >
                        <span
                          className={cn(
                            "w-1 h-1 rounded-full flex-shrink-0",
                            row.dispatchStatus === "Dispatched" ? "bg-emerald-500" : "bg-sky-500",
                          )}
                        />
                        {row.dispatchStatus === "Dispatched" ? "Dispatched" : "Ready"}
                      </span>
                    </AccountsTableCell>
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
      </AccountsListingTableCard>
    </div>
  );
}
