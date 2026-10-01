/**
 * Purchase Register data — one consolidated row per purchase document
 * (Purchase Invoice / Debit Note). Sourced from posted Accounts documents;
 * no separate register table.
 */

import {
  getPurchaseInvoiceGstBreakup,
  isPurchaseInvoiceInterstate,
  loadPurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadDebitNotes, type DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  matchesMultiFilter,
  matchesMultiIdFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { buildGstr2bReport } from "../gst-summary/gstr2b/gstr2b-report-data";
import type { Gstr2bMatchStatus, Gstr2bReconRow } from "../gst-summary/gstr2b/gstr2b-report-types";
import type {
  PurchaseRegisterDocType,
  PurchaseRegisterFilters,
  PurchaseRegisterGstr2bStatus,
  PurchaseRegisterItcEligibility,
  PurchaseRegisterPurchaseType,
  PurchaseRegisterRcmLiabilityStatus,
  PurchaseRegisterRow,
  PurchaseRegisterTotals,
  PurchaseRegisterVoucherStatus,
} from "./purchase-register-types";

function r(n: number): number {
  return roundMoney(n);
}

function financialYearIdForDate(isoDate: string): number {
  const d = isoDate.slice(0, 10);
  const month = Number(d.slice(5, 7));
  const year = Number(d.slice(0, 4));
  return month >= 4 ? year : year - 1;
}

function vendorState(vendorId: number, fallbackGst?: string): string {
  const vendor = loadVendors().find((v) => v.id === vendorId);
  if (vendor?.billingAddress?.state?.trim()) return vendor.billingAddress.state.trim();
  if (fallbackGst && fallbackGst.length >= 2) {
    const code = fallbackGst.slice(0, 2);
    const map: Record<string, string> = {
      "27": "Maharashtra",
      "24": "Gujarat",
      "29": "Karnataka",
      "08": "Rajasthan",
      "23": "Madhya Pradesh",
      "03": "Punjab",
      "33": "Tamil Nadu",
      "07": "Delhi",
      "96": "Other Territory",
      "99": "Centre Jurisdiction",
    };
    return map[code] ?? "—";
  }
  return "—";
}

function mapWorkflowStatus(ws: string | undefined | null): PurchaseRegisterVoucherStatus | "draft" {
  if (!ws) return "posted";
  const s = ws.toLowerCase();
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (["draft", "sent_back", "rejected", "pending_approval"].includes(s)) return "draft";
  return "posted";
}

function mapGstr2bStatus(
  status: Gstr2bMatchStatus | undefined,
  notApplicable: boolean,
): PurchaseRegisterGstr2bStatus {
  if (notApplicable) return "not_applicable";
  if (!status) return "missing_in_2b";
  switch (status) {
    case "itc_available":
    case "itc_not_available":
      return "matched";
    case "partial_match":
      return "partially_matched";
    case "missing_in_gstr2b":
      return "missing_in_2b";
    case "needs_review":
      return "mismatch";
    case "missing_in_books":
      return "not_applicable";
    default:
      return "mismatch";
  }
}

function collectHsn(rec: PurchaseInvoiceRecord): string {
  const fromDirect = (rec.directLines ?? [])
    .map((l) => l.hsnSac?.trim())
    .filter(Boolean);
  const fromOcr = (rec.ocrPayload?.lineItems ?? [])
    .map((l) => l.hsn?.trim())
    .filter(Boolean);
  const unique = Array.from(new Set([...fromDirect, ...fromOcr]));
  return unique.slice(0, 4).join(", ") || "—";
}

function resolvePurchaseType(rec: PurchaseInvoiceRecord, interstate: boolean): PurchaseRegisterPurchaseType {
  const gstin = (rec.vendorGst || "").trim().toUpperCase();
  const gstAmount = r(rec.taxAmount ?? 0);
  const nature = rec.purchaseNature;

  if (!gstin || gstin === "—" || gstin.startsWith("URP")) {
    if (nature === "service") return "import_services";
    if (gstAmount === 0 && !rec.reverseChargeApplicable) return "non_gst";
  }
  if (gstin.startsWith("96") || /import|boe|bill of entry/i.test(rec.remarks || "")) {
    return nature === "service" ? "import_services" : "import_goods";
  }
  if (/sez/i.test(rec.placeOfSupply || "") || /sez/i.test(rec.remarks || "")) return "sez";

  if (gstAmount === 0 && !rec.reverseChargeApplicable) {
    const lines = rec.directLines ?? [];
    if (lines.some((l) => l.gstRate === 0 && l.taxableAmount > 0)) return "nil_rated";
    if (rec.gstApplicable === false) return "non_gst";
    return "exempt";
  }

  return interstate ? "interstate" : "local";
}

function resolveDocType(rec: PurchaseInvoiceRecord): PurchaseRegisterDocType {
  if (rec.reverseChargeApplicable && !(rec.vendorGst || "").trim()) return "self_invoice";
  if (/bill of entry|boe/i.test(rec.remarks || "") || /bill of entry|boe/i.test(rec.referenceNumber || "")) {
    return "bill_of_entry";
  }
  const gst = r(rec.taxAmount ?? 0);
  if (gst === 0 && !rec.reverseChargeApplicable) return "bill_of_supply";
  return "tax_invoice";
}

function classifyValueBuckets(
  taxable: number,
  purchaseType: PurchaseRegisterPurchaseType,
): Pick<PurchaseRegisterRow, "taxableValue" | "exemptValue" | "nilRatedValue" | "nonGstValue"> {
  if (purchaseType === "exempt") {
    return { taxableValue: 0, exemptValue: r(taxable), nilRatedValue: 0, nonGstValue: 0 };
  }
  if (purchaseType === "nil_rated") {
    return { taxableValue: 0, exemptValue: 0, nilRatedValue: r(taxable), nonGstValue: 0 };
  }
  if (purchaseType === "non_gst") {
    return { taxableValue: 0, exemptValue: 0, nilRatedValue: 0, nonGstValue: r(taxable) };
  }
  return { taxableValue: r(taxable), exemptValue: 0, nilRatedValue: 0, nonGstValue: 0 };
}

function resolveItcEligibility(
  rec: PurchaseInvoiceRecord,
  gstr2b: PurchaseRegisterGstr2bStatus,
  rcm: boolean,
  rcmLiability: PurchaseRegisterRcmLiabilityStatus,
): PurchaseRegisterItcEligibility {
  const cls = rec.defaultItcClassification ?? "eligible";
  if (cls === "ineligible") return "ineligible";
  if (cls === "reversal_required") return "reversed";
  if (cls === "not_applicable") return "ineligible";

  if (rcm && (rcmLiability === "not_created" || rcmLiability === "payment_pending" || rcmLiability === "liability_created")) {
    return "pending";
  }
  if (gstr2b === "missing_in_2b" || gstr2b === "mismatch" || gstr2b === "partially_matched") {
    return "pending";
  }
  if (cls === "eligible" && gstr2b === "matched") return "eligible";
  if (cls === "eligible") return "partially_eligible";
  return "eligible";
}

function resolveRcmLiability(
  rec: PurchaseInvoiceRecord,
  rcmApplicable: boolean,
): PurchaseRegisterRcmLiabilityStatus {
  if (!rcmApplicable) return "not_created";
  const hasRcmTax =
    r(rec.rcmCgst ?? 0) + r(rec.rcmSgst ?? 0) + r(rec.rcmIgst ?? 0) > 0;
  if (!hasRcmTax) return "not_created";
  if (rec.defaultItcClassification === "eligible" && rec.workflow?.status === "posted") {
    return "itc_claimed";
  }
  return "liability_created";
}

function otherChargesOf(rec: PurchaseInvoiceRecord): number {
  const charges = (rec.additionalCharges ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
  return r(charges);
}

function buildGstr2bIndex(dateFrom: string, dateTo: string): Map<number, Gstr2bReconRow> {
  const map = new Map<number, Gstr2bReconRow>();
  try {
    const report = buildGstr2bReport({
      dateFrom: dateFrom || "2000-01-01",
      dateTo: dateTo || "2099-12-31",
      financialYearId: "all",
      gstPeriod: "all",
      branch: [],
      gstRegistration: "all",
    });
    for (const row of report.rows) {
      if (row.booksSourceId != null && !map.has(row.booksSourceId)) {
        map.set(row.booksSourceId, row);
      }
    }
  } catch {
    /* GSTR-2B demo/portal may be empty — treat as missing */
  }
  return map;
}

function purchaseInvoiceToRow(
  rec: PurchaseInvoiceRecord,
  gstr2bMap: Map<number, Gstr2bReconRow>,
  duplicateKeys: Set<string>,
): PurchaseRegisterRow | null {
  const status = mapWorkflowStatus(rec.workflow?.status);
  if (status === "draft") return null;

  const gst = getPurchaseInvoiceGstBreakup(rec);
  const interstate = gst.interstate || isPurchaseInvoiceInterstate(rec);
  const purchaseType = resolvePurchaseType(rec, interstate);
  const buckets = classifyValueBuckets(gst.taxableValue, purchaseType);
  const rcmApplicable = Boolean(rec.reverseChargeApplicable);

  // Normal forward-charge tax (never double-count RCM as supplier GST)
  let cgst = r(gst.cgst);
  let sgst = r(gst.sgst);
  let igst = r(gst.igst);
  if (rcmApplicable) {
    cgst = 0;
    sgst = 0;
    igst = 0;
  }
  // Mutually exclusive CGST+SGST vs IGST
  if (igst > 0) {
    cgst = 0;
    sgst = 0;
  } else if (cgst > 0 || sgst > 0) {
    igst = 0;
  }

  const rcmCgst = rcmApplicable ? r(rec.rcmCgst ?? (interstate ? 0 : gst.cgst)) : 0;
  const rcmSgst = rcmApplicable ? r(rec.rcmSgst ?? (interstate ? 0 : gst.sgst)) : 0;
  const rcmIgst = rcmApplicable ? r(rec.rcmIgst ?? (interstate ? gst.igst : 0)) : 0;
  const rcmCess = 0;
  const rcmTaxable = rcmApplicable ? r(gst.taxableValue) : 0;
  const rcmLiability = resolveRcmLiability(rec, rcmApplicable);

  const recon = gstr2bMap.get(rec.id);
  const notApplicable =
    purchaseType === "non_gst" ||
    purchaseType === "exempt" ||
    !(rec.vendorGst || "").trim();
  const gstr2bStatus = mapGstr2bStatus(recon?.status, notApplicable);

  const itcEligibility = resolveItcEligibility(rec, gstr2bStatus, rcmApplicable, rcmLiability);

  const eligibleForward =
    itcEligibility === "eligible" || itcEligibility === "partially_eligible";
  const canClaimRcmItc = rcmApplicable && (rcmLiability === "paid" || rcmLiability === "itc_claimed");

  let eligibleItcCgst = 0;
  let eligibleItcSgst = 0;
  let eligibleItcIgst = 0;
  let eligibleItcCess = 0;

  if (rcmApplicable) {
    if (canClaimRcmItc && eligibleForward) {
      eligibleItcCgst = rcmCgst;
      eligibleItcSgst = rcmSgst;
      eligibleItcIgst = rcmIgst;
      eligibleItcCess = rcmCess;
    }
  } else if (eligibleForward) {
    eligibleItcCgst = cgst;
    eligibleItcSgst = sgst;
    eligibleItcIgst = igst;
  }

  const totalGst = cgst + sgst + igst;
  const ineligibleBlocked =
    itcEligibility === "ineligible" || itcEligibility === "blocked"
      ? r(rcmApplicable ? rcmCgst + rcmSgst + rcmIgst : totalGst)
      : 0;
  const itcReversal = itcEligibility === "reversed" ? r(eligibleItcCgst + eligibleItcSgst + eligibleItcIgst + eligibleItcCess) : 0;
  const netItc = r(
    Math.max(0, eligibleItcCgst + eligibleItcSgst + eligibleItcIgst + eligibleItcCess - itcReversal),
  );

  const fyKey = `${rec.vendorId}|${(rec.vendorInvoiceNo || "").trim().toUpperCase()}|${financialYearIdForDate(rec.invoiceDate)}`;
  const isDup = Boolean(rec.vendorInvoiceNo?.trim()) && duplicateKeys.has(fyKey);

  const tds = r(rec.tdsDeduction ?? 0);
  const roundOff = r(rec.roundingAdjustment ?? 0);
  const otherCharges = otherChargesOf(rec);

  // Payable excludes RCM tax (recipient liability) unless already in netPayable
  const totalInvoice = r(rec.netPayable ?? rec.grandTotal);

  return {
    id: `pi-${rec.id}`,
    sourceKind: "purchase_invoice",
    sourceId: rec.id,
    purchaseDate: rec.invoiceDate.slice(0, 10),
    postingDate: (rec.postingDate || rec.invoiceDate).slice(0, 10),
    voucherNumber: rec.invoiceNo,
    documentType: resolveDocType(rec),
    supplierInvoiceNo: rec.vendorInvoiceNo || "—",
    supplierInvoiceDate: rec.invoiceDate.slice(0, 10),
    supplierId: rec.vendorId,
    supplierName: rec.vendorName || "—",
    supplierGstin: (rec.vendorGst || "").trim() || "—",
    supplierState: vendorState(rec.vendorId, rec.vendorGst),
    placeOfSupply: rec.placeOfSupply?.trim() || vendorState(rec.vendorId, rec.vendorGst),
    purchaseType,
    poNumber: rec.poNumber || "—",
    grnNumber: rec.grnNo || "—",
    warehouse: rec.warehouse?.trim() || "—",
    branch: "Head Office",
    hsnSac: collectHsn(rec),
    productNames: [
      ...rec.lineItems.map((l) => l.productName).filter(Boolean),
      ...(rec.directLines ?? []).map((l) => l.description).filter(Boolean),
    ],
    ...buckets,
    cgst,
    sgst,
    igst,
    cess: 0,
    otherCharges,
    tdsAmount: tds,
    tcsAmount: 0,
    roundOff,
    totalInvoiceValue: totalInvoice,
    reverseChargeApplicable: rcmApplicable,
    rcmSection: rcmApplicable ? "RCM" : "",
    rcmTaxableValue: rcmTaxable,
    rcmCgst,
    rcmSgst,
    rcmIgst,
    rcmCess,
    rcmLiabilityStatus: rcmLiability,
    itcEligibility,
    eligibleItcCgst: r(eligibleItcCgst),
    eligibleItcSgst: r(eligibleItcSgst),
    eligibleItcIgst: r(eligibleItcIgst),
    eligibleItcCess: r(eligibleItcCess),
    ineligibleBlockedItc: r(ineligibleBlocked),
    itcReversalAmount: r(itcReversal),
    netItcAvailable: netItc,
    gstr2bStatus,
    gstr2bReconId: recon?.id ?? null,
    voucherStatus: status === "cancelled" ? "cancelled" : "posted",
    poId: rec.poId,
    grnId: rec.grnId,
    qcId: rec.qcId ?? null,
    qcNo: rec.qcNo ?? "",
    supplierInvoiceId: rec.supplierInvoiceId ?? null,
    linkedDebitNoteId: rec.pendingDebitNoteId ?? null,
    linkedCreditNoteId: null,
    rcmLiabilityVoucherId: null,
    postedVoucherId: null,
    supplierLedgerId: null,
    financialYearId: financialYearIdForDate(rec.invoiceDate),
    isDuplicateSupplierInvoice: isDup,
    createdBy: rec.createdBy || "—",
    postedBy: rec.workflow?.makerName || rec.updatedBy || "—",
    modifiedBy: rec.updatedBy || "—",
  };
}

function debitNoteToRow(dn: DebitNoteRecord): PurchaseRegisterRow | null {
  const status = mapWorkflowStatus(dn.status ?? dn.workflow?.status);
  if (status === "draft") return null;
  if (status !== "posted" && status !== "cancelled") return null;

  // Buyer-issued debit note against purchase reduces purchase/ITC in the period
  const sign = -1;
  const taxable = r(dn.taxableAmount) * sign;
  const cgst = r(dn.cgstAmount) * sign;
  const sgst = r(dn.sgstAmount) * sign;
  const igst = r(dn.igstAmount) * sign;
  const total = r(dn.currentDebitAmount || dn.taxableAmount + dn.gstAmount) * sign;
  const interstate = igst !== 0 && cgst === 0 && sgst === 0;
  const vendorId = dn.vendorId ?? 0;
  const vendor = vendorId ? loadVendors().find((v) => v.id === vendorId) : undefined;
  const gstin = vendor?.gstNumber?.trim() || "—";

  return {
    id: `dn-${dn.id}`,
    sourceKind: "debit_note",
    sourceId: dn.id,
    purchaseDate: dn.debitNoteDate.slice(0, 10),
    postingDate: (dn.processedAt || dn.updatedAt || dn.debitNoteDate).slice(0, 10),
    voucherNumber: dn.debitNoteNo,
    documentType: "debit_note",
    supplierInvoiceNo: dn.referenceNo || dn.sourceInvoiceNo || "—",
    supplierInvoiceDate: dn.debitNoteDate.slice(0, 10),
    supplierId: vendorId,
    supplierName: dn.vendorName || "—",
    supplierGstin: gstin,
    supplierState: vendorId ? vendorState(vendorId, gstin) : "—",
    placeOfSupply: vendorId ? vendorState(vendorId, gstin) : "—",
    purchaseType: interstate ? "interstate" : "local",
    poNumber: dn.sourcePoNo || "—",
    grnNumber: dn.sourceGrnNo || "—",
    warehouse: dn.warehouse?.trim() || "—",
    branch: "Head Office",
    hsnSac: "—",
    productNames: dn.lineItems.map((l) => l.productName || "").filter(Boolean),
    taxableValue: taxable,
    exemptValue: 0,
    nilRatedValue: 0,
    nonGstValue: 0,
    cgst: interstate ? 0 : cgst,
    sgst: interstate ? 0 : sgst,
    igst: interstate ? igst : 0,
    cess: 0,
    otherCharges: 0,
    tdsAmount: 0,
    tcsAmount: 0,
    roundOff: 0,
    totalInvoiceValue: total,
    reverseChargeApplicable: false,
    rcmSection: "",
    rcmTaxableValue: 0,
    rcmCgst: 0,
    rcmSgst: 0,
    rcmIgst: 0,
    rcmCess: 0,
    rcmLiabilityStatus: "not_created",
    itcEligibility: "eligible",
    eligibleItcCgst: interstate ? 0 : cgst,
    eligibleItcSgst: interstate ? 0 : sgst,
    eligibleItcIgst: interstate ? igst : 0,
    eligibleItcCess: 0,
    ineligibleBlockedItc: 0,
    itcReversalAmount: 0,
    netItcAvailable: r(cgst + sgst + igst),
    gstr2bStatus: gstin === "—" ? "not_applicable" : "missing_in_2b",
    gstr2bReconId: null,
    voucherStatus: status === "cancelled" ? "cancelled" : "posted",
    poId: dn.sourcePoId,
    grnId: null,
    qcId: null,
    qcNo: dn.sourceQcNo || "",
    supplierInvoiceId: null,
    linkedDebitNoteId: dn.id,
    linkedCreditNoteId: null,
    rcmLiabilityVoucherId: null,
    postedVoucherId: null,
    supplierLedgerId: null,
    financialYearId: financialYearIdForDate(dn.debitNoteDate),
    isDuplicateSupplierInvoice: false,
    createdBy: dn.createdBy || "—",
    postedBy: dn.approvedBy || dn.updatedBy || "—",
    modifiedBy: dn.updatedBy || "—",
  };
}

function collectDuplicateKeys(invoices: PurchaseInvoiceRecord[]): Set<string> {
  const counts = new Map<string, number>();
  for (const rec of invoices) {
    const no = (rec.vendorInvoiceNo || "").trim().toUpperCase();
    if (!no) continue;
    const key = `${rec.vendorId}|${no}|${financialYearIdForDate(rec.invoiceDate)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dups = new Set<string>();
  for (const [k, c] of counts) {
    if (c > 1) dups.add(k);
  }
  return dups;
}

/** Build full purchase register from live Accounts documents. */
export function buildPurchaseRegisterRows(options?: {
  dateFrom?: string;
  dateTo?: string;
}): PurchaseRegisterRow[] {
  const invoices = loadPurchaseInvoices();
  const duplicateKeys = collectDuplicateKeys(invoices);
  const gstr2bMap = buildGstr2bIndex(options?.dateFrom ?? "", options?.dateTo ?? "");

  const rows: PurchaseRegisterRow[] = [];
  const seenPi = new Set<number>();

  for (const inv of invoices) {
    if (seenPi.has(inv.id)) continue;
    seenPi.add(inv.id);
    const row = purchaseInvoiceToRow(inv, gstr2bMap, duplicateKeys);
    if (row) rows.push(row);
  }

  const seenDn = new Set<number>();
  for (const dn of loadDebitNotes()) {
    if (seenDn.has(dn.id)) continue;
    seenDn.add(dn.id);
    const row = debitNoteToRow(dn);
    if (row) rows.push(row);
  }

  return rows.sort(
    (a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || b.voucherNumber.localeCompare(a.voucherNumber),
  );
}

function rowInFinancialYear(row: PurchaseRegisterRow, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return String(row.financialYearId) === financialYearId;
  return row.purchaseDate >= fy.startDate && row.purchaseDate <= fy.endDate;
}

export function filterPurchaseRegisterRows(
  rows: PurchaseRegisterRow[],
  filters: PurchaseRegisterFilters,
): PurchaseRegisterRow[] {
  const purchaseTypes = normalizeMultiFilter(filters.purchaseTypes);
  const documentTypes = normalizeMultiFilter(filters.documentTypes);
  const itcList = normalizeMultiFilter(filters.itcEligibility);
  const gstr2bList = normalizeMultiFilter(filters.gstr2bStatuses);
  const voucherStatuses = normalizeMultiFilter(filters.voucherStatuses);
  const productQ = filters.product.trim().toLowerCase();
  const hsnQ = filters.hsnSac.trim().toLowerCase();
  const gstinQ = filters.supplierGstin.trim().toLowerCase();
  const searchQ = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.dateFrom && row.purchaseDate < filters.dateFrom) return false;
    if (filters.dateTo && row.purchaseDate > filters.dateTo) return false;
    if (!rowInFinancialYear(row, filters.financialYearId)) return false;
    if (!matchesMultiIdFilter(filters.supplierIds, row.supplierId)) return false;
    if (!matchesMultiFilter(filters.branchIds, row.branch)) return false;
    if (!matchesMultiFilter(filters.warehouseIds, row.warehouse === "—" ? "" : row.warehouse)) {
      return false;
    }

    // Default: Posted only (cancelled only when selected)
    if (voucherStatuses.length === 0) {
      if (row.voucherStatus !== "posted") return false;
    } else if (!voucherStatuses.includes(row.voucherStatus)) {
      return false;
    }

    if (purchaseTypes.length > 0 && !purchaseTypes.includes(row.purchaseType)) return false;
    if (documentTypes.length > 0 && !documentTypes.includes(row.documentType)) return false;
    if (itcList.length > 0 && !itcList.includes(row.itcEligibility)) return false;
    if (gstr2bList.length > 0 && !gstr2bList.includes(row.gstr2bStatus)) return false;

    if (filters.reverseCharge === "applicable" && !row.reverseChargeApplicable) return false;
    if (filters.reverseCharge === "not_applicable" && row.reverseChargeApplicable) return false;

    if (gstinQ && !row.supplierGstin.toLowerCase().includes(gstinQ)) return false;
    if (hsnQ && !row.hsnSac.toLowerCase().includes(hsnQ)) return false;
    if (productQ) {
      const hit = row.productNames.some((n) => n.toLowerCase().includes(productQ));
      if (!hit) return false;
    }

    if (searchQ) {
      const hay = [
        row.voucherNumber,
        row.supplierInvoiceNo,
        row.supplierName,
        row.supplierGstin,
        row.poNumber,
        row.grnNumber,
        row.hsnSac,
        ...row.productNames,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(searchQ)) return false;
    }

    return true;
  });
}

export function computePurchaseRegisterTotals(rows: PurchaseRegisterRow[]): PurchaseRegisterTotals {
  const t: PurchaseRegisterTotals = {
    count: rows.length,
    taxableValue: 0,
    exemptValue: 0,
    nilRatedValue: 0,
    nonGstValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    rcmTaxableValue: 0,
    rcmCgst: 0,
    rcmSgst: 0,
    rcmIgst: 0,
    rcmCess: 0,
    eligibleItc: 0,
    ineligibleBlockedItc: 0,
    itcReversalAmount: 0,
    netItcAvailable: 0,
    tdsAmount: 0,
    tcsAmount: 0,
    totalInvoiceValue: 0,
  };

  for (const row of rows) {
    t.taxableValue += row.taxableValue;
    t.exemptValue += row.exemptValue;
    t.nilRatedValue += row.nilRatedValue;
    t.nonGstValue += row.nonGstValue;
    t.cgst += row.cgst;
    t.sgst += row.sgst;
    t.igst += row.igst;
    t.cess += row.cess;
    t.rcmTaxableValue += row.rcmTaxableValue;
    t.rcmCgst += row.rcmCgst;
    t.rcmSgst += row.rcmSgst;
    t.rcmIgst += row.rcmIgst;
    t.rcmCess += row.rcmCess;
    t.eligibleItc +=
      row.eligibleItcCgst + row.eligibleItcSgst + row.eligibleItcIgst + row.eligibleItcCess;
    t.ineligibleBlockedItc += row.ineligibleBlockedItc;
    t.itcReversalAmount += row.itcReversalAmount;
    t.netItcAvailable += row.netItcAvailable;
    t.tdsAmount += row.tdsAmount;
    t.tcsAmount += row.tcsAmount;
    t.totalInvoiceValue += row.totalInvoiceValue;
  }

  (Object.keys(t) as (keyof PurchaseRegisterTotals)[]).forEach((k) => {
    if (k === "count") return;
    t[k] = r(t[k] as number) as never;
  });

  return t;
}

export function formatPurchaseRegisterDate(iso: string): string {
  if (!iso || iso === "—") return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

export function getPurchaseRegisterBranchOptions(rows: PurchaseRegisterRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.branch).filter(Boolean))).sort();
}

export function getPurchaseRegisterWarehouseOptions(rows: PurchaseRegisterRow[]): string[] {
  return Array.from(
    new Set(rows.map((r) => r.warehouse).filter((w) => w && w !== "—")),
  ).sort();
}

export function findGstr2bReconForRow(
  row: PurchaseRegisterRow,
  dateFrom: string,
  dateTo: string,
): Gstr2bReconRow | null {
  if (!row.gstr2bReconId && row.sourceKind !== "purchase_invoice") return null;
  const map = buildGstr2bIndex(dateFrom, dateTo);
  if (row.sourceKind === "purchase_invoice") {
    return map.get(row.sourceId) ?? null;
  }
  return null;
}

export function buildPurchaseVoucherHref(row: PurchaseRegisterRow): string {
  if (row.sourceKind === "debit_note") {
    return `/accounts/transactions/debit-notes/${row.sourceId}`;
  }
  return `/accounts/purchase-invoices/${row.sourceId}`;
}

export function buildGeneralLedgerHref(row: PurchaseRegisterRow): string {
  const params = new URLSearchParams();
  params.set("supplier", String(row.supplierId));
  params.set("from", row.purchaseDate);
  params.set("to", row.purchaseDate);
  params.set("source", "purchase-register");
  if (row.supplierName) params.set("search", row.voucherNumber);
  return `/accounts/reports/general-ledger?${params.toString()}`;
}

export function buildGstr2bHref(row: PurchaseRegisterRow): string {
  const params = new URLSearchParams();
  if (row.supplierGstin && row.supplierGstin !== "—") {
    params.set("supplierGstin", row.supplierGstin);
  }
  params.set("from", row.purchaseDate);
  params.set("to", row.purchaseDate);
  return `/accounts/reports/gst-summary/gstr2b?${params.toString()}`;
}

/** Company GSTIN for display / filters */
export const PURCHASE_REGISTER_COMPANY_GSTIN = COMPANY_BILLING.gstNumber;
