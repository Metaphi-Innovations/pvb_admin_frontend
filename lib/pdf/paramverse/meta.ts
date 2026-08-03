import { escapeHtml, asText } from "./formatters";

export interface PdfMetaField {
  label: string;
  value: string;
  /** Draw a dotted underline when value is empty (e.g. e-way bill). */
  dottedWhenEmpty?: boolean;
  colSpan?: number;
}

/** One meta cell (uppercase grey label + bold value) — no borders. */
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

/**
 * Open meta strip matching sample Delivery Challan:
 * fields sit in one/two rows with label above value — no table cell borders.
 * Pass `withDivider: true` for a grey rule under the strip (Delivery Challan).
 */
export function renderMetaGrid(
  rows: PdfMetaField[][],
  options?: { withDivider?: boolean },
): string {
  const body = rows
    .map((row) => `<tr>${row.map(renderMetaCell).join("")}</tr>`)
    .join("");
  const divider = options?.withDivider
    ? `<hr class="pv-meta-divider" />`
    : "";
  return `<table class="pv-meta">${body}</table>${divider}`;
}

export interface PdfPartyBlock {
  /** Column header e.g. BILL FROM / BILL TO / SHIP TO */
  title?: string;
  name: string;
  lines: string[];
}

export function renderPartyBlock(party: PdfPartyBlock): string {
  const lines = (party.lines || []).filter((l) => String(l ?? "").trim());
  const title = String(party.title ?? "").trim();
  return `
    <div class="pv-party">
      ${title ? `<p class="pv-party-title">${escapeHtml(title)}</p>` : ""}
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
