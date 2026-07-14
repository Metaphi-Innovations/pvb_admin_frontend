export type RegisterGstRate = 5 | 12 | 18 | 28;

export type RegisterPaymentStatus = "paid" | "partially_paid" | "pending" | "overdue";

/** Posted = finalized sales tax invoice; cancelled shown only when status filter includes it. */
export type RegisterInvoiceStatus = "posted" | "draft" | "cancelled";

export type RegisterGstType = "cgst_sgst" | "igst";

export interface RegisterReportRow {
  id: number;
  invoiceDate: string;
  invoiceNo: string;
  partyId: number;
  partyName: string;
  /** Customer / vendor code for register listing */
  partyCode?: string;
  gstin: string;
  state: string;
  branch: string;
  warehouse?: string;
  salesperson?: string;
  customerType?: string;
  voucherType: string;
  productNames: string[];
  taxableValue: number;
  /** Combined GST (purchase register / legacy) */
  gstAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  discount?: number;
  /** Freight, round-off, and other non-tax charges */
  otherCharges?: number;
  invoiceTotal: number;
  paymentTerms?: string;
  paymentStatus: RegisterPaymentStatus;
  invoiceStatus: RegisterInvoiceStatus;
  gstRate: RegisterGstRate;
  gstType?: RegisterGstType;
  financialYearId: number;
  /** Accounting links — sales invoice → voucher → GL */
  postedVoucherId?: number | null;
  postedVoucherNo?: string | null;
  customerLedgerId?: number | null;
}

export interface RegisterReportFilterParams {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  customerIds?: string[];
  vendorIds?: string[];
  branch?: string | string[];
  warehouse?: string | string[];
  customerTypes?: string[];
  states?: string | string[];
  statuses?: string[];
  voucherTypes?: string[];
  product?: string | string[];
  salespersons?: string[];
  gstRate: string;
  /** "all" | "cgst_sgst" | "igst" */
  gstType?: string;
  invoiceNo?: string;
  search: string;
}

export interface RegisterReportTotals {
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  discount: number;
  otherCharges: number;
  grandTotal: number;
  count: number;
}

export interface RegisterPartyOption {
  id: number;
  name: string;
}
