"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileWarning,
  History,
  MoreVertical,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { AccountsColumnHeader } from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  formatMoneyString,
  MONEY_AMOUNT_CLASS,
} from "@/lib/accounts/money-format";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr2aImportDto,
  Gstr2aMatchStatusApi,
  Gstr2aPortalRecordDto,
  Gstr2aReconCombinedRowDto,
  Gstr2aReconSummaryDto,
  Gstr2aReconciliationListResult,
  Gstr2aReviewStatusApi,
} from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../useGstSummaryApiFilters";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { Gstr2bFilterBar } from "./components/Gstr2bFilterBar";
import { Gstr2aComparisonSheet } from "../gstr2a/components/Gstr2aComparisonSheet";
import { Gstr2aCandidateMatchDrawer } from "../gstr2a/components/Gstr2aCandidateMatchDrawer";
import {
  Gstr2aReasonDialog,
  type Gstr2aReasonMode,
} from "../gstr2a/components/Gstr2aReasonDialog";
import {
  GSTR2B_MATCH_STATUS_LABELS,
  GSTR2B_REVIEW_STATUS_LABELS,
  formatPortalItcLabel,
  formatPvbItcLabel,
} from "./gstr2b-report-types";
import { Gstr2bItcTreatmentDialog } from "./components/Gstr2bItcTreatmentDialog";

const MATCH_STATUS_OPTIONS: Array<Gstr2aMatchStatusApi | "all"> = [
  "all",
  "MATCHED",
  "PARTIAL_MATCH",
  "MISSING_IN_BOOKS",
  "MISSING_IN_GSTR",
  "DUPLICATE",
  "NEEDS_REVIEW",
];

const REVIEW_STATUS_OPTIONS: Array<Gstr2aReviewStatusApi | "all"> = [
  "all",
  "PENDING",
  "MARKED_FOR_REVIEW",
  "REVIEWED",
  "RESOLVED",
];

const STATUS_PILL: Record<
  Gstr2aMatchStatusApi,
  { bg: string; text: string; dot: string }
> = {
  MATCHED: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  PARTIAL_MATCH: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  MISSING_IN_GSTR: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
  },
  MISSING_IN_BOOKS: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  DUPLICATE: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  NEEDS_REVIEW: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatReturnPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const mi = Number(month) - 1;
  if (!year || mi < 0 || mi > 11) return period;
  return `${MONTH_SHORT[mi]}-${year}`;
}

function formatImportDateTime(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso.slice(0, 16).replace("T", " ");
  const [, yyyy, mm, dd, hh, min] = m;
  const mon = MONTH_SHORT[Number(mm) - 1] ?? mm;
  let hours = Number(hh);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${dd}-${mon}-${yyyy} ${String(hours).padStart(2, "0")}:${min} ${ampm}`;
}

function StatusPill({ status }: { status: Gstr2aMatchStatusApi }) {
  const cfg = STATUS_PILL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {GSTR2B_MATCH_STATUS_LABELS[status]}
    </span>
  );
}

function SummaryCards({ summary }: { summary: Gstr2aReconSummaryDto }) {
  const cards = [
    {
      label: "Total Records",
      value: summary.total,
      icon: Search,
      border: "border-l-navy-600",
      iconBg: "bg-navy-50",
      iconColor: "text-navy-600",
      isMoney: false,
    },
    {
      label: "Matched",
      value: summary.matched,
      icon: CheckCircle2,
      border: "border-l-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      isMoney: false,
    },
    {
      label: "Partial Match",
      value: summary.partial_match,
      icon: AlertCircle,
      border: "border-l-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      isMoney: false,
    },
    {
      label: "Missing in Books",
      value: summary.missing_in_books,
      icon: FileWarning,
      border: "border-l-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      isMoney: false,
    },
    {
      label: "Missing in GSTR-2B",
      value: summary.missing_in_gstr,
      icon: FileWarning,
      border: "border-l-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      isMoney: false,
    },
    {
      label: "Duplicate",
      value: summary.duplicate,
      icon: Copy,
      border: "border-l-orange-500",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      isMoney: false,
    },
    {
      label: "Needs Review",
      value: summary.needs_review,
      icon: Eye,
      border: "border-l-sky-500",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
      isMoney: false,
    },
  ];

  const itcCards = [
    {
      label: "2B ITC Available",
      value: summary.portal_itc_available_amount,
      sub: summary.portal_itc_available_count,
    },
    {
      label: "2B ITC Not Available",
      value: summary.portal_itc_not_available_amount,
      sub: summary.portal_itc_not_available_count,
    },
    { label: "To Review", value: summary.pvb_to_review_amount },
    {
      label: "Eligible to Claim",
      value: summary.pvb_eligible_to_claim_amount,
    },
    { label: "Hold", value: summary.pvb_hold_amount },
    { label: "Ineligible", value: summary.pvb_ineligible_amount },
    {
      label: "Reversal Required",
      value: summary.pvb_reversal_required_amount,
    },
    { label: "Claimed", value: summary.pvb_claimed_amount },
  ].filter((c) => c.value != null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                "bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm border-l-4",
                card.border,
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  card.iconBg,
                )}
              >
                <Icon className={cn("w-4 h-4", card.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground leading-none">
                  {card.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {itcCards.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            ITC Summary
            {summary.claim_amount_basis
              ? ` · basis: ${summary.claim_amount_basis}`
              : ""}
          </p>
          {summary.itc_amount_notes ? (
            <p className="text-[10px] text-muted-foreground">
              {summary.itc_amount_notes}
            </p>
          ) : null}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {itcCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-border p-2.5 shadow-sm"
              >
                <p
                  className={cn(
                    "text-sm font-bold text-foreground leading-none tabular-nums",
                    MONEY_AMOUNT_CLASS,
                  )}
                >
                  {formatMoneyString(String(card.value))}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight truncate">
                  {card.label}
                  {"sub" in card && card.sub != null ? ` (${card.sub})` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LastImportedLabel({
  importMeta,
  detail,
}: {
  importMeta: NonNullable<Gstr2aReconciliationListResult["import"]>;
  detail?: Gstr2aImportDto | null;
}) {
  return (
    <div className="hidden sm:flex flex-col justify-center leading-tight px-2 border-l border-border min-w-0 max-w-[16rem]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Last Imported · GSTR-2B
      </p>
      <p className="text-[11px] text-foreground truncate">
        {formatReturnPeriodLabel(importMeta.return_period)} ·{" "}
        {importMeta.gstin}
        {detail?.total_records != null
          ? ` · ${detail.total_records} Records`
          : ""}{" "}
        · v{importMeta.version_no}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">
        {detail?.original_file_name
          ? `${detail.original_file_name} · `
          : ""}
        {detail?.imported_at
          ? formatImportDateTime(detail.imported_at)
          : importMeta.is_current
            ? "Current"
            : "Historical"}{" "}
        · {importMeta.import_status}
      </p>
    </div>
  );
}

function blankCell(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return value;
}

function displayOrBlank(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return value;
}

function moneyOrBlank(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return formatMoneyString(value);
}

function hasDiff(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) > 0;
}

export default function Gstr2bPageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    financialYearId,
    gstPeriod,
    gstRegistration,
    filtersLoading,
    filtersError,
  } = filterState;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [runningRecon, setRunningRecon] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [matchStatusFilter, setMatchStatusFilter] = useState<
    Gstr2aMatchStatusApi | "all"
  >("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<
    Gstr2aReviewStatusApi | "all"
  >("all");
  const [supplierGstinFilter, setSupplierGstinFilter] = useState("");
  const [documentNumberFilter, setDocumentNumberFilter] = useState("");
  const [supplierGstinApplied, setSupplierGstinApplied] = useState("");
  const [documentNumberApplied, setDocumentNumberApplied] = useState("");

  const [recon, setRecon] = useState<Gstr2aReconciliationListResult | null>(
    null,
  );
  const [imports, setImports] = useState<Gstr2aImportDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [compareRow, setCompareRow] = useState<Gstr2aReconCombinedRowDto | null>(
    null,
  );
  const [candidateRow, setCandidateRow] =
    useState<Gstr2aReconCombinedRowDto | null>(null);
  const [candidateMode, setCandidateMode] = useState<"find" | "change">("find");
  const [reasonRow, setReasonRow] = useState<Gstr2aReconCombinedRowDto | null>(
    null,
  );
  const [reasonMode, setReasonMode] = useState<Gstr2aReasonMode | null>(null);
  const [itcRow, setItcRow] = useState<Gstr2aReconCombinedRowDto | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<Gstr2aImportDto | null>(
    null,
  );
  /** When set, reconciliation loads this import (supports historical/superseded). */
  const [viewImportId, setViewImportId] = useState<string | null>(null);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalImportId, setPortalImportId] = useState<string | null>(null);
  const [portalRows, setPortalRows] = useState<Gstr2aPortalRecordDto[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [rerunConfirmOpen, setRerunConfirmOpen] = useState(false);

  const scopeReady =
    !!financialYearId &&
    gstPeriod !== "all" &&
    gstRegistration !== "all";

  useEffect(() => {
    setPage(1);
    setViewImportId(null);
  }, [financialYearId, gstPeriod, gstRegistration]);

  useEffect(() => {
    setPage(1);
  }, [
    matchStatusFilter,
    reviewStatusFilter,
    viewImportId,
    supplierGstinApplied,
    documentNumberApplied,
  ]);

  useEffect(() => {
    if (!scopeReady || !datesReady) {
      setRecon(null);
      setImports([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const base = {
      financial_year_id: financialYearId,
      gstin: gstRegistration,
      return_period: gstPeriod,
    };
    void Promise.all([
      GstSummaryApiService.getGstr2bReconciliation(
        {
          ...base,
          import_id: viewImportId ?? undefined,
          match_status:
            matchStatusFilter !== "all" ? matchStatusFilter : undefined,
          review_status:
            reviewStatusFilter !== "all" ? reviewStatusFilter : undefined,
          supplier_gstin: supplierGstinApplied || undefined,
          document_number: documentNumberApplied || undefined,
          page,
          page_size: pageSize,
        },
        controller.signal,
      ),
      GstSummaryApiService.getGstr2bImports(
        { ...base, page: 1, page_size: 50 },
        controller.signal,
      ),
    ])
      .then(([reconResult, importsResult]) => {
        setRecon(reconResult);
        setImports(importsResult.rows);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load GSTR-2B reconciliation.";
        setError(message);
        setRecon(null);
        setImports([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [
    scopeReady,
    datesReady,
    financialYearId,
    gstPeriod,
    gstRegistration,
    matchStatusFilter,
    reviewStatusFilter,
    supplierGstinApplied,
    documentNumberApplied,
    page,
    pageSize,
    refreshKey,
    viewImportId,
  ]);

  const currentImport = useMemo(() => {
    if (recon?.import) {
      const fromList = imports.find(
        (row) => row.import_id === recon.import?.import_id,
      );
      return fromList ?? null;
    }
    return imports.find((row) => row.is_current) ?? null;
  }, [recon?.import, imports]);

  const isCurrent =
    recon?.import?.is_current === true && !recon.read_only_historical;
  const mutationsEnabled = isCurrent;

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleUpload = async (file: File) => {
    if (!scopeReady) {
      showToast("Select GSTIN and Return Period before uploading.", "error");
      return;
    }
    setUploading(true);
    try {
      const result = await GstSummaryApiService.uploadGstr2b({
        financial_year_id: financialYearId,
        gstin: gstRegistration,
        return_period: gstPeriod,
        file,
      });
      if (result.duplicate_file) {
        showToast(
          "Duplicate GSTR-2B file — no new portal records stored.",
          "info",
        );
      } else {
        showToast("GSTR-2B import completed successfully.", "success");
      }
      if (result.reconciliation && result.reconciliation.ok === false) {
        showToast(
          result.reconciliation.error ||
            "Import saved but reconciliation reported an error.",
          "error",
        );
      }
      refresh();
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError
          ? err.message
          : "Failed to upload GSTR-2B JSON.";
      showToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRerun = async () => {
    if (!scopeReady) return;
    setRunningRecon(true);
    try {
      const result = await GstSummaryApiService.runGstr2bReconciliation({
        financial_year_id: financialYearId,
        gstin: gstRegistration,
        return_period: gstPeriod,
      });
      showToast(
        result.carry_forward_note ||
          "GSTR-2B reconciliation completed successfully.",
        "success",
      );
      setRerunConfirmOpen(false);
      refresh();
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError
          ? err.message
          : "Failed to run reconciliation.";
      showToast(message, "error");
    } finally {
      setRunningRecon(false);
    }
  };

  const openReason = (
    row: Gstr2aReconCombinedRowDto,
    mode: Gstr2aReasonMode,
  ) => {
    setReasonRow(row);
    setReasonMode(mode);
  };

  const handleReasonConfirm = async (text: string) => {
    if (!reasonRow || !reasonMode) return;
    setActionSubmitting(true);
    try {
      const id = reasonRow.reconciliation_item_id;
      if (reasonMode === "accept") {
        await GstSummaryApiService.acceptGstr2bMatch(id, { reason: text });
      } else if (reasonMode === "unmatch") {
        await GstSummaryApiService.unmatchGstr2bInvoice(id, { reason: text });
      } else if (reasonMode === "resolve") {
        await GstSummaryApiService.resolveGstr2bReview(id, { reason: text });
      } else if (reasonMode === "remark") {
        await GstSummaryApiService.saveGstr2bRemark(id, { remark: text });
      } else if (reasonMode === "mark_review") {
        await GstSummaryApiService.markGstr2bReview(id, {
          review_status: "MARKED_FOR_REVIEW",
          reason: text || undefined,
        });
      } else if (reasonMode === "mark_reviewed") {
        await GstSummaryApiService.markGstr2bReview(id, {
          review_status: "REVIEWED",
          reason: text || undefined,
        });
      }
      showToast("Saved successfully.", "success");
      setReasonMode(null);
      setReasonRow(null);
      refresh();
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError ? err.message : "Action failed.";
      showToast(message, "error");
    } finally {
      setActionSubmitting(false);
    }
  };

  const openPortalRecords = async (importId: string) => {
    setPortalImportId(importId);
    setPortalOpen(true);
    setPortalLoading(true);
    setPortalError(null);
    try {
      const result = await GstSummaryApiService.getGstr2bPortalRecords({
        import_id: importId,
        page: 1,
        page_size: 100,
      });
      setPortalRows(result.rows);
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError
          ? err.message
          : "Failed to load imported records.";
      setPortalError(message);
      setPortalRows([]);
    } finally {
      setPortalLoading(false);
    }
  };

  const downloadImport = async (importId: string) => {
    try {
      await GstSummaryApiService.downloadGstr2bImportFile(
        importId,
        financialYearId,
      );
    } catch (err) {
      const message =
        err instanceof GstSummaryApiError
          ? err.message
          : "Failed to download file.";
      showToast(message, "error");
    }
  };

  const uploadInput = (
    <input
      ref={fileRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleUpload(file);
        e.target.value = "";
      }}
    />
  );

  const showLoading =
    !mounted ||
    filtersLoading ||
    !datesReady ||
    (scopeReady && loading && !recon);

  const shellActions = (
    <div className="flex items-center gap-2">
      {uploadInput}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        disabled={uploading || !scopeReady}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? "Uploading…" : "Upload GSTR-2B JSON"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        disabled={!scopeReady}
        onClick={() => setHistoryOpen(true)}
      >
        <History className="w-3.5 h-3.5" />
        Import History
      </Button>
      {isCurrent && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={runningRecon}
          onClick={() => setRerunConfirmOpen(true)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run Reconciliation
        </Button>
      )}
      {recon?.import && (
        <LastImportedLabel
          importMeta={recon.import}
          detail={currentImport}
        />
      )}
    </div>
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(
        "Reports",
        "GST Summary",
        "GSTR-2B Reconciliation",
      )}
      title="GSTR-2B Reconciliation"
      description="Reconcile purchase invoices with uploaded GSTR-2B portal data."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={shellActions}
      filters={<Gstr2bFilterBar filterState={filterState} mounted={mounted} />}
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-3 pb-4">
          {filtersError || error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-xs text-red-700">
              {filtersError || error}
            </div>
          ) : !scopeReady ? (
            <div className="flex flex-col items-center gap-1 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                Select GSTIN and Return Period
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Choose a GST registration and GST period to load GSTR-2B
                reconciliation for that scope.
              </p>
            </div>
          ) : showLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GSTR-2B reconciliation…
            </div>
          ) : recon?.no_current_import || !recon?.import ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No GSTR-2B imported for this GSTIN/period.
              </p>
              <p className="text-xs text-muted-foreground">
                Upload GSTR-2B JSON to begin ITC reconciliation.
              </p>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white mt-1"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload GSTR-2B JSON
              </Button>
            </div>
          ) : (
            <>
              {recon.read_only_historical && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800 flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    Viewing a historical / superseded import (v
                    {recon.import?.version_no}) — mutations are disabled.
                  </span>
                  {viewImportId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => setViewImportId(null)}
                    >
                      Back to current import
                    </Button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Match Status
                  </label>
                  <Select
                    value={matchStatusFilter}
                    onValueChange={(v) =>
                      setMatchStatusFilter(v as Gstr2aMatchStatusApi | "all")
                    }
                  >
                    <SelectTrigger className="h-8 w-[11rem] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt === "all"
                            ? "All statuses"
                            : GSTR2B_MATCH_STATUS_LABELS[opt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Review Status
                  </label>
                  <Select
                    value={reviewStatusFilter}
                    onValueChange={(v) =>
                      setReviewStatusFilter(v as Gstr2aReviewStatusApi | "all")
                    }
                  >
                    <SelectTrigger className="h-8 w-[11rem] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt === "all"
                            ? "All reviews"
                            : GSTR2B_REVIEW_STATUS_LABELS[opt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Supplier GSTIN
                  </label>
                  <input
                    className="h-8 w-[10rem] rounded-md border border-input bg-background px-2 text-xs"
                    value={supplierGstinFilter}
                    onChange={(e) => setSupplierGstinFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSupplierGstinApplied(supplierGstinFilter.trim());
                      }
                    }}
                    placeholder="Filter GSTIN"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Document No.
                  </label>
                  <input
                    className="h-8 w-[10rem] rounded-md border border-input bg-background px-2 text-xs"
                    value={documentNumberFilter}
                    onChange={(e) => setDocumentNumberFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setDocumentNumberApplied(documentNumberFilter.trim());
                      }
                    }}
                    placeholder="Invoice / doc no."
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSupplierGstinApplied(supplierGstinFilter.trim());
                    setDocumentNumberApplied(documentNumberFilter.trim());
                  }}
                >
                  Apply
                </Button>
              </div>

              {recon.summary && <SummaryCards summary={recon.summary} />}

              <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
                <AccountsTableScroll className="flex-1 min-h-0">
                  <AccountsTable minWidth={1480}>
                    <AccountsTableHead>
                      <AccountsTableHeadRow>
                        <AccountsColumnHeader
                          label="Supplier"
                          colKey="supplier"
                          sortable={false}
                          filterable={false}
                          className="min-w-[9rem]"
                        />
                        <AccountsColumnHeader
                          label="Supplier GSTIN"
                          colKey="gstin"
                          sortable={false}
                          filterable={false}
                          className="min-w-[8rem]"
                        />
                        <AccountsColumnHeader
                          label="Books Invoice No."
                          colKey="books_inv"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="Portal Invoice No."
                          colKey="portal_inv"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="Books Date"
                          colKey="books_date"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="Portal Date"
                          colKey="portal_date"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="Books Taxable"
                          colKey="books_tax"
                          sortable={false}
                          filterable={false}
                          align="right"
                        />
                        <AccountsColumnHeader
                          label="Portal Taxable"
                          colKey="portal_tax"
                          sortable={false}
                          filterable={false}
                          align="right"
                        />
                        <AccountsColumnHeader
                          label="Books GST"
                          colKey="books_gst"
                          sortable={false}
                          filterable={false}
                          align="right"
                        />
                        <AccountsColumnHeader
                          label="Portal GST"
                          colKey="portal_gst"
                          sortable={false}
                          filterable={false}
                          align="right"
                        />
                        <AccountsColumnHeader
                          label="Taxable Diff"
                          colKey="tax_diff"
                          sortable={false}
                          filterable={false}
                          align="right"
                        />
                        <AccountsColumnHeader
                          label="GST Diff"
                          colKey="gst_diff"
                          sortable={false}
                          filterable={false}
                          align="right"
                        />
                        <AccountsColumnHeader
                          label="Reconciliation Status"
                          colKey="match"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="2B ITC Status"
                          colKey="portal_itc"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="PVB ITC Treatment"
                          colKey="pvb_itc"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="Review Status"
                          colKey="review"
                          sortable={false}
                          filterable={false}
                        />
                        <AccountsColumnHeader
                          label="Remarks"
                          colKey="remarks"
                          sortable={false}
                          filterable={false}
                          className="min-w-[8rem]"
                        />
                        <AccountsColumnHeader
                          label="Action"
                          colKey="_actions"
                          sortable={false}
                          filterable={false}
                          className="w-24"
                        />
                      </AccountsTableHeadRow>
                    </AccountsTableHead>
                    <AccountsTableBody>
                      {recon.rows.length === 0 ? (
                        <AccountsTableRow>
                          <AccountsTableCell
                            colSpan={18}
                            className="accounts-table-empty"
                          >
                            <div className="flex flex-col items-center gap-1 py-4">
                              <p className="text-sm text-muted-foreground">
                                No reconciliation records for the selected
                                filters.
                              </p>
                            </div>
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ) : (
                        recon.rows.map((row) => {
                          const taxableMismatch = hasDiff(
                            row.differences.taxable_difference,
                          );
                          const gstMismatch = hasDiff(
                            row.differences.gst_difference,
                          );
                          const dateMismatch = row.differences.date_mismatch;
                          const supplierName =
                            row.supplier.books_supplier_name ||
                            row.supplier.portal_supplier_name ||
                            "";
                          return (
                            <AccountsTableRow
                              key={row.reconciliation_item_id}
                              className="group"
                            >
                              <AccountsTableCell className="text-xs font-medium">
                                {supplierName}
                              </AccountsTableCell>
                              <AccountsTableCell className="text-xs font-mono text-brand-700">
                                {displayOrBlank(row.supplier.supplier_gstin)}
                              </AccountsTableCell>
                              <AccountsTableCell className="text-xs font-mono">
                                {row.books?.purchase_invoice_id ? (
                                  <Link
                                    href={`/accounts/purchase-invoices/${row.books.purchase_invoice_id}`}
                                    className="text-brand-700 hover:underline font-semibold"
                                  >
                                    {blankCell(row.books.books_invoice_number)}
                                  </Link>
                                ) : (
                                  blankCell(row.books?.books_invoice_number)
                                )}
                              </AccountsTableCell>
                              <AccountsTableCell className="text-xs font-mono">
                                {blankCell(row.portal?.portal_invoice_number)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                className={cn(
                                  "text-xs tabular-nums",
                                  dateMismatch &&
                                    "text-amber-700 font-semibold",
                                )}
                              >
                                {blankCell(row.books?.books_invoice_date)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                className={cn(
                                  "text-xs tabular-nums",
                                  dateMismatch &&
                                    "text-amber-700 font-semibold",
                                )}
                              >
                                {blankCell(row.portal?.portal_invoice_date)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                align="right"
                                money
                                className={cn(
                                  "text-xs",
                                  MONEY_AMOUNT_CLASS,
                                  taxableMismatch &&
                                    "text-amber-700 font-semibold",
                                )}
                              >
                                {moneyOrBlank(row.books?.books_taxable)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                align="right"
                                money
                                className={cn(
                                  "text-xs",
                                  MONEY_AMOUNT_CLASS,
                                  taxableMismatch &&
                                    "text-amber-700 font-semibold",
                                )}
                              >
                                {moneyOrBlank(row.portal?.portal_taxable)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                align="right"
                                money
                                className={cn(
                                  "text-xs",
                                  MONEY_AMOUNT_CLASS,
                                  gstMismatch && "text-red-600 font-semibold",
                                )}
                              >
                                {moneyOrBlank(row.books?.books_gst)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                align="right"
                                money
                                className={cn(
                                  "text-xs",
                                  MONEY_AMOUNT_CLASS,
                                  gstMismatch && "text-red-600 font-semibold",
                                )}
                              >
                                {moneyOrBlank(row.portal?.portal_gst)}
                              </AccountsTableCell>
                              <AccountsTableCell
                                align="right"
                                money
                                className={cn(
                                  "text-xs",
                                  MONEY_AMOUNT_CLASS,
                                  taxableMismatch &&
                                    "text-amber-700 font-semibold",
                                )}
                              >
                                {moneyOrBlank(
                                  row.differences.taxable_difference,
                                )}
                              </AccountsTableCell>
                              <AccountsTableCell
                                align="right"
                                money
                                className={cn(
                                  "text-xs",
                                  MONEY_AMOUNT_CLASS,
                                  gstMismatch && "text-red-600 font-semibold",
                                )}
                              >
                                {moneyOrBlank(row.differences.gst_difference)}
                              </AccountsTableCell>
                              <AccountsTableCell>
                                <StatusPill status={row.status.match_status} />
                              </AccountsTableCell>
                              <AccountsTableCell
                                className="text-[11px] whitespace-nowrap"
                                title={
                                  row.portal_itc_unavailable_reason ??
                                  undefined
                                }
                              >
                                {formatPortalItcLabel(
                                  row.portal_itc_availability,
                                )}
                              </AccountsTableCell>
                              <AccountsTableCell className="text-[11px] whitespace-nowrap">
                                {formatPvbItcLabel(row.pvb_itc_treatment)}
                              </AccountsTableCell>
                              <AccountsTableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {
                                  GSTR2B_REVIEW_STATUS_LABELS[
                                    row.status.review_status
                                  ]
                                }
                              </AccountsTableCell>
                              <AccountsTableCell className="text-[11px] text-muted-foreground max-w-[12rem] truncate">
                                {row.workflow.remarks || ""}
                              </AccountsTableCell>
                              <AccountsTableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[11px] gap-1"
                                    onClick={() => setCompareRow(row)}
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                  <RowActionsMenu
                                    row={row}
                                    mutationsEnabled={mutationsEnabled}
                                    onCompare={() => setCompareRow(row)}
                                    onFindMatch={() => {
                                      setCandidateMode("find");
                                      setCandidateRow(row);
                                    }}
                                    onChangeMatch={() => {
                                      setCandidateMode("change");
                                      setCandidateRow(row);
                                    }}
                                    onReason={openReason}
                                    onItcTreatment={() => setItcRow(row)}
                                  />
                                </div>
                              </AccountsTableCell>
                            </AccountsTableRow>
                          );
                        })
                      )}
                    </AccountsTableBody>
                  </AccountsTable>
                </AccountsTableScroll>
                <AccountsTablePagination
                  page={recon.pagination.page}
                  pageSize={recon.pagination.page_size}
                  totalRecords={recon.pagination.total_rows}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </AccountsListingTableCard>
            </>
          )}
        </AccountsReportBody>
      </div>

      <Gstr2aComparisonSheet
        open={compareRow != null}
        onClose={() => setCompareRow(null)}
        row={compareRow}
        variant="gstr2b"
      />

      <Gstr2aCandidateMatchDrawer
        open={candidateRow != null}
        onClose={() => setCandidateRow(null)}
        row={candidateRow}
        mode={candidateMode}
        onMatched={refresh}
        variant="gstr2b"
      />

      <Gstr2bItcTreatmentDialog
        open={itcRow != null}
        row={itcRow}
        onClose={() => setItcRow(null)}
        onSaved={refresh}
      />

      <Gstr2aReasonDialog
        open={reasonMode != null}
        mode={reasonMode}
        subtitle={
          reasonRow
            ? `${reasonRow.supplier.books_supplier_name || reasonRow.supplier.portal_supplier_name || "—"} · ${reasonRow.books?.books_invoice_number || reasonRow.portal?.portal_invoice_number || ""}`
            : undefined
        }
        submitting={actionSubmitting}
        onClose={() => {
          setReasonMode(null);
          setReasonRow(null);
        }}
        onConfirm={(text) => void handleReasonConfirm(text)}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Import History</DialogTitle>
            <DialogDescription className="text-xs">
              Historical imports are read-only. Superseded versions cannot be
              mutated.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[24rem] overflow-y-auto space-y-2">
            {imports.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No imports for this GSTIN/period.
              </p>
            ) : (
              imports.map((imp) => (
                <div
                  key={imp.import_id}
                  className="rounded-xl border border-border p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-foreground">
                        v{imp.version_no} ·{" "}
                        {formatReturnPeriodLabel(imp.return_period)}
                      </p>
                      {imp.is_current ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          Current
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          Superseded
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {imp.original_file_name || "—"} · {imp.source} ·{" "}
                      {imp.total_records} records ·{" "}
                      {formatImportDateTime(imp.imported_at)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Status: {imp.import_status} · processed{" "}
                      {imp.processed_records} · invalid {imp.invalid_records} ·
                      duplicates {imp.duplicate_records}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => setHistoryDetail(imp)}
                    >
                      View Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        setViewImportId(imp.import_id);
                        setHistoryOpen(false);
                      }}
                    >
                      View Reconciliation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => void openPortalRecords(imp.import_id)}
                    >
                      View Imported Records
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => void downloadImport(imp.import_id)}
                    >
                      <Download className="w-3 h-3" />
                      Download Original
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyDetail != null}
        onOpenChange={(o) => !o && setHistoryDetail(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Import Detail</DialogTitle>
          </DialogHeader>
          {historyDetail && (
            <div className="space-y-1.5 text-xs">
              <p>
                <span className="text-muted-foreground">File:</span>{" "}
                {historyDetail.original_file_name || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">GSTIN:</span>{" "}
                {historyDetail.gstin}
              </p>
              <p>
                <span className="text-muted-foreground">Period:</span>{" "}
                {historyDetail.return_period}
              </p>
              <p>
                <span className="text-muted-foreground">Version:</span>{" "}
                {historyDetail.version_no}
                {!historyDetail.is_current && " (superseded)"}
              </p>
              <p>
                <span className="text-muted-foreground">Imported:</span>{" "}
                {formatImportDateTime(historyDetail.imported_at)}
              </p>
              <p>
                <span className="text-muted-foreground">Records:</span>{" "}
                {historyDetail.total_records} processed /{" "}
                {historyDetail.processed_records} · invalid{" "}
                {historyDetail.invalid_records}
              </p>
              {historyDetail.error_message && (
                <p className="text-red-600">{historyDetail.error_message}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={portalOpen} onOpenChange={setPortalOpen}>
        <SheetContent className="max-w-[min(52vw,720px)] w-full">
          <SheetHeader>
            <SheetTitle>GSTR-2B Imported Records</SheetTitle>
            <SheetDescription>
              Portal documents from import {portalImportId?.slice(0, 8)}…
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-2">
            {portalLoading && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Loading records…
              </p>
            )}
            {portalError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {portalError}
              </div>
            )}
            {!portalLoading && !portalError && portalRows.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No portal records in this import.
              </p>
            )}
            {portalRows.map((rec) => (
              <div
                key={rec.record_id}
                className="rounded-lg border border-border px-3 py-2 space-y-0.5"
              >
                <p className="text-xs font-semibold text-foreground">
                  {rec.supplier_trade_name ||
                    rec.supplier_legal_name ||
                    "—"}{" "}
                  · {rec.document_number || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {rec.supplier_gstin || "—"} · {rec.document_date || "—"} ·{" "}
                  {rec.document_category}
                </p>
                <p className="text-[11px] tabular-nums">
                  Taxable {formatMoneyString(rec.taxable_value)} · CGST{" "}
                  {formatMoneyString(rec.cgst_amount)} · SGST{" "}
                  {formatMoneyString(rec.sgst_amount)} · IGST{" "}
                  {formatMoneyString(rec.igst_amount)} · Cess{" "}
                  {formatMoneyString(rec.cess_amount)} · GST{" "}
                  {formatMoneyString(rec.gst_amount)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Section: {rec.portal_section || "—"} · 2B ITC:{" "}
                  {formatPortalItcLabel(rec.portal_itc_availability)}
                  {rec.portal_itc_unavailable_reason
                    ? ` · ${rec.portal_itc_unavailable_reason}`
                    : ""}
                </p>
              </div>
            ))}
          </SheetBody>
          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setPortalOpen(false)}
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={rerunConfirmOpen} onOpenChange={setRerunConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Re-run Reconciliation
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Automatic reconciliation will re-evaluate automatic/unmatched
              rows. Manual decisions are preserved according to backend rules.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={runningRecon}
              onClick={() => setRerunConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={runningRecon}
              onClick={() => void handleRerun()}
            >
              {runningRecon ? "Running…" : "Re-run"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}

function RowActionsMenu({
  row,
  mutationsEnabled,
  onCompare,
  onFindMatch,
  onChangeMatch,
  onReason,
  onItcTreatment,
}: {
  row: Gstr2aReconCombinedRowDto;
  mutationsEnabled: boolean;
  onCompare: () => void;
  onFindMatch: () => void;
  onChangeMatch: () => void;
  onReason: (row: Gstr2aReconCombinedRowDto, mode: Gstr2aReasonMode) => void;
  onItcTreatment: () => void;
}) {
  const status = row.status.match_status;
  const hasPortal = row.portal != null;

  const item = (
    label: string,
    onClick: () => void,
    opts?: { disabled?: boolean },
  ) => (
    <DropdownMenuItem
      className="text-xs"
      disabled={opts?.disabled}
      onClick={onClick}
    >
      {label}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {item("View Comparison", onCompare)}
        {item("View Audit", onCompare)}

        {status === "MATCHED" && (
          <>
            {item("Change Match", onChangeMatch, {
              disabled: !mutationsEnabled || !hasPortal,
            })}
            {item("Unmatch", () => onReason(row, "unmatch"), {
              disabled: !mutationsEnabled,
            })}
            {item("Mark for Review", () => onReason(row, "mark_review"), {
              disabled: !mutationsEnabled,
            })}
          </>
        )}

        {status === "PARTIAL_MATCH" && (
          <>
            {item("Change Match", onChangeMatch, {
              disabled: !mutationsEnabled || !hasPortal,
            })}
            {item("Accept Match", () => onReason(row, "accept"), {
              disabled: !mutationsEnabled,
            })}
            {item("Unmatch", () => onReason(row, "unmatch"), {
              disabled: !mutationsEnabled,
            })}
            {item("Mark for Review", () => onReason(row, "mark_review"), {
              disabled: !mutationsEnabled,
            })}
            {item("Resolve", () => onReason(row, "resolve"), {
              disabled: !mutationsEnabled,
            })}
          </>
        )}

        {status === "MISSING_IN_BOOKS" && (
          <>
            {item("Find Match", onFindMatch, {
              disabled: !mutationsEnabled || !hasPortal,
            })}
            {item("Mark for Review", () => onReason(row, "mark_review"), {
              disabled: !mutationsEnabled,
            })}
            {item("Resolve", () => onReason(row, "resolve"), {
              disabled: !mutationsEnabled,
            })}
          </>
        )}

        {status === "MISSING_IN_GSTR" && (
          <>
            {item("Mark for Review", () => onReason(row, "mark_review"), {
              disabled: !mutationsEnabled,
            })}
            {item("Resolve", () => onReason(row, "resolve"), {
              disabled: !mutationsEnabled,
            })}
          </>
        )}

        {status === "NEEDS_REVIEW" && (
          <>
            {hasPortal &&
              item("Find Match", onFindMatch, {
                disabled: !mutationsEnabled,
              })}
            {hasPortal &&
              item("Change Match", onChangeMatch, {
                disabled: !mutationsEnabled,
              })}
            {item("Mark Reviewed", () => onReason(row, "mark_reviewed"), {
              disabled: !mutationsEnabled,
            })}
            {item("Resolve", () => onReason(row, "resolve"), {
              disabled: !mutationsEnabled,
            })}
          </>
        )}

        {status === "DUPLICATE" && (
          <>
            {item("Mark for Review", () => onReason(row, "mark_review"), {
              disabled: !mutationsEnabled,
            })}
            {item("Resolve", () => onReason(row, "resolve"), {
              disabled: !mutationsEnabled,
            })}
          </>
        )}

        {item("Add Remark", () => onReason(row, "remark"), {
          disabled: !mutationsEnabled,
        })}
        <DropdownMenuSeparator />
        {item("Manage ITC Treatment", onItcTreatment, {
          disabled: !mutationsEnabled,
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
