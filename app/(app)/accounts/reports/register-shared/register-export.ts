import { formatMoney, formatMoneyNumber } from "@/lib/accounts/money-format";
import type { RegisterReportTotals } from "./register-types";
import {
  buildGrandTotalRowHtml,
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  escapeHtml,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";

export interface RegisterExportMeta {
  reportName: string;
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  partyLabel: string;
  partyFilter: string;
  branchFilter?: string;
  invoiceStatus: string;
  gstRate: string;
  search: string;
}

export interface RegisterExportRow {
  "Invoice Date": string;
  "Invoice No.": string;
  [key: string]: string | number;
  GSTIN: string;
  State: string;
  "Taxable Value": number;
  "GST Amount": number;
  "Invoice Total": number;
  "Payment Status": string;
}

function buildHeaderOptions(meta: RegisterExportMeta): ReportHeaderOptions {
  return {
    reportTitle: meta.reportName,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: meta.partyLabel, value: meta.partyFilter },
      { label: "Branch", value: meta.branchFilter ?? "All branches" },
      { label: "Invoice Status", value: meta.invoiceStatus },
      { label: "GST Rate", value: meta.gstRate },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

function buildColumns(partyHeader: string): ReportColumnHeader[] {
  return [
    { label: "Invoice Date" },
    { label: "Invoice No." },
    { label: partyHeader },
    { label: "GSTIN" },
    { label: "State" },
    { label: "Taxable Value (₹)", align: "right", className: "num" },
    { label: "GST Amount (₹)", align: "right", className: "num" },
    { label: "Invoice Total (₹)", align: "right", className: "num" },
    { label: "Payment Status" },
  ];
}

function buildRegisterBody(
  rows: RegisterExportRow[],
  meta: RegisterExportMeta,
  totals: RegisterReportTotals,
): string {
  const partyHeader = meta.partyLabel;
  const bodyHtml = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(String(r["Invoice Date"]))}</td>
        <td class="mono">${escapeHtml(String(r["Invoice No."]))}</td>
        <td>${escapeHtml(String(r[partyHeader]))}</td>
        <td class="mono">${escapeHtml(String(r.GSTIN))}</td>
        <td>${escapeHtml(String(r.State))}</td>
        <td class="num">${formatMoney(r["Taxable Value"])}</td>
        <td class="num">${formatMoney(r["GST Amount"])}</td>
        <td class="num">${formatMoney(r["Invoice Total"])}</td>
        <td>${escapeHtml(String(r["Payment Status"]))}</td>
      </tr>`,
    )
    .join("");

  const footerHtml = buildGrandTotalRowHtml({
    label: "Grand Total",
    labelColSpan: 5,
    amounts: [totals.taxableValue, totals.gstAmount, totals.grandTotal],
    trailingCellsHtml: "<td></td>",
  });

  const tableHtml = buildTabularReportBodyHtml({
    columns: buildColumns(partyHeader),
    bodyHtml,
    footerHtml,
  });

  const footerNote = `<p class="report-footer-note">
    Total Taxable Value: ₹ ${formatMoneyNumber(totals.taxableValue)} ·
    Total GST: ₹ ${formatMoneyNumber(totals.gstAmount)} ·
    Grand Total: ₹ ${formatMoneyNumber(totals.grandTotal)} ·
    ${totals.count} invoice(s)
  </p>`;

  return tableHtml + footerNote;
}

export async function exportRegisterToExcel(
  rows: RegisterExportRow[],
  meta: RegisterExportMeta,
  totals: RegisterReportTotals,
  filePrefix: string,
): Promise<void> {
  exportAccountsReportToExcel({
    title: meta.reportName,
    filename: filePrefix,
    header: buildHeaderOptions(meta),
    bodyHtml: buildRegisterBody(rows, meta, totals),
    landscape: true,
  });
}

export function exportRegisterToPdf(
  rows: RegisterExportRow[],
  meta: RegisterExportMeta,
  totals: RegisterReportTotals,
): void {
  exportAccountsReportToPdf({
    title: meta.reportName,
    filename: meta.reportName.replace(/\s+/g, "_"),
    header: buildHeaderOptions(meta),
    bodyHtml: buildRegisterBody(rows, meta, totals),
    landscape: true,
  });
}
