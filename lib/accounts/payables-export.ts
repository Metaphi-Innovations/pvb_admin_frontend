import { formatMoney, formatMoneyNumber } from "@/lib/accounts/money-format";
import type { SupplierInvoiceOutstandingRow, VendorAgeingRow } from "@/lib/accounts/payables-data";
import type { PaymentAllocationVendorRow } from "@/lib/accounts/payables-data";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportTabularReportToPdf,
  type ReportColumnHeader,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";

export interface PayablesExportMeta {
  reportName: string;
  financialYear: string;
  dateFrom?: string;
  dateTo?: string;
  asOnDate?: string;
  supplier: string;
  branch?: string;
  paymentStatus: string;
  search: string;
  ageingBuckets?: string;
}

function buildHeaderOptions(meta: PayablesExportMeta): ReportHeaderOptions {
  const filters: { label: string; value: string }[] = [
    { label: "Supplier", value: meta.supplier },
    ...(meta.branch ? [{ label: "Branch", value: meta.branch }] : []),
    { label: "Payment Status", value: meta.paymentStatus },
    { label: "Search", value: meta.search || "—" },
  ];
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

function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const OUTSTANDING_COLUMNS: ReportColumnHeader[] = [
  { label: "Supplier" },
  { label: "Code" },
  { label: "GSTIN" },
  { label: "Invoice No." },
  { label: "Invoice Date" },
  { label: "Due Date" },
  { label: "Bill Amount (₹)", align: "right", className: "num" },
  { label: "Paid (₹)", align: "right", className: "num" },
  { label: "Outstanding (₹)", align: "right", className: "num" },
  { label: "Overdue Days", align: "right", className: "num" },
  { label: "Status" },
];

function outstandingBodyHtml(rows: SupplierInvoiceOutstandingRow[]): string {
  return rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.vendorName)}</td>
      <td class="mono">${escapeHtml(r.vendorCode)}</td>
      <td class="mono">${escapeHtml(r.gstin)}</td>
      <td class="mono">${escapeHtml(r.invoiceNo)}</td>
      <td>${escapeHtml(r.invoiceDate)}</td>
      <td>${escapeHtml(r.dueDate)}</td>
      <td class="num">${formatMoneyNumber(r.billAmount)}</td>
      <td class="num">${formatMoneyNumber(r.paidAmount)}</td>
      <td class="num">${formatMoneyNumber(r.outstanding)}</td>
      <td class="num">${r.overdueDays}</td>
      <td>${escapeHtml(statusLabel(r.status))}</td>
    </tr>`,
    )
    .join("");
}

export async function exportSupplierOutstandingToExcel(
  rows: SupplierInvoiceOutstandingRow[],
  meta: PayablesExportMeta,
): Promise<void> {
  const tableHtml = buildStandardReportTableHtml({
    columns: OUTSTANDING_COLUMNS,
    bodyHtml: outstandingBodyHtml(rows),
  });
  const html = buildReportExcelDocumentHtml({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
    landscape: true,
  });
  downloadReportExcelHtml(html, `Supplier_Outstanding_${todayExportDateSuffix()}.xls`);
}

export function exportSupplierOutstandingToPdf(
  rows: SupplierInvoiceOutstandingRow[],
  meta: PayablesExportMeta,
): void {
  exportTabularReportToPdf({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    columns: OUTSTANDING_COLUMNS,
    bodyHtml: outstandingBodyHtml(rows),
    landscape: true,
  });
}

export async function exportSupplierAgeingToExcel(
  rows: VendorAgeingRow[],
  meta: PayablesExportMeta,
  bucketLabels: string[],
  visibleBucketIndices: number[],
): Promise<void> {
  const exportBucketLabels = visibleBucketIndices.map((i) => bucketLabels[i] ?? "");
  const columns: ReportColumnHeader[] = [
    { label: "Supplier" },
    { label: "Total Outstanding (₹)", align: "right", className: "num" },
    ...exportBucketLabels.map((label) => ({
      label: `${label} (₹)`,
      align: "right" as const,
      className: "num",
    })),
  ];

  const bodyHtml = rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.vendorName)}</td>
      <td class="num">${formatMoneyNumber(r.totalOutstanding)}</td>
      ${visibleBucketIndices
        .map((index) => `<td class="num">${formatMoneyNumber(r.buckets[index] ?? 0)}</td>`)
        .join("")}
    </tr>`,
    )
    .join("");

  const tableHtml = buildStandardReportTableHtml({ columns, bodyHtml });
  const html = buildReportExcelDocumentHtml({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
    landscape: columns.length > 5,
  });
  downloadReportExcelHtml(html, `Supplier_Ageing_${todayExportDateSuffix()}.xls`);
}

export function exportSupplierAgeingToPdf(
  rows: VendorAgeingRow[],
  meta: PayablesExportMeta,
  bucketLabels: string[],
  visibleBucketIndices: number[],
): void {
  const exportBucketLabels = visibleBucketIndices.map((i) => bucketLabels[i] ?? "");
  const columns: ReportColumnHeader[] = [
    { label: "Supplier" },
    { label: "Total Outstanding (₹)", align: "right", className: "num" },
    ...exportBucketLabels.map((label) => ({
      label: `${label} (₹)`,
      align: "right" as const,
      className: "num",
    })),
  ];

  const bodyHtml = rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.vendorName)}</td>
      <td class="num">${formatMoneyNumber(r.totalOutstanding)}</td>
      ${visibleBucketIndices
        .map((index) => `<td class="num">${formatMoneyNumber(r.buckets[index] ?? 0)}</td>`)
        .join("")}
    </tr>`,
    )
    .join("");

  exportTabularReportToPdf({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    columns,
    bodyHtml,
    landscape: columns.length > 5,
  });
}

const ALLOCATION_COLUMNS: ReportColumnHeader[] = [
  { label: "Supplier" },
  { label: "Code" },
  { label: "Total Outstanding (₹)", align: "right", className: "num" },
  { label: "Payment Available (₹)", align: "right", className: "num" },
  { label: "Unallocated Balance (₹)", align: "right", className: "num" },
  { label: "Status" },
];

function allocationBodyHtml(rows: PaymentAllocationVendorRow[]): string {
  return rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.vendorName)}</td>
      <td class="mono">${escapeHtml(r.vendorCode)}</td>
      <td class="num">${formatMoney(r.totalOutstanding)}</td>
      <td class="num">${formatMoney(r.totalPaymentAvailable)}</td>
      <td class="num">${formatMoney(r.unallocatedBalance)}</td>
      <td>${escapeHtml(statusLabel(r.status))}</td>
    </tr>`,
    )
    .join("");
}

export async function exportPaymentAllocationToExcel(
  rows: PaymentAllocationVendorRow[],
  meta: PayablesExportMeta,
): Promise<void> {
  const tableHtml = buildStandardReportTableHtml({
    columns: ALLOCATION_COLUMNS,
    bodyHtml: allocationBodyHtml(rows),
  });
  const html = buildReportExcelDocumentHtml({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    bodyHtml: tableHtml,
    landscape: true,
  });
  downloadReportExcelHtml(html, `Payment_Allocation_${todayExportDateSuffix()}.xls`);
}

export function exportPaymentAllocationToPdf(
  rows: PaymentAllocationVendorRow[],
  meta: PayablesExportMeta,
): void {
  exportTabularReportToPdf({
    title: meta.reportName,
    header: buildHeaderOptions(meta),
    columns: ALLOCATION_COLUMNS,
    bodyHtml: allocationBodyHtml(rows),
    landscape: true,
  });
}
