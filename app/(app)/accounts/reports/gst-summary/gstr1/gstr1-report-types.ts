import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";

export type Gstr1ReportSectionId =
  | "b2b"
  | "b2c-large"
  | "export-sez"
  | "cn-dn-registered"
  | "cn-dn-unregistered"
  | "b2c-small"
  | "nil-exempt-non-gst"
  | "hsn-summary"
  | "documents-summary"
  | "grand-total";

export type Gstr1DocType = "sales_invoice" | "credit_note" | "debit_note";

export type Gstr1InvoiceType =
  | "Regular"
  | "Export with Payment"
  | "Export under LUT"
  | "SEZ with Payment"
  | "SEZ without Payment"
  | "Credit Note"
  | "Debit Note";

export type Gstr1TaxabilityType = "taxable" | "nil-rated" | "exempt" | "non-gst";

export interface Gstr1ReportHeader {
  companyName: string;
  reportName: string;
  gstin: string;
  financialYear: string;
  returnPeriod: string;
  filingStatus: string;
}

export interface Gstr1VoucherSummary {
  totalVouchers: number;
  includedInReturn: number;
  notRelevant: number;
  needsReview: number;
}

export interface Gstr1SummaryRow {
  sectionId: Gstr1ReportSectionId;
  particulars: string;
  voucherCount: number;
  taxableAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  invoiceAmount: number;
  rowType: "section" | "supporting" | "total";
}

export interface Gstr1LineItem {
  id: string;
  product: string;
  hsn: string;
  quantity: number;
  uqc: string;
  rate: number;
  grossAmount: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  totalAmount: number;
  taxabilityType: Gstr1TaxabilityType;
}

export interface Gstr1Document {
  id: string;
  docType: Gstr1DocType;
  sourceId: number;
  sectionId: Exclude<Gstr1ReportSectionId, "hsn-summary" | "documents-summary" | "grand-total">;
  documentNo: string;
  documentDate: string;
  customer: string;
  gstin: string;
  companyGstin: string;
  registrationType: "registered" | "unregistered";
  placeOfSupply: string;
  branch: string;
  invoiceType: Gstr1InvoiceType;
  invoiceAmount: number;
  taxableAmount: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  status: "posted" | "needs-review";
  isInterstate: boolean;
  lines: Gstr1LineItem[];
}

export interface Gstr1InvoiceListRow {
  id: string;
  documentDate: string;
  invoiceNumber: string;
  customer: string;
  gstin: string;
  placeOfSupply: string;
  invoiceType: Gstr1InvoiceType;
  invoiceAmount: number;
  taxableAmount: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  status: string;
  docType: Gstr1DocType;
  sourceId: number;
}

export interface Gstr1HsnRow {
  id: string;
  hsn: string;
  description: string;
  uqc: string;
  quantity: number;
  taxableAmount: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface Gstr1DocumentSummaryRow {
  id: string;
  documentType: string;
  fromNumber: string;
  toNumber: string;
  totalIssued: number;
  cancelled: number;
  netIssued: number;
}

export interface Gstr1Report {
  header: Gstr1ReportHeader;
  voucherSummary: Gstr1VoucherSummary;
  sections: Gstr1SummaryRow[];
  hasData: boolean;
}

export interface Gstr1ExportMeta {
  header: Gstr1ReportHeader;
  filters: GstReportFilters;
  filterLabels: {
    financialYear: string;
    gstPeriod: string;
    branch: string;
    gstRegistration: string;
    dateFrom: string;
    dateTo: string;
  };
}

export const GSTR1_TRANSACTIONAL_SECTIONS: Gstr1ReportSectionId[] = [
  "b2b",
  "b2c-large",
  "export-sez",
  "cn-dn-registered",
  "cn-dn-unregistered",
  "b2c-small",
  "nil-exempt-non-gst",
];

export const GSTR1_SECTION_LABELS: Record<Gstr1ReportSectionId, string> = {
  b2b: "B2B Invoices",
  "b2c-large": "B2C Large Invoices",
  "export-sez": "Export / SEZ Supplies",
  "cn-dn-registered": "Credit Notes / Debit Notes – Registered",
  "cn-dn-unregistered": "Credit Notes / Debit Notes – Unregistered",
  "b2c-small": "B2C Small Invoices",
  "nil-exempt-non-gst": "Nil Rated / Exempt / Non-GST Supplies",
  "hsn-summary": "HSN Summary",
  "documents-summary": "Document Summary",
  "grand-total": "Grand Total",
};

export const GSTR1_DRILL_ROUTES: Partial<Record<Gstr1ReportSectionId, string>> = {
  b2b: "b2b",
  "b2c-large": "b2c-large",
  "export-sez": "export-sez",
  "cn-dn-registered": "cn-dn-registered",
  "cn-dn-unregistered": "cn-dn-unregistered",
  "b2c-small": "b2c-small",
  "nil-exempt-non-gst": "nil-exempt-non-gst",
  "hsn-summary": "hsn-summary",
  "documents-summary": "documents-summary",
};
