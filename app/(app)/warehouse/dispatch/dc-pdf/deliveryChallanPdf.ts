"use client";

import {
  PARAMVERSE_COMPANY,
  asText,
  buildParamversePdfDocument,
  escapeHtml,
  formatCurrency,
  formatNumber,
  formatQty,
  loadNavbarLogoDataUrl,
  openEditablePdfPreview,
  renderMetaGrid,
  renderParamverseFooter,
  renderParamverseHeader,
  renderParamverseSectionTitle,
  renderParamverseSignatory,
  renderPartyColumns,
  renderPdfTable,
  renderSummaryRows,
  sanitizePdfFileName,
  writeHtmlAndPrint,
  type PdfMetaField,
  type PdfTableColumn,
  type PdfTableRow,
} from "@/lib/pdf/paramverse";

const DEFAULT_DC_DECLARATION =
  "Goods covered under this challan are not sold and are being transported for the purpose mentioned above. This challan is not a tax invoice and no GST liability arises on account of this document.";

export interface DeliveryChallanLineItem {
  sr: number;
  productName: string;
  hsnCode: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
}

export interface DeliveryChallanParty {
  name: string;
  lines: string[];
}

/** Full Paramverse Delivery Challan view model (matches sample PDF). */
export interface DeliveryChallanViewModel {
  logoSrc?: string;
  companyName: string;
  companyAddress: string;
  companyMetaLine: string;
  companyContactLine: string;
  companyGstin: string;
  signatoryCompany: string;
  challanNo: string;
  dispatchNo: string;
  date: string;
  referenceNo: string;
  vehicleNo: string;
  transporter: string;
  placeOfSupply: string;
  driverName: string;
  driverMobile: string;
  ewayBillNo: string;
  ewayBillDate: string;
  deliverTo: string;
  sourceDocument: string;
  warehouse: string;
  lrNo: string;
  dispatchFrom: DeliveryChallanParty;
  billing: DeliveryChallanParty;
  shipping: DeliveryChallanParty;
  lines: DeliveryChallanLineItem[];
  remarks: string;
  declaration?: string;
  generatedOn: string;
}

export const DELIVERY_CHALLAN_COMPANY = {
  ...PARAMVERSE_COMPANY,
  companyGstin: "27AAQCP4960M1ZL",
} as const;

function formatIsoDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replaceAll(" ", "-");
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function partyFromRaw(
  name: string,
  raw: Record<string, unknown>,
  fallbacks: Record<string, unknown> = {},
): DeliveryChallanParty {
  const address =
    asText(raw.address ?? raw.address_line ?? fallbacks.address, "") ||
    [
      asText(raw.address_line_1, ""),
      asText(raw.address_line_2, ""),
    ]
      .filter(Boolean)
      .join(", ");
  const cityStatePin = [
    asText(raw.city ?? fallbacks.city, ""),
    asText(raw.state ?? fallbacks.state, ""),
    asText(raw.pincode ?? fallbacks.pincode, "")
      ? `– ${asText(raw.pincode ?? fallbacks.pincode, "")}`
      : "",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(", –", " –");
  const gstin = asText(raw.gstin ?? raw.gstin_no ?? fallbacks.gstin, "");
  const contact = asText(
    raw.contact_person ?? raw.contact_name ?? fallbacks.contact_person,
    "",
  );
  const mobile = asText(raw.mobile ?? raw.mobile_no ?? fallbacks.mobile, "");

  const lines: string[] = [];
  if (address) lines.push(address);
  if (cityStatePin) lines.push(cityStatePin);
  if (gstin) lines.push(`GSTIN  ${gstin}`);
  if (contact) lines.push(`Contact  ${contact}`);
  if (mobile) lines.push(`Mobile  ${mobile}`);

  return { name: asText(name, "—"), lines };
}

export function formatDispatchQtyLabel(
  baseQtyRaw: unknown,
  packSizeRaw: unknown,
): string {
  const baseQty = Number(baseQtyRaw || 0);
  const packSize = Number(packSizeRaw || 1);
  const cases =
    packSize > 1 && Number.isFinite(packSize)
      ? Math.floor(baseQty / packSize)
      : 0;
  if (cases > 0 && packSize > 1) {
    return `${cases} Cases (${baseQty} Units)`;
  }
  return `${baseQty} Units`;
}

export function mapDispatchToDeliveryChallan(
  dispatch: any,
): DeliveryChallanViewModel {
  const warehouse = readRecord(dispatch?.warehouse);
  const customer = readRecord(dispatch?.customer);
  const snapshot = readRecord(dispatch?.customer_snapshot);
  const billTo = readRecord(dispatch?.bill_to);
  const shipTo = readRecord(dispatch?.ship_to);
  const packingDone = readRecord(dispatch?.packing_done);

  const customerName = asText(
    customer.customer_name ??
      dispatch?.customer_name ??
      snapshot.customer_name,
    "—",
  );

  const items = (dispatch?.items || dispatch?.products || []) as any[];
  const lines: DeliveryChallanLineItem[] = items.map((item, index) => {
    const product = readRecord(item.product);
    const productSnapshot = readRecord(item.product_snapshot);
    const hsnObj = readRecord(product.hsn ?? productSnapshot.hsn);
    const qty = Number(item.dispatched_base_qty ?? item.dispatchQty ?? 0);
    const rate = Number(
      item.unit_price ?? item.unit_rate ?? product.unit_price ?? 0,
    );
    const amount = Number(item.item_total ?? qty * rate);
    return {
      sr: index + 1,
      productName: asText(
        product.product_name ||
          productSnapshot.product_name ||
          item.product_name ||
          item.product,
      ),
      hsnCode: asText(
        hsnObj.hsnCode ||
          productSnapshot.hsn_code ||
          productSnapshot.hsnCode ||
          "",
        "",
      ),
      qty,
      uom: asText(
        product.unit ||
          product.mou ||
          productSnapshot.unit ||
          productSnapshot.mou ||
          item.quantity_type ||
          "",
        "",
      ),
      rate,
      amount,
    };
  });

  const warehouseName = asText(warehouse.warehouse_name, "Paramverse Bio Pvt. Ltd.");
  const dispatchFrom = partyFromRaw(warehouseName, warehouse, {
    address: [
      asText(warehouse.address, ""),
      asText(warehouse.address_1, ""),
    ]
      .filter(Boolean)
      .join(", "),
    city: warehouse.city,
    state: warehouse.state,
    pincode: warehouse.pincode,
    gstin: "27AAQCP4960M1ZL",
    contact_person: warehouse.contact_person,
    mobile: warehouse.mobile || warehouse.phone,
  });

  const billing = partyFromRaw(customerName, billTo, {
    ...snapshot,
    ...customer,
    gstin: billTo.gstin || customer.gstin_no || snapshot.gstin_no,
  });
  const shipping = partyFromRaw(customerName, shipTo, {
    ...snapshot,
    ...customer,
    gstin: shipTo.gstin || customer.gstin_no || snapshot.gstin_no,
  });

  const placeOfSupply = [
    asText(shipTo.city || snapshot.city || customer.city, ""),
    asText(shipTo.state || snapshot.state || customer.state, ""),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ...DELIVERY_CHALLAN_COMPANY,
    challanNo: asText(
      dispatch?.challan_number || dispatch?.challanNumber,
      "Assigned on download",
    ),
    dispatchNo: asText(
      dispatch?.dispatch_number ||
        dispatch?.dispatch_no ||
        dispatch?.dispatchNumber,
    ),
    date: formatDisplayDate(
      dispatch?.dispatch_date || dispatch?.created_at || dispatch?.createdAt,
    ),
    referenceNo: asText(
      dispatch?.source_document_no ||
        packingDone.packing_done_no ||
        dispatch?.salesOrderNumber,
    ),
    vehicleNo: asText(dispatch?.vehicle_number || dispatch?.vehicleNumber),
    transporter: asText(dispatch?.transporter),
    placeOfSupply: placeOfSupply || "—",
    driverName: asText(dispatch?.driver_name),
    driverMobile: asText(dispatch?.driver_mobile),
    ewayBillNo: asText(dispatch?.eway_bill_number),
    ewayBillDate: asText(dispatch?.eway_bill_date),
    deliverTo: customerName,
    sourceDocument: asText(
      dispatch?.source_document_no || packingDone.packing_done_no,
    ),
    warehouse: warehouseName,
    lrNo: asText(dispatch?.lr_number || dispatch?.lrNumber),
    dispatchFrom,
    billing,
    shipping,
    lines,
    remarks: asText(dispatch?.remarks, "—"),
    declaration: DEFAULT_DC_DECLARATION,
    generatedOn: formatIsoDate(new Date()),
  };
}

function meta(label: string, value: string, dottedWhenEmpty = false): PdfMetaField {
  return { label, value: asText(value, "—"), dottedWhenEmpty };
}

const DC_COLUMNS: PdfTableColumn[] = [
  { key: "sr", header: "Sr", width: "5%", align: "center" },
  { key: "productName", header: "Product Name", width: "34%" },
  { key: "hsn", header: "HSN Code", width: "11%", align: "center", nowrap: true },
  { key: "qty", header: "Qty", width: "10%", numeric: true },
  { key: "uom", header: "UOM", width: "8%", align: "center" },
  { key: "rate", header: "Rate (₹)", width: "14%", numeric: true },
  { key: "amount", header: "Amount (₹)", width: "18%", numeric: true },
];

export function buildDeliveryChallanHtml(data: DeliveryChallanViewModel): string {
  const totalQty = data.lines.reduce(
    (s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0),
    0,
  );
  const totalAmount = data.lines.reduce(
    (s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0),
    0,
  );

  const rows: PdfTableRow[] = data.lines.map((line) => ({
    cells: {
      sr: String(line.sr),
      productName: line.productName,
      hsn: line.hsnCode,
      qty: formatQty(line.qty),
      uom: line.uom,
      rate: formatNumber(line.rate),
      amount: formatNumber(line.amount),
    },
  }));

  const footerRow: PdfTableRow = {
    cells: {
      sr: "",
      productName: "",
      hsn: "",
      qty: formatQty(totalQty),
      uom: "",
      rate: "",
      amount: formatCurrency(totalAmount),
    },
  };

  const bodyHtml = `
    ${renderParamverseHeader({
      logoSrc: data.logoSrc,
      docTitle: "DELIVERY CHALLAN",
      company: data,
    })}

    ${renderMetaGrid([
      [
        meta("Challan No.", data.challanNo),
        meta("Challan Date", data.date),
        meta("Reference No.", data.referenceNo || data.sourceDocument),
        meta("Vehicle No.", data.vehicleNo),
      ],
      [
        meta("Transporter", data.transporter),
        meta("Place of Supply", data.placeOfSupply),
        meta("Driver Name", data.driverName),
        meta("Driver Mobile", data.driverMobile),
      ],
      [
        meta("E-Way Bill No.", data.ewayBillNo, true),
        meta("E-Way Bill Date", data.ewayBillDate, true),
        { label: " ", value: " ", colSpan: 2 },
      ],
    ])}

    <div class="dc-party-box">
      ${renderParamverseSectionTitle("Dispatch, Billing & Shipping Details")}
      ${renderPartyColumns([data.dispatchFrom, data.billing, data.shipping], 3)}
    </div>

    ${renderParamverseSectionTitle("Item Details")}
    ${renderPdfTable({ columns: DC_COLUMNS, rows, footerRow })}

    <div class="dc-bottom">
      <div class="dc-declaration">
        ${renderParamverseSectionTitle("Declaration")}
        <div class="body">${escapeHtml(
          data.declaration || DEFAULT_DC_DECLARATION,
        )}</div>
      </div>
      <div class="dc-remarks">
        ${renderParamverseSectionTitle("Remarks")}
        <div class="body">${escapeHtml(asText(data.remarks, "—"))}</div>
      </div>
      <div class="dc-summary">
        ${renderParamverseSectionTitle("Summary")}
        ${renderSummaryRows([
          { label: "Total Items", value: String(data.lines.length) },
          { label: "Total Quantity", value: formatQty(totalQty) },
          {
            label: "Total Amount",
            value: formatCurrency(totalAmount),
            strong: true,
          },
        ])}
      </div>
    </div>
    <div class="dc-sign">
      ${renderParamverseSignatory(
        data.signatoryCompany || PARAMVERSE_COMPANY.signatoryCompany,
      )}
    </div>

    ${renderParamverseFooter({
      left:
        "This is a computer-generated Delivery Challan – Not a Tax Invoice.",
      center: `${asText(data.challanNo)}  ·  ${asText(data.date)}`,
      right: `${asText(
        data.signatoryCompany || PARAMVERSE_COMPANY.signatoryCompany,
      )}  |  Page 1 of 1`,
    })}
  `;

  return buildParamversePdfDocument({
    title: " ",
    bodyHtml,
    extraCss: `
      .dc-bottom {
        margin-top: 8px;
        display: grid;
        grid-template-columns: 1fr 1fr 200px;
        grid-template-areas:
          ". . summary"
          "declaration remarks .";
        gap: 10px;
        align-items: start;
      }
      .dc-party-box {
        border: 1px solid #e5e7eb;
        margin-top: 8px;
      }
      .dc-party-box .pv-section-title {
        margin: 0;
        padding: 4px 7px 3px;
      }
      .dc-party-box .pv-parties {
        border: none;
        margin-bottom: 0;
      }
      .dc-summary { grid-area: summary; }
      .dc-declaration { grid-area: declaration; }
      .dc-remarks { grid-area: remarks; }
      .dc-declaration .body, .dc-remarks .body {
        padding-top: 4px;
        line-height: 1.4;
        color: #262626;
        font-weight: 400;
      }
      .dc-sign .pv-sign { margin-top: 14px; }
      .dc-summary .pv-summary {
        border: none;
      }
      .dc-summary .pv-summary td {
        border-bottom: 1px solid #eceff1;
        padding: 4px 2px;
      }
      .dc-summary .pv-summary tr:last-child td {
        border-bottom: none;
        background: transparent;
        padding: 6px 2px 2px;
      }
    `,
  });
}

export function openDeliveryChallanPrintWindow(
  data: DeliveryChallanViewModel,
): void {
  void writeHtmlAndPrint(
    buildDeliveryChallanHtml(data),
    undefined,
    `${sanitizePdfFileName(data.challanNo || data.dispatchNo, "DELIVERY_CHALLAN")}.pdf`,
  );
}

export async function openEditableDeliveryChallanPreview(
  data: DeliveryChallanViewModel,
): Promise<void> {
  const logoSrc = data.logoSrc || (await loadNavbarLogoDataUrl());
  await openEditablePdfPreview({
    title: "Delivery Challan PDF Preview",
    initialData: { ...data, logoSrc } as unknown as Record<string, unknown>,
    renderHtml: (edited) =>
      buildDeliveryChallanHtml(edited as unknown as DeliveryChallanViewModel),
    printButtonLabel: "Download Delivery Challan PDF",
    outputFileName: `${sanitizePdfFileName(
      data.challanNo || data.dispatchNo,
      "DELIVERY_CHALLAN",
    )}.pdf`,
  });
}
