import type { BankReconSavedFormat } from "@/lib/accounts/bank-recon-register";
import {
  buildBatchNumber,
  createImportBatchId,
  createImportedTransaction,
  createSavedFormatId,
  linkManualWithStatement,
  loadBankReconTransactions,
  saveImportBatch,
  saveSavedFormat,
  updateAccountImportMeta,
  upsertBankReconTransaction,
  type BankReconImportBatch,
} from "@/lib/accounts/bank-recon-register";
import type { PreviewRow, ImportResultSummary, SaveFormatOption, StatementPeriodConfig, WizardMappingConfig } from "./types";
import { rowsToImport } from "./validate-preview";

export interface ExecuteImportInput {
  bankAccountId: string;
  fileName: string;
  fileType: string;
  statementPeriod: StatementPeriodConfig;
  previewRows: PreviewRow[];
  mappingConfig: WizardMappingConfig;
  savedFormatId: string | null;
  saveFormat?: {
    option: SaveFormatOption;
    formatName: string;
    existingFormatId?: string;
  };
  importedBy?: string;
}

export function executeStatementImport(input: ExecuteImportInput): ImportResultSummary {
  const importedBy = input.importedBy ?? "Finance User";
  const batchId = createImportBatchId();
  const batchNumber = buildBatchNumber();
  const toProcess = rowsToImport(input.previewRows);

  let transactionsImported = 0;
  let manualLinked = 0;
  let possiblePending = 0;
  let skippedDup = 0;
  let invalidSkipped = input.previewRows.filter((r) => r.validationStatus === "Invalid").length;

  const all = loadBankReconTransactions();

  for (const row of input.previewRows) {
    if (
      row.validationStatus === "Duplicate Within File" ||
      row.validationStatus === "Already Imported" ||
      row.validationStatus === "Duplicate – Will Not Import"
    ) {
      skippedDup++;
    }
    if (row.validationStatus === "Possible Duplicate" && row.action === "review_later") {
      possiblePending++;
    }
  }

  let totalDeposit = 0;
  let totalWithdrawal = 0;
  let savedFormatId = input.savedFormatId;

  if (input.saveFormat && input.saveFormat.option !== "once") {
    const fmt: BankReconSavedFormat = {
      id:
        input.saveFormat.option === "update" && input.saveFormat.existingFormatId
          ? input.saveFormat.existingFormatId
          : createSavedFormatId(),
      formatName: input.saveFormat.formatName,
      bankAccountId: input.bankAccountId,
      fileType: input.fileType as "csv" | "xls" | "xlsx",
      sheetNamePattern: null,
      headerRow: input.mappingConfig.headerRowIndex,
      dataStartRow: input.mappingConfig.dataStartRowIndex,
      columnMapping: input.mappingConfig.columnMapping,
      dateFormat: input.mappingConfig.dateFormat,
      amountFormat: input.mappingConfig.amountFormat,
      directionRules: input.mappingConfig.directionRules,
      createdBy: importedBy,
      createdOn: new Date().toISOString(),
      updatedOn: new Date().toISOString(),
    };
    saveSavedFormat(fmt);
    savedFormatId = fmt.id;
  }

  for (const row of toProcess) {
    if (row.action === "link_manual" && row.manualTransactionId) {
      const manual = all.find((t) => t.id === row.manualTransactionId);
      if (manual) {
        const linked = linkManualWithStatement(
          manual,
          {
            statementDate: row.statementDate,
            valueDate: row.valueDate,
            reference: row.reference,
            utrNumber: row.utrNumber || null,
            chequeNo: row.chequeNo || null,
            narration: row.narration,
            runningBalance: row.balance,
            importedFileName: input.fileName,
            importBatchId: batchId,
            importedBy,
            importedOn: new Date().toISOString(),
            originalRowNumber: row.rowNumber,
            originalRawData: row.rawData,
            savedFormatId,
            statementPeriodFrom: input.statementPeriod.from,
            statementPeriodTo: input.statementPeriod.to,
          },
          batchId,
          importedBy,
        );
        upsertBankReconTransaction(linked);
        manualLinked++;
        totalDeposit += row.deposit;
        totalWithdrawal += row.withdrawal;
      }
      continue;
    }

    const txn = createImportedTransaction({
      bankAccountId: input.bankAccountId,
      statementDate: row.statementDate,
      valueDate: row.valueDate,
      bookDate: null,
      reference: row.reference,
      utrNumber: row.utrNumber || null,
      chequeNo: row.chequeNo || null,
      narration: row.narration,
      partyLedger: "—",
      deposit: row.deposit,
      withdrawal: row.withdrawal,
      runningBalance: row.balance,
      source: "Statement Upload",
      matchStatus: row.reference ? "Pending" : "Uncategorized",
      verificationStatus: "Verified Statement Entry",
      reconciliationDate: null,
      relatedRecord: null,
      importedFileName: input.fileName,
      importBatchId: batchId,
      importedBy,
      importedOn: new Date().toISOString(),
      originalRowNumber: row.rowNumber,
      originalRawData: row.rawData,
      savedFormatId,
      statementPeriodFrom: input.statementPeriod.from,
      statementPeriodTo: input.statementPeriod.to,
      internalStatementId: row.internalStatementId,
      linkedManualTransactionId: null,
    });
    upsertBankReconTransaction(txn);
    transactionsImported++;
    totalDeposit += row.deposit;
    totalWithdrawal += row.withdrawal;
  }

  const batch: BankReconImportBatch = {
    id: batchId,
    batchNumber,
    bankAccountId: input.bankAccountId,
    fileName: input.fileName,
    fileType: input.fileType,
    statementPeriodFrom: input.statementPeriod.from,
    statementPeriodTo: input.statementPeriod.to,
    openingBalance: input.statementPeriod.openingBalance
      ? parseFloat(input.statementPeriod.openingBalance)
      : null,
    closingBalance: input.statementPeriod.closingBalance
      ? parseFloat(input.statementPeriod.closingBalance)
      : null,
    totalRows: input.previewRows.length,
    importedRows: transactionsImported + manualLinked,
    invalidRows: invalidSkipped,
    duplicateRows: skippedDup,
    linkedManualRows: manualLinked,
    possibleDuplicateRows: possiblePending,
    totalDeposit,
    totalWithdrawal,
    importedBy,
    importedOn: new Date().toISOString(),
    status: invalidSkipped > 0 || possiblePending > 0 ? "Completed with Errors" : "Completed",
    savedFormatId,
    errorReportJson: null,
  };
  saveImportBatch(batch);

  updateAccountImportMeta({
    bankAccountId: input.bankAccountId,
    lastStatementImportedUntil: input.statementPeriod.to || input.statementPeriod.from,
    lastImportBatchId: batchId,
    lastImportFileName: input.fileName,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bank-recon-register-updated", { detail: { batchId } }));
  }

  return {
    batchId,
    batchNumber,
    totalRowsProcessed: input.previewRows.length,
    transactionsImported,
    manualTransactionsLinked: manualLinked,
    exactDuplicatesSkipped: skippedDup,
    possibleDuplicatesPending: possiblePending,
    invalidRowsNotImported: invalidSkipped,
    totalDepositsImported: totalDeposit,
    totalWithdrawalsImported: totalWithdrawal,
    status: batch.status === "Completed with Errors" ? "Completed with Errors" : "Completed",
  };
}
