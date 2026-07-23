"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportLedgerGroupMultiFilter,
  ReportLedgerMultiFilter,
  ReportShowZeroBalanceToggle,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportIncludeOpeningBalanceToggle,
  ReportFromDateFilter,
  ReportToDateFilter,
  ReportVoucherTypeMultiFilter,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildTrialBalanceDetailedGroups,
  buildTrialBalanceLedgerHref,
  buildTrialBalanceGroupHref,
  collectAllPrimaryHeadKeys,
  computeTrialBalanceSummaryFromDetailedGroups,
  computeTrialBalanceLedgerVoucherLines,
  findTrialBalanceExceptions,
  flattenTrialBalanceDetailedGroups,
  getTrialBalanceBranchOptions,
  getTrialBalanceLedgerGroupOptions,
  getTrialBalanceLedgerOptions,
  type TrialBalanceDetailedFlatRow,
  type TrialBalanceFilters,
  type TrialBalanceTab,
  type TrialBalanceVoucherException,
} from "./trial-balance-data";
import {
  flattenTrialBalanceNormalPrimaryHeadRows,
  TB_DETAILED_INDENT,
  TB_NORMAL_INDENT,
  type TrialBalanceNormalPrimaryHeadRow,
} from "./trial-balance-display";
import {
  isRenderableTrialBalanceDetailedRow,
  isRenderableTrialBalanceNormalRow,
} from "./trial-balance-validation";
import { formatTrialBalanceReportDate } from "./TrialBalanceReportSummary";
import { TrialBalanceViewTabs } from "./TrialBalanceViewTabs";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  exportTrialBalanceDetailedToExcel,
  exportTrialBalanceDetailedToPdf,
  exportTrialBalanceNormalToExcel,
  exportTrialBalanceNormalToPdf,
} from "./trial-balance-export";
import "./trial-balance-compact.css";
import { AccountsCoaHierarchyRowLabel } from "@/lib/accounts/accounts-coa-hierarchy-ui";

const PLACEHOLDER_DATE = "2025-04-01";

function mergeLedgerOptions(
  getOptions: (ledgerGroupId: string) => { id: number; name: string }[],
  ledgerGroupIds: string[],
): { id: number; name: string }[] {
  if (ledgerGroupIds.length === 0) return getOptions("all");
  const seen = new Map<number, { id: number; name: string }>();
  for (const groupId of ledgerGroupIds) {
    for (const ledger of getOptions(groupId)) {
      seen.set(ledger.id, ledger);
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

function rowKey(
  row: TrialBalanceNormalPrimaryHeadRow | TrialBalanceDetailedFlatRow,
  index: number,
): string {
  if (row.type === "primary") return `p-${row.primaryHeadId}`;
  if (row.type === "group") return `g-${row.groupKey}`;
  if (row.type === "subgroup") return `sg-${row.subgroupKey}`;
  if (row.type === "ledger") return `l-${row.ledger.ledgerId}`;
  if (row.type === "voucher") {
    return `v-${row.ledgerId}-${row.voucher.voucherId}-${row.voucher.debit}-${row.voucher.credit}`;
  }
  return `row-${index}`;
}

function BalanceStatusBanner({
  isBalanced,
  openingDifference,
  periodDifference,
  closingDifference,
  visible,
}: {
  isBalanced: boolean;
  openingDifference: number;
  periodDifference: number;
  closingDifference: number;
  visible: boolean;
}) {
  if (!visible) return null;
  if (isBalanced) {
    return (
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        Trial Balance is balanced
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 bg-red-50 border-t border-red-100 text-xs text-red-700">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        Trial Balance is not balanced (total Debits ≠ total Credits)
      </span>
      <span title="Opening Dr minus Opening Cr">Opening Difference: {formatMoney(openingDifference)}</span>
      <span title="Period Dr minus Period Cr">Period Difference: {formatMoney(periodDifference)}</span>
      <span title="Closing Dr minus Closing Cr">Closing Difference: {formatMoney(closingDifference)}</span>
    </div>
  );
}

/** Client-approved Trial Balance amount columns: Debit | Credit (closing balances). */
function DebitCreditCells({
  debit,
  credit,
  bold,
}: {
  debit: number;
  credit: number;
  bold?: boolean;
}) {
  const cellClass = bold ? "font-semibold" : undefined;
  return (
    <>
      <AccountsTableCell align="right" money className={cellClass}>
        {formatMoneyOrDash(debit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cellClass}>
        {formatMoneyOrDash(credit)}
      </AccountsTableCell>
    </>
  );
}

export default function TrialBalancePageClient() {
  const mounted = useClientMounted();

  const [activeTab, setActiveTab] = useState<TrialBalanceTab>("normal");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [ledgerGroupIds, setLedgerGroupIds] = useState<string[]>([]);
  const [ledgerIds, setLedgerIds] = useState<string[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const [expandedPrimaryIds, setExpandedPrimaryIds] = useState<Set<number>>(new Set());
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [expandedSubgroupIds, setExpandedSubgroupIds] = useState<Set<string>>(new Set());

  const [expandedLedgerIds, setExpandedLedgerIds] = useState<Set<number>>(new Set());

  const effectiveBranches = branches;

  // Bumped after demo voucher transactions are seeded / whenever vouchers change,
  // so all derived trial-balance data recomputes against the freshest postings.
  const [dataTick, setDataTick] = useState(0);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/accounts/general-ledger-demo-seed").then(
      ({ ensureGeneralLedgerDemoOnPageLoad }) => {
        ensureGeneralLedgerDemoOnPageLoad();
        if (!cancelled) setDataTick((t) => t + 1);
      },
    );
    const onVouchersUpdated = () => setDataTick((t) => t + 1);
    window.addEventListener("ds-accounts-vouchers-updated", onVouchersUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("ds-accounts-vouchers-updated", onVouchersUpdated);
    };
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        const today = new Date().toISOString().slice(0, 10);
        setDateFrom(fy.startDate);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const handleLedgerGroupChange = useCallback((values: string[]) => {
    setLedgerGroupIds(values);
    setLedgerIds([]);
  }, []);

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const tbFilters = useMemo((): TrialBalanceFilters => ({
    financialYearId,
    dateFrom,
    dateTo,
    branch: effectiveBranches,
    warehouse: [],
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
    voucherType: voucherTypes,
    showZeroBalance,
    search: "",
  }), [
    financialYearId,
    dateFrom,
    dateTo,
    effectiveBranches,
    ledgerGroupIds,
    ledgerIds,
    voucherTypes,
    showZeroBalance,
  ]);

  const ledgerGroupOptions = useMemo(
    () => (mounted ? getTrialBalanceLedgerGroupOptions() : []),
    [mounted, dataTick],
  );
  const ledgerOptions = useMemo(
    () => (mounted ? mergeLedgerOptions(getTrialBalanceLedgerOptions, ledgerGroupIds) : []),
    [mounted, ledgerGroupIds, dataTick],
  );
  const branchOptions = useMemo(
    () => (mounted ? getTrialBalanceBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, dataTick],
  );

  const ledgerGroupSelectOptions = useMemo(
    () => ledgerGroupOptions.map((g) => ({ value: String(g.id), label: g.name })),
    [ledgerGroupOptions],
  );
  const ledgerSelectOptions = useMemo(
    () => ledgerOptions.map((l) => ({ value: String(l.id), label: l.name })),
    [ledgerOptions],
  );

  const moreFiltersActiveCount =
    countActiveMoreFilters({
      ledgerGroupId: ledgerGroupIds,
      ledgerId: ledgerIds,
      voucherType: voucherTypes,
      showZeroBalance,
    }) + (!includeOpeningBalance ? 1 : 0);

  const exceptions = useMemo(
    () => (mounted ? findTrialBalanceExceptions(tbFilters) : []),
    [mounted, tbFilters, dataTick],
  );

  const sourceDetailedGroups = useMemo(() => {
    if (!mounted) return [];
    const groups = buildTrialBalanceDetailedGroups(tbFilters);
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, tbFilters, dataTick]);

  const detailedExpandInitializedRef = React.useRef(false);

  useEffect(() => {
    if (activeTab !== "detailed") {
      detailedExpandInitializedRef.current = false;
      return;
    }
    if (!mounted || sourceDetailedGroups.length === 0) return;
    if (detailedExpandInitializedRef.current) return;
    // Detailed: expand primary heads so Account Groups are visible; groups/subgroups start collapsed.
    setExpandedPrimaryIds(collectAllPrimaryHeadKeys(sourceDetailedGroups));
    setExpandedGroupIds(new Set());
    setExpandedSubgroupIds(new Set());
    setExpandedLedgerIds(new Set());
    detailedExpandInitializedRef.current = true;
  }, [mounted, activeTab, sourceDetailedGroups]);

  const filteredDetailedGroups = sourceDetailedGroups;

  const normalFlatRows = useMemo(
    () =>
      flattenTrialBalanceNormalPrimaryHeadRows(filteredDetailedGroups).filter(
        isRenderableTrialBalanceNormalRow,
      ),
    [filteredDetailedGroups],
  );

  const voucherLinesByLedgerId = useMemo(() => {
    const map = new Map<number, ReturnType<typeof computeTrialBalanceLedgerVoucherLines>>();
    if (activeTab !== "detailed") return map;
    for (const ledgerId of expandedLedgerIds) {
      map.set(ledgerId, computeTrialBalanceLedgerVoucherLines(tbFilters, ledgerId));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, expandedLedgerIds, tbFilters, dataTick]);

  const detailedFlatRows = useMemo(() => {
    if (activeTab !== "detailed") return [];
    const rows = flattenTrialBalanceDetailedGroups(
      filteredDetailedGroups,
      expandedPrimaryIds,
      expandedGroupIds,
      expandedSubgroupIds,
      {
        expandedLedgerIds,
        voucherLinesByLedgerId,
      },
    ).filter(isRenderableTrialBalanceDetailedRow);
    return rows;
  }, [
    activeTab,
    filteredDetailedGroups,
    expandedPrimaryIds,
    expandedGroupIds,
    expandedSubgroupIds,
    expandedLedgerIds,
    voucherLinesByLedgerId,
  ]);

  const hasFilters =
    isMultiFilterActive(branches) ||
    isMultiFilterActive(ledgerGroupIds) ||
    isMultiFilterActive(ledgerIds) ||
    isMultiFilterActive(voucherTypes) ||
    showZeroBalance ||
    !includeOpeningBalance ||
    (datesReady && financialYearId !== defaultFyDateRange().fyId);

  const resetFilters = useCallback(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setBranches([]);
    setLedgerGroupIds([]);
    setLedgerIds([]);
    setVoucherTypes([]);
    setShowZeroBalance(false);
    setIncludeOpeningBalance(true);
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    pageSize,
    activeTab,
    financialYearId,
    dateFrom,
    dateTo,
    branches,
    ledgerGroupIds,
    ledgerIds,
    voucherTypes,
    showZeroBalance,
    includeOpeningBalance,
  ]);

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((f) => String(f.id) === financialYearId)?.name ?? "";
  }, [financialYearId]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
      view: activeTab,
      branch:
        effectiveBranches.length === 0
          ? ""
          : formatMultiSelectLabel(
              effectiveBranches,
              branchOptions.map((b) => ({ value: b, label: b })),
              "Branch",
            ),
      includeOpeningBalance,
    }),
    [dateFrom, dateTo, activeTab, financialYearLabel, effectiveBranches, branchOptions, includeOpeningBalance],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
      [
        buildBranchFilterSummary(effectiveBranches, () => setBranches([])),
        buildEntityFilterSummary(
          "ledgerGroup",
          "Ledger Group",
          ledgerGroupIds,
          ledgerGroupSelectOptions,
          () => setLedgerGroupIds([]),
        ),
        buildEntityFilterSummary(
          "ledger",
          "Ledger",
          ledgerIds,
          ledgerSelectOptions,
          () => setLedgerIds([]),
        ),
        showZeroBalance
          ? {
              id: "zeroBalance",
              label: "Zero balance",
              value: "Included",
              onRemove: () => setShowZeroBalance(false),
            }
          : null,
        !includeOpeningBalance
          ? {
              id: "openingBalance",
              label: "Opening balance",
              value: "Hidden",
              onRemove: () => setIncludeOpeningBalance(true),
            }
          : null,
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [
      effectiveBranches,
      ledgerGroupIds,
      ledgerGroupSelectOptions,
      ledgerIds,
      ledgerSelectOptions,
      showZeroBalance,
      includeOpeningBalance,
    ],
  );

  const togglePrimary = useCallback((primaryHeadId: number) => {
    setExpandedPrimaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(primaryHeadId)) next.delete(primaryHeadId);
      else next.add(primaryHeadId);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const toggleLedger = useCallback((ledgerId: number) => {
    setExpandedLedgerIds((prev) => {
      const next = new Set(prev);
      if (next.has(ledgerId)) next.delete(ledgerId);
      else next.add(ledgerId);
      return next;
    });
  }, []);

  const toggleSubgroup = useCallback((subgroupKey: string) => {
    setExpandedSubgroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(subgroupKey)) next.delete(subgroupKey);
      else next.add(subgroupKey);
      return next;
    });
  }, []);

  return (
      <TrialBalancePageBody
        mounted={mounted}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filteredDetailedGroups={filteredDetailedGroups}
        normalFlatRows={normalFlatRows}
        detailedFlatRows={detailedFlatRows}
        expandedPrimaryIds={expandedPrimaryIds}
        expandedGroupIds={expandedGroupIds}
        expandedSubgroupIds={expandedSubgroupIds}
        expandedLedgerIds={expandedLedgerIds}
        togglePrimary={togglePrimary}
        toggleGroup={toggleGroup}
        toggleSubgroup={toggleSubgroup}
        toggleLedger={toggleLedger}
        financialYearLabel={financialYearLabel}
        hasFilters={hasFilters}
        resetFilters={resetFilters}
        preset={preset}
        handlePresetChange={handlePresetChange}
        financialYearId={financialYearId}
        onFinancialYearChange={handleFinancialYearChange}
        branch={branches}
        onBranchChange={setBranches}
        ledgerGroupIds={ledgerGroupIds}
        onLedgerGroupChange={handleLedgerGroupChange}
        ledgerIds={ledgerIds}
        onLedgerChange={setLedgerIds}
        voucherTypes={voucherTypes}
        onVoucherTypesChange={setVoucherTypes}
        showZeroBalance={showZeroBalance}
        onShowZeroBalanceChange={setShowZeroBalance}
        includeOpeningBalance={includeOpeningBalance}
        onIncludeOpeningBalanceChange={setIncludeOpeningBalance}
        moreFiltersActiveCount={moreFiltersActiveCount}
        filterSummaryItems={filterSummaryItems}
        ledgerGroupOptions={ledgerGroupOptions}
        ledgerOptions={ledgerOptions}
        branchOptions={branchOptions}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        exceptions={exceptions}
      />
  );
}

function TrialBalancePageBody({
  mounted,
  activeTab,
  setActiveTab,
  filteredDetailedGroups,
  normalFlatRows,
  detailedFlatRows,
  expandedPrimaryIds,
  expandedGroupIds,
  expandedSubgroupIds,
  expandedLedgerIds,
  togglePrimary,
  toggleGroup,
  toggleSubgroup,
  toggleLedger,
  financialYearLabel,
  hasFilters,
  resetFilters,
  preset,
  handlePresetChange,
  financialYearId,
  onFinancialYearChange,
  branch,
  onBranchChange,
  ledgerGroupIds,
  onLedgerGroupChange,
  ledgerIds,
  onLedgerChange,
  voucherTypes,
  onVoucherTypesChange,
  showZeroBalance,
  onShowZeroBalanceChange,
  includeOpeningBalance,
  onIncludeOpeningBalanceChange,
  moreFiltersActiveCount,
  filterSummaryItems,
  ledgerGroupOptions,
  ledgerOptions,
  branchOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  page,
  setPage,
  pageSize,
  setPageSize,
  exporting,
  setExporting,
  exportMeta,
  exceptions,
}: {
  mounted: boolean;
  activeTab: TrialBalanceTab;
  setActiveTab: (v: TrialBalanceTab) => void;
  filteredDetailedGroups: ReturnType<typeof buildTrialBalanceDetailedGroups>;
  normalFlatRows: TrialBalanceNormalPrimaryHeadRow[];
  detailedFlatRows: TrialBalanceDetailedFlatRow[];
  expandedPrimaryIds: Set<number>;
  expandedGroupIds: Set<string>;
  expandedSubgroupIds: Set<string>;
  expandedLedgerIds: Set<number>;
  togglePrimary: (id: number) => void;
  toggleGroup: (groupKey: string) => void;
  toggleSubgroup: (subgroupKey: string) => void;
  toggleLedger: (ledgerId: number) => void;
  financialYearLabel: string;
  hasFilters: boolean;
  resetFilters: () => void;
  preset: DateRangePresetId;
  handlePresetChange: (value: DateRangePresetId) => void;
  financialYearId: string;
  onFinancialYearChange: (value: string) => void;
  branch: string[];
  onBranchChange: (value: string[]) => void;
  ledgerGroupIds: string[];
  onLedgerGroupChange: (value: string[]) => void;
  ledgerIds: string[];
  onLedgerChange: (value: string[]) => void;
  voucherTypes: string[];
  onVoucherTypesChange: (value: string[]) => void;
  showZeroBalance: boolean;
  onShowZeroBalanceChange: (value: boolean) => void;
  includeOpeningBalance: boolean;
  onIncludeOpeningBalanceChange: (value: boolean) => void;
  moreFiltersActiveCount: number;
  filterSummaryItems: ReportFilterSummaryItem[];
  ledgerGroupOptions: { id: number; name: string }[];
  ledgerOptions: { id: number; name: string }[];
  branchOptions: string[];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: Parameters<typeof exportTrialBalanceNormalToExcel>[1];
  exceptions: TrialBalanceVoucherException[];
}) {
  const glDrillDownFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branch,
      warehouse: [] as string[],
      financialYearId,
    }),
    [dateFrom, dateTo, branch, financialYearId],
  );

  const paginatedNormalRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return normalFlatRows.slice(start, start + pageSize);
  }, [normalFlatRows, page, pageSize]);

  const paginatedDetailedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return detailedFlatRows.slice(start, start + pageSize);
  }, [detailedFlatRows, page, pageSize]);

  const summary = useMemo(
    () =>
      computeTrialBalanceSummaryFromDetailedGroups(
        filteredDetailedGroups,
        exceptions.length > 0,
      ),
    [filteredDetailedGroups, exceptions.length],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (activeTab === "normal") {
        await exportTrialBalanceNormalToExcel(filteredDetailedGroups, exportMeta, summary);
      } else {
        await exportTrialBalanceDetailedToExcel(filteredDetailedGroups, exportMeta, summary);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (activeTab === "normal") {
      exportTrialBalanceNormalToPdf(filteredDetailedGroups, exportMeta, summary);
    } else {
      exportTrialBalanceDetailedToPdf(filteredDetailedGroups, exportMeta, summary);
    }
  };

  const totalRecords =
    activeTab === "normal" ? normalFlatRows.length : detailedFlatRows.length;
  const recordLabel = activeTab === "normal" ? "rows" : "rows";
  const showEmpty = mounted && totalRecords === 0;
  const showTable = mounted && totalRecords > 0;
  const hasExportData = filteredDetailedGroups.length > 0;
  const showDetailedPagination = activeTab === "detailed" && detailedFlatRows.length > pageSize;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Trial Balance")}
      title="Trial Balance"
      description="Account group and ledger-wise trial balance for the selected period."
      hideDescription
      layout="split"
      className="trial-balance-compact h-full min-h-0"
      subHeader={<TrialBalanceViewTabs value={activeTab} onChange={setActiveTab} />}
      filters={
        <ReportFilterRow
          end={
            <AccountsExportMenu
              onExcel={handleExportExcel}
              onPdf={handleExportPdf}
              disabled={exporting || !mounted || !hasExportData}
            />
          }
        >
          <ReportFinancialYearFilter
            value={financialYearId}
            onChange={onFinancialYearChange}
          />
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={handlePresetChange}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            inlineCustomDates={false}
          />
          <ReportFromDateFilter value={dateFrom} onChange={setDateFrom} />
          <ReportToDateFilter value={dateTo} onChange={setDateTo} />
          <ReportBranchMultiFilter
            values={branch}
            onChange={onBranchChange}
            options={branchOptions.length ? branchOptions : REPORT_BRANCH_OPTIONS}
          />
          <ReportMoreFilters activeCount={moreFiltersActiveCount}>
            <ReportLedgerGroupMultiFilter
              values={ledgerGroupIds}
              onChange={onLedgerGroupChange}
              groups={ledgerGroupOptions}
            />
            <ReportLedgerMultiFilter
              values={ledgerIds}
              onChange={onLedgerChange}
              ledgers={ledgerOptions}
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={onVoucherTypesChange}
            />
            <ReportShowZeroBalanceToggle
              checked={showZeroBalance}
              onChange={onShowZeroBalanceChange}
            />
            <ReportIncludeOpeningBalanceToggle
              checked={includeOpeningBalance}
              onChange={onIncludeOpeningBalanceChange}
            />
          </ReportMoreFilters>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2 shrink-0"
              onClick={resetFilters}
            >
              Reset
            </Button>
          )}
        </ReportFilterRow>
      }
    >
      {mounted && exceptions.length > 0 && (
        <TrialBalanceExceptionsPanel exceptions={exceptions} />
      )}
      <AccountsListingTableCard className="trial-balance-compact flex-1 min-h-0">
        {filterSummaryItems.length > 0 && <ReportFilterSummary items={filterSummaryItems} />}
        <AccountsTableListing
          footer={
            <>
              <BalanceStatusBanner
                isBalanced={summary.isBalanced}
                openingDifference={summary.openingDifference}
                periodDifference={summary.periodDifference}
                closingDifference={summary.closingDifference}
                visible={mounted && totalRecords > 0}
              />
              {mounted && totalRecords > 0 && (activeTab === "normal" || showDetailedPagination) && (
                <AccountsTablePagination
                  page={page}
                  pageSize={pageSize}
                  totalRecords={totalRecords}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  recordLabel={recordLabel}
                />
              )}
            </>
          }
        >
          {!mounted ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading trial balance…
            </div>
          ) : showEmpty ? (
            <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
          ) : showTable && activeTab === "normal" ? (
            <AccountsTable minWidth={720}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <FinancialReportHeadCell className="min-w-[280px]">Particular</FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginatedNormalRows.map((row, i) => (
                  <AccountsTableRow
                    key={rowKey(row, i)}
                    className="group border-b border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <AccountsTableCell className={TB_NORMAL_INDENT.ledger}>
                      <AccountsCoaHierarchyRowLabel
                        level="primary_head"
                        name={row.primaryHead}
                      />
                    </AccountsTableCell>
                    <DebitCreditCells debit={row.debit} credit={row.credit} bold />
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="border-t-2 border-foreground/20">
                  <AccountsTableCell className="font-bold text-foreground text-xs">
                    TOTAL
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn(
                      "font-bold",
                      summary.closingDifference !== 0 && "text-red-600",
                    )}
                  >
                    {formatMoney(summary.totalDebit)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn(
                      "font-bold",
                      summary.closingDifference !== 0 && "text-red-600",
                    )}
                  >
                    {formatMoney(summary.totalCredit)}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          ) : showTable && activeTab === "detailed" ? (
            <AccountsTable minWidth={720}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <FinancialReportHeadCell className="min-w-[280px]">Particular</FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {(showDetailedPagination ? paginatedDetailedRows : detailedFlatRows).map((row, i) => {
                  if (row.type === "primary") {
                    const expanded = expandedPrimaryIds.has(row.primaryHeadId);
                    return (
                      <AccountsTableRow
                        key={rowKey(row, i)}
                        className="group border-b border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.primary}>
                          <button
                            type="button"
                            onClick={() => togglePrimary(row.primaryHeadId)}
                            className="w-full text-left"
                          >
                            <AccountsCoaHierarchyRowLabel
                              level="primary_head"
                              name={row.primaryHead}
                              expandable
                              expanded={expanded}
                              showTreeGuides
                            />
                          </button>
                        </AccountsTableCell>
                        <DebitCreditCells
                          debit={row.amounts.closingDebit}
                          credit={row.amounts.closingCredit}
                          bold
                        />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "group") {
                    const expanded = expandedGroupIds.has(row.groupKey);
                    return (
                      <AccountsTableRow
                        key={rowKey(row, i)}
                        className="group bg-muted/15 hover:bg-muted/30 transition-colors"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.group}>
                          <AccountsCoaHierarchyRowLabel
                            level="account_group"
                            name={row.groupName}
                            nameHref={buildTrialBalanceGroupHref(
                              row.groupId,
                              row.groupName,
                              glDrillDownFilters,
                            )}
                            ledgerCount={row.ledgerCount}
                            expandable={row.ledgerCount > 0}
                            expanded={expanded}
                            onExpandClick={() => toggleGroup(row.groupKey)}
                            showTreeGuides
                          />
                        </AccountsTableCell>
                        <DebitCreditCells
                          debit={row.amounts.closingDebit}
                          credit={row.amounts.closingCredit}
                          bold
                        />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "subgroup") {
                    const expanded = expandedSubgroupIds.has(row.subgroupKey);
                    return (
                      <AccountsTableRow
                        key={rowKey(row, i)}
                        className="group bg-muted/10 hover:bg-muted/30 transition-colors"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.subgroup}>
                          <AccountsCoaHierarchyRowLabel
                            level="sub_group"
                            name={row.subgroupName}
                            nameHref={buildTrialBalanceGroupHref(
                              row.subgroupId,
                              row.subgroupName,
                              glDrillDownFilters,
                            )}
                            ledgerCount={row.ledgerCount}
                            expandable={row.ledgerCount > 0}
                            expanded={expanded}
                            onExpandClick={() => toggleSubgroup(row.subgroupKey)}
                            showTreeGuides
                          />
                        </AccountsTableCell>
                        <DebitCreditCells
                          debit={row.amounts.closingDebit}
                          credit={row.amounts.closingCredit}
                        />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "ledger") {
                    return (
                      <AccountsTableRow
                        key={rowKey(row, i)}
                        className="group hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleLedger(row.ledger.ledgerId)}
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.ledger}>
                          <AccountsCoaHierarchyRowLabel
                            level="ledger"
                            name={row.ledger.ledgerName}
                            nameHref={buildTrialBalanceLedgerHref(row.ledger.ledgerId, glDrillDownFilters)}
                            expandable
                            expanded={expandedLedgerIds.has(row.ledger.ledgerId)}
                            showTreeGuides
                          />
                        </AccountsTableCell>
                        <DebitCreditCells
                          debit={row.ledger.closingDebit}
                          credit={row.ledger.closingCredit}
                        />
                      </AccountsTableRow>
                    );
                  }
                  return (
                    <AccountsTableRow
                      key={rowKey(row, i)}
                      className="group bg-muted/10 hover:bg-muted/25 transition-colors"
                    >
                      <AccountsTableCell className={TB_DETAILED_INDENT.voucher}>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                            <span className="text-muted-foreground">
                              {formatTrialBalanceReportDate(row.voucher.date)}
                            </span>
                            <Link
                              href={row.voucher.viewHref}
                              className="font-mono text-brand-700 hover:underline"
                            >
                              {row.voucher.voucherNo}
                            </Link>
                            <span className="text-muted-foreground">
                              {row.voucher.voucherTypeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {row.voucher.narration}
                          </p>
                        </div>
                      </AccountsTableCell>
                      <DebitCreditCells
                        debit={row.voucher.debit}
                        credit={row.voucher.credit}
                      />
                    </AccountsTableRow>
                  );
                })}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="border-t-2 border-foreground/20">
                  <AccountsTableCell className="font-bold text-foreground text-xs">
                    TOTAL
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn(
                      "font-bold",
                      summary.closingDifference !== 0 && "text-red-600",
                    )}
                  >
                    {formatMoney(summary.totalDebit)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn(
                      "font-bold",
                      summary.closingDifference !== 0 && "text-red-600",
                    )}
                  >
                    {formatMoney(summary.totalCredit)}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          ) : null}
        </AccountsTableListing>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}

function TrialBalanceExceptionsPanel({
  exceptions,
}: {
  exceptions: TrialBalanceVoucherException[];
}) {
  return (
    <div className="flex-shrink-0 mb-2 rounded-lg border border-red-200 bg-red-50/70 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-red-100">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-red-700">
          Unbalanced Vouchers ({exceptions.length})
        </span>
        <span className="text-[11px] text-red-600/80">
          — these vouchers do not satisfy Total Debit = Total Credit and must be corrected at source.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-red-100/40 text-red-700">
              <th className="px-3 py-1.5 text-left font-semibold">Voucher No.</th>
              <th className="px-3 py-1.5 text-left font-semibold">Date</th>
              <th className="px-3 py-1.5 text-left font-semibold">Type</th>
              <th className="px-3 py-1.5 text-right font-semibold">Total Debit</th>
              <th className="px-3 py-1.5 text-right font-semibold">Total Credit</th>
              <th className="px-3 py-1.5 text-right font-semibold">Difference</th>
              <th className="px-3 py-1.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((ex) => (
              <tr key={ex.voucherId} className="border-t border-red-100">
                <td className="px-3 py-1.5 font-mono text-brand-700">{ex.voucherNo}</td>
                <td className="px-3 py-1.5 text-foreground">{ex.date}</td>
                <td className="px-3 py-1.5 text-foreground">{ex.voucherTypeLabel}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(ex.totalDebit)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(ex.totalCredit)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-red-600">
                  {formatMoney(ex.difference)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Link href={ex.viewHref} className="text-brand-700 hover:underline font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="accounts-table-empty py-4 text-center">
      No records found.
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="block mx-auto mt-1 text-brand-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
