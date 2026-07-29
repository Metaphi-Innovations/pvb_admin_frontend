import {
  escapeHtml,
  exportReportToExcelHtml,
  exportReportToPdf,
  formatExportAmount,
  todayExportDateSuffix,
  type ReportColumnHeader,
} from "@/lib/accounts/report-export-presentation";
import {
  resolveBranchFilterLabel,
  resolveFinancialYearLabel,
  resolveGstRegistrationLabel,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import type { AnnualGstReport } from "./annual-gst-summary-types";

function sectionHtml(title: string, columns: ReportColumnHeader[], bodyHtml: string): string {
  const head = columns
    .map((c) => {
      const align = c.align === "right" ? ' class="num"' : "";
      return `<th${align}>${escapeHtml(c.label)}</th>`;
    })
    .join("");
  return `
    <h3 style="margin:18px 0 8px;font-size:13px;">${escapeHtml(title)}</h3>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

function moneyRowHtml(cells: (string | number)[]): string {
  return `<tr>${cells
    .map((c) => {
      if (typeof c === "number") {
        return `<td class="num">${formatExportAmount(c)}</td>`;
      }
      return `<td>${escapeHtml(String(c))}</td>`;
    })
    .join("")}</tr>`;
}

export function exportAnnualGstSummaryReport(
  report: AnnualGstReport,
  filters: GstReportFilters,
  format: "excel" | "pdf",
): void {
  const header = {
    reportTitle: "Annual GST Summary",
    financialYear: resolveFinancialYearLabel(filters.financialYearId),
    filters: [
      { label: "Company", value: COMPANY_BILLING.companyName },
      {
        label: "GSTIN",
        value:
          filters.gstRegistration !== "all"
            ? filters.gstRegistration
            : COMPANY_BILLING.gstNumber,
      },
      { label: "Branch", value: resolveBranchFilterLabel(filters.branch) },
      {
        label: "GST Registration",
        value: resolveGstRegistrationLabel(filters.gstRegistration),
      },
    ],
  };

  const s = report.summary;
  const cardsHtml = sectionHtml(
    "Annual Summary",
    [
      { label: "Metric" },
      { label: "Amount (₹)", align: "right", className: "num" },
    ],
    [
      ["Total Taxable Outward", s.totalTaxableOutward],
      ["Total Taxable Inward", s.totalTaxableInward],
      ["Total Output GST", s.totalOutputGst],
      ["Total Input GST", s.totalInputGst],
      [
        s.isRefundable ? "Net GST Refundable" : "Net GST Payable",
        s.netGstPayableOrRefundable,
      ],
      ["Total Credit Notes", s.totalCreditNotes],
      ["Total Debit Notes", s.totalDebitNotes],
      ["Total GST Liability", s.totalGstLiability],
    ]
      .map(([a, b]) => moneyRowHtml([a as string, b as number]))
      .join(""),
  );

  const monthlyCols: ReportColumnHeader[] = [
    { label: "Month" },
    { label: "Sales Value", align: "right", className: "num" },
    { label: "Purchase Value", align: "right", className: "num" },
    { label: "Output CGST", align: "right", className: "num" },
    { label: "Output SGST", align: "right", className: "num" },
    { label: "Output IGST", align: "right", className: "num" },
    { label: "Input CGST", align: "right", className: "num" },
    { label: "Input SGST", align: "right", className: "num" },
    { label: "Input IGST", align: "right", className: "num" },
    { label: "Net GST", align: "right", className: "num" },
  ];

  const monthlyBody = report.months
    .map((m) =>
      moneyRowHtml([
        m.monthLabel,
        m.salesValue,
        m.purchaseValue,
        m.outputCgst,
        m.outputSgst,
        m.outputIgst,
        m.inputCgst,
        m.inputSgst,
        m.inputIgst,
        m.netGst,
      ]),
    )
    .join("");

  const particularCols: ReportColumnHeader[] = [
    { label: "Particular" },
    { label: "Taxable Value", align: "right", className: "num" },
    { label: "GST Amount", align: "right", className: "num" },
  ];

  const outwardBody = report.outwardAnnual
    .map((row) => moneyRowHtml([row.particular, row.taxableValue, row.gstAmount]))
    .join("");
  const inwardBody = report.inwardAnnual
    .map((row) => moneyRowHtml([row.particular, row.taxableValue, row.gstAmount]))
    .join("");

  const positionHtml = sectionHtml(
    "Annual GST Position",
    [
      { label: "Particular" },
      { label: "Amount (₹)", align: "right", className: "num" },
    ],
    [
      moneyRowHtml(["Output GST", report.outputGst]),
      moneyRowHtml(["Less: Input GST", report.inputGst]),
      moneyRowHtml([
        report.isRefundable ? "Net GST Refundable" : "Net GST Payable",
        Math.abs(report.netGst),
      ]),
    ].join(""),
  );

  const bodyHtml = [
    cardsHtml,
    sectionHtml("Monthly GST Summary", monthlyCols, monthlyBody),
    sectionHtml("Annual Outward Supply Summary", particularCols, outwardBody),
    sectionHtml("Annual Inward Supply Summary", particularCols, inwardBody),
    positionHtml,
  ].join("");

  const filename = `Annual_GST_Summary_${todayExportDateSuffix()}.xls`;
  const doc = {
    title: "Annual GST Summary",
    header,
    bodyHtml,
  };

  if (format === "excel") {
    exportReportToExcelHtml(doc, filename);
  } else {
    exportReportToPdf(doc);
  }
}
