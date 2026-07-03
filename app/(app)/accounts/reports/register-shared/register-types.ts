export type RegisterGstRate = 5 | 12 | 18 | 28;

export type RegisterPaymentStatus = "paid" | "partially_paid" | "pending" | "overdue";

export type RegisterInvoiceStatus = "posted" | "draft" | "cancelled";

export interface RegisterReportRow {
  id: number;
  invoiceDate: string;
  invoiceNo: string;
  partyId: number;
  partyName: string;
  gstin: string;
  state: string;
  taxableValue: number;
  gstAmount: number;
  invoiceTotal: number;
  paymentStatus: RegisterPaymentStatus;
  invoiceStatus: RegisterInvoiceStatus;
  gstRate: RegisterGstRate;
  financialYearId: number;
}

export interface RegisterReportFilterParams {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  partyId: string;
  invoiceStatus: string;
  gstRate: string;
  search: string;
}

export interface RegisterReportTotals {
  taxableValue: number;
  gstAmount: number;
  grandTotal: number;
  count: number;
}

export interface RegisterPartyOption {
  id: number;
  name: string;
}
