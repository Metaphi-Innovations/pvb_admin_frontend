import { formatMoneyOrDash, formatMoneyWithSide } from "@/lib/accounts/money-format";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  openReportPrintWindow,
  formatExportAmount,
  type ReportColumnHeader,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import type { SupplierLedgerDisplayRow, SupplierLedgerSummary } from "./supplier-ledger-data";

export interface SupplierLedgerExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher No." },
  { label: "Voucher Type" },
  { label: "Particular" },
  { label: "Narration" },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
  { label: "Running Balance", align: "right", className: "num" },
];

function balanceLabel(row: SupplierLedgerDisplayRow): string {
  return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
}

function buildHeaderOptions(
  summary: SupplierLedgerSummary,
  meta: SupplierLedgerExportMeta,
): ReportHeaderOptions {
  return {
    reportTitle: "Supplier Ledger",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    subtitle: summary.supplierName,
    filters: [
      { label: "Supplier Code", value: summary.supplierCode },
      { label: "GSTIN", value: summary.gstin },
      { label: "PAN", value: summary.pan },
    ],
  };
}

function buildSupplierLedgerBodyHtml(
  rows: SupplierLedgerDisplayRow[],
  summary: SupplierLedgerSummary,
): string {
  const bodyHtml = rows
    .map(
      (r) => `
    <tr class="${r.kind !== "transaction" ? "summary-row" : ""}">
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.kind === "transaction" ? r.voucherNo : r.kind === "opening" ? "OB" : "—")}</td>
      <td>${escapeHtml(r.voucherType)}</td>
      <td>${escapeHtml(r.particular)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${formatMoneyOrDash(r.debit)}</td>
      <td class="num">${formatMoneyOrDash(r.credit)}</td>
      <td class="num">${escapeHtml(balanceLabel(r))}</td>
    </tr>`,
    )
    .join("");

  const tableHtml = buildStandardReportTableHtml({ columns: COLUMNS, bodyHtml });

  const totalsNote = `<p class="report-footer-note">
    Opening: ${formatMoneyWithSide(summary.openingBalance, summary.openingBalanceType)} ·
    Total Debit: ${formatExportAmount(summary.totalDebit)} ·
    Total Credit: ${formatExportAmount(summary.totalCredit)} ·
    Closing: ${formatMoneyWithSide(summary.closingBalance, summary.closingBalanceType)}
  </p>`;

  return tableHtml + totalsNote;
}

export async function exportSupplierLedgerToExcel(
  rows: SupplierLedgerDisplayRow[],
  summary: SupplierLedgerSummary,
  meta: SupplierLedgerExportMeta,
): Promise<void> {
  const safeName = summary.supplierCode.replace(/[^\w-]+/g, "_");
  const html = buildReportExcelDocumentHtml({
    title: `Supplier Ledger — ${summary.supplierName}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildSupplierLedgerBodyHtml(rows, summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Supplier_Ledger_${safeName}_${todayExportDateSuffix()}.xls`);
}

export function exportSupplierLedgerToPdf(
  rows: SupplierLedgerDisplayRow[],
  summary: SupplierLedgerSummary,
  meta: SupplierLedgerExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: `Supplier Ledger — ${summary.supplierName}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildSupplierLedgerBodyHtml(rows, summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
