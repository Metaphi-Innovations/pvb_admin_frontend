/** Client-side Excel download for warehouse listing exports. */

export async function exportRowsToExcel(
  rows: Record<string, string | number | null | undefined>[],
  options: { sheetName: string; filePrefix: string },
): Promise<void> {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Notice: "No records to export" }]);
  const wb = XLSX.utils.book_new();
  const safeSheet = options.sheetName.slice(0, 31) || "Export";
  XLSX.utils.book_append_sheet(wb, sheet, safeSheet);
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${options.filePrefix}_${date}.xlsx`);
}
