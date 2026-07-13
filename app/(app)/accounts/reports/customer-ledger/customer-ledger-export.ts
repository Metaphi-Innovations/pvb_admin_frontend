import { formatMoneyOrDash, formatMoneyWithSide } from "@/lib/accounts/money-format";
import {
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  escapeHtml,
  formatExportAmount,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import type { CustomerLedgerDisplayRow, CustomerLedgerSummary } from "./customer-ledger-data";

export interface CustomerLedgerExportMeta {
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

function balanceLabel(row: CustomerLedgerDisplayRow): string {
  return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
}

function buildHeaderOptions(
  summary: CustomerLedgerSummary,
  meta: CustomerLedgerExportMeta,
): ReportHeaderOptions {
  return {
    reportTitle: "Customer Ledger",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    subtitle: summary.customerName,
    filters: [
      { label: "Customer Code", value: summary.customerCode },
      { label: "GSTIN", value: summary.gstin },
      { label: "PAN", value: summary.pan },
    ],
  };
}

function buildCustomerLedgerBodyHtml(
  rows: CustomerLedgerDisplayRow[],
  summary: CustomerLedgerSummary,
): string {
  const bodyHtml = rows
    .map(
      (r) => `
    <tr class="${r.kind !== "transaction" ? "summary-row" : ""}">
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.kind === "transaction" || r.kind === "opening" ? r.voucherNo : "—")}</td>
      <td>${escapeHtml(r.voucherType)}</td>
      <td>${escapeHtml(r.particular)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${formatMoneyOrDash(r.debit)}</td>
      <td class="num">${formatMoneyOrDash(r.credit)}</td>
      <td class="num">${escapeHtml(balanceLabel(r))}</td>
    </tr>`,
    )
    .join("");

  const tableHtml = buildTabularReportBodyHtml({ columns: COLUMNS, bodyHtml });

  const totalsNote = `<p class="report-footer-note">
    Opening: ${formatMoneyWithSide(summary.openingBalance, summary.openingBalanceType)} ·
    Total Debit: ${formatExportAmount(summary.totalDebit)} ·
    Total Credit: ${formatExportAmount(summary.totalCredit)} ·
    Closing: ${formatMoneyWithSide(summary.closingBalance, summary.closingBalanceType)}
  </p>`;

  return tableHtml + totalsNote;
}

export async function exportCustomerLedgerToExcel(
  rows: CustomerLedgerDisplayRow[],
  summary: CustomerLedgerSummary,
  meta: CustomerLedgerExportMeta,
): Promise<void> {
  const safeName = summary.customerCode.replace(/[^\w-]+/g, "_");
  exportAccountsReportToExcel({
    title: `Customer Ledger — ${summary.customerName}`,
    filename: `Customer_Ledger_${safeName}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildCustomerLedgerBodyHtml(rows, summary),
    landscape: true,
  });
}

export function exportCustomerLedgerToPdf(
  rows: CustomerLedgerDisplayRow[],
  summary: CustomerLedgerSummary,
  meta: CustomerLedgerExportMeta,
): void {
  exportAccountsReportToPdf({
    title: `Customer Ledger — ${summary.customerName}`,
    filename: `Customer_Ledger_${summary.customerCode}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildCustomerLedgerBodyHtml(rows, summary),
    landscape: true,
  });
}
