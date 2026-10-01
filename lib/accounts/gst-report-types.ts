/**
 * Shared types for GST Reports module.
 * All GST report pages read from the common GST reporting dataset.
 */

export type GstTransactionDocType =
  | "sales_invoice"
  | "purchase_invoice"
  | "sales_credit_note"
  | "purchase_debit_note"
  | "journal_entry";

export type GstTransactionDirection = "outward" | "inward";

export interface GstReportTransaction {
  id: string;
  docType: GstTransactionDocType;
  direction: GstTransactionDirection;
  sourceId: number;
  documentNo: string;
  documentDate: string;
  partyName: string;
  gstin: string;
  branch: string;
  warehouse: string;
  companyGstin: string;
  hsn: string;
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  taxAmount: number;
  isPosted: boolean;
}

export interface GstOverviewSummary {
  taxableSales: number;
  taxablePurchases: number;
  outputGst: number;
  inputGst: number;
  eligibleItc: number;
  netGstPayable: number;
  pendingReconciliation: number;
}

export interface GstGstr3bRow {
  id: string;
  particulars: string;
  taxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cess: number;
  rowType: "section" | "line" | "total";
}

export interface GstReconciliationRow {
  id: string;
  supplierGstin: string;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  booksTaxableValue: number;
  portalTaxableValue: number;
  booksTax: number;
  portalTax: number;
  variance: number;
  status: "matched" | "partial" | "missing_books" | "missing_portal";
}

export interface GstAnnualComputationRow {
  id: string;
  month: string;
  taxableOutward: number;
  taxableInward: number;
  outputGst: number;
  inputGst: number;
  netPayable: number;
  rowType: "line" | "total";
}

export interface GstReportDataset {
  transactions: GstReportTransaction[];
  overview: GstOverviewSummary;
  hasData: boolean;
}

export interface GstMonthlySummaryRow {
  id: string;
  month: string;
  monthKey: string;
  sales: number;
  purchase: number;
  outputGst: number;
  inputGst: number;
  netGst: number;
  rowType: "line" | "total";
}

export interface GstOverviewDashboard {
  overview: GstOverviewSummary;
  monthlySummary: GstMonthlySummaryRow[];
  hasData: boolean;
}
