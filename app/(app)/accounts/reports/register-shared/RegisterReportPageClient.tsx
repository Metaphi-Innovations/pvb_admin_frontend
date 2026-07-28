"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
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
  ReportWarehouseMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFilterField,
  ReportFinancialYearFilter,
  ReportStateFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, formatMoneyOrDash, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { cn } from "@/lib/utils";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  SortTh,
  StatusBadge,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_OPTIONS,
  loadCustomers,
} from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { WAREHOUSE_FILTER_OPTIONS } from "@/lib/accounts/inventory-accounting-data";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
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
  buildPurchaseRegisterExportRows,
  buildRegisterExportRows,
  computeRegisterTotals,
  filterRegisterRows,
  formatRegisterDate,
  invoiceStatusLabel,
} from "../register-shared/register-utils";

const GST_RATE_OPTIONS = [
  { value: "all", label: "All rates" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const GST_TYPE_OPTIONS = [
  { value: "all", label: "All GST types" },
  { value: "cgst_sgst", label: "CGST/SGST" },
  { value: "igst", label: "IGST" },
];

const SALES_STATUS_OPTIONS = [
  { value: "posted" as const, label: "Posted" },
  { value: "cancelled" as const, label: "Cancelled" },
];

const PURCHASE_STATUS_OPTIONS = [
  { value: "posted" as const, label: "Posted" },
  { value: "draft" as const, label: "Draft" },
  { value: "cancelled" as const, label: "Cancelled" },
];

const SALES_VOUCHER_TYPE_OPTIONS = [{ value: "SI", label: "Sales Invoice" }];
const PURCHASE_VOUCHER_TYPE_OPTIONS = [{ value: "PI", label: "Purchase Invoice" }];

const SALES_COL_SPAN = 17;

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

function SalesRegisterTable({
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

  if (toolbarFilteredCount === 0) return null;

  return (
    <>
      <AccountsTable minWidth={1480}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap w-14">
              Sr. No.
            </th>
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice Number" colKey="invoiceNo" />
            <SortTh label="Customer Code" colKey="partyCode" />
            <SortTh label="Customer Name" colKey="partyName" />
            <SortTh label="GSTIN" colKey="gstin" />
            <SortTh label="State" colKey="state" />
            <SortTh label="Salesperson" colKey="salesperson" />
            <SortTh label="Taxable Amount" colKey="taxableValue" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgst" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgst" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igst" filterType="amount" align="right" />
            <SortTh label="Discount" colKey="discount" filterType="amount" align="right" />
            <SortTh label="Other Charges" colKey="otherCharges" filterType="amount" align="right" />
            <SortTh label="Invoice Total" colKey="invoiceTotal" filterType="amount" align="right" />
            <SortTh label="Payment Terms" colKey="paymentTerms" />
            <SortTh label="Status" colKey="invoiceStatus" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {columnFilteredRows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={SALES_COL_SPAN} className="accounts-table-empty">
                No records match the column filters.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            paginatedRows.map((row, idx) => {
              const sr = (page - 1) * pageSize + idx + 1;
              return (
                <AccountsTableRow key={row.id} className="group">
                  <AccountsTableCell className="text-xs tabular-nums text-muted-foreground">
                    {sr}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs whitespace-nowrap">
                    {formatRegisterDate(row.invoiceDate)}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-brand-700 font-semibold whitespace-nowrap">
                    <Link
                      href={config.viewHref(row)}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.invoiceNo}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-xs text-brand-700">
                    {row.partyCode || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium max-w-[160px] truncate" title={row.partyName}>
                    {row.partyName}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-xs whitespace-nowrap">
                    {row.gstin}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs whitespace-nowrap">{row.state}</AccountsTableCell>
                  <AccountsTableCell className="text-xs max-w-[120px] truncate" title={row.salesperson || undefined}>
                    {row.salesperson || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.taxableValue)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoneyOrDash(row.cgst ?? 0)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoneyOrDash(row.sgst ?? 0)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoneyOrDash(row.igst ?? 0)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoneyOrDash(row.discount ?? 0)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoneyOrDash(row.otherCharges ?? 0)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.invoiceTotal)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs whitespace-nowrap">
                    {row.paymentTerms || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs whitespace-nowrap">
                    <StatusBadge status={row.invoiceStatus} />
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })
          )}
        </AccountsTableBody>
        {columnFilteredRows.length > 0 ? (
          <AccountsTableFoot>
            <AccountsTableRow>
              <AccountsTableCell colSpan={8} className="font-semibold text-xs text-foreground">
                Totals ({totals.count} invoice{totals.count === 1 ? "" : "s"})
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.taxableValue)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.cgst)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.sgst)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.igst)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.discount)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.otherCharges)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                {formatMoney(totals.grandTotal)}
              </AccountsTableCell>
              <AccountsTableCell colSpan={2} />
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

function PurchaseRegisterTable({
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

  if (toolbarFilteredCount === 0) return null;

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
  financialYearId,
  setFinancialYearId,
  branchIds,
  setBranchIds,
  warehouseIds,
  setWarehouseIds,
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
  customerTypes,
  setCustomerTypes,
  stateFilter,
  setStateFilter,
  invoiceNo,
  setInvoiceNo,
  gstType,
  setGstType,
  stateOptions,
  warehouseOptions,
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
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  financialYearId: string;
  setFinancialYearId: (v: string) => void;
  branchIds: string[];
  setBranchIds: (v: string[]) => void;
  warehouseIds: string[];
  setWarehouseIds: (v: string[]) => void;
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
  customerTypes: string[];
  setCustomerTypes: (v: string[]) => void;
  stateFilter: string;
  setStateFilter: (v: string) => void;
  invoiceNo: string;
  setInvoiceNo: (v: string) => void;
  gstType: string;
  setGstType: (v: string) => void;
  stateOptions: string[];
  warehouseOptions: string[];
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
    financialYearId,
    branchIds,
    warehouseIds,
    partyIds,
    statuses,
    voucherTypes,
    productIds,
    salespersonIds,
    customerTypes,
    stateFilter,
    invoiceNo,
    gstType,
    gstRate,
    search,
    pageSize,
  ]);

  const handleExportExcel = useCallback(async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const rows = isSales
        ? buildRegisterExportRows(columnFilteredRows, config.partyLabel)
        : buildPurchaseRegisterExportRows(columnFilteredRows, config.partyLabel);
      await exportRegisterToExcel(rows, exportMeta, totals, config.exportFilePrefix, config.mode);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exportMeta, totals, config, exporting, isSales]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    const rows = isSales
      ? buildRegisterExportRows(columnFilteredRows, config.partyLabel)
      : buildPurchaseRegisterExportRows(columnFilteredRows, config.partyLabel);
    exportRegisterToPdf(rows, exportMeta, totals, config.mode);
  }, [columnFilteredRows, exportMeta, totals, config, exporting, isSales]);

  const voucherTypeOptions = isSales ? SALES_VOUCHER_TYPE_OPTIONS : PURCHASE_VOUCHER_TYPE_OPTIONS;
  const statusOptions = isSales ? SALES_STATUS_OPTIONS : PURCHASE_STATUS_OPTIONS;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(config.breadcrumbSection, config.title)}
      title={config.title}
      description={config.description}
      filters={
        <>
          <ReportFilterRow
            end={
              <>
                <AccountsClearAllColumnFiltersButton />
                <AccountsExportMenu
                  onExcel={handleExportExcel}
                  onPdf={handleExportPdf}
                  disabled={exporting || columnFilteredRows.length === 0}
                />
              </>
            }
          >
            <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
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
              <>
                <ReportWarehouseMultiFilter
                  values={warehouseIds}
                  onChange={setWarehouseIds}
                  options={warehouseOptions}
                />
                <ReportCustomerMultiFilter
                  values={partyIds}
                  onChange={setPartyIds}
                  customers={customers}
                />
                <ReportFilterField label="Customer Type" minWidthClass="min-w-[140px]">
                  <Select
                    value={customerTypes[0] ?? "all"}
                    onValueChange={(v) => setCustomerTypes(v === "all" ? [] : [v])}
                  >
                    <SelectTrigger className={cn(filterControlClass, "w-full")}>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {CUSTOMER_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ReportFilterField>
                <ReportSalespersonMultiFilter
                  values={salespersonIds}
                  onChange={setSalespersonIds}
                  salespeople={salespeople}
                />
                <ReportFilterField label="Invoice Number" minWidthClass="min-w-[140px]">
                  <Input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="INV-…"
                    className={cn(filterControlClass, "w-full")}
                  />
                </ReportFilterField>
                <ReportStateFilter
                  value={stateFilter}
                  onChange={setStateFilter}
                  states={stateOptions}
                />
                <ReportStatusMultiFilter
                  values={statuses}
                  onChange={setStatuses}
                  options={statusOptions}
                  label="Status"
                />
                <ReportFilterField label="GST Type" minWidthClass="min-w-[140px]">
                  <Select value={gstType} onValueChange={setGstType}>
                    <SelectTrigger className={cn(filterControlClass, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ReportFilterField>
              </>
            ) : (
              <>
                <ReportVendorMultiFilter values={partyIds} onChange={setPartyIds} vendors={vendors} />
                <ReportStatusMultiFilter
                  values={statuses}
                  onChange={setStatuses}
                  options={statusOptions}
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
              </>
            )}
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
            items={
              isSales
                ? [
                    { label: "Invoices", value: String(totals.count) },
                    { label: "Taxable Amount", value: formatMoney(totals.taxableValue) },
                    { label: "Total CGST", value: formatMoney(totals.cgst) },
                    { label: "Total SGST", value: formatMoney(totals.sgst) },
                    { label: "Total IGST", value: formatMoney(totals.igst) },
                    { label: "Invoice Value", value: formatMoney(totals.grandTotal) },
                  ]
                : [
                    { label: "Invoices", value: String(totals.count) },
                    { label: "Total Taxable Value", value: formatMoney(totals.taxableValue) },
                    { label: "Total GST", value: formatMoney(totals.gstAmount) },
                    { label: "Grand Total", value: formatMoney(totals.grandTotal) },
                  ]
            }
          />
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : isSales ? (
          <SalesRegisterTable
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
        ) : (
          <PurchaseRegisterTable
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
  const dataTick = useAccountsSectionRefresh(
    isSales ? "sales-invoices" : "purchase-invoices",
  );

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState("all");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [gstType, setGstType] = useState("all");
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

  const sourceRows = useMemo(() => {
    if (!mounted) return [];
    void dataTick;
    return config.buildRows();
  }, [mounted, config, dataTick]);

  const salespeople = useMemo(() => {
    const names = new Set<string>();
    for (const row of sourceRows) {
      if (row.salesperson?.trim()) names.add(row.salesperson.trim());
    }
    for (const c of customers) {
      if (c.salesManName?.trim()) names.add(c.salesManName.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [customers, sourceRows]);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of sourceRows) {
      if (row.state && row.state !== "—") set.add(row.state);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [sourceRows]);

  const warehouseOptions = useMemo(() => {
    const set = new Set<string>(WAREHOUSE_FILTER_OPTIONS);
    for (const row of sourceRows) {
      if (row.warehouse?.trim()) set.add(row.warehouse.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [sourceRows]);

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId,
      customerIds: isSales ? partyIds : undefined,
      vendorIds: isSales ? undefined : partyIds,
      branch: branchIds,
      warehouse: isSales ? warehouseIds : undefined,
      customerTypes: isSales ? customerTypes : undefined,
      states: isSales && stateFilter !== "all" ? stateFilter : undefined,
      statuses,
      voucherTypes,
      product: productIds,
      salespersons: isSales ? salespersonIds : undefined,
      gstRate,
      gstType: isSales ? gstType : undefined,
      invoiceNo: isSales ? invoiceNo : undefined,
      search,
    }),
    [
      dateFrom,
      dateTo,
      financialYearId,
      isSales,
      partyIds,
      branchIds,
      warehouseIds,
      customerTypes,
      stateFilter,
      statuses,
      voucherTypes,
      productIds,
      salespersonIds,
      gstRate,
      gstType,
      invoiceNo,
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

  const hasFilters = isSales
    ? search.trim() !== "" ||
      invoiceNo.trim() !== "" ||
      branchIds.length > 0 ||
      warehouseIds.length > 0 ||
      partyIds.length > 0 ||
      statuses.length > 0 ||
      salespersonIds.length > 0 ||
      customerTypes.length > 0 ||
      stateFilter !== "all" ||
      gstType !== "all" ||
      financialYearId !== "all"
    : search.trim() !== "" ||
      branchIds.length > 0 ||
      partyIds.length > 0 ||
      statuses.length > 0 ||
      voucherTypes.length > 0 ||
      productIds.length > 0 ||
      gstRate !== "all";

  const clearFilters = () => {
    setSearch("");
    setInvoiceNo("");
    setBranchIds([]);
    setWarehouseIds([]);
    setPartyIds([]);
    setStatuses([]);
    setVoucherTypes([]);
    setProductIds([]);
    setSalespersonIds([]);
    setCustomerTypes([]);
    setStateFilter("all");
    setGstType("all");
    setGstRate("all");
    setFinancialYearId("all");
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
        ? isSales
          ? "Posted (default)"
          : "All statuses"
        : formatMultiSelectLabel(
            statuses,
            isSales ? SALES_STATUS_OPTIONS : PURCHASE_STATUS_OPTIONS,
            "Status",
          );
    const gstLabel = GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? gstRate;
    const gstTypeLabel =
      GST_TYPE_OPTIONS.find((o) => o.value === gstType)?.label ?? "All GST types";
    const branchLabel =
      branchIds.length === 0
        ? "All branches"
        : branchIds.length === 1
          ? branchIds[0]
          : `${branchIds.length} branches`;
    const warehouseLabel =
      warehouseIds.length === 0
        ? "All warehouses"
        : warehouseIds.length === 1
          ? warehouseIds[0]
          : `${warehouseIds.length} warehouses`;
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);

    return {
      reportName: config.title,
      dateFrom,
      dateTo,
      financialYear: fy?.name ?? (financialYearId === "all" ? "All years" : financialYearId),
      partyLabel: config.partyLabel,
      partyFilter: partyLabel,
      branchFilter: branchLabel,
      warehouseFilter: warehouseLabel,
      invoiceStatus: statusLabel,
      gstRate: gstLabel,
      gstType: gstTypeLabel,
      search: isSales ? invoiceNo || search : search,
    };
  }, [
    config.title,
    config.partyLabel,
    isSales,
    customerSelectOptions,
    vendorSelectOptions,
    dateFrom,
    dateTo,
    financialYearId,
    partyIds,
    branchIds,
    warehouseIds,
    statuses,
    gstRate,
    gstType,
    invoiceNo,
    search,
  ]);

  const filterSummaryItems = useMemo(() => {
    const items: (ReportFilterSummaryItem | null | undefined)[] = [
      buildBranchFilterSummary(branchIds, () => setBranchIds([])),
      buildEntityFilterSummary(
        "party",
        isSales ? "Customers" : "Suppliers",
        partyIds,
        isSales ? customerSelectOptions : vendorSelectOptions,
        () => setPartyIds([]),
      ),
    ];
    if (isSales && warehouseIds.length > 0) {
      items.push({
        id: "warehouse",
        label: "Warehouse",
        value:
          warehouseIds.length === 1
            ? warehouseIds[0]
            : `${warehouseIds.length} warehouses`,
        onRemove: () => setWarehouseIds([]),
      });
    }
    if (isSales && customerTypes.length > 0) {
      items.push({
        id: "customerType",
        label: "Customer Type",
        value: customerTypes.map((t) => CUSTOMER_TYPE_LABELS[t] ?? t).join(", "),
        onRemove: () => setCustomerTypes([]),
      });
    }
    if (isSales && stateFilter !== "all") {
      items.push({
        id: "state",
        label: "State",
        value: stateFilter,
        onRemove: () => setStateFilter("all"),
      });
    }
    if (isSales && gstType !== "all") {
      items.push({
        id: "gstType",
        label: "GST Type",
        value: GST_TYPE_OPTIONS.find((o) => o.value === gstType)?.label ?? gstType,
        onRemove: () => setGstType("all"),
      });
    }
    if (statuses.length > 0) {
      items.push({
        id: "status",
        label: "Status",
        value: statuses.map(invoiceStatusLabel).join(", "),
        onRemove: () => setStatuses([]),
      });
    }
    return items.filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    branchIds,
    partyIds,
    isSales,
    customerSelectOptions,
    vendorSelectOptions,
    warehouseIds,
    customerTypes,
    stateFilter,
    gstType,
    statuses,
  ]);

  const getCellValue = useCallback(
    (row: RegisterReportRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo((): AccountsColumnFilterConfig => {
    if (isSales) {
      return {
        invoiceDate: { type: "date" },
        invoiceNo: { type: "text" },
        partyCode: { type: "text" },
        partyName: { type: "text" },
        gstin: { type: "text" },
        state: { type: "text" },
        salesperson: { type: "text" },
        taxableValue: { type: "amount" },
        cgst: { type: "amount" },
        sgst: { type: "amount" },
        igst: { type: "amount" },
        discount: { type: "amount" },
        otherCharges: { type: "amount" },
        invoiceTotal: { type: "amount" },
        paymentTerms: { type: "text" },
        invoiceStatus: { type: "text" },
      };
    }
    return {
      invoiceDate: { type: "date" },
      invoiceNo: { type: "text" },
      partyName: { type: "text" },
      gstin: { type: "text" },
      state: { type: "text" },
      taxableValue: { type: "amount" },
      gstAmount: { type: "amount" },
      invoiceTotal: { type: "amount" },
    };
  }, [isSales]);

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
        financialYearId={financialYearId}
        setFinancialYearId={setFinancialYearId}
        branchIds={branchIds}
        setBranchIds={setBranchIds}
        warehouseIds={warehouseIds}
        setWarehouseIds={setWarehouseIds}
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
        customerTypes={customerTypes}
        setCustomerTypes={setCustomerTypes}
        stateFilter={stateFilter}
        setStateFilter={setStateFilter}
        invoiceNo={invoiceNo}
        setInvoiceNo={setInvoiceNo}
        gstType={gstType}
        setGstType={setGstType}
        stateOptions={stateOptions}
        warehouseOptions={warehouseOptions}
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
