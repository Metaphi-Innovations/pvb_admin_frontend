"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportSearchFilter,
  ReportBranchMultiFilter,
  ReportCustomerMultiFilter,
  ReportVendorMultiFilter,
  ReportStatusMultiFilter,
  ReportVoucherTypeMultiFilter,
  ReportProductMultiFilter,
  ReportSalespersonMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFilterField,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
} from "@/lib/accounts/report-multi-filter-utils";
import { exportRegisterToExcel, exportRegisterToPdf } from "../register-shared/register-export";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";
import {
  buildRegisterExportRows,
  computeRegisterTotals,
  filterRegisterRows,
  formatRegisterDate,
} from "../register-shared/register-utils";

const GST_RATE_OPTIONS = [
  { value: "all", label: "All rates" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const REGISTER_STATUS_OPTIONS = [
  { value: "posted" as const, label: "Posted" },
  { value: "draft" as const, label: "Draft" },
  { value: "cancelled" as const, label: "Cancelled" },
];

const SALES_VOUCHER_TYPE_OPTIONS = [{ value: "SI", label: "Sales Invoice" }];
const PURCHASE_VOUCHER_TYPE_OPTIONS = [{ value: "PI", label: "Purchase Invoice" }];

export interface RegisterReportPageConfig {
  mode: "sales" | "purchase";
  title: string;
  description: string;
  breadcrumbSection: string;
  partyLabel: string;
  partyOptions?: RegisterPartyOption[];
  buildRows: () => RegisterReportRow[];
  viewHref: (row: RegisterReportRow) => string;
  exportFilePrefix: string;
}

function RegisterReportTable({
  config,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  toolbarFilteredCount,
}: {
  config: RegisterReportPageConfig;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  toolbarFilteredCount: number;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows<RegisterReportRow>([]);

  const totals = useMemo(
    () => computeRegisterTotals(columnFilteredRows),
    [columnFilteredRows],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const openInvoiceView = useCallback(
    (row: RegisterReportRow) => {
      router.push(config.viewHref(row));
    },
    [router, config],
  );

  if (toolbarFilteredCount === 0) {
    return null;
  }

  return (
    <>
      <AccountsTable minWidth={1080}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice No." colKey="invoiceNo" />
            <SortTh label={config.partyLabel} colKey="partyName" />
            <SortTh label="GSTIN" colKey="gstin" />
            <SortTh label="State" colKey="state" />
            <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
            <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" />
            <SortTh label="Invoice Total" colKey="invoiceTotal" filterType="amount" align="right" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {columnFilteredRows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={8} className="accounts-table-empty">
                No records match the column filters.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            paginatedRows.map((row) => (
              <AccountsTableRow
                key={row.id}
                className="group cursor-pointer"
                onClick={() => openInvoiceView(row)}
              >
                <AccountsTableCell className="text-xs whitespace-nowrap">
                  {formatRegisterDate(row.invoiceDate)}
                </AccountsTableCell>
                <AccountsTableCell mono className="text-brand-700 font-semibold">
                  {row.invoiceNo}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs font-medium">{row.partyName}</AccountsTableCell>
                <AccountsTableCell mono className="text-xs">
                  {row.gstin}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">{row.state}</AccountsTableCell>
                <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                  {formatMoney(row.taxableValue)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                  {formatMoney(row.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                  {formatMoney(row.invoiceTotal)}
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
        {columnFilteredRows.length > 0 ? (
          <AccountsTableFoot>
            <AccountsTableRow>
              <AccountsTableCell colSpan={5} className="font-semibold text-xs text-foreground">
                Totals
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.taxableValue)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.gstAmount)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.grandTotal)}
              </AccountsTableCell>
            </AccountsTableRow>
          </AccountsTableFoot>
        ) : null}
      </AccountsTable>
      {columnFilteredRows.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={columnFilteredRows.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="invoices"
        />
      ) : null}
    </>
  );
}

function RegisterReportBody({
  config,
  filteredRows,
  hasFilters,
  clearFilters,
  exportMeta,
  filterSummaryItems,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  branchIds,
  setBranchIds,
  partyIds,
  setPartyIds,
  customers,
  vendors,
  statuses,
  setStatuses,
  voucherTypes,
  setVoucherTypes,
  productIds,
  setProductIds,
  salespersonIds,
  setSalespersonIds,
  productOptions,
  salespeople,
  moreFiltersActive,
  gstRate,
  setGstRate,
  search,
  setSearch,
}: {
  config: RegisterReportPageConfig;
  filteredRows: RegisterReportRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  exportMeta: Parameters<typeof exportRegisterToExcel>[1];
  filterSummaryItems: ReportFilterSummaryItem[];
  preset: DateRangePresetId;
  setPreset: (v: DateRangePresetId) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  branchIds: string[];
  setBranchIds: (v: string[]) => void;
  partyIds: string[];
  setPartyIds: (v: string[]) => void;
  customers: { id: number; customerName: string; customerCode?: string }[];
  vendors: { id: number; vendorName: string; vendorCode?: string }[];
  statuses: string[];
  setStatuses: (v: string[]) => void;
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
  productIds: string[];
  setProductIds: (v: string[]) => void;
  salespersonIds: string[];
  setSalespersonIds: (v: string[]) => void;
  productOptions: { value: string; label: string }[];
  salespeople: string[];
  moreFiltersActive: number;
  gstRate: string;
  setGstRate: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(filteredRows);
  const totals = useMemo(
    () => computeRegisterTotals(columnFilteredRows),
    [columnFilteredRows],
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const isSales = config.mode === "sales";

  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    branchIds,
    partyIds,
    statuses,
    voucherTypes,
    productIds,
    salespersonIds,
    gstRate,
    search,
    pageSize,
  ]);

  const handleExportExcel = useCallback(async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const rows = buildRegisterExportRows(columnFilteredRows, config.partyLabel);
      await exportRegisterToExcel(rows, exportMeta, totals, config.exportFilePrefix);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exportMeta, totals, config, exporting]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    const rows = buildRegisterExportRows(columnFilteredRows, config.partyLabel);
    exportRegisterToPdf(rows, exportMeta, totals);
  }, [columnFilteredRows, exportMeta, totals, config, exporting]);

  const voucherTypeOptions = isSales ? SALES_VOUCHER_TYPE_OPTIONS : PURCHASE_VOUCHER_TYPE_OPTIONS;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(config.breadcrumbSection, config.title)}
      title={config.title}
      description={config.description}
      filters={
        <>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={handleExportExcel}
                onPdf={handleExportPdf}
                disabled={exporting || columnFilteredRows.length === 0}
              />
            }
          >
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportBranchMultiFilter values={branchIds} onChange={setBranchIds} />
            {isSales ? (
              <ReportCustomerMultiFilter
                values={partyIds}
                onChange={setPartyIds}
                customers={customers}
              />
            ) : (
              <ReportVendorMultiFilter values={partyIds} onChange={setPartyIds} vendors={vendors} />
            )}
            <ReportStatusMultiFilter
              values={statuses}
              onChange={setStatuses}
              options={REGISTER_STATUS_OPTIONS}
              label="Invoice Status"
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={voucherTypeOptions}
            />
            <ReportMoreFilters activeCount={moreFiltersActive}>
              <ReportProductMultiFilter
                values={productIds}
                onChange={setProductIds}
                products={productOptions}
              />
              {isSales ? (
                <ReportSalespersonMultiFilter
                  values={salespersonIds}
                  onChange={setSalespersonIds}
                  salespeople={salespeople}
                />
              ) : null}
            </ReportMoreFilters>
            <ReportFilterField label="GST Rate" minWidthClass="min-w-[120px]">
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger className={cn(filterControlClass, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GST_RATE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ReportFilterField>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Invoice no., party, GSTIN…"
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        summary={
          <AccountsSummaryBar
            items={[
              { label: "Invoices", value: String(totals.count) },
              { label: "Total Taxable Value", value: formatMoney(totals.taxableValue) },
              { label: "Total GST", value: formatMoney(totals.gstAmount) },
              { label: "Grand Total", value: formatMoney(totals.grandTotal) },
            ]}
          />
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <RegisterReportTable
            config={config}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            toolbarFilteredCount={filteredRows.length}
          />
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export function RegisterReportPageClient({ config }: { config: RegisterReportPageConfig }) {
  const mounted = useClientMounted();
  const isSales = config.mode === "sales";

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);
  const [gstRate, setGstRate] = useState("all");
  const [search, setSearch] = useState("");

  const customers = useMemo(() => loadCustomers(), []);
  const vendors = useMemo(() => loadVendors(), []);
  const productOptions = useMemo(
    () =>
      loadProducts()
        .filter((p) => p.status === "active")
        .map((p) => ({ value: p.productName, label: p.productName })),
    [],
  );
  const salespeople = useMemo(() => {
    const names = new Set<string>();
    for (const c of customers) {
      if (c.salesManName?.trim()) names.add(c.salesManName.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const sourceRows = useMemo(() => (mounted ? config.buildRows() : []), [mounted, config]);

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId: "all",
      customerIds: isSales ? partyIds : undefined,
      vendorIds: isSales ? undefined : partyIds,
      branch: branchIds,
      statuses,
      voucherTypes,
      product: productIds,
      salespersons: isSales ? salespersonIds : undefined,
      gstRate,
      search,
    }),
    [
      dateFrom,
      dateTo,
      isSales,
      partyIds,
      branchIds,
      statuses,
      voucherTypes,
      productIds,
      salespersonIds,
      gstRate,
      search,
    ],
  );

  const filteredRows = useMemo(
    () => filterRegisterRows(sourceRows, filterParams, config.mode),
    [sourceRows, filterParams, config.mode],
  );

  const moreFiltersActive = countActiveMoreFilters({
    product: productIds,
    salesperson: isSales ? salespersonIds : undefined,
  });

  const hasFilters =
    search.trim() !== "" ||
    branchIds.length > 0 ||
    partyIds.length > 0 ||
    statuses.length > 0 ||
    voucherTypes.length > 0 ||
    productIds.length > 0 ||
    salespersonIds.length > 0 ||
    gstRate !== "all";

  const clearFilters = () => {
    setSearch("");
    setBranchIds([]);
    setPartyIds([]);
    setStatuses([]);
    setVoucherTypes([]);
    setProductIds([]);
    setSalespersonIds([]);
    setGstRate("all");
  };

  const customerSelectOptions = useMemo(
    () => customers.map((c) => ({ value: String(c.id), label: c.customerName })),
    [customers],
  );
  const vendorSelectOptions = useMemo(
    () => vendors.map((v) => ({ value: String(v.id), label: v.vendorName })),
    [vendors],
  );

  const exportMeta = useMemo(() => {
    const partyLabel = formatMultiSelectLabel(
      partyIds,
      isSales ? customerSelectOptions : vendorSelectOptions,
      isSales ? "Customer" : "Supplier",
      isSales ? "All customers" : "All suppliers",
    );
    const statusLabel =
      statuses.length === 0
        ? "All statuses"
        : formatMultiSelectLabel(statuses, REGISTER_STATUS_OPTIONS, "Status");
    const gstLabel = GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? gstRate;
    const branchLabel =
      branchIds.length === 0
        ? "All branches"
        : branchIds.length === 1
          ? branchIds[0]
          : `${branchIds.length} branches`;

    return {
      reportName: config.title,
      dateFrom,
      dateTo,
      financialYear: "",
      partyLabel: config.partyLabel,
      partyFilter: partyLabel,
      branchFilter: branchLabel,
      invoiceStatus: statusLabel,
      gstRate: gstLabel,
      search,
    };
  }, [
    config.title,
    config.partyLabel,
    isSales,
    customerSelectOptions,
    vendorSelectOptions,
    dateFrom,
    dateTo,
    partyIds,
    branchIds,
    statuses,
    gstRate,
    search,
  ]);

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(branchIds, () => setBranchIds([])),
        buildEntityFilterSummary(
          "party",
          isSales ? "Customers" : "Suppliers",
          partyIds,
          isSales ? customerSelectOptions : vendorSelectOptions,
          () => setPartyIds([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branchIds, partyIds, isSales, customerSelectOptions, vendorSelectOptions],
  );

  const getCellValue = useCallback(
    (row: RegisterReportRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo(
    () => ({
      invoiceDate: { type: "date" as const },
      invoiceNo: { type: "text" as const },
      partyName: { type: "text" as const },
      gstin: { type: "text" as const },
      state: { type: "text" as const },
      taxableValue: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      invoiceTotal: { type: "amount" as const },
    }),
    [],
  );

  return (
    <AccountsColumnFilterProvider
      rows={filteredRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="invoiceDate"
      defaultSortDir="desc"
    >
      <RegisterReportBody
        config={config}
        filteredRows={filteredRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        exportMeta={exportMeta}
        filterSummaryItems={filterSummaryItems}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        branchIds={branchIds}
        setBranchIds={setBranchIds}
        partyIds={partyIds}
        setPartyIds={setPartyIds}
        customers={customers}
        vendors={vendors}
        statuses={statuses}
        setStatuses={setStatuses}
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        productIds={productIds}
        setProductIds={setProductIds}
        salespersonIds={salespersonIds}
        setSalespersonIds={setSalespersonIds}
        productOptions={productOptions}
        salespeople={salespeople}
        moreFiltersActive={moreFiltersActive}
        gstRate={gstRate}
        setGstRate={setGstRate}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}
