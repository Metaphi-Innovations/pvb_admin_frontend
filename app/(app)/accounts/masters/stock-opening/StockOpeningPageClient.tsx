"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useFY } from "@/lib/fy-store";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { loadAccountItems } from "@/lib/accounts/account-items-data";
import {
  loadStockOpeningRows,
  saveStockOpeningRows,
  WAREHOUSE_OPTIONS,
  type StockOpeningRow,
} from "@/lib/accounts/stock-opening-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { stockOpeningImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { ACCOUNTS_FILTER_CONTROL_CLASS } from "@/lib/accounts/accounts-typography";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import {
  ReportFilterRow,
  ReportSearchFilter,
  ReportFilterResetButton,
} from "@/components/accounts/ReportFilters";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";

function fyStartIso(fyLabel: string): string {
  const match = fyLabel.match(/(\d{4})/);
  if (!match) return new Date().toISOString().slice(0, 10);
  return `${match[1]}-04-01`;
}

function exportStockOpeningCsv(rows: StockOpeningRow[], fyLabel: string) {
  const header = ["Item", "SKU", "Warehouse", "Qty", "Rate", "Value", "Batch", "Expiry", "Date", "FY"].join(",");
  const body = rows
    .map((r) =>
      [
        r.itemName,
        r.sku,
        r.warehouse,
        r.openingQty,
        r.rate,
        r.openingValue,
        r.batchNo,
        r.expiryDate,
        r.date,
        r.financialYear,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-opening-${fyLabel.replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StockOpeningPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();
  const { toast, showToast, dismissToast, showCreated } = useAccountsToast();
  const sectionRefresh = useAccountsSectionRefresh("stock-opening");
  const items = useMemo(() => loadAccountItems(), []);

  const [rows, setRows] = useState<StockOpeningRow[]>(() => loadStockOpeningRows());

  useEffect(() => {
    setRows(loadStockOpeningRows());
  }, [sectionRefresh]);

  const [listSearch, setListSearch] = useState("");
  const [listWarehouse, setListWarehouse] = useState("all");
  const [listItemSku, setListItemSku] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [date, setDate] = useState(() => fyStartIso(selectedFY.id));
  const [warehouse, setWarehouse] = useState(WAREHOUSE_OPTIONS[0]);
  const [itemSku, setItemSku] = useState(items[0]?.sku ?? "");
  const [qty, setQty] = useState(0);
  const [rate, setRate] = useState(0);
  const [batchNo, setBatchNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setDate(fyStartIso(selectedFY.id));
  }, [selectedFY.id]);

  const warehouseOptions = useMemo(
    () => WAREHOUSE_OPTIONS.map((w) => ({ value: w, label: w })),
    [],
  );

  const itemOptions = useMemo(
    () => items.map((i) => ({ value: i.sku, label: i.itemName, sub: i.sku })),
    [items],
  );

  const listWarehouseOptions = useMemo(
    () => [{ value: "all", label: "All warehouses" }, ...warehouseOptions],
    [warehouseOptions],
  );

  const listItemOptions = useMemo(
    () => [{ value: "all", label: "All items" }, ...itemOptions],
    [itemOptions],
  );

  const resetEntryFields = () => {
    setDate(fyStartIso(selectedFY.id));
    setWarehouse(WAREHOUSE_OPTIONS[0]);
    setItemSku(items[0]?.sku ?? "");
    setQty(0);
    setRate(0);
    setBatchNo("");
    setExpiry("");
    setRemarks("");
  };

  const entrySnapshot = useMemo(
    () => ({ date, warehouse, itemSku, qty, rate, batchNo, expiry, remarks }),
    [date, warehouse, itemSku, qty, rate, batchNo, expiry, remarks],
  );
  const isDirty = useFormDirtySnapshot(entrySnapshot, { ready: true });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: "/accounts/masters/stock-opening",
    isDirty,
    onNavigate: resetEntryFields,
  });

  const addRow = () => {
    const item = items.find((i) => i.sku === itemSku);
    if (!item) {
      showToast("Select a valid item.", "error");
      return;
    }
    if (qty <= 0 || rate <= 0) {
      showToast("Enter quantity and rate greater than zero.", "error");
      return;
    }
    const row: StockOpeningRow = {
      id: `so-${Date.now()}`,
      financialYear: selectedFY.id,
      date,
      warehouse,
      itemName: item.itemName,
      sku: item.sku,
      openingQty: qty,
      rate,
      openingValue: qty * rate,
      batchNo,
      expiryDate: expiry,
      remarks,
    };
    const next = [...rows, row];
    setRows(next);
    saveStockOpeningRows(next);
    dispatchAccountsDataChanged("stock-opening", { operation: "create", recordId: row.id });
    showCreated("Stock opening entry");
    resetEntryFields();
  };

  const fyRows = useMemo(
    () => rows.filter((r) => r.financialYear === selectedFY.id),
    [rows, selectedFY.id],
  );

  const filteredRows = useMemo(() => {
    let list = [...fyRows];
    if (listWarehouse !== "all") {
      list = list.filter((r) => r.warehouse === listWarehouse);
    }
    if (listItemSku !== "all") {
      list = list.filter((r) => r.sku === listItemSku);
    }
    const q = listSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.itemName, r.sku, r.warehouse, r.batchNo, r.remarks].join(" ").toLowerCase().includes(q),
      );
    }
    return list;
  }, [fyRows, listWarehouse, listItemSku, listSearch]);

  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [listSearch, listWarehouse, listItemSku, selectedFY.id, pageSize]);

  const listFiltersActive =
    listSearch.trim() !== "" || listWarehouse !== "all" || listItemSku !== "all";

  const totalOpening = useMemo(() => fyRows.reduce((s, r) => s + r.openingValue, 0), [fyRows]);
  const impactLines = useMemo(() => stockOpeningImpactResolved(totalOpening), [totalOpening]);

  const emptyMessage =
    fyRows.length === 0
      ? `No stock opening entries for ${selectedFY.label} yet. Add an entry above.`
      : listFiltersActive
        ? "No entries match the current filters."
        : "No stock opening entries found.";

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Inventory", "Stock Opening")}
      title="Stock Opening"
      description="Opening stock entry — Dr Inventory, Cr Opening Balance Adjustment."
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-4 border-b border-border/60 bg-muted/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Add Opening Entry
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Financial Year</Label>
              <div
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "flex items-center px-2.5 bg-muted/30 text-xs font-medium",
                )}
              >
                {selectedFY.label}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <AccountsDateInput value={date} onChange={setDate} aria-label="Opening date" />
            </div>
            <SearchableSelect
              label="Warehouse"
              value={warehouse}
              onChange={setWarehouse}
              options={warehouseOptions}
              placeholder="Select warehouse…"
            />
            <SearchableSelect
              label="Item"
              value={itemSku}
              onChange={setItemSku}
              options={itemOptions}
              placeholder="Select item…"
              required
            />
            <div className="space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                className="h-9 text-sm font-medium"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rate</Label>
              <AccountsMoneyInput className="h-9 text-sm font-medium" value={rate} onChange={(v) => setRate(v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Batch No</Label>
              <Input className="h-9 text-sm font-medium" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expiry</Label>
              <AccountsDateInput value={expiry} onChange={setExpiry} aria-label="Expiry date" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Remarks</Label>
              <Input className="h-9 text-sm font-medium" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" className="h-9 text-sm font-medium bg-brand-600 text-white" onClick={addRow}>
                Add Row
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-sm font-medium"
                onClick={requestCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-4 py-2 border-b border-border/60 bg-white">
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onCsv={() => exportStockOpeningCsv(filteredRows, selectedFY.label)}
                disabled={filteredRows.length === 0}
              />
            }
          >
            <ReportSearchFilter
              value={listSearch}
              onChange={setListSearch}
              placeholder="Search item, warehouse, batch…"
            />
            <SearchableSelect
              label="Warehouse"
              value={listWarehouse}
              onChange={setListWarehouse}
              options={listWarehouseOptions}
              placeholder="All warehouses"
            />
            <SearchableSelect
              label="Item"
              value={listItemSku}
              onChange={setListItemSku}
              options={listItemOptions}
              placeholder="All items"
            />
            <ReportFilterResetButton
              showOnlyWhenActive
              active={listFiltersActive}
              onClick={() => {
                setListSearch("");
                setListWarehouse("all");
                setListItemSku("all");
              }}
            />
          </ReportFilterRow>
        </div>

        <AccountsTableScroll className="flex-1 min-h-0">
          {!mounted ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading stock opening…</div>
          ) : (
            <AccountsTable minWidth={900} className="text-xs">
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  {["Item", "Warehouse", "Qty", "Rate", "Value", "Batch", "Expiry", "Date"].map((h) => (
                    <AccountsTableHeadCell key={h}>{h}</AccountsTableHeadCell>
                  ))}
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {pagedRows.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={8} className="accounts-table-empty py-12 text-center text-sm">
                      {emptyMessage}
                      {listFiltersActive && fyRows.length > 0 && (
                        <button
                          type="button"
                          className="block mx-auto mt-2 text-xs text-brand-600 hover:underline"
                          onClick={() => {
                            setListSearch("");
                            setListWarehouse("all");
                            setListItemSku("all");
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : (
                  pagedRows.map((r) => (
                    <AccountsTableRow key={r.id}>
                      <AccountsTableCell>{r.itemName}</AccountsTableCell>
                      <AccountsTableCell>{r.warehouse}</AccountsTableCell>
                      <AccountsTableCell align="right" className="tabular-nums">
                        {r.openingQty}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="tabular-nums">
                        {formatMoney(r.rate)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="tabular-nums">
                        {formatMoney(r.openingValue)}
                      </AccountsTableCell>
                      <AccountsTableCell className="font-mono">{r.batchNo || "—"}</AccountsTableCell>
                      <AccountsTableCell>{r.expiryDate || "—"}</AccountsTableCell>
                      <AccountsTableCell className="tabular-nums">{r.date}</AccountsTableCell>
                    </AccountsTableRow>
                  ))
                )}
              </AccountsTableBody>
            </AccountsTable>
          )}
        </AccountsTableScroll>

        {filteredRows.length > 0 && (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={filteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      <LedgerImpactPreview lines={impactLines} title="Ledger Impact Preview" className="mt-4" />
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}
    </AccountsPageShell>
  );
}
