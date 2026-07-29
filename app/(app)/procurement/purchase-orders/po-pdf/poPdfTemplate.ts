"use client";

import {
  asText,
  escapeHtml,
  formatAmountInWords,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "./poPdfFormatters";

export interface POPdfLineRow {
  sr: number;
  itemCode: string;
  itemName: string;
  hsn: string;
  qty: number;
  uom: string;
  rate: number;
  discount: number;
  taxableValue: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
}

export interface POPdfSummary {
  grossAmount: number;
  itemDiscount: number;
  additionalDiscount: number;
  freight: number;
  otherCharges: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
}

export interface POPdfTemplateData {
  fileTitle: string;
  logoSrc?: string;
  companyName: string;
  companyAddress: string;
  companyMetaLine: string;
  companyContactLine: string;
  poNumber: string;
  poDate: string;
  prReference: string;
  supplierQuotationRef: string;
  supplierQuotationDate: string;
  expectedDelivery: string;
  deliveryLocation: string;
  buyer: string;
  department: string;
  currency: string;
  paymentTerms: string;
  transactionType: string;
  deliveryBlockLines: string[];
  supplierBlockLines: string[];
  lines: POPdfLineRow[];
  summary: POPdfSummary;
  amountInWords?: string;
  termsLines: string[];
  specialInstructionLines: string[];
  signatoryCompany: string;
  footerLeftText?: string;
  footerCenterText?: string;
  footerRightText?: string;
}

function renderRows(lines: POPdfLineRow[]): string {
  return lines
    .map((line) => {
      const discount = line.discount > 0 ? formatPercent(line.discount) : "—";
      return `
      <tr>
        <td class="c">${line.sr}</td>
        <td class="nowrap">${escapeHtml(line.itemCode)}</td>
        <td>${escapeHtml(line.itemName)}</td>
        <td class="c nowrap">${escapeHtml(line.hsn)}</td>
        <td class="r num">${formatNumber(line.qty)}</td>
        <td class="c nowrap">${escapeHtml(line.uom)}</td>
        <td class="r num">${formatNumber(line.rate)}</td>
        <td class="r num">${discount}</td>
        <td class="r num">${formatNumber(line.taxableValue)}</td>
        <td class="r num">${formatPercent(line.gstPercent)}</td>
        <td class="r num">${formatNumber(line.gstAmount)}</td>
        <td class="r num fw">${formatNumber(line.total)}</td>
      </tr>`;
    })
    .join("");
}

function renderBulletLines(lines: string[]): string {
  if (!lines.length) return `<li>-</li>`;
  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function renderTotalsRow(lines: POPdfLineRow[]): string {
  const totals = lines.reduce(
    (acc, line) => ({
      qty: acc.qty + (Number.isFinite(line.qty) ? line.qty : 0),
      taxable: acc.taxable + (Number.isFinite(line.taxableValue) ? line.taxableValue : 0),
      gst: acc.gst + (Number.isFinite(line.gstAmount) ? line.gstAmount : 0),
      total: acc.total + (Number.isFinite(line.total) ? line.total : 0),
    }),
    { qty: 0, taxable: 0, gst: 0, total: 0 },
  );
  return `
    <tr class="totals-row">
      <td colspan="4"></td>
      <td class="r num fw">${formatNumber(totals.qty)}</td>
      <td></td>
      <td></td>
      <td></td>
      <td class="r num fw">${formatNumber(totals.taxable)}</td>
      <td></td>
      <td class="r num fw">${formatNumber(totals.gst)}</td>
      <td class="r num fw">${formatNumber(totals.total)}</td>
    </tr>`;
}

function metaCell(label: string, value: string): string {
  return `<td>
    <div class="meta-label">${escapeHtml(label)}</div>
    <div class="meta-value">${escapeHtml(value)}</div>
  </td>`;
}

export function buildPurchaseOrderPdfHtml(data: POPdfTemplateData): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.fileTitle)}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      font-size: 8.5px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 100%;
      max-height: 277mm;
      overflow: hidden;
    }
    .band {
      background: #d1d5db;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 3px 6px;
      border: 1px solid #111;
      font-size: 9px;
    }
    .header {
      display: grid;
      grid-template-columns: 78px 1fr;
      gap: 8px;
      align-items: start;
      border: 1px solid #111;
      border-bottom: none;
      padding: 6px 8px;
    }
    .logo { padding-top: 2px; }
    .logo img { max-height: 52px; max-width: 74px; object-fit: contain; display: block; }
    .companyName { font-size: 13px; font-weight: 700; text-align: center; text-transform: uppercase; margin-bottom: 2px; }
    .center { text-align: center; }
    .muted { color: #222; line-height: 1.35; }
    .title-band {
      background: #d1d5db;
      border: 1px solid #111;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 4px;
      margin-bottom: 4px;
    }
    .metaGrid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
      table-layout: fixed;
    }
    .metaGrid td {
      border: 1px solid #111;
      padding: 0;
      vertical-align: top;
      width: 16.66%;
    }
    .meta-label {
      background: #d1d5db;
      font-weight: 700;
      font-size: 7.5px;
      text-transform: uppercase;
      padding: 2px 4px;
      border-bottom: 1px solid #111;
    }
    .meta-value {
      padding: 3px 4px;
      min-height: 16px;
      font-size: 8.5px;
      font-weight: 600;
    }
    .twoCol {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #111;
      border-top: none;
      margin-bottom: 4px;
    }
    .box {
      padding: 5px 6px;
      min-height: 72px;
    }
    .box + .box { border-left: 1px solid #111; }
    .box p { margin: 0 0 1px 0; }
    .box .name { font-weight: 700; margin-bottom: 2px; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
      table-layout: fixed;
      font-size: 7.2px;
    }
    table.items th, table.items td {
      border: 1px solid #111;
      padding: 2px 2px;
      vertical-align: middle;
    }
    table.items th {
      background: #d1d5db;
      text-align: center;
      font-size: 6.8px;
      text-transform: uppercase;
      font-weight: 700;
      white-space: nowrap;
    }
    table.items td:nth-child(3) {
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .totals-row td { background: #f3f4f6; }
    .r { text-align: right; }
    .c { text-align: center; }
    .fw { font-weight: 700; }
    .nowrap { white-space: nowrap; }
    .num {
      white-space: nowrap !important;
      word-break: keep-all !important;
      overflow-wrap: normal !important;
      font-variant-numeric: tabular-nums;
      font-size: 6.9px;
      letter-spacing: -0.1px;
    }
    .amountWords {
      border: 1px solid #111;
      margin-top: 4px;
    }
    .amountWords .body { padding: 4px 6px; font-weight: 600; }
    .bottomWrap {
      margin-top: 4px;
      display: grid;
      grid-template-columns: 1fr 230px;
      gap: 4px;
      align-items: start;
    }
    .terms, .special { border: 1px solid #111; }
    .special { margin-top: 4px; }
    .terms ul, .special ul {
      margin: 0;
      padding: 3px 6px 4px 16px;
      line-height: 1.3;
    }
    .summaryTable { width: 100%; border-collapse: collapse; border: 1px solid #111; }
    .summaryTable td { border: 1px solid #111; padding: 2px 5px; }
    .summaryTable td.r { white-space: nowrap; }
    .summaryTable tr:last-child td { background: #e5e7eb; font-weight: 700; }
    .sign-wrap {
      margin-top: 10px;
      text-align: right;
      page-break-inside: avoid;
    }
    .sign-company { font-weight: 700; text-transform: uppercase; }
    .sign-gap { height: 28px; }
    .sign-label { font-size: 8px; }
    .footer {
      margin-top: 6px;
      border-top: 1px solid #999;
      padding-top: 3px;
      font-size: 7.5px;
      color: #333;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="logo">
        ${data.logoSrc ? `<img src="${escapeHtml(data.logoSrc)}" alt="Logo" />` : ""}
      </div>
      <div>
        <div class="companyName">${escapeHtml(data.companyName)}</div>
        <div class="center muted">${escapeHtml(data.companyAddress)}</div>
        <div class="center muted">${escapeHtml(data.companyMetaLine)}</div>
        <div class="center muted">${escapeHtml(data.companyContactLine)}</div>
      </div>
    </div>
    <div class="title-band">PURCHASE ORDER</div>

    <table class="metaGrid">
      <tr>
        ${metaCell("PO Number", data.poNumber)}
        ${metaCell("PO Date", data.poDate)}
        ${metaCell("PR Reference No.", data.prReference)}
        ${metaCell("Supplier Quotation Ref.", data.supplierQuotationRef)}
        ${metaCell("Supplier Quotation Date", data.supplierQuotationDate)}
        ${metaCell("Expected Delivery", data.expectedDelivery)}
      </tr>
      <tr>
        ${metaCell("Delivery Location", data.deliveryLocation)}
        ${metaCell("Department", data.department)}
        ${metaCell("Buyer", data.buyer)}
        ${metaCell("Currency", data.currency)}
        ${metaCell("Payment Terms", data.paymentTerms)}
        ${metaCell("Transaction Type", data.transactionType)}
      </tr>
    </table>

    <div class="band">Delivery &amp; Supplier Information</div>
    <div class="twoCol">
      <div class="box">
        ${data.deliveryBlockLines
          .map((line, idx) =>
            idx === 0
              ? `<p class="name">${escapeHtml(line)}</p>`
              : `<p>${escapeHtml(line)}</p>`,
          )
          .join("")}
      </div>
      <div class="box">
        ${data.supplierBlockLines
          .map((line, idx) =>
            idx === 0
              ? `<p class="name">${escapeHtml(line)}</p>`
              : `<p>${escapeHtml(line)}</p>`,
          )
          .join("")}
      </div>
    </div>

    <div class="band">Item Details</div>
    <table class="items">
      <thead>
        <tr>
          <th style="width:3%">Sr</th>
          <th style="width:8%">Item Code</th>
          <th style="width:16%">Item Name</th>
          <th style="width:6%">HSN</th>
          <th style="width:7%">Qty</th>
          <th style="width:4%">UOM</th>
          <th style="width:9%">Rate</th>
          <th style="width:5%">Disc %</th>
          <th style="width:12%">Taxable Val</th>
          <th style="width:5%">GST %</th>
          <th style="width:12%">GST Amt</th>
          <th style="width:13%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${renderRows(data.lines)}
        ${renderTotalsRow(data.lines)}
      </tbody>
    </table>

    <div class="amountWords">
      <div class="band" style="border:none;border-bottom:1px solid #111;">Amount In Words</div>
      <div class="body">${escapeHtml(formatAmountInWords(data.summary.grandTotal, data.amountInWords))}</div>
    </div>

    <div class="bottomWrap">
      <div>
        <div class="terms">
          <div class="band" style="border:none;border-bottom:1px solid #111;">Terms &amp; Declaration</div>
          <ul>${renderBulletLines(data.termsLines)}</ul>
        </div>
        <div class="special">
          <div class="band" style="border:none;border-bottom:1px solid #111;">Special Instructions</div>
          <ul>${renderBulletLines(data.specialInstructionLines)}</ul>
        </div>
      </div>
      <div>
        <div class="band">PO Summary</div>
        <table class="summaryTable">
          <tr><td>Gross Amount</td><td class="r">${formatCurrency(data.summary.grossAmount)}</td></tr>
          <tr><td>Item Discount</td><td class="r">(–) ${formatCurrency(data.summary.itemDiscount)}</td></tr>
          <tr><td>Additional Discount</td><td class="r">(–) ${formatCurrency(data.summary.additionalDiscount)}</td></tr>
          <tr><td>Freight</td><td class="r">(+) ${formatCurrency(data.summary.freight)}</td></tr>
          <tr><td>Other Charges</td><td class="r">(+) ${formatCurrency(data.summary.otherCharges)}</td></tr>
          <tr><td>Taxable Value</td><td class="r">${formatCurrency(data.summary.taxableValue)}</td></tr>
          <tr><td>CGST</td><td class="r">${formatCurrency(data.summary.cgst)}</td></tr>
          <tr><td>SGST</td><td class="r">${formatCurrency(data.summary.sgst)}</td></tr>
          <tr><td>IGST</td><td class="r">${data.summary.igst ? formatCurrency(data.summary.igst) : "–"}</td></tr>
          <tr><td>Round Off</td><td class="r">${formatNumber(data.summary.roundOff)}</td></tr>
          <tr><td>Grand Total</td><td class="r">${formatCurrency(data.summary.grandTotal)}</td></tr>
        </table>
      </div>
    </div>

    <div class="sign-wrap">
      <div class="sign-company">FOR ${escapeHtml(data.signatoryCompany)}</div>
      <div class="sign-gap"></div>
      <div class="sign-label">Authorised Signatory</div>
    </div>

    <div class="footer">
      <span>${escapeHtml(asText(data.footerLeftText, "This is a computer-generated Purchase Order."))}</span>
      <span>${escapeHtml(asText(data.footerCenterText, `${asText(data.poNumber)} · ${asText(data.poDate)}`))}</span>
      <span>${escapeHtml(asText(data.footerRightText, data.companyName))} | Page 1 of 1</span>
    </div>
  </div>
</body>
</html>`;
}
