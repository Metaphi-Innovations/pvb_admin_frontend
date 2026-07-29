/**
 * Sanitize spreadsheet cell values — prevent formula injection.
 */
export function sanitizeCellValue(raw: unknown): string {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return s.replace(/\0/g, "");
}

export function isBlankRow(row: string[]): boolean {
  return row.every((c) => !sanitizeCellValue(c));
}

export function detectFileType(fileName: string): "csv" | "xls" | "xlsx" | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv") return "csv";
  if (ext === "xls") return "xls";
  if (ext === "xlsx") return "xlsx";
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
