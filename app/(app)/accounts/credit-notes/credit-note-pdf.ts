/**
 * Credit Note PDF — GST-oriented print layout.
 * Line columns: Sr. No. | Product | HSN/SAC | Batch | Qty | UOM | Rate | Taxable |
 * CGST%/Amt | SGST%/Amt | IGST%/Amt | Total (POS-driven CGST+SGST vs IGST).
 * No Product Code, MFG Date, Expiry Date, or Discount columns.
 */

import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import { computeNoteTaxBreakup } from "@/lib/accounts/note-tax-breakup";
import {
  CREDIT_NOTE_SOURCE_LABELS,
  normalizeCreditNote,
  type CreditNoteLine,
  type CreditNoteRecord,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import { formatINR } from "./note-utils";
import { formatLinkedInvoiceNos } from "./components/LinkedInvoicesMultiSelect";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Posted / approved statuses eligible for customer PDF download. */
export function canDownloadCreditNotePdf(status: NoteWorkflowStatus): boolean {
  return status === "approved" || status === "posted" || status === "processed";
}

export function creditNotePdfFileName(creditNoteNo: string): string {
  const safe = creditNoteNo.trim().replace(/[\\/:*?"<>|]+/g, "-") || "CreditNote";
  return `CreditNote_${safe}.pdf`;
}

type LineTax = {
  taxable: number;
  tax: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  total: number;
};

function lineTaxBreakup(line: CreditNoteLine, interstate: boolean): LineTax {
  const total = round2(line.creditAmount || 0);
  const rate = 1 + (line.taxPct || 0) / 100;
  const taxable = total > 0 ? round2(total / rate) : 0;
  const tax = round2(total - taxable);
  if (interstate) {
    return {
      taxable,
      tax,
      cgstPct: 0,
      sgstPct: 0,
      igstPct: line.taxPct || 0,
      cgstAmt: 0,
      sgstAmt: 0,
      igstAmt: tax,
      total,
    };
  }
  const halfPct = round2((line.taxPct || 0) / 2);
  const halfAmt = round2(tax / 2);
  return {
    taxable,
    tax,
    cgstPct: halfPct,
    sgstPct: halfPct,
    igstPct: 0,
    cgstAmt: halfAmt,
    sgstAmt: round2(tax - halfAmt),
    igstAmt: 0,
    total,
  };
}

type HsnBucket = {
  hsn: string;
  taxPct: number;
  taxable: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
};

function buildHsnSummary(
  lines: CreditNoteLine[],
  interstate: boolean,
): HsnBucket[] {
  const map = new Map<string, HsnBucket>();
  for (const line of lines) {
    if ((line.creditAmount || 0) <= 0 && !(line.productName || "").trim()) continue;
    const br = lineTaxBreakup(line, interstate);
    if (br.total <= 0 && br.taxable <= 0) continue;
    const hsn = (line.hsn || "").trim() || "—";
    const key = `${hsn}|${line.taxPct || 0}`;
    const cur = map.get(key) ?? {
      hsn,
      taxPct: line.taxPct || 0,
      taxable: 0,
      cgstAmt: 0,
      sgstAmt: 0,
      igstAmt: 0,
    };
    cur.taxable = round2(cur.taxable + br.taxable);
    cur.cgstAmt = round2(cur.cgstAmt + br.cgstAmt);
    cur.sgstAmt = round2(cur.sgstAmt + br.sgstAmt);
    cur.igstAmt = round2(cur.igstAmt + br.igstAmt);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.hsn.localeCompare(b.hsn) || a.taxPct - b.taxPct,
  );
}

function dashOrNum(n: number, show: boolean, asPct = false): string {
  if (!show || n === 0) return "—";
  return asPct ? `${n}%` : formatINR(n);
}

export function downloadCreditNotePdf(record: CreditNoteRecord): void {
  if (!canDownloadCreditNotePdf(record.status)) {
    throw new Error("Credit Note must be posted before download");
  }

  const rec = normalizeCreditNote(record);
  const fileName = creditNotePdfFileName(rec.creditNoteNo);
  const invoiceRef =
    formatLinkedInvoiceNos(rec.linkedInvoices) || rec.sourceInvoiceNo || "—";
  const interstate = inferInterstateFromPlaceOfSupply(rec.placeOfSupply);
  const isScheme = Boolean(rec.schemeEntitlementId || rec.schemeSettlementKey);

  const printableLines = rec.lineItems.filter(
    (l) =>
      l.creditAmount > 0 ||
      l.returnQty > 0 ||
      Boolean(l.productName?.trim()) ||
      Boolean(l.description?.trim()),
  );

  const rows = printableLines
    .map((l, idx) => {
      const br = lineTaxBreakup(l, interstate);
      const name =
        l.productName?.trim() ||
        l.description?.trim() ||
        (isScheme ? rec.schemeName || "Scheme Settlement" : "Credit");
      const qty =
        l.returnQty > 0
          ? String(l.returnQty)
          : l.invoiceQty > 0
            ? String(l.invoiceQty)
            : "—";
      const showIntra = !interstate;
      const showInter = interstate;
      return `
    <tr>
      <td align="center">${idx + 1}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(l.hsn?.trim() || "—")}</td>
      <td>${escapeHtml(l.batchNo?.trim() || "—")}</td>
      <td align="right">${qty}</td>
      <td align="center">—</td>
      <td align="right">${l.unitPrice > 0 ? formatINR(l.unitPrice) : "—"}</td>
      <td align="right">${formatINR(br.taxable)}</td>
      <td align="right">${dashOrNum(br.cgstPct, showIntra, true)}</td>
      <td align="right">${dashOrNum(br.cgstAmt, showIntra)}</td>
      <td align="right">${dashOrNum(br.sgstPct, showIntra, true)}</td>
      <td align="right">${dashOrNum(br.sgstAmt, showIntra)}</td>
      <td align="right">${dashOrNum(br.igstPct, showInter, true)}</td>
      <td align="right">${dashOrNum(br.igstAmt, showInter)}</td>
      <td align="right">${formatINR(br.total)}</td>
    </tr>`;
    })
    .join("");

  const tax = computeNoteTaxBreakup(printableLines, interstate);
  const roundOff = round2(tax.total - (tax.taxableValue + tax.taxAmount));
  const hsnRows = buildHsnSummary(printableLines, interstate);

  const schemeBlock =
    isScheme && (rec.schemeCode || rec.schemeName)
      ? `<p class="muted">Scheme: ${escapeHtml(rec.schemeName || "—")}
         ${rec.schemeCode ? ` (${escapeHtml(rec.schemeCode)})` : ""}
         ${rec.schemeEntitlementId ? ` · Claim: ${escapeHtml(rec.schemeEntitlementId)}` : ""}</p>`
      : "";

  const hsnTable =
    hsnRows.length > 0
      ? `
  <h2 class="section">HSN-wise GST Summary</h2>
  <table class="hsn">
    <thead>
      <tr>
        <th>HSN/SAC</th>
        <th>GST %</th>
        <th class="num">Taxable Value</th>
        <th class="num">CGST</th>
        <th class="num">SGST</th>
        <th class="num">IGST</th>
        <th class="num">Total Tax</th>
      </tr>
    </thead>
    <tbody>
      ${hsnRows
        .map((h) => {
          const taxTot = round2(h.cgstAmt + h.sgstAmt + h.igstAmt);
          return `<tr>
        <td>${escapeHtml(h.hsn)}</td>
        <td>${h.taxPct}%</td>
        <td class="num">${formatINR(h.taxable)}</td>
        <td class="num">${interstate ? "—" : formatINR(h.cgstAmt)}</td>
        <td class="num">${interstate ? "—" : formatINR(h.sgstAmt)}</td>
        <td class="num">${interstate ? formatINR(h.igstAmt) : "—"}</td>
        <td class="num">${formatINR(taxTot)}</td>
      </tr>`;
        })
        .join("")}
    </tbody>
  </table>`
      : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(fileName)}</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 11px; color: #111; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2.section { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { color: #666; font-size: 10px; }
  table.lines, table.hsn { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
  table.lines th, table.lines td, table.hsn th, table.hsn td {
    border: 1px solid #ddd; padding: 4px 5px; vertical-align: top;
  }
  table.lines th, table.hsn th {
    background: #f5f5f5; text-align: left; font-size: 9px; text-transform: uppercase;
  }
  .num { text-align: right; }
  .totals { margin-top: 14px; width: 280px; margin-left: auto; }
  .totals td { border: none; padding: 3px 0; font-size: 11px; }
  .totals .label { color: #666; }
  .grand { font-weight: 700; font-size: 13px; }
</style></head><body>
  <h1>Credit Note</h1>
  <p class="muted">${escapeHtml(rec.creditNoteNo)} · ${escapeHtml(rec.creditNoteDate)}</p>
  <p><strong>Customer:</strong> ${escapeHtml(rec.customerName)}</p>
  <p class="muted">Source: ${escapeHtml(CREDIT_NOTE_SOURCE_LABELS[rec.source])}
  · Against Invoice(s): ${escapeHtml(invoiceRef)}
  · Place of Supply: ${escapeHtml(rec.placeOfSupply?.trim() || "—")}
  · Tax: ${interstate ? "IGST (inter-state)" : "CGST + SGST (intra-state)"}</p>
  ${schemeBlock}
  ${rec.reason ? `<p><strong>Reason:</strong> ${escapeHtml(rec.reason)}</p>` : ""}
  ${
    rows
      ? `<table class="lines">
    <thead><tr>
      <th>Sr. No.</th>
      <th>Product Name</th>
      <th>HSN/SAC</th>
      <th>Batch No.</th>
      <th>Qty</th>
      <th>UOM</th>
      <th>Rate</th>
      <th>Taxable Value</th>
      <th>CGST %</th>
      <th>CGST Amt</th>
      <th>SGST %</th>
      <th>SGST Amt</th>
      <th>IGST %</th>
      <th>IGST Amt</th>
      <th>Total Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
      : `<p>Credit amount: ${formatINR(rec.currentCreditAmount)}</p>`
  }
  <h2 class="section">Tax Summary</h2>
  <table class="totals">
    <tr><td class="label">Taxable Value</td><td align="right">${formatINR(tax.taxableValue)}</td></tr>
    <tr><td class="label">CGST</td><td align="right">${formatINR(tax.cgstAmount)}</td></tr>
    <tr><td class="label">SGST</td><td align="right">${formatINR(tax.sgstAmount)}</td></tr>
    <tr><td class="label">IGST</td><td align="right">${formatINR(tax.igstAmount)}</td></tr>
    <tr><td class="label">Round Off</td><td align="right">${formatINR(roundOff)}</td></tr>
    <tr><td class="grand">Grand Total</td><td align="right" class="grand">${formatINR(tax.total)}</td></tr>
  </table>
  ${hsnTable}
  ${rec.remarks ? `<p style="margin-top:16px"><strong>Narration:</strong> ${escapeHtml(rec.remarks)}</p>` : ""}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Please allow pop-ups to download the Credit Note PDF.");
  }
  win.document.write(html);
  win.document.close();
  win.document.title = fileName;
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* print cancelled */
    }
  }, 400);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
