"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, BookOpen, Printer } from "lucide-react";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  CogsProductWisePanel,
  InventoryProductWisePanel,
} from "@/components/accounts/InventoryProductWisePanels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { BillWiseOutstandingButton } from "@/components/accounts/BillWiseOutstandingButton";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import {
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFilterSummary,
  ReportFinancialYearFilter,
  ReportMoreFilters,
  ReportVoucherTypeMultiFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  countActiveMoreFilters,
  type ReportFilterSummaryItem,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { GENERAL_LEDGER_SOURCE_REPORTS } from "@/lib/accounts/general-ledger-types";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import { billWiseOutstandingHref } from "@/lib/accounts/bill-wise-outstanding";
import {
  resolveCustomerPartyLedgerId,
  resolveSupplierPartyLedgerId,
} from "@/lib/accounts/resolve-party-ledger";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { useClientMounted } from "@/lib/use-client-mounted";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { LedgerService } from "@/services/ledger.service";
import {
  GeneralLedgerApiError,
  GeneralLedgerApiService,
} from "@/services/general-ledger.service";
import type {
  GeneralLedgerApiRow,
  GeneralLedgerBalanceSideFilter,
  GeneralLedgerFiltersConfig,
  GeneralLedgerGroupResponse,
  GeneralLedgerQueryParams,
  GeneralLedgerStatementResponse,
} from "@/types/general-ledger.types";
import {
  mapDropdownLedger,
  type GeneralLedgerPickerOption,
} from "./general-ledger-api-view";
import { GeneralLedgerGroupDrillDownView } from "./GeneralLedgerGroupDrillDown";
import { GeneralLedgerReportHeader } from "./GeneralLedgerReportHeader";
import { GeneralLedgerSelect } from "./GeneralLedgerSelect";
import { GeneralLedgerTable } from "./GeneralLedgerTable";

const FALLBACK_LEDGER_TYPES: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "Customer", label: "Customer" },
  { value: "Vendor", label: "Vendor" },
  { value: "Bank", label: "Bank" },
  { value: "Cash", label: "Cash" },
  { value: "Sales", label: "Sales" },
  { value: "Purchase", label: "Purchase" },
  { value: "GST", label: "GST" },
  { value: "Expense", label: "Expense" },
  { value: "Income", label: "Income" },
  { value: "Inventory", label: "Inventory" },
  { value: "Employee", label: "Employee" },
  { value: "General", label: "General" },
];

const SOURCE_HREFS: Record<string, string> = {
  "trial-balance": "/accounts/reports/trial-balance",
  "balance-sheet": "/accounts/reports/balance-sheet",
  "profit-loss": "/accounts/reports/pl",
  "cash-flow": "/accounts/reports/cash-flow",
  "day-book": "/accounts/reports/day-book",
  "chart-of-accounts": "/accounts/masters/chart-of-accounts",
};

type DebitCreditFilter = "all" | "debit" | "credit";

interface UrlSnapshot {
  ledgerId: string;
  groupId: string;
  ledgerType: string;
  fyId: string;
  dateFrom: string;
  dateTo: string;
  branches: string[];
  sourceReport: string;
}

function splitParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
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
  const { openTransaction, drawer: voucherDrawer } = useTransactionDetailsDrawer();
  const sectionRefresh = useAccountsSectionRefresh("*", { apiListing: true });

  const [hydrated, setHydrated] = useState(false);
  const [ledgerId, setLedgerId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [ledgerType, setLedgerType] = useState("all");
  const [sourceReport, setSourceReport] = useState("");
  const [fyId, setFyId] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [debitCredit, setDebitCredit] = useState<DebitCreditFilter>("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pickerLedgers, setPickerLedgers] = useState<GeneralLedgerPickerOption[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [filtersConfig, setFiltersConfig] = useState<GeneralLedgerFiltersConfig | null>(null);
  const [statement, setStatement] = useState<GeneralLedgerStatementResponse | null>(null);
  const [groupReport, setGroupReport] = useState<GeneralLedgerGroupResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<GeneralLedgerApiError | null>(null);
  const [partyResolving, setPartyResolving] = useState(false);
  const [partyError, setPartyError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const appliedDefaultDates = useRef(false);
  const lastScopeKey = useRef("");
  const wroteDefaultUrl = useRef(false);
  const snapshot = useMemo<UrlSnapshot>(
    () => ({
      ledgerId,
      groupId,
      ledgerType,
      fyId,
      dateFrom,
      dateTo,
      branches,
      sourceReport,
    }),
    [ledgerId, groupId, ledgerType, fyId, dateFrom, dateTo, branches, sourceReport],
  );
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const syncUrl = useCallback(
    (overrides?: Partial<UrlSnapshot>) => {
      const next = { ...snapshotRef.current, ...overrides };
      snapshotRef.current = next;
      const href = buildGeneralLedgerHref({
        ledgerId: next.ledgerId || undefined,
        groupId: next.ledgerId ? undefined : next.groupId || undefined,
        fromDate: next.dateFrom,
        toDate: next.dateTo,
        source: next.sourceReport || undefined,
        financialYearId: next.fyId && next.fyId !== "all" ? next.fyId : undefined,
        branch: next.branches.length > 0 ? next.branches.join(",") : undefined,
        ledgerType: next.ledgerType !== "all" ? next.ledgerType : undefined,
      });
      const url = new URL(href, "http://local");
      for (const key of ["customer", "supplier", "company", "party"] as const) {
        const existing = searchParams.get(key);
        if (existing && !url.searchParams.has(key)) url.searchParams.set(key, existing);
      }
      const qs = url.searchParams.toString();
      router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!mounted) return;
    const ledgerParam = searchParams.get("ledgerId") ?? searchParams.get("ledger") ?? "";
    const groupParam = searchParams.get("groupId") ?? "";
    setLedgerId(ledgerParam);
    setGroupId(ledgerParam ? "" : groupParam);
    setLedgerType(searchParams.get("ledgerType") ?? "all");
    setSourceReport(searchParams.get("source") ?? "");

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

    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
    if (urlFy && urlFy !== "all") setFyId(urlFy);

    const urlBranch = splitParam(searchParams.get("branch"));
    const urlWarehouse = splitParam(searchParams.get("warehouse"));
    setBranches(urlBranch.length > 0 ? urlBranch : urlWarehouse);
    setPage(1);
    setHydrated(true);
  }, [mounted, searchParams, setDateFrom, setDateTo, setPreset]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    setPickerLoading(true);
    void LedgerService.getDropdown({ status: "ACTIVE" }, controller.signal)
      .then((result) => {
        setPickerLedgers(result.ledgers.map(mapDropdownLedger));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setReportError(
          err instanceof GeneralLedgerApiError
            ? err
            : new GeneralLedgerApiError(
                err instanceof Error ? err.message : "Failed to load ledgers.",
              ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPickerLoading(false);
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void GeneralLedgerApiService.getFilters(controller.signal)
      .then((config) => setFiltersConfig(config))
      .catch(() => {
        if (!controller.signal.aborted) setFiltersConfig(null);
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!hydrated || !filtersConfig) return;
    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId");
    if ((!urlFy || urlFy === "all") && filtersConfig.defaults.financial_year_id) {
      setFyId((current) =>
        current && current !== "all" ? current : filtersConfig.defaults.financial_year_id || current,
      );
    }
    const urlFrom = searchParams.get("fromDate") ?? searchParams.get("from");
    const urlTo = searchParams.get("toDate") ?? searchParams.get("to");
    if (!urlFrom && !urlTo && !appliedDefaultDates.current) {
      if (filtersConfig.defaults.from_date) setDateFrom(filtersConfig.defaults.from_date);
      if (filtersConfig.defaults.to_date) setDateTo(filtersConfig.defaults.to_date);
      setPreset("custom");
      appliedDefaultDates.current = true;
    }
  }, [filtersConfig, hydrated, searchParams, setDateFrom, setDateTo, setPreset]);

  useEffect(() => {
    if (!hydrated || !fyId || fyId === "all" || !dateFrom || !dateTo || wroteDefaultUrl.current) return;
    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId");
    const urlFrom = searchParams.get("fromDate") ?? searchParams.get("from");
    const urlTo = searchParams.get("toDate") ?? searchParams.get("to");
    if (urlFy && urlFrom && urlTo) {
      wroteDefaultUrl.current = true;
      return;
    }
    wroteDefaultUrl.current = true;
    syncUrl({ fyId, dateFrom, dateTo });
  }, [hydrated, fyId, dateFrom, dateTo, searchParams, syncUrl]);

  useEffect(() => {
    if (!hydrated || ledgerId) return;
    const customer = searchParams.get("customer");
    const supplier = searchParams.get("supplier");
    if (!customer && !supplier) return;

    let cancelled = false;
    setPartyResolving(true);
    setPartyError(null);
    const request = customer
      ? resolveCustomerPartyLedgerId(customer).then((id) => ({
          id,
          type: "Customer" as const,
          missing: "No accounting ledger is linked to this customer.",
        }))
      : resolveSupplierPartyLedgerId(supplier!).then((id) => ({
          id,
          type: "Vendor" as const,
          missing: "No accounting ledger is linked to this supplier.",
        }));

    void request.then((result) => {
      if (cancelled) return;
      setPartyResolving(false);
      if (!result.id) {
        setPartyError(result.missing);
        return;
      }
      setLedgerId(result.id);
      setLedgerType(result.type);
      setGroupId("");
      setPage(1);
      syncUrl({ ledgerId: result.id, groupId: "", ledgerType: result.type });
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, ledgerId, searchParams, syncUrl]);

  const balanceSide: GeneralLedgerBalanceSideFilter =
    debitCredit === "debit" ? "DEBIT" : debitCredit === "credit" ? "CREDIT" : "ALL";

  const queryParams = useMemo((): GeneralLedgerQueryParams | null => {
    if (!hydrated || !fyId || fyId === "all" || !dateFrom || !dateTo) return null;
    if (!ledgerId && !groupId) return null;
    if (dateFrom > dateTo) return null;
    return {
      financial_year_id: fyId,
      from_date: dateFrom,
      to_date: dateTo,
      ledger_id: ledgerId || undefined,
      group_id: ledgerId ? undefined : groupId || undefined,
      branch_ids: branches,
      voucher_types: voucherTypes,
      balance_side: balanceSide,
      page,
      page_size: pageSize,
    };
  }, [
    hydrated,
    fyId,
    dateFrom,
    dateTo,
    ledgerId,
    groupId,
    branches,
    voucherTypes,
    balanceSide,
    page,
    pageSize,
  ]);

  useEffect(() => {
    if (!queryParams) return;
    const scopeKey = [
      queryParams.ledger_id ?? "",
      queryParams.group_id ?? "",
      queryParams.financial_year_id,
      queryParams.from_date,
      queryParams.to_date,
      (queryParams.branch_ids ?? []).join(","),
    ].join("|");
    const scopeChanged = lastScopeKey.current !== scopeKey;
    lastScopeKey.current = scopeKey;
    if (scopeChanged) {
      setStatement(null);
      setGroupReport(null);
    }

    const controller = new AbortController();
    setReportLoading(true);
    setReportError(null);
    void GeneralLedgerApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (result.mode === "LEDGER") {
          setStatement(result);
          setGroupReport(null);
        } else {
          setGroupReport(result);
          setStatement(null);
        }
        setReportLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const apiError =
          err instanceof GeneralLedgerApiError
            ? err
            : new GeneralLedgerApiError(
                err instanceof Error ? err.message : "Failed to load General Ledger.",
              );
        setReportError(apiError);
        setReportLoading(false);
      });

    return () => controller.abort();
  }, [queryParams, refreshKey, sectionRefresh]);

  const filteredLedgers = useMemo(() => {
    if (ledgerType === "all") return pickerLedgers;
    return pickerLedgers.filter((ledger) => ledger.ledgerType === ledgerType);
  }, [pickerLedgers, ledgerType]);

  const selectedType = useMemo(() => {
    if (statement && statement.ledger.ledger_id === ledgerId) return statement.ledger.ledger_type;
    return pickerLedgers.find((ledger) => ledger.id === ledgerId)?.ledgerType ?? null;
  }, [statement, ledgerId, pickerLedgers]);

  const handleLedgerChange = useCallback(
    (value: string) => {
      setLedgerId(value);
      setGroupId("");
      setPage(1);
      setPartyError(null);
      syncUrl({ ledgerId: value, groupId: "" });
    },
    [syncUrl],
  );

  const handleLedgerTypeChange = useCallback(
    (value: string) => {
      setLedgerType(value);
      setPage(1);
      const stillValid = !ledgerId || value === "all" || selectedType == null || selectedType === value;
      if (!stillValid) {
        setLedgerId("");
        syncUrl({ ledgerId: "", ledgerType: value });
      } else {
        syncUrl({ ledgerType: value });
      }
    },
    [ledgerId, selectedType, syncUrl],
  );

  const handleFyChange = useCallback(
    (value: string) => {
      if (!value || value === "all") return;
      const fy = filtersConfig?.financial_years.find((item) => item.financial_year_id === value);
      let nextFrom = dateFrom;
      let nextTo = dateTo;
      if (
        fy &&
        (dateFrom < fy.start_date ||
          dateFrom > fy.end_date ||
          dateTo < fy.start_date ||
          dateTo > fy.end_date)
      ) {
        nextFrom = fy.start_date;
        nextTo = fy.end_date;
        setDateFrom(nextFrom);
        setDateTo(nextTo);
        setPreset("custom");
      }
      setFyId(value);
      setPage(1);
      syncUrl({ fyId: value, dateFrom: nextFrom, dateTo: nextTo });
    },
    [dateFrom, dateTo, filtersConfig, setDateFrom, setDateTo, setPreset, syncUrl],
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFrom(value);
      setPreset("custom");
      setPage(1);
      syncUrl({ dateFrom: value });
    },
    [setDateFrom, setPreset, syncUrl],
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateTo(value);
      setPreset("custom");
      setPage(1);
      syncUrl({ dateTo: value });
    },
    [setDateTo, setPreset, syncUrl],
  );

  const handleBranchesChange = useCallback(
    (values: string[]) => {
      setBranches(values);
      setPage(1);
      syncUrl({ branches: values });
    },
    [syncUrl],
  );

  const handleVoucherTypesChange = useCallback((values: string[]) => {
    setVoucherTypes(values);
    setPage(1);
  }, []);

  const handleDebitCreditChange = useCallback((value: DebitCreditFilter) => {
    setDebitCredit(value);
    setPage(1);
  }, []);

  const handleSelectGroup = useCallback(
    (nextGroupId: string) => {
      setGroupId(nextGroupId);
      setLedgerId("");
      setPage(1);
      syncUrl({ groupId: nextGroupId, ledgerId: "" });
    },
    [syncUrl],
  );

  const branchOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        value: branch.warehouse_id,
        label: branch.warehouse_name,
      })),
    [filtersConfig],
  );
  const voucherTypeOptions = useMemo(
    () => filtersConfig?.voucher_types ?? [],
    [filtersConfig],
  );
  const ledgerTypeOptions = useMemo(() => {
    const fromApi = filtersConfig?.ledger_types ?? [];
    if (fromApi.length === 0) return FALLBACK_LEDGER_TYPES;
    return [{ value: "all", label: "All Types" }, ...fromApi];
  }, [filtersConfig]);

  const financialYearLabel = useMemo(() => {
    return (
      statement?.scope.financial_year_name ||
      groupReport?.scope.financial_year_name ||
      filtersConfig?.financial_years.find((fy) => fy.financial_year_id === fyId)?.name ||
      ""
    );
  }, [statement, groupReport, filtersConfig, fyId]);

  const sourceLabel = sourceReport
    ? (GENERAL_LEDGER_SOURCE_REPORTS[sourceReport as keyof typeof GENERAL_LEDGER_SOURCE_REPORTS] ??
      sourceReport)
    : null;
  const sourceHref = sourceReport ? (SOURCE_HREFS[sourceReport] ?? null) : null;

  const filtersActive = voucherTypes.length > 0 || debitCredit !== "all";
  const scopeNote =
    statement?.notes.opening_balance_branch_limitation ||
    groupReport?.notes.opening_balance_branch_limitation ||
    null;

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      ledgerType !== "all"
        ? {
            id: "ledgerType",
            label: "Ledger Type",
            value: ledgerType,
            onRemove: () => handleLedgerTypeChange("all"),
          }
        : null,
      buildEntityFilterSummary("branch", "Branches", branches, branchOptions, () =>
        handleBranchesChange([]),
      ),
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        voucherTypeOptions,
        () => handleVoucherTypesChange([]),
      ),
      debitCredit !== "all"
        ? {
            id: "debitCredit",
            label: "Dr/Cr",
            value: debitCredit === "debit" ? "Debit only" : "Credit only",
            onRemove: () => handleDebitCreditChange("all"),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    ledgerType,
    branches,
    voucherTypes,
    debitCredit,
    branchOptions,
    voucherTypeOptions,
    handleLedgerTypeChange,
    handleBranchesChange,
    handleDebitCreditChange,
  ]);

  const moreFiltersActiveCount =
    countActiveMoreFilters({
      voucherType: voucherTypes,
    }) + (debitCredit !== "all" ? 1 : 0);

  const handleVoucherClick = useCallback(
    (row: GeneralLedgerApiRow) => {
      if (!row.voucher_id) return;
      const debit = Number(row.debit);
      const credit = Number(row.credit);
      openTransaction({
        type: "general_ledger",
        row: {
          date: row.date,
          voucherNo: row.voucher_number ?? "",
          voucherType: row.transaction_type || row.voucher_type || "",
          referenceNo: row.reference_no ?? "",
          narration: row.narration ?? "",
          debit: Number.isFinite(debit) ? debit : 0,
          credit: Number.isFinite(credit) ? credit : 0,
          runningBalance: Number(row.running_balance) || 0,
          runningBalanceType: row.running_balance_side === "CREDIT" ? "Credit" : "Debit",
          voucherId: row.voucher_id,
          viewHref: row.view_href ?? undefined,
          viewLabel: row.view_href ? "Open Voucher" : undefined,
          contraLedger: row.particulars,
        },
      });
    },
    [openTransaction],
  );

  const handleExport = async (format: "EXCEL" | "PDF") => {
    if (!queryParams?.ledger_id || exporting || !statement) return;
    setExporting(true);
    try {
      await GeneralLedgerApiService.exportReport({
        ...queryParams,
        ledger_id: queryParams.ledger_id,
        ledger_code: statement.ledger.ledger_code,
        format,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to export General Ledger.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  };

  const breadcrumbs = sourceLabel
    ? [
        ...accountsBreadcrumb("Reports", "General Ledger").slice(0, -1),
        { label: sourceLabel, href: sourceHref ?? undefined },
        { label: statement?.ledger.ledger_name ?? groupReport?.group.group_name ?? "General Ledger" },
      ]
    : accountsBreadcrumb("Reports", "General Ledger");

  const showGroupView = Boolean(groupId && !ledgerId && groupReport);
  const showLedgerView = Boolean(ledgerId && statement);
  const specialView = statement?.ledger.special_view ?? "NONE";
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const waitingForSelection = hydrated && !ledgerId && !groupId && !partyResolving;
  const initialLoading =
    !hydrated ||
    partyResolving ||
    (Boolean(ledgerId || groupId) && reportLoading && !statement && !groupReport);
  const notFound =
    reportError?.status === 404 && !statement && !groupReport && Boolean(ledgerId || groupId);
  const showPeriodEmpty =
    showLedgerView &&
    statement != null &&
    statement.summary.has_period_transactions === false &&
    !filtersActive;
  const showFilterEmpty =
    showLedgerView &&
    statement != null &&
    statement.summary.has_period_transactions &&
    statement.transactions.length === 0 &&
    filtersActive;

  const billWiseHref =
    statement?.ledger.bill_wise_outstanding && statement.ledger.ledger_id
      ? billWiseOutstandingHref(statement.ledger.ledger_id, "gl", statement.ledger.ledger_id)
      : null;

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
          <BillWiseOutstandingButton ledger={null} href={billWiseHref} from="gl" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={!showLedgerView}
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
                onExcel={() => void handleExport("EXCEL")}
                onPdf={() => void handleExport("PDF")}
                disabled={!showLedgerView || exporting}
              />
            }
          >
            {fyId ? (
              <ReportFinancialYearFilter value={fyId} onChange={handleFyChange} />
            ) : (
              <div className="h-8 w-[130px] bg-muted animate-pulse rounded-md" />
            )}
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={(next) => {
                setPreset(next);
                setPage(1);
              }}
              onDateFromChange={handleDateFromChange}
              onDateToChange={handleDateToChange}
            />
            <div className="space-y-1 min-w-[140px]">
              <Label className={filterLabelClass}>Ledger Type</Label>
              <select
                value={ledgerType}
                onChange={(e) => handleLedgerTypeChange(e.target.value)}
                className={cn(filterControlClass, "mt-0 w-full")}
              >
                {ledgerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <GeneralLedgerSelect
              value={ledgerId}
              ledgers={filteredLedgers}
              onChange={handleLedgerChange}
              loading={pickerLoading}
            />
            <ReportBranchMultiFilter
              values={branches}
              onChange={handleBranchesChange}
              labeledOptions={branchOptions}
            />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportVoucherTypeMultiFilter
                values={voucherTypes}
                onChange={handleVoucherTypesChange}
                options={voucherTypeOptions}
              />
              <div className="space-y-1 min-w-[120px]">
                <Label className={filterLabelClass}>Dr / Cr</Label>
                <select
                  value={debitCredit}
                  onChange={(e) => handleDebitCreditChange(e.target.value as DebitCreditFilter)}
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
          {dateInvalid ? (
            <p className="px-1 text-xs text-red-600">From Date must be less than or equal to To Date.</p>
          ) : null}
          {reportError && reportError.status !== 404 ? (
            <div className="px-1 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{reportError.message}</span>
              {reportError.status !== 400 && reportError.status !== 403 ? (
                <button
                  type="button"
                  className="text-brand-600 hover:underline"
                  onClick={() => setRefreshKey((value) => value + 1)}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {scopeNote ? <p className="px-1 text-[11px] text-muted-foreground">{scopeNote}</p> : null}
        </>
      }
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <div className={cn("flex flex-col flex-1 min-h-0", reportLoading && (statement || groupReport) && "opacity-70")}>
          {initialLoading ? (
            <GeneralLedgerSkeleton />
          ) : waitingForSelection ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-2 max-w-sm">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  {partyError ?? "Select a ledger or open from another report."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Use Ledger Type (Customer / Vendor) to narrow party accounts, search for a ledger,
                  or drill down from Trial Balance, Balance Sheet, P&amp;L, or Cash Flow.
                </p>
              </div>
            </div>
          ) : notFound ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
              {ledgerId
                ? "Ledger not found or has no statement data."
                : "Account group not found or has no drill-down data."}
            </div>
          ) : showGroupView && groupReport ? (
            <GeneralLedgerGroupDrillDownView
              groupName={groupReport.group.group_name}
              parentGroup={groupReport.group.parent_group}
              children={groupReport.children}
              dateFrom={dateFrom}
              dateTo={dateTo}
              fyId={fyId}
              source={sourceReport || undefined}
              branch={branches.length > 0 ? branches.join(",") : undefined}
              onSelectLedger={handleLedgerChange}
              onSelectGroup={handleSelectGroup}
            />
          ) : showLedgerView && statement ? (
            specialView === "STOCK_IN_HAND" ? (
              <InventoryProductWisePanel
                dateFrom={dateFrom}
                dateTo={dateTo}
                warehouseId={branches.length === 1 ? branches[0] : undefined}
                hideWarehouseFilter
              />
            ) : specialView === "COGS" ? (
              <CogsProductWisePanel dateFrom={dateFrom} dateTo={dateTo} />
            ) : (
              <>
                <GeneralLedgerReportHeader
                  companyName={statement.company.name}
                  companyAddress={statement.company.address}
                  companyContact={statement.company.contact}
                  companyEmail={statement.company.email}
                  ledgerName={statement.ledger.ledger_name}
                  ledgerCode={statement.ledger.ledger_code}
                  parentGroup={statement.ledger.parent_group}
                  ledgerType={statement.ledger.ledger_type}
                  gstin={statement.ledger.gstin}
                  pan={statement.ledger.pan}
                  dateFrom={statement.scope.from_date}
                  dateTo={statement.scope.to_date}
                  financialYearLabel={financialYearLabel}
                />
                {showPeriodEmpty ? (
                  <div className="px-4 py-3 border-b border-border/60 bg-amber-50/40">
                    <p className="text-xs text-amber-800">
                      No transactions found for the selected period. Opening and closing balances are
                      shown below.
                    </p>
                  </div>
                ) : null}
                {showFilterEmpty ? (
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-xs text-muted-foreground">
                      No transactions match your filters.{" "}
                      <button
                        type="button"
                        className="text-brand-600 hover:underline"
                        onClick={() => {
                          handleVoucherTypesChange([]);
                          handleDebitCreditChange("all");
                        }}
                      >
                        Clear filters
                      </button>
                    </p>
                  </div>
                ) : null}
                <GeneralLedgerTable
                  openingRow={statement.opening_row}
                  transactionRows={statement.transactions}
                  closingRow={statement.closing_row}
                  summary={statement.summary}
                  filtersActive={filtersActive}
                  page={statement.pagination.page}
                  pageSize={statement.pagination.page_size}
                  totalTransactions={statement.pagination.total_transactions}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setPageSize(next);
                    setPage(1);
                  }}
                  onVoucherClick={handleVoucherClick}
                />
              </>
            )
          ) : ledgerId || groupId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
              {reportError?.message ?? "Unable to load General Ledger."}
            </div>
          ) : null}
        </div>
      </AccountsListingTableCard>
      {voucherDrawer}
    </AccountsPageShell>
  );
}

export default function GeneralLedgerPageClient() {
  return (
    <Suspense fallback={<GeneralLedgerSkeleton />}>
      <GeneralLedgerPageContent />
    </Suspense>
  );
}
