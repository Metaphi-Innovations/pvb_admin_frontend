/**
 * Common GST reporting dataset — single source for all GST report pages.
 * Reads posted accounting transactions only. Calculation logic is placeholder/demo.
 */

import {
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  loadPurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import {
  loadDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { getInvoiceGstBreakup } from "@/lib/accounts/invoice-gst-breakup";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  computeGstDashboard,
  isQualifyingCreditNote,
  isQualifyingSalesInvoice,
  type GstDashboardFilters,
  type Gstr1SectionRow,
} from "@/lib/accounts/gst-summary-compute";
import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import { matchesGstReportFilters } from "@/lib/accounts/gst-report-filters";
import type {
  GstAnnualComputationRow,
  GstGstr3bRow,
  GstMonthlySummaryRow,
  GstOverviewDashboard,
  GstOverviewSummary,
  GstReconciliationRow,
  GstReportDataset,
  GstReportTransaction,
} from "@/lib/accounts/gst-report-types";

const POSTED_PI_STATUSES = new Set(["posted", "approved"]);
const POSTED_DN_STATUSES = new Set(["posted", "approved", "processed"]);

function toDashboardFilters(filters: GstReportFilters): GstDashboardFilters {
  return {
    financialYearId: filters.financialYearId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branch: filters.branch,
    warehouse: [],
  };
}

function mapInvoiceToTransaction(inv: InvoiceRecord): GstReportTransaction | null {
  if (!isQualifyingSalesInvoice(inv)) return null;
  const breakup = getInvoiceGstBreakup(inv);
  const taxAmount = roundMoney(breakup.cgst + breakup.sgst + breakup.igst);
  return {
    id: `si-${inv.id}`,
    docType: "sales_invoice",
    direction: "outward",
    sourceId: inv.id,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate,
    partyName: inv.customerName,
    gstin: inv.customerGst ?? "",
    branch: inv.branch ?? "Head Office",
    warehouse: inv.warehouse ?? "",
    companyGstin: COMPANY_BILLING.gstNumber,
    hsn: "",
    gstRate: 0,
    taxableValue: roundMoney(breakup.taxableValue),
    cgst: roundMoney(breakup.cgst),
    sgst: roundMoney(breakup.sgst),
    igst: roundMoney(breakup.igst),
    cess: 0,
    taxAmount,
    isPosted: true,
  };
}

function mapPurchaseInvoiceToTransaction(inv: PurchaseInvoiceRecord): GstReportTransaction | null {
  if (inv.workflow?.status && !POSTED_PI_STATUSES.has(inv.workflow.status)) return null;
  const taxAmount = roundMoney(inv.taxAmount);
  const interstate = taxAmount > 0 && inv.lineItems.every((l) => (l.taxPct ?? 0) > 0 && l.taxAmount === taxAmount);
  return {
    id: `pi-${inv.id}`,
    docType: "purchase_invoice",
    direction: "inward",
    sourceId: inv.id,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate,
    partyName: inv.vendorName,
    gstin: inv.vendorGst ?? "",
    branch: "Head Office",
    warehouse: inv.warehouse ?? "",
    companyGstin: COMPANY_BILLING.gstNumber,
    hsn: "",
    gstRate: 0,
    taxableValue: roundMoney(inv.subtotal),
    cgst: interstate ? 0 : roundMoney(taxAmount / 2),
    sgst: interstate ? 0 : roundMoney(taxAmount / 2),
    igst: interstate ? taxAmount : 0,
    cess: 0,
    taxAmount,
    isPosted: true,
  };
}

function mapCreditNoteToTransaction(cn: CreditNoteRecord): GstReportTransaction | null {
  if (!isQualifyingCreditNote(cn)) return null;
  const taxAmount = roundMoney(cn.cgstAmount + cn.sgstAmount + cn.igstAmount);
  return {
    id: `cn-${cn.id}`,
    docType: "sales_credit_note",
    direction: "outward",
    sourceId: cn.id,
    documentNo: cn.creditNoteNo,
    documentDate: cn.creditNoteDate,
    partyName: cn.customerName,
    gstin: "",
    branch: "Head Office",
    warehouse: cn.warehouse ?? "",
    companyGstin: COMPANY_BILLING.gstNumber,
    hsn: "",
    gstRate: 0,
    taxableValue: -roundMoney(Math.abs(cn.taxableValue)),
    cgst: -roundMoney(Math.abs(cn.cgstAmount)),
    sgst: -roundMoney(Math.abs(cn.sgstAmount)),
    igst: -roundMoney(Math.abs(cn.igstAmount)),
    cess: 0,
    taxAmount: -taxAmount,
    isPosted: true,
  };
}

function mapDebitNoteToTransaction(dn: DebitNoteRecord): GstReportTransaction | null {
  if (!POSTED_DN_STATUSES.has(dn.status)) return null;
  const taxAmount = roundMoney(dn.cgstAmount + dn.sgstAmount + dn.igstAmount);
  return {
    id: `dn-${dn.id}`,
    docType: "purchase_debit_note",
    direction: "inward",
    sourceId: dn.id,
    documentNo: dn.debitNoteNo,
    documentDate: dn.debitNoteDate,
    partyName: dn.vendorName,
    gstin: "",
    branch: "Head Office",
    warehouse: dn.warehouse ?? "",
    companyGstin: COMPANY_BILLING.gstNumber,
    hsn: "",
    gstRate: 0,
    taxableValue: roundMoney(dn.taxableAmount),
    cgst: roundMoney(dn.cgstAmount),
    sgst: roundMoney(dn.sgstAmount),
    igst: roundMoney(dn.igstAmount),
    cess: 0,
    taxAmount,
    isPosted: true,
  };
}

/** Load all posted GST transactions from accounting vouchers. */
export function loadGstReportTransactions(): GstReportTransaction[] {
  const sales = loadInvoices().map(mapInvoiceToTransaction).filter((t): t is GstReportTransaction => t != null);
  const purchases = loadPurchaseInvoices()
    .map(mapPurchaseInvoiceToTransaction)
    .filter((t): t is GstReportTransaction => t != null);
  const creditNotes = loadCreditNotes()
    .map(mapCreditNoteToTransaction)
    .filter((t): t is GstReportTransaction => t != null);
  const debitNotes = loadDebitNotes()
    .map(mapDebitNoteToTransaction)
    .filter((t): t is GstReportTransaction => t != null);
  return [...sales, ...purchases, ...creditNotes, ...debitNotes];
}

export function filterGstReportTransactions(
  transactions: GstReportTransaction[],
  filters: GstReportFilters,
): GstReportTransaction[] {
  return transactions.filter((txn) => matchesGstReportFilters(txn, filters));
}

function sumField(
  transactions: GstReportTransaction[],
  picker: (t: GstReportTransaction) => number,
): number {
  return roundMoney(transactions.reduce((sum, t) => sum + picker(t), 0));
}

function calcNetGstPayable(outputGst: number, inputGst: number): number {
  const eligibleItc = roundMoney(inputGst * 0.92);
  return roundMoney(Math.max(0, outputGst - eligibleItc));
}

function buildOverviewFromTransactions(
  transactions: GstReportTransaction[],
): GstOverviewSummary {
  const outward = transactions.filter((t) => t.direction === "outward");
  const inward = transactions.filter((t) => t.direction === "inward");

  const taxableSales = sumField(outward, (t) => Math.max(0, t.taxableValue));
  const taxablePurchases = sumField(inward, (t) => Math.max(0, t.taxableValue));
  const outputGst = sumField(outward, (t) => Math.max(0, t.taxAmount));
  const inputGst = sumField(inward, (t) => Math.max(0, t.taxAmount));
  const eligibleItc = roundMoney(inputGst * 0.92);
  const netGstPayable = calcNetGstPayable(outputGst, inputGst);

  return {
    taxableSales,
    taxablePurchases,
    outputGst,
    inputGst,
    eligibleItc,
    netGstPayable,
    pendingReconciliation: transactions.length > 0 ? 3 : 0,
  };
}

/** Demo fallback when no posted transactions match filters. */
function demoOverview(): GstOverviewSummary {
  return {
    taxableSales: 48_25_000,
    taxablePurchases: 31_40_000,
    outputGst: 8_68_500,
    inputGst: 5_65_200,
    eligibleItc: 5_19_984,
    netGstPayable: 3_48_516,
    pendingReconciliation: 7,
  };
}

export function buildGstReportDataset(filters: GstReportFilters): GstReportDataset {
  const all = loadGstReportTransactions();
  const filtered = filterGstReportTransactions(all, filters);
  const overview =
    filtered.length > 0
      ? buildOverviewFromTransactions(filtered)
      : demoOverview();

  return {
    transactions: filtered,
    overview,
    hasData: filtered.length > 0 || all.length === 0,
  };
}

export function buildGstr1SectionRows(filters: GstReportFilters): Gstr1SectionRow[] {
  const dashboard = computeGstDashboard(toDashboardFilters(filters));
  return dashboard.sections;
}

export function buildGstr3bRows(filters: GstReportFilters): GstGstr3bRow[] {
  const dataset = buildGstReportDataset(filters);
  const { overview } = dataset;
  return [
    {
      id: "outward",
      particulars: "3.1 Outward taxable supplies (other than zero rated, nil rated and exempted)",
      taxableValue: overview.taxableSales,
      integratedTax: roundMoney(overview.outputGst * 0.35),
      centralTax: roundMoney(overview.outputGst * 0.325),
      stateTax: roundMoney(overview.outputGst * 0.325),
      cess: 0,
      rowType: "section",
    },
    {
      id: "itc-available",
      particulars: "4. Eligible ITC",
      taxableValue: 0,
      integratedTax: roundMoney(overview.eligibleItc * 0.4),
      centralTax: roundMoney(overview.eligibleItc * 0.3),
      stateTax: roundMoney(overview.eligibleItc * 0.3),
      cess: 0,
      rowType: "section",
    },
    {
      id: "net-payable",
      particulars: "6.1 Tax, interest, late fee payable",
      taxableValue: 0,
      integratedTax: roundMoney(overview.netGstPayable * 0.35),
      centralTax: roundMoney(overview.netGstPayable * 0.325),
      stateTax: roundMoney(overview.netGstPayable * 0.325),
      cess: 0,
      rowType: "total",
    },
  ];
}

function buildDemoReconciliationRows(prefix: string): GstReconciliationRow[] {
  return [
    {
      id: `${prefix}-1`,
      supplierGstin: "27AABCU9603R1ZM",
      supplierName: "Agro Inputs Pvt Ltd",
      invoiceNo: "PI-2025-0142",
      invoiceDate: "2025-05-12",
      booksTaxableValue: 1_25_000,
      portalTaxableValue: 1_25_000,
      booksTax: 22_500,
      portalTax: 22_500,
      variance: 0,
      status: "matched",
    },
    {
      id: `${prefix}-2`,
      supplierGstin: "27AABCF1234G1Z9",
      supplierName: "Green Valley Fertilizers",
      invoiceNo: "PI-2025-0188",
      invoiceDate: "2025-06-03",
      booksTaxableValue: 84_500,
      portalTaxableValue: 82_000,
      booksTax: 15_210,
      portalTax: 14_760,
      variance: 450,
      status: "partial",
    },
    {
      id: `${prefix}-3`,
      supplierGstin: "27AABCH5678H1Z3",
      supplierName: "Maharashtra Seeds Co",
      invoiceNo: "PI-2025-0201",
      invoiceDate: "2025-06-18",
      booksTaxableValue: 56_200,
      portalTaxableValue: 0,
      booksTax: 10_116,
      portalTax: 0,
      variance: 10_116,
      status: "missing_portal",
    },
    {
      id: `${prefix}-4`,
      supplierGstin: "27AABCK9012K1Z7",
      supplierName: "Western Crop Care",
      invoiceNo: "—",
      invoiceDate: "2025-06-22",
      booksTaxableValue: 0,
      portalTaxableValue: 38_400,
      booksTax: 0,
      portalTax: 6_912,
      variance: -6_912,
      status: "missing_books",
    },
  ];
}

export function buildGstr2aReconciliationRows(_filters: GstReportFilters): GstReconciliationRow[] {
  return buildDemoReconciliationRows("2a");
}

export function buildGstr2bReconciliationRows(_filters: GstReportFilters): GstReconciliationRow[] {
  return buildDemoReconciliationRows("2b");
}

export function buildAnnualComputationRows(filters: GstReportFilters): GstAnnualComputationRow[] {
  const months = [
    "Apr 2025", "May 2025", "Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025",
    "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026",
  ];
  const dataset = buildGstReportDataset(filters);
  const base = dataset.overview;
  const monthlyFactor = 1 / 12;

  const lines: GstAnnualComputationRow[] = months.map((month, i) => ({
    id: `month-${i}`,
    month,
    taxableOutward: roundMoney(base.taxableSales * monthlyFactor * (0.85 + (i % 4) * 0.05)),
    taxableInward: roundMoney(base.taxablePurchases * monthlyFactor * (0.8 + (i % 3) * 0.07)),
    outputGst: roundMoney(base.outputGst * monthlyFactor),
    inputGst: roundMoney(base.inputGst * monthlyFactor),
    netPayable: roundMoney(base.netGstPayable * monthlyFactor),
    rowType: "line",
  }));

  lines.push({
    id: "total",
    month: "Total",
    taxableOutward: base.taxableSales,
    taxableInward: base.taxablePurchases,
    outputGst: base.outputGst,
    inputGst: base.inputGst,
    netPayable: base.netGstPayable,
    rowType: "total",
  });

  return lines;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const month = Number(monthStr);
  const year = Number(yearStr);
  if (!month || !year) return monthKey;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function monthKeysBetween(dateFrom: string, dateTo: string): string[] {
  const keys: string[] = [];
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function buildMonthlyTotalRow(overview: GstOverviewSummary): GstMonthlySummaryRow {
  return {
    id: "total",
    month: "Total",
    monthKey: "total",
    sales: overview.taxableSales,
    purchase: overview.taxablePurchases,
    outputGst: overview.outputGst,
    inputGst: overview.inputGst,
    netGst: overview.netGstPayable,
    rowType: "total",
  };
}

function buildMonthlySummaryFromTransactions(
  transactions: GstReportTransaction[],
  filters: GstReportFilters,
  overview: GstOverviewSummary,
): GstMonthlySummaryRow[] {
  const monthKeys = monthKeysBetween(filters.dateFrom, filters.dateTo);
  if (monthKeys.length === 0) {
    return [buildMonthlyTotalRow(overview)];
  }

  const bucket = new Map<
    string,
    { sales: number; purchase: number; outputGst: number; inputGst: number }
  >();

  for (const key of monthKeys) {
    bucket.set(key, { sales: 0, purchase: 0, outputGst: 0, inputGst: 0 });
  }

  for (const txn of transactions) {
    const monthKey = txn.documentDate.slice(0, 7);
    if (!bucket.has(monthKey)) continue;
    const row = bucket.get(monthKey)!;
    if (txn.direction === "outward") {
      row.sales += Math.max(0, txn.taxableValue);
      row.outputGst += Math.max(0, txn.taxAmount);
    } else {
      row.purchase += Math.max(0, txn.taxableValue);
      row.inputGst += Math.max(0, txn.taxAmount);
    }
  }

  const lines: GstMonthlySummaryRow[] = monthKeys.map((monthKey) => {
    const row = bucket.get(monthKey)!;
    return {
      id: monthKey,
      month: formatMonthLabel(monthKey),
      monthKey,
      sales: roundMoney(row.sales),
      purchase: roundMoney(row.purchase),
      outputGst: roundMoney(row.outputGst),
      inputGst: roundMoney(row.inputGst),
      netGst: calcNetGstPayable(row.outputGst, row.inputGst),
      rowType: "line",
    };
  });

  lines.push(buildMonthlyTotalRow(overview));
  return lines;
}

function buildDemoMonthlySummary(
  filters: GstReportFilters,
  overview: GstOverviewSummary,
): GstMonthlySummaryRow[] {
  const monthKeys = monthKeysBetween(filters.dateFrom, filters.dateTo);
  if (monthKeys.length === 0) {
    return [buildMonthlyTotalRow(overview)];
  }

  const weights = monthKeys.map((_, i) => 0.85 + (i % 4) * 0.05);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  let salesAcc = 0;
  let purchaseAcc = 0;
  let outputAcc = 0;
  let inputAcc = 0;

  const lines: GstMonthlySummaryRow[] = monthKeys.map((monthKey, i) => {
    const isLast = i === monthKeys.length - 1;
    const share = weights[i] / weightSum;
    const sales = isLast
      ? roundMoney(overview.taxableSales - salesAcc)
      : roundMoney(overview.taxableSales * share);
    const purchase = isLast
      ? roundMoney(overview.taxablePurchases - purchaseAcc)
      : roundMoney(overview.taxablePurchases * share);
    const outputGst = isLast
      ? roundMoney(overview.outputGst - outputAcc)
      : roundMoney(overview.outputGst * share);
    const inputGst = isLast
      ? roundMoney(overview.inputGst - inputAcc)
      : roundMoney(overview.inputGst * share);

    salesAcc = roundMoney(salesAcc + sales);
    purchaseAcc = roundMoney(purchaseAcc + purchase);
    outputAcc = roundMoney(outputAcc + outputGst);
    inputAcc = roundMoney(inputAcc + inputGst);

    return {
      id: monthKey,
      month: formatMonthLabel(monthKey),
      monthKey,
      sales,
      purchase,
      outputGst,
      inputGst,
      netGst: calcNetGstPayable(outputGst, inputGst),
      rowType: "line",
    };
  });

  lines.push(buildMonthlyTotalRow(overview));
  return lines;
}

export function buildGstOverviewDashboard(filters: GstReportFilters): GstOverviewDashboard {
  const dataset = buildGstReportDataset(filters);
  const overview = dataset.overview;
  const monthlySummary =
    dataset.transactions.length > 0
      ? buildMonthlySummaryFromTransactions(dataset.transactions, filters, overview)
      : buildDemoMonthlySummary(filters, overview);

  return {
    overview,
    monthlySummary,
    hasData: monthlySummary.length > 0,
  };
}
