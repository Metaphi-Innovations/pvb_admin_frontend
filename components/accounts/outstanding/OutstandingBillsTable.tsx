"use client";

import { ChevronDown, ChevronsUpDown } from "lucide-react";
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
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import {
  formatOutstandingReportDate,
} from "@/lib/accounts/bill-wise-outstanding-display";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { OutstandingBillDisplayRow } from "@/types/bill-wise-outstanding.types";

const SORTABLE: Record<string, string> = {
  documentNumber: "documentNumber",
  invoiceDate: "invoiceDate",
  dueDate: "dueDate",
  originalAmount: "originalAmount",
  adjustedAmount: "adjustedAmount",
  outstandingAmount: "outstandingAmount",
  ageingDays: "ageingDays",
};

function statusPillClass(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  if (s.includes("overdue")) return "bg-red-50 text-red-700";
  if (s.includes("partial")) return "bg-amber-50 text-amber-700";
  if (s.includes("paid") || s.includes("settled") || s.includes("clear")) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (
    s.includes("pending") ||
    s.includes("open") ||
    s.includes("unpaid") ||
    s.includes("due")
  ) {
    return "bg-navy-50 text-navy-700";
  }
  return "bg-slate-100 text-slate-600";
}

function statusDisplayLabel(status: string): string {
  const key = status.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) return "—";
  return key;
}

function SortHeader({
  label,
  colKey,
  sortBy,
  sortOrder,
  onSort,
  align,
}: {
  label: string;
  colKey: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  align?: "left" | "right";
}) {
  const active = sortBy === colKey;
  return (
    <AccountsTableHeadCell
      className={cn(
        "cursor-pointer select-none whitespace-nowrap",
        active && "bg-brand-50/60",
        align === "right" && "text-right",
      )}
      onClick={() => onSort?.(colKey)}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          align === "right" && "justify-end",
        )}
      >
        <span className={active ? "text-brand-700" : "text-foreground"}>
          {label}
        </span>
        {active ? (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-brand-600 transition-transform",
              sortOrder === "desc" && "rotate-180",
            )}
          />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40" />
        )}
      </div>
    </AccountsTableHeadCell>
  );
}

export function OutstandingBillsTable({
  rows,
  loading,
  error,
  emptyMessage = "No outstanding bills found.",
  docLabel = "Invoice",
  sortBy,
  sortOrder,
  onSort,
  onView,
}: {
  rows: OutstandingBillDisplayRow[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  docLabel?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  onView?: (row: OutstandingBillDisplayRow) => void;
}) {
  const handleSort = (key: string) => {
    if (!SORTABLE[key] || !onSort) return;
    onSort(key);
  };

  return (
    <AccountsTableScroll className="flex-1 min-h-0">
      <AccountsTable minWidth={1200} className="text-xs financial-report">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortHeader
              label={`${docLabel} No.`}
              colKey="documentNumber"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortHeader
              label={`${docLabel} Date`}
              colKey="invoiceDate"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortHeader
              label="Due Date"
              colKey="dueDate"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortHeader
              label="Original Amount"
              colKey="originalAmount"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Adjusted Amount"
              colKey="adjustedAmount"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Outstanding Amount"
              colKey="outstandingAmount"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              align="right"
            />
            <SortHeader
              label="Ageing Days"
              colKey="ageingDays"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              align="right"
            />
            <AccountsTableHeadCell>Status</AccountsTableHeadCell>
            <AccountsTableHeadCell
              className={cn("text-right", accountsActionColClass("single"))}
            >
              View
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {loading ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={9} className="accounts-table-empty">
                Loading bill-wise outstanding…
              </AccountsTableCell>
            </AccountsTableRow>
          ) : error ? (
            <AccountsTableRow>
              <AccountsTableCell
                colSpan={9}
                className="accounts-table-empty text-red-600"
              >
                {error}
              </AccountsTableCell>
            </AccountsTableRow>
          ) : rows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={9} className="accounts-table-empty">
                {emptyMessage}
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            rows.map((row) => (
              <AccountsTableRow key={row.openItemId} className="group">
                <AccountsTableCell>
                  <span className="font-mono text-xs font-semibold text-brand-700">
                    {row.documentNumber}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell>
                  {formatOutstandingReportDate(row.invoiceDate)}
                </AccountsTableCell>
                <AccountsTableCell>
                  {formatOutstandingReportDate(row.dueDate)}
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  <span className="tabular-nums">
                    {formatMoney(row.originalAmount)}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  <span className="tabular-nums">
                    {formatMoney(row.adjustedAmount)}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  <span className="tabular-nums font-semibold">
                    {formatMoney(row.outstandingAmount)}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      row.isOverdue && "text-red-600 font-semibold",
                    )}
                  >
                    {Math.max(0, Math.floor(row.ageingDays || 0))}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell>
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                      statusPillClass(row.displayStatus),
                    )}
                  >
                    {statusDisplayLabel(row.displayStatus)}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  className={accountsActionColClass("single")}
                >
                  <AccountsTableActionCell variant="single">
                    <AccountsViewAction
                      title={`View ${docLabel.toLowerCase()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onView?.(row);
                      }}
                    />
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
