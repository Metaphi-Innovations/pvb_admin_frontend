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
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterField,
  ReportFilterRow,
  ReportFilterResetButton,
  ReportFilterSummary,
  ReportFinancialYearFilter,
  ReportSearchFilter,
  ReportStatusMultiFilter,
  ReportVendorMultiFilter,
  ReportWarehouseMultiFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { EmptySearch } from "@/components/ui/EmptyState";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { cn } from "@/lib/utils";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { WAREHOUSE_FILTER_OPTIONS } from "@/lib/accounts/inventory-accounting-data";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import {
  DEFAULT_VISIBLE_COLUMNS,
  estimateTableMinWidth,
  formatCellDisplay,
  getCellValue,
  getVisibleColumnDefs,
  type PurchaseRegisterColKey,
} from "./purchase-register-columns";
import {
  buildGeneralLedgerHref,
  buildGstr2bHref,
  buildPurchaseRegisterRows,
  buildPurchaseVoucherHref,
  computePurchaseRegisterTotals,
  filterPurchaseRegisterRows,
  findGstr2bReconForRow,
  formatPurchaseRegisterDate,
  getPurchaseRegisterWarehouseOptions,
} from "./purchase-register-data";
import {
  exportPurchaseRegisterToExcel,
  exportPurchaseRegisterToPdf,
} from "./purchase-register-export";
import type {
  PurchaseRegisterFilters,
  PurchaseRegisterRow,
} from "./purchase-register-types";
import {
  DOCUMENT_TYPE_LABELS,
  GSTR2B_STATUS_LABELS,
  ITC_ELIGIBILITY_LABELS,
  PURCHASE_TYPE_LABELS,
  RCM_LIABILITY_LABELS,
  VOUCHER_STATUS_LABELS,
} from "./purchase-register-types";
import { PurchaseRegisterColumnsMenu } from "./components/PurchaseRegisterColumnsMenu";
import { PurchaseRegister2bSheet } from "./components/PurchaseRegister2bSheet";
import "./purchase-register-compact.css";

const LABEL_MAPS = {
  purchaseType: PURCHASE_TYPE_LABELS as Record<string, string>,
  documentType: DOCUMENT_TYPE_LABELS as Record<string, string>,
  itc: ITC_ELIGIBILITY_LABELS as Record<string, string>,
  gstr2b: GSTR2B_STATUS_LABELS as Record<string, string>,
  rcmLiability: RCM_LIABILITY_LABELS as Record<string, string>,
  voucherStatus: VOUCHER_STATUS_LABELS as Record<string, string>,
};

const MONEY_KEYS = new Set<PurchaseRegisterColKey>([
  "taxableValue",
  "exemptValue",
  "nilRatedValue",
  "nonGstValue",
  "cgst",
  "sgst",
  "igst",
  "cess",
  "otherCharges",
  "tdsAmount",
  "tcsAmount",
  "roundOff",
  "totalInvoiceValue",
  "rcmTaxableValue",
  "rcmCgst",
  "rcmSgst",
  "rcmIgst",
  "rcmCess",
  "eligibleItcCgst",
  "eligibleItcSgst",
  "eligibleItcIgst",
  "eligibleItcCess",
  "ineligibleBlockedItc",
  "itcReversalAmount",
  "netItcAvailable",
]);

const PURCHASE_TYPE_OPTIONS = Object.entries(PURCHASE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const DOC_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const ITC_OPTIONS = (
  ["eligible", "ineligible", "blocked", "partially_eligible", "pending"] as const
).map((value) => ({ value, label: ITC_ELIGIBILITY_LABELS[value] }));
const GSTR2B_OPTIONS = (
  ["matched", "partially_matched", "missing_in_2b", "mismatch", "not_applicable"] as const
).map((value) => ({ value, label: GSTR2B_STATUS_LABELS[value] }));
const VOUCHER_STATUS_OPTIONS = [
  { value: "posted" as const, label: "Posted" },
  { value: "cancelled" as const, label: "Cancelled" },
];

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "amber" | "red" | "slate" | "navy" | "orange";
}) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
    navy: "bg-navy-50 text-navy-700",
    orange: "bg-orange-100 text-orange-700",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function gstr2bTone(
  status: PurchaseRegisterRow["gstr2bStatus"],
): "emerald" | "amber" | "red" | "slate" | "navy" {
  if (status === "matched") return "emerald";
  if (status === "partially_matched") return "amber";
  if (
    status === "missing_in_2b" ||
    status.includes("mismatch") ||
    status === "duplicate"
  ) {
    return "red";
  }
  if (status === "not_applicable") return "slate";
  return "navy";
}

function itcTone(
  status: PurchaseRegisterRow["itcEligibility"],
): "emerald" | "amber" | "red" | "slate" {
  if (status === "eligible") return "emerald";
  if (status === "pending" || status === "partially_eligible") return "amber";
  if (status === "ineligible" || status === "blocked" || status === "reversed") return "red";
  return "slate";
}

function freezeIndexMap(visible: PurchaseRegisterColKey[]) {
  const freezeKeys = getVisibleColumnDefs(visible)
    .filter((c) => c.freeze)
    .map((c) => c.key);
  const map = new Map<PurchaseRegisterColKey, number>();
  freezeKeys.forEach((k, i) => map.set(k, i));
  return map;
}

function PurchaseRegisterTableInner({
  visible,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  toolbarCount,
  onOpen2b,
  onExportReady,
}: {
  visible: PurchaseRegisterColKey[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  toolbarCount: number;
  onOpen2b: (row: PurchaseRegisterRow) => void;
  onExportReady: (rows: PurchaseRegisterRow[]) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows<PurchaseRegisterRow>([]);
  const defs = getVisibleColumnDefs(visible);
  const freezeMap = freezeIndexMap(visible);
  const totals = useMemo(
    () => computePurchaseRegisterTotals(columnFilteredRows),
    [columnFilteredRows],
  );

  useEffect(() => {
    onExportReady(columnFilteredRows);
  }, [columnFilteredRows, onExportReady]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  if (toolbarCount === 0) return null;

  const renderCell = (row: PurchaseRegisterRow, key: PurchaseRegisterColKey) => {
    if (key === "gstr2bStatus") {
      return (
        <button
          type="button"
          className="text-left"
          onClick={(e) => {
            e.stopPropagation();
            onOpen2b(row);
          }}
        >
          <StatusPill
            label={GSTR2B_STATUS_LABELS[row.gstr2bStatus]}
            tone={gstr2bTone(row.gstr2bStatus)}
          />
        </button>
      );
    }
    if (key === "itcEligibility") {
      return (
        <StatusPill
          label={ITC_ELIGIBILITY_LABELS[row.itcEligibility]}
          tone={itcTone(row.itcEligibility)}
        />
      );
    }
    if (key === "voucherStatus") {
      return (
        <StatusPill
          label={VOUCHER_STATUS_LABELS[row.voucherStatus]}
          tone={row.voucherStatus === "posted" ? "emerald" : "red"}
        />
      );
    }
    if (key === "reverseChargeYesNo") {
      return row.reverseChargeApplicable ? (
        <StatusPill label="Yes" tone="orange" />
      ) : (
        <span className="text-xs text-muted-foreground">No</span>
      );
    }
    if (key === "voucherNumber") {
      return (
        <span className="font-mono text-xs font-semibold text-brand-700">
          {row.voucherNumber}
          {row.isDuplicateSupplierInvoice ? (
            <span className="ml-1 text-[10px] text-amber-700 font-medium">(Dup)</span>
          ) : null}
        </span>
      );
    }
    if (MONEY_KEYS.has(key)) {
      const n = Number(row[key as keyof PurchaseRegisterRow] ?? 0);
      return <span className={MONEY_AMOUNT_CLASS}>{n === 0 ? "—" : formatMoney(n)}</span>;
    }
    if (key === "purchaseDate" || key === "postingDate" || key === "supplierInvoiceDate") {
      return formatPurchaseRegisterDate(String(row[key] ?? ""));
    }
    return String(formatCellDisplay(row, key, LABEL_MAPS));
  };

  const totalFor = (key: PurchaseRegisterColKey): string | null => {
    const def = defs.find((d) => d.key === key);
    if (!def?.totalKey) return null;
    return formatMoney(totals[def.totalKey] as number);
  };

  return (
    <>
      <AccountsTable minWidth={estimateTableMinWidth(visible)}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {defs.map((col) => {
              const freezeIdx = freezeMap.get(col.key);
              return (
                <SortTh
                  key={col.key}
                  label={col.label}
                  colKey={col.key}
                  filterType={col.filterType ?? "text"}
                  align={col.align === "right" ? "right" : "left"}
                  className={cn(
                    freezeIdx != null && `pr-freeze pr-freeze-${freezeIdx}`,
                    col.group === "rcm" && "bg-amber-50/40",
                    col.group === "itc" && "bg-navy-50/30",
                  )}
                />
              );
            })}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {columnFilteredRows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={defs.length} className="accounts-table-empty">
                No records match the column filters.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            paginated.map((row) => (
              <AccountsTableRow
                key={row.id}
                className="group cursor-pointer"
                onClick={() => router.push(buildPurchaseVoucherHref(row))}
              >
                {defs.map((col) => {
                  const freezeIdx = freezeMap.get(col.key);
                  return (
                    <AccountsTableCell
                      key={col.key}
                      align={col.align === "right" ? "right" : "left"}
                      money={MONEY_KEYS.has(col.key)}
                      mono={
                        col.key === "supplierGstin" ||
                        col.key === "supplierInvoiceNo" ||
                        col.key === "hsnSac"
                      }
                      className={cn(
                        "text-xs whitespace-nowrap",
                        freezeIdx != null && `pr-freeze pr-freeze-${freezeIdx}`,
                        col.group === "rcm" &&
                          row.reverseChargeApplicable &&
                          "bg-amber-50/20",
                      )}
                    >
                      {renderCell(row, col.key)}
                    </AccountsTableCell>
                  );
                })}
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
        {columnFilteredRows.length > 0 ? (
          <AccountsTableFoot>
            <AccountsTableRow>
              {defs.map((col, i) => {
                const val = totalFor(col.key);
                return (
                  <AccountsTableCell
                    key={col.key}
                    align={col.align === "right" ? "right" : "left"}
                    money={Boolean(val)}
                    className={cn("font-semibold text-xs", val && MONEY_AMOUNT_CLASS)}
                  >
                    {i === 0 ? `Grand Total (${totals.count})` : (val ?? "")}
                  </AccountsTableCell>
                );
              })}
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
          recordLabel="documents"
        />
      ) : null}
      {paginated[0] ? (
        <div className="px-3 py-2 border-t border-border bg-muted/10 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          <span>Links:</span>
          <Link
            href={buildGstr2bHref(paginated[0])}
            className="text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            GSTR-2B
          </Link>
          <Link
            href={buildGeneralLedgerHref(paginated[0])}
            className="text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            General Ledger
          </Link>
          {paginated[0].poId ? (
            <Link
              href={`/procurement/purchase-orders/${paginated[0].poId}`}
              className="text-brand-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              PO
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default function PurchaseRegisterPageClient() {
  const mounted = useClientMounted();
  const dataTick = useAccountsSectionRefresh("purchase-invoices");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");

  const [financialYearId, setFinancialYearId] = useState("all");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [supplierGstin, setSupplierGstin] = useState("");
  const [purchaseTypes, setPurchaseTypes] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [reverseCharge, setReverseCharge] =
    useState<PurchaseRegisterFilters["reverseCharge"]>("all");
  const [itcEligibility, setItcEligibility] = useState<string[]>([]);
  const [gstr2bStatuses, setGstr2bStatuses] = useState<string[]>([]);
  const [voucherStatuses, setVoucherStatuses] = useState<string[]>([]);
  const [product, setProduct] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<PurchaseRegisterColKey[]>([
    ...DEFAULT_VISIBLE_COLUMNS,
  ]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [exportRows, setExportRows] = useState<PurchaseRegisterRow[]>([]);
  const [sheetRow, setSheetRow] = useState<PurchaseRegisterRow | null>(null);

  const sourceRows = useMemo(() => {
    if (!mounted) return [] as PurchaseRegisterRow[];
    return buildPurchaseRegisterRows({ dateFrom, dateTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, dataTick, dateFrom, dateTo]);

  const vendors = useMemo(() => (mounted ? loadVendors() : []), [mounted, dataTick]);
  const warehouseOptions = useMemo(() => {
    const fromRows = getPurchaseRegisterWarehouseOptions(sourceRows);
    return Array.from(new Set([...fromRows, ...WAREHOUSE_FILTER_OPTIONS])).sort();
  }, [sourceRows]);

  const filters: PurchaseRegisterFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId,
      branchIds,
      warehouseIds,
      supplierIds,
      supplierGstin,
      purchaseTypes,
      documentTypes,
      reverseCharge,
      itcEligibility,
      gstr2bStatuses,
      voucherStatuses,
      product,
      hsnSac,
      search,
    }),
    [
      dateFrom,
      dateTo,
      financialYearId,
      branchIds,
      warehouseIds,
      supplierIds,
      supplierGstin,
      purchaseTypes,
      documentTypes,
      reverseCharge,
      itcEligibility,
      gstr2bStatuses,
      voucherStatuses,
      product,
      hsnSac,
      search,
    ],
  );

  const toolbarRows = useMemo(
    () => filterPurchaseRegisterRows(sourceRows, filters),
    [sourceRows, filters],
  );

  const hasFilters =
    financialYearId !== "all" ||
    branchIds.length > 0 ||
    warehouseIds.length > 0 ||
    supplierIds.length > 0 ||
    supplierGstin.trim() !== "" ||
    purchaseTypes.length > 0 ||
    documentTypes.length > 0 ||
    reverseCharge !== "all" ||
    itcEligibility.length > 0 ||
    gstr2bStatuses.length > 0 ||
    voucherStatuses.length > 0 ||
    product.trim() !== "" ||
    hsnSac.trim() !== "" ||
    search.trim() !== "";

  const clearFilters = useCallback(() => {
    setFinancialYearId("all");
    setBranchIds([]);
    setWarehouseIds([]);
    setSupplierIds([]);
    setSupplierGstin("");
    setPurchaseTypes([]);
    setDocumentTypes([]);
    setReverseCharge("all");
    setItcEligibility([]);
    setGstr2bStatuses([]);
    setVoucherStatuses([]);
    setProduct("");
    setHsnSac("");
    setSearch("");
    setPreset("this_month");
  }, [setPreset]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const columnConfig: AccountsColumnFilterConfig = useMemo(() => {
    const cfg: AccountsColumnFilterConfig = {};
    for (const col of getVisibleColumnDefs(visibleCols)) {
      cfg[col.key] = { type: col.filterType ?? "text" };
    }
    return cfg;
  }, [visibleCols]);

  const getColValue = useCallback(
    (row: PurchaseRegisterRow, key: string) =>
      getCellValue(row, key as PurchaseRegisterColKey),
    [],
  );

  const fyLabel = useMemo(() => {
    if (financialYearId === "all") return "All";
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
    return fy?.name ?? financialYearId;
  }, [financialYearId, mounted]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildBranchFilterSummary(branchIds, () => setBranchIds([])),
      buildEntityFilterSummary(
        "supplier",
        "Supplier",
        supplierIds,
        vendors.map((v) => ({ value: String(v.id), label: v.vendorName })),
        () => setSupplierIds([]),
      ),
      warehouseIds.length
        ? {
            id: "wh",
            label: "Warehouse",
            value:
              warehouseIds.length === 1
                ? warehouseIds[0]
                : `${warehouseIds.length} selected`,
            onRemove: () => setWarehouseIds([]),
          }
        : null,
      supplierGstin.trim()
        ? {
            id: "gstin",
            label: "Supplier GSTIN",
            value: supplierGstin,
            onRemove: () => setSupplierGstin(""),
          }
        : null,
      purchaseTypes.length
        ? {
            id: "pt",
            label: "Purchase Type",
            value: purchaseTypes
              .map(
                (t) =>
                  PURCHASE_TYPE_LABELS[t as keyof typeof PURCHASE_TYPE_LABELS] ?? t,
              )
              .join(", "),
            onRemove: () => setPurchaseTypes([]),
          }
        : null,
      documentTypes.length
        ? {
            id: "dt",
            label: "Document Type",
            value: documentTypes
              .map(
                (t) =>
                  DOCUMENT_TYPE_LABELS[t as keyof typeof DOCUMENT_TYPE_LABELS] ?? t,
              )
              .join(", "),
            onRemove: () => setDocumentTypes([]),
          }
        : null,
      reverseCharge !== "all"
        ? {
            id: "rcm",
            label: "Reverse Charge",
            value: reverseCharge === "applicable" ? "Applicable" : "Not Applicable",
            onRemove: () => setReverseCharge("all"),
          }
        : null,
      itcEligibility.length
        ? {
            id: "itc",
            label: "ITC",
            value: itcEligibility
              .map(
                (t) =>
                  ITC_ELIGIBILITY_LABELS[t as keyof typeof ITC_ELIGIBILITY_LABELS] ??
                  t,
              )
              .join(", "),
            onRemove: () => setItcEligibility([]),
          }
        : null,
      gstr2bStatuses.length
        ? {
            id: "2b",
            label: "GSTR-2B",
            value: gstr2bStatuses
              .map(
                (t) =>
                  GSTR2B_STATUS_LABELS[t as keyof typeof GSTR2B_STATUS_LABELS] ?? t,
              )
              .join(", "),
            onRemove: () => setGstr2bStatuses([]),
          }
        : null,
      voucherStatuses.length
        ? {
            id: "vs",
            label: "Voucher Status",
            value: voucherStatuses
              .map(
                (t) =>
                  VOUCHER_STATUS_LABELS[t as keyof typeof VOUCHER_STATUS_LABELS] ?? t,
              )
              .join(", "),
            onRemove: () => setVoucherStatuses([]),
          }
        : null,
    ].filter((x): x is ReportFilterSummaryItem => x != null);
  }, [
    branchIds,
    supplierIds,
    vendors,
    warehouseIds,
    supplierGstin,
    purchaseTypes,
    documentTypes,
    reverseCharge,
    itcEligibility,
    gstr2bStatuses,
    voucherStatuses,
  ]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: fyLabel,
      supplierFilter:
        supplierIds.length === 0 ? "All suppliers" : `${supplierIds.length} selected`,
      branchFilter:
        branchIds.length === 0 ? "All branches" : `${branchIds.length} selected`,
      purchaseTypeFilter:
        purchaseTypes.length === 0 ? "All" : purchaseTypes.join(", "),
      rcmFilter:
        reverseCharge === "all"
          ? "All"
          : reverseCharge === "applicable"
            ? "Applicable"
            : "Not Applicable",
      itcFilter: itcEligibility.length === 0 ? "All" : itcEligibility.join(", "),
      gstr2bFilter: gstr2bStatuses.length === 0 ? "All" : gstr2bStatuses.join(", "),
      voucherStatusFilter:
        voucherStatuses.length === 0 ? "Posted (default)" : voucherStatuses.join(", "),
      search: search || "—",
    }),
    [
      dateFrom,
      dateTo,
      fyLabel,
      supplierIds,
      branchIds,
      purchaseTypes,
      reverseCharge,
      itcEligibility,
      gstr2bStatuses,
      voucherStatuses,
      search,
    ],
  );

  const rowsForExport = exportRows.length > 0 ? exportRows : toolbarRows;

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const totals = computePurchaseRegisterTotals(rowsForExport);
      await exportPurchaseRegisterToExcel(rowsForExport, visibleCols, totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const totals = computePurchaseRegisterTotals(rowsForExport);
      await exportPurchaseRegisterToPdf(rowsForExport, visibleCols, totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const reconForSheet = useMemo(() => {
    if (!sheetRow) return null;
    return findGstr2bReconForRow(sheetRow, dateFrom, dateTo);
  }, [sheetRow, dateFrom, dateTo]);

  const onExportReady = useCallback((rows: PurchaseRegisterRow[]) => {
    setExportRows(rows);
  }, []);

  return (
    <AccountsColumnFilterProvider
      rows={toolbarRows}
      getCellValue={getColValue}
      columnConfig={columnConfig}
      defaultSortKey="purchaseDate"
      defaultSortDir="desc"
    >
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Purchase Register")}
      title="Purchase Register"
      description="Posted purchase vouchers with GST, RCM, ITC, and GSTR-2B reconciliation. One row per document."
      className="purchase-register-report max-w-[1440px]"
      actions={<PurchaseRegisterColumnsMenu visible={visibleCols} onChange={setVisibleCols} />}
      filters={
        <>
          <ReportFilterRow
            end={
              <>
                <AccountsClearAllColumnFiltersButton />
                <AccountsExportMenu
                  onExcel={handleExportExcel}
                  onPdf={handleExportPdf}
                  disabled={exporting || rowsForExport.length === 0}
                />
              </>
            }
          >
            <ReportFinancialYearFilter
              value={financialYearId}
              onChange={setFinancialYearId}
            />
            <ReportDateRangeFilter
              preset={preset}
              onPresetChange={setPreset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportBranchMultiFilter values={branchIds} onChange={setBranchIds} />
            <ReportWarehouseMultiFilter
              values={warehouseIds}
              onChange={setWarehouseIds}
              options={warehouseOptions}
            />
            <ReportVendorMultiFilter
              values={supplierIds}
              onChange={setSupplierIds}
              vendors={vendors.map((v) => ({
                id: v.id,
                vendorName: v.vendorName,
                vendorCode: v.vendorCode,
              }))}
            />
            <ReportFilterField label="Supplier GSTIN">
              <Input
                value={supplierGstin}
                onChange={(e) => setSupplierGstin(e.target.value)}
                placeholder="GSTIN…"
                className={cn(filterControlClass, "w-[140px]")}
              />
            </ReportFilterField>
            <ReportStatusMultiFilter
              label="Purchase Type"
              values={purchaseTypes}
              onChange={setPurchaseTypes}
              options={PURCHASE_TYPE_OPTIONS}
            />
            <ReportStatusMultiFilter
              label="Document Type"
              values={documentTypes}
              onChange={setDocumentTypes}
              options={DOC_TYPE_OPTIONS}
            />
            <ReportFilterField label="Reverse Charge">
              <Select
                value={reverseCharge}
                onValueChange={(v) =>
                  setReverseCharge(v as PurchaseRegisterFilters["reverseCharge"])
                }
              >
                <SelectTrigger className={cn(filterControlClass, "w-[130px]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="applicable">Applicable</SelectItem>
                  <SelectItem value="not_applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </ReportFilterField>
            <ReportStatusMultiFilter
              label="ITC Eligibility"
              values={itcEligibility}
              onChange={setItcEligibility}
              options={ITC_OPTIONS}
            />
            <ReportStatusMultiFilter
              label="GSTR-2B Status"
              values={gstr2bStatuses}
              onChange={setGstr2bStatuses}
              options={GSTR2B_OPTIONS}
            />
            <ReportStatusMultiFilter
              label="Voucher Status"
              values={voucherStatuses}
              onChange={setVoucherStatuses}
              options={VOUCHER_STATUS_OPTIONS}
            />
            <ReportFilterField label="Product / Service">
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Product…"
                className={cn(filterControlClass, "w-[130px]")}
              />
            </ReportFilterField>
            <ReportFilterField label="HSN / SAC">
              <Input
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                placeholder="HSN…"
                className={cn(filterControlClass, "w-[110px]")}
              />
            </ReportFilterField>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search vouchers…"
            />
          </ReportFilterRow>
          <div className="flex items-center gap-2 w-full">
            <ReportFilterSummary items={filterSummaryItems} />
            <ReportFilterResetButton
              onClick={clearFilters}
              showOnlyWhenActive
              active={hasFilters}
            />
          </div>
        </>
      }
    >
      <AccountsTableListing>
        {!mounted ? null : toolbarRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <PurchaseRegisterTableInner
            visible={visibleCols}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            toolbarCount={toolbarRows.length}
            onOpen2b={setSheetRow}
            onExportReady={onExportReady}
          />
        )}
      </AccountsTableListing>

      <PurchaseRegister2bSheet
        open={Boolean(sheetRow)}
        onClose={() => setSheetRow(null)}
        row={sheetRow}
        recon={reconForSheet}
      />
    </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}
