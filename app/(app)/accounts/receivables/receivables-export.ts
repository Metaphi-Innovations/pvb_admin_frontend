import { formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildMetaRows,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportTabularReportToPdf,
  type ReportColumnHeader,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import { getReceivableStatusLabel, type ReceivableStatus } from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export interface ReceivablesExportMeta {
  reportName: string;
  financialYear?: string;
  dateFrom?: string;
  dateTo?: string;
  asOnDate?: string;
  customer?: string;
  branch?: string;
  status?: string;
  search?: string;
  ageingBuckets?: string;
}

function buildHeaderOptions(meta: ReceivablesExportMeta): ReportHeaderOptions {
  const filters: { label: string; value: string }[] = [];
  if (meta.customer) filters.push({ label: "Customer", value: meta.customer });
  if (meta.branch) filters.push({ label: "Branch", value: meta.branch });
  if (meta.status) filters.push({ label: "Status", value: meta.status });
  if (meta.search) filters.push({ label: "Search", value: meta.search || "—" });
  if (meta.ageingBuckets) filters.push({ label: "Ageing Buckets", value: meta.ageingBuckets });

  return {
    reportTitle: meta.reportName,
    financialYear: meta.financialYear,
    asOnDate: meta.asOnDate,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters,
  };
}

export async function exportReceivablesToExcel(
  rows: Record<string, string | number>[],
  meta: ReceivablesExportMeta,
  filePrefix: string,
  options?: { numericColumns?: string[]; footerRow?: Record<string, string | number> },
): Promise<void> {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const numericSet = new Set(options?.numericColumns ?? []);

  const bodyHtml = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const val = row[h];
          const display = val == null ? "" : String(val);
          const cls = numericSet.has(h) || h.includes("(₹)") || h.includes("Amount") ? "num" : "";
          return `<td class="${cls}">${escapeHtml(display)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const columns: ReportColumnHeader[] = headers.map((h) => ({
    label: h,
    align: numericSet.has(h) || h.includes("(₹)") || h.includes("Amount") ? "right" : "left",
    className: numericSet.has(h) || h.includes("(₹)") ? "num" : undefined,
  }));

  let footerHtml: string | undefined;
  if (options?.footerRow) {
    footerHtml = `<tr class="total">${headers
      .map((h, i) => {
        const val = options.footerRow![h];
        const display = val == null ? (i === 0 ? "Grand Total" : "") : String(val);
        const cls = numericSet.has(h) || h.includes("(₹)") ? "num" : "";
        return `<td class="${cls}"><strong>${escapeHtml(display)}</strong></td>`;
      })
      .join("")}</tr>`;
  }

  const tableHtml = buildStandardReportTableHtml({ columns, bodyHtml, footerHtml });
  const html = buildReportExcelDocumentHtml({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
    landscape: headers.length > 6,
  });
  downloadReportExcelHtml(html, `${filePrefix}_${todayExportDateSuffix()}.xls`);
}

export function exportReceivablesToPdf(
  headers: string[],
  rows: string[][],
  meta: ReceivablesExportMeta,
  options?: { numericColumnFrom?: number; footerRow?: string[] },
): void {
  const numericFrom = options?.numericColumnFrom ?? 5;

  const bodyHtml = rows
    .map(
      (cells) =>
        `<tr>${cells.map((c, i) => `<td class="${i >= numericFrom ? "num" : ""}">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");

  const columns: ReportColumnHeader[] = headers.map((h, i) => ({
    label: h,
    align: i >= numericFrom ? "right" : "left",
    className: i >= numericFrom ? "num" : undefined,
  }));

  let footerHtml: string | undefined;
  if (options?.footerRow) {
    footerHtml = `<tr class="total">${options.footerRow
      .map((c, i) => `<td class="${i >= numericFrom ? "num" : ""}"><strong>${escapeHtml(c)}</strong></td>`)
      .join("")}</tr>`;
  }

  exportTabularReportToPdf({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    columns,
    bodyHtml,
    footerHtml,
    landscape: headers.length > 6,
  });
}

export function formatExportStatus(status: ReceivableStatus): string {
  return getReceivableStatusLabel(status);
}

export function formatExportAmount(amount: number): string {
  return formatMoneyNumber(amount);
}

export function formatExportMoney(amount: number): string {
  return formatMoney(amount);
}

/** @deprecated Use buildHeaderOptions internally — kept for callers building xlsx meta sheets. */
export function receivablesMetaRows(meta: ReceivablesExportMeta): string[][] {
  return buildMetaRows(buildHeaderOptions(meta));
}
