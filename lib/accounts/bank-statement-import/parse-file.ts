import type { ColumnMapping, ParsedStatementFile, StatementFileType, StatementParseError } from "./types";
import { sanitizeCellValue, isBlankRow, detectFileType } from "./sanitize";
import { autoDetectColumnMapping } from "./column-mapper";
import { autoDetectDateFormat, parseStatementDate, minMaxDates } from "./date-parser";
import { MAX_STATEMENT_FILE_BYTES } from "./types";

export async function parseStatementFile(
  file: File,
  selectedSheet?: string,
  headerRowIndex = 0,
  dataStartRowIndex = 1,
): Promise<{ ok: true; parsed: ParsedStatementFile } | { ok: false; errors: StatementParseError[] }> {
  const errors: StatementParseError[] = [];

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return { ok: false, errors: [{ code: "type", message: "Unsupported file type. Use CSV, XLS or XLSX." }] };
  }
  if (file.size > MAX_STATEMENT_FILE_BYTES) {
    return { ok: false, errors: [{ code: "size", message: "File exceeds maximum size of 10 MB." }] };
  }
  if (file.size === 0) {
    return { ok: false, errors: [{ code: "empty", message: "File is empty." }] };
  }

  try {
    const buffer = await file.arrayBuffer();
    let rawRows: string[][] = [];
    let sheetNames: string[] = [];

    if (fileType === "csv") {
      const text = new TextDecoder("utf-8").decode(buffer);
      rawRows = parseCsvText(text);
      sheetNames = ["Sheet1"];
    } else {
      const XLSX = await import("xlsx");
      let workbook: import("xlsx").WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: "array", cellDates: false, bookVBA: false });
      } catch {
        return { ok: false, errors: [{ code: "parse", message: "Unable to parse Excel file. It may be password protected or corrupted." }] };
      }
      sheetNames = workbook.SheetNames ?? [];
      if (!sheetNames.length) {
        return { ok: false, errors: [{ code: "sheet", message: "No sheets found in the Excel file." }] };
      }
      const sheet = selectedSheet && sheetNames.includes(selectedSheet) ? selectedSheet : sheetNames[0];
      const ws = workbook.Sheets[sheet];
      if (!ws) {
        return { ok: false, errors: [{ code: "sheet", message: "Selected sheet not found." }] };
      }
      rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false }).map((row) =>
        (row as string[]).map((c) => sanitizeCellValue(c)),
      );
    }

    rawRows = rawRows.map((r) => r.map(sanitizeCellValue)).filter((r) => !isBlankRow(r));
    if (!rawRows.length) {
      return { ok: false, errors: [{ code: "rows", message: "No data rows found in the file." }] };
    }

    const hdrIdx = Math.max(0, Math.min(headerRowIndex, rawRows.length - 1));
    const dataIdx = Math.max(hdrIdx + 1, dataStartRowIndex);
    const headers = (rawRows[hdrIdx] ?? []).map((h, i) => sanitizeCellValue(h) || `Column ${i + 1}`);
    const dataRows = rawRows.slice(dataIdx).filter((r) => !isBlankRow(r));

    if (!dataRows.length) {
      return { ok: false, errors: [{ code: "data", message: "No transaction rows found after the header row." }] };
    }

    const mapping = autoDetectColumnMapping(headers);
    const dateCol = mapping.transactionDate ? headers.indexOf(mapping.transactionDate) : -1;
    const dateSamples = dateCol >= 0 ? dataRows.slice(0, 20).map((r) => r[dateCol] ?? "") : [];
    const dateFmt = autoDetectDateFormat(dateSamples.filter(Boolean));
    const parsedDates = dateSamples
      .map((s) => parseStatementDate(s, dateFmt).iso)
      .filter((d): d is string => Boolean(d));
    const { min, max } = minMaxDates(parsedDates);

    const parsed: ParsedStatementFile = {
      fileName: file.name,
      fileType: fileType as StatementFileType,
      fileSize: file.size,
      sheetNames,
      selectedSheet: selectedSheet && sheetNames.includes(selectedSheet) ? selectedSheet : sheetNames[0] ?? "Sheet1",
      rawRows,
      headerRowIndex: hdrIdx,
      dataStartRowIndex: dataIdx,
      headers,
      dataRows,
      totalRowsDetected: dataRows.length,
      firstTransactionDate: min,
      lastTransactionDate: max,
    };

    return { ok: true, parsed };
  } catch (e) {
    return {
      ok: false,
      errors: [{ code: "parse", message: e instanceof Error ? e.message : "Failed to parse file." }],
    };
  }
}

function parseCsvText(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines.map(parseCsvLine).filter((r) => r.some((c) => c));
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(sanitizeCellValue(cur));
      cur = "";
    } else cur += ch;
  }
  result.push(sanitizeCellValue(cur));
  return result;
}

export function rebuildParsedFromRaw(
  parsed: ParsedStatementFile,
  headerRowIndex: number,
  dataStartRowIndex: number,
): ParsedStatementFile {
  const hdrIdx = Math.max(0, Math.min(headerRowIndex, parsed.rawRows.length - 1));
  const dataIdx = Math.max(hdrIdx + 1, dataStartRowIndex);
  const headers = (parsed.rawRows[hdrIdx] ?? []).map((h, i) => sanitizeCellValue(h) || `Column ${i + 1}`);
  const dataRows = parsed.rawRows.slice(dataIdx).filter((r) => !isBlankRow(r));
  return {
    ...parsed,
    headerRowIndex: hdrIdx,
    dataStartRowIndex: dataIdx,
    headers,
    dataRows,
    totalRowsDetected: dataRows.length,
  };
}

export function validateParsedForMapping(parsed: ParsedStatementFile, mapping: ColumnMapping): string | null {
  if (!mapping.transactionDate) return "Transaction Date column is required.";
  if (!mapping.narration) return "Narration / Description column is required.";
  const hasAmount =
    mapping.debitAmount ||
    mapping.creditAmount ||
    mapping.depositAmount ||
    mapping.withdrawalAmount ||
    mapping.transactionAmount;
  if (!hasAmount) return "At least one amount column mapping is required.";
  return null;
}

export function validateFileBeforeProceed(parsed: ParsedStatementFile): StatementParseError[] {
  const errors: StatementParseError[] = [];
  if (!parsed.headers.length) errors.push({ code: "header", message: "Header row not found." });
  if (!parsed.dataRows.length) errors.push({ code: "rows", message: "No transaction rows detected." });
  return errors;
}
