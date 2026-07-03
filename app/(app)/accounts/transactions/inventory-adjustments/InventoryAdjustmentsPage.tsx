"use client";

import { useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { loadInventoryAdjustments } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";

export default function InventoryAdjustmentsPage() {
  const [tab, setTab] = useState("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const records = loadInventoryAdjustments();

  const rows = useMemo(() => {
    let list = tab === "all" ? records : records.filter((r) => r.status === tab);
    if (dateFrom) list = list.filter((r) => r.date >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date <= dateTo);
    return list;
  }, [records, tab, dateFrom, dateTo]);

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
      <AccountsTableListing>
        <AccountsTable minWidth={720}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>Adjustment No.</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Warehouse</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Type</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Value</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={6} className="accounts-table-empty">
                  No inventory adjustments in this status.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              rows.map((r) => (
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
                  <AccountsTableCell>
                    <StatusBadge status={r.status} />
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
