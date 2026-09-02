"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, AlertCircle } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportLedgerFilter,
  ReportVoucherTypeMultiFilter,
  ReportFilterSummary,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import { useFY } from "@/lib/fy-store";
import { showToast } from "@/lib/toast";
import type { AccountsColumnFilterState } from "@/lib/accounts/column-filter-types";
import {
  CASH_BOOK_VOUCHER_TYPE_OPTIONS,
  type CashBookDisplayRow,
  type CashBookLedgerOption,
  type CashBookStatement,
} from "./cash-book-data";
import { CashBookApiService } from "@/services/cash-book.service";
import { CashBookTable } from "./CashBookTable";

function CashBookPageContent() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();
  const financialYearId = selectedFY?.id ?? null;

  // Filter state (Single-select Cash Ledger)
  const [cashLedgerId, setCashLedgerId] = useState<string>("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  // Column Filters
  const [columnFilters, setColumnFilters] = useState<{
    voucherNo?: string;
    particular?: string;
    reference?: string;
    status?: string;
  }>({});

  // Sorting state
  const [sortKey, setSortKey] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // API Data state
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState<CashBookStatement | null>(null);
  const [cashLedgers, setCashLedgers] = useState<CashBookLedgerOption[]>([]);
  const [voucherTypeOptions, setVoucherTypeOptions] = useState<{ value: string; label: string }[]>(
    CASH_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all")
  );

  // Load cash ledgers from backend
  useEffect(() => {
    let active = true;
    async function loadLedgers() {
      try {
        const list = await CashBookApiService.getCashLedgers();
        if (!active) return;
        setCashLedgers(
          list.map((l) => ({
            id: l.ledgerId,
            ledgerId: l.ledgerId,
            ledgerName: l.ledgerName,
            ledgerCode: l.ledgerCode,
            subGroupName: l.subGroupName,
            subGroupCode: l.subGroupCode,
          }))
        );
      } catch (err) {
        console.warn("Failed to load cash ledgers:", err);
      }
    }
    loadLedgers();
    return () => {
      active = false;
    };
  }, []);

  // Load dynamic voucher types from backend
  useEffect(() => {
    let active = true;
    async function loadVoucherTypes() {
      try {
        const types = await CashBookApiService.getVoucherTypes();
        if (!active || types.length === 0) return;
        setVoucherTypeOptions(
          types.map((t) => ({
            value: t.code,
            label: t.label,
          }))
        );
      } catch (err) {
        console.warn("Failed to load cash book voucher types:", err);
      }
    }
    loadVoucherTypes();
    return () => {
      active = false;
    };
  }, []);

  // Single-select Cash Ledger dropdown options
  const cashLedgerOptions = useMemo(
    () =>
      cashLedgers.map((l) => ({
        id: l.ledgerId,
        name: l.ledgerName,
      })),
    [cashLedgers]
  );

  // Selected Cash Ledger ID
  const effectiveLedgerId = cashLedgerId && cashLedgerId !== "all" ? cashLedgerId : undefined;

  // Reset page when filters or sorting change
  useEffect(() => {
    setPage(1);
  }, [effectiveLedgerId, dateFrom, dateTo, voucherTypes, debouncedSearch, columnFilters, sortKey, sortDir, financialYearId]);

  // Column filter change handler (supports multiple checked items)
  const handleColumnFilterChange = useCallback((column: string, state: AccountsColumnFilterState | undefined) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!state) {
        delete next[column as keyof typeof next];
        return next;
      }
      if (state.type === "text") {
        const textVal = state.textValue?.trim();
        const selectedVals = state.selectedValues?.filter((v) => v && v !== "all") || [];
        const combined = selectedVals.length > 0 ? selectedVals.join(",") : textVal || "";
        if (combined) {
          next[column as keyof typeof next] = combined;
        } else {
          delete next[column as keyof typeof next];
        }
      } else if (state.type === "status") {
        const selectedVals = state.selectedValues?.filter((v) => v && v !== "all") || [];
        if (selectedVals.length > 0) {
          next[column as keyof typeof next] = selectedVals.join(",");
        } else {
          delete next[column as keyof typeof next];
        }
      }
      return next;
    });
  }, []);

  // Sort handlers (cycles asc -> desc -> default order)
  const handleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        if (sortDir === "asc") {
          setSortDir("desc");
          return key;
        } else {
          // Reset to default sort
          setSortDir("asc");
          return "date";
        }
      }
      setSortDir("asc");
      return key;
    });
    setPage(1);
  }, [sortDir]);

  const handleRemoveSort = useCallback(() => {
    setSortKey("date");
    setSortDir("asc");
    setPage(1);
  }, []);

  // Fetch Cash Book listing from API
  useEffect(() => {
    if (!mounted) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const voucherTypeParam =
      voucherTypes.length > 0 && voucherTypes[0] !== "all"
        ? voucherTypes.join(",")
        : undefined;

    CashBookApiService.getCashBook(
      {
        cashLedgerId: effectiveLedgerId,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        voucherType: voucherTypeParam,
        voucherNo: columnFilters.voucherNo,
        particular: columnFilters.particular,
        reference: columnFilters.reference,
        status: columnFilters.status,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortKey,
        sortOrder: sortDir,
        page,
        limit: pageSize,
      },
      financialYearId,
      controller.signal
    )
      .then((res) => {
        const summaryData = res.summary;
        const openingRow: CashBookDisplayRow = {
          kind: "opening",
          id: "opening",
          rowKey: "opening",
          voucherId: null,
          date: dateFrom || "",
          voucherNo: "—",
          voucherType: "Opening Balance",
          particular: "Balance brought forward",
          particularLedgerId: null,
          narration: "—",
          reference: "—",
          status: "—",
          receipt: 0,
          payment: 0,
          runningBalance: summaryData.openingBalance,
          runningBalanceType: summaryData.openingBalanceType === "DEBIT" ? "Debit" : "Credit",
          voucherHref: null,
        };

        const transactionRows: CashBookDisplayRow[] = (res.rows || []).map((row) => ({
          kind: "transaction",
          id: row.id || row.lineId,
          rowKey: row.id || row.lineId,
          voucherId: row.voucherId,
          date: row.date,
          voucherType: row.voucherType,
          voucherNo: row.voucherNo,
          particular: row.particular,
          particularLedgerId: null,
          narration: row.narration || "—",
          reference: row.reference || "—",
          status: row.status,
          receipt: row.receipt,
          payment: row.payment,
          runningBalance: row.runningBalance,
          runningBalanceType: row.balanceType === "DEBIT" ? "Debit" : "Credit",
          voucherHref: `/accounts/vouchers?tab=${row.voucherType.toLowerCase()}&voucherId=${row.voucherId}`,
        }));

        setStatement({
          summary: {
            ledgerId: summaryData.cashLedgerId,
            ledgerName: summaryData.cashLedgerName,
            openingBalance: summaryData.openingBalance,
            openingBalanceType: summaryData.openingBalanceType === "DEBIT" ? "Debit" : "Credit",
            totalReceipts: summaryData.totalReceipts,
            totalPayments: summaryData.totalPayments,
            closingBalance: summaryData.closingBalance,
            closingBalanceType: summaryData.closingBalanceType === "DEBIT" ? "Debit" : "Credit",
          },
          openingRow,
          transactionRows,
          displayRows: [openingRow, ...transactionRows],
          pagination: res.pagination || {
            page,
            limit: pageSize,
            total: transactionRows.length,
            totalPages: 1,
          },
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const msg = err?.message || "Failed to load Cash Book data.";
        setError(msg);
        showToast(msg, "error");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    mounted,
    effectiveLedgerId,
    dateFrom,
    dateTo,
    voucherTypes,
    debouncedSearch,
    columnFilters,
    sortKey,
    sortDir,
    page,
    pageSize,
    financialYearId,
  ]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const items: ReportFilterSummaryItem[] = [];
    if (cashLedgerId && cashLedgerId !== "all") {
      const match = cashLedgers.find((l) => String(l.ledgerId) === String(cashLedgerId));
      items.push({
        id: "cashLedger",
        label: "Cash Ledger",
        value: match ? match.ledgerName : cashLedgerId,
        onRemove: () => setCashLedgerId(""),
      });
    }
    const voucherSummary = buildEntityFilterSummary(
      "voucherType",
      "Voucher Types",
      voucherTypes,
      voucherTypeOptions,
      () => setVoucherTypes([]),
    );
    if (voucherSummary) items.push(voucherSummary);
    return items;
  }, [cashLedgerId, cashLedgers, voucherTypes, voucherTypeOptions]);

  const summaryItems = statement
    ? [
        { label: "Cash Ledger", value: statement.summary.ledgerName || "All Cash Accounts" },
        {
          label: "Opening Cash Balance",
          value: formatBalanceAmount(
            statement.summary.openingBalance,
            statement.summary.openingBalanceType,
          ),
        },
        { label: "Total Cash Receipts", value: formatMoney(statement.summary.totalReceipts) },
        { label: "Total Cash Payments", value: formatMoney(statement.summary.totalPayments) },
        {
          label: "Closing Cash Balance",
          value: formatBalanceAmount(
            statement.summary.closingBalance,
            statement.summary.closingBalanceType,
          ),
        },
      ]
    : [];

  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const voucherTypeParam =
        voucherTypes.length > 0 && voucherTypes[0] !== "all"
          ? voucherTypes.join(",")
          : undefined;

      await CashBookApiService.exportExcel(
        {
          cashLedgerId: effectiveLedgerId,
          fromDate: dateFrom || undefined,
          toDate: dateTo || undefined,
          voucherType: voucherTypeParam,
          voucherNo: columnFilters.voucherNo,
          particular: columnFilters.particular,
          reference: columnFilters.reference,
          status: columnFilters.status,
          search: debouncedSearch.trim() || undefined,
          sortBy: sortKey,
          sortOrder: sortDir,
        },
        financialYearId
      );
      showToast("Cash Book exported to Excel successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to export Excel.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const voucherTypeParam =
        voucherTypes.length > 0 && voucherTypes[0] !== "all"
          ? voucherTypes.join(",")
          : undefined;

      await CashBookApiService.exportPdf(
        {
          cashLedgerId: effectiveLedgerId,
          fromDate: dateFrom || undefined,
          toDate: dateTo || undefined,
          voucherType: voucherTypeParam,
          voucherNo: columnFilters.voucherNo,
          particular: columnFilters.particular,
          reference: columnFilters.reference,
          status: columnFilters.status,
          search: debouncedSearch.trim() || undefined,
          sortBy: sortKey,
          sortOrder: sortDir,
        },
        financialYearId
      );
      showToast("Cash Book exported to PDF successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to export PDF.", "error");
    } finally {
      setExporting(false);
    }
  };

  const transactionRows = statement?.transactionRows ?? [];
  const totalRecords = statement?.pagination?.total ?? 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Cash Book")}
      title="Cash Book"
      description="Read-only cash ledger report from posted accounting vouchers."
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            end={
              <AccountsExportMenu
                onExcel={handleExportExcel}
                onPdf={handleExportPdf}
                disabled={exporting || loading || !statement}
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
            <ReportLedgerFilter
              label="Cash Ledger"
              placeholder="All Cash Ledgers"
              value={cashLedgerId}
              onChange={setCashLedgerId}
              ledgers={cashLedgerOptions}
              required={false}
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={voucherTypeOptions}
            />
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Voucher no., particular, narration…"
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0">
          {error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-2 max-w-sm">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-xs font-semibold text-foreground">
                  Failed to load Cash Book
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {statement && <AccountsSummaryBar items={summaryItems} />}

              {statement ? (
                <CashBookTable
                  openingRow={statement.openingRow}
                  transactionRows={transactionRows}
                  summary={statement.summary}
                  page={page}
                  pageSize={pageSize}
                  totalRecords={totalRecords}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onRemoveSort={handleRemoveSort}
                  filters={columnFilters}
                  onFilterChange={handleColumnFilterChange}
                  loading={loading}
                />
              ) : loading ? (
                <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">
                  Loading Cash Book transactions...
                </div>
              ) : null}
            </>
          )}
        </div>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}

export default function CashBookPageClient() {
  return (
    <Suspense fallback={null}>
      <CashBookPageContent />
    </Suspense>
  );
}
