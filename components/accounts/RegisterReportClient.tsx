"use client";

import { useCallback, useMemo, useState } from "react";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsRichTable,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { EmptySearch } from "@/components/ui/EmptyState";
import { AccountsViewAction, accountsActionColClass } from "@/components/accounts/AccountsTableActions";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchFilter,
  ReportCustomerFilter,
  ReportVendorFilter,
  ReportProductFilter,
  ReportStateFilter,
  ReportViewByFilter,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  SALES_VIEW_BY_OPTIONS,
  PURCHASE_VIEW_BY_OPTIONS,
  buildSalesRegisterSourceRows,
  buildPurchaseRegisterSourceRows,
  filterSalesRegisterRows,
  filterPurchaseRegisterRows,
  aggregateSalesPartyWise,
  aggregatePurchasePartyWise,
  aggregateSalesMonthWise,
  aggregatePurchaseMonthWise,
  aggregateSalesCommodityWise,
  aggregatePurchaseCommodityWise,
  collectSalesStateOptions,
  collectPurchaseStateOptions,
  monthDateRange,
  partyIdFromGroupKey,
  productNameFromCommodityKey,
  type RegisterViewMode,
  type SalesRegisterSourceRow,
  type PurchaseRegisterSourceRow,
} from "@/lib/accounts/register-data";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import { cn } from "@/lib/utils";
import {
  AccountsColumnFilterProvider,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";

export type RegisterReportMode = "sales" | "purchase";

interface RegisterReportClientProps {
  mode: RegisterReportMode;
}

function moneyCell(value: number) {
  return <span className="tabular-nums">{formatMoney(value)}</span>;
}

function linkButton(label: string, onClick: () => void, mono = false) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:underline text-left",
        mono ? "font-mono text-xs font-semibold text-brand-700" : "text-brand-700 font-medium text-xs",
      )}
    >
      {label}
    </button>
  );
}

export function RegisterReportClient({ mode }: RegisterReportClientProps) {
  const isSales = mode === "sales";
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange();

  const [viewBy, setViewBy] = useState<RegisterViewMode>("invoice");
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [partyId, setPartyId] = useState("all");
  const [product, setProduct] = useState("all");
  const [state, setState] = useState("all");
  const { openTransaction, drawer: transactionDrawer } = useTransactionDetailsDrawer();

  const customers = useMemo(() => loadCustomers(), []);
  const vendors = useMemo(() => loadVendors(), []);
  const products = useMemo(
    () => loadProducts().filter((p) => p.status === "active"),
    [],
  );
  const stateOptions = useMemo(
    () => (isSales ? collectSalesStateOptions() : collectPurchaseStateOptions()),
    [isSales],
  );

  const filterParams = useMemo(
    () => ({ search, partyId, product, state, branch }),
    [search, partyId, product, state, branch],
  );

  const salesSource = useMemo(
    () => filterSalesRegisterRows(buildSalesRegisterSourceRows(dateFrom, dateTo), filterParams),
    [dateFrom, dateTo, filterParams],
  );

  const purchaseSource = useMemo(
    () =>
      filterPurchaseRegisterRows(buildPurchaseRegisterSourceRows(dateFrom, dateTo), filterParams),
    [dateFrom, dateTo, filterParams],
  );

  const source = isSales ? salesSource : purchaseSource;

  const summary = useMemo(() => {
    const rows = source as (SalesRegisterSourceRow | PurchaseRegisterSourceRow)[];
    const taxable = rows.reduce((s, r) => s + r.taxable, 0);
    const tax = rows.reduce((s, r) => s + r.tax, 0);
    const total = rows.reduce((s, r) => s + r.total, 0);
    const balance = rows.reduce(
      (s, r) => s + (isSales ? (r as SalesRegisterSourceRow).outstanding : (r as PurchaseRegisterSourceRow).payable),
      0,
    );
    return { count: rows.length, taxable, tax, total, balance };
  }, [source, isSales]);

  const openInvoiceDetail = useCallback(
    (row: SalesRegisterSourceRow | PurchaseRegisterSourceRow) => {
      if (isSales) {
        openTransaction({ type: "sales_invoice", id: row.sourceId });
      } else {
        openTransaction({ type: "purchase_invoice", id: row.sourceId });
      }
    },
    [isSales, openTransaction],
  );

  const drillToInvoiceView = useCallback(
    (opts: { partyId?: string; product?: string; monthKey?: string }) => {
      setViewBy("invoice");
      if (opts.partyId) setPartyId(opts.partyId);
      if (opts.product) setProduct(opts.product);
      if (opts.monthKey) {
        const { from, to } = monthDateRange(opts.monthKey);
        setPreset("custom" as DateRangePresetId);
        setDateFrom(from);
        setDateTo(to);
      }
    },
    [setDateFrom, setDateTo, setPreset],
  );

  const handlePartyDrill = useCallback(
    (groupKey: string) => {
      const id = partyIdFromGroupKey(groupKey);
      if (id) {
        drillToInvoiceView({ partyId: id });
        return;
      }
      const partyRow = source.find((r) => r.party === groupKey.replace("name:", ""));
      if (partyRow) {
        const match = isSales
          ? customers.find((c) => c.customerName === partyRow.party)
          : vendors.find((v) => v.vendorName === partyRow.party);
        if (match) drillToInvoiceView({ partyId: String(match.id) });
      }
    },
    [source, isSales, customers, vendors, drillToInvoiceView],
  );

  const handleCommodityDrill = useCallback(
    (groupKey: string) => {
      const name = productNameFromCommodityKey(source, groupKey);
      if (name) drillToInvoiceView({ product: name });
    },
    [source, drillToInvoiceView],
  );

  const viewByOptions = isSales ? SALES_VIEW_BY_OPTIONS : PURCHASE_VIEW_BY_OPTIONS;
  const docLabel = isSales ? "Invoices" : "Bills";
  const docCountLabel = isSales ? "Total Invoices" : "Total Bills";
  const totalAmountLabel = isSales ? "Total Sales Amount" : "Total Purchase Amount";
  const balanceLabel = isSales ? "Outstanding Amount" : "Payable Amount";
  const partyLabel = isSales ? "Party Name" : "Vendor Name";
  const actionLabel = isSales ? "View Invoices" : "View Bills";
  const section = isSales ? "Sales" : "Purchases";
  const title = isSales ? "Sales Register" : "Purchase Register";
  const description = isSales
    ? "Register of sales invoices with taxable value and tax breakup."
    : "Register of purchase invoices with input tax details.";

  type ExportRow = Record<string, string | number>;

  const { exportRows, exportColumns } = useMemo(() => {
    if (viewBy === "invoice") {
      const rows: ExportRow[] = source.map((r) => ({
        [isSales ? "Invoice No." : "Bill No."]: r.docNo,
        Date: r.date,
        [isSales ? "Customer" : "Supplier"]: r.party,
        "Taxable Value": formatMoney(r.taxable),
        "GST Amount": formatMoney(r.tax),
        Total: formatMoney(r.total),
        Status: r.status,
      }));
      return {
        exportRows: rows,
        exportColumns: Object.keys(rows[0] ?? {
          Doc: "",
          Date: "",
          Party: "",
          Taxable: "",
          Tax: "",
          Total: "",
          Status: "",
        }),
      };
    }

    if (viewBy === "party") {
      const partyRows = isSales
        ? aggregateSalesPartyWise(salesSource)
        : aggregatePurchasePartyWise(purchaseSource);
      const rows: ExportRow[] = partyRows.map((r) => ({
        [partyLabel]: r.partyName,
        GSTIN: r.gstin,
        PAN: r.pan,
        [docCountLabel]: r.docCount,
        "Taxable Amount": formatMoney(r.taxable),
        "GST Amount": formatMoney(r.tax),
        [totalAmountLabel]: formatMoney(r.total),
        [balanceLabel]: formatMoney(r.balance),
      }));
      return { exportRows: rows, exportColumns: Object.keys(rows[0] ?? {}) };
    }

    if (viewBy === "month") {
      const monthRows = isSales
        ? aggregateSalesMonthWise(salesSource)
        : aggregatePurchaseMonthWise(purchaseSource);
      const rows: ExportRow[] = monthRows.map((r) => ({
        Month: r.monthLabel,
        [docCountLabel]: r.docCount,
        "Taxable Amount": formatMoney(r.taxable),
        "GST Amount": formatMoney(r.tax),
        [totalAmountLabel]: formatMoney(r.total),
        [balanceLabel]: formatMoney(r.balance),
      }));
      return { exportRows: rows, exportColumns: Object.keys(rows[0] ?? {}) };
    }

    const commodityRows = isSales
      ? aggregateSalesCommodityWise(salesSource)
      : aggregatePurchaseCommodityWise(purchaseSource);
    const qtyLabel = isSales ? "Quantity Sold" : "Quantity Purchased";
    const rows: ExportRow[] = commodityRows.map((r) => ({
      "Product / Commodity Name": r.productName,
      "Product Code": r.productCode,
      HSN: r.hsn,
      [qtyLabel]: r.qty,
      "Taxable Amount": formatMoney(r.taxable),
      "GST Amount": formatMoney(r.tax),
      [totalAmountLabel]: formatMoney(r.total),
      "Average Rate": formatMoney(r.avgRate),
    }));
    return { exportRows: rows, exportColumns: Object.keys(rows[0] ?? {}) };
  }, [
    viewBy,
    source,
    isSales,
    salesSource,
    purchaseSource,
    partyLabel,
    docCountLabel,
    totalAmountLabel,
    balanceLabel,
  ]);

  const exportCsv = useCallback(() => {
    if (exportRows.length === 0) return;
    const header = exportColumns.join(",") + "\n";
    const body = exportRows
      .map((row) =>
        exportColumns
          .map((col) => `"${String(row[col] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-${viewBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportRows, exportColumns, title, viewBy]);

  const invoiceColumns: AccountsRichColumnDef<SalesRegisterSourceRow | PurchaseRegisterSourceRow>[] =
    useMemo(
      () => [
        {
          key: "docNo",
          label: isSales ? "Invoice No." : "Bill No.",
          render: (row) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openInvoiceDetail(row);
              }}
              className="font-mono text-xs font-semibold text-brand-700 hover:underline"
            >
              {row.docNo}
            </button>
          ),
        },
        { key: "date", label: "Date", render: (row) => row.date },
        {
          key: "party",
          label: isSales ? "Customer" : "Supplier",
          render: (row) => row.party,
        },
        {
          key: "taxable",
          label: "Taxable Value",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.taxable),
        },
        {
          key: "tax",
          label: isSales ? "GST Amount" : "Tax",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.tax),
        },
        {
          key: "total",
          label: isSales ? "Invoice Total (Incl. GST)" : "Total",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.total),
        },
        {
          key: "action",
          label: "",
          align: "center",
          filterable: false,
          sortable: false,
          className: accountsActionColClass("single"),
          render: (row) => (
            <AccountsViewAction
              title={`View ${row.docNo}`}
              onClick={(e) => {
                e.stopPropagation();
                openInvoiceDetail(row);
              }}
            />
          ),
        },
      ],
      [isSales, openInvoiceDetail],
    );

  const partyColumns: AccountsRichColumnDef<ReturnType<typeof aggregateSalesPartyWise>[number]>[] =
    useMemo(
      () => [
        {
          key: "partyName",
          label: partyLabel,
          render: (row) => linkButton(row.partyName, () => handlePartyDrill(row.groupKey)),
        },
        { key: "gstin", label: "GSTIN", render: (row) => row.gstin },
        { key: "pan", label: "PAN", render: (row) => row.pan },
        {
          key: "docCount",
          label: docCountLabel,
          align: "right",
          filterType: "amount",
          render: (row) => row.docCount,
        },
        {
          key: "taxable",
          label: "Taxable Amount",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.taxable),
        },
        {
          key: "tax",
          label: "GST Amount",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.tax),
        },
        {
          key: "total",
          label: totalAmountLabel,
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.total),
        },
        {
          key: "balance",
          label: balanceLabel,
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.balance),
        },
        {
          key: "action",
          label: "Action",
          align: "center",
          filterable: false,
          sortable: false,
          render: (row) => (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm font-medium gap-1 text-brand-700 hover:text-brand-800"
              onClick={() => handlePartyDrill(row.groupKey)}
            >
              <Eye className="w-4 h-4" />
              {actionLabel}
            </Button>
          ),
        },
      ],
      [
        partyLabel,
        docCountLabel,
        totalAmountLabel,
        balanceLabel,
        actionLabel,
        handlePartyDrill,
      ],
    );

  const monthColumns: AccountsRichColumnDef<ReturnType<typeof aggregateSalesMonthWise>[number]>[] =
    useMemo(
      () => [
        {
          key: "monthLabel",
          label: "Month",
          render: (row) =>
            linkButton(row.monthLabel, () => drillToInvoiceView({ monthKey: row.groupKey })),
        },
        {
          key: "docCount",
          label: docCountLabel,
          align: "right",
          filterType: "amount",
          render: (row) => row.docCount,
        },
        {
          key: "taxable",
          label: "Taxable Amount",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.taxable),
        },
        {
          key: "tax",
          label: "GST Amount",
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.tax),
        },
        {
          key: "total",
          label: totalAmountLabel,
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.total),
        },
        {
          key: "balance",
          label: balanceLabel,
          align: "right",
          filterType: "amount",
          render: (row) => moneyCell(row.balance),
        },
        {
          key: "action",
          label: "Action",
          align: "center",
          filterable: false,
          sortable: false,
          render: (row) => (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm font-medium gap-1 text-brand-700 hover:text-brand-800"
              onClick={() => drillToInvoiceView({ monthKey: row.groupKey })}
            >
              <Eye className="w-4 h-4" />
              {actionLabel}
            </Button>
          ),
        },
      ],
      [docCountLabel, totalAmountLabel, balanceLabel, actionLabel, drillToInvoiceView],
    );

  const commodityColumns: AccountsRichColumnDef<
    ReturnType<typeof aggregateSalesCommodityWise>[number]
  >[] = useMemo(
    () => [
      {
        key: "productName",
        label: "Product / Commodity Name",
        render: (row) => linkButton(row.productName, () => handleCommodityDrill(row.groupKey)),
      },
      {
        key: "productCode",
        label: "Product Code",
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.productCode}</span>
        ),
      },
      { key: "hsn", label: "HSN", render: (row) => row.hsn },
      {
        key: "qty",
        label: isSales ? "Quantity Sold" : "Quantity Purchased",
        align: "right",
        filterType: "amount",
        render: (row) => row.qty,
      },
      {
        key: "taxable",
        label: "Taxable Amount",
        align: "right",
        filterType: "amount",
        render: (row) => moneyCell(row.taxable),
      },
      {
        key: "tax",
        label: "GST Amount",
        align: "right",
        filterType: "amount",
        render: (row) => moneyCell(row.tax),
      },
      {
        key: "total",
        label: totalAmountLabel,
        align: "right",
        filterType: "amount",
        render: (row) => moneyCell(row.total),
      },
      {
        key: "avgRate",
        label: "Average Rate",
        align: "right",
        filterType: "amount",
        render: (row) => moneyCell(row.avgRate),
      },
      {
        key: "action",
        label: "Action",
        align: "center",
        filterable: false,
        sortable: false,
        render: (row) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-sm font-medium gap-1 text-brand-700 hover:text-brand-800"
            onClick={() => handleCommodityDrill(row.groupKey)}
          >
            <Eye className="w-4 h-4" />
            {actionLabel}
          </Button>
        ),
      },
    ],
    [isSales, totalAmountLabel, actionLabel, handleCommodityDrill],
  );

  const partyRows = useMemo(
    () =>
      isSales ? aggregateSalesPartyWise(salesSource) : aggregatePurchasePartyWise(purchaseSource),
    [isSales, salesSource, purchaseSource],
  );

  const monthRows = useMemo(
    () =>
      isSales ? aggregateSalesMonthWise(salesSource) : aggregatePurchaseMonthWise(purchaseSource),
    [isSales, salesSource, purchaseSource],
  );

  const commodityRows = useMemo(
    () =>
      isSales
        ? aggregateSalesCommodityWise(salesSource)
        : aggregatePurchaseCommodityWise(purchaseSource),
    [isSales, salesSource, purchaseSource],
  );

  const tableEmpty =
    viewBy === "invoice"
      ? source.length === 0
      : viewBy === "party"
        ? partyRows.length === 0
        : viewBy === "month"
          ? monthRows.length === 0
          : commodityRows.length === 0;

  const hasFilters =
    search.trim() !== "" ||
    partyId !== "all" ||
    product !== "all" ||
    state !== "all" ||
    branch !== "all";

  const clearFilters = () => {
    setSearch("");
    setPartyId("all");
    setProduct("all");
    setState("all");
    setBranch("all");
  };

  const toolbarRows = useMemo(() => {
    if (viewBy === "invoice") return source;
    if (viewBy === "party") return partyRows;
    if (viewBy === "month") return monthRows;
    return commodityRows;
  }, [viewBy, source, partyRows, monthRows, commodityRows]);

  const getCellValue = useCallback((row: object, key: string) => {
    return (row as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo((): AccountsColumnFilterConfig => {
    if (viewBy === "invoice") {
      return {
        docNo: { type: "text" },
        date: { type: "date" },
        party: { type: "text" },
        taxable: { type: "amount" },
        tax: { type: "amount" },
        total: { type: "amount" },
      };
    }
    if (viewBy === "party") {
      return {
        partyName: { type: "text" },
        gstin: { type: "text" },
        pan: { type: "text" },
        docCount: { type: "amount" },
        taxable: { type: "amount" },
        tax: { type: "amount" },
        total: { type: "amount" },
        balance: { type: "amount" },
      };
    }
    if (viewBy === "month") {
      return {
        monthLabel: { type: "text" },
        docCount: { type: "amount" },
        taxable: { type: "amount" },
        tax: { type: "amount" },
        total: { type: "amount" },
        balance: { type: "amount" },
      };
    }
    return {
      productName: { type: "text" },
      productCode: { type: "text" },
      hsn: { type: "text" },
      qty: { type: "amount" },
      taxable: { type: "amount" },
      tax: { type: "amount" },
      total: { type: "amount" },
      avgRate: { type: "amount" },
    };
  }, [viewBy]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description}
      actions={<AccountsExportMenu onExcel={exportCsv} onPdf={exportCsv} />}
      filters={
        <ReportFilterRow>
          <ReportViewByFilter
            value={viewBy}
            onChange={(v) => setViewBy(v as RegisterViewMode)}
            options={viewByOptions}
          />
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder={isSales ? "Invoice, party, product…" : "Bill, vendor, product…"}
          />
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          {isSales ? (
            <ReportCustomerFilter value={partyId} onChange={setPartyId} customers={customers} />
          ) : (
            <ReportVendorFilter value={partyId} onChange={setPartyId} vendors={vendors} />
          )}
          <ReportProductFilter value={product} onChange={setProduct} products={products} />
          <ReportStateFilter value={state} onChange={setState} states={stateOptions} />
          {isSales && <ReportBranchFilter value={branch} onChange={setBranch} />}
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsColumnFilterProvider
        key={viewBy}
        rows={toolbarRows}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey={viewBy === "invoice" ? "date" : viewBy === "month" ? "monthLabel" : "total"}
        defaultSortDir="desc"
      >
        <AccountsTableListing
          summary={
            <AccountsSummaryBar
              items={[
                { label: docLabel, value: String(summary.count) },
                { label: "Taxable Amount", value: formatMoney(summary.taxable) },
                { label: totalAmountLabel, value: formatMoney(summary.total) },
                { label: balanceLabel, value: formatMoney(summary.balance) },
              ]}
            />
          }
        >
          <RegisterReportTable
            tableEmpty={tableEmpty}
            hasFilters={hasFilters}
            clearFilters={clearFilters}
            viewBy={viewBy}
            setViewBy={setViewBy}
            toolbarRows={toolbarRows}
            invoiceColumns={invoiceColumns}
            partyColumns={partyColumns}
            monthColumns={monthColumns}
            commodityColumns={commodityColumns}
            openInvoiceDetail={openInvoiceDetail}
          />
        </AccountsTableListing>
      </AccountsColumnFilterProvider>
      {transactionDrawer}
    </AccountsPageShell>
  );
}

function RegisterReportTable({
  tableEmpty,
  hasFilters,
  clearFilters,
  viewBy,
  setViewBy,
  toolbarRows,
  invoiceColumns,
  partyColumns,
  monthColumns,
  commodityColumns,
  openInvoiceDetail,
}: {
  tableEmpty: boolean;
  hasFilters: boolean;
  clearFilters: () => void;
  viewBy: RegisterViewMode;
  setViewBy: (mode: RegisterViewMode) => void;
  toolbarRows: object[];
  invoiceColumns: AccountsRichColumnDef<SalesRegisterSourceRow | PurchaseRegisterSourceRow>[];
  partyColumns: AccountsRichColumnDef<ReturnType<typeof aggregateSalesPartyWise>[number]>[];
  monthColumns: AccountsRichColumnDef<ReturnType<typeof aggregateSalesMonthWise>[number]>[];
  commodityColumns: AccountsRichColumnDef<ReturnType<typeof aggregateSalesCommodityWise>[number]>[];
  openInvoiceDetail: (row: SalesRegisterSourceRow | PurchaseRegisterSourceRow) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarRows);

  if (tableEmpty) {
    return (
      <EmptySearch
        compact
        onClear={
          hasFilters
            ? clearFilters
            : viewBy !== "invoice"
              ? () => setViewBy("invoice")
              : undefined
        }
      />
    );
  }

  if (visible.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No records match the column filters.
      </div>
    );
  }

  if (viewBy === "invoice") {
    return (
      <AccountsRichTable
        columns={invoiceColumns}
        rows={visible as (SalesRegisterSourceRow | PurchaseRegisterSourceRow)[]}
        getRowKey={(row) => row.docNo}
        minWidth={960}
        onRowClick={openInvoiceDetail}
      />
    );
  }

  if (viewBy === "party") {
    return (
      <AccountsRichTable
        columns={partyColumns}
        rows={visible as ReturnType<typeof aggregateSalesPartyWise>}
        getRowKey={(row) => row.groupKey}
        minWidth={1100}
      />
    );
  }

  if (viewBy === "month") {
    return (
      <AccountsRichTable
        columns={monthColumns}
        rows={visible as ReturnType<typeof aggregateSalesMonthWise>}
        getRowKey={(row) => row.groupKey}
        minWidth={960}
      />
    );
  }

  return (
    <AccountsRichTable
      columns={commodityColumns}
      rows={visible as ReturnType<typeof aggregateSalesCommodityWise>}
      getRowKey={(row) => row.groupKey}
      minWidth={1100}
    />
  );
}
