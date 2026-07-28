import type { ColumnMapping, SystemFieldKey } from "./types";

const FIELD_ALIASES: Record<SystemFieldKey, string[]> = {
  transactionDate: ["date", "transaction date", "txn date", "posting date", "tran date", "value date"],
  valueDate: ["value date", "val date"],
  narration: ["narration", "description", "particulars", "transaction details", "remarks", "details"],
  referenceNumber: ["reference", "ref no", "ref. no", "transaction id", "txn id"],
  utrNumber: ["utr", "utr no", "utr number"],
  chequeNumber: ["cheque no", "cheque number", "chq no", "instrument no", "instrument number"],
  debitAmount: ["debit", "debit amount", "withdrawal", "withdrawal amount", "dr amount"],
  creditAmount: ["credit", "credit amount", "deposit", "deposit amount", "cr amount"],
  transactionAmount: ["amount", "transaction amount", "txn amount"],
  transactionType: ["type", "transaction type", "dr/cr", "d/c", "cr/dr"],
  depositAmount: ["deposit", "deposit amount", "credit amount"],
  withdrawalAmount: ["withdrawal", "withdrawal amount", "debit amount"],
  runningBalance: ["balance", "closing balance", "running balance", "available balance"],
  branch: ["branch", "branch name"],
  transactionMode: ["mode", "transaction mode", "channel"],
  remarks: ["remarks", "additional remarks", "notes"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [SystemFieldKey, string[]][]) {
    for (const header of headers) {
      const norm = normalizeHeader(header);
      if (used.has(header)) continue;
      if (aliases.some((a) => norm === a || norm.includes(a))) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }

  if (mapping.transactionDate && mapping.valueDate && mapping.transactionDate === mapping.valueDate) {
    delete mapping.valueDate;
  }

  return mapping;
}

export function headersToOptions(headers: string[]): { value: string; label: string }[] {
  return [{ value: "__none__", label: "— Not mapped —" }, ...headers.map((h) => ({ value: h, label: h }))];
}

export function mappingToRow(rawHeaders: string[], dataRow: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  rawHeaders.forEach((h, i) => {
    row[h] = dataRow[i] ?? "";
  });
  return row;
}
