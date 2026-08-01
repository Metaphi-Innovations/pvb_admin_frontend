import type {
  BankAccountApiAccountType,
  BankAccountApiStatus,
  BankAccountOpeningBalanceType,
  CompleteBankAccountDetailsPayload,
  CreateBankAccountPayload,
} from "@/services/bank-accounts-list.service";

export const IFSC_CODE_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const OPENING_BALANCE_RE = /^\d+(\.\d{1,2})?$/;
export const ACCOUNT_NUMBER_MIN = 4;
export const ACCOUNT_NUMBER_MAX = 50;

export interface BankAccountFormValues {
  ledgerName: string;
  alias: string;
  description: string;
  status: BankAccountApiStatus;
  openingBalance: string;
  openingBalanceType: BankAccountOpeningBalanceType;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: BankAccountApiAccountType;
  currencyCode: string;
  reconciliationEnabled: boolean;
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
  warehouseIds: string[];
}

export const EMPTY_BANK_ACCOUNT_FORM: BankAccountFormValues = {
  ledgerName: "",
  alias: "",
  description: "",
  status: "ACTIVE",
  openingBalance: "0",
  openingBalanceType: "DEBIT",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  branchName: "",
  accountType: "CURRENT",
  currencyCode: "INR",
  reconciliationEnabled: false,
  defaultForReceipts: false,
  defaultForPayments: false,
  warehouseIds: [],
};

export function stripAccountNumber(value: string): string {
  return value.replace(/\s+/g, "");
}

export function normalizeIfsc(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeOpeningBalance(value: string): string {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return "0";
  return trimmed;
}

export function validateBankAccountForm(
  form: BankAccountFormValues,
  mode: "create" | "complete",
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (mode === "create") {
    const ledgerName = form.ledgerName.trim();
    if (!ledgerName) errors.ledgerName = "Ledger name is required.";
    else if (ledgerName.length > 255) errors.ledgerName = "Ledger name must be at most 255 characters.";

    if (form.alias.trim().length > 255) {
      errors.alias = "Alias must be at most 255 characters.";
    }
    if (form.description.trim().length > 5000) {
      errors.description = "Description must be at most 5000 characters.";
    }

    const opening = normalizeOpeningBalance(form.openingBalance);
    if (!OPENING_BALANCE_RE.test(opening)) {
      errors.openingBalance =
        "Opening balance must be zero or a positive amount with up to 2 decimals.";
    }
  }

  if (!form.bankName.trim()) errors.bankName = "Bank name is required.";
  else if (form.bankName.trim().length > 255) {
    errors.bankName = "Bank name must be at most 255 characters.";
  }

  if (!form.accountHolderName.trim()) {
    errors.accountHolderName = "Account holder name is required.";
  } else if (form.accountHolderName.trim().length > 255) {
    errors.accountHolderName = "Account holder name must be at most 255 characters.";
  }

  const accountNumber = stripAccountNumber(form.accountNumber);
  const confirmAccountNumber = stripAccountNumber(form.confirmAccountNumber);

  if (!accountNumber) errors.accountNumber = "Account number is required.";
  else if (
    accountNumber.length < ACCOUNT_NUMBER_MIN ||
    accountNumber.length > ACCOUNT_NUMBER_MAX
  ) {
    errors.accountNumber = `Account number must be ${ACCOUNT_NUMBER_MIN}–${ACCOUNT_NUMBER_MAX} characters.`;
  }

  if (!confirmAccountNumber) {
    errors.confirmAccountNumber = "Confirm account number is required.";
  } else if (accountNumber !== confirmAccountNumber) {
    errors.confirmAccountNumber = "Account numbers do not match.";
  }

  const ifsc = normalizeIfsc(form.ifscCode);
  if (!ifsc) errors.ifscCode = "IFSC code is required.";
  else if (!IFSC_CODE_RE.test(ifsc)) {
    errors.ifscCode = "IFSC must match format AAAA0XXXXXX (e.g. HDFC0001234).";
  }

  if (!form.branchName.trim()) errors.branchName = "Branch name is required.";
  else if (form.branchName.trim().length > 255) {
    errors.branchName = "Branch name must be at most 255 characters.";
  }

  if (!form.accountType) errors.accountType = "Account type is required.";

  return errors;
}

export function buildCreateBankAccountPayload(
  form: BankAccountFormValues,
): CreateBankAccountPayload {
  const opening = normalizeOpeningBalance(form.openingBalance);
  const openingNum = Number(opening);
  const accountNumber = stripAccountNumber(form.accountNumber);

  const payload: CreateBankAccountPayload = {
    ledgerName: form.ledgerName.trim(),
    alias: form.alias.trim() || null,
    description: form.description.trim() || null,
    status: form.status,
    bankName: form.bankName.trim(),
    accountHolderName: form.accountHolderName.trim(),
    accountNumber,
    confirmAccountNumber: stripAccountNumber(form.confirmAccountNumber),
    ifscCode: normalizeIfsc(form.ifscCode),
    branchName: form.branchName.trim(),
    accountType: form.accountType,
    currencyCode: (form.currencyCode.trim() || "INR").toUpperCase(),
    reconciliationEnabled: form.reconciliationEnabled,
    defaultForReceipts: form.defaultForReceipts,
    defaultForPayments: form.defaultForPayments,
    warehouseIds: [...new Set(form.warehouseIds.filter(Boolean))],
  };

  if (openingNum > 0) {
    payload.openingBalance = opening;
    payload.openingBalanceType = form.openingBalanceType;
  } else {
    payload.openingBalance = "0";
    payload.openingBalanceType = form.openingBalanceType || "DEBIT";
  }

  return payload;
}

export function buildCompleteBankAccountDetailsPayload(
  form: BankAccountFormValues,
): CompleteBankAccountDetailsPayload {
  return {
    bankName: form.bankName.trim(),
    accountHolderName: form.accountHolderName.trim(),
    accountNumber: stripAccountNumber(form.accountNumber),
    confirmAccountNumber: stripAccountNumber(form.confirmAccountNumber),
    ifscCode: normalizeIfsc(form.ifscCode),
    branchName: form.branchName.trim(),
    accountType: form.accountType,
    currencyCode: (form.currencyCode.trim() || "INR").toUpperCase(),
    reconciliationEnabled: form.reconciliationEnabled,
    defaultForReceipts: form.defaultForReceipts,
    defaultForPayments: form.defaultForPayments,
    warehouseIds: [...new Set(form.warehouseIds.filter(Boolean))],
  };
}
