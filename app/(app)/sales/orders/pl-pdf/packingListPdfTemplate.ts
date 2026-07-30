"use client";

import {
  asText,
  buildParamversePdfDocument,
  escapeHtml,
  formatNumber,
  renderMetaGrid,
  renderParamverseFooter,
  renderParamverseHeader,
  renderParamverseSectionTitle,
  renderPdfTable,
  renderSummaryRows,
  type PdfMetaField,
  type PdfTableColumn,
  type PdfTableRow,
} from "@/lib/pdf/paramverse";

export interface PackingListPartyBlock {
  name: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  contact?: string;
  mobile?: string;
}

export interface PackingListProductRow {
  sr: number;
  productName: string;
  hsnCode: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  unit: string;
  packSize: string;
  netWtKg: number;
  grossWtKg: number;
}

export interface PackingListCartonRow {
  batchNo: string;
  unitsPacked: number;
  weightLabel: string;
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
  dispatchDate: string;
  billTo: PackingListPartyBlock;
  shipTo: PackingListPartyBlock;
  transporterName: string;
  vehicleNumber: string;
  lrNumber: string;
  dispatchMode: string;
  placeOfSupply: string;
  totalPackages: number;
  totalCartons: number;
  products: PackingListProductRow[];
  cartons: PackingListCartonRow[];
  totalQuantityLabel: string;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  declaration?: string;
  signatoryLabel: string;
}

/** Packing list sample uses a Powai address variant + Dharitri signatory. */
export const PACKING_LIST_COMPANY = {
  companyName: "PARAMVERSE BIO PRIVATE LIMITED",
  companyAddress:
    "Unit No. 402, Omega Building, Near Hiranandani Garden, Opp. Colgate Palmolive, Powai, Mumbai, Maharashtra, India - 400076",
  companyMetaLine:
    "GSTIN: 27AAPCP1234F1Z8   PAN: AAPCP1234F   CIN: U46201MH2025PTC463792",
  companyContactLine:
    "Ph: 022-41276000/01/02/03   Email: info@paramverse.com",
  signatoryLabel: "FOR DHARITRI SUTRA",
} as const;

export const DEFAULT_PACKING_DECLARATION =
  "We hereby certify that the above-mentioned agricultural products have been packed in good condition and belong to the batches mentioned above. All batch, manufacturing, and expiry details are true and correct as per company records.";

function partyLines(party: PackingListPartyBlock): string[] {
  const lines: string[] = [];
  if (party.addressLine) lines.push(party.addressLine);
  const cityStatePin = [
    party.city ? `City: ${party.city}` : "",
    party.state ? `State: ${party.state}` : "",
    party.pincode ? `PIN: ${party.pincode}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  if (cityStatePin) lines.push(cityStatePin);
  if (party.gstin) lines.push(`GSTIN: ${party.gstin}`);
  const contact = [
    party.contact ? `Contact: ${party.contact}` : "",
    party.mobile ? `Mobile: ${party.mobile}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  if (contact) lines.push(contact);
  return lines;
}

function meta(label: string, value: string): PdfMetaField {
  return { label, value: asText(value, "—") };
}

const PRODUCT_COLUMNS: PdfTableColumn[] = [
  { key: "sr", header: "Sr No", width: "4%", align: "center" },
  { key: "productName", header: "Product Name", width: "18%" },
  { key: "hsn", header: "HSN Code", width: "8%", align: "center", nowrap: true },
  { key: "batch", header: "Batch No", width: "9%", align: "center", nowrap: true },
  { key: "mfg", header: "Mfg Date", width: "8%", align: "center", nowrap: true },
  { key: "exp", header: "Expiry Date", width: "9%", align: "center", nowrap: true },
  { key: "qty", header: "Qty", width: "6%", numeric: true },
  { key: "unit", header: "Unit", width: "7%", align: "center" },
  { key: "pack", header: "Pack Size", width: "8%", align: "center", nowrap: true },
  { key: "net", header: "Net Wt (Kg)", width: "11%", numeric: true },
  { key: "gross", header: "Gross Wt (Kg)", width: "12%", numeric: true },
];

const CARTON_COLUMNS: PdfTableColumn[] = [
  { key: "batch", header: "Batch No" },
  { key: "units", header: "Units Packed", align: "center" },
  { key: "weight", header: "Weight", align: "right" },
];

export function buildPackingListPdfHtml(data: PackingListPdfData): string {
  const productRows: PdfTableRow[] = data.products.map((row) => ({
    cells: {
      sr: String(row.sr),
      productName: row.productName,
      hsn: row.hsnCode,
      batch: row.batchNo,
      mfg: row.mfgDate,
      exp: row.expiryDate,
      qty: String(row.qty),
      unit: row.unit,
      pack: row.packSize,
      net: formatNumber(row.netWtKg),
      gross: formatNumber(row.grossWtKg),
    },
  }));

  const cartonRows: PdfTableRow[] = data.cartons.map((row) => ({
    cells: {
      batch: row.batchNo,
      units: String(row.unitsPacked),
      weight: row.weightLabel,
    },
  }));

  const bodyHtml = `
    <div class="pl-header">
      <div class="pl-logo">${data.logoSrc ? `<img src="${escapeHtml(data.logoSrc)}" alt="Logo" />` : ""}</div>
      <div class="pl-company">
        <div class="pl-company-name">${escapeHtml(data.companyName)}</div>
        <div class="pl-muted">${escapeHtml(data.companyAddress)}</div>
        <div class="pl-muted">${escapeHtml(data.companyMetaLine)}</div>
        <div class="pl-muted">${escapeHtml(data.companyContactLine)}</div>
      </div>
      <div class="pl-right">
        <div class="pl-title">PACKING LIST</div>
        <div class="pl-doc-meta">
          <div><span class="lbl">Packing List No.</span> ${escapeHtml(data.packingListNo)}</div>
          <div><span class="lbl">Packing List Date</span> ${escapeHtml(data.packingListDate)}</div>
          <div><span class="lbl">Ref. Invoice No.</span> ${escapeHtml(asText(data.refInvoiceNo, "—"))}</div>
          <div><span class="lbl">Dispatch Date</span> ${escapeHtml(asText(data.dispatchDate, "—"))}</div>
        </div>
      </div>
    </div>

    ${renderParamverseSectionTitle("Party Details")}
    <div class="pl-parties">
      <div class="pl-party">
        <div class="pl-party-title">BILL TO</div>
        <p class="name">${escapeHtml(asText(data.billTo.name))}</p>
        ${partyLines(data.billTo)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join("")}
      </div>
      <div class="pl-party">
        <div class="pl-party-title">SHIP TO</div>
        <p class="name">${escapeHtml(asText(data.shipTo.name))}</p>
        ${partyLines(data.shipTo)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join("")}
      </div>
    </div>

    ${renderParamverseSectionTitle("Shipment Details")}
    ${renderMetaGrid([
      [
        meta("Transporter Name", data.transporterName),
        meta("Vehicle Number", data.vehicleNumber),
        meta("LR Number", data.lrNumber),
        meta("Dispatch Mode", data.dispatchMode),
      ],
      [
        meta("Place of Supply", data.placeOfSupply),
        meta("Total Packages", String(data.totalPackages || "—")),
        meta("Total Cartons", String(data.totalCartons || "—")),
        { label: " ", value: " " },
      ],
    ])}

    ${renderParamverseSectionTitle("Product Details")}
    ${renderPdfTable({ columns: PRODUCT_COLUMNS, rows: productRows, emptyText: "No products" })}

    <div class="pl-bottom">
      <div>
        ${renderParamverseSectionTitle("Carton / Package Breakup")}
        ${renderPdfTable({
          columns: CARTON_COLUMNS,
          rows: cartonRows,
          emptyText: "—",
        })}
      </div>
      <div>
        ${renderParamverseSectionTitle("Packing Summary")}
        ${renderSummaryRows([
          { label: "Total Quantity", value: data.totalQuantityLabel },
          { label: "Total Packages", value: String(data.totalPackages) },
          {
            label: "Total Net Weight",
            value: `${formatNumber(data.totalNetWeightKg)} Kg`,
          },
          {
            label: "Total Gross Weight",
            value: `${formatNumber(data.totalGrossWeightKg)} Kg`,
            strong: true,
          },
        ])}
      </div>
    </div>

    <div class="pl-declaration">
      <strong>Declaration:</strong> ${escapeHtml(
        data.declaration || DEFAULT_PACKING_DECLARATION,
      )}
    </div>

    <div class="pl-sign">
      <div class="pl-sign-label">${escapeHtml(data.signatoryLabel)}</div>
      <div class="pl-sign-gap"></div>
      <div class="pl-sign-sub">(Authorized Signatory)</div>
    </div>

    ${renderParamverseFooter({
      left: "This is a Packing List only and not a Tax Invoice.",
      center: `Packing List No: ${asText(data.packingListNo)}  |  Date: ${asText(
        data.packingListDate,
      )}`,
      right: " ",
    })}
  `;

  return buildParamversePdfDocument({
    title: " ",
    bodyHtml,
    extraCss: `
      .pl-header {
        display: grid;
        grid-template-columns: 72px 1fr 185px;
        gap: 10px;
        align-items: start;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      .pl-logo img { max-height: 54px; max-width: 70px; object-fit: contain; display: block; }
      .pl-company-name {
        color: #1a5276;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .pl-muted { color: #444; font-size: 6.5px; line-height: 1.4; }
      .pl-right { text-align: right; }
      .pl-title {
        color: #1a5276;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .pl-doc-meta {
        font-size: 7px;
        color: #111;
      }
      .pl-doc-meta .lbl { color: #666; margin-right: 6px; }
      .pl-doc-meta div { margin-bottom: 2px; }
      .pv-section-title { color: #ababab; }
      .pl-parties {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 4px;
      }
      .pl-party-title {
        color: #1a5276;
        font-weight: 700;
        font-size: 7px;
        margin-bottom: 4px;
      }
      .pl-party .name { font-weight: 700; font-size: 8.5px; margin: 0 0 2px; }
      .pl-party p { margin: 0 0 1px; color: #333; font-size: 7.5px; }
      .pl-bottom {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 8px;
      }
      .pl-declaration {
        margin-top: 12px;
        border: 1px solid #bcd4e6;
        background: #f7fbfe;
        padding: 6px 8px;
        font-size: 7px;
        color: #1a5276;
        line-height: 1.4;
      }
      .pl-sign {
        margin-top: 18px;
        text-align: right;
        page-break-inside: avoid;
      }
      .pl-sign-label { color: #1a5276; font-weight: 700; font-size: 8px; }
      .pl-sign-gap { height: 28px; }
      .pl-sign-sub { color: #555; font-size: 7px; }
    `,
  });
}

export { formatDate, toNumber } from "@/lib/pdf/paramverse";
