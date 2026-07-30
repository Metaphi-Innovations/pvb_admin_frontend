"use client";

import {
  PARAMVERSE_COMPANY,
  asText,
  buildParamversePdfDocument,
  escapeHtml,
  formatAmountInWords,
  formatCurrency,
  formatNumber,
  formatPercent,
  renderMetaGrid,
  renderParamverseFooter,
  renderParamverseHeader,
  renderParamverseSectionTitle,
  renderParamverseSignatory,
  renderPartyColumns,
  renderPdfTable,
  renderSummaryRows,
  type PdfMetaField,
  type PdfTableColumn,
  type PdfTableRow,
} from "@/lib/pdf/paramverse";

export interface POPdfLineRow {
  sr: number;
  itemCode: string;
  itemName: string;
  itemSubName?: string;
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

const PO_COLUMNS: PdfTableColumn[] = [
  { key: "sr", header: "Sr", width: "4%", align: "center" },
  { key: "itemCode", header: "Item Code", width: "9%", nowrap: true },
  { key: "itemName", header: "Item Name", width: "18%" },
  { key: "hsn", header: "HSN", width: "7%", align: "center", nowrap: true },
  { key: "qty", header: "Qty", width: "7%", numeric: true },
  { key: "uom", header: "UOM", width: "5%", align: "center" },
  { key: "rate", header: "Rate", width: "8%", numeric: true },
  { key: "discount", header: "Disc %", width: "6%", numeric: true },
  { key: "taxable", header: "Taxable Val", width: "10%", numeric: true },
  { key: "gstPct", header: "GST %", width: "6%", numeric: true },
  { key: "gstAmt", header: "GST Amt", width: "9%", numeric: true },
  { key: "total", header: "Total", width: "11%", numeric: true },
];

function meta(label: string, value: string, colSpan?: number): PdfMetaField {
  return { label, value: asText(value, "—"), colSpan };
}

function toTableRows(lines: POPdfLineRow[]): PdfTableRow[] {
  return lines.map((line) => {
    const discount = line.discount > 0 ? formatPercent(line.discount) : "—";
    const nameHtml = line.itemSubName
      ? `${escapeHtml(line.itemName)}<span class="sub">${escapeHtml(
          line.itemSubName,
        )}</span>`
      : escapeHtml(line.itemName);
    return {
      cells: {
        sr: String(line.sr),
        itemCode: line.itemCode,
        itemName: line.itemName,
        hsn: line.hsn,
        qty: formatNumber(line.qty),
        uom: line.uom,
        rate: formatNumber(line.rate),
        discount,
        taxable: formatNumber(line.taxableValue),
        gstPct: formatPercent(line.gstPercent),
        gstAmt: formatNumber(line.gstAmount),
        total: formatNumber(line.total),
      },
      htmlCells: { itemName: nameHtml },
    };
  });
}

function totalsFooter(lines: POPdfLineRow[]): PdfTableRow {
  const totals = lines.reduce(
    (acc, line) => ({
      qty: acc.qty + (Number.isFinite(line.qty) ? line.qty : 0),
      taxable: acc.taxable + (Number.isFinite(line.taxableValue) ? line.taxableValue : 0),
      gst: acc.gst + (Number.isFinite(line.gstAmount) ? line.gstAmount : 0),
      total: acc.total + (Number.isFinite(line.total) ? line.total : 0),
    }),
    { qty: 0, taxable: 0, gst: 0, total: 0 },
  );
  return {
    cells: {
      sr: "",
      itemCode: "",
      itemName: "",
      hsn: "",
      qty: formatNumber(totals.qty),
      uom: "",
      rate: "",
      discount: "",
      taxable: formatNumber(totals.taxable),
      gstPct: "",
      gstAmt: formatNumber(totals.gst),
      total: formatNumber(totals.total),
    },
  };
}

function renderBullets(lines: string[]): string {
  if (!lines.length) return `<ul class="pv-bullets"><li>-</li></ul>`;
  return `<ul class="pv-bullets">${lines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("")}</ul>`;
}

export function buildPurchaseOrderPdfHtml(data: POPdfTemplateData): string {
  const company = {
    companyName: data.companyName || PARAMVERSE_COMPANY.companyName,
    companyAddress: data.companyAddress || PARAMVERSE_COMPANY.companyAddress,
    companyMetaLine: data.companyMetaLine || PARAMVERSE_COMPANY.companyMetaLine,
    companyContactLine:
      data.companyContactLine || PARAMVERSE_COMPANY.companyContactLine,
    signatoryCompany:
      data.signatoryCompany || PARAMVERSE_COMPANY.signatoryCompany,
  };

  const bodyHtml = `
    ${renderParamverseHeader({
      logoSrc: data.logoSrc,
      docTitle: "PURCHASE ORDER",
      company,
    })}

    ${renderMetaGrid([
      [
        meta("PO Number", data.poNumber),
        meta("PO Date", data.poDate),
        meta("PR Reference No.", data.prReference),
        meta("Supplier Quotation Ref.", data.supplierQuotationRef),
        meta("Supplier Quotation Date", data.supplierQuotationDate),
        meta("Expected Delivery", data.expectedDelivery),
        meta("Delivery Location", data.deliveryLocation),
      ],
      [
        meta("Department", data.department),
        meta("Buyer", data.buyer, 2),
        meta("Currency", data.currency),
        meta("Payment Terms", data.paymentTerms),
        meta("Transaction Type", data.transactionType, 2),
      ],
    ])}

    ${renderParamverseSectionTitle("Delivery & Supplier Information")}
    ${renderPartyColumns(
      [
        {
          name: data.deliveryBlockLines[0] || "—",
          lines: data.deliveryBlockLines.slice(1),
        },
        {
          name: data.supplierBlockLines[0] || "—",
          lines: data.supplierBlockLines.slice(1),
        },
      ],
      2,
    )}

    ${renderParamverseSectionTitle("Item Details")}
    ${renderPdfTable({
      columns: PO_COLUMNS,
      rows: toTableRows(data.lines),
      footerRow: totalsFooter(data.lines),
    })}

    <div class="pv-box">
      ${renderParamverseSectionTitle("Amount In Words")}
      <div class="body">${escapeHtml(
        formatAmountInWords(data.summary.grandTotal, data.amountInWords),
      )}</div>
    </div>

    <div class="po-bottom">
      <div>
        <div class="pv-box po-terms-box" style="margin-top:0">
          ${renderParamverseSectionTitle("Terms & Declaration")}
          ${renderBullets(data.termsLines)}
          <div class="po-terms-divider"></div>
          ${renderParamverseSectionTitle("Special Instructions")}
          ${renderBullets(data.specialInstructionLines)}
        </div>
      </div>
      <div>
        ${renderParamverseSectionTitle("PO Summary")}
        ${renderSummaryRows([
          { label: "Gross Amount", value: formatCurrency(data.summary.grossAmount) },
          {
            label: "Item Discount",
            value: `(–) ${formatCurrency(data.summary.itemDiscount)}`,
          },
          {
            label: "Additional Discount",
            value: `(–) ${formatCurrency(data.summary.additionalDiscount)}`,
          },
          { label: "Freight", value: `(+) ${formatCurrency(data.summary.freight)}` },
          {
            label: "Other Charges",
            value: `(+) ${formatCurrency(data.summary.otherCharges)}`,
          },
          {
            label: "Taxable Value",
            value: formatCurrency(data.summary.taxableValue),
          },
          { label: "CGST", value: formatCurrency(data.summary.cgst) },
          { label: "SGST", value: formatCurrency(data.summary.sgst) },
          {
            label: "IGST",
            value: data.summary.igst ? formatCurrency(data.summary.igst) : "–",
          },
          { label: "Round Off", value: formatNumber(data.summary.roundOff) },
          {
            label: "Grand Total",
            value: formatCurrency(data.summary.grandTotal),
            strong: true,
          },
        ])}
      </div>
    </div>

    ${renderParamverseSignatory(company.signatoryCompany)}
    ${renderParamverseFooter({
      left:
        data.footerLeftText ||
        "This is a computer-generated Purchase Order.",
      center:
        data.footerCenterText ||
        `${asText(data.poNumber)}  ·  ${asText(data.poDate)}`,
      right:
        data.footerRightText ||
        `${company.signatoryCompany}  |  Page 1 of 1`,
    })}
  `;

  return buildParamversePdfDocument({
    title: " ",
    bodyHtml,
    extraCss: `
      .po-bottom {
        margin-top: 8px;
        display: grid;
        grid-template-columns: 1fr 220px;
        gap: 10px;
        align-items: start;
      }
      .pv-box .pv-section-title { margin: 0; padding: 4px 7px 3px; border-bottom: 1px solid #e5e7eb; }
      .po-terms-box .pv-bullets { margin-bottom: 0; }
      .po-terms-divider {
        border-top: 1px solid #e5e7eb;
        margin-top: 2px;
      }
    `,
  });
}
