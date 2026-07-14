"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsColumnFilterProvider,
} from "@/app/(app)/accounts/components/AccountsUI";
import { drCrSideFilterValue } from "@/lib/accounts/column-filter-display";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportWarehouseMultiFilter,
  ReportVoucherTypeMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { getTrialBalanceWarehouseOptions } from "@/app/(app)/accounts/reports/trial-balance/trial-balance-data";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  buildGeneralLedgerHref,
  GENERAL_LEDGER_SOURCE_REPORTS,
  type GeneralLedgerDrillDownParams,
} from "@/lib/accounts/general-ledger-data";
import {
  resolveCustomerReceivableLedger,
  resolveVendorPayableLedger,
} from "@/lib/accounts/party-ledger-statement";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { useFY } from "@/lib/fy-store";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { getVendorById } from "@/app/(app)/masters/vendors/vendor-data";
import {
  buildGeneralLedgerGroupDrillDown,
  buildGeneralLedgerStatement,
  GENERAL_LEDGER_TYPE_OPTIONS,
  getGeneralLedgerLedgers,
  type GeneralLedgerDisplayRow,
  type GeneralLedgerFilters,
} from "./general-ledger-data";
import {
  exportGeneralLedgerToExcel,
  exportGeneralLedgerToPdf,
} from "./general-ledger-export";
import { GeneralLedgerTable } from "./GeneralLedgerTable";
import { GeneralLedgerSelect } from "./GeneralLedgerSelect";
import { GeneralLedgerReportHeader } from "./GeneralLedgerReportHeader";
import { GeneralLedgerGroupDrillDownView } from "./GeneralLedgerGroupDrillDown";

function defaultFyId(): string {
  ensureFinancialYearsCurrent();
  return String(getActiveFinancialYearId());
}

function resolveLedgerFromUrl(urlLedgerId: string): string {
  if (!urlLedgerId) return "";
  const ledgers = getGeneralLedgerLedgers();
  if (ledgers.some((l) => l.id === urlLedgerId)) return urlLedgerId;
  const numericId = String(Number(urlLedgerId));
  if (numericId !== "NaN" && ledgers.some((l) => l.id === numericId)) return numericId;
  return "";
}

function GeneralLedgerSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

function GeneralLedgerPageContent() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFY } = useFY();
  const { openTransaction, drawer: voucherDrawer } = useTransactionDetailsDrawer();

  const [ledgerId, setLedgerId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [ledgerType, setLedgerType] = useState("all");
  const [sourceReport, setSourceReport] = useState("");
  const [fyId, setFyId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [debitCredit, setDebitCredit] = useState<"all" | "debit" | "credit">("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [dataTick, setDataTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const ledgers = useMemo(
    () => (mounted ? getGeneralLedgerLedgers() : []),
    [mounted, dataTick],
  );

  const filteredLedgers = useMemo(() => {
    if (ledgerType === "all") return ledgers;
    return ledgers.filter((l) => l.ledgerType === ledgerType);
  }, [ledgers, ledgerType]);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    void import("@/lib/accounts/general-ledger-seed").then((m) =>
      m.ensureGeneralLedgerScenariosOnPageLoad(),
    );
  }, []);

  useEffect(() => {
    setDataTick((t) => t + 1);
  }, [sectionRefresh]);

  useEffect(() => {
    if (!mounted) return;
    const ledgerParam =
      searchParams.get("ledgerId") ?? searchParams.get("ledger") ?? "";
    const groupParam = searchParams.get("groupId") ?? "";
    const urlLedgerType = searchParams.get("ledgerType") ?? "all";
    setLedgerType(urlLedgerType || "all");

    let resolved = resolveLedgerFromUrl(ledgerParam);

    const customerParam = searchParams.get("customer");
    const supplierParam = searchParams.get("supplier");
    if (!resolved && customerParam) {
      const customer = loadCustomers().find((c) => String(c.id) === customerParam);
      if (customer) {
        const ledger = resolveCustomerReceivableLedger(customer);
        if (ledger) {
          resolved = String(ledger.id);
          setLedgerType("Customer");
        }
      }
    }
    if (!resolved && supplierParam) {
      const vendorId = Number(supplierParam);
      const vendor = Number.isFinite(vendorId) ? getVendorById(vendorId) : undefined;
      if (vendor) {
        const ledger = resolveVendorPayableLedger(vendor);
        if (ledger) {
          resolved = String(ledger.id);
          setLedgerType("Vendor");
        }
      }
    }

    setLedgerId(resolved);
    setGroupId(groupParam && !resolved ? groupParam : "");

    const urlFrom = searchParams.get("fromDate") ?? searchParams.get("from");
    const urlTo = searchParams.get("toDate") ?? searchParams.get("to");
    if (urlFrom) {
      setDateFrom(urlFrom);
      setPreset("custom");
    }
    if (urlTo) {
      setDateTo(urlTo);
      setPreset("custom");
    }

    const urlSource = searchParams.get("source") ?? "";
    setSourceReport(urlSource);

    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
    if (urlFy) setFyId(urlFy);
    else if (fyId === "all") setFyId(defaultFyId());

    const urlBranch = searchParams.get("branch");
    if (urlBranch) setBranches(urlBranch.split(",").filter(Boolean));

    const urlWarehouse = searchParams.get("warehouse");
    if (urlWarehouse) setWarehouses(urlWarehouse.split(",").filter(Boolean));

    setLoading(false);
  }, [searchParams, mounted, setDateFrom, setDateTo, setPreset]);

  const syncUrl = useCallback(
    (next: { ledgerId?: string; groupId?: string; ledgerType?: string }) => {
      const nextType = next.ledgerType !== undefined ? next.ledgerType : ledgerType;
      const params: GeneralLedgerDrillDownParams = {
        fromDate: dateFrom,
        toDate: dateTo,
        source: sourceReport || undefined,
        financialYearId: fyId !== "all" ? fyId : undefined,
        branch: branches.length > 0 ? branches.join(",") : undefined,
        warehouse: warehouses.length > 0 ? warehouses.join(",") : undefined,
        ledgerType: nextType !== "all" ? nextType : undefined,
      };
      const resolvedLedgerId = next.ledgerId !== undefined ? next.ledgerId : ledgerId;
      const resolvedGroupId = next.groupId !== undefined ? next.groupId : groupId;
      if (resolvedLedgerId) params.ledgerId = Number(resolvedLedgerId);
      else if (resolvedGroupId) params.groupId = Number(resolvedGroupId);
      router.replace(buildGeneralLedgerHref(params), { scroll: false });
    },
    [router, ledgerId, groupId, ledgerType, dateFrom, dateTo, sourceReport, fyId, branches, warehouses],
  );

  const handleLedgerChange = useCallback(
    (value: string) => {
      setLedgerId(value);
      setGroupId("");
      syncUrl({ ledgerId: value });
    },
    [syncUrl],
  );

  const handleLedgerTypeChange = useCallback(
    (value: string) => {
      setLedgerType(value);
      const stillValid =
        !ledgerId ||
        value === "all" ||
        ledgers.some((l) => l.id === ledgerId && l.ledgerType === value);
      if (!stillValid) {
        setLedgerId("");
        syncUrl({ ledgerId: "", ledgerType: value });
      } else {
        syncUrl({ ledgerType: value });
      }
    },
    [ledgerId, ledgers, syncUrl],
  );

  const statementFilters = useMemo(
    (): GeneralLedgerFilters => ({
      dateFrom,
      dateTo,
      financialYearId: fyId,
      voucherType: voucherTypes,
      transactionType: voucherTypes,
      debitCredit,
      branch: branches,
      warehouse: warehouses,
      search: "",
    }),
    [dateFrom, dateTo, fyId, voucherTypes, debitCredit, branches, warehouses],
  );

  const statement = useMemo(() => {
    if (!mounted || !ledgerId) return null;
    return buildGeneralLedgerStatement(ledgerId, statementFilters);
  }, [mounted, ledgerId, statementFilters, dataTick]);

  const groupDrillDown = useMemo(() => {
    if (!mounted || !groupId || ledgerId) return null;
    return buildGeneralLedgerGroupDrillDown(groupId, statementFilters);
  }, [mounted, groupId, ledgerId, statementFilters, dataTick]);

  const openingRow = statement?.displayRows[0] ?? null;
  const closingRow = statement ? statement.displayRows[statement.displayRows.length - 1] : null;
  const allTransactionRows = statement?.transactionRows ?? [];

  const financialYearLabel = useMemo(() => {
    if (fyId === "all") return selectedFY.label;
    const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
    return fy?.name ?? selectedFY.label;
  }, [fyId, selectedFY.label]);

  const sourceLabel = sourceReport
    ? (GENERAL_LEDGER_SOURCE_REPORTS[sourceReport as keyof typeof GENERAL_LEDGER_SOURCE_REPORTS] ??
      sourceReport)
    : null;
  const sourceHref = sourceReport
    ? ({
        "trial-balance": "/accounts/reports/trial-balance",
        "balance-sheet": "/accounts/reports/balance-sheet",
        "profit-loss": "/accounts/reports/pl",
        "cash-flow": "/accounts/reports/cash-flow",
        "day-book": "/accounts/reports/day-book",
        "chart-of-accounts": "/accounts/masters/chart-of-accounts",
      }[sourceReport] ?? null)
    : null;

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
    }),
    [dateFrom, dateTo, financialYearLabel],
  );

  const warehouseOptions = useMemo(() => getTrialBalanceWarehouseOptions(), []);

  const voucherTypeOptions = useMemo(
    () =>
      (Object.entries(VOUCHER_TYPE_LABELS) as [VoucherTypeCode, string][]).map(([code, label]) => ({
        value: code,
        label,
      })),
    [],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      ledgerType !== "all"
        ? {
            id: "ledgerType",
            label: "Ledger Type",
            value: ledgerType,
            onRemove: () => handleLedgerTypeChange("all"),
          }
        : null,
      buildBranchFilterSummary(branches, () => setBranches([])),
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        voucherTypeOptions,
        () => setVoucherTypes([]),
      ),
      debitCredit !== "all"
        ? {
            id: "debitCredit",
            label: "Dr/Cr",
            value: debitCredit === "debit" ? "Debit only" : "Credit only",
            onRemove: () => setDebitCredit("all"),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [voucherTypes, voucherTypeOptions, branches, debitCredit, ledgerType, handleLedgerTypeChange]);

  const moreFiltersActiveCount = countActiveMoreFilters({
    warehouse: warehouses,
    voucherType: voucherTypes,
  }) + (debitCredit !== "all" ? 1 : 0);

  const handleVoucherClick = useCallback(
    (row: GeneralLedgerDisplayRow) => {
      if (!row.voucherId) return;
      openTransaction({
        type: "general_ledger",
        row: {
          date: row.isoDate || row.date,
          voucherNo: row.voucherNo,
          voucherType: row.voucherType,
          referenceNo: row.referenceNo,
          narration: row.particularsNarration,
          debit: row.debit,
          credit: row.credit,
          runningBalance: row.runningBalance,
          runningBalanceType: row.runningBalanceType,
          voucherId: row.voucherId,
          lineOrder: row.lineOrder,
          viewHref: row.viewHref,
          viewLabel: row.viewLabel,
          contraLedger: row.particular,
        },
      });
    },
    [openTransaction],
  );

  const breadcrumbs = sourceLabel
    ? [
        ...accountsBreadcrumb("Reports", "General Ledger").slice(0, -1),
        { label: sourceLabel, href: sourceHref ?? undefined },
        { label: statement?.summary.ledgerName ?? "General Ledger" },
      ]
    : accountsBreadcrumb("Reports", "General Ledger");

  const getCellValue = useCallback((row: GeneralLedgerDisplayRow, key: string) => {
    switch (key) {
      case "transactionType":
        return row.transactionType || row.voucherType;
      case "voucher":
        return row.voucherNo;
      case "particulars":
        return row.particulars;
      case "balance":
        return row.runningBalance;
      case "side":
        return drCrSideFilterValue({
          debit: row.debit,
          credit: row.credit,
          runningBalanceType: row.runningBalanceType,
          runningBalance: row.runningBalance,
          isBalanceRow: row.kind === "opening" || row.kind === "closing",
        });
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      particulars: { type: "text" as const },
      transactionType: { type: "text" as const },
      voucher: { type: "text" as const },
      debit: { type: "amount" as const },
      credit: { type: "amount" as const },
      side: { type: "text" as const },
    }),
    [],
  );

  return (
    <AccountsColumnFilterProvider
      rows={allTransactionRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <GeneralLedgerPageBody
        loading={loading}
        ledgerId={ledgerId}
        groupId={groupId}
        ledgerType={ledgerType}
        ledgers={filteredLedgers}
        statement={statement}
        groupDrillDown={groupDrillDown}
        allTransactionRows={allTransactionRows}
        openingRow={openingRow}
        closingRow={closingRow}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        handleLedgerChange={handleLedgerChange}
        handleLedgerTypeChange={handleLedgerTypeChange}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        fyId={fyId}
        setFyId={setFyId}
        financialYearLabel={financialYearLabel}
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        branches={branches}
        setBranches={setBranches}
        warehouses={warehouses}
        setWarehouses={setWarehouses}
        debitCredit={debitCredit}
        setDebitCredit={setDebitCredit}
        moreFiltersActiveCount={moreFiltersActiveCount}
        warehouseOptions={warehouseOptions}
        filterSummaryItems={filterSummaryItems}
        voucherTypeOptions={voucherTypeOptions}
        sourceLabel={sourceLabel}
        sourceHref={sourceHref}
        breadcrumbs={breadcrumbs}
        onVoucherClick={handleVoucherClick}
        onSelectLedgerFromGroup={handleLedgerChange}
        voucherDrawer={voucherDrawer}
      />
    </AccountsColumnFilterProvider>
  );
}

function GeneralLedgerPageBody({
  loading,
  ledgerId,
  groupId,
  ledgerType,
  ledgers,
  statement,
  groupDrillDown,
  allTransactionRows,
  openingRow,
  closingRow,
  exporting,
  setExporting,
  exportMeta,
  handleLedgerChange,
  handleLedgerTypeChange,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  fyId,
  setFyId,
  financialYearLabel,
  voucherTypes,
  setVoucherTypes,
  branches,
  setBranches,
  warehouses,
  setWarehouses,
  debitCredit,
  setDebitCredit,
  moreFiltersActiveCount,
  warehouseOptions,
  filterSummaryItems,
  voucherTypeOptions,
  sourceLabel,
  sourceHref,
  breadcrumbs,
  onVoucherClick,
  onSelectLedgerFromGroup,
  voucherDrawer,
}: {
  loading: boolean;
  ledgerId: string;
  groupId: string;
  ledgerType: string;
  ledgers: ReturnType<typeof getGeneralLedgerLedgers>;
  statement: ReturnType<typeof buildGeneralLedgerStatement> | null;
  groupDrillDown: ReturnType<typeof buildGeneralLedgerGroupDrillDown> | null;
  allTransactionRows: GeneralLedgerDisplayRow[];
  openingRow: GeneralLedgerDisplayRow | null;
  closingRow: GeneralLedgerDisplayRow | null | undefined;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: { dateFrom: string; dateTo: string; financialYear: string };
  handleLedgerChange: (value: string) => void;
  handleLedgerTypeChange: (value: string) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  fyId: string;
  setFyId: (v: string) => void;
  financialYearLabel: string;
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
  branches: string[];
  setBranches: (v: string[]) => void;
  warehouses: string[];
  setWarehouses: (v: string[]) => void;
  debitCredit: "all" | "debit" | "credit";
  setDebitCredit: (v: "all" | "debit" | "credit") => void;
  moreFiltersActiveCount: number;
  warehouseOptions: string[];
  filterSummaryItems: ReportFilterSummaryItem[];
  voucherTypeOptions: { value: string; label: string }[];
  sourceLabel: string | null;
  sourceHref: string | null;
  breadcrumbs: { label: string; href?: string }[];
  onVoucherClick: (row: GeneralLedgerDisplayRow) => void;
  onSelectLedgerFromGroup: (ledgerId: string) => void;
  voucherDrawer: React.ReactNode;
}) {
  const canExport = Boolean(statement && ledgerId);

  const handleExportExcel = async () => {
    if (!statement || !openingRow || !closingRow) return;
    setExporting(true);
    try {
      const exportRows = [openingRow, ...allTransactionRows, closingRow];
      await exportGeneralLedgerToExcel(exportRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement || !openingRow || !closingRow) return;
    const exportRows = [openingRow, ...allTransactionRows, closingRow];
    exportGeneralLedgerToPdf(exportRows, statement.summary, exportMeta);
  };

  const showGroupView = Boolean(groupId && groupDrillDown && !ledgerId);
  const showLedgerView = Boolean(ledgerId && statement);
  const showNoTransactions =
    showLedgerView &&
    statement &&
    !statement.hasPeriodTransactions &&
    voucherTypes.length === 0 &&
    debitCredit === "all";

  return (
    <AccountsPageShell
      breadcrumbs={breadcrumbs}
      title="General Ledger"
      description="Complete transaction history for any ledger. Filter by type (Customer, Vendor, Bank, …) to focus customer or supplier accounts."
      layout="split"
      className="h-full min-h-0 trial-balance-compact"
      actions={
        <>
          {sourceHref && sourceLabel ? (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Link href={sourceHref}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to {sourceLabel}
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={!canExport}
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
        </>
      }
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            end={
              <AccountsExportMenu
                onExcel={handleExportExcel}
                onPdf={handleExportPdf}
                disabled={!canExport || exporting}
              />
            }
          >
            <ReportFinancialYearFilter value={fyId} onChange={setFyId} />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <div className="space-y-1 min-w-[140px]">
              <Label className={filterLabelClass}>Ledger Type</Label>
              <select
                value={ledgerType}
                onChange={(e) => handleLedgerTypeChange(e.target.value)}
                className={cn(filterControlClass, "mt-0 w-full")}
              >
                {GENERAL_LEDGER_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <GeneralLedgerSelect value={ledgerId} ledgers={ledgers} onChange={handleLedgerChange} />
            <ReportBranchMultiFilter values={branches} onChange={setBranches} />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportWarehouseMultiFilter
                values={warehouses}
                onChange={setWarehouses}
                options={warehouseOptions}
              />
              <ReportVoucherTypeMultiFilter values={voucherTypes} onChange={setVoucherTypes} />
              <div className="space-y-1 min-w-[120px]">
                <Label className={filterLabelClass}>Dr / Cr</Label>
                <select
                  value={debitCredit}
                  onChange={(e) => setDebitCredit(e.target.value as "all" | "debit" | "credit")}
                  className={cn(filterControlClass, "mt-0 w-full")}
                  disabled={!ledgerId}
                >
                  <option value="all">All</option>
                  <option value="debit">Debit only</option>
                  <option value="credit">Credit only</option>
                </select>
              </div>
            </ReportMoreFilters>
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0">
          {loading ? (
            <GeneralLedgerSkeleton />
          ) : !ledgerId && !groupId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-2 max-w-sm">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  Select a ledger or open from another report.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use Ledger Type (Customer / Vendor) to narrow party accounts, search for a ledger,
                  or drill down from Trial Balance, Balance Sheet, P&amp;L, or Cash Flow.
                </p>
              </div>
            </div>
          ) : showGroupView && groupDrillDown ? (
            <GeneralLedgerGroupDrillDownView
              drillDown={groupDrillDown}
              dateFrom={dateFrom}
              dateTo={dateTo}
              fyId={fyId}
              onSelectLedger={onSelectLedgerFromGroup}
            />
          ) : showLedgerView && statement && openingRow && closingRow ? (
            <>
              <GeneralLedgerReportHeader
                ledgerName={statement.summary.ledgerName}
                ledgerCode={statement.summary.ledgerCode}
                parentGroup={statement.summary.parentGroup}
                ledgerType={statement.summary.ledgerType}
                gstin={statement.summary.gstin}
                pan={statement.summary.pan}
                dateFrom={dateFrom}
                dateTo={dateTo}
                financialYearLabel={financialYearLabel}
              />
              {showNoTransactions ? (
                <div className="px-4 py-3 border-b border-border/60 bg-amber-50/40">
                  <p className="text-xs text-amber-800">
                    No transactions found for the selected period. Opening and closing balances are
                    shown below.
                  </p>
                </div>
              ) : allTransactionRows.length === 0 && (voucherTypes.length > 0 || debitCredit !== "all") ? (
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="text-xs text-muted-foreground">
                    No transactions match your filters.{" "}
                    <button
                      type="button"
                      className="text-brand-600 hover:underline"
                      onClick={() => {
                        setVoucherTypes([]);
                        setDebitCredit("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </p>
                </div>
              ) : null}
              <GeneralLedgerTable
                openingRow={openingRow}
                transactionRows={allTransactionRows}
                closingRow={closingRow}
                summary={statement.summary}
                onVoucherClick={onVoucherClick}
              />
            </>
          ) : ledgerId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
              Ledger not found or has no statement data.
            </div>
          ) : null}
        </div>
      </AccountsListingTableCard>
      {voucherDrawer}
    </AccountsPageShell>
  );
}

function GeneralLedgerFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "General Ledger")}
      title="General Ledger"
      description="Complete transaction history for a selected ledger with running balance."
      layout="split"
      className="h-full min-h-0"
    >
      <GeneralLedgerSkeleton />
    </AccountsPageShell>
  );
}

export default function GeneralLedgerPageClient() {
  return (
    <Suspense fallback={<GeneralLedgerFallback />}>
      <GeneralLedgerPageContent />
    </Suspense>
  );
}
