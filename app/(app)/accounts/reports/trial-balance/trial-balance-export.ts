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
  TrialBalanceTab,
} from "./trial-balance-data";
import {
  balanceSideAbbrev,
  flattenTrialBalanceNormalRows,
  netBalanceFromSplit,
} from "./trial-balance-display";

const REPORT_NAME = "Trial Balance";

export interface TrialBalanceExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  view: TrialBalanceTab;
  branch?: string;
  warehouse?: string;
  includeOpeningBalance?: boolean;
}

const NORMAL_COLUMNS: ReportColumnHeader[] = [
  { label: "Particular" },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
];

const DETAILED_COLUMNS: ReportColumnHeader[] = [
  { label: "Particular" },
  { label: "Opening Balance (₹)", align: "right", className: "num" },
  { label: "Dr/Cr", align: "center" },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
  { label: "Closing Balance (₹)", align: "right", className: "num" },
  { label: "Dr/Cr", align: "center" },
];

function viewLabel(view: TrialBalanceTab): string {
  return view === "normal" ? "Normal" : "Detailed";
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

function normalAmountCells(debit: number, credit: number, bold = false): string {
  const tag = bold ? "strong" : "span";
  return `
    <td class="num"><${tag}>${formatMoneyOrDash(debit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(credit)}</${tag}></td>`;
}

function detailedAmountCells(
  openingDebit: number,
  openingCredit: number,
  debit: number,
  credit: number,
  closingDebit: number,
  closingCredit: number,
  bold = false,
  includeOpening = true,
): string {
  const tag = bold ? "strong" : "span";
  const opening = netBalanceFromSplit(openingDebit, openingCredit);
  const closing = netBalanceFromSplit(closingDebit, closingCredit);
  const openingCells = includeOpening
    ? `<td class="num"><${tag}>${opening.amount ? formatMoney(opening.amount) : "—"}</${tag}></td>
    <td class="center"><${tag}>${balanceSideAbbrev(opening.side)}</${tag}></td>`
    : `<td class="num"><${tag}>—</${tag}></td><td class="center"><${tag}>—</${tag}></td>`;
  return `${openingCells}
    <td class="num"><${tag}>${formatMoneyOrDash(debit)}</${tag}></td>
    <td class="num"><${tag}>${formatMoneyOrDash(credit)}</${tag}></td>
    <td class="num"><${tag}>${closing.amount ? formatMoney(closing.amount) : "—"}</${tag}></td>
    <td class="center"><${tag}>${balanceSideAbbrev(closing.side)}</${tag}></td>`;
}

function balanceNoteHtml(summary: TrialBalanceSummary): string {
  if (summary.isBalanced) {
    return `<p class="balance-msg balanced">Trial Balance is balanced</p>`;
  }
  return `<p class="balance-msg unbalanced">Trial Balance is not balanced — Difference: ${escapeHtml(formatMoney(summary.difference))}</p>`;
}

function buildNormalBodyHtml(groups: TrialBalanceDetailedGroup[]): string {
  const rows = flattenTrialBalanceNormalRows(groups);
  return rows
    .map((row) => {
      if (row.type === "primary") {
        return `<tr class="primary">
      <td class="indent-0"><strong>${escapeHtml(row.primaryHead)}</strong></td>
      ${normalAmountCells(row.debit, row.credit, true)}
    </tr>`;
      }
      if (row.type === "group") {
        return `<tr class="group">
      <td class="indent-1"><strong>${escapeHtml(row.groupName)}</strong></td>
      ${normalAmountCells(row.debit, row.credit, true)}
    </tr>`;
      }
      if (row.type === "subgroup") {
        return `<tr class="subgroup">
      <td class="indent-2"><strong>${escapeHtml(row.subgroupName)}</strong></td>
      ${normalAmountCells(row.debit, row.credit)}
    </tr>`;
      }
      const l = row.ledger;
      return `<tr class="line">
      <td class="indent-3">${escapeHtml(l.ledgerName)}</td>
      ${normalAmountCells(l.closingDebit, l.closingCredit)}
    </tr>`;
    })
    .join("");
}

function buildDetailedBodyHtml(
  groups: TrialBalanceDetailedGroup[],
  includeOpening = true,
): string {
  const normalRows = flattenTrialBalanceNormalRows(groups);
  const flatDetailed: {
    kind: "primary" | "group" | "subgroup" | "ledger";
    label: string;
    indent: number;
    amounts: {
      openingDebit: number;
      openingCredit: number;
      debit: number;
      credit: number;
      closingDebit: number;
      closingCredit: number;
    };
    bold?: boolean;
  }[] = [];

  for (const row of normalRows) {
    if (row.type === "primary") {
      const section = groups.filter((g) => g.primaryHeadId === row.primaryHeadId);
      const amounts = section.reduce(
        (acc, g) => ({
          openingDebit: acc.openingDebit + g.openingDebit,
          openingCredit: acc.openingCredit + g.openingCredit,
          debit: acc.debit + g.debit,
          credit: acc.credit + g.credit,
          closingDebit: acc.closingDebit + g.closingDebit,
          closingCredit: acc.closingCredit + g.closingCredit,
        }),
        {
          openingDebit: 0,
          openingCredit: 0,
          debit: 0,
          credit: 0,
          closingDebit: 0,
          closingCredit: 0,
        },
      );
      flatDetailed.push({
        kind: "primary",
        label: row.primaryHead,
        indent: 0,
        amounts,
        bold: true,
      });
      continue;
    }
    if (row.type === "group") {
      const group = groups.find((g) => g.groupKey === row.groupKey);
      if (!group) continue;
      flatDetailed.push({
        kind: "group",
        label: row.groupName,
        indent: 1,
        amounts: group,
        bold: true,
      });
      continue;
    }
    if (row.type === "subgroup") {
      const group = groups.find((g) => g.groupKey === row.subgroupKey.split("::")[0]);
      const ledgers =
        group?.ledgers.filter((l) => l.standardGroup === row.subgroupName) ?? [];
      const amounts = ledgers.reduce(
        (acc, l) => ({
          openingDebit: acc.openingDebit + l.openingDebit,
          openingCredit: acc.openingCredit + l.openingCredit,
          debit: acc.debit + l.debit,
          credit: acc.credit + l.credit,
          closingDebit: acc.closingDebit + l.closingDebit,
          closingCredit: acc.closingCredit + l.closingCredit,
        }),
        {
          openingDebit: 0,
          openingCredit: 0,
          debit: 0,
          credit: 0,
          closingDebit: 0,
          closingCredit: 0,
        },
      );
      flatDetailed.push({
        kind: "subgroup",
        label: row.subgroupName,
        indent: 2,
        amounts,
      });
      continue;
    }
    flatDetailed.push({
      kind: "ledger",
      label: row.ledger.ledgerName,
      indent: 3,
      amounts: row.ledger,
    });
  }

  return flatDetailed
    .map(
      (row) => `<tr class="${row.kind}">
      <td class="indent-${row.indent}">${row.bold ? `<strong>${escapeHtml(row.label)}</strong>` : escapeHtml(row.label)}</td>
      ${detailedAmountCells(
        row.amounts.openingDebit,
        row.amounts.openingCredit,
        row.amounts.debit,
        row.amounts.credit,
        row.amounts.closingDebit,
        row.amounts.closingCredit,
        row.bold,
        includeOpening,
      )}
    </tr>`,
    )
    .join("");
}

function normalFooterHtml(summary: TrialBalanceSummary): string {
  return `<tr class="total">
    <td><strong>TOTAL</strong></td>
    ${normalAmountCells(summary.totalDebit, summary.totalCredit, true)}
  </tr>`;
}

function detailedFooterHtml(summary: TrialBalanceSummary, includeOpening = true): string {
  const opening = netBalanceFromSplit(summary.openingDebit, summary.openingCredit);
  const closing = netBalanceFromSplit(summary.closingDebit, summary.closingCredit);
  const openingCells = includeOpening
    ? `<td class="num"><strong>${opening.amount ? formatMoney(opening.amount) : "—"}</strong></td>
    <td class="center"><strong>${balanceSideAbbrev(opening.side)}</strong></td>`
    : `<td class="num"><strong>—</strong></td><td class="center"><strong>—</strong></td>`;
  return `<tr class="total">
    <td><strong>TOTAL</strong></td>
    ${openingCells}
    <td class="num"><strong>${formatMoney(summary.periodDebit)}</strong></td>
    <td class="num"><strong>${formatMoney(summary.periodCredit)}</strong></td>
    <td class="num"><strong>${closing.amount ? formatMoney(closing.amount) : "—"}</strong></td>
    <td class="center"><strong>${balanceSideAbbrev(closing.side)}</strong></td>
  </tr>`;
}

export async function exportTrialBalanceNormalToExcel(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  const tableHtml = buildStandardReportTableHtml({
    columns: NORMAL_COLUMNS,
    bodyHtml: buildNormalBodyHtml(groups),
    footerHtml: normalFooterHtml(summary),
  });
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml + balanceNoteHtml(summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Trial_Balance_Normal_${todayExportDateSuffix()}.xls`);
}

export async function exportTrialBalanceDetailedToExcel(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  const includeOpening = meta.includeOpeningBalance !== false;
  const tableHtml = buildStandardReportTableHtml({
    columns: DETAILED_COLUMNS,
    bodyHtml: buildDetailedBodyHtml(groups, includeOpening),
    footerHtml: detailedFooterHtml(summary, includeOpening),
  });
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml + balanceNoteHtml(summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Trial_Balance_Detailed_${todayExportDateSuffix()}.xls`);
}

/** @deprecated Use exportTrialBalanceNormalToExcel */
export async function exportTrialBalanceSummaryToExcel(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  return exportTrialBalanceNormalToExcel(groups, meta, summary);
}

export function exportTrialBalanceNormalToPdf(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): void {
  exportTabularReportToPdf({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    columns: NORMAL_COLUMNS,
    bodyHtml: buildNormalBodyHtml(groups),
    footerHtml: normalFooterHtml(summary),
    footerNote: summary.isBalanced
      ? "Trial Balance is balanced"
      : `Trial Balance is not balanced — Difference: ${formatMoney(summary.difference)}`,
    landscape: true,
  });
}

export function exportTrialBalanceDetailedToPdf(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): void {
  const includeOpening = meta.includeOpeningBalance !== false;
  const tableHtml = buildStandardReportTableHtml({
    columns: DETAILED_COLUMNS,
    bodyHtml: buildDetailedBodyHtml(groups, includeOpening),
    footerHtml: detailedFooterHtml(summary, includeOpening),
  });
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml + balanceNoteHtml(summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}

/** @deprecated Use exportTrialBalanceNormalToPdf */
export function exportTrialBalanceSummaryToPdf(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): void {
  exportTrialBalanceNormalToPdf(groups, meta, summary);
}
