import { formatMoney, formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  escapeHtml,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import {
  formatCellDisplay,
  getVisibleColumnDefs,
  type PurchaseRegisterColKey,
} from "./purchase-register-columns";
import { formatPurchaseRegisterDate } from "./purchase-register-data";
import type { PurchaseRegisterRow, PurchaseRegisterTotals } from "./purchase-register-types";
import {
  DOCUMENT_TYPE_LABELS,
  GSTR2B_STATUS_LABELS,
  ITC_ELIGIBILITY_LABELS,
  PURCHASE_TYPE_LABELS,
  RCM_LIABILITY_LABELS,
  VOUCHER_STATUS_LABELS,
} from "./purchase-register-types";

export interface PurchaseRegisterExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  supplierFilter: string;
  branchFilter: string;
  purchaseTypeFilter: string;
  rcmFilter: string;
  itcFilter: string;
  gstr2bFilter: string;
  voucherStatusFilter: string;
  search: string;
}

const LABEL_MAPS = {
  purchaseType: PURCHASE_TYPE_LABELS as Record<string, string>,
  documentType: DOCUMENT_TYPE_LABELS as Record<string, string>,
  itc: ITC_ELIGIBILITY_LABELS as Record<string, string>,
  gstr2b: GSTR2B_STATUS_LABELS as Record<string, string>,
  rcmLiability: RCM_LIABILITY_LABELS as Record<string, string>,
  voucherStatus: VOUCHER_STATUS_LABELS as Record<string, string>,
};

const MONEY_KEYS = new Set<PurchaseRegisterColKey>([
  "taxableValue",
  "exemptValue",
  "nilRatedValue",
  "nonGstValue",
  "cgst",
  "sgst",
  "igst",
  "cess",
  "otherCharges",
  "tdsAmount",
  "tcsAmount",
  "roundOff",
  "totalInvoiceValue",
  "rcmTaxableValue",
  "rcmCgst",
  "rcmSgst",
  "rcmIgst",
  "rcmCess",
  "eligibleItcCgst",
  "eligibleItcSgst",
  "eligibleItcIgst",
  "eligibleItcCess",
  "ineligibleBlockedItc",
  "itcReversalAmount",
  "netItcAvailable",
]);

const DATE_KEYS = new Set<PurchaseRegisterColKey>([
  "purchaseDate",
  "postingDate",
  "supplierInvoiceDate",
]);

function buildHeader(meta: PurchaseRegisterExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Purchase Register",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Supplier", value: meta.supplierFilter },
      { label: "Branch", value: meta.branchFilter },
      { label: "Purchase Type", value: meta.purchaseTypeFilter },
      { label: "Reverse Charge", value: meta.rcmFilter },
      { label: "ITC Eligibility", value: meta.itcFilter },
      { label: "GSTR-2B Status", value: meta.gstr2bFilter },
      { label: "Voucher Status", value: meta.voucherStatusFilter },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

function cellHtml(row: PurchaseRegisterRow, key: PurchaseRegisterColKey): string {
  if (DATE_KEYS.has(key)) {
    const raw = String(row[key as keyof PurchaseRegisterRow] ?? "");
    return escapeHtml(formatPurchaseRegisterDate(raw));
  }
  if (MONEY_KEYS.has(key)) {
    return formatMoney(Number(row[key as keyof PurchaseRegisterRow] ?? 0));
  }
  return escapeHtml(String(formatCellDisplay(row, key, LABEL_MAPS)));
}

function totalCell(key: PurchaseRegisterColKey, totals: PurchaseRegisterTotals): string {
  const def = getVisibleColumnDefs([key])[0];
  if (def?.totalKey) return formatMoney(totals[def.totalKey] as number);
  if (key.startsWith("eligibleItc")) {
    return key === "eligibleItcCgst" ? formatMoney(totals.eligibleItc) : "";
  }
  return "";
}

function buildDocumentHtml(
  rows: PurchaseRegisterRow[],
  visible: PurchaseRegisterColKey[],
  totals: PurchaseRegisterTotals,
): string {
  const defs = getVisibleColumnDefs(visible);
  const columns: ReportColumnHeader[] = defs.map((d) => ({
    label: MONEY_KEYS.has(d.key) ? `${d.label} (₹)` : d.label,
    align: d.align === "right" ? "right" : "left",
    className: d.align === "right" ? "num" : undefined,
  }));

  const bodyHtml = rows
    .map((row) => {
      const cells = defs
        .map((d) => {
          const cls =
            d.align === "right"
              ? ' class="num"'
              : d.key === "voucherNumber" ||
                  d.key === "supplierGstin" ||
                  d.key === "supplierInvoiceNo"
                ? ' class="mono"'
                : "";
          return `<td${cls}>${cellHtml(row, d.key)}</td>`;
        })
        .join("");
      return `<tr class="line">${cells}</tr>`;
    })
    .join("\n");

  const footerHtml = `<tr class="total">${defs
    .map((d, i) => {
      if (i === 0) {
        return `<td class="total"><strong>Grand Total (${totals.count})</strong></td>`;
      }
      const val = totalCell(d.key, totals);
      return val
        ? `<td class="num total"><strong>${val}</strong></td>`
        : `<td class="total"></td>`;
    })
    .join("")}</tr>`;

  const tableHtml = buildTabularReportBodyHtml({ columns, bodyHtml, footerHtml });
  const footerNote = `<p class="report-footer-note">
    Taxable: ₹ ${formatMoneyNumber(totals.taxableValue)} ·
    CGST: ₹ ${formatMoneyNumber(totals.cgst)} ·
    SGST: ₹ ${formatMoneyNumber(totals.sgst)} ·
    IGST: ₹ ${formatMoneyNumber(totals.igst)} ·
    Cess: ₹ ${formatMoneyNumber(totals.cess)} ·
    Net ITC: ₹ ${formatMoneyNumber(totals.netItcAvailable)} ·
    Invoice Value: ₹ ${formatMoneyNumber(totals.totalInvoiceValue)} ·
    ${totals.count} document(s)
  </p>`;

  return tableHtml + footerNote;
}

export async function exportPurchaseRegisterToExcel(
  rows: PurchaseRegisterRow[],
  visible: PurchaseRegisterColKey[],
  totals: PurchaseRegisterTotals,
  meta: PurchaseRegisterExportMeta,
): Promise<void> {
  exportAccountsReportToExcel({
    title: "Purchase Register",
    filename: "Purchase_Register",
    header: buildHeader(meta),
    bodyHtml: buildDocumentHtml(rows, visible, totals),
    landscape: true,
    compact: true,
  });
}

export async function exportPurchaseRegisterToPdf(
  rows: PurchaseRegisterRow[],
  visible: PurchaseRegisterColKey[],
  totals: PurchaseRegisterTotals,
  meta: PurchaseRegisterExportMeta,
): Promise<void> {
  exportAccountsReportToPdf({
    title: "Purchase Register",
    filename: "Purchase_Register",
    header: buildHeader(meta),
    bodyHtml: buildDocumentHtml(rows, visible, totals),
    landscape: true,
    compact: true,
  });
}
