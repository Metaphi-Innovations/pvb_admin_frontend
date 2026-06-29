export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatCurrency(n: number): string {
  const val = Number.isFinite(n) ? n : 0;
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PODiscountType = "percentage" | "flat";

export interface LineTaxInput {
  orderedQty: number;
  unitPrice: number;
  discountType?: PODiscountType;
  discountPct: number;
  discountFlatAmount?: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
}

export interface LineTaxResult {
  grossAmount: number;
  discountAmount: number;
  taxableValue: number;
  taxAmount: number;
  netAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export function calcLineAmounts(input: LineTaxInput): LineTaxResult {
  const grossAmount = round2(input.orderedQty * input.unitPrice);
  const discountAmount =
    input.discountType === "flat"
      ? round2(Math.min(Number(input.discountFlatAmount) || 0, grossAmount))
      : round2(grossAmount * ((Number(input.discountPct) || 0) / 100));
  const taxableValue = round2(grossAmount - discountAmount);
  const cgstAmount = round2(taxableValue * (input.cgstPct / 100));
  const sgstAmount = round2(taxableValue * (input.sgstPct / 100));
  const igstAmount = round2(taxableValue * (input.igstPct / 100));
  const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
  const netAmount = round2(taxableValue + taxAmount);
  return {
    grossAmount,
    discountAmount,
    taxableValue,
    taxAmount,
    netAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
  };
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ""}`.trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ").trim();
}

/** Indian numbering: amount in words (Rupees). */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  let n = rupees;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  let words = parts.join(" ").trim() || "Zero";
  words += rupees === 1 ? " Rupee" : " Rupees";
  if (paise > 0) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  return `${words} Only`;
}

export function nextId<T extends { id: number }>(list: T[]): number {
  return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
}
