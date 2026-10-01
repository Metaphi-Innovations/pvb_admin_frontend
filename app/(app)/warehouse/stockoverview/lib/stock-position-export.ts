import type { StockPositionFilters, StockPositionLine } from "../types/stock-position";
import {
  getStockPositionTableHeaders,
  stockPositionLineToExportRow,
} from "./stock-position-columns";

function csvCell(value: string | number): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Export table rows only — same columns and display values as Stock Lines grid (Excel-ready CSV). */
export function exportStockPositionCsv(
  lines: StockPositionLine[],
  filters: StockPositionFilters,
  today: string,
) {
  const headers = getStockPositionTableHeaders(filters.dateMode);
  const body = lines.map((row) => stockPositionLineToExportRow(row).map(csvCell).join(","));

  const csv = [headers.map(csvCell).join(","), ...body].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const fromDate =
    filters.dateMode === "single" ? filters.asOnDate || today : filters.fromDate || today;
  const toDate =
    filters.dateMode === "single" ? filters.asOnDate || today : filters.toDate || today;

  a.download =
    filters.dateMode === "single" || fromDate === toDate
      ? `stock-position_${fromDate}.csv`
      : `stock-position_${fromDate}_to_${toDate}.csv`;

  a.click();
  URL.revokeObjectURL(url);
}
