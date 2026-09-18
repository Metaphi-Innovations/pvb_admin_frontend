export type BalanceSide = "Debit" | "Credit";

/** Shared typography class for monetary values in Accounts module */
export const MONEY_AMOUNT_CLASS =
  "font-medium tabular-nums text-xs leading-snug text-slate-800 whitespace-nowrap";

/** Table cell class for right-aligned monetary columns */
export const MONEY_CELL_CLASS =
  "text-right font-medium tabular-nums text-xs leading-snug text-slate-800 whitespace-nowrap";

/** Input fields for debit/credit entry */
export const MONEY_INPUT_CLASS = "text-right font-medium tabular-nums";

/** Round to 2 decimal currency precision */
export function roundMoney(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Signed round-off that makes a transaction total a whole rupee.
 * Matches backend ROUND_HALF_UP: fractional part >= 0.50 rounds away from zero.
 * Examples: 2000.50 → +0.50 (final 2001); 2000.25 → -0.25 (final 2000).
 * Derived after taxes, discounts, and additional charges — never typed in.
 */
export function computeAutomaticRoundOff(unroundedAmount: number): number {
  const amount = roundMoney(unroundedAmount);
  if (amount === 0) return 0;
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs + 1e-9);
  const fraction = roundMoney(abs - whole);
  const roundedAbs = fraction >= 0.5 ? whole + 1 : whole;
  return roundMoney(sign * roundedAbs - amount);
}

/** Parse typed amount to 2-decimal number without changing user intent */
export function parseMoneyInput(raw: string): number {
  const sanitized = raw.replace(/[₹,\s]/g, "").trim();
  if (!sanitized || sanitized === ".") return 0;
  const n = parseFloat(sanitized);
  if (!Number.isFinite(n)) return 0;
  return roundMoney(n);
}

export function balanceSideLabel(side: BalanceSide): "Dr" | "Cr" {
  return side === "Debit" ? "Dr" : "Cr";
}

/** Format numeric portion with Indian grouping and 2 decimals */
export function formatMoneyNumber(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));
}

const MONEY_SYMBOL = "₹\u00a0";

/** ₹ 8,50,000.00 — amount only, no Dr/Cr */
export function formatMoney(amount: number): string {
  return `${MONEY_SYMBOL}${formatMoneyNumber(amount)}`;
}

/** ₹ 8,50,000.00 Dr */
export function formatMoneyWithSide(amount: number, side: BalanceSide): string {
  return `${MONEY_SYMBOL}${formatMoneyNumber(amount)} ${balanceSideLabel(side)}`;
}

/** Format balance object or ledger opening balance */
export function formatBalanceAmount(
  amount: number,
  balanceType: BalanceSide,
): string {
  return formatMoneyWithSide(amount, balanceType);
}

/** For debit/credit columns — zero shows em dash */
export function formatMoneyOrDash(amount: number): string {
  if (!amount) return "—";
  return formatMoney(amount);
}

/**
 * Format backend Decimal strings for display without frontend accounting math.
 * Uses Number only for Indian grouping presentation.
 */
export function formatMoneyString(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return formatMoney(0);
  }
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return formatMoney(0);
  return formatMoney(n);
}

/** Zero / empty opposite side → em dash (Accounts report convention). */
export function formatMoneyStringOrDash(
  amount: string | number | null | undefined
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n) || n === 0) return "—";
  return formatMoney(n);
}
