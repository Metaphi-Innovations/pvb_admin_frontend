"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Download, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GeneralLedgerTransactionsTable } from "@/components/accounts/GeneralLedgerTransactionsTable";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import { useLedgerTransactionDateFilter } from "@/components/accounts/LedgerTransactionDateFilter";
import { Pagination } from "@/components/listing/Pagination";
import { EmptySearch } from "@/components/ui/EmptyState";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
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
import {
  buildGeneralLedgerHref,
  buildGeneralLedgerListing,
  buildGeneralLedgerStatement,
  getLedgerById,
  type GeneralLedgerListRow,
  type GeneralLedgerRow,
} from "@/lib/accounts/general-ledger-data";
import { ensureGeneralLedgerDemoOnPageLoad } from "@/lib/accounts/general-ledger-demo-seed";
import {
  exportLedgerStatementToExcel,
  exportLedgerStatementToPdf,
  type LedgerStatementExportMeta,
} from "@/lib/accounts/ledger-statement-export";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { useClientMounted } from "@/lib/use-client-mounted";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";

const SEARCH_PLACEHOLDER =
  "Search ledger name, ledger code, party name, voucher no...";

function formatGroupTrail(groupPath: string): string {
  if (!groupPath || groupPath === "—") return "";
  return groupPath.replace(/\s*›\s*/g, " > ");
}

function LedgerDetailHeader({
  ledgerName,
  ledgerCode,
  primaryHead,
  groupPath,
  openingBalance,
  openingBalanceType,
  totalDebit,
  totalCredit,
  closingBalance,
  closingBalanceType,
  onBack,
}: {
  ledgerName: string;
  ledgerCode: string;
  primaryHead: string;
  groupPath: string;
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
  onBack: () => void;
}) {
  const groupTrail = formatGroupTrail(groupPath);

  return (
    <div className="flex-shrink-0 w-full px-4 py-2 border-b border-border/60 bg-white">
      <div className="flex items-center justify-between gap-4 min-w-0 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Back to ledger list"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <h2 className="text-sm font-bold text-navy-700 truncate">{ledgerName}</h2>
        </div>

        <div className="flex items-center justify-end gap-x-2.5 flex-shrink-0 text-xs tabular-nums whitespace-nowrap">
          <span>
            <span className="text-muted-foreground">Opening: </span>
            <span className="font-semibold text-foreground">
              {formatBalanceAmount(openingBalance, openingBalanceType)}
            </span>
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="text-muted-foreground">Debit: </span>
            <span className="font-semibold text-foreground">{formatMoney(totalDebit)}</span>
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="text-muted-foreground">Credit: </span>
            <span className="font-semibold text-foreground">{formatMoney(totalCredit)}</span>
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="text-muted-foreground">Closing: </span>
            <span className="font-semibold text-foreground">
              {formatBalanceAmount(closingBalance, closingBalanceType)}
            </span>
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-0.5 pl-7 truncate" title={`${ledgerCode} • ${primaryHead}${groupTrail ? ` • ${groupTrail}` : ""}`}>
        <span className="font-mono font-semibold text-brand-700">{ledgerCode}</span>
        {" • "}
        {primaryHead}
        {groupTrail ? (
          <>
            {" • "}
            {groupTrail}
          </>
        ) : null}
      </p>
    </div>
  );
}

function ExportMenu({
  isDetailView,
  exporting,
  canExportDetail,
  canExportListing,
  onExportExcel,
  onExportPdf,
  onExportListingCsv,
}: {
  isDetailView: boolean;
  exporting: boolean;
  canExportDetail: boolean;
  canExportListing: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportListingCsv: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={exporting || (!canExportDetail && !canExportListing)}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {isDetailView ? (
          <>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={exporting || !canExportDetail}
              onClick={onExportExcel}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={!canExportDetail}
              onClick={onExportPdf}
            >
              <FileDown className="w-3.5 h-3.5" />
              Export to PDF
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            className="text-xs gap-2 cursor-pointer"
            disabled={!canExportListing}
            onClick={onExportListingCsv}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export to CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toExportRows(rows: GeneralLedgerRow[]): CoaTransactionRow[] {
  return rows.map((r) => ({
    ...r,
    narration: r.isOpeningRow
      ? r.narration
      : [r.contraLedger, r.narration].filter((v) => v && v !== "—").join(" — "),
  }));
}

function GeneralLedgerListingTable({
  rows,
  onSelect,
}: {
  rows: GeneralLedgerListRow[];
  onSelect: (ledgerId: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <p className="text-sm text-muted-foreground">No ledgers match your search.</p>
      </div>
    );
  }

  return (
    <AccountsTableScroll className="flex-1 min-h-0">
      <AccountsTable minWidth={1000}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {[
              "Ledger",
              "Code",
              "Primary Head",
              "Group Path",
              "Opening",
              "Debit",
              "Credit",
              "Closing",
            ].map((h, i) => (
              <AccountsTableHeadCell key={h} align={i >= 4 ? "right" : "left"}>
                {h}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <AccountsTableRow
              key={row.ledgerId}
              className="cursor-pointer group"
              onClick={() => onSelect(row.ledgerId)}
            >
              <AccountsTableCell>
                <span className="text-xs font-semibold text-brand-700 group-hover:underline">
                  {row.ledgerName}
                </span>
              </AccountsTableCell>
              <AccountsTableCell mono className="text-muted-foreground">
                {row.ledgerCode}
              </AccountsTableCell>
              <AccountsTableCell className="text-muted-foreground text-xs">
                {row.primaryHead}
              </AccountsTableCell>
              <AccountsTableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={row.groupPath}>
                {row.groupPath}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatBalanceAmount(row.openingBalance, row.openingBalanceType)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoney(row.totalDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money>
                {formatMoney(row.totalCredit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="font-medium">
                {formatBalanceAmount(row.closingBalance, row.closingBalanceType)}
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function GeneralLedgerPageContent() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const { applied, draft, setPreset, setDraftFrom, setDraftTo, apply } = useLedgerTransactionDateFilter({
    autoApply: true,
  });

  const ledgerIdParam = searchParams.get("ledger");
  const ledgerId = ledgerIdParam && /^\d+$/.test(ledgerIdParam) ? ledgerIdParam : "";
  const isDetailView = Boolean(ledgerId);

  useEffect(() => {
    ensureGeneralLedgerDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const ledger = useMemo(() => {
    if (!ledgerId) return null;
    void refreshKey;
    return getLedgerById(Number(ledgerId));
  }, [ledgerId, refreshKey]);

  const listing = useMemo(() => {
    if (!mounted || isDetailView) return [];
    void refreshKey;
    return buildGeneralLedgerListing({ from: applied.from, to: applied.to }, search);
  }, [mounted, isDetailView, applied.from, applied.to, search, refreshKey]);

  const statement = useMemo(() => {
    if (!ledger || !isDetailView) return null;
    void refreshKey;
    return buildGeneralLedgerStatement(ledger, { from: applied.from, to: applied.to }, { search });
  }, [ledger, isDetailView, applied.from, applied.to, search, refreshKey]);

  const paginatedListing = useMemo(() => {
    const start = (page - 1) * pageSize;
    return listing.slice(start, start + pageSize);
  }, [listing, page, pageSize]);

  const paginatedRows = useMemo(() => {
    if (!statement) return [];
    const start = (page - 1) * pageSize;
    return statement.rows.slice(start, start + pageSize);
  }, [statement, page, pageSize]);

  const records = useMemo(() => loadChartOfAccounts(), [refreshKey]);

  const exportMeta = useMemo((): LedgerStatementExportMeta | null => {
    if (!statement || !ledger) return null;
    const ledgerType = resolveLedgerType(ledger, records);
    return {
      ledgerName: statement.meta.ledgerName,
      ledgerCode: statement.meta.ledgerCode,
      ledgerType,
      parentGroup: statement.meta.groupPath,
      primaryHead: statement.meta.primaryHead,
      dateFrom: applied.from,
      dateTo: applied.to,
      totalDebit: statement.meta.totalDebit,
      totalCredit: statement.meta.totalCredit,
      closingBalance: statement.meta.closingBalance,
      closingBalanceType: statement.meta.closingBalanceType,
    };
  }, [statement, ledger, records, applied.from, applied.to]);

  const openLedger = useCallback(
    (id: number) => {
      setPage(1);
      router.push(buildGeneralLedgerHref(id));
    },
    [router],
  );

  const backToListing = useCallback(() => {
    setPage(1);
    router.push("/accounts/reports/ledger");
  }, [router]);

  useEffect(() => {
    setPageSize(isDetailView ? 50 : 25);
    setPage(1);
  }, [isDetailView]);

  const exportListingCsv = () => {
    const header =
      "Ledger,Code,Primary Head,Group Path,Opening,Debit,Credit,Closing\n";
    const body = listing
      .map((r) =>
        [
          r.ledgerName,
          r.ledgerCode,
          r.primaryHead,
          r.groupPath,
          formatBalanceAmount(r.openingBalance, r.openingBalanceType),
          formatMoney(r.totalDebit),
          formatMoney(r.totalCredit),
          formatBalanceAmount(r.closingBalance, r.closingBalanceType),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "general-ledger-listing.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    if (!statement || !exportMeta) return;
    setExporting(true);
    try {
      await exportLedgerStatementToExcel(toExportRows(statement.rows), exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement || !exportMeta) return;
    exportLedgerStatementToPdf(toExportRows(statement.rows), exportMeta);
  };

  const canExportDetail = Boolean(statement?.rows.length);
  const canExportListing = !isDetailView && listing.length > 0;

  const { openTransaction, drawer: transactionDrawer } = useTransactionDetailsDrawer();

  const handleTransactionClick = useCallback(
    (row: GeneralLedgerRow) => {
      openTransaction({ type: "general_ledger", row });
    },
    [openTransaction],
  );

  useEffect(() => {
    setPage(1);
  }, [search, applied.from, applied.to, ledgerId, pageSize]);

  const exportMenu = (
    <ExportMenu
      isDetailView={isDetailView}
      exporting={exporting}
      canExportDetail={canExportDetail}
      canExportListing={canExportListing}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPdf}
      onExportListingCsv={exportListingCsv}
    />
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "General Ledger")}
      title="General Ledger"
      description={
        isDetailView ? "" : "Select a ledger to view its full posting history and running balance."
      }
      filters={
        <ReportFilterRow className="items-end">
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder={SEARCH_PLACEHOLDER}
            className="min-w-[280px] flex-[2]"
          />
          <ReportDateRangeFilter
            preset={draft.preset}
            dateFrom={draft.from}
            dateTo={draft.to}
            onPresetChange={setPreset}
            onDateFromChange={setDraftFrom}
            onDateToChange={setDraftTo}
          />
          {draft.preset === "custom" && (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white px-3"
              onClick={apply}
            >
              Apply
            </Button>
          )}
          {exportMenu}
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!isDetailView ? (
          <>
            <div className="flex-shrink-0 px-4 py-2.5 border-b border-border/60 bg-muted/10 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">{listing.length}</span> posting
                ledgers
                {search.trim() ? " matching search" : ""}
              </p>
            </div>
            {listing.length === 0 ? (
              <EmptySearch onClear={search.trim() ? () => setSearch("") : undefined} />
            ) : (
              <GeneralLedgerListingTable rows={paginatedListing} onSelect={openLedger} />
            )}
            {listing.length > 0 && (
              <div className="flex-shrink-0 border-t border-border">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalRecords={listing.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  recordLabel="ledgers"
                />
              </div>
            )}
          </>
        ) : ledger && statement ? (
          <>
            <LedgerDetailHeader
              ledgerName={statement.meta.ledgerName}
              ledgerCode={statement.meta.ledgerCode}
              primaryHead={statement.meta.primaryHead}
              groupPath={statement.meta.groupPath}
              openingBalance={statement.meta.openingBalance}
              openingBalanceType={statement.meta.openingBalanceType}
              totalDebit={statement.meta.totalDebit}
              totalCredit={statement.meta.totalCredit}
              closingBalance={statement.meta.closingBalance}
              closingBalanceType={statement.meta.closingBalanceType}
              onBack={backToListing}
            />

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {statement.rows.length === 0 ? (
                <EmptySearch onClear={search.trim() ? () => setSearch("") : undefined} />
              ) : (
                <GeneralLedgerTransactionsTable
                  rows={paginatedRows}
                  onRowClick={handleTransactionClick}
                />
              )}
            </div>

            {statement.rows.length > 0 && (
              <div className="flex-shrink-0 border-t border-border">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalRecords={statement.rows.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  recordLabel="transactions"
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">Ledger not found</p>
              <Button variant="outline" size="sm" className="h-8 text-xs mt-2" onClick={backToListing}>
                Back to ledger list
              </Button>
            </div>
          </div>
        )}
      </div>
      {transactionDrawer}
    </AccountsPageShell>
  );
}

function GeneralLedgerFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "General Ledger")}
      title="General Ledger"
      description="Select a ledger to view its full posting history and running balance."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading General Ledger…
      </div>
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
