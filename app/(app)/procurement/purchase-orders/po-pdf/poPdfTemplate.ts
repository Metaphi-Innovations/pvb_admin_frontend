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
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
  isCharge?: boolean;
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
  buyer: string;
  department: string;
  currency: string;
  paymentTerms: string;
  supplierBlockLines: string[];
  billToBlockLines: string[];
  shipToBlockLines: string[];
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
  { key: "sr", header: "Sr", width: "3%", align: "center" },
  { key: "itemCode", header: "Product Code", width: "7.5%", nowrap: true },
  { key: "itemName", header: "Product Name", width: "19%" },
  { key: "hsn", header: "HSN", width: "5.5%", align: "center", nowrap: true },
  { key: "qty", header: "Qty", width: "5.5%", numeric: true },
  { key: "uom", header: "UOM", width: "4%", align: "center" },
  { key: "rate", header: "Rate Per Unit", width: "9%", numeric: true },
  { key: "discount", header: "Disc %", width: "4.5%", numeric: true },
  { key: "taxable", header: "Taxable Val", width: "8%", numeric: true },
  { key: "gstPct", header: "GST %", width: "5%", numeric: true },
  { key: "cgst", header: "CGST", width: "6%", numeric: true },
  { key: "sgst", header: "SGST", width: "6%", numeric: true },
  { key: "igst", header: "IGST", width: "6%", numeric: true },
  { key: "total", header: "Total", width: "11%", numeric: true },
];

function meta(label: string, value: string, colSpan?: number): PdfMetaField {
  return { label, value: asText(value, "—"), colSpan };
}

function taxOrBlank(amount: number): string {
  return amount > 0.0001 ? formatCurrency(amount) : "";
}

function taxAmountOrBlank(amount: number): string {
  return amount > 0.0001 ? formatNumber(amount) : "";
}

function toTableRows(lines: POPdfLineRow[]): PdfTableRow[] {
  return lines.map((line) => {
    const discount = line.discount > 0 ? formatPercent(line.discount) : "—";
    const nameHtml = `<span class="po-product-name">${escapeHtml(line.itemName)}${
      line.itemSubName
        ? `<span class="sub">${escapeHtml(line.itemSubName)}</span>`
        : ""
    }</span>`;
    return {
      cells: {
        sr: String(line.sr),
        itemCode: line.itemCode,
        itemName: line.itemName,
        hsn: line.hsn,
        qty: line.isCharge ? "" : formatNumber(line.qty),
        uom: line.isCharge ? "" : line.uom,
        rate: formatNumber(line.rate),
        discount: line.isCharge ? "" : discount,
        taxable: formatNumber(line.taxableValue),
        gstPct: formatPercent(line.gstPercent),
        cgst: taxAmountOrBlank(line.cgstAmount),
        sgst: taxAmountOrBlank(line.sgstAmount),
        igst: taxAmountOrBlank(line.igstAmount),
        total: formatNumber(line.total),
      },
      htmlCells: { itemName: nameHtml },
    };
  });
}

function totalsFooter(lines: POPdfLineRow[]): PdfTableRow {
  const totals = lines.reduce(
    (acc, line) => ({
      qty:
        acc.qty +
        (!line.isCharge && Number.isFinite(line.qty) ? line.qty : 0),
      taxable: acc.taxable + (Number.isFinite(line.taxableValue) ? line.taxableValue : 0),
      cgst: acc.cgst + (Number.isFinite(line.cgstAmount) ? line.cgstAmount : 0),
      sgst: acc.sgst + (Number.isFinite(line.sgstAmount) ? line.sgstAmount : 0),
      igst: acc.igst + (Number.isFinite(line.igstAmount) ? line.igstAmount : 0),
      total: acc.total + (Number.isFinite(line.total) ? line.total : 0),
    }),
    { qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
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
      cgst: taxAmountOrBlank(totals.cgst),
      sgst: taxAmountOrBlank(totals.sgst),
      igst: taxAmountOrBlank(totals.igst),
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
      ],
      [
        meta("Department", data.department),
        meta("Buyer", data.buyer, 2),
        meta("Currency", data.currency),
        meta("Payment Terms", data.paymentTerms, 2),
      ],
    ])}

    ${renderParamverseSectionTitle("Supplier, Billing & Shipping Information")}
    ${renderPartyColumns(
      [
        {
          title: "Supplier",
          name: data.supplierBlockLines[0] || "—",
          lines: data.supplierBlockLines.slice(1),
        },
        {
          title: "Bill To",
          name: data.billToBlockLines[0] || "—",
          lines: data.billToBlockLines.slice(1),
        },
        {
          title: "Ship To",
          name: data.shipToBlockLines[0] || "—",
          lines: data.shipToBlockLines.slice(1),
        },
      ],
      3,
    )}

    ${renderParamverseSectionTitle("Product Details")}
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
          { label: "CGST", value: taxOrBlank(data.summary.cgst) },
          { label: "SGST", value: taxOrBlank(data.summary.sgst) },
          { label: "IGST", value: taxOrBlank(data.summary.igst) },
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
      table.pv-table th {
        white-space: normal;
        line-height: 1.2;
      }
      .po-product-name {
        display: block;
        font-size: 8.5px;
        font-weight: 700;
        line-height: 1.3;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .po-product-name .sub {
        display: block;
        font-size: 7px;
        font-weight: 500;
        color: #4b5563;
        margin-top: 1px;
      }
    `,
  });
}
