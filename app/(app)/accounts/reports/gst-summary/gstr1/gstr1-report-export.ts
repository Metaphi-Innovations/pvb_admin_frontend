import {
  escapeHtml,
  exportTabularReportToExcelHtml,
  exportTabularReportToPdf,
  formatExportAmount,
  todayExportDateSuffix,
  type ReportColumnHeader,
} from "@/lib/accounts/report-export-presentation";
import type { Gstr1ExportMeta, Gstr1Report, Gstr1SummaryRow } from "./gstr1-report-types";

const SUMMARY_COLUMNS: ReportColumnHeader[] = [
  { label: "Particulars" },
  { label: "Voucher Count", align: "right", className: "num" },
  { label: "Taxable Amount (₹)", align: "right", className: "num" },
  { label: "IGST (₹)", align: "right", className: "num" },
  { label: "CGST (₹)", align: "right", className: "num" },
  { label: "SGST (₹)", align: "right", className: "num" },
  { label: "Tax Amount (₹)", align: "right", className: "num" },
  { label: "Invoice Amount (₹)", align: "right", className: "num" },
];

function summaryRowToRecord(row: Gstr1SummaryRow): Record<string, string | number> {
  return {
    particulars: row.particulars,
    voucherCount: row.voucherCount,
    taxableAmount: row.taxableAmount,
    igst: row.igst,
    cgst: row.cgst,
    sgst: row.sgst,
    taxAmount: row.taxAmount,
    invoiceAmount: row.invoiceAmount,
  };
}

function buildExportHeaderHtml(meta: Gstr1ExportMeta): string {
  const { header, filterLabels } = meta;
  return `
    <div class="report-meta">
      <p><strong>Company:</strong> ${escapeHtml(header.companyName)}</p>
      <p><strong>GSTIN:</strong> ${escapeHtml(header.gstin)}</p>
      <p><strong>Report:</strong> ${escapeHtml(header.reportName)}</p>
      <p><strong>Financial Year:</strong> ${escapeHtml(header.financialYear)}</p>
      <p><strong>Return Period:</strong> ${escapeHtml(header.returnPeriod)}</p>
      <p><strong>Filing Status:</strong> ${escapeHtml(header.filingStatus)}</p>
      <p><strong>Filters:</strong> FY ${escapeHtml(filterLabels.financialYear)} · ${escapeHtml(filterLabels.gstPeriod)} · ${escapeHtml(filterLabels.dateFrom)} to ${escapeHtml(filterLabels.dateTo)} · ${escapeHtml(filterLabels.branch)} · ${escapeHtml(filterLabels.gstRegistration)}</p>
    </div>
  `;
}

function buildVoucherSummaryHtml(report: Gstr1Report): string {
  const vs = report.voucherSummary;
  return `
    <h3>Voucher Summary</h3>
    <table>
      <tr><td>Total Vouchers</td><td class="num">${vs.totalVouchers}</td></tr>
      <tr><td>Included in Return</td><td class="num">${vs.includedInReturn}</td></tr>
      <tr><td>Not Relevant</td><td class="num">${vs.notRelevant}</td></tr>
      <tr><td>Needs Review</td><td class="num">${vs.needsReview}</td></tr>
    </table>
  `;
}

function buildSummaryTableHtml(rows: Gstr1SummaryRow[]): string {
  const head = SUMMARY_COLUMNS.map((c) => `<th${c.align === "right" ? ' class="num"' : ""}>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const r = summaryRowToRecord(row);
      const isTotal = row.rowType === "total";
      const trClass = isTotal ? ' class="total-row"' : "";
      return `<tr${trClass}>
        <td>${escapeHtml(String(r.particulars))}</td>
        <td class="num">${r.voucherCount}</td>
        <td class="num">${formatExportAmount(r.taxableAmount as number)}</td>
        <td class="num">${formatExportAmount(r.igst as number)}</td>
        <td class="num">${formatExportAmount(r.cgst as number)}</td>
        <td class="num">${formatExportAmount(r.sgst as number)}</td>
        <td class="num">${formatExportAmount(r.taxAmount as number)}</td>
        <td class="num">${formatExportAmount(r.invoiceAmount as number)}</td>
      </tr>`;
    })
    .join("");
  return `<h3>GSTR-1 Summary</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function exportGstr1Report(
  report: Gstr1Report,
  meta: Gstr1ExportMeta,
  format: "excel" | "pdf",
): void {
  const filename = `GSTR-1_${todayExportDateSuffix()}.xls`;
  const content = `
    ${buildExportHeaderHtml(meta)}
    ${buildVoucherSummaryHtml(report)}
    ${buildSummaryTableHtml(report.sections)}
  `;

  const header = {
    reportTitle: "GSTR-1",
    financialYear: meta.filterLabels.financialYear,
    dateFrom: meta.filters.dateFrom,
    dateTo: meta.filters.dateTo,
    filters: [
      { label: "GSTIN", value: meta.header.gstin },
      { label: "GST Period", value: meta.filterLabels.gstPeriod },
      { label: "Branch", value: meta.filterLabels.branch },
      { label: "GST Registration", value: meta.filterLabels.gstRegistration },
      { label: "Filing Status", value: meta.header.filingStatus },
    ],
  };

  if (format === "excel") {
    exportTabularReportToExcelHtml({
      title: "GSTR-1",
      header,
      columns: SUMMARY_COLUMNS,
      bodyHtml: content,
      filename,
    });
    return;
  }

  exportTabularReportToPdf({
    title: "GSTR-1",
    header,
    columns: SUMMARY_COLUMNS,
    bodyHtml: content,
  });
}

export function exportGstr1InvoiceList(
  meta: Gstr1ExportMeta,
  sectionLabel: string,
  rows: Record<string, string | number>[],
  format: "excel" | "pdf",
): void {
  const columns: ReportColumnHeader[] = [
    { label: "Invoice Date" },
    { label: "Invoice Number" },
    { label: "Customer" },
    { label: "GSTIN" },
    { label: "Place of Supply" },
    { label: "Invoice Type" },
    { label: "Invoice Amount (₹)", align: "right", className: "num" },
    { label: "Taxable Amount (₹)", align: "right", className: "num" },
    { label: "GST Rate" },
    { label: "IGST (₹)", align: "right", className: "num" },
    { label: "CGST (₹)", align: "right", className: "num" },
    { label: "SGST (₹)", align: "right", className: "num" },
    { label: "Tax Amount (₹)", align: "right", className: "num" },
    { label: "Status" },
  ];

  const bodyHtml = rows
    .map((row) => {
      const keys = Object.keys(row);
      return `<tr>${columns
        .map((col, i) => {
          const key = keys[i];
          const raw = key ? row[key] : "";
          const align = col.align === "right" ? ' class="num"' : "";
          const value =
            typeof raw === "number" && col.className?.includes("num")
              ? formatExportAmount(raw)
              : escapeHtml(String(raw));
          return `<td${align}>${value}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");

  const header = {
    reportTitle: `GSTR-1 — ${sectionLabel}`,
    financialYear: meta.filterLabels.financialYear,
    dateFrom: meta.filters.dateFrom,
    dateTo: meta.filters.dateTo,
    filters: [
      { label: "GSTIN", value: meta.header.gstin },
      { label: "GST Period", value: meta.filterLabels.gstPeriod },
      { label: "Branch", value: meta.filterLabels.branch },
    ],
  };

  const filename = `GSTR1_${sectionLabel.replace(/\s+/g, "_")}_${todayExportDateSuffix()}.xls`;

  if (format === "excel") {
    exportTabularReportToExcelHtml({ title: header.reportTitle, header, columns, bodyHtml, filename });
  } else {
    exportTabularReportToPdf({
      title: header.reportTitle,
      header,
      columns,
      bodyHtml,
    });
  }
}
