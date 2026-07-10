"use client";

import { useCallback, useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  SectionTabs,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { loadInventoryAdjustments } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

type AdjustmentRow = ReturnType<typeof loadInventoryAdjustments>[number];

function InventoryAdjustmentsTable({
  toolbarRows,
}: {
  toolbarRows: AdjustmentRow[];
}) {
  const visible = useAccountsFilteredRows(toolbarRows);

  return (
    <AccountsTable minWidth={720}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Adjustment No." colKey="adjustmentNo" />
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Warehouse" colKey="warehouse" />
          <SortTh label="Type" colKey="type" />
          <SortTh label="Value" colKey="amount" filterType="amount" align="right" />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {visible.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={5} className="accounts-table-empty">
              {toolbarRows.length === 0
                ? "No inventory adjustments in this status."
                : "No records match the column filters."}
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          visible.map((r) => (
            <AccountsTableRow key={r.id}>
              <AccountsTableCell mono className="font-semibold text-brand-700">
                {r.adjustmentNo}
              </AccountsTableCell>
              <AccountsTableCell>{r.date}</AccountsTableCell>
              <AccountsTableCell>{r.warehouse}</AccountsTableCell>
              <AccountsTableCell>{r.type}</AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoney(r.amount)}
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function InventoryAdjustmentsPage() {
  const [tab, setTab] = useState("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const records = loadInventoryAdjustments();

  const toolbarRows = useMemo(() => {
    let list = tab === "all" ? records : records.filter((r) => r.status === tab);
    if (dateFrom) list = list.filter((r) => r.date >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date <= dateTo);
    return list;
  }, [records, tab, dateFrom, dateTo]);

  const getCellValue = useCallback(
    (row: AdjustmentRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Inventory Adjustments")}
      title="Inventory Adjustments"
      description="Stock adjustments from warehouse — read-only demo listing."
      filters={
        <div className="space-y-3">
          <ReportFilterRow>
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </ReportFilterRow>
          <SectionTabs
            tabs={[
              { id: "all", label: "All" },
              { id: "draft", label: "Draft" },
              { id: "approved", label: "Approved" },
              { id: "posted", label: "Posted" },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
      }
      layout="split"
    >
      <AccountsColumnFilterProvider
        rows={toolbarRows}
        getCellValue={getCellValue}
        columnConfig={{
          adjustmentNo: { type: "text" },
          date: { type: "date" },
          warehouse: { type: "text" },
          type: { type: "text" },
          amount: { type: "amount" },
        }}
        defaultSortKey="date"
        defaultSortDir="desc"
      >
        <AccountsTableListing>
          <InventoryAdjustmentsTable toolbarRows={toolbarRows} />
        </AccountsTableListing>
      </AccountsColumnFilterProvider>
    </AccountsPageShell>
  );
}
