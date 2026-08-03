import type {
  BankAccountApiAccountType,
  BankAccountApiStatus,
  BankAccountOpeningBalanceType,
  CreateBankAccountPayload,
  UpdateBankAccountPayload,
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

export type BankAccountFormMode = "create" | "edit" | "complete";

/** Fields that support blur / full-form validation. */
export type BankAccountValidatedField =
  | "ledgerName"
  | "alias"
  | "description"
  | "openingBalance"
  | "openingBalanceType"
  | "bankName"
  | "accountHolderName"
  | "accountNumber"
  | "confirmAccountNumber"
  | "ifscCode"
  | "branchName"
  | "accountType";

const VALIDATED_FIELDS: BankAccountValidatedField[] = [
  "ledgerName",
  "alias",
  "description",
  "openingBalance",
  "openingBalanceType",
  "bankName",
  "accountHolderName",
  "accountNumber",
  "confirmAccountNumber",
  "ifscCode",
  "branchName",
  "accountType",
];

/** Validate a single field (blur). Returns error message or empty string when valid. */
export function validateBankAccountField(
  form: BankAccountFormValues,
  field: BankAccountValidatedField,
  _mode: BankAccountFormMode,
): string {
  switch (field) {
    case "ledgerName": {
      const ledgerName = form.ledgerName.trim();
      if (!ledgerName) return "Ledger name is required.";
      if (ledgerName.length > 255) return "Ledger name must be at most 255 characters.";
      return "";
    }
    case "alias": {
      if (form.alias.trim().length > 255) return "Alias must be at most 255 characters.";
      return "";
    }
    case "description": {
      if (form.description.trim().length > 5000) {
        return "Description must be at most 5000 characters.";
      }
      return "";
    }
    case "openingBalance": {
      const opening = normalizeOpeningBalance(form.openingBalance);
      if (!OPENING_BALANCE_RE.test(opening)) {
        return "Opening balance must be zero or a positive amount with up to 2 decimals.";
      }
      return "";
    }
    case "openingBalanceType": {
      const opening = normalizeOpeningBalance(form.openingBalance);
      if (OPENING_BALANCE_RE.test(opening) && Number(opening) > 0 && !form.openingBalanceType) {
        return "Opening balance type is required when opening balance is greater than zero.";
      }
      return "";
    }
    case "bankName": {
      if (!form.bankName.trim()) return "Bank name is required.";
      if (form.bankName.trim().length > 255) {
        return "Bank name must be at most 255 characters.";
      }
      return "";
    }
    case "accountHolderName": {
      if (!form.accountHolderName.trim()) return "Account holder name is required.";
      if (form.accountHolderName.trim().length > 255) {
        return "Account holder name must be at most 255 characters.";
      }
      return "";
    }
    case "accountNumber": {
      const accountNumber = stripAccountNumber(form.accountNumber);
      if (!accountNumber) return "Account number is required.";
      if (
        accountNumber.length < ACCOUNT_NUMBER_MIN ||
        accountNumber.length > ACCOUNT_NUMBER_MAX
      ) {
        return `Account number must be ${ACCOUNT_NUMBER_MIN}–${ACCOUNT_NUMBER_MAX} characters.`;
      }
      return "";
    }
    case "confirmAccountNumber": {
      const accountNumber = stripAccountNumber(form.accountNumber);
      const confirmAccountNumber = stripAccountNumber(form.confirmAccountNumber);
      if (!confirmAccountNumber) return "Confirm account number is required.";
      if (accountNumber !== confirmAccountNumber) return "Account numbers do not match.";
      return "";
    }
    case "ifscCode": {
      const ifsc = normalizeIfsc(form.ifscCode);
      if (!ifsc) return "IFSC code is required.";
      if (!IFSC_CODE_RE.test(ifsc)) {
        return "IFSC must match format AAAA0XXXXXX (e.g. HDFC0001234).";
      }
      return "";
    }
    case "branchName": {
      if (!form.branchName.trim()) return "Branch name is required.";
      if (form.branchName.trim().length > 255) {
        return "Branch name must be at most 255 characters.";
      }
      return "";
    }
    case "accountType": {
      if (!form.accountType) return "Account type is required.";
      return "";
    }
    default:
      return "";
  }
}

export function validateBankAccountForm(
  form: BankAccountFormValues,
  mode: BankAccountFormMode,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of VALIDATED_FIELDS) {
    const message = validateBankAccountField(form, field, mode);
    if (message) errors[field] = message;
  }
  return errors;
}

function buildBankAccountPayload(
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

export function buildCreateBankAccountPayload(
  form: BankAccountFormValues,
): CreateBankAccountPayload {
  return buildBankAccountPayload(form);
}

/** Full update/upsert payload for PUT .../ledger/:ledgerId (edit + PENDING). */
export function buildUpdateBankAccountPayload(
  form: BankAccountFormValues,
): UpdateBankAccountPayload {
  return buildBankAccountPayload(form);
}

/** True when account number looks masked / unusable for re-submit. */
export function isMaskedAccountNumber(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  return /^X{2,}/i.test(v) || /\*{2,}/.test(v);
}
