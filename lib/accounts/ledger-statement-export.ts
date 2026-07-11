import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import { formatMoneyWithSide } from "@/lib/accounts/money-format";
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

export interface LedgerStatementExportMeta {
  ledgerName: string;
  ledgerCode: string;
  ledgerType: string;
  parentGroup: string;
  primaryHead: string;
  dateFrom: string;
  dateTo: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher No." },
  { label: "Voucher Type" },
  { label: "Reference No." },
  { label: "Particulars / Narration" },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
  { label: "Running Balance", align: "right", className: "num" },
];

function runningBalanceLabel(row: CoaTransactionRow): string {
  return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
}

function buildHeaderOptions(meta: LedgerStatementExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Ledger Statement",
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    subtitle: meta.ledgerName,
    filters: [
      { label: "Ledger Code", value: meta.ledgerCode },
      { label: "Ledger Type", value: meta.ledgerType },
      { label: "Parent Group", value: meta.parentGroup },
      { label: "Primary Head", value: meta.primaryHead },
    ],
  };
}

function buildLedgerStatementBodyHtml(
  rows: CoaTransactionRow[],
  meta: LedgerStatementExportMeta,
): string {
  const bodyHtml = rows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.voucherNo)}</td>
      <td>${escapeHtml(r.voucherType)}</td>
      <td>${escapeHtml(r.referenceNo)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${r.debit ? formatExportAmount(r.debit) : "—"}</td>
      <td class="num">${r.credit ? formatExportAmount(r.credit) : "—"}</td>
      <td class="num">${escapeHtml(runningBalanceLabel(r))}</td>
    </tr>`,
    )
    .join("");

  const footerHtml = `<tr class="total">
    <td colspan="5"></td>
    <td class="num"><strong>Total Debit</strong><br />${formatExportAmount(meta.totalDebit)}</td>
    <td class="num"><strong>Total Credit</strong><br />${formatExportAmount(meta.totalCredit)}</td>
    <td class="num"><strong>Closing Balance</strong><br />${escapeHtml(formatMoneyWithSide(meta.closingBalance, meta.closingBalanceType))}</td>
  </tr>`;

  return buildStandardReportTableHtml({ columns: COLUMNS, bodyHtml, footerHtml });
}

export async function exportLedgerStatementToExcel(
  rows: CoaTransactionRow[],
  meta: LedgerStatementExportMeta,
): Promise<void> {
  const safeName = meta.ledgerCode.replace(/[^\w-]+/g, "_");
  const html = buildReportExcelDocumentHtml({
    title: `Ledger Statement — ${meta.ledgerName}`,
    header: buildHeaderOptions(meta),
    bodyHtml: buildLedgerStatementBodyHtml(rows, meta),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Ledger_${safeName}_${todayExportDateSuffix()}.xls`);
}

export function exportLedgerStatementToPdf(
  rows: CoaTransactionRow[],
  meta: LedgerStatementExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: `Ledger Statement — ${meta.ledgerName}`,
    header: buildHeaderOptions(meta),
    bodyHtml: buildLedgerStatementBodyHtml(rows, meta),
    landscape: true,
  });
  openReportPrintWindow(html);
}
