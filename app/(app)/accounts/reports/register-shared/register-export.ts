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
  warehouseFilter?: string;
  invoiceStatus: string;
  gstRate: string;
  gstType?: string;
  search: string;
}

export interface RegisterExportRow {
  [key: string]: string | number;
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
      { label: "Warehouse", value: meta.warehouseFilter ?? "All warehouses" },
      { label: "Invoice Status", value: meta.invoiceStatus },
      { label: "GST Type", value: meta.gstType ?? "All" },
      { label: "GST Rate", value: meta.gstRate },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

function buildSalesColumns(): ReportColumnHeader[] {
  return [
    { label: "Sr. No." },
    { label: "Invoice Date" },
    { label: "Invoice No." },
    { label: "Customer Code" },
    { label: "Customer Name" },
    { label: "GSTIN" },
    { label: "State" },
    { label: "Salesperson" },
    { label: "Taxable Amount (₹)", align: "right", className: "num" },
    { label: "CGST (₹)", align: "right", className: "num" },
    { label: "SGST (₹)", align: "right", className: "num" },
    { label: "IGST (₹)", align: "right", className: "num" },
    { label: "Discount (₹)", align: "right", className: "num" },
    { label: "Other Charges (₹)", align: "right", className: "num" },
    { label: "Invoice Total (₹)", align: "right", className: "num" },
    { label: "Payment Terms" },
    { label: "Status" },
  ];
}

function buildPurchaseColumns(partyHeader: string): ReportColumnHeader[] {
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

function buildSalesBody(rows: RegisterExportRow[], totals: RegisterReportTotals): string {
  const bodyHtml = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(String(r["Sr. No."]))}</td>
        <td>${escapeHtml(String(r["Invoice Date"]))}</td>
        <td class="mono">${escapeHtml(String(r["Invoice No."]))}</td>
        <td class="mono">${escapeHtml(String(r["Customer Code"] ?? ""))}</td>
        <td>${escapeHtml(String(r["Customer"] ?? r["Customer Name"] ?? ""))}</td>
        <td class="mono">${escapeHtml(String(r.GSTIN ?? ""))}</td>
        <td>${escapeHtml(String(r.State ?? ""))}</td>
        <td>${escapeHtml(String(r.Salesperson ?? "—"))}</td>
        <td class="num">${formatMoney(Number(r["Taxable Amount"] ?? 0))}</td>
        <td class="num">${formatMoney(Number(r.CGST ?? 0))}</td>
        <td class="num">${formatMoney(Number(r.SGST ?? 0))}</td>
        <td class="num">${formatMoney(Number(r.IGST ?? 0))}</td>
        <td class="num">${formatMoney(Number(r.Discount ?? 0))}</td>
        <td class="num">${formatMoney(Number(r["Other Charges"] ?? 0))}</td>
        <td class="num">${formatMoney(Number(r["Invoice Total"] ?? 0))}</td>
        <td>${escapeHtml(String(r["Payment Terms"] ?? "—"))}</td>
        <td>${escapeHtml(String(r.Status ?? ""))}</td>
      </tr>`,
    )
    .join("");

  const footerHtml = buildGrandTotalRowHtml({
    label: "Totals",
    labelColSpan: 8,
    amounts: [
      totals.taxableValue,
      totals.cgst,
      totals.sgst,
      totals.igst,
      totals.discount,
      totals.otherCharges,
      totals.grandTotal,
    ],
    trailingCellsHtml: "<td></td><td></td>",
  });

  const tableHtml = buildTabularReportBodyHtml({
    columns: buildSalesColumns(),
    bodyHtml,
    footerHtml,
  });

  const footerNote = `<p class="report-footer-note">
    Total Taxable: ₹ ${formatMoneyNumber(totals.taxableValue)} ·
    CGST: ₹ ${formatMoneyNumber(totals.cgst)} ·
    SGST: ₹ ${formatMoneyNumber(totals.sgst)} ·
    IGST: ₹ ${formatMoneyNumber(totals.igst)} ·
    Discount: ₹ ${formatMoneyNumber(totals.discount)} ·
    Invoice Value: ₹ ${formatMoneyNumber(totals.grandTotal)} ·
    ${totals.count} invoice(s)
  </p>`;

  return tableHtml + footerNote;
}

function buildPurchaseBody(
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
        <td>${escapeHtml(String(r[partyHeader] ?? ""))}</td>
        <td class="mono">${escapeHtml(String(r.GSTIN ?? ""))}</td>
        <td>${escapeHtml(String(r.State ?? ""))}</td>
        <td class="num">${formatMoney(Number(r["Taxable Value"] ?? 0))}</td>
        <td class="num">${formatMoney(Number(r["GST Amount"] ?? 0))}</td>
        <td class="num">${formatMoney(Number(r["Invoice Total"] ?? 0))}</td>
        <td>${escapeHtml(String(r["Payment Status"] ?? ""))}</td>
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
    columns: buildPurchaseColumns(partyHeader),
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
  mode: "sales" | "purchase" = "sales",
): Promise<void> {
  exportAccountsReportToExcel({
    title: meta.reportName,
    filename: filePrefix,
    header: buildHeaderOptions(meta),
    bodyHtml:
      mode === "sales"
        ? buildSalesBody(rows, totals)
        : buildPurchaseBody(rows, meta, totals),
    landscape: true,
  });
}

export function exportRegisterToPdf(
  rows: RegisterExportRow[],
  meta: RegisterExportMeta,
  totals: RegisterReportTotals,
  mode: "sales" | "purchase" = "sales",
): void {
  exportAccountsReportToPdf({
    title: meta.reportName,
    filename: meta.reportName.replace(/\s+/g, "_"),
    header: buildHeaderOptions(meta),
    bodyHtml:
      mode === "sales"
        ? buildSalesBody(rows, totals)
        : buildPurchaseBody(rows, meta, totals),
    landscape: true,
  });
}
