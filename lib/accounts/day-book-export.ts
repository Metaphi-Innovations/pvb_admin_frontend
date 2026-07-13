import type { DayBookEntry } from "@/lib/accounts/day-book-data";
import {
  formatDayBookDate,
  formatDayBookDateForTotal,
} from "@/lib/accounts/day-book-data";
import { formatMoney, formatMoneyWithSide } from "@/lib/accounts/money-format";
import {
  buildGrandTotalRowHtml,
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import {
  buildBalanceMessageHtml,
  escapeHtml,
  formatExportAmount,
} from "@/lib/accounts/report-export-presentation";

export interface DayBookExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  voucherType: string;
  branch?: string;
}

export interface DayBookExportSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lineCount?: number;
  voucherCount?: number;
  unbalancedVoucherCount?: number;
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher Type" },
  { label: "Voucher No." },
  { label: "Ledger / Party" },
  { label: "Particulars" },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
  { label: "Running Balance", align: "right", className: "num" },
  { label: "Narration" },
];

function buildHeaderOptions(meta: DayBookExportMeta): ReportHeaderOptions {
  const filters = [{ label: "Voucher Type", value: meta.voucherType }];
  if (meta.branch) {
    filters.unshift({ label: "Branch", value: meta.branch });
  }
  return {
    reportTitle: "Day Book",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters,
  };
}

function runningBalanceLabel(entry: DayBookEntry): string {
  if (entry.rowKind === "dateTotal" || entry.rowKind === "grandTotal") return "";
  return formatMoneyWithSide(entry.runningBalance, entry.runningBalanceType);
}

function buildDayBookExportBody(
  entries: DayBookEntry[],
  summary: DayBookExportSummary,
): string {
  const transactionEntries = entries.filter((e) => e.rowKind !== "grandTotal");

  const bodyHtml = transactionEntries
    .map((e) => {
      if (e.rowKind === "dateTotal") {
        return `
    <tr class="subtotal">
      <td colspan="5"><strong>Date Total (${escapeHtml(formatDayBookDateForTotal(e.date))})</strong></td>
      <td class="num bold"><strong>${formatExportAmount(e.debit)}</strong></td>
      <td class="num bold"><strong>${formatExportAmount(e.credit)}</strong></td>
      <td class="num"></td>
      <td></td>
    </tr>`;
      }

      return `
    <tr${e.isUnbalancedVoucher ? ' class="unbalanced"' : ""}>
      <td>${escapeHtml(formatDayBookDate(e.date))}</td>
      <td>${escapeHtml(e.voucherTypeLabel)}</td>
      <td class="mono">${escapeHtml(e.voucherNo)}</td>
      <td>${escapeHtml(e.partyLedger)}</td>
      <td>${escapeHtml(e.particulars)}</td>
      <td class="num">${e.debit ? formatExportAmount(e.debit) : "—"}</td>
      <td class="num">${e.credit ? formatExportAmount(e.credit) : "—"}</td>
      <td class="num">${escapeHtml(runningBalanceLabel(e))}</td>
      <td>${escapeHtml(e.narration)}</td>
    </tr>`;
    })
    .join("");

  const footerHtml = buildGrandTotalRowHtml({
    label: "Grand Total",
    labelColSpan: 5,
    amounts: [summary.totalDebit, summary.totalCredit],
    trailingCellsHtml: `<td class="num"></td><td></td>`,
  });

  const balanceNote = summary.isBalanced
    ? buildBalanceMessageHtml("Totals are balanced across all ledger lines.", "balanced")
    : buildBalanceMessageHtml(
        `Warning: Total Debit and Total Credit do not match (difference: ${formatMoney(summary.totalDebit - summary.totalCredit)}).${
          summary.unbalancedVoucherCount
            ? ` ${summary.unbalancedVoucherCount} voucher(s) are unbalanced.`
            : ""
        }`,
        "unbalanced",
      );

  const summaryStrip = `<div class="summary-strip">
    <div class="summary-strip-item"><label>Ledger Lines</label><strong>${summary.lineCount ?? transactionEntries.filter((e) => e.rowKind === "transaction").length}</strong></div>
    <div class="summary-strip-item"><label>Total Debit</label><strong>${formatExportAmount(summary.totalDebit)}</strong></div>
    <div class="summary-strip-item"><label>Total Credit</label><strong>${formatExportAmount(summary.totalCredit)}</strong></div>
  </div>`;

  const tableHtml = buildTabularReportBodyHtml({ columns: COLUMNS, bodyHtml, footerHtml });
  return summaryStrip + balanceNote + tableHtml;
}

export async function exportDayBookToExcel(
  entries: DayBookEntry[],
  meta: DayBookExportMeta,
  summary: DayBookExportSummary,
): Promise<void> {
  exportAccountsReportToExcel({
    title: "Day Book Report",
    filename: "Day_Book",
    header: buildHeaderOptions(meta),
    bodyHtml: buildDayBookExportBody(entries, summary),
    landscape: true,
  });
}

export function exportDayBookToPdf(
  entries: DayBookEntry[],
  meta: DayBookExportMeta,
  summary: DayBookExportSummary,
): void {
  exportAccountsReportToPdf({
    title: "Day Book Report",
    filename: "Day_Book",
    header: buildHeaderOptions(meta),
    bodyHtml: buildDayBookExportBody(entries, summary),
    landscape: true,
  });
}
