"use client";

import {
  asText,
  buildParamversePdfDocument,
  escapeHtml,
} from "@/lib/pdf/paramverse";

export interface PackingListPartyBlock {
  name: string;
  addressLine?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  contactNo?: string;
  email?: string;
}

export interface PackingListProductRow {
  sr: number;
  productCode: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  unit: string;
  packSize: string;
  netWtLabel: string;
  grossWtLabel: string;
}

export interface PackingListPdfData {
  logoSrc?: string;
  companyName: string;
  companyAddress: string;
  companyMetaLine: string;
  companyContactLine: string;
  packingListNo: string;
  packingListDate: string;
  refInvoiceNo: string;
  invoiceDate: string;
  dispatchDate: string;
  billTo: PackingListPartyBlock;
  shipTo: PackingListPartyBlock;
  products: PackingListProductRow[];
  totalQuantityLabel: string;
  totalUnits: number;
  totalNetWeightLabel: string;
  totalGrossWeightLabel: string;
  declaration?: string;
  signatoryLabel: string;
}

/** Matches PVB_Packing List_v2.pdf company block. */
export const PACKING_LIST_COMPANY = {
  companyName: "PARAMVERSE BIO PRIVATE LIMITED",
  companyAddress:
    "Unit No. 402, Omega Building, Near Hiranandani Garden, Opp. Colgate Palmolive, Powai, Mumbai, Maharashtra, India - 400076",
  companyMetaLine:
    "GSTIN: 27AAPCP1234F1Z8   PAN: AAPCP1234F   CIN: U46201MH2025PTC463792",
  companyContactLine: "Ph: 022-41276000/01/02/03   Email: info@paramverse.com",
  signatoryLabel: "FOR PARAMVERSE BIO PRIVATE LIMITED",
} as const;

export const DEFAULT_PACKING_DECLARATION =
  "We hereby certify that the above-mentioned agricultural products have been packed in good condition and belong to the batches mentioned above. All batch, manufacturing, and expiry details are true and correct as per company records.";

const ACCENT = "#1a5276";
const BORDER = "#bfbfbf";
const RULE = "#1a1a1a";
const MUTED = "#444444";
const SUB = "#595959";

function partyField(label: string, value: string): string {
  return `<tr>
    <td class="pl-pf-lbl">${escapeHtml(label)}</td>
    <td class="pl-pf-sep">:</td>
    <td class="pl-pf-val">${escapeHtml(asText(value, "—"))}</td>
  </tr>`;
}

function renderPartyColumn(title: string, party: PackingListPartyBlock): string {
  return `
    <div class="pl-party-col">
      <div class="pl-party-heading">${escapeHtml(title)}</div>
      <table class="pl-party-fields">
        ${partyField("Company Name", party.name)}
        ${partyField("Address", asText(party.addressLine, "—"))}
        ${partyField("State", asText(party.state, "—"))}
        ${partyField("Pincode", asText(party.pincode, "—"))}
        ${partyField("GSTIN", asText(party.gstin, "—"))}
        ${partyField("PAN", asText(party.pan, "—"))}
        ${partyField("Contact No.", asText(party.contactNo, "—"))}
        ${partyField("Email Id", asText(party.email, "—"))}
      </table>
    </div>`;
}

function renderMetaRow(label: string, value: string): string {
  return `<div class="pl-meta-row">
    <span class="pl-meta-lbl">${escapeHtml(label)}</span>
    <span class="pl-meta-val">${escapeHtml(asText(value, "—"))}</span>
  </div>`;
}

function renderProductRows(products: PackingListProductRow[]): string {
  if (!products.length) {
    return `<tr><td colspan="8" class="pl-c">No products</td></tr>`;
  }
  return products
    .map((row) => {
      const batch = asText(row.batchNo, "");
      const mfg = asText(row.mfgDate, "");
      const exp = asText(row.expiryDate, "");
      const dateLine = [
        mfg && mfg !== "-" ? `Mfg: ${mfg}` : "",
        exp && exp !== "-" ? `Expiry: ${exp}` : "",
      ]
        .filter(Boolean)
        .join("&nbsp;&nbsp;&nbsp;&nbsp;");
      return `<tr>
        <td class="pl-c">${row.sr}</td>
        <td class="pl-c pl-nowrap">${escapeHtml(asText(row.productCode, ""))}</td>
        <td class="pl-pname">
          <div class="pl-pname-main">${escapeHtml(asText(row.productName))}</div>
          ${batch && batch !== "-" ? `<div class="pl-pname-sub">Batch No: ${escapeHtml(batch)}</div>` : ""}
          ${dateLine ? `<div class="pl-pname-sub">${dateLine}</div>` : ""}
        </td>
        <td class="pl-c">${escapeHtml(String(row.qty))}</td>
        <td class="pl-c">${escapeHtml(asText(row.unit, ""))}</td>
        <td class="pl-c">${escapeHtml(asText(row.packSize, ""))}</td>
        <td class="pl-r pl-nowrap">${escapeHtml(asText(row.netWtLabel, "—"))}</td>
        <td class="pl-r pl-nowrap">${escapeHtml(asText(row.grossWtLabel, "—"))}</td>
      </tr>`;
    })
    .join("");
}

function summaryRow(label: string, value: string, strong = false): string {
  return `<tr class="${strong ? "pl-sum-strong" : ""}">
    <td>${escapeHtml(label)}</td>
    <td class="pl-r">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildPackingListPdfHtml(data: PackingListPdfData): string {
  const bodyHtml = `
    <div class="pl-header">
      <div class="pl-header-left">
        <div class="pl-logo">${
          data.logoSrc
            ? `<img src="${escapeHtml(data.logoSrc)}" alt="Logo" />`
            : ""
        }</div>
        <div class="pl-company-name">${escapeHtml(data.companyName)}</div>
        <div class="pl-muted">${escapeHtml(data.companyAddress)}</div>
        <div class="pl-muted pl-meta-dark">${escapeHtml(data.companyMetaLine)}</div>
        <div class="pl-muted pl-meta-dark">${escapeHtml(data.companyContactLine)}</div>
      </div>
      <div class="pl-header-right">
        <div class="pl-doc-title">PACKING LIST</div>
        <div class="pl-doc-meta">
          ${renderMetaRow("Packing List No.", data.packingListNo)}
          ${renderMetaRow("Packing List Date", data.packingListDate)}
          ${renderMetaRow("Ref. Invoice No.", data.refInvoiceNo)}
          ${renderMetaRow("Invoice Date", data.invoiceDate)}
          ${renderMetaRow("Dispatch Date", data.dispatchDate)}
        </div>
      </div>
    </div>

    <div class="pl-header-rule"></div>

    <div class="pl-box">
      <div class="pl-box-title">PARTY DETAILS</div>
      <div class="pl-parties">
        ${renderPartyColumn("Bill To", data.billTo)}
        ${renderPartyColumn("Ship To", data.shipTo)}
      </div>
    </div>

    <div class="pl-box pl-box-products">
      <div class="pl-box-title">PRODUCT DETAILS</div>
      <table class="pl-table">
        <thead>
          <tr>
            <th style="width:5%">SR NO</th>
            <th style="width:11%">PRODUCT CODE</th>
            <th style="width:28%">PRODUCT NAME</th>
            <th style="width:7%">QTY</th>
            <th style="width:8%">UNIT</th>
            <th style="width:10%">PACK SIZE</th>
            <th style="width:15%">NET WT (KG/LTR)</th>
            <th style="width:16%">GROSS WT (KG/LTR)</th>
          </tr>
        </thead>
        <tbody>
          ${renderProductRows(data.products)}
        </tbody>
      </table>
    </div>

    <div class="pl-box pl-box-summary">
      <div class="pl-box-title">PACKING SUMMARY</div>
      <table class="pl-summary">
        ${summaryRow("TOTAL QUANTITY", data.totalQuantityLabel)}
        ${summaryRow("TOTAL UNITS", String(data.totalUnits))}
        ${summaryRow("TOTAL NET WEIGHT", data.totalNetWeightLabel)}
        ${summaryRow("TOTAL GROSS WEIGHT", data.totalGrossWeightLabel, true)}
      </table>
    </div>

    <div class="pl-declaration">
      <strong>Declaration:</strong> ${escapeHtml(
        data.declaration || DEFAULT_PACKING_DECLARATION,
      )}
    </div>

    <div class="pl-sign">
      <div class="pl-sign-company">${escapeHtml(data.signatoryLabel)}</div>
      <div class="pl-sign-gap"></div>
      <div class="pl-sign-line"></div>
      <div class="pl-sign-sub">(Authorized Signatory)</div>
    </div>

    <div class="pl-footer">
      <span>This is a Packing List only and not a Tax Invoice.</span>
      <span>Packing List No: ${escapeHtml(
        asText(data.packingListNo),
      )}&nbsp;&nbsp;|&nbsp;&nbsp;Date: ${escapeHtml(
        asText(data.packingListDate),
      )}</span>
    </div>
  `;

  return buildParamversePdfDocument({
    title: " ",
    bodyHtml,
    extraCss: `
      @page { size: A4 portrait; margin: 10mm; }
      .pv-sheet { color: #0d0d0d; font-size: 8px; }

      .pl-header {
        display: grid;
        grid-template-columns: 1fr 175px;
        gap: 12px;
        align-items: start;
        margin-bottom: 6px;
      }
      .pl-logo { margin-bottom: 4px; }
      .pl-logo img {
        max-height: 42px;
        max-width: 58px;
        object-fit: contain;
        display: block;
      }
      .pl-company-name {
        color: ${ACCENT};
        font-size: 12.5px;
        font-weight: 700;
        text-transform: uppercase;
        margin: 0 0 3px;
        line-height: 1.2;
      }
      .pl-muted {
        color: #444444;
        font-size: 6.2px;
        line-height: 1.45;
        margin: 0 0 1px;
      }
      .pl-meta-dark { color: #222222; }

      .pl-header-right { text-align: right; padding-top: 0; }
      .pl-doc-title {
        color: ${ACCENT};
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.4px;
        margin: 0 0 8px;
        white-space: nowrap;
      }
      .pl-doc-meta { width: 100%; }
      .pl-meta-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: baseline;
        margin-bottom: 3px;
        font-size: 6.8px;
      }
      .pl-meta-lbl { color: #666666; text-align: right; }
      .pl-meta-val { color: #111111; font-weight: 700; text-align: right; white-space: nowrap; }

      .pl-header-rule {
        height: 1.5px;
        background: ${ACCENT};
        margin: 4px 0 10px;
      }

      .pl-box {
        border: 0.75px solid ${BORDER};
        margin: 0 0 10px;
        page-break-inside: avoid;
      }
      .pl-box-title {
        font-size: 7.2px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: #0d0d0d;
        padding: 5px 7px 4px;
        border-bottom: 0.9px solid ${RULE};
      }

      .pl-parties {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .pl-party-col {
        padding: 6px 10px 8px;
      }
      .pl-party-col + .pl-party-col {
        border-left: 0.75px solid ${BORDER};
      }
      .pl-party-heading {
        font-size: 7.5px;
        font-weight: 700;
        color: #0d0d0d;
        padding-bottom: 3px;
        margin-bottom: 6px;
        border-bottom: 0.9px solid ${RULE};
        display: inline-block;
        min-width: 70%;
      }
      .pl-party-fields {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .pl-party-fields td {
        border: none !important;
        padding: 1.5px 0;
        font-size: 6.8px;
        color: #0d0d0d;
        vertical-align: top;
        line-height: 1.35;
      }
      .pl-pf-lbl { width: 78px; white-space: nowrap; font-weight: 700; }
      .pl-pf-sep { width: 10px; text-align: center; }
      .pl-pf-val { word-break: break-word; }

      .pl-box-products { padding-bottom: 0; }
      .pl-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 6.6px;
      }
      .pl-table th {
        background: transparent;
        border: none;
        border-bottom: 0.75px solid ${RULE};
        border-right: 0.6px solid ${BORDER};
        padding: 5px 3px;
        font-size: 6px;
        font-weight: 700;
        text-transform: uppercase;
        text-align: center;
        color: #0d0d0d;
        white-space: nowrap;
      }
      .pl-table th:last-child { border-right: none; }
      .pl-table td {
        border: none;
        border-bottom: 0.6px solid ${BORDER};
        border-right: 0.6px solid ${BORDER};
        padding: 6px 3px;
        vertical-align: middle;
        color: #404040;
      }
      .pl-table td:last-child { border-right: none; }
      .pl-table tbody tr:last-child td { border-bottom: none; }
      .pl-pname { text-align: left; vertical-align: top !important; color: #0d0d0d !important; }
      .pl-pname-main { font-weight: 700; font-size: 6.6px; color: #0d0d0d; margin-bottom: 2px; }
      .pl-pname-sub { font-size: 5.8px; color: ${SUB}; font-weight: 400; line-height: 1.35; }
      .pl-c { text-align: center; }
      .pl-r { text-align: right; }
      .pl-nowrap { white-space: nowrap; }

      .pl-summary {
        width: 100%;
        border-collapse: collapse;
      }
      .pl-summary td {
        border: none;
        border-bottom: 0.75px solid #d9d9d9;
        padding: 6px 8px;
        font-size: 6.8px;
        font-weight: 700;
        color: #0d0d0d;
      }
      .pl-summary tr:last-child td { border-bottom: none; }
      .pl-sum-strong td { color: #595959; }

      .pl-declaration {
        border: 0.75px solid ${BORDER};
        border-left: 2.2px solid #0d0d0d;
        padding: 6px 8px;
        font-size: 6.4px;
        color: #0d0d0d;
        line-height: 1.45;
        margin: 0 0 18px;
      }
      .pl-declaration strong { font-weight: 700; }

      .pl-sign {
        text-align: right;
        page-break-inside: avoid;
        margin: 8px 0 24px;
      }
      .pl-sign-company {
        font-size: 6.8px;
        font-weight: 700;
        text-transform: uppercase;
        color: #0d0d0d;
      }
      .pl-sign-gap { height: 36px; }
      .pl-sign-line {
        display: inline-block;
        width: 140px;
        border-top: 1px solid ${RULE};
        margin-bottom: 3px;
      }
      .pl-sign-sub {
        font-size: 6.4px;
        color: ${SUB};
      }

      .pl-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-top: 0.75px solid #d9d9d9;
        padding-top: 5px;
        font-size: 5.6px;
        color: #666666;
      }
    `,
  });
}

export { formatDate, toNumber, formatNumber } from "@/lib/pdf/paramverse";
