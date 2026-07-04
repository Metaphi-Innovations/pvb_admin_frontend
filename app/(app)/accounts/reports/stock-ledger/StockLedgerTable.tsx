"use client";

import { useRouter } from "next/navigation";
import { SortTh } from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
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
  formatQty,
  formatStockLedgerDate,
  STOCK_LEDGER_TRANSACTION_TYPE_LABELS,
  type StockLedgerRow,
  type StockLedgerSortKey,
} from "./stock-ledger-data";

export function StockLedgerTable({
  rows,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: StockLedgerRow[];
  sortKey: StockLedgerSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const router = useRouter();

  const handleRowClick = (row: StockLedgerRow) => {
    if (row.viewHref) router.push(row.viewHref);
  };

  return (
    <AccountsTable minWidth={1800} className="text-xs">
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <SortTh
            label="Document No."
            colKey="documentNo"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
          <SortTh
            label="Transaction Type"
            colKey="transactionType"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
          <SortTh
            label="Product Name"
            colKey="productName"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
          <AccountsTableHeadCell>Product Code</AccountsTableHeadCell>
          <SortTh
            label="Warehouse"
            colKey="warehouse"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
          <AccountsTableHeadCell>Batch No.</AccountsTableHeadCell>
          <AccountsTableHeadCell>Mfg Date</AccountsTableHeadCell>
          <AccountsTableHeadCell>Expiry Date</AccountsTableHeadCell>
          <AccountsTableHeadCell align="right">Opening Qty</AccountsTableHeadCell>
          <SortTh
            label="In Qty"
            colKey="inQty"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            align="right"
          />
          <SortTh
            label="Out Qty"
            colKey="outQty"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            align="right"
          />
          <SortTh
            label="Closing Qty"
            colKey="closingQty"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            align="right"
          />
          <AccountsTableHeadCell>Unit</AccountsTableHeadCell>
          <AccountsTableHeadCell align="right">Rate</AccountsTableHeadCell>
          <AccountsTableHeadCell align="right">Value</AccountsTableHeadCell>
          <AccountsTableHeadCell>Reference Module</AccountsTableHeadCell>
          <AccountsTableHeadCell>Created By</AccountsTableHeadCell>
          <AccountsTableHeadCell>Remarks</AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.map((row) => (
          <AccountsTableRow
            key={row.id}
            className={cn(row.viewHref && "cursor-pointer group")}
            onClick={() => handleRowClick(row)}
          >
            <AccountsTableCell className="whitespace-nowrap py-2">
              {formatStockLedgerDate(row.date)}
            </AccountsTableCell>
            <AccountsTableCell mono className="py-2">
              <span
                className={cn(
                  "font-mono text-xs font-semibold text-brand-700",
                  row.viewHref && "group-hover:underline",
                )}
              >
                {row.documentNo}
              </span>
            </AccountsTableCell>
            <AccountsTableCell className="py-2 whitespace-nowrap">
              {STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType]}
            </AccountsTableCell>
            <AccountsTableCell wrap className="py-2 font-medium min-w-[140px]">
              {row.productName}
            </AccountsTableCell>
            <AccountsTableCell mono className="py-2 text-brand-700 font-semibold">
              {row.productCode}
            </AccountsTableCell>
            <AccountsTableCell className="py-2 whitespace-nowrap">{row.warehouse}</AccountsTableCell>
            <AccountsTableCell mono className="py-2">
              {row.batchNo}
            </AccountsTableCell>
            <AccountsTableCell className="py-2 whitespace-nowrap">
              {row.mfgDate ? formatStockLedgerDate(row.mfgDate) : "—"}
            </AccountsTableCell>
            <AccountsTableCell className="py-2 whitespace-nowrap">
              {row.expiryDate ? formatStockLedgerDate(row.expiryDate) : "—"}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="tabular-nums py-2">
              {formatQty(row.openingQty, true)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="tabular-nums py-2">
              {formatQty(row.inQty)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="tabular-nums py-2">
              {formatQty(row.outQty)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="tabular-nums font-medium py-2 text-brand-700">
              {formatQty(row.closingQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="py-2">{row.unit}</AccountsTableCell>
            <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "py-2")}>
              {row.rate ? formatMoney(row.rate) : "—"}
            </AccountsTableCell>
            <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "py-2")}>
              {row.value ? formatMoney(row.value) : "—"}
            </AccountsTableCell>
            <AccountsTableCell className="py-2 whitespace-nowrap text-muted-foreground">
              {row.referenceModule}
            </AccountsTableCell>
            <AccountsTableCell className="py-2 whitespace-nowrap">{row.createdBy}</AccountsTableCell>
            <AccountsTableCell wrap className="py-2 text-muted-foreground max-w-[180px]">
              {row.remarks || "—"}
            </AccountsTableCell>
          </AccountsTableRow>
        ))}
      </AccountsTableBody>
    </AccountsTable>
  );
}
