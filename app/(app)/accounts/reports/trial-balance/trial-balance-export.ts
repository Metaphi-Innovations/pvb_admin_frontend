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
import { flattenTrialBalanceNormalPrimaryHeadRows } from "./trial-balance-display";

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
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
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

function buildNormalBodyHtml(groups: TrialBalanceDetailedGroup[]): string {
  const flatRows = flattenTrialBalanceNormalPrimaryHeadRows(groups);
  const rows: HierarchyTabularRow[] = flatRows.map((row) => ({
    rowType: mapCoaLevelToRowType("primary"),
    label: row.primaryHead,
    amounts: [row.debit, row.credit],
    dashWhenZero: true,
  }));
  return buildHierarchyTabularBodyHtml(rows);
}

function buildDetailedBodyHtml(groups: TrialBalanceDetailedGroup[]): string {
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
    const primaryClosing = sectionGroups.reduce(
      (acc, g) => ({
        closingDebit: acc.closingDebit + g.closingDebit,
        closingCredit: acc.closingCredit + g.closingCredit,
      }),
      { closingDebit: 0, closingCredit: 0 },
    );

    rows.push({
      rowType: mapCoaLevelToRowType("primary"),
      label: primaryHead,
      amounts: [primaryClosing.closingDebit, primaryClosing.closingCredit],
      dashWhenZero: true,
    });

    for (const group of sectionGroups) {
      rows.push({
        rowType: mapCoaLevelToRowType("group"),
        label: group.groupName,
        amounts: [group.closingDebit, group.closingCredit],
        dashWhenZero: true,
      });

      for (const subgroup of group.subgroups) {
        rows.push({
          rowType: mapCoaLevelToRowType("subgroup"),
          label: subgroup.subgroupName,
          amounts: [subgroup.closingDebit, subgroup.closingCredit],
          dashWhenZero: true,
        });

        for (const ledger of subgroup.ledgers) {
          rows.push({
            rowType: mapCoaLevelToRowType("ledger"),
            label: ledger.ledgerName,
            amounts: [ledger.closingDebit, ledger.closingCredit],
            dashWhenZero: true,
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

function totalFooterHtml(summary: TrialBalanceSummary): string {
  return buildGrandTotalRowHtml({
    label: "TOTAL",
    amounts: [summary.totalDebit, summary.totalCredit],
    dashWhenZero: true,
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
      footerHtml: totalFooterHtml(summary),
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
  const tableHtml =
    buildTabularReportBodyHtml({
      columns: DETAILED_COLUMNS,
      bodyHtml: buildDetailedBodyHtml(groups),
      footerHtml: totalFooterHtml(summary),
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
    footerHtml: totalFooterHtml(summary),
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
  const tableHtml =
    buildTabularReportBodyHtml({
      columns: DETAILED_COLUMNS,
      bodyHtml: buildDetailedBodyHtml(groups),
      footerHtml: totalFooterHtml(summary),
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
