import {
  balanceSideLabel,
  formatBalanceAmount,
  formatMoney,
  formatMoneyWithSide,
} from "@/lib/accounts/money-format";
import { resolveDrCrColumnSide } from "@/lib/accounts/running-balance";
import {
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  escapeHtml,
  formatExportAmount,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import type {
  GeneralLedgerDisplayRow,
  GeneralLedgerListingRow,
  GeneralLedgerSummary,
} from "./general-ledger-data";

export interface GeneralLedgerExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
}

const STATEMENT_COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Particulars" },
  { label: "Transaction Type" },
  { label: "Voucher No." },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
  { label: "Running Balance", align: "right", className: "num" },
  { label: "Dr/Cr", align: "center", className: "center" },
];

const LISTING_COLUMNS: ReportColumnHeader[] = [
  { label: "Ledger Code" },
  { label: "Ledger Name" },
  { label: "Ledger Type" },
  { label: "Parent Group" },
  { label: "Opening Balance", align: "right", className: "num" },
  { label: "Total Debit (₹)", align: "right", className: "num" },
  { label: "Total Credit (₹)", align: "right", className: "num" },
  { label: "Closing Balance", align: "right", className: "num" },
  { label: "Last Transaction" },
];

function exportRowFields(r: GeneralLedgerDisplayRow) {
  const isOpening = r.kind === "opening";
  const isClosing = r.kind === "closing";
  const drCrSide = resolveDrCrColumnSide({
    debit: r.debit,
    credit: r.credit,
    runningBalanceType: r.runningBalanceType,
    isBalanceRow: isOpening || isClosing,
  });
  return {
    Date: r.date,
    Particulars: r.particulars,
    "Transaction Type": isOpening ? "Opening" : isClosing ? "—" : r.transactionType || r.voucherType,
    "Voucher No.": isOpening || isClosing || !r.voucherNo ? "—" : r.voucherNo,
    "Debit (₹)": r.debit || "",
    "Credit (₹)": r.credit || "",
    "Running Balance (₹)": r.runningBalance ? formatMoney(r.runningBalance) : "",
    "Dr/Cr": balanceSideLabel(drCrSide),
  };
}

function statementExportRows(rows: GeneralLedgerDisplayRow[]): GeneralLedgerDisplayRow[] {
  return rows.filter((r) => r.kind !== "closing");
}

function buildStatementHeaderOptions(
  summary: GeneralLedgerSummary,
  meta: GeneralLedgerExportMeta,
): ReportHeaderOptions {
  return {
    reportTitle: "General Ledger",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    subtitle: `${summary.ledgerName} (${summary.ledgerCode})`,
    filters: [
      { label: "Ledger Type", value: summary.ledgerType },
      { label: "Parent Group", value: summary.parentGroup },
    ],
  };
}

function buildStatementSummaryStrip(summary: GeneralLedgerSummary): string {
  return `<div class="summary-strip">
    <div class="summary-strip-item"><label>Opening Balance</label><strong>${formatBalanceAmount(summary.openingBalance, summary.openingBalanceType)}</strong></div>
    <div class="summary-strip-item"><label>Total Debit</label><strong>${formatExportAmount(summary.totalDebit)}</strong></div>
    <div class="summary-strip-item"><label>Total Credit</label><strong>${formatExportAmount(summary.totalCredit)}</strong></div>
    <div class="summary-strip-item"><label>Closing Balance</label><strong>${formatBalanceAmount(summary.closingBalance, summary.closingBalanceType)}</strong></div>
    <div class="summary-strip-item"><label>Grand Total Debit</label><strong>${formatExportAmount(summary.grandTotalDebit)}</strong></div>
    <div class="summary-strip-item"><label>Grand Total Credit</label><strong>${formatExportAmount(summary.grandTotalCredit)}</strong></div>
  </div>`;
}

function buildStatementBodyHtml(
  rows: GeneralLedgerDisplayRow[],
  summary: GeneralLedgerSummary,
): string {
  const exportRows = rows;
  const bodyHtml = exportRows
    .map((r) => {
      const f = exportRowFields(r);
      return `
    <tr class="${r.kind === "opening" || r.kind === "closing" ? "summary-row" : ""}">
      <td>${escapeHtml(f.Date)}</td>
      <td>${escapeHtml(f.Particulars)}</td>
      <td>${escapeHtml(f["Transaction Type"])}</td>
      <td class="mono">${escapeHtml(f["Voucher No."])}</td>
      <td class="num">${f["Debit (₹)"] ? formatExportAmount(Number(f["Debit (₹)"])) : "—"}</td>
      <td class="num">${f["Credit (₹)"] ? formatExportAmount(Number(f["Credit (₹)"])) : "—"}</td>
      <td class="num">${escapeHtml(formatBalanceAmount(r.runningBalance, r.runningBalanceType))}</td>
      <td class="center">${escapeHtml(f["Dr/Cr"])}</td>
    </tr>`;
    })
    .join("");

  const footerHtml = `
    <tr class="total">
      <td colspan="4"><strong>Total</strong></td>
      <td class="num"><strong>${formatExportAmount(summary.totalDebit)}</strong></td>
      <td class="num"><strong>${formatExportAmount(summary.totalCredit)}</strong></td>
      <td class="num"><strong>${formatBalanceAmount(summary.closingBalance, summary.closingBalanceType)}</strong></td>
      <td></td>
    </tr>
    <tr class="total">
      <td colspan="4"><strong>Grand Total</strong></td>
      <td class="num"><strong>${formatExportAmount(summary.grandTotalDebit)}</strong></td>
      <td class="num"><strong>${formatExportAmount(summary.grandTotalCredit)}</strong></td>
      <td colspan="2"></td>
    </tr>`;

  const tableHtml = buildTabularReportBodyHtml({
    columns: STATEMENT_COLUMNS,
    bodyHtml: bodyHtml + footerHtml,
  });
  return buildStatementSummaryStrip(summary) + tableHtml;
}

function buildListingHeaderOptions(meta: GeneralLedgerExportMeta, rowCount: number): ReportHeaderOptions {
  return {
    reportTitle: "General Ledger — All Ledgers",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [{ label: "Ledgers Shown", value: String(rowCount) }],
  };
}

function listingRowFields(row: GeneralLedgerListingRow) {
  return {
    "Ledger Code": row.ledgerCode,
    "Ledger Name": row.ledgerName,
    "Ledger Type": row.ledgerType,
    "Parent Group": row.parentGroup,
    GSTIN: row.gstin,
    PAN: row.pan,
    "Opening Balance": formatMoneyWithSide(row.openingBalance, row.openingBalanceType),
    "Total Debit (₹)": row.totalDebit || "",
    "Total Credit (₹)": row.totalCredit || "",
    "Closing Balance": formatMoneyWithSide(row.closingBalance, row.closingBalanceType),
    "Last Transaction Date": row.lastTransactionDate ?? "—",
  };
}

function buildListingBodyHtml(rows: GeneralLedgerListingRow[]): string {
  const bodyHtml = rows
    .map((row) => {
      const f = listingRowFields(row);
      return `
    <tr>
      <td class="mono">${escapeHtml(f["Ledger Code"])}</td>
      <td>${escapeHtml(f["Ledger Name"])}</td>
      <td>${escapeHtml(f["Ledger Type"])}</td>
      <td>${escapeHtml(f["Parent Group"])}</td>
      <td class="num">${escapeHtml(f["Opening Balance"])}</td>
      <td class="num">${f["Total Debit (₹)"] ? formatExportAmount(Number(f["Total Debit (₹)"])) : "—"}</td>
      <td class="num">${f["Total Credit (₹)"] ? formatExportAmount(Number(f["Total Credit (₹)"])) : "—"}</td>
      <td class="num">${escapeHtml(f["Closing Balance"])}</td>
      <td>${escapeHtml(f["Last Transaction Date"])}</td>
    </tr>`;
    })
    .join("");

  return buildTabularReportBodyHtml({ columns: LISTING_COLUMNS, bodyHtml });
}

export async function exportGeneralLedgerToExcel(
  rows: GeneralLedgerDisplayRow[],
  summary: GeneralLedgerSummary,
  meta: GeneralLedgerExportMeta,
): Promise<void> {
  const safeName = summary.ledgerCode.replace(/[^\w-]+/g, "_");
  exportAccountsReportToExcel({
    title: `General Ledger — ${summary.ledgerName}`,
    filename: `General_Ledger_${safeName}`,
    header: buildStatementHeaderOptions(summary, meta),
    bodyHtml: buildStatementBodyHtml(rows, summary),
    landscape: true,
  });
}

export function exportGeneralLedgerToPdf(
  rows: GeneralLedgerDisplayRow[],
  summary: GeneralLedgerSummary,
  meta: GeneralLedgerExportMeta,
): void {
  exportAccountsReportToPdf({
    title: `General Ledger — ${summary.ledgerName}`,
    filename: `General_Ledger_${summary.ledgerCode}`,
    header: buildStatementHeaderOptions(summary, meta),
    bodyHtml: buildStatementBodyHtml(rows, summary),
    landscape: true,
  });
}

export async function exportGeneralLedgerListingToExcel(
  rows: GeneralLedgerListingRow[],
  meta: GeneralLedgerExportMeta,
): Promise<void> {
  exportAccountsReportToExcel({
    title: "General Ledger Listing",
    filename: "General_Ledger_Listing",
    header: buildListingHeaderOptions(meta, rows.length),
    bodyHtml: buildListingBodyHtml(rows),
    landscape: true,
  });
}

export function exportGeneralLedgerListingToPdf(
  rows: GeneralLedgerListingRow[],
  meta: GeneralLedgerExportMeta,
): void {
  exportAccountsReportToPdf({
    title: "General Ledger Listing",
    filename: "General_Ledger_Listing",
    header: buildListingHeaderOptions(meta, rows.length),
    bodyHtml: buildListingBodyHtml(rows),
    landscape: true,
  });
}
