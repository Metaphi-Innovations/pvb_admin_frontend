"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  FileWarning,
  MoreVertical,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { exportGstTabularReport } from "../gst-report-export";
import { Gstr2aFilterBar } from "./components/Gstr2aFilterBar";
import { Gstr2aComparisonSheet } from "./components/Gstr2aComparisonSheet";
import {
  buildGstr2aReport,
  findBooksDocByRow,
  findPortalDocById,
  summarizeGstr2aRows,
} from "./gstr2a-report-data";
import { GSTR2A_DEMO_PERIOD } from "./gstr2a-demo-seed";
import {
  parseGstr2aJson,
  saveGstr2aUpload,
  setGstr2aManualOverride,
} from "./gstr2a-portal-store";
import {
  GSTR2A_DOC_TYPE_LABELS,
  GSTR2A_STATUS_LABELS,
  type Gstr2aMatchStatus,
  type Gstr2aReconRow,
  type Gstr2aReport,
  type Gstr2aSummaryCounts,
} from "./gstr2a-report-types";

const STATUS_OPTIONS: Gstr2aMatchStatus[] = [
  "matched",
  "partial_match",
  "missing_in_books",
  "missing_in_gstr2a",
  "duplicate",
  "needs_review",
];

const GSTR2A_COLUMN_CONFIG: AccountsColumnFilterConfig = {
  supplierName: { type: "text" },
  supplierGstin: { type: "text" },
  docType: {
    type: "select",
    options: ["purchase_invoice", "credit_note", "debit_note"],
    optionLabels: GSTR2A_DOC_TYPE_LABELS,
  },
  booksInvoiceNo: { type: "text" },
  portalInvoiceNo: { type: "text" },
  booksInvoiceDate: { type: "date" },
  portalInvoiceDate: { type: "date" },
  booksTaxableAmount: { type: "amount" },
  portalTaxableAmount: { type: "amount" },
  booksGst: { type: "amount" },
  portalGst: { type: "amount" },
  difference: { type: "amount" },
  status: {
    type: "status",
    options: STATUS_OPTIONS,
    optionLabels: GSTR2A_STATUS_LABELS,
  },
  remarks: { type: "text" },
};

const STATUS_PILL: Record<
  Gstr2aMatchStatus,
  { bg: string; text: string; dot: string }
> = {
  matched: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  partial_match: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  missing_in_gstr2a: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  missing_in_books: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  duplicate: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  needs_review: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
};

function getGstr2aCellValue(row: Gstr2aReconRow, key: string): unknown {
  switch (key) {
    case "supplierName":
      return row.supplierName;
    case "supplierGstin":
      return row.supplierGstin;
    case "docType":
      return row.docType;
    case "booksInvoiceNo":
      return row.booksInvoiceNo === "—" ? "" : row.booksInvoiceNo;
    case "portalInvoiceNo":
      return row.portalInvoiceNo === "—" ? "" : row.portalInvoiceNo;
    case "booksInvoiceDate":
      return row.booksInvoiceDate === "—" ? "" : row.booksInvoiceDate;
    case "portalInvoiceDate":
      return row.portalInvoiceDate === "—" ? "" : row.portalInvoiceDate;
    case "booksTaxableAmount":
      return row.booksTaxableAmount;
    case "portalTaxableAmount":
      return row.portalTaxableAmount;
    case "booksGst":
      return row.booksGst;
    case "portalGst":
      return row.portalGst;
    case "difference":
      return row.difference;
    case "status":
      return row.status;
    case "remarks":
      return row.remarks;
    default:
      return (row as unknown as Record<string, unknown>)[key];
  }
}

function getGstr2aFilterValue(row: Gstr2aReconRow, key: string): unknown {
  // Keep keys for select/status so optionLabels map correctly in the filter popover
  if (key === "docType") return row.docType;
  if (key === "status") return row.status;
  return getGstr2aCellValue(row, key);
}

function StatusPill({ status }: { status: Gstr2aMatchStatus }) {
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
      {GSTR2A_STATUS_LABELS[status]}
    </span>
  );
}

function SummaryCards({ summary }: { summary: Gstr2aSummaryCounts }) {
  const cards = [
    {
      label: "Total Records",
      value: summary.total,
      icon: Search,
      border: "border-l-navy-600",
      iconBg: "bg-navy-50",
      iconColor: "text-navy-600",
    },
    {
      label: "Matched",
      value: summary.matched,
      icon: CheckCircle2,
      border: "border-l-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Partial Match",
      value: summary.partialMatch,
      icon: AlertCircle,
      border: "border-l-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Missing in Books",
      value: summary.missingInBooks,
      icon: FileWarning,
      border: "border-l-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Missing in GSTR-2A",
      value: summary.missingInGstr2a,
      icon: FileWarning,
      border: "border-l-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Duplicate",
      value: summary.duplicate,
      icon: Copy,
      border: "border-l-orange-500",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      label: "Needs Review",
      value: summary.needsReview,
      icon: Eye,
      border: "border-l-sky-500",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    },
  ];

  return (
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
              <p className="text-lg font-bold text-foreground leading-none">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DiffCell({ value, mismatch }: { value: number; mismatch: boolean }) {
  return (
    <AccountsTableCell
      align="right"
      money
      className={cn(
        "text-xs",
        MONEY_AMOUNT_CLASS,
        mismatch && "text-amber-700 font-semibold",
        Math.abs(value) > 1 && mismatch && "text-red-600",
      )}
    >
      {formatMoney(value)}
    </AccountsTableCell>
  );
}

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

/** Compact last-import hint shown beside the Upload button. */
function LastImportedLabel({
  upload,
}: {
  upload: NonNullable<Gstr2aReport["activeUpload"]>;
}) {
  return (
    <div className="hidden sm:flex flex-col justify-center leading-tight px-2 border-l border-border min-w-0 max-w-[14rem]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Last Imported
      </p>
      <p className="text-[11px] text-foreground truncate">
        {formatReturnPeriodLabel(upload.returnPeriod)} · {upload.recordCount} Records
      </p>
      <p className="text-[10px] text-muted-foreground tabular-nums truncate">
        {formatImportDateTime(upload.uploadedAt)}
      </p>
    </div>
  );
}

export default function Gstr2aPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTick, setUploadTick] = useState(0);
  const [compareRow, setCompareRow] = useState<Gstr2aReconRow | null>(null);
  const [actionRow, setActionRow] = useState<Gstr2aReconRow | null>(null);
  const [actionMode, setActionMode] = useState<"matched" | "needs_review" | "remark" | null>(
    null,
  );
  const [remarkText, setRemarkText] = useState("");

  const report = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildGstr2aReport(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, datesReady, filters, uploadTick]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      try {
        const text = await file.text();
        const json = JSON.parse(text) as unknown;
        const documents = parseGstr2aJson(json, file.name);
        const gstin =
          filters.gstRegistration !== "all"
            ? filters.gstRegistration
            : COMPANY_BILLING.gstNumber;
        const returnPeriod =
          filters.gstPeriod !== "all" ? filters.gstPeriod : GSTR2A_DEMO_PERIOD;
        saveGstr2aUpload({
          gstin,
          returnPeriod,
          fileName: file.name,
          documents,
        });
        setUploadTick((t) => t + 1);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to upload GSTR-2A JSON.");
      }
    },
    [filters.gstPeriod, filters.gstRegistration],
  );

  const openAction = (row: Gstr2aReconRow, mode: "matched" | "needs_review" | "remark") => {
    setActionRow(row);
    setActionMode(mode);
    setRemarkText(mode === "remark" ? row.remarks.replace(/\s*\(manual.*$/, "") : "");
  };

  const confirmAction = () => {
    if (!actionRow || !actionMode) return;
    if (actionMode === "matched") {
      setGstr2aManualOverride({
        rowId: actionRow.id,
        status: "matched",
        remark: remarkText.trim() || "Manually marked as matched",
      });
    } else if (actionMode === "needs_review") {
      setGstr2aManualOverride({
        rowId: actionRow.id,
        status: "needs_review",
        remark: remarkText.trim() || "Marked for review",
      });
    } else {
      setGstr2aManualOverride({
        rowId: actionRow.id,
        remark: remarkText.trim() || "Remark added",
      });
    }
    setActionRow(null);
    setActionMode(null);
    setRemarkText("");
    setUploadTick((t) => t + 1);
  };

  const compareBooks = compareRow ? findBooksDocByRow(filters, compareRow) : null;
  const comparePortal =
    compareRow?.portalDocId != null
      ? findPortalDocById(filters, compareRow.portalDocId)
      : null;

  const uploadInput = (
    <input
      ref={fileRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = "";
      }}
    />
  );

  const shellDialogs = (
    <>
      <Gstr2aComparisonSheet
        open={compareRow != null}
        onClose={() => setCompareRow(null)}
        row={compareRow}
        books={compareBooks}
        portal={comparePortal}
      />

      <Dialog
        open={actionMode != null}
        onOpenChange={(o) => {
          if (!o) {
            setActionMode(null);
            setActionRow(null);
            setRemarkText("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {actionMode === "matched"
                ? "Mark as Matched"
                : actionMode === "needs_review"
                  ? "Mark for Review"
                  : "Add Remark"}
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              {actionRow
                ? `${actionRow.supplierName} · ${actionRow.booksInvoiceNo !== "—" ? actionRow.booksInvoiceNo : actionRow.portalInvoiceNo}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Remark {actionMode === "matched" ? "(optional)" : ""}
            </label>
            <Textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              rows={3}
              placeholder="Enter remark…"
              className="text-sm rounded-lg"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setActionMode(null);
                setActionRow(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={confirmAction}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (!mounted || !datesReady || !report) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-2A Reconciliation")}
        title="GSTR-2A Reconciliation"
        description="Reconcile purchase invoices with uploaded GSTR-2A portal data."
        hideDescription
        layout="split"
        className="h-full min-h-0"
        actions={
          <div className="flex items-center gap-2">
            {uploadInput}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload GSTR-2A JSON
            </Button>
          </div>
        }
        filters={<Gstr2aFilterBar filterState={filterState} mounted={mounted} />}
        subHeader={<GstReportNavTabs filters={filters} />}
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AccountsReportBody className="space-y-3 pb-4">
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {uploadError}
              </div>
            )}
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GSTR-2A reconciliation…
            </div>
          </AccountsReportBody>
        </div>
        {shellDialogs}
      </AccountsPageShell>
    );
  }

  return (
    <AccountsColumnFilterProvider
      rows={report.rows}
      getCellValue={getGstr2aCellValue}
      getFilterValue={getGstr2aFilterValue}
      columnConfig={GSTR2A_COLUMN_CONFIG}
      defaultSortKey="supplierName"
      defaultSortDir="asc"
    >
      <Gstr2aShellWithFilters
        filterState={filterState}
        mounted={mounted}
        filters={filters}
        report={report}
        uploadError={uploadError}
        uploadInput={uploadInput}
        fileRef={fileRef}
        exporting={exporting}
        setExporting={setExporting}
        onCompare={setCompareRow}
        onOpenAction={openAction}
        shellDialogs={shellDialogs}
      />
    </AccountsColumnFilterProvider>
  );
}

function Gstr2aShellWithFilters({
  filterState,
  mounted,
  filters,
  report,
  uploadError,
  uploadInput,
  fileRef,
  exporting,
  setExporting,
  onCompare,
  onOpenAction,
  shellDialogs,
}: {
  filterState: ReturnType<typeof useGstReportFilters>;
  mounted: boolean;
  filters: ReturnType<typeof useGstReportFilters>["filters"];
  report: Gstr2aReport;
  uploadError: string | null;
  uploadInput: React.ReactNode;
  fileRef: React.RefObject<HTMLInputElement | null>;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  onCompare: (row: Gstr2aReconRow) => void;
  onOpenAction: (row: Gstr2aReconRow, mode: "matched" | "needs_review" | "remark") => void;
  shellDialogs: React.ReactNode;
}) {
  const filteredRows = useAccountsFilteredRows(report.rows);

  const handleExport = (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: "GSTR-2A Reconciliation", filters },
        [
          { label: "Supplier Name" },
          { label: "Supplier GSTIN" },
          { label: "Document Type" },
          { label: "Books Invoice No." },
          { label: "Portal Invoice No." },
          { label: "Books Invoice Date" },
          { label: "Portal Invoice Date" },
          { label: "Books Taxable (₹)", align: "right", className: "num" },
          { label: "Portal Taxable (₹)", align: "right", className: "num" },
          { label: "Books GST (₹)", align: "right", className: "num" },
          { label: "Portal GST (₹)", align: "right", className: "num" },
          { label: "Difference (₹)", align: "right", className: "num" },
          { label: "Status" },
          { label: "Remarks" },
        ],
        filteredRows.map((row) => ({
          supplierName: row.supplierName,
          supplierGstin: row.supplierGstin,
          docType: GSTR2A_DOC_TYPE_LABELS[row.docType],
          booksInvoiceNo: row.booksInvoiceNo,
          portalInvoiceNo: row.portalInvoiceNo,
          booksInvoiceDate: row.booksInvoiceDate,
          portalInvoiceDate: row.portalInvoiceDate,
          booksTaxableAmount: row.booksTaxableAmount,
          portalTaxableAmount: row.portalTaxableAmount,
          booksGst: row.booksGst,
          portalGst: row.portalGst,
          difference: row.difference,
          status: GSTR2A_STATUS_LABELS[row.status],
          remarks: row.remarks,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-2A Reconciliation")}
      title="GSTR-2A Reconciliation"
      description="Reconcile purchase invoices with uploaded GSTR-2A portal data."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <div className="flex items-center gap-2">
          {uploadInput}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload GSTR-2A JSON
          </Button>
          {report.activeUpload && <LastImportedLabel upload={report.activeUpload} />}
        </div>
      }
      filters={
        <Gstr2aFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <>
              <AccountsClearAllColumnFiltersButton />
              <AccountsExportMenu
                onExcel={() => handleExport("excel")}
                onPdf={() => handleExport("pdf")}
                disabled={exporting || filteredRows.length === 0}
              />
            </>
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-3 pb-4">
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {uploadError}
            </div>
          )}
          <Gstr2aFilteredBody report={report} onCompare={onCompare} onOpenAction={onOpenAction} />
        </AccountsReportBody>
      </div>
      {shellDialogs}
    </AccountsPageShell>
  );
}

function Gstr2aFilteredBody({
  report,
  onCompare,
  onOpenAction,
}: {
  report: Gstr2aReport;
  onCompare: (row: Gstr2aReconRow) => void;
  onOpenAction: (row: Gstr2aReconRow, mode: "matched" | "needs_review" | "remark") => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const filteredRows = useAccountsFilteredRows(report.rows);
  const summary = useMemo(() => summarizeGstr2aRows(filteredRows), [filteredRows]);

  return (
    <>
      <SummaryCards summary={summary} />

      <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
        <AccountsTableScroll className="flex-1 min-h-0">
          <AccountsTable minWidth={1480}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Supplier Name" colKey="supplierName" className="min-w-[9rem]" />
                <SortTh label="Supplier GSTIN" colKey="supplierGstin" className="min-w-[8rem]" />
                <SortTh label="Document Type" colKey="docType" filterType="select" />
                <SortTh label="Books Invoice No." colKey="booksInvoiceNo" />
                <SortTh label="Portal Invoice No." colKey="portalInvoiceNo" />
                <SortTh label="Books Invoice Date" colKey="booksInvoiceDate" filterType="date" />
                <SortTh label="Portal Invoice Date" colKey="portalInvoiceDate" filterType="date" />
                <SortTh
                  label="Books Taxable"
                  colKey="booksTaxableAmount"
                  filterType="amount"
                  align="right"
                />
                <SortTh
                  label="Portal Taxable"
                  colKey="portalTaxableAmount"
                  filterType="amount"
                  align="right"
                />
                <SortTh label="Books GST" colKey="booksGst" filterType="amount" align="right" />
                <SortTh label="Portal GST" colKey="portalGst" filterType="amount" align="right" />
                <SortTh label="Difference" colKey="difference" filterType="amount" align="right" />
                <SortTh label="Status" colKey="status" filterType="status" />
                <SortTh label="Remarks" colKey="remarks" className="min-w-[10rem]" />
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
              {filteredRows.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={15} className="accounts-table-empty">
                    <div className="flex flex-col items-center gap-1 py-4">
                      <p className="text-sm text-muted-foreground">
                        {report.rows.length === 0
                          ? "No reconciliation records for the selected filters."
                          : "No records match the column filters."}
                      </p>
                      {(ctx?.activeFilterCount ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => ctx?.clearAllColumnFilters()}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                filteredRows.map((row) => {
                  const taxableMismatch = Math.abs(row.taxableDifference) > 1;
                  const gstMismatch = Math.abs(row.gstDifference) > 1;
                  const anyMismatch = taxableMismatch || gstMismatch || row.dateMismatch;
                  return (
                    <AccountsTableRow key={row.id} className="group">
                      <AccountsTableCell className="text-xs font-medium">
                        {row.supplierName}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono text-brand-700">
                        {row.supplierGstin || "—"}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs">
                        {GSTR2A_DOC_TYPE_LABELS[row.docType]}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono">
                        {row.booksSourceId != null ? (
                          <Link
                            href={`/accounts/purchase-invoices/${row.booksSourceId}`}
                            className="text-brand-700 hover:underline font-semibold"
                          >
                            {row.booksInvoiceNo}
                          </Link>
                        ) : (
                          row.booksInvoiceNo
                        )}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono">
                        {row.portalInvoiceNo}
                      </AccountsTableCell>
                      <AccountsTableCell
                        className={cn(
                          "text-xs tabular-nums",
                          row.dateMismatch && "text-amber-700 font-semibold",
                        )}
                      >
                        {row.booksInvoiceDate}
                      </AccountsTableCell>
                      <AccountsTableCell
                        className={cn(
                          "text-xs tabular-nums",
                          row.dateMismatch && "text-amber-700 font-semibold",
                        )}
                      >
                        {row.portalInvoiceDate}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn(
                          "text-xs",
                          MONEY_AMOUNT_CLASS,
                          taxableMismatch && "text-amber-700 font-semibold",
                        )}
                      >
                        {formatMoney(row.booksTaxableAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn(
                          "text-xs",
                          MONEY_AMOUNT_CLASS,
                          taxableMismatch && "text-amber-700 font-semibold",
                        )}
                      >
                        {formatMoney(row.portalTaxableAmount)}
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
                        {formatMoney(row.booksGst)}
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
                        {formatMoney(row.portalGst)}
                      </AccountsTableCell>
                      <DiffCell value={row.difference} mismatch={anyMismatch} />
                      <AccountsTableCell>
                        <StatusPill status={row.status} />
                      </AccountsTableCell>
                      <AccountsTableCell className="text-[11px] text-muted-foreground max-w-[12rem] truncate">
                        {row.remarks || "—"}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => onCompare(row)}
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => onCompare(row)}
                              >
                                View Comparison
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => onOpenAction(row, "matched")}
                              >
                                Mark as Matched
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => onOpenAction(row, "needs_review")}
                              >
                                Mark for Review
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => onOpenAction(row, "remark")}
                              >
                                Add Remark
                              </DropdownMenuItem>
                              {row.booksSourceId != null && (
                                <DropdownMenuItem className="text-xs" asChild>
                                  <Link href={`/accounts/purchase-invoices/${row.booksSourceId}`}>
                                    Open Purchase Invoice
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{filteredRows.length}</span>
            {(ctx?.activeFilterCount ?? 0) > 0 && (
              <>
                {" "}
                of <span className="font-medium text-foreground">{report.rows.length}</span>
              </>
            )}{" "}
            records
            {report.activeUpload?.id.startsWith("demo-") && (
              <span className="ml-1">(demo GSTR-2A dataset)</span>
            )}
          </p>
        </div>
      </AccountsListingTableCard>
    </>
  );
}
