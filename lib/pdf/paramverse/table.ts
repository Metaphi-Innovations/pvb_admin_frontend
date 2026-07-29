import { escapeHtml } from "./formatters";

export type PdfAlign = "left" | "center" | "right";

export interface PdfTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: PdfAlign;
  nowrap?: boolean;
  numeric?: boolean;
}

export interface PdfTableRow {
  cells: Record<string, string>;
  /** Optional HTML already escaped / safe for a cell (e.g. name + subtitle). */
  htmlCells?: Record<string, string>;
}

export interface PdfTableOptions {
  columns: PdfTableColumn[];
  rows: PdfTableRow[];
  footerRow?: PdfTableRow;
  emptyColSpan?: number;
  emptyText?: string;
}

function alignClass(align?: PdfAlign, numeric?: boolean): string {
  const parts: string[] = [];
  if (align === "center") parts.push("pv-c");
  if (align === "right" || numeric) parts.push("pv-r");
  if (numeric) parts.push("pv-num");
  return parts.join(" ");
}

function renderCell(
  col: PdfTableColumn,
  row: PdfTableRow,
  asHeader = false,
): string {
  const cls = [
    alignClass(col.align, col.numeric),
    col.nowrap ? "pv-nowrap" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = col.width && asHeader ? ` style="width:${col.width}"` : "";
  const raw = row.cells[col.key];
  // Empty string must stay blank (not "-") — used by totals footer spacer cells
  const html =
    row.htmlCells?.[col.key] ??
    (raw === "" || raw === "\u00A0"
      ? "&nbsp;"
      : escapeHtml(raw ?? ""));
  const tag = asHeader ? "th" : "td";
  return `<${tag} class="${cls}"${style}>${
    asHeader ? escapeHtml(col.header) : html
  }</${tag}>`;
}

/** Reusable bordered data table with optional totals footer row. */
export function renderPdfTable(options: PdfTableOptions): string {
  const { columns, rows, footerRow, emptyText = "No line items" } = options;
  const head = `<tr>${columns
    .map((col) => renderCell(col, { cells: {} }, true))
    .join("")}</tr>`;

  const body =
    rows.length === 0
      ? `<tr><td class="pv-c" colspan="${columns.length}">${escapeHtml(
          emptyText,
        )}</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${columns.map((col) => renderCell(col, row)).join("")}</tr>`,
          )
          .join("");

  const foot = footerRow
    ? `<tr class="pv-totals-row">${columns
        .map((col) => renderCell(col, footerRow))
        .join("")}</tr>`
    : "";

  return `<table class="pv-table">
    <thead>${head}</thead>
    <tbody>${body}${foot}</tbody>
  </table>`;
}

export function renderSummaryRows(
  rows: Array<{ label: string; value: string; strong?: boolean }>,
): string {
  const body = rows
    .map((row, idx) => {
      const isLast = idx === rows.length - 1;
      return `<tr>
        <td class="lbl${row.strong || isLast ? " pv-fw" : ""}">${escapeHtml(
          row.label,
        )}</td>
        <td class="pv-r pv-num${row.strong || isLast ? " pv-fw" : ""}">${escapeHtml(
          row.value,
        )}</td>
      </tr>`;
    })
    .join("");
  return `<table class="pv-summary">${body}</table>`;
}
