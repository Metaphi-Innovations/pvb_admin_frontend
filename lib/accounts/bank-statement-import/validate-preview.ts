import type {
  BankReconAmountFormatConfig,
  BankReconDirectionRules,
  BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";
import {
  findManualTransactionMatch,
  loadBankReconTransactions,
  normalizeNarration,
  transactionFingerprint,
} from "@/lib/accounts/bank-recon-register";
import { detectAmountMode, parseStatementAmount, resolveTransactionDirection } from "./amount-parser";
import { mappingToRow } from "./column-mapper";
import { isDateInRange, parseStatementDate } from "./date-parser";
import type {
  AmountMappingMode,
  ColumnMapping,
  ParsedStatementFile,
  PreviewRow,
  PreviewRowAction,
  PreviewSummary,
  PreviewValidationStatus,
  StatementPeriodConfig,
} from "./types";

export interface BuildPreviewOptions {
  parsed: ParsedStatementFile;
  mapping: ColumnMapping;
  amountMode: AmountMappingMode;
  dateFormat: string;
  amountFormat: BankReconAmountFormatConfig;
  directionRules: BankReconDirectionRules;
  bankAccountId: string;
  statementPeriod: StatementPeriodConfig;
  existingTransactions?: BankReconTransactionRecord[];
}

export function buildPreviewRows(options: BuildPreviewOptions): PreviewRow[] {
  const {
    parsed,
    mapping,
    amountMode,
    dateFormat,
    amountFormat,
    directionRules,
    bankAccountId,
    statementPeriod,
  } = options;

  const existing = options.existingTransactions ?? loadBankReconTransactions(bankAccountId);
  const importedExisting = existing.filter(
    (t) => t.source === "Statement Upload" || t.source === "Manual + Statement",
  );

  const fileFingerprints = new Map<string, number>();
  const rows: PreviewRow[] = [];

  parsed.dataRows.forEach((dataRow, idx) => {
    const rowNumber = parsed.dataStartRowIndex + idx + 1;
    const rowMap = mappingToRow(parsed.headers, dataRow);
    const rawData: Record<string, string> = {};
    parsed.headers.forEach((h, i) => {
      rawData[h] = dataRow[i] ?? "";
    });

    let validationStatus: PreviewValidationStatus = "Valid";
    let validationMessage = "";
    let action: PreviewRowAction = "import";
    let statementDate = "";
    let valueDate = "";
    let dateAmbiguous = false;

    const dateRaw = mapping.transactionDate ? rowMap[mapping.transactionDate] ?? "" : "";
    const dateParsed = parseStatementDate(dateRaw, dateFormat);
    if (!dateParsed.iso) {
      validationStatus = "Invalid";
      validationMessage = dateParsed.error ?? "Missing transaction date";
      action = "skip";
    } else {
      statementDate = dateParsed.iso;
      dateAmbiguous = dateParsed.ambiguous;
      if (dateAmbiguous) {
        validationStatus = "Missing Reference – Review Required";
        validationMessage = "Ambiguous date format — confirm before import";
      }
    }

    const valDateRaw = mapping.valueDate ? rowMap[mapping.valueDate] ?? "" : dateRaw;
    const valParsed = parseStatementDate(valDateRaw, dateFormat);
    valueDate = valParsed.iso ?? statementDate;

    const narration = mapping.narration ? (rowMap[mapping.narration] ?? "").trim() : "";
    if (!narration && validationStatus === "Valid") {
      validationStatus = "Invalid";
      validationMessage = "Missing narration";
      action = "skip";
    }

    const mode = amountMode === "none" ? detectAmountMode(mapping) : amountMode;
    const dir = resolveTransactionDirection(rowMap, mapping, mode, amountFormat, directionRules);
    let deposit = dir.deposit;
    let withdrawal = dir.withdrawal;

    if (dir.error && validationStatus === "Valid") {
      validationStatus = "Invalid";
      validationMessage = dir.error;
      action = "skip";
    }

    if (deposit === 0 && withdrawal === 0 && validationStatus === "Valid") {
      validationStatus = "Invalid";
      validationMessage = "Zero amount";
      action = "skip";
    }

    let reference = mapping.referenceNumber ? (rowMap[mapping.referenceNumber] ?? "").trim() : "";
    const utr = mapping.utrNumber ? (rowMap[mapping.utrNumber] ?? "").trim() : "";
    const cheque = mapping.chequeNumber ? (rowMap[mapping.chequeNumber] ?? "").trim() : "";
    if (!reference && utr) reference = utr;
    if (!reference && cheque) reference = cheque;

    let balance: number | null = null;
    if (mapping.runningBalance) {
      const balRaw = rowMap[mapping.runningBalance] ?? "";
      const { value } = { value: parseBalanceAmount(balRaw, amountFormat) };
      balance = value || null;
    }

    if (
      statementPeriod.from &&
      statementPeriod.to &&
      statementDate &&
      !isDateInRange(statementDate, statementPeriod.from, statementPeriod.to) &&
      validationStatus === "Valid"
    ) {
      validationMessage = `Date ${statementDate} is outside statement period`;
      validationStatus = "Missing Reference – Review Required";
    }

    if (!reference && validationStatus === "Valid") {
      validationStatus = "Missing Reference – Review Required";
      validationMessage = validationMessage || "Missing reference — review recommended";
    }

    const internalStatementId = `STMT-${bankAccountId}-${statementDate}-${deposit || withdrawal}-${idx + 1}`;

    let linkedTransactionId: string | null = null;
    let manualTransactionId: string | null = null;
    let possibleDuplicateTransactionId: string | null = null;
    let duplicateOfRowNumber: number | null = null;
    let existingImportBatchId: string | null = null;
    let existingImportFileName: string | null = null;
    let existingTransactionId: string | null = null;

    if (validationStatus !== "Invalid") {
      const fp = transactionFingerprint(
        bankAccountId,
        statementDate,
        deposit || withdrawal,
        deposit > 0 ? "deposit" : "withdrawal",
        reference,
        narration,
      );

      if (fileFingerprints.has(fp)) {
        validationStatus = "Duplicate Within File";
        validationMessage = "Duplicate row within uploaded file";
        duplicateOfRowNumber = fileFingerprints.get(fp)!;
        action = "skip";
      } else {
        fileFingerprints.set(fp, rowNumber);
      }

      const priorImport = importedExisting.find((t) => {
        const tFp = transactionFingerprint(
          t.bankAccountId,
          t.statementDate,
          t.deposit || t.withdrawal,
          t.deposit > 0 ? "deposit" : "withdrawal",
          t.reference,
          t.narration,
        );
        return tFp === fp;
      });

      if (priorImport && validationStatus === "Valid") {
        validationStatus = "Already Imported";
        validationMessage = `Already imported on ${priorImport.importedOn?.slice(0, 10) ?? "—"}`;
        existingTransactionId = priorImport.id;
        existingImportBatchId = priorImport.importBatchId;
        existingImportFileName = priorImport.importedFileName;
        action = "skip";
      }

      const manual = findManualTransactionMatch(
        bankAccountId,
        reference,
        deposit,
        withdrawal,
        existing,
      );
      if (manual && validationStatus === "Valid") {
        validationStatus = "Existing Manual Transaction Found";
        validationMessage = `Matches manual entry ${manual.id}`;
        manualTransactionId = manual.id;
        action = "link_manual";
      }

      if (validationStatus === "Valid" || validationStatus === "Missing Reference – Review Required") {
        const possible = existing.find((t) => {
          if (t.bankAccountId !== bankAccountId) return false;
          const tAmt = t.deposit || t.withdrawal;
          const amt = deposit || withdrawal;
          if (tAmt !== amt) return false;
          const tDir = t.deposit > 0 ? "deposit" : "withdrawal";
          const dir2 = deposit > 0 ? "deposit" : "withdrawal";
          if (tDir !== dir2) return false;
          if (t.reference && reference && t.reference.toUpperCase() === reference.toUpperCase()) return false;
          const dayDiff = Math.abs(
            new Date(t.statementDate).getTime() - new Date(statementDate).getTime(),
          );
          return dayDiff <= 3 * 86400000;
        });
        if (possible && !manual) {
          validationStatus = "Possible Duplicate";
          validationMessage = `Possible match with ${possible.reference || possible.id}`;
          possibleDuplicateTransactionId = possible.id;
          action = "review_later";
        }
      }
    }

    rows.push({
      rowNumber,
      statementDate,
      valueDate,
      reference,
      utrNumber: utr,
      chequeNo: cheque,
      narration,
      deposit,
      withdrawal,
      balance,
      validationStatus,
      validationMessage,
      included: action === "import" || action === "link_manual",
      action,
      linkedTransactionId,
      duplicateOfRowNumber,
      existingImportBatchId,
      existingImportFileName,
      existingTransactionId,
      manualTransactionId,
      possibleDuplicateTransactionId,
      internalStatementId,
      rawData,
      dateAmbiguous,
    });
  });

  applyBalanceValidation(rows, options);
  return rows;
}

function parseBalanceAmount(raw: string, format: BankReconAmountFormatConfig): number {
  const r = parseStatementAmount(raw, format);
  return Math.abs(r.value);
}

function applyBalanceValidation(rows: PreviewRow[], options: BuildPreviewOptions): void {
  const withBalance = rows.filter((r) => r.balance != null && r.validationStatus !== "Invalid");
  if (withBalance.length < 2) return;

  let prevBalance: number | null = options.statementPeriod.openingBalance
    ? parseFloat(options.statementPeriod.openingBalance) || null
    : null;

  for (const row of withBalance) {
    if (prevBalance != null && row.balance != null) {
      const expected = prevBalance + row.deposit - row.withdrawal;
      const diff = Math.round((expected - row.balance) * 100) / 100;
      if (Math.abs(diff) > 0.01 && row.validationStatus === "Valid") {
        row.validationStatus = "Balance Mismatch";
        row.validationMessage = `Expected balance ${expected.toFixed(2)}, statement shows ${row.balance.toFixed(2)}`;
        row.action = "review_later";
        row.included = false;
      }
    }
    if (row.balance != null) prevBalance = row.balance;
  }
}

export function computePreviewSummary(
  rows: PreviewRow[],
  statementPeriod: StatementPeriodConfig,
): PreviewSummary {
  const importable = rows.filter(
    (r) =>
      r.included &&
      (r.validationStatus === "Valid" ||
        r.validationStatus === "Missing Reference – Review Required" ||
        r.validationStatus === "Existing Manual Transaction Found"),
  );

  const opening = statementPeriod.openingBalance ? parseFloat(statementPeriod.openingBalance) : null;
  const closing = statementPeriod.closingBalance ? parseFloat(statementPeriod.closingBalance) : null;
  let balanceDifference: number | null = null;
  if (opening != null && closing != null) {
    const calc =
      opening +
      importable.reduce((s, r) => s + r.deposit, 0) -
      importable.reduce((s, r) => s + r.withdrawal, 0);
    balanceDifference = Math.round((calc - closing) * 100) / 100;
  }

  return {
    totalRows: rows.length,
    validRows: rows.filter((r) => r.validationStatus === "Valid" || r.validationStatus === "Missing Reference – Review Required").length,
    invalidRows: rows.filter((r) => r.validationStatus === "Invalid").length,
    exactDuplicates: rows.filter(
      (r) =>
        r.validationStatus === "Duplicate Within File" ||
        r.validationStatus === "Already Imported" ||
        r.validationStatus === "Duplicate – Will Not Import",
    ).length,
    possibleDuplicates: rows.filter((r) => r.validationStatus === "Possible Duplicate").length,
    missingReferences: rows.filter((r) => r.validationStatus === "Missing Reference – Review Required").length,
    totalDeposits: importable.reduce((s, r) => s + r.deposit, 0),
    totalWithdrawals: importable.reduce((s, r) => s + r.withdrawal, 0),
    openingBalance: opening,
    closingBalance: closing,
    balanceDifference,
  };
}

export function rowsToImport(rows: PreviewRow[]): PreviewRow[] {
  return rows.filter((r) => {
    if (!r.included) return false;
    if (r.action === "skip" || r.action === "exclude") return false;
    if (
      r.validationStatus === "Invalid" ||
      r.validationStatus === "Duplicate Within File" ||
      r.validationStatus === "Already Imported" ||
      r.validationStatus === "Duplicate – Will Not Import"
    ) {
      return false;
    }
    return true;
  });
}

export function exportValidationErrorReport(rows: PreviewRow[]): string {
  const header = "Row,Status,Message,Date,Narration,Deposit,Withdrawal\n";
  const lines = rows
    .filter((r) => r.validationStatus !== "Valid")
    .map(
      (r) =>
        `${r.rowNumber},"${r.validationStatus}","${r.validationMessage.replace(/"/g, '""')}",${r.statementDate},"${r.narration.replace(/"/g, '""')}",${r.deposit},${r.withdrawal}`,
    );
  return header + lines.join("\n");
}
