/**
 * GSTR-1 report data layer — demo seed with filter-ready structure for future API wiring.
 */

import { COMPANY_BILLING } from "@/lib/procurement/config";
import {
  matchesGstReportFilters,
  resolveFinancialYearLabel,
  resolveGstPeriodLabel,
  resolveGstRegistrationLabel,
  resolveBranchFilterLabel,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { GSTR1_DEMO_DOCUMENTS } from "./gstr1-demo-seed";
import {
  GSTR1_SECTION_LABELS,
  GSTR1_TRANSACTIONAL_SECTIONS,
  type Gstr1Document,
  type Gstr1DocumentSummaryRow,
  type Gstr1ExportMeta,
  type Gstr1HsnRow,
  type Gstr1InvoiceListRow,
  type Gstr1Report,
  type Gstr1ReportHeader,
  type Gstr1ReportSectionId,
  type Gstr1SummaryRow,
  type Gstr1VoucherSummary,
} from "./gstr1-report-types";

const B2C_LARGE_THRESHOLD = 250_000;

function sumRow(docs: Gstr1Document[]): Omit<Gstr1SummaryRow, "sectionId" | "particulars" | "rowType"> {
  return {
    voucherCount: docs.length,
    taxableAmount: docs.reduce((s, d) => s + d.taxableAmount, 0),
    igst: docs.reduce((s, d) => s + d.igst, 0),
    cgst: docs.reduce((s, d) => s + d.cgst, 0),
    sgst: docs.reduce((s, d) => s + d.sgst, 0),
    taxAmount: docs.reduce((s, d) => s + d.taxAmount, 0),
    invoiceAmount: docs.reduce((s, d) => s + d.invoiceAmount, 0),
  };
}

function aggregateSection(
  sectionId: Gstr1ReportSectionId,
  docs: Gstr1Document[],
  rowType: Gstr1SummaryRow["rowType"],
): Gstr1SummaryRow {
  const sectionDocs = docs.filter((d) => d.sectionId === sectionId);
  return {
    sectionId,
    particulars: GSTR1_SECTION_LABELS[sectionId],
    rowType,
    ...sumRow(sectionDocs),
  };
}

export function filterGstr1Documents(filters: GstReportFilters): Gstr1Document[] {
  const filtered = GSTR1_DEMO_DOCUMENTS.filter((doc) =>
    matchesGstReportFilters(
      {
        documentDate: doc.documentDate,
        branch: doc.branch,
        companyGstin: doc.companyGstin,
      },
      filters,
    ),
  );
  // Demo guarantee — never return an empty report.
  return filtered.length > 0 ? filtered : GSTR1_DEMO_DOCUMENTS;
}

export function buildGstr1ReportHeader(filters: GstReportFilters): Gstr1ReportHeader {
  const gstin =
    filters.gstRegistration !== "all"
      ? filters.gstRegistration
      : COMPANY_BILLING.gstNumber;

  return {
    companyName: ACCOUNTS_COMPANY_NAME,
    reportName: "GSTR-1",
    gstin,
    financialYear: resolveFinancialYearLabel(filters.financialYearId),
    returnPeriod:
      filters.gstPeriod !== "all"
        ? resolveGstPeriodLabel(filters.gstPeriod)
        : `${filters.dateFrom} to ${filters.dateTo}`,
    filingStatus: "Not Filed",
  };
}

export function buildGstr1VoucherSummary(docs: Gstr1Document[]): Gstr1VoucherSummary {
  const posted = docs.filter((d) => d.status === "posted");
  const needsReview = docs.filter((d) => d.status === "needs-review");
  return {
    totalVouchers: docs.length,
    includedInReturn: posted.length,
    notRelevant: 0,
    needsReview: needsReview.length,
  };
}

export function buildGstr1HsnRows(docs: Gstr1Document[]): Gstr1HsnRow[] {
  const map = new Map<string, Gstr1HsnRow>();

  for (const doc of docs) {
    for (const line of doc.lines) {
      const key = `${line.hsn}|${line.gstRate}|${line.uqc}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += line.quantity;
        existing.taxableAmount += line.taxableAmount;
        existing.igst += line.igst;
        existing.cgst += line.cgst;
        existing.sgst += line.sgst;
        existing.totalTax += line.taxAmount;
      } else {
        map.set(key, {
          id: key,
          hsn: line.hsn,
          description: line.product,
          uqc: line.uqc,
          quantity: line.quantity,
          taxableAmount: line.taxableAmount,
          gstRate: line.gstRate,
          igst: line.igst,
          cgst: line.cgst,
          sgst: line.sgst,
          totalTax: line.taxAmount,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.hsn.localeCompare(b.hsn) || a.gstRate - b.gstRate);
}

export function buildGstr1DocumentSummaryRows(docs: Gstr1Document[]): Gstr1DocumentSummaryRow[] {
  const groups: { type: string; docType: Gstr1Document["docType"] }[] = [
    { type: "Sales Invoice", docType: "sales_invoice" },
    { type: "Credit Note", docType: "credit_note" },
    { type: "Debit Note", docType: "debit_note" },
  ];

  return groups.map(({ type, docType }) => {
    const typeDocs = docs
      .filter((d) => d.docType === docType)
      .sort((a, b) => a.documentNo.localeCompare(b.documentNo));
    const numbers = typeDocs.map((d) => d.documentNo);
    return {
      id: docType,
      documentType: type,
      fromNumber: numbers[0] ?? "—",
      toNumber: numbers[numbers.length - 1] ?? "—",
      totalIssued: typeDocs.length,
      cancelled: 0,
      netIssued: typeDocs.length,
    };
  });
}

export function buildGstr1Report(filters: GstReportFilters): Gstr1Report {
  const docs = filterGstr1Documents(filters);

  const transactionalRows = GSTR1_TRANSACTIONAL_SECTIONS.map((sectionId) =>
    aggregateSection(sectionId, docs, "section"),
  );

  const hsnDocs = docs.filter((d) => d.sectionId !== "nil-exempt-non-gst" || d.taxAmount > 0);
  const hsnRows = buildGstr1HsnRows(hsnDocs.length > 0 ? hsnDocs : docs);
  const hsnAggregate: Gstr1SummaryRow = {
    sectionId: "hsn-summary",
    particulars: GSTR1_SECTION_LABELS["hsn-summary"],
    rowType: "supporting",
    voucherCount: hsnRows.length,
    taxableAmount: hsnRows.reduce((s, r) => s + r.taxableAmount, 0),
    igst: hsnRows.reduce((s, r) => s + r.igst, 0),
    cgst: hsnRows.reduce((s, r) => s + r.cgst, 0),
    sgst: hsnRows.reduce((s, r) => s + r.sgst, 0),
    taxAmount: hsnRows.reduce((s, r) => s + r.totalTax, 0),
    invoiceAmount: 0,
  };

  const docSummaryRows = buildGstr1DocumentSummaryRows(docs);
  const docAggregate: Gstr1SummaryRow = {
    sectionId: "documents-summary",
    particulars: GSTR1_SECTION_LABELS["documents-summary"],
    rowType: "supporting",
    voucherCount: docSummaryRows.reduce((s, r) => s + r.netIssued, 0),
    taxableAmount: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    taxAmount: 0,
    invoiceAmount: 0,
  };

  const grandTotals = transactionalRows.reduce(
    (acc, row) => ({
      voucherCount: acc.voucherCount + row.voucherCount,
      taxableAmount: acc.taxableAmount + row.taxableAmount,
      igst: acc.igst + row.igst,
      cgst: acc.cgst + row.cgst,
      sgst: acc.sgst + row.sgst,
      taxAmount: acc.taxAmount + row.taxAmount,
      invoiceAmount: acc.invoiceAmount + row.invoiceAmount,
    }),
    {
      voucherCount: 0,
      taxableAmount: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      taxAmount: 0,
      invoiceAmount: 0,
    },
  );

  const grandTotal: Gstr1SummaryRow = {
    sectionId: "grand-total",
    particulars: GSTR1_SECTION_LABELS["grand-total"],
    rowType: "total",
    ...grandTotals,
  };

  return {
    header: buildGstr1ReportHeader(filters),
    voucherSummary: buildGstr1VoucherSummary(docs),
    sections: [...transactionalRows, hsnAggregate, docAggregate, grandTotal],
    hasData: true,
  };
}

export function getGstr1DocumentsForSection(
  sectionId: Gstr1ReportSectionId,
  filters: GstReportFilters,
): Gstr1Document[] {
  const docs = filterGstr1Documents(filters);
  if (sectionId === "hsn-summary" || sectionId === "documents-summary" || sectionId === "grand-total") {
    return docs;
  }
  return docs.filter((d) => d.sectionId === sectionId);
}

export function documentToListRow(doc: Gstr1Document): Gstr1InvoiceListRow {
  return {
    id: doc.id,
    documentDate: doc.documentDate,
    invoiceNumber: doc.documentNo,
    customer: doc.customer,
    gstin: doc.gstin || "—",
    placeOfSupply: doc.placeOfSupply,
    invoiceType: doc.invoiceType,
    invoiceAmount: doc.invoiceAmount,
    taxableAmount: doc.taxableAmount,
    gstRate: doc.gstRate,
    igst: doc.igst,
    cgst: doc.cgst,
    sgst: doc.sgst,
    taxAmount: doc.taxAmount,
    status: doc.status === "needs-review" ? "Needs Review" : "Posted",
    docType: doc.docType,
    sourceId: doc.sourceId,
  };
}

export function searchGstr1InvoiceList(
  rows: Gstr1InvoiceListRow[],
  query: string,
): Gstr1InvoiceListRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q) ||
      r.gstin.toLowerCase().includes(q),
  );
}

export function getGstr1DocumentById(id: string, filters: GstReportFilters): Gstr1Document | null {
  const docs = filterGstr1Documents(filters);
  return docs.find((d) => d.id === id) ?? null;
}

export function buildGstr1ExportMeta(filters: GstReportFilters): Gstr1ExportMeta {
  return {
    header: buildGstr1ReportHeader(filters),
    filters,
    filterLabels: {
      financialYear: resolveFinancialYearLabel(filters.financialYearId),
      gstPeriod: resolveGstPeriodLabel(filters.gstPeriod),
      branch: resolveBranchFilterLabel(filters.branch),
      gstRegistration: resolveGstRegistrationLabel(filters.gstRegistration),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
  };
}

export function resolveGstr1SourceHref(doc: Gstr1Document): string {
  if (doc.docType === "sales_invoice") {
    return `/accounts/transactions/invoices/${doc.sourceId}`;
  }
  if (doc.docType === "credit_note") {
    return `/accounts/transactions/credit-notes/${doc.sourceId}`;
  }
  return `/accounts/transactions/debit-notes/${doc.sourceId}`;
}

/** Classification helpers — for future API integration. */
export function classifyB2cLarge(invoiceAmount: number): boolean {
  return Math.abs(invoiceAmount) >= B2C_LARGE_THRESHOLD;
}

export { B2C_LARGE_THRESHOLD };
