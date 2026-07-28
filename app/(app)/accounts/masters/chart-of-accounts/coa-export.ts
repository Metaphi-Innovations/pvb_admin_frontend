import type { CoaLedgerListingRow, CoaListingRow } from "./coa-listing-data";

import type { CoaLedgerDetailRow } from "./coa-demo-accounting";

import type { ChartOfAccount } from "../../data";

import { formatBalanceAmount, balanceSideLabel } from "@/lib/accounts/money-format";

import { resolveDrCrColumnSide } from "@/lib/accounts/running-balance";

import { isoToDisplayDate } from "@/lib/accounts/date-display";

import {

  buildReportDocumentHtml,

  buildReportExcelDocumentHtml,

  buildStandardReportTableHtml,

  downloadReportExcelHtml,

  escapeHtml,

  exportTabularReportToPdf,

  formatExportAmount,

  openReportPrintWindow,

  todayExportDateSuffix,

  type ReportColumnHeader,

  type ReportHeaderOptions,

} from "@/lib/accounts/report-export-presentation";



const REPORT_NAME = "Chart of Accounts";



export interface CoaExportMeta {

  dateFrom: string;

  dateTo: string;

}



export interface CoaLedgerListingExportMeta {

  groupName: string;

}



function formatBalance(amount: number, side: "Debit" | "Credit"): string {

  if (amount <= 0) return "—";

  return `${amount.toLocaleString("en-IN")} ${side === "Debit" ? "Dr" : "Cr"}`;

}



function buildCoaListingHeaderOptions(meta: CoaExportMeta): ReportHeaderOptions {

  return {

    reportTitle: REPORT_NAME,

    dateFrom: meta.dateFrom,

    dateTo: meta.dateTo,

  };

}



function buildLedgerListingHeaderOptions(meta: CoaLedgerListingExportMeta): ReportHeaderOptions {

  return {

    reportTitle: "Chart of Accounts — Ledger Listing",

    filters: [{ label: "Accounting Group", value: meta.groupName }],

  };

}



const LEDGER_LISTING_COLUMNS: ReportColumnHeader[] = [

  { label: "Ledger Name" },

  { label: "Ledger Code" },

  { label: "Parent Group" },

  { label: "Source" },

  { label: "Opening Balance", align: "right", className: "num" },

  { label: "Current Balance", align: "right", className: "num" },

  { label: "Status" },

];



const COA_LISTING_COLUMNS: ReportColumnHeader[] = [

  { label: "Ledger Code" },

  { label: "Ledger Name" },

  { label: "Opening Balance", align: "right", className: "num" },

  { label: "Debit (₹)", align: "right", className: "num" },

  { label: "Credit (₹)", align: "right", className: "num" },

  { label: "Closing Balance", align: "right", className: "num" },

];



export async function exportCoaLedgerListingToExcel(

  rows: CoaLedgerListingRow[],

  meta: CoaLedgerListingExportMeta,

): Promise<void> {

  const bodyHtml = rows

    .map(

      (r) => `<tr>

        <td>${escapeHtml(r.ledger.accountName)}</td>

        <td class="mono">${escapeHtml(r.ledger.accountCode)}</td>

        <td>${escapeHtml(r.parentGroupName || "—")}</td>

        <td>${escapeHtml(r.source)}</td>

        <td class="num">${escapeHtml(formatBalance(r.openingAmount, r.openingSide))}</td>

        <td class="num">${escapeHtml(formatBalance(r.currentAmount, r.currentSide))}</td>

        <td>${r.ledger.status === "active" ? "Active" : "Inactive"}</td>

      </tr>`,

    )

    .join("");



  const html = buildReportExcelDocumentHtml({

    title: `Ledger Listing — ${meta.groupName}`,

    header: buildLedgerListingHeaderOptions(meta),

    bodyHtml: buildStandardReportTableHtml({ columns: LEDGER_LISTING_COLUMNS, bodyHtml }),

    landscape: true,

  });



  const safeGroup = meta.groupName.replace(/[^\w]+/g, "_").slice(0, 40);

  downloadReportExcelHtml(html, `COA_Ledgers_${safeGroup}_${todayExportDateSuffix()}.xls`);

}



export function exportCoaLedgerListingToPdf(

  rows: CoaLedgerListingRow[],

  meta: CoaLedgerListingExportMeta,

): void {

  const bodyHtml = rows

    .map(

      (r) => `<tr>

        <td>${escapeHtml(r.ledger.accountName)}</td>

        <td class="mono">${escapeHtml(r.ledger.accountCode)}</td>

        <td>${escapeHtml(r.parentGroupName || "—")}</td>

        <td>${escapeHtml(r.source)}</td>

        <td class="num">${escapeHtml(formatBalance(r.openingAmount, r.openingSide))}</td>

        <td class="num">${escapeHtml(formatBalance(r.currentAmount, r.currentSide))}</td>

        <td>${r.ledger.status === "active" ? "Active" : "Inactive"}</td>

      </tr>`,

    )

    .join("");



  exportTabularReportToPdf({

    title: `Ledger Listing — ${meta.groupName}`,

    header: buildLedgerListingHeaderOptions(meta),

    columns: LEDGER_LISTING_COLUMNS,

    bodyHtml,

    landscape: true,

  });

}



export async function exportCoaListingToExcel(

  rows: CoaListingRow[],

  meta: CoaExportMeta,

): Promise<void> {

  const bodyHtml = rows

    .map(

      (r) => `<tr>

        <td class="mono">${escapeHtml(r.node.accountCode)}</td>

        <td>${escapeHtml(r.node.accountName)}</td>

        <td class="num">${escapeHtml(formatBalance(r.openingAmount, r.openingSide))}</td>

        <td class="num">${r.periodDebit > 0 ? r.periodDebit.toLocaleString("en-IN") : "—"}</td>

        <td class="num">${r.periodCredit > 0 ? r.periodCredit.toLocaleString("en-IN") : "—"}</td>

        <td class="num">${escapeHtml(formatBalance(r.closingAmount, r.closingSide))}</td>

      </tr>`,

    )

    .join("");



  const html = buildReportExcelDocumentHtml({

    title: REPORT_NAME,

    header: buildCoaListingHeaderOptions(meta),

    bodyHtml: buildStandardReportTableHtml({ columns: COA_LISTING_COLUMNS, bodyHtml }),

    landscape: true,

  });

  downloadReportExcelHtml(html, `Chart_of_Accounts_${todayExportDateSuffix()}.xls`);

}



export function exportCoaListingToPdf(rows: CoaListingRow[], meta: CoaExportMeta): void {

  const bodyHtml = rows

    .map(

      (r) => `<tr>

        <td class="mono">${escapeHtml(r.node.accountCode)}</td>

        <td>${escapeHtml(r.node.accountName)}</td>

        <td class="num">${escapeHtml(formatBalance(r.openingAmount, r.openingSide))}</td>

        <td class="num">${r.periodDebit > 0 ? r.periodDebit.toLocaleString("en-IN") : "—"}</td>

        <td class="num">${r.periodCredit > 0 ? r.periodCredit.toLocaleString("en-IN") : "—"}</td>

        <td class="num">${escapeHtml(formatBalance(r.closingAmount, r.closingSide))}</td>

      </tr>`,

    )

    .join("");



  exportTabularReportToPdf({

    title: REPORT_NAME,

    header: buildCoaListingHeaderOptions(meta),

    columns: COA_LISTING_COLUMNS,

    bodyHtml,

    landscape: true,

  });

}



export interface CoaLedgerExportMeta {

  ledger: ChartOfAccount;

  parentGroup: string;

  dateFrom: string;

  dateTo: string;

  openingAmount: number;

  openingSide: "Debit" | "Credit";

  closingAmount: number;

  closingSide: "Debit" | "Credit";

}



function formatLedgerRowDate(iso: string): string {

  return iso ? isoToDisplayDate(iso) : "—";

}



function buildLedgerStatementHeaderOptions(meta: CoaLedgerExportMeta): ReportHeaderOptions {

  return {

    reportTitle: `Ledger Statement — ${meta.ledger.accountName}`,

    dateFrom: meta.dateFrom,

    dateTo: meta.dateTo,

    filters: [

      { label: "Ledger Code", value: meta.ledger.accountCode },

      { label: "Parent Group", value: meta.parentGroup },

      { label: "Opening Balance", value: formatBalanceAmount(meta.openingAmount, meta.openingSide) },

      { label: "Closing Balance", value: formatBalanceAmount(meta.closingAmount, meta.closingSide) },

    ],

  };

}



const LEDGER_STATEMENT_COLUMNS: ReportColumnHeader[] = [

  { label: "Date" },

  { label: "Voucher Type" },

  { label: "Voucher No." },

  { label: "Particulars" },

  { label: "Debit (₹)", align: "right", className: "num" },

  { label: "Credit (₹)", align: "right", className: "num" },

  { label: "Balance (₹)", align: "right", className: "num" },

  { label: "Dr/Cr", align: "center", className: "center" },

  { label: "Narration" },

];



function buildLedgerStatementRowsHtml(rows: CoaLedgerDetailRow[]): string {

  return rows

    .map((r) => {

      const drCr =

        r.runningBalance > 0

          ? balanceSideLabel(

              resolveDrCrColumnSide({

                debit: r.debit,

                credit: r.credit,

                runningBalanceType: r.runningBalanceType,

                isBalanceRow: Boolean(r.isOpeningRow),

              }),

            )

          : "—";

      return `<tr>

        <td>${escapeHtml(formatLedgerRowDate(r.date))}</td>

        <td>${escapeHtml(r.voucherType)}</td>

        <td class="mono">${escapeHtml(r.voucherNo)}</td>

        <td>${escapeHtml(r.isOpeningRow ? "Opening Balance" : r.partyName || r.narration || "—")}</td>

        <td class="num">${r.debit > 0 ? formatExportAmount(r.debit) : "—"}</td>

        <td class="num">${r.credit > 0 ? formatExportAmount(r.credit) : "—"}</td>

        <td class="num">${r.runningBalance > 0 ? formatExportAmount(r.runningBalance) : "—"}</td>

        <td class="center">${escapeHtml(drCr)}</td>

        <td>${escapeHtml(r.narration || "—")}</td>

      </tr>`;

    })

    .join("");

}



export async function exportCoaLedgerStatementToExcel(

  rows: CoaLedgerDetailRow[],

  meta: CoaLedgerExportMeta,

): Promise<void> {

  const html = buildReportExcelDocumentHtml({

    title: `Ledger Statement — ${meta.ledger.accountName}`,

    header: buildLedgerStatementHeaderOptions(meta),

    bodyHtml: buildStandardReportTableHtml({

      columns: LEDGER_STATEMENT_COLUMNS,

      bodyHtml: buildLedgerStatementRowsHtml(rows),

    }),

    landscape: true,

    compact: true,

  });



  const safeName = meta.ledger.accountName.replace(/[^\w]+/g, "_").slice(0, 40);

  downloadReportExcelHtml(html, `Ledger_${safeName}_${todayExportDateSuffix()}.xls`);

}



export function exportCoaLedgerStatementToPdf(

  rows: CoaLedgerDetailRow[],

  meta: CoaLedgerExportMeta,

): void {

  const html = buildReportDocumentHtml({

    title: `Ledger Statement — ${meta.ledger.accountName}`,

    header: buildLedgerStatementHeaderOptions(meta),

    bodyHtml: buildStandardReportTableHtml({

      columns: LEDGER_STATEMENT_COLUMNS,

      bodyHtml: buildLedgerStatementRowsHtml(rows),

    }),

    landscape: true,

    compact: true,

  });

  openReportPrintWindow(html);

}


