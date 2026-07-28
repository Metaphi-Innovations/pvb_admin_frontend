export interface AnnualGstBucket {
  particular: string;
  taxableValue: number;
  gstAmount: number;
  /** Optional voucher path for Open Voucher */
  voucherHref?: string | null;
}

export interface AnnualGstMonthRow {
  id: string;
  monthKey: string;
  monthLabel: string;
  salesValue: number;
  purchaseValue: number;
  outputCgst: number;
  outputSgst: number;
  outputIgst: number;
  inputCgst: number;
  inputSgst: number;
  inputIgst: number;
  netGst: number;
  outward: AnnualGstBucket[];
  inward: AnnualGstBucket[];
}

export interface AnnualGstSummaryCards {
  totalTaxableOutward: number;
  totalTaxableInward: number;
  totalOutputGst: number;
  totalInputGst: number;
  netGstPayableOrRefundable: number;
  isRefundable: boolean;
  totalCreditNotes: number;
  totalDebitNotes: number;
  totalGstLiability: number;
}

export interface AnnualGstParticularRow {
  particular: string;
  taxableValue: number;
  gstAmount: number;
  isTotal?: boolean;
}

export interface AnnualGstReport {
  months: AnnualGstMonthRow[];
  summary: AnnualGstSummaryCards;
  outwardAnnual: AnnualGstParticularRow[];
  inwardAnnual: AnnualGstParticularRow[];
  outputGst: number;
  inputGst: number;
  netGst: number;
  isRefundable: boolean;
  financialYearLabel: string;
}
