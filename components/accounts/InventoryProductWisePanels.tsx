"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ChevronLeft } from "lucide-react";
import {
  LedgerService,
  type InventoryProductWiseRow,
  type CogsProductWiseRow,
  type SalesProductWiseRow,
  type ProductTransactionRow,
} from "@/services/ledger.service";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
// ProductTransactionRow is used only via LedgerService return type below
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { useAccountsColumnFilters } from "@/components/accounts/useAccountsColumnFilters";
import { AccountsColumnFilterContext } from "@/components/accounts/AccountsColumnFilterContext";
import type { AccountsColumnFilterState } from "@/lib/accounts/column-filter-types";
import { CoaLedgerDetailTable } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaLedgerDetailTable";
import type { CoaLedgerDetailRow } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-demo-accounting";

// ─── helpers: translate filter context → backend params ──────────────────────

function textFilterToSearch(f: AccountsColumnFilterState | undefined): string | undefined {
  if (!f) return undefined;
  if (f.type === "text") {
    if (f.textOperator === "blank" || f.textOperator === "notBlank") return undefined;
    return f.textValue?.trim() || undefined;
  }
  if (f.selectedValues?.length) return f.selectedValues[0];
  return undefined;
}

function amountFilterToRange(f: AccountsColumnFilterState | undefined): {
  min?: number;
  max?: number;
} {
  if (!f || f.type !== "amount") return {};
  const op = f.numberOperator;
  const v1 = f.numberValue;
  const v2 = f.numberValue2;
  if (op === "equals" && v1 !== undefined) return { min: v1, max: v1 };
  if (op === "gt" && v1 !== undefined) return { min: v1 };
  if (op === "lt" && v1 !== undefined) return { max: v1 };
  if (op === "between" && v1 !== undefined && v2 !== undefined)
    return { min: Math.min(v1, v2), max: Math.max(v1, v2) };
  return {};
}

function ProductWiseSkeleton() {
  return (
    <div className="p-4 space-y-2 flex-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

// ─── Product Transactions Drill-down ─────────────────────────────────────────

type LedgerKind = "stock-in-hand" | "cogs" | "sales";

/**
 * Convert flat backend rows (sorted asc by date) to CoaLedgerDetailRow format
 * with a running balance computed from debit/credit accumulation.
 */
function toDetailRows(raw: ProductTransactionRow[]): CoaLedgerDetailRow[] {
  // Sort ascending by date so running balance is chronological
  const sorted = [...raw].sort((a, b) => a.date.localeCompare(b.date));
  let balance = 0;
  let side: "Debit" | "Credit" = "Debit";

  return sorted.map((r) => {
    balance += r.debit - r.credit;
    side = balance >= 0 ? "Debit" : "Credit";
    return {
      date: r.date,
      voucherNo: r.voucherNo,
      voucherType: r.voucherType,
      referenceNo: r.referenceNo ?? "",
      narration: r.narration ?? "",
      debit: r.debit,
      credit: r.credit,
      runningBalance: Math.abs(balance),
      runningBalanceType: side,
    };
  });
}

function ProductTransactionsPanel({
  ledgerKind,
  product,
  dateFrom,
  dateTo,
  onBack,
}: {
  ledgerKind: LedgerKind;
  product: { productId: string; productName: string; productCode: string | null };
  dateFrom: string;
  dateTo: string;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<ProductTransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    LedgerService.getProductTransactions(
      ledgerKind,
      {
        productId: product.productId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 200,
      },
      controller.signal,
    )
      .then((res) => setRows(res.data ?? []))
      .catch((err: unknown) => {
        if (!axios.isCancel(err)) {
          const e = err as { message?: string };
          setError(e?.message ?? "Failed to load transactions.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [ledgerKind, product.productId, dateFrom, dateTo]);

  const detailRows = toDetailRows(rows);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = Math.abs(totalDebit - totalCredit);
  const closingBalanceType: "Debit" | "Credit" = totalDebit >= totalCredit ? "Debit" : "Credit";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Back header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs" onClick={onBack}>
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <span className="text-sm font-medium text-foreground truncate">
          {product.productName}
        </span>
        {product.productCode && (
          <span className="text-xs text-muted-foreground">({product.productCode})</span>
        )}
      </div>

      {loading ? (
        <ProductWiseSkeleton />
      ) : error ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <CoaLedgerDetailTable
          rows={detailRows}
          footer={{
            totalDebit,
            totalCredit,
            closingBalance,
            closingBalanceType,
          }}
          emptyLabel="No transactions found for this product in the selected period."
        />
      )}
    </div>
  );
}

// ─── Stock in Hand ────────────────────────────────────────────────────────────

function InventoryTableInner({
  rows,
  summary,
  filterCtx,
  onProductClick,
}: {
  rows: InventoryProductWiseRow[];
  summary: { totalProducts: number; totalInventoryValue: number } | null;
  filterCtx: ReturnType<typeof useAccountsColumnFilters<InventoryProductWiseRow>>;
  onProductClick: (row: InventoryProductWiseRow) => void;
}) {
  const h = filterCtx.headerProps;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={800}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsColumnHeader {...h("productName", "Product", { filterType: "text" })} />
              <AccountsColumnHeader {...h("uom", "UOM", { filterType: "text" })} />
              <AccountsColumnHeader {...h("netQuantityConsumed", "Qty Consumed (Net)", { filterType: "amount", align: "right" })} />
              <AccountsColumnHeader {...h("averageUnitCost", "Avg Unit Cost", { filterType: "amount", align: "right" })} />
              <AccountsColumnHeader {...h("netInventoryValue", "Inventory Value (Net)", { filterType: "amount", align: "right" })} />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={5} className="accounts-table-empty">
                  No records match the current filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              rows.map((r) => (
                <AccountsTableRow
                  key={r.productId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onProductClick(r)}
                >
                  <AccountsTableCell>
                    <span className="font-medium text-foreground">{r.productName}</span>
                    {r.productCode && (
                      <span className="block text-muted-foreground text-[10px]">{r.productCode}</span>
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-muted-foreground whitespace-nowrap">
                    {r.uom || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                    {r.netQuantityConsumed.toLocaleString()}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                    {formatMoney(r.averageUnitCost)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap font-medium text-green-700">
                    {formatMoney(r.netInventoryValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 border-t border-border bg-muted/20 text-xs flex-shrink-0">
        {summary && (
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.totalProducts}</span> products
          </span>
        )}
        <span className="tabular-nums ml-auto">
          <span className="text-muted-foreground">Total Inventory Value: </span>
          <span className="font-semibold text-green-700">
            {formatMoney(summary?.totalInventoryValue ?? 0)}
          </span>
        </span>
      </div>
    </div>
  );
}

export function InventoryProductWisePanel({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const [rows, setRows] = useState<InventoryProductWiseRow[]>([]);
  const [summary, setSummary] = useState<{ totalProducts: number; totalInventoryValue: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillProduct, setDrillProduct] = useState<InventoryProductWiseRow | null>(null);

  const getCellValue = useCallback((row: InventoryProductWiseRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const filterCtx = useAccountsColumnFilters<InventoryProductWiseRow>({
    rows,
    getCellValue,
    columnConfig: {
      productName: { type: "text" },
      uom: { type: "text" },
      netQuantityConsumed: { type: "amount" },
      averageUnitCost: { type: "amount" },
      netInventoryValue: { type: "amount" },
    },
    defaultSortKey: "productName",
    defaultSortDir: "asc",
  });

  const searchParam = textFilterToSearch(filterCtx.columnFilters["productName"])
    ?? textFilterToSearch(filterCtx.columnFilters["uom"]);
  const valueRange = amountFilterToRange(filterCtx.columnFilters["netInventoryValue"]);
  const qtyRange = amountFilterToRange(filterCtx.columnFilters["netQuantityConsumed"]);
  const sortBy = filterCtx.sortKey || "productName";
  const sortDir = filterCtx.sortDir;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    LedgerService.getStockInHandProductWise(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 200,
        sortBy,
        sortDir,
        search: searchParam,
        minValue: valueRange.min,
        maxValue: valueRange.max,
        minQty: qtyRange.min,
        maxQty: qtyRange.max,
      },
      controller.signal,
    )
      .then((res) => {
        setRows(res.data ?? []);
        setSummary(res.summary ?? null);
      })
      .catch((err: unknown) => {
        if (!axios.isCancel(err)) {
          const e = err as { message?: string };
          setError(e?.message ?? "Failed to load product data.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [dateFrom, dateTo, sortBy, sortDir, searchParam, valueRange.min, valueRange.max, qtyRange.min, qtyRange.max]);

  if (drillProduct) {
    return (
      <ProductTransactionsPanel
        ledgerKind="stock-in-hand"
        product={drillProduct}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onBack={() => setDrillProduct(null)}
      />
    );
  }

  if (loading) return <ProductWiseSkeleton />;

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <AccountsColumnFilterContext.Provider value={filterCtx}>
      <InventoryTableInner rows={rows} summary={summary} filterCtx={filterCtx} onProductClick={setDrillProduct} />
    </AccountsColumnFilterContext.Provider>
  );
}

// ─── COGS ─────────────────────────────────────────────────────────────────────

function CogsTableInner({
  rows,
  summary,
  filterCtx,
  onProductClick,
}: {
  rows: CogsProductWiseRow[];
  summary: { totalProducts: number; totalCogsValue: number } | null;
  filterCtx: ReturnType<typeof useAccountsColumnFilters<CogsProductWiseRow>>;
  onProductClick: (row: CogsProductWiseRow) => void;
}) {
  const h = filterCtx.headerProps;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={800}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsColumnHeader {...h("productName", "Product", { filterType: "text" })} />
              <AccountsColumnHeader {...h("uom", "UOM", { filterType: "text" })} />
              <AccountsColumnHeader {...h("netQuantitySold", "Qty Sold (Net)", { filterType: "amount", align: "right" })} />
              <AccountsColumnHeader {...h("averageUnitCost", "Avg Unit Cost", { filterType: "amount", align: "right" })} />
              <AccountsColumnHeader {...h("netCogsValue", "COGS Value", { filterType: "amount", align: "right" })} />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={5} className="accounts-table-empty">
                  No records match the current filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              rows.map((r) => (
                <AccountsTableRow
                  key={r.productId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onProductClick(r)}
                >
                  <AccountsTableCell>
                    <span className="font-medium text-foreground">{r.productName}</span>
                    {r.productCode && (
                      <span className="block text-muted-foreground text-[10px]">{r.productCode}</span>
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-muted-foreground whitespace-nowrap">
                    {r.uom || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                    {r.netQuantitySold.toLocaleString()}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                    {formatMoney(r.averageUnitCost)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap font-medium text-orange-700">
                    {formatMoney(r.netCogsValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 border-t border-border bg-muted/20 text-xs flex-shrink-0">
        {summary && (
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.totalProducts}</span> products
          </span>
        )}
        <span className="tabular-nums ml-auto">
          <span className="text-muted-foreground">Total COGS: </span>
          <span className="font-semibold text-orange-700">
            {formatMoney(summary?.totalCogsValue ?? 0)}
          </span>
        </span>
      </div>
    </div>
  );
}

export function CogsProductWisePanel({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const [rows, setRows] = useState<CogsProductWiseRow[]>([]);
  const [summary, setSummary] = useState<{ totalProducts: number; totalCogsValue: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillProduct, setDrillProduct] = useState<CogsProductWiseRow | null>(null);

  const getCellValue = useCallback((row: CogsProductWiseRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const filterCtx = useAccountsColumnFilters<CogsProductWiseRow>({
    rows,
    getCellValue,
    columnConfig: {
      productName: { type: "text" },
      uom: { type: "text" },
      netQuantitySold: { type: "amount" },
      averageUnitCost: { type: "amount" },
      netCogsValue: { type: "amount" },
    },
    defaultSortKey: "productName",
    defaultSortDir: "asc",
  });

  const searchParam = textFilterToSearch(filterCtx.columnFilters["productName"])
    ?? textFilterToSearch(filterCtx.columnFilters["uom"]);
  const valueRange = amountFilterToRange(filterCtx.columnFilters["netCogsValue"]);
  const qtyRange = amountFilterToRange(filterCtx.columnFilters["netQuantitySold"]);
  const sortBy = filterCtx.sortKey || "productName";
  const sortDir = filterCtx.sortDir;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    LedgerService.getCogsProductWise(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 200,
        sortBy,
        sortDir,
        search: searchParam,
        minValue: valueRange.min,
        maxValue: valueRange.max,
        minQty: qtyRange.min,
        maxQty: qtyRange.max,
      },
      controller.signal,
    )
      .then((res) => {
        setRows(res.data ?? []);
        setSummary(res.summary ?? null);
      })
      .catch((err: unknown) => {
        if (!axios.isCancel(err)) {
          const e = err as { message?: string };
          setError(e?.message ?? "Failed to load COGS data.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [dateFrom, dateTo, sortBy, sortDir, searchParam, valueRange.min, valueRange.max, qtyRange.min, qtyRange.max]);

  if (drillProduct) {
    return (
      <ProductTransactionsPanel
        ledgerKind="cogs"
        product={drillProduct}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onBack={() => setDrillProduct(null)}
      />
    );
  }

  if (loading) return <ProductWiseSkeleton />;

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <AccountsColumnFilterContext.Provider value={filterCtx}>
      <CogsTableInner rows={rows} summary={summary} filterCtx={filterCtx} onProductClick={setDrillProduct} />
    </AccountsColumnFilterContext.Provider>
  );
}

// ─── Sales ────────────────────────────────────────────────────────────────────

function SalesTableInner({
  rows,
  summary,
  filterCtx,
  onProductClick,
}: {
  rows: SalesProductWiseRow[];
  summary: { totalProducts: number; totalSalesValue: number } | null;
  filterCtx: ReturnType<typeof useAccountsColumnFilters<SalesProductWiseRow>>;
  onProductClick: (row: SalesProductWiseRow) => void;
}) {
  const h = filterCtx.headerProps;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={800}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsColumnHeader {...h("productName", "Product", { filterType: "text" })} />
              <AccountsColumnHeader {...h("uom", "UOM", { filterType: "text" })} />
              <AccountsColumnHeader {...h("netSalesQty", "Qty Sold (Net)", { filterType: "amount", align: "right" })} />
              <AccountsColumnHeader {...h("averageUnitCost", "Avg Unit Rate", { filterType: "amount", align: "right" })} />
              <AccountsColumnHeader {...h("netSalesValue", "Sales Value (Net)", { filterType: "amount", align: "right" })} />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={5} className="accounts-table-empty">
                  No records match the current filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              rows.map((r) => (
                <AccountsTableRow
                  key={r.productId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onProductClick(r)}
                >
                  <AccountsTableCell>
                    <span className="font-medium text-foreground">{r.productName}</span>
                    {r.productCode && (
                      <span className="block text-muted-foreground text-[10px]">{r.productCode}</span>
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-muted-foreground whitespace-nowrap">
                    {r.uom || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                    {r.netSalesQty.toLocaleString()}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                    {formatMoney(r.averageUnitCost)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap font-medium text-blue-700">
                    {formatMoney(r.netSalesValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 border-t border-border bg-muted/20 text-xs flex-shrink-0">
        {summary && (
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.totalProducts}</span> products
          </span>
        )}
        <span className="tabular-nums ml-auto">
          <span className="text-muted-foreground">Total Sales Value: </span>
          <span className="font-semibold text-blue-700">
            {formatMoney(summary?.totalSalesValue ?? 0)}
          </span>
        </span>
      </div>
    </div>
  );
}

export function SalesProductWisePanel({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const [rows, setRows] = useState<SalesProductWiseRow[]>([]);
  const [summary, setSummary] = useState<{ totalProducts: number; totalSalesValue: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillProduct, setDrillProduct] = useState<SalesProductWiseRow | null>(null);

  const getCellValue = useCallback((row: SalesProductWiseRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const filterCtx = useAccountsColumnFilters<SalesProductWiseRow>({
    rows,
    getCellValue,
    columnConfig: {
      productName: { type: "text" },
      uom: { type: "text" },
      netSalesQty: { type: "amount" },
      averageUnitCost: { type: "amount" },
      netSalesValue: { type: "amount" },
    },
    defaultSortKey: "productName",
    defaultSortDir: "asc",
  });

  const searchParam = textFilterToSearch(filterCtx.columnFilters["productName"])
    ?? textFilterToSearch(filterCtx.columnFilters["uom"]);
  const valueRange = amountFilterToRange(filterCtx.columnFilters["netSalesValue"]);
  const qtyRange = amountFilterToRange(filterCtx.columnFilters["netSalesQty"]);
  const sortBy = filterCtx.sortKey || "productName";
  const sortDir = filterCtx.sortDir;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    LedgerService.getSalesProductWise(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 200,
        sortBy,
        sortDir,
        search: searchParam,
        minValue: valueRange.min,
        maxValue: valueRange.max,
        minQty: qtyRange.min,
        maxQty: qtyRange.max,
      },
      controller.signal,
    )
      .then((res) => {
        setRows(res.data ?? []);
        setSummary(res.summary ?? null);
      })
      .catch((err: unknown) => {
        if (!axios.isCancel(err)) {
          const e = err as { message?: string };
          setError(e?.message ?? "Failed to load Sales data.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [dateFrom, dateTo, sortBy, sortDir, searchParam, valueRange.min, valueRange.max, qtyRange.min, qtyRange.max]);

  if (drillProduct) {
    return (
      <ProductTransactionsPanel
        ledgerKind="sales"
        product={drillProduct}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onBack={() => setDrillProduct(null)}
      />
    );
  }

  if (loading) return <ProductWiseSkeleton />;

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <AccountsColumnFilterContext.Provider value={filterCtx}>
      <SalesTableInner rows={rows} summary={summary} filterCtx={filterCtx} onProductClick={setDrillProduct} />
    </AccountsColumnFilterContext.Provider>
  );
}
