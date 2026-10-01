import type { VoucherTypeCode } from "../masters/masters-data";

const URL_TO_TYPE: Record<string, VoucherTypeCode> = {
  journal: "journal",
  payment: "payment",
  receipt: "receipt",
  contra: "contra",
  sales: "sales",
  purchase: "purchase",
  "credit-note": "credit_note",
  "debit-note": "debit_note",
};

const TYPE_TO_URL: Record<VoucherTypeCode, string> = {
  journal: "journal",
  payment: "payment",
  receipt: "receipt",
  contra: "contra",
  sales: "sales",
  purchase: "purchase",
  credit_note: "credit-note",
  debit_note: "debit-note",
};

export function parseVoucherTypeParam(slug: string): VoucherTypeCode | null {
  return URL_TO_TYPE[slug] ?? null;
}

export function voucherTypeToUrl(type: VoucherTypeCode): string {
  return TYPE_TO_URL[type];
}

export const VOUCHER_URL_SLUGS = Object.keys(URL_TO_TYPE);
