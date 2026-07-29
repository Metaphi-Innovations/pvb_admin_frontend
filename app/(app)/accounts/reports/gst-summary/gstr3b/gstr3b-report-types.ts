import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import type { GstSummaryTableRow } from "../gstr1/components/Gstr1SummaryTable";
import type { Gstr1ReportHeader } from "../gstr1/gstr1-report-types";

export type Gstr3bDocType =
  | "sales_invoice"
  | "purchase_invoice"
  | "credit_note"
  | "debit_note";

export type Gstr3bTaxability = "taxable" | "nil_rated" | "exempt" | "non_gst";

export type Gstr3bSupplyKind =
  | "domestic_b2b"
  | "domestic_b2c"
  | "export"
  | "sez"
  | "interstate"
  | "intrastate"
  | "purchase_local"
  | "purchase_interstate";

export interface Gstr3bAmountBlock {
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
}

export type Gstr3bDrillKey =
  | "outward_taxable"
  | "interstate"
  | "input_gst"
  | "input_cgst"
  | "input_sgst"
  | "input_igst"
  | "nil_rated"
  | "exempt"
  | "non_gst"
  | "net_cgst"
  | "net_sgst"
  | "net_igst"
  | "total_liability"
  | "totals_output"
  | "totals_input"
  | "totals_net";

export interface Gstr3bDocument {
  id: string;
  docType: Gstr3bDocType;
  sourceId: number;
  documentNo: string;
  documentDate: string;
  partyName: string;
  gstin: string;
  placeOfSupply: string;
  state: string;
  branch: string;
  companyGstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  taxability: Gstr3bTaxability;
  supplyKind: Gstr3bSupplyKind;
  isInterstate: boolean;
  sign: 1 | -1;
  isDemo?: boolean;
}

export type Gstr3bSummaryRow = GstSummaryTableRow;

export interface Gstr3bReport {
  header: Gstr1ReportHeader;
  branchLabel: string;
  sections: Gstr3bSummaryRow[];
  documents: Gstr3bDocument[];
  hasData: boolean;
}

export interface Gstr3bListRow {
  id: string;
  documentDate: string;
  documentNo: string;
  docType: Gstr3bDocType;
  partyName: string;
  gstin: string;
  placeOfSupply: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  sourceId: number;
  isDemo?: boolean;
}

export const GSTR3B_DRILL_ROUTES: Partial<Record<string, string>> = {
  outward_taxable: "outward_taxable",
  interstate: "interstate",
  input_gst: "input_gst",
  input_cgst: "input_cgst",
  input_sgst: "input_sgst",
  input_igst: "input_igst",
  nil_rated: "nil_rated",
  exempt: "exempt",
  non_gst: "non_gst",
  net_cgst: "net_cgst",
  net_sgst: "net_sgst",
  net_igst: "net_igst",
  total_liability: "total_liability",
  totals_output: "totals_output",
  totals_input: "totals_input",
  totals_net: "totals_net",
};

export const GSTR3B_DRILL_LABELS: Record<Gstr3bDrillKey, string> = {
  outward_taxable: "3.1 Outward Taxable Supplies",
  interstate: "3.2 Interstate Supplies",
  input_gst: "4. Input GST as per Books",
  input_cgst: "4. Input CGST",
  input_sgst: "4. Input SGST",
  input_igst: "4. Input IGST",
  nil_rated: "5. Nil Rated Supplies",
  exempt: "5. Exempt Supplies",
  non_gst: "5. Non-GST Supplies",
  net_cgst: "6. Net CGST",
  net_sgst: "6. Net SGST",
  net_igst: "6. Net IGST",
  total_liability: "6. Total GST Liability",
  totals_output: "Output GST",
  totals_input: "Input GST",
  totals_net: "Net GST",
};

export const GSTR3B_DOC_TYPE_LABELS: Record<Gstr3bDocType, string> = {
  sales_invoice: "Sales Invoice",
  purchase_invoice: "Purchase Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export const GSTR3B_DRILL_KEYS: Gstr3bDrillKey[] = [
  "outward_taxable",
  "interstate",
  "input_gst",
  "input_cgst",
  "input_sgst",
  "input_igst",
  "nil_rated",
  "exempt",
  "non_gst",
  "net_cgst",
  "net_sgst",
  "net_igst",
  "total_liability",
  "totals_output",
  "totals_input",
  "totals_net",
];

export function isValidGstr3bDrillKey(value: string): value is Gstr3bDrillKey {
  return (GSTR3B_DRILL_KEYS as string[]).includes(value);
}

export type { GstReportFilters };
