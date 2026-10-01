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
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  formatQty,
  formatStockLedgerDate,
  STOCK_LEDGER_TRANSACTION_TYPE_LABELS,
  type StockLedgerRow,
} from "./stock-ledger-data";

export function StockLedgerTable({ rows }: { rows: StockLedgerRow[] }) {
  const router = useRouter();

  const handleRowClick = (row: StockLedgerRow) => {
    if (row.viewHref) router.push(row.viewHref);
  };

  return (
    <AccountsTable minWidth={1800} className="text-xs">
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Document No." colKey="documentNo" />
          <SortTh label="Transaction Type" colKey="transactionType" />
          <SortTh label="Product Name" colKey="productName" />
          <SortTh label="Product Code" colKey="productCode" />
          <SortTh label="Warehouse" colKey="warehouse" />
          <SortTh label="Batch No." colKey="batchNo" />
          <SortTh label="Mfg Date" colKey="mfgDate" filterType="date" />
          <SortTh label="Expiry Date" colKey="expiryDate" filterType="date" />
          <SortTh label="Opening Qty" colKey="openingQty" filterType="amount" align="right" />
          <SortTh label="In Qty" colKey="inQty" filterType="amount" align="right" />
          <SortTh label="Out Qty" colKey="outQty" filterType="amount" align="right" />
          <SortTh label="Closing Qty" colKey="closingQty" filterType="amount" align="right" />
          <SortTh label="Unit" colKey="unit" />
          <SortTh label="Rate" colKey="rate" filterType="amount" align="right" />
          <SortTh label="Value" colKey="value" filterType="amount" align="right" />
          <SortTh label="Reference Module" colKey="referenceModule" />
          <SortTh label="Created By" colKey="createdBy" />
          <SortTh label="Remarks" colKey="remarks" />
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
