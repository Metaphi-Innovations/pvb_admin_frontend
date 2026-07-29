import type { CoaLedgerListingRow, CoaListingRow } from "./coa-listing-data";

import type { CoaLedgerDetailRow } from "./coa-demo-accounting";

import type { ChartOfAccount } from "../../data";

import { formatBalanceAmount, balanceSideLabel } from "@/lib/accounts/money-format";

import { resolveDrCrColumnSide } from "@/lib/accounts/running-balance";

import { isoToDisplayDate } from "@/lib/accounts/date-display";

import {

  buildReportDocumentHtml,

  buildStandardReportTableHtml,

  escapeHtml,

  exportTabularReportToPdf,

  formatExportAmount,

  openReportPrintWindow,

  todayExportDateSuffix,

  type ReportColumnHeader,

  type ReportHeaderOptions,

} from "@/lib/accounts/report-export-presentation";

import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";



/** Escape a single CSV cell value: wrap in quotes and escape inner quotes. */
function csvCell(value: string | number): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Build a CSV string from headers and rows. */
function buildCsv(headers: string[], rows: string[][]): string {
  const lines: string[] = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n"); // BOM so Excel opens UTF-8 correctly
}

/** Trigger a CSV file download in the browser. */
function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Trigger a PDF file download from a Blob received from the backend. */
function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}



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

  const headers = [
    "Ledger Name",
    "Ledger Code",
    "Parent Group",
    "Source",
    "Opening Balance",
    "Current Balance",
    "Status",
  ];

  const dataRows: string[][] = rows.map((r) => [
    r.ledger.accountName,
    r.ledger.accountCode,
    r.parentGroupName || "",
    r.source,
    formatBalance(r.openingAmount, r.openingSide),
    formatBalance(r.currentAmount, r.currentSide),
    r.ledger.status === "active" ? "Active" : "Inactive",
  ]);

  const csv = buildCsv(headers, dataRows);
  const safeGroup = meta.groupName.replace(/[^\w]+/g, "_").slice(0, 40);
  downloadCsv(csv, `COA_Ledgers_${safeGroup}_${todayExportDateSuffix()}.csv`);

}



export async function exportCoaLedgerListingToPdf(

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



  const htmlContent = buildReportDocumentHtml({

    title: `Ledger Listing — ${meta.groupName}`,

    header: buildLedgerListingHeaderOptions(meta),

    bodyHtml: buildStandardReportTableHtml({ columns: LEDGER_LISTING_COLUMNS, bodyHtml }),

    landscape: true,

  });



  const safeGroup = meta.groupName.replace(/[^\w]+/g, "_").slice(0, 40);
  const filename = `COA_Ledgers_${safeGroup}_${todayExportDateSuffix()}.pdf`;

  const pdfBlob = await ChartOfAccountsService.generateCoaPdf({ htmlContent, filename, landscape: true });
  downloadPdfBlob(pdfBlob, filename);

}



export async function exportCoaListingToExcel(

  rows: CoaListingRow[],

  meta: CoaExportMeta,

): Promise<void> {

  // Determine maximum hierarchy depth for dynamic level columns
  let maxLevels = 1;
  for (const r of rows) {
    const parts = r.hierarchyPath ? r.hierarchyPath.split(" → ") : [];
    if (parts.length > maxLevels) maxLevels = parts.length;
  }

  // Build header row: Ledger Code, Level 1 … Level N, balances
  const levelHeaders: string[] = [];
  for (let i = 1; i <= maxLevels; i++) levelHeaders.push(`Level ${i}`);

  const headers = [
    "Ledger Code",
    ...levelHeaders,
    "Opening Balance",
    "Debit (INR)",
    "Credit (INR)",
    "Closing Balance",
  ];

  const dataRows: string[][] = rows.map((r) => {
    const parts = r.hierarchyPath ? r.hierarchyPath.split(" → ") : [];
    const levelCells: string[] = [];
    for (let i = 0; i < maxLevels; i++) levelCells.push(parts[i] || "");

    return [
      r.node.accountCode,
      ...levelCells,
      formatBalance(r.openingAmount, r.openingSide),
      r.periodDebit > 0 ? String(r.periodDebit) : "0",
      r.periodCredit > 0 ? String(r.periodCredit) : "0",
      formatBalance(r.closingAmount, r.closingSide),
    ];
  });

  const csv = buildCsv(headers, dataRows);
  downloadCsv(csv, `Chart_of_Accounts_${todayExportDateSuffix()}.csv`);

}



export async function exportCoaListingToPdf(rows: CoaListingRow[], meta: CoaExportMeta): Promise<void> {

  let maxLevels = 1;

  for (const r of rows) {

    const parts = r.hierarchyPath ? r.hierarchyPath.split(" → ") : [];

    if (parts.length > maxLevels) {

      maxLevels = parts.length;

    }

  }



  const levelColumns: ReportColumnHeader[] = [];

  for (let i = 1; i <= maxLevels; i++) {

    levelColumns.push({ label: `Level ${i}` });

  }



  const columns: ReportColumnHeader[] = [

    { label: "Ledger Code" },

    ...levelColumns,

    { label: "Opening Balance", align: "right", className: "num" },

    { label: "Debit (₹)", align: "right", className: "num" },

    { label: "Credit (₹)", align: "right", className: "num" },

    { label: "Closing Balance", align: "right", className: "num" },

  ];



  const bodyHtml = rows

    .map((r) => {

      const parts = r.hierarchyPath ? r.hierarchyPath.split(" → ") : [];

      let levelCellsHtml = "";

      for (let i = 0; i < maxLevels; i++) {

        levelCellsHtml += `<td>${escapeHtml(parts[i] || "")}</td>`;

      }



      return `<tr>

        <td class="mono">${escapeHtml(r.node.accountCode)}</td>

        ${levelCellsHtml}

        <td class="num">${escapeHtml(formatBalance(r.openingAmount, r.openingSide))}</td>

        <td class="num">${r.periodDebit > 0 ? r.periodDebit.toLocaleString("en-IN") : "—"}</td>

        <td class="num">${r.periodCredit > 0 ? r.periodCredit.toLocaleString("en-IN") : "—"}</td>

        <td class="num">${escapeHtml(formatBalance(r.closingAmount, r.closingSide))}</td>

      </tr>`;

    })

    .join("");



  const htmlContent = buildReportDocumentHtml({

    title: REPORT_NAME,

    header: buildCoaListingHeaderOptions(meta),

    bodyHtml: buildStandardReportTableHtml({ columns, bodyHtml }),

    landscape: true,

  });



  const filename = `Chart_of_Accounts_${todayExportDateSuffix()}.pdf`;
  const pdfBlob = await ChartOfAccountsService.generateCoaPdf({ htmlContent, filename, landscape: true });
  downloadPdfBlob(pdfBlob, filename);

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

  const headers = [
    "Date",
    "Voucher Type",
    "Voucher No.",
    "Particulars",
    "Debit (INR)",
    "Credit (INR)",
    "Balance (INR)",
    "Dr/Cr",
    "Narration",
  ];

  const dataRows: string[][] = rows.map((r) => {
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
        : "";

    return [
      formatLedgerRowDate(r.date),
      r.voucherType,
      r.voucherNo,
      r.isOpeningRow ? "Opening Balance" : r.partyName || r.narration || "",
      r.debit > 0 ? String(r.debit) : "0",
      r.credit > 0 ? String(r.credit) : "0",
      r.runningBalance > 0 ? String(r.runningBalance) : "0",
      drCr,
      r.narration || "",
    ];
  });

  const csv = buildCsv(headers, dataRows);
  const safeName = meta.ledger.accountName.replace(/[^\w]+/g, "_").slice(0, 40);
  downloadCsv(csv, `Ledger_${safeName}_${todayExportDateSuffix()}.csv`);

}



export async function exportCoaLedgerStatementToPdf(

  rows: CoaLedgerDetailRow[],

  meta: CoaLedgerExportMeta,

): Promise<void> {

  const htmlContent = buildReportDocumentHtml({

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
  const filename = `Ledger_${safeName}_${todayExportDateSuffix()}.pdf`;

  const pdfBlob = await ChartOfAccountsService.generateCoaPdf({ htmlContent, filename, landscape: true });
  downloadPdfBlob(pdfBlob, filename);

}


