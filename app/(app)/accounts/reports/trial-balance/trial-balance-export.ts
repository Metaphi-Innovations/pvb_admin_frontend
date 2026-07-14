import { formatMoney } from "@/lib/accounts/money-format";
import {
  buildGrandTotalRowHtml,
  buildHierarchyTabularBodyHtml,
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  mapCoaLevelToRowType,
  type HierarchyTabularRow,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import {
  buildReportDocumentHtml,
  escapeHtml,
  openReportPrintWindow,
} from "@/lib/accounts/report-export-presentation";
import type {
  TrialBalanceDetailedGroup,
  TrialBalanceSummary,
  TrialBalanceTab,
} from "./trial-balance-data";
import {
  balanceSideAbbrev,
  flattenTrialBalanceNormalLedgerRows,
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

function openingMiddleCells(
  openingDebit: number,
  openingCredit: number,
  bold: boolean,
  includeOpening: boolean,
): string {
  const tag = bold ? "strong" : "span";
  if (!includeOpening) {
    return `<td class="num"><${tag}>—</${tag}></td><td class="center"><${tag}>—</${tag}></td>`;
  }
  const opening = netBalanceFromSplit(openingDebit, openingCredit);
  return `<td class="num"><${tag}>${opening.amount ? formatMoney(opening.amount) : "—"}</${tag}></td>
    <td class="center"><${tag}>${balanceSideAbbrev(opening.side)}</${tag}></td>`;
}

function closingMiddleCells(
  closingDebit: number,
  closingCredit: number,
  bold: boolean,
): string {
  const tag = bold ? "strong" : "span";
  const closing = netBalanceFromSplit(closingDebit, closingCredit);
  return `<td class="num"><${tag}>${closing.amount ? formatMoney(closing.amount) : "—"}</${tag}></td>
    <td class="center"><${tag}>${balanceSideAbbrev(closing.side)}</${tag}></td>`;
}

function buildNormalBodyHtml(groups: TrialBalanceDetailedGroup[]): string {
  const flatRows = flattenTrialBalanceNormalLedgerRows(groups);
  const rows: HierarchyTabularRow[] = flatRows.map((row) => ({
    rowType: mapCoaLevelToRowType("ledger"),
    label: row.ledger.ledgerName,
    amounts: [row.ledger.closingDebit, row.ledger.closingCredit],
    dashWhenZero: true,
  }));
  return buildHierarchyTabularBodyHtml(rows);
}

function buildDetailedBodyHtml(
  groups: TrialBalanceDetailedGroup[],
  includeOpening = true,
): string {
  const rows: HierarchyTabularRow[] = [];

  const sections = new Map<number, TrialBalanceDetailedGroup[]>();
  for (const group of groups) {
    const list = sections.get(group.primaryHeadId) ?? [];
    list.push(group);
    sections.set(group.primaryHeadId, list);
  }

  for (const [, sectionGroups] of [...sections.entries()].sort(
    (a, b) => (a[1][0]?.primaryHeadSort ?? 0) - (b[1][0]?.primaryHeadSort ?? 0),
  )) {
    const primaryHead = sectionGroups[0]?.primaryHead ?? "";
    const primaryAmounts = sectionGroups.reduce(
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

    rows.push({
      rowType: mapCoaLevelToRowType("primary"),
      label: primaryHead,
      amounts: [primaryAmounts.debit, primaryAmounts.credit],
      dashWhenZero: true,
      middleCellsHtml: openingMiddleCells(
        primaryAmounts.openingDebit,
        primaryAmounts.openingCredit,
        true,
        includeOpening,
      ),
      trailingCellsHtml: closingMiddleCells(
        primaryAmounts.closingDebit,
        primaryAmounts.closingCredit,
        true,
      ),
    });

    for (const group of sectionGroups) {
      rows.push({
        rowType: mapCoaLevelToRowType("group"),
        label: group.groupName,
        amounts: [group.debit, group.credit],
        dashWhenZero: true,
        middleCellsHtml: openingMiddleCells(
          group.openingDebit,
          group.openingCredit,
          true,
          includeOpening,
        ),
        trailingCellsHtml: closingMiddleCells(
          group.closingDebit,
          group.closingCredit,
          true,
        ),
      });

      for (const subgroup of group.subgroups) {
        rows.push({
          rowType: mapCoaLevelToRowType("subgroup"),
          label: subgroup.subgroupName,
          amounts: [subgroup.debit, subgroup.credit],
          dashWhenZero: true,
          middleCellsHtml: openingMiddleCells(
            subgroup.openingDebit,
            subgroup.openingCredit,
            true,
            includeOpening,
          ),
          trailingCellsHtml: closingMiddleCells(
            subgroup.closingDebit,
            subgroup.closingCredit,
            true,
          ),
        });

        for (const ledger of subgroup.ledgers) {
          rows.push({
            rowType: mapCoaLevelToRowType("ledger"),
            label: ledger.ledgerName,
            amounts: [ledger.debit, ledger.credit],
            dashWhenZero: true,
            middleCellsHtml: openingMiddleCells(
              ledger.openingDebit,
              ledger.openingCredit,
              false,
              includeOpening,
            ),
            trailingCellsHtml: closingMiddleCells(
              ledger.closingDebit,
              ledger.closingCredit,
              false,
            ),
          });
        }
      }
    }
  }

  return buildHierarchyTabularBodyHtml(rows);
}

function balanceNoteHtml(summary: TrialBalanceSummary): string {
  if (summary.isBalanced) {
    return `<p class="balance-msg balanced">Trial Balance is balanced</p>`;
  }
  return `<p class="balance-msg unbalanced">Trial Balance is not balanced — Opening Difference: ${escapeHtml(formatMoney(summary.openingDifference))}; Period Difference: ${escapeHtml(formatMoney(summary.periodDifference))}; Closing Difference: ${escapeHtml(formatMoney(summary.closingDifference))}</p>`;
}

function normalFooterHtml(summary: TrialBalanceSummary): string {
  return buildGrandTotalRowHtml({
    label: "Grand Total",
    amounts: [summary.totalDebit, summary.totalCredit],
    dashWhenZero: true,
  });
}

function detailedFooterHtml(summary: TrialBalanceSummary, includeOpening = true): string {
  const opening = netBalanceFromSplit(summary.openingDebit, summary.openingCredit);
  const closing = netBalanceFromSplit(summary.closingDebit, summary.closingCredit);
  const tag = "strong";
  const openingCells = includeOpening
    ? `<td class="num"><${tag}>${opening.amount ? formatMoney(opening.amount) : "—"}</${tag}></td>
    <td class="center"><${tag}>${balanceSideAbbrev(opening.side)}</${tag}></td>`
    : `<td class="num"><${tag}>—</${tag}></td><td class="center"><${tag}>—</${tag}></td>`;
  const trailing =
    `<td class="num"><${tag}>${closing.amount ? formatMoney(closing.amount) : "—"}</${tag}></td>` +
    `<td class="center"><${tag}>${balanceSideAbbrev(closing.side)}</${tag}></td>`;
  return buildGrandTotalRowHtml({
    label: "Grand Total",
    middleCellsHtml: openingCells,
    amounts: [summary.periodDebit, summary.periodCredit],
    trailingCellsHtml: trailing,
  });
}

export async function exportTrialBalanceNormalToExcel(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  const tableHtml =
    buildTabularReportBodyHtml({
      columns: NORMAL_COLUMNS,
      bodyHtml: buildNormalBodyHtml(groups),
      footerHtml: normalFooterHtml(summary),
    }) + balanceNoteHtml(summary);

  exportAccountsReportToExcel({
    title: REPORT_NAME,
    filename: `Trial_Balance_Normal_${meta.view}`,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
    landscape: true,
  });
}

export async function exportTrialBalanceDetailedToExcel(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): Promise<void> {
  const includeOpening = meta.includeOpeningBalance !== false;
  const tableHtml =
    buildTabularReportBodyHtml({
      columns: DETAILED_COLUMNS,
      bodyHtml: buildDetailedBodyHtml(groups, includeOpening),
      footerHtml: detailedFooterHtml(summary, includeOpening),
    }) + balanceNoteHtml(summary);

  exportAccountsReportToExcel({
    title: REPORT_NAME,
    filename: `Trial_Balance_Detailed_${meta.view}`,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
    landscape: true,
  });
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
  exportAccountsReportToPdf({
    title: REPORT_NAME,
    filename: "Trial_Balance_Normal",
    header: buildHeaderOptions(meta),
    columns: NORMAL_COLUMNS,
    bodyHtml: buildNormalBodyHtml(groups),
    footerHtml: normalFooterHtml(summary),
    footerNote: summary.isBalanced
      ? "Trial Balance is balanced"
      : `Trial Balance is not balanced — Opening Difference: ${formatMoney(summary.openingDifference)}; Period Difference: ${formatMoney(summary.periodDifference)}; Closing Difference: ${formatMoney(summary.closingDifference)}`,
    landscape: true,
  });
}

export function exportTrialBalanceDetailedToPdf(
  groups: TrialBalanceDetailedGroup[],
  meta: TrialBalanceExportMeta,
  summary: TrialBalanceSummary,
): void {
  const includeOpening = meta.includeOpeningBalance !== false;
  const tableHtml =
    buildTabularReportBodyHtml({
      columns: DETAILED_COLUMNS,
      bodyHtml: buildDetailedBodyHtml(groups, includeOpening),
      footerHtml: detailedFooterHtml(summary, includeOpening),
    }) + balanceNoteHtml(summary);

  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
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
