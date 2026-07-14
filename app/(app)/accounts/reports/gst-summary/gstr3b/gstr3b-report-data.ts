/**
 * GSTR-3B Phase 1 — report compute from Sales / Purchase / Credit / Debit Notes.
 * No ITC classification, RCM, cash/credit ledger, interest, late fee, or cess.
 */

import {
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadPurchaseInvoices,
  getPurchaseInvoiceGstBreakup,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import {
  loadCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  loadDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { getInvoiceGstBreakup } from "@/lib/accounts/invoice-gst-breakup";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import { resolveInvoiceDocumentType } from "@/lib/accounts/invoice-type";
import { roundMoney } from "@/lib/accounts/money-format";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import {
  isExportSupply,
  isCustomerGstRegistered,
  isNilRatedOrExemptInvoice,
} from "@/lib/accounts/gst-summary-compute";
import {
  matchesGstReportFilters,
  resolveBranchFilterLabel,
  resolveFinancialYearLabel,
  resolveGstPeriodLabel,
  type GstReportFilters,
  buildGstReportHref,
  GST_REPORT_BASE_PATH,
} from "@/lib/accounts/gst-report-filters";
import { GSTR3B_DEMO_DOCUMENTS } from "./gstr3b-demo-seed";
import type {
  Gstr3bAmountBlock,
  Gstr3bDocType,
  Gstr3bDocument,
  Gstr3bDrillKey,
  Gstr3bListRow,
  Gstr3bReport,
  Gstr3bSummaryRow,
  Gstr3bSupplyKind,
  Gstr3bTaxability,
} from "./gstr3b-report-types";
import type { Gstr1ReportHeader } from "../gstr1/gstr1-report-types";

const EXCLUDED_STATUSES = new Set([
  "draft",
  "deleted",
  "cancelled",
  "canceled",
  "archived",
  "rejected",
]);

function r(n: number): number {
  return roundMoney(n);
}

function isExcludedStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return EXCLUDED_STATUSES.has(status.trim().toLowerCase());
}

function isSezSupply(inv: InvoiceRecord): boolean {
  if (inv.sezSupplyType) return true;
  if (/sez/i.test(inv.gstTreatment ?? "")) return true;
  if (/sez/i.test(inv.placeOfSupply ?? "")) return true;
  if (/sez/i.test(inv.customerGstCategory ?? "")) return true;
  return false;
}

function classifySalesTaxability(inv: InvoiceRecord): Gstr3bTaxability {
  if (/non[\s-]?gst/i.test(inv.gstTreatment ?? "")) return "non_gst";
  if (/exempt/i.test(inv.gstTreatment ?? "")) return "exempt";
  if (/nil/i.test(inv.gstTreatment ?? "")) return "nil_rated";
  if (isNilRatedOrExemptInvoice(inv)) {
    if (/exempt/i.test(inv.gstTreatment ?? "")) return "exempt";
    return "nil_rated";
  }
  return "taxable";
}

function classifySalesSupplyKind(inv: InvoiceRecord, interstate: boolean): Gstr3bSupplyKind {
  if (isExportSupply(inv)) return "export";
  if (isSezSupply(inv)) return "sez";
  if (interstate) return "interstate";
  if (isCustomerGstRegistered(inv.customerId, inv.customerGst, inv.customerGstCategory)) {
    return "domestic_b2b";
  }
  return "domestic_b2c";
}

function includeSalesInvoice(inv: InvoiceRecord): boolean {
  if (isExcludedStatus(inv.invoiceStatus)) return false;
  if (isExcludedStatus(inv.workflow?.status)) return false;
  if (resolveInvoiceDocumentType(inv) === "stock_transfer") return false;
  return true;
}

function includePurchaseInvoice(inv: PurchaseInvoiceRecord): boolean {
  return !isExcludedStatus(inv.workflow?.status);
}

function includeCreditNote(cn: CreditNoteRecord): boolean {
  return !isExcludedStatus(cn.status) && !isExcludedStatus(cn.workflow?.status);
}

function includeDebitNote(dn: DebitNoteRecord): boolean {
  return !isExcludedStatus(dn.status) && !isExcludedStatus(dn.workflow?.status);
}

function mapSalesInvoice(inv: InvoiceRecord): Gstr3bDocument {
  const breakup = getInvoiceGstBreakup(inv);
  const taxability = classifySalesTaxability(inv);
  const supplyKind = classifySalesSupplyKind(inv, breakup.interstate);
  return {
    id: `si-${inv.id}`,
    docType: "sales_invoice",
    sourceId: inv.id,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate,
    partyName: inv.customerName,
    gstin: inv.customerGst ?? "",
    placeOfSupply: inv.placeOfSupply ?? inv.state ?? "",
    state: inv.placeOfSupply?.trim() || inv.state || "—",
    branch: inv.branch ?? "Head Office",
    companyGstin: COMPANY_BILLING.gstNumber,
    taxableValue: r(breakup.taxableValue),
    cgst: r(breakup.cgst),
    sgst: r(breakup.sgst),
    igst: r(breakup.igst),
    taxAmount: r(breakup.cgst + breakup.sgst + breakup.igst),
    taxability,
    supplyKind,
    isInterstate: breakup.interstate || supplyKind === "export" || supplyKind === "sez",
    sign: 1,
  };
}

function mapPurchaseInvoice(inv: PurchaseInvoiceRecord): Gstr3bDocument {
  const breakup = getPurchaseInvoiceGstBreakup(inv);
  return {
    id: `pi-${inv.id}`,
    docType: "purchase_invoice",
    sourceId: inv.id,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate,
    partyName: inv.vendorName,
    gstin: inv.vendorGst ?? "",
    placeOfSupply: inv.placeOfSupply ?? "",
    state: inv.placeOfSupply?.trim() || "—",
    branch: "Head Office",
    companyGstin: COMPANY_BILLING.gstNumber,
    taxableValue: r(breakup.taxableValue),
    cgst: r(breakup.cgst),
    sgst: r(breakup.sgst),
    igst: r(breakup.igst),
    taxAmount: r(breakup.cgst + breakup.sgst + breakup.igst),
    taxability: "taxable",
    supplyKind: breakup.interstate ? "purchase_interstate" : "purchase_local",
    isInterstate: breakup.interstate,
    sign: 1,
  };
}

function mapCreditNote(cn: CreditNoteRecord): Gstr3bDocument {
  const placeOfSupply = (cn as { placeOfSupply?: string }).placeOfSupply ?? "";
  const interstate = inferInterstateFromPlaceOfSupply(placeOfSupply, COMPANY_BILLING.state);
  return {
    id: `cn-${cn.id}`,
    docType: "credit_note",
    sourceId: cn.id,
    documentNo: cn.creditNoteNo,
    documentDate: cn.creditNoteDate,
    partyName: cn.customerName,
    gstin: "",
    placeOfSupply,
    state: placeOfSupply || "—",
    branch: "Head Office",
    companyGstin: COMPANY_BILLING.gstNumber,
    taxableValue: -r(Math.abs(cn.taxableValue)),
    cgst: -r(Math.abs(cn.cgstAmount)),
    sgst: -r(Math.abs(cn.sgstAmount)),
    igst: -r(Math.abs(cn.igstAmount)),
    taxAmount: -r(Math.abs(cn.cgstAmount + cn.sgstAmount + cn.igstAmount)),
    taxability:
      (cn.taxCreditAmount ?? 0) <= 0 && (cn.taxableValue ?? 0) > 0 ? "nil_rated" : "taxable",
    supplyKind: interstate ? "interstate" : "domestic_b2b",
    isInterstate: interstate,
    sign: -1,
  };
}

function mapDebitNote(dn: DebitNoteRecord): Gstr3bDocument {
  const placeOfSupply = (dn as { placeOfSupply?: string }).placeOfSupply ?? "";
  const interstate = inferInterstateFromPlaceOfSupply(placeOfSupply, COMPANY_BILLING.state);
  const customerId = (dn as { customerId?: number | null }).customerId;
  const against = (dn as { againstType?: string }).againstType;
  const isOutward = customerId != null || against === "sales_invoice";

  const base = {
    id: `dn-${dn.id}`,
    docType: "debit_note" as const,
    sourceId: dn.id,
    documentNo: dn.debitNoteNo,
    documentDate: dn.debitNoteDate,
    partyName: dn.vendorName,
    gstin: "",
    placeOfSupply,
    state: placeOfSupply || "—",
    branch: "Head Office",
    companyGstin: COMPANY_BILLING.gstNumber,
    taxableValue: r(dn.taxableAmount),
    cgst: r(dn.cgstAmount),
    sgst: r(dn.sgstAmount),
    igst: r(dn.igstAmount),
    taxAmount: r(dn.cgstAmount + dn.sgstAmount + dn.igstAmount),
    taxability: "taxable" as const,
    isInterstate: interstate,
    sign: 1 as const,
  };

  if (isOutward) {
    return {
      ...base,
      supplyKind: interstate ? "interstate" : "domestic_b2b",
    };
  }

  return {
    ...base,
    supplyKind: interstate ? "purchase_interstate" : "purchase_local",
  };
}

function collectLiveDocuments(): Gstr3bDocument[] {
  const docs: Gstr3bDocument[] = [];
  for (const inv of loadInvoices()) {
    if (!includeSalesInvoice(inv)) continue;
    docs.push(mapSalesInvoice(inv));
  }
  for (const pi of loadPurchaseInvoices()) {
    if (!includePurchaseInvoice(pi)) continue;
    docs.push(mapPurchaseInvoice(pi));
  }
  for (const cn of loadCreditNotes()) {
    if (!includeCreditNote(cn)) continue;
    docs.push(mapCreditNote(cn));
  }
  for (const dn of loadDebitNotes()) {
    if (!includeDebitNote(dn)) continue;
    docs.push(mapDebitNote(dn));
  }
  return docs;
}

function filterDocs(docs: Gstr3bDocument[], filters: GstReportFilters): Gstr3bDocument[] {
  return docs.filter((doc) =>
    matchesGstReportFilters(
      {
        documentDate: doc.documentDate,
        branch: doc.branch,
        companyGstin: doc.companyGstin,
      },
      filters,
    ),
  );
}

function sumDocs(docs: Gstr3bDocument[]): Gstr3bAmountBlock {
  return {
    taxableValue: r(docs.reduce((s, d) => s + d.taxableValue, 0)),
    igst: r(docs.reduce((s, d) => s + d.igst, 0)),
    cgst: r(docs.reduce((s, d) => s + d.cgst, 0)),
    sgst: r(docs.reduce((s, d) => s + d.sgst, 0)),
  };
}

function isOutwardDoc(doc: Gstr3bDocument): boolean {
  if (doc.docType === "sales_invoice" || doc.docType === "credit_note") return true;
  if (doc.docType !== "debit_note") return false;
  return (
    doc.supplyKind === "domestic_b2b" ||
    doc.supplyKind === "domestic_b2c" ||
    doc.supplyKind === "export" ||
    doc.supplyKind === "sez" ||
    doc.supplyKind === "interstate" ||
    doc.supplyKind === "intrastate"
  );
}

function isInwardDoc(doc: Gstr3bDocument): boolean {
  if (doc.docType === "purchase_invoice") return true;
  return (
    doc.docType === "debit_note" &&
    (doc.supplyKind === "purchase_local" || doc.supplyKind === "purchase_interstate")
  );
}

function isOutwardTaxable(doc: Gstr3bDocument): boolean {
  return isOutwardDoc(doc) && doc.taxability === "taxable";
}

function reportHasMeaningfulData(docs: Gstr3bDocument[]): boolean {
  if (docs.length === 0) return false;
  return docs.some(
    (d) =>
      Math.abs(d.taxableValue) > 0 ||
      Math.abs(d.cgst) > 0 ||
      Math.abs(d.sgst) > 0 ||
      Math.abs(d.igst) > 0,
  );
}

export function buildGstr3bReportHeader(filters: GstReportFilters): {
  header: Gstr1ReportHeader;
  branchLabel: string;
} {
  const gstin =
    filters.gstRegistration !== "all" ? filters.gstRegistration : COMPANY_BILLING.gstNumber;
  const branchLabel = resolveBranchFilterLabel(filters.branch);

  return {
    header: {
      companyName: ACCOUNTS_COMPANY_NAME,
      reportName: "GSTR-3B",
      gstin,
      financialYear: resolveFinancialYearLabel(filters.financialYearId),
      returnPeriod:
        filters.gstPeriod !== "all"
          ? resolveGstPeriodLabel(filters.gstPeriod)
          : `${filters.dateFrom} to ${filters.dateTo}`,
      filingStatus: branchLabel,
    },
    branchLabel,
  };
}

export function resolveGstr3bDocuments(filters: GstReportFilters): Gstr3bDocument[] {
  const live = filterDocs(collectLiveDocuments(), filters);
  if (reportHasMeaningfulData(live)) return live;

  const demo = filterDocs(GSTR3B_DEMO_DOCUMENTS, filters);
  return demo.length > 0 ? demo : GSTR3B_DEMO_DOCUMENTS;
}

function summaryRow(
  sectionId: string,
  particulars: string,
  docs: Gstr3bDocument[],
  amounts: Gstr3bAmountBlock,
  rowType: Gstr3bSummaryRow["rowType"],
): Gstr3bSummaryRow {
  return {
    sectionId,
    particulars,
    voucherCount: docs.length,
    taxableAmount: amounts.taxableValue,
    igst: amounts.igst,
    cgst: amounts.cgst,
    sgst: amounts.sgst,
    taxAmount: r(amounts.igst + amounts.cgst + amounts.sgst),
    invoiceAmount: 0,
    rowType,
  };
}

export function buildGstr3bReport(filters: GstReportFilters): Gstr3bReport {
  const documents = resolveGstr3bDocuments(filters);
  const { header, branchLabel } = buildGstr3bReportHeader(filters);

  const outwardTaxable = documents.filter(isOutwardTaxable);
  const section31 = sumDocs(outwardTaxable);

  const interstateEligible = outwardTaxable.filter(
    (d) =>
      d.isInterstate ||
      d.supplyKind === "interstate" ||
      d.supplyKind === "export" ||
      d.supplyKind === "sez",
  );

  const byState = new Map<string, Gstr3bDocument[]>();
  for (const doc of interstateEligible) {
    const key = doc.state || doc.placeOfSupply || "—";
    const list = byState.get(key) ?? [];
    list.push(doc);
    byState.set(key, list);
  }

  const interstateRows = Array.from(byState.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, docs]) =>
      summaryRow(`interstate-state-${state}`, `    ${state}`, docs, sumDocs(docs), "supporting"),
    );

  const section32Total = sumDocs(interstateEligible);

  const inward = documents.filter(isInwardDoc);
  const inputCgst = r(inward.reduce((s, d) => s + d.cgst, 0));
  const inputSgst = r(inward.reduce((s, d) => s + d.sgst, 0));
  const inputIgst = r(inward.reduce((s, d) => s + d.igst, 0));

  const outwardAll = documents.filter(isOutwardDoc);
  const nilDocs = outwardAll.filter((d) => d.taxability === "nil_rated");
  const exemptDocs = outwardAll.filter((d) => d.taxability === "exempt");
  const nonGstDocs = outwardAll.filter((d) => d.taxability === "non_gst");

  const outputCgst = section31.cgst;
  const outputSgst = section31.sgst;
  const outputIgst = section31.igst;
  const netCgst = r(outputCgst - inputCgst);
  const netSgst = r(outputSgst - inputSgst);
  const netIgst = r(outputIgst - inputIgst);

  const zero = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0 };

  const sections: Gstr3bSummaryRow[] = [
    summaryRow(
      "outward_taxable",
      "3.1 Outward taxable supplies (Domestic / Export / SEZ / B2B / B2C)",
      outwardTaxable,
      section31,
      "section",
    ),
    summaryRow(
      "interstate",
      "3.2 Interstate supplies",
      interstateEligible,
      section32Total,
      "section",
    ),
    ...interstateRows,
    summaryRow(
      "input_gst",
      "4. Input GST as per Books",
      inward,
      { taxableValue: 0, igst: inputIgst, cgst: inputCgst, sgst: inputSgst },
      "section",
    ),
    summaryRow(
      "input_cgst",
      "    Input CGST",
      inward.filter((d) => d.cgst !== 0),
      { ...zero, cgst: inputCgst },
      "supporting",
    ),
    summaryRow(
      "input_sgst",
      "    Input SGST",
      inward.filter((d) => d.sgst !== 0),
      { ...zero, sgst: inputSgst },
      "supporting",
    ),
    summaryRow(
      "input_igst",
      "    Input IGST",
      inward.filter((d) => d.igst !== 0),
      { ...zero, igst: inputIgst },
      "supporting",
    ),
    summaryRow(
      "nil_rated",
      "5. Nil Rated",
      nilDocs,
      { taxableValue: r(nilDocs.reduce((s, d) => s + d.taxableValue, 0)), igst: 0, cgst: 0, sgst: 0 },
      "section",
    ),
    summaryRow(
      "exempt",
      "5. Exempt",
      exemptDocs,
      {
        taxableValue: r(exemptDocs.reduce((s, d) => s + d.taxableValue, 0)),
        igst: 0,
        cgst: 0,
        sgst: 0,
      },
      "section",
    ),
    summaryRow(
      "non_gst",
      "5. Non GST",
      nonGstDocs,
      {
        taxableValue: r(nonGstDocs.reduce((s, d) => s + d.taxableValue, 0)),
        igst: 0,
        cgst: 0,
        sgst: 0,
      },
      "section",
    ),
    summaryRow(
      "net_cgst",
      "6. Net CGST (Output − Input)",
      [...outwardTaxable, ...inward],
      { ...zero, cgst: netCgst },
      "section",
    ),
    summaryRow(
      "net_sgst",
      "6. Net SGST (Output − Input)",
      [...outwardTaxable, ...inward],
      { ...zero, sgst: netSgst },
      "section",
    ),
    summaryRow(
      "net_igst",
      "6. Net IGST (Output − Input)",
      [...outwardTaxable, ...inward],
      { ...zero, igst: netIgst },
      "section",
    ),
    summaryRow(
      "total_liability",
      "Total GST Liability",
      [...outwardTaxable, ...inward],
      { taxableValue: 0, igst: Math.max(0, netIgst), cgst: Math.max(0, netCgst), sgst: Math.max(0, netSgst) },
      "section",
    ),
    summaryRow(
      "totals_output",
      "Output",
      outwardTaxable,
      { taxableValue: section31.taxableValue, igst: outputIgst, cgst: outputCgst, sgst: outputSgst },
      "supporting",
    ),
    summaryRow(
      "totals_input",
      "Input",
      inward,
      { taxableValue: 0, igst: inputIgst, cgst: inputCgst, sgst: inputSgst },
      "supporting",
    ),
    summaryRow(
      "totals_net",
      "Grand Total (Net)",
      [...outwardTaxable, ...inward],
      { taxableValue: 0, igst: netIgst, cgst: netCgst, sgst: netSgst },
      "total",
    ),
  ];

  return {
    header,
    branchLabel,
    sections,
    documents,
    hasData: documents.length > 0,
  };
}

export function getDrillDocuments(
  documents: Gstr3bDocument[],
  drillKey: Gstr3bDrillKey,
): Gstr3bDocument[] {
  const outwardTaxable = () => documents.filter(isOutwardTaxable);
  const inward = () => documents.filter(isInwardDoc);
  const outwardAll = () => documents.filter(isOutwardDoc);

  switch (drillKey) {
    case "outward_taxable":
    case "totals_output":
      return outwardTaxable();
    case "interstate":
      return outwardTaxable().filter(
        (d) =>
          d.isInterstate ||
          d.supplyKind === "interstate" ||
          d.supplyKind === "export" ||
          d.supplyKind === "sez",
      );
    case "input_gst":
    case "input_cgst":
    case "input_sgst":
    case "input_igst":
    case "totals_input":
      return inward();
    case "nil_rated":
      return outwardAll().filter((d) => d.taxability === "nil_rated");
    case "exempt":
      return outwardAll().filter((d) => d.taxability === "exempt");
    case "non_gst":
      return outwardAll().filter((d) => d.taxability === "non_gst");
    case "net_cgst":
    case "net_sgst":
    case "net_igst":
    case "total_liability":
    case "totals_net":
      return [...outwardTaxable(), ...inward()];
    default:
      return documents;
  }
}

export function toGstr3bListRows(docs: Gstr3bDocument[]): Gstr3bListRow[] {
  return docs
    .map((d) => ({
      id: d.id,
      documentDate: d.documentDate,
      documentNo: d.documentNo,
      docType: d.docType,
      partyName: d.partyName,
      gstin: d.gstin,
      placeOfSupply: d.placeOfSupply,
      taxableValue: d.taxableValue,
      igst: d.igst,
      cgst: d.cgst,
      sgst: d.sgst,
      taxAmount: d.taxAmount,
      sourceId: d.sourceId,
      isDemo: d.isDemo,
    }))
    .sort(
      (a, b) =>
        a.documentDate.localeCompare(b.documentDate) || a.documentNo.localeCompare(b.documentNo),
    );
}

export function resolveGstr3bSourceHref(
  docType: Gstr3bDocType,
  sourceId: number,
  isDemo?: boolean,
): string | null {
  if (isDemo) return null;
  switch (docType) {
    case "sales_invoice":
      return `/accounts/transactions/invoices/${sourceId}`;
    case "purchase_invoice":
      return `/accounts/purchase-invoices/${sourceId}`;
    case "credit_note":
      return `/accounts/transactions/credit-notes/${sourceId}`;
    case "debit_note":
      return `/accounts/transactions/debit-notes/${sourceId}`;
    default:
      return null;
  }
}

export function buildGstr3bDrillHref(drillKey: Gstr3bDrillKey, filters: GstReportFilters): string {
  return buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr3b/${drillKey}`, filters);
}

export { isValidGstr3bDrillKey } from "./gstr3b-report-types";
