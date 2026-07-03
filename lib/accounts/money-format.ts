export type BalanceSide = "Debit" | "Credit";

/** Shared typography class for monetary values in Accounts module */
export const MONEY_AMOUNT_CLASS =
  "font-medium tabular-nums text-[13px] leading-snug text-foreground";

/** Table cell class for right-aligned monetary columns */
export const MONEY_CELL_CLASS =
  "text-right font-medium tabular-nums text-[13px] leading-snug text-foreground";

/** Input fields for debit/credit entry */
export const MONEY_INPUT_CLASS = "text-right font-medium tabular-nums";

/** Round to 2 decimal currency precision */
export function roundMoney(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
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

/** ₹ 8,50,000.00 — amount only, no Dr/Cr */
export function formatMoney(amount: number): string {
  return `₹ ${formatMoneyNumber(amount)}`;
}

/** ₹ 8,50,000.00 Dr */
export function formatMoneyWithSide(amount: number, side: BalanceSide): string {
  return `₹ ${formatMoneyNumber(amount)} ${balanceSideLabel(side)}`;
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
