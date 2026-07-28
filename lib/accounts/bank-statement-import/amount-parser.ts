import type { BankReconAmountFormatConfig, BankReconDirectionRules } from "@/lib/accounts/bank-recon-register";
import { roundMoney } from "@/lib/accounts/money-format";
import { sanitizeCellValue } from "./sanitize";

export interface ParsedAmountResult {
  value: number;
  error?: string;
}

export function parseStatementAmount(
  raw: string,
  config: BankReconAmountFormatConfig,
): ParsedAmountResult {
  let s = sanitizeCellValue(raw);
  if (!s) return { value: 0 };

  let negative = false;
  if (config.bracketsNegative && /^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  if (config.currencySymbol) {
    s = s.replace(/[₹$€£]/g, "").trim();
  }

  let drCr: "dr" | "cr" | null = null;
  if (config.drCrSuffix) {
    const m = s.match(/\s+(DR|CR|Dr|Cr|dr|cr)$/i);
    if (m) {
      drCr = m[1].toLowerCase().startsWith("d") ? "dr" : "cr";
      s = s.replace(/\s+(DR|CR|Dr|Cr|dr|cr)$/i, "").trim();
    }
  }

  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  if (config.thousandSeparator === ",") {
    s = s.replace(/,/g, "");
  } else if (config.thousandSeparator === ".") {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  if (config.decimalSeparator === ",") {
    s = s.replace(",", ".");
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) {
    return { value: 0, error: `Invalid amount: ${raw}` };
  }

  let value = roundMoney(Math.abs(n));
  if (negative || (config.debitAsNegative && n < 0)) {
    /* sign handled by direction */
  }

  if (drCr === "dr" && config.debitAsNegative) negative = true;

  return { value: negative ? -value : value };
}

export interface TransactionDirectionResult {
  deposit: number;
  withdrawal: number;
  error?: string;
}

export function resolveTransactionDirection(
  row: Record<string, string>,
  mapping: Record<string, string | null | undefined>,
  amountMode: "debitCredit" | "amountType" | "depositWithdrawal" | "none",
  amountFormat: BankReconAmountFormatConfig,
  directionRules: BankReconDirectionRules,
): TransactionDirectionResult {
  const val = (key: string) => {
    const col = mapping[key as keyof typeof mapping];
    if (!col) return "";
    return row[col] ?? "";
  };

  if (amountMode === "debitCredit") {
    const debitRaw = val("debitAmount");
    const creditRaw = val("creditAmount");
    const debit = parseStatementAmount(debitRaw, amountFormat);
    const credit = parseStatementAmount(creditRaw, amountFormat);
    if (debit.error) return { deposit: 0, withdrawal: 0, error: debit.error };
    if (credit.error) return { deposit: 0, withdrawal: 0, error: credit.error };
    const d = Math.abs(debit.value);
    const c = Math.abs(credit.value);
    if (d > 0 && c > 0) return { deposit: 0, withdrawal: 0, error: "Both debit and credit entered" };
    if (d === 0 && c === 0) return { deposit: 0, withdrawal: 0, error: "Missing amount" };
    return { deposit: c, withdrawal: d };
  }

  if (amountMode === "depositWithdrawal") {
    const dep = parseStatementAmount(val("depositAmount"), amountFormat);
    const wdl = parseStatementAmount(val("withdrawalAmount"), amountFormat);
    if (dep.error) return { deposit: 0, withdrawal: 0, error: dep.error };
    if (wdl.error) return { deposit: 0, withdrawal: 0, error: wdl.error };
    const d = Math.abs(dep.value);
    const w = Math.abs(wdl.value);
    if (d > 0 && w > 0) return { deposit: 0, withdrawal: 0, error: "Both deposit and withdrawal entered" };
    if (d === 0 && w === 0) return { deposit: 0, withdrawal: 0, error: "Missing amount" };
    return { deposit: d, withdrawal: w };
  }

  if (amountMode === "amountType") {
    const amt = parseStatementAmount(val("transactionAmount"), amountFormat);
    if (amt.error) return { deposit: 0, withdrawal: 0, error: amt.error };
    const typeRaw = val("transactionType").toUpperCase().trim();
    const abs = Math.abs(amt.value);
    if (abs === 0) return { deposit: 0, withdrawal: 0, error: "Missing amount" };
    const isCredit =
      directionRules.creditLabels.some((l) => typeRaw.includes(l.toUpperCase())) ||
      (amt.value > 0 && directionRules.positiveIsDeposit);
    const isDebit =
      directionRules.debitLabels.some((l) => typeRaw.includes(l.toUpperCase())) ||
      (amt.value < 0 && !directionRules.positiveIsDeposit);
    if (isCredit && !isDebit) return { deposit: abs, withdrawal: 0 };
    if (isDebit && !isCredit) return { deposit: 0, withdrawal: abs };
    if (typeRaw) return { deposit: 0, withdrawal: 0, error: `Unknown transaction type: ${typeRaw}` };
    return directionRules.positiveIsDeposit
      ? amt.value >= 0
        ? { deposit: abs, withdrawal: 0 }
        : { deposit: 0, withdrawal: abs }
      : amt.value >= 0
        ? { deposit: 0, withdrawal: abs }
        : { deposit: abs, withdrawal: 0 };
  }

  return { deposit: 0, withdrawal: 0, error: "No amount columns mapped" };
}

export function detectAmountMode(mapping: Record<string, string | null | undefined>): "debitCredit" | "amountType" | "depositWithdrawal" | "none" {
  if (mapping.debitAmount || mapping.creditAmount) return "debitCredit";
  if (mapping.depositAmount || mapping.withdrawalAmount) return "depositWithdrawal";
  if (mapping.transactionAmount) return "amountType";
  return "none";
}

export function validateAmountMapping(mapping: Record<string, string | null | undefined>): string | null {
  const mode = detectAmountMode(mapping);
  if (mode === "debitCredit") {
    if (!mapping.debitAmount && !mapping.creditAmount) return "Map at least Debit or Credit column";
    return null;
  }
  if (mode === "depositWithdrawal") {
    if (!mapping.depositAmount && !mapping.withdrawalAmount) return "Map at least Deposit or Withdrawal column";
    return null;
  }
  if (mode === "amountType") {
    if (!mapping.transactionAmount) return "Map Transaction Amount column";
    return null;
  }
  return "Map at least one valid amount structure (Debit/Credit, Deposit/Withdrawal, or Amount + Type)";
}
