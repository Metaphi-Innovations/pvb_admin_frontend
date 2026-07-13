import {
  escapeHtml,
  exportTabularReportToExcelHtml,
  exportTabularReportToPdf,
  formatExportAmount,
  todayExportDateSuffix,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-presentation";
import {
  resolveBranchFilterLabel,
  resolveFinancialYearLabel,
  resolveGstPeriodLabel,
  resolveGstRegistrationLabel,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";

export interface GstReportExportMeta {
  reportTitle: string;
  filters: GstReportFilters;
}

function buildHeaderOptions(meta: GstReportExportMeta): ReportHeaderOptions {
  const { filters } = meta;
  return {
    reportTitle: meta.reportTitle,
    financialYear: resolveFinancialYearLabel(filters.financialYearId),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    filters: [
      { label: "GST Period", value: resolveGstPeriodLabel(filters.gstPeriod) },
      { label: "Branch", value: resolveBranchFilterLabel(filters.branch) },
      { label: "GST Registration", value: resolveGstRegistrationLabel(filters.gstRegistration) },
    ],
  };
}

function buildBodyHtml(
  columns: ReportColumnHeader[],
  rows: Record<string, string | number>[],
): string {
  const keys = columns.map((_, i) => {
    const sample = rows[0];
    if (!sample) return `col${i}`;
    return Object.keys(sample)[i] ?? `col${i}`;
  });

  return rows
    .map((row) => {
      const cells = columns
        .map((col, i) => {
          const key = Object.keys(row)[i];
          const raw = key ? row[key] : "";
          const align = col.align === "right" ? ' class="num"' : "";
          const value =
            typeof raw === "number" && col.className?.includes("num")
              ? formatExportAmount(raw)
              : escapeHtml(String(raw));
          return `<td${align}>${value}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
}

export function exportGstTabularReport(
  meta: GstReportExportMeta,
  columns: ReportColumnHeader[],
  rows: Record<string, string | number>[],
  format: "excel" | "pdf",
): void {
  const header = buildHeaderOptions(meta);
  const bodyHtml = buildBodyHtml(columns, rows);
  const filename = `${meta.reportTitle.replace(/\s+/g, "_")}_${todayExportDateSuffix()}.xls`;

  if (format === "excel") {
    exportTabularReportToExcelHtml({
      title: meta.reportTitle,
      header,
      columns,
      bodyHtml,
      filename,
    });
  } else {
    exportTabularReportToPdf({
      title: meta.reportTitle,
      header,
      columns,
      bodyHtml,
    });
  }
}
