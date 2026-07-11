import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportTabularReportToPdf,
  openReportPrintWindow,
  type ReportColumnHeader,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import type {
  TrialBalanceDetailedGroup,
  TrialBalanceSummary,
  TrialBalanceSummaryGroupRow,
  TrialBalanceTab,
} from "./trial-balance-data";

const REPORT_NAME = "Trial Balance";

export interface TrialBalanceExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  view: TrialBalanceTab;
  branch?: string;
  warehouse?: string;
}

const TB_AMOUNT_HEADERS = [
  "Opening Debit (₹)",
  "Opening Credit (₹)",
  "Debit (₹)",
  "Credit (₹)",
  "Closing Debit (₹)",
  "Closing Credit (₹)",
] as const;

const TB_COLUMNS: ReportColumnHeader[] = [
  { label: "Primary Head" },
  { label: "Account Name" },
  ...TB_AMOUNT_HEADERS.map((h) => ({ label: h, align: "right" as const, className: "num" })),
];

function viewLabel(view: TrialBalanceTab): string {
  return view === "summary" ? "Group Wise" : "Detailed";
}

function buildHeaderOptions(meta: TrialBalanceExportMeta): ReportHeaderOptions {
  return {
    reportTitle: `${REPORT_NAME} — ${viewLabel(meta.view)}`,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      ...(meta.branch ? [{ label: "Branch", value: meta.branch }] : []),
      ...(meta.warehouse ? [{ label: "Warehouse", value: meta.warehouse }] : []),
    ],
  };
}

function amountCellsHtml(
  openingDebit: number,
  openingCredit: number,
  debit: number,
  credit: number,
  closingDebit: number,
  closingCredit: number,
  bold = false,
): string {
  const tag = bold ? "strong" : "span";
  return `
    <td class="num"><${tag}>${formatMoneyOrDash(openingDebit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(openingCredit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(debit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(credit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(closingDebit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(closingCredit)}</${tag}></td>`;
}

function grandTotalFooterHtml(summary: TrialBalanceSummary): string {
  return `<tr class="total">
    <td colspan="2"><strong>Grand Total</strong></td>
    ${amountCellsHtml(
      summary.openingDebit,
      summary.openingCredit,
      summary.periodDebit,
      summary.periodCredit,
      summary.closingDebit,
      summary.closingCredit,
      true,
    )}
  </tr>`;
}

function balanceNoteHtml(summary: TrialBalanceSummary): string {
  if (summary.isBalanced) return "";
  return `<p class="balance-msg unbalanced">Trial balance difference: ${escapeHtml(formatMoney(summary.difference))}</p>`;
}

export async function exportTrialBalanceSummaryToExcel(
  rows: TrialBalanceSummaryGroupRow[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  const bodyHtml = rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.primaryHead)}</td>
      <td>${escapeHtml(r.particular)}</td>
      ${amountCellsHtml(r.openingDebit, r.openingCredit, r.debit, r.credit, r.closingDebit, r.closingCredit)}
    </tr>`,
    )
    .join("");

  const tableHtml = buildStandardReportTableHtml({
    columns: TB_COLUMNS,
    bodyHtml,
    footerHtml: grandTotalFooterHtml(summary),
  });

  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml + balanceNoteHtml(summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Trial_Balance_GroupWise_${todayExportDateSuffix()}.xls`);
}

export async function exportTrialBalanceDetailedToExcel(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  const bodyHtml = groups
    .flatMap((group) => {
      const header = `<tr class="group">
      <td>${escapeHtml(group.primaryHead)}</td>
      <td><strong>${escapeHtml(group.groupName)}</strong></td>
      ${amountCellsHtml(group.openingDebit, group.openingCredit, group.debit, group.credit, group.closingDebit, group.closingCredit, true)}
    </tr>`;
      const ledgers = group.ledgers
        .map(
          (l) => `<tr class="line">
      <td>${escapeHtml(l.primaryHead)}</td>
      <td class="indent-1">${escapeHtml(l.ledgerName)}</td>
      ${amountCellsHtml(l.openingDebit, l.openingCredit, l.debit, l.credit, l.closingDebit, l.closingCredit)}
    </tr>`,
        )
        .join("");
      return header + ledgers;
    })
    .join("");

  const tableHtml = buildStandardReportTableHtml({
    columns: TB_COLUMNS,
    bodyHtml,
    footerHtml: grandTotalFooterHtml(summary),
  });

  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml + balanceNoteHtml(summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Trial_Balance_Detailed_${todayExportDateSuffix()}.xls`);
}

export function exportTrialBalanceSummaryToPdf(
  rows: TrialBalanceSummaryGroupRow[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): void {
  const bodyHtml = rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.primaryHead)}</td>
      <td>${escapeHtml(r.particular)}</td>
      ${amountCellsHtml(r.openingDebit, r.openingCredit, r.debit, r.credit, r.closingDebit, r.closingCredit)}
    </tr>`,
    )
    .join("");

  exportTabularReportToPdf({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    columns: TB_COLUMNS,
    bodyHtml,
    footerHtml: grandTotalFooterHtml(summary),
    footerNote: !summary.isBalanced
      ? `Trial balance difference: ${formatMoney(summary.difference)}`
      : undefined,
    landscape: true,
  });
}

export function exportTrialBalanceDetailedToPdf(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): void {
  const bodyHtml = groups
    .flatMap((group) => {
      const header = `<tr class="group">
      <td>${escapeHtml(group.primaryHead)}</td>
      <td><strong>${escapeHtml(group.groupName)}</strong></td>
      ${amountCellsHtml(group.openingDebit, group.openingCredit, group.debit, group.credit, group.closingDebit, group.closingCredit, true)}
    </tr>`;
      const ledgers = group.ledgers
        .map(
          (l) => `<tr class="line">
      <td>${escapeHtml(l.primaryHead)}</td>
      <td class="indent-1">${escapeHtml(l.ledgerName)}</td>
      ${amountCellsHtml(l.openingDebit, l.openingCredit, l.debit, l.credit, l.closingDebit, l.closingCredit)}
    </tr>`,
        )
        .join("");
      return header + ledgers;
    })
    .join("");

  const tableHtml = buildStandardReportTableHtml({
    columns: TB_COLUMNS,
    bodyHtml,
    footerHtml: grandTotalFooterHtml(summary),
  });

  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml + balanceNoteHtml(summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
