import { escapeHtml, asText } from "./formatters";

export interface PdfMetaField {
  label: string;
  value: string;
  /** Draw a dotted underline when value is empty (e.g. e-way bill). */
  dottedWhenEmpty?: boolean;
  colSpan?: number;
}

/** One meta cell (uppercase grey label + bold value). */
export function renderMetaCell(field: PdfMetaField): string {
  const raw = String(field.value ?? "").trim();
  const empty = !raw || raw === "-" || raw === "—";
  const display =
    field.dottedWhenEmpty && empty ? "" : escapeHtml(asText(field.value, "—"));
  const span = field.colSpan && field.colSpan > 1 ? ` colspan="${field.colSpan}"` : "";
  return `<td${span}>
    <div class="pv-meta-label">${escapeHtml(field.label)}</div>
    <div class="pv-meta-value${field.dottedWhenEmpty && empty ? " dotted" : ""}">${display || "&nbsp;"}</div>
  </td>`;
}

/** Grid of meta fields as table rows. Pass rows of fields. */
export function renderMetaGrid(rows: PdfMetaField[][]): string {
  const body = rows
    .map((row) => `<tr>${row.map(renderMetaCell).join("")}</tr>`)
    .join("");
  return `<table class="pv-meta">${body}</table>`;
}

export interface PdfPartyBlock {
  name: string;
  lines: string[];
}

export function renderPartyBlock(party: PdfPartyBlock): string {
  const lines = (party.lines || []).filter((l) => String(l ?? "").trim());
  return `
    <div class="pv-party">
      <p class="name">${escapeHtml(asText(party.name))}</p>
      ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    </div>`;
}

export function renderPartyColumns(
  parties: PdfPartyBlock[],
  cols: 2 | 3 = 2,
): string {
  return `<div class="pv-parties cols-${cols}">${parties
    .map(renderPartyBlock)
    .join("")}</div>`;
}
