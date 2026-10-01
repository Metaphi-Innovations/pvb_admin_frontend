/**
 * Bank statement upload — shared types for the import wizard.
 */

import type {
  BankReconAmountFormatConfig,
  BankReconDirectionRules,
} from "@/lib/accounts/bank-recon-register";

export type StatementFileType = "csv" | "xls" | "xlsx";

export const MAX_STATEMENT_FILE_BYTES = 10 * 1024 * 1024;

export const SYSTEM_FIELDS = {
  required: [
    { key: "transactionDate", label: "Transaction Date" },
    { key: "narration", label: "Narration / Description" },
  ],
  amountGroups: [
    { key: "debitCredit", label: "Debit & Credit Amounts", fields: ["debitAmount", "creditAmount"] },
    { key: "amountType", label: "Amount & Transaction Type", fields: ["transactionAmount", "transactionType"] },
    { key: "depositWithdrawal", label: "Deposit & Withdrawal", fields: ["depositAmount", "withdrawalAmount"] },
  ],
  optional: [
    { key: "valueDate", label: "Value Date" },
    { key: "referenceNumber", label: "Reference Number" },
    { key: "utrNumber", label: "UTR Number" },
    { key: "chequeNumber", label: "Cheque Number" },
    { key: "runningBalance", label: "Running Balance" },
    { key: "branch", label: "Branch" },
    { key: "transactionMode", label: "Transaction Mode" },
    { key: "remarks", label: "Additional Remarks" },
  ],
} as const;

export type SystemFieldKey =
  | "transactionDate"
  | "valueDate"
  | "narration"
  | "referenceNumber"
  | "utrNumber"
  | "chequeNumber"
  | "debitAmount"
  | "creditAmount"
  | "transactionAmount"
  | "transactionType"
  | "depositAmount"
  | "withdrawalAmount"
  | "runningBalance"
  | "branch"
  | "transactionMode"
  | "remarks";

export type ColumnMapping = Partial<Record<SystemFieldKey, string | null>>;

export type AmountMappingMode = "debitCredit" | "amountType" | "depositWithdrawal" | "none";

export interface ParsedStatementFile {
  fileName: string;
  fileType: StatementFileType;
  fileSize: number;
  sheetNames: string[];
  selectedSheet: string;
  rawRows: string[][];
  headerRowIndex: number;
  dataStartRowIndex: number;
  headers: string[];
  dataRows: string[][];
  totalRowsDetected: number;
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
}

export interface StatementParseError {
  code: string;
  message: string;
}

export type PreviewValidationStatus =
  | "Valid"
  | "Invalid"
  | "Duplicate – Will Not Import"
  | "Duplicate Within File"
  | "Already Imported"
  | "Existing Manual Transaction Found"
  | "Possible Duplicate"
  | "Missing Reference – Review Required"
  | "Balance Mismatch"
  | "Excluded";

export type PreviewRowAction =
  | "import"
  | "skip"
  | "exclude"
  | "link_manual"
  | "review_later"
  | "import_as_new"
  | "link_existing";

export interface PreviewRow {
  rowNumber: number;
  statementDate: string;
  valueDate: string;
  reference: string;
  utrNumber: string;
  chequeNo: string;
  narration: string;
  deposit: number;
  withdrawal: number;
  balance: number | null;
  validationStatus: PreviewValidationStatus;
  validationMessage: string;
  included: boolean;
  action: PreviewRowAction;
  linkedTransactionId: string | null;
  duplicateOfRowNumber: number | null;
  existingImportBatchId: string | null;
  existingImportFileName: string | null;
  existingTransactionId: string | null;
  manualTransactionId: string | null;
  possibleDuplicateTransactionId: string | null;
  internalStatementId: string;
  rawData: Record<string, string>;
  dateAmbiguous: boolean;
}

export interface PreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  exactDuplicates: number;
  possibleDuplicates: number;
  missingReferences: number;
  totalDeposits: number;
  totalWithdrawals: number;
  openingBalance: number | null;
  closingBalance: number | null;
  balanceDifference: number | null;
}

export interface StatementPeriodConfig {
  from: string;
  to: string;
  openingBalance: string;
  closingBalance: string;
}

export interface WizardMappingConfig {
  columnMapping: ColumnMapping;
  amountMode: AmountMappingMode;
  dateFormat: string;
  amountFormat: BankReconAmountFormatConfig;
  directionRules: BankReconDirectionRules;
  headerRowIndex: number;
  dataStartRowIndex: number;
}

export interface ImportConfirmation {
  bankAccountId: string;
  bankAccountLabel: string;
  statementPeriod: StatementPeriodConfig;
  fileName: string;
  validRows: number;
  skippedDuplicates: number;
  invalidRows: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

export interface ImportResultSummary {
  batchId: string;
  batchNumber: string;
  totalRowsProcessed: number;
  transactionsImported: number;
  manualTransactionsLinked: number;
  exactDuplicatesSkipped: number;
  possibleDuplicatesPending: number;
  invalidRowsNotImported: number;
  totalDepositsImported: number;
  totalWithdrawalsImported: number;
  status: "Completed" | "Completed with Errors";
}

export type SaveFormatOption = "new" | "update" | "once";

export const DATE_FORMAT_OPTIONS = [
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY", example: "15-06-2026" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "15/06/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "06/15/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-06-15" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY", example: "15-Jun-2026" },
] as const;
