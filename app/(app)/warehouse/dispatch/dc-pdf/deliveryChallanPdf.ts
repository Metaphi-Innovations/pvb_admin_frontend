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
import { allocateDeliveryChallanNumber, getDispatchById } from "../services";

const DEFAULT_DC_DECLARATION =
  "Goods covered under this challan are not sold and are being transported for the purpose mentioned above. This challan is not a tax invoice and no GST liability arises on account of this document.";

export interface DeliveryChallanLineItem {
  sr: number;
  productCode?: string;
  productName: string;
  productSubLines?: string[];
  hsnCode: string;
  qty: number;
  unitsPerCase?: number;
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

function formatMonthYear(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    // Already like "Jun-2025" / "Jun 2025"
    return raw.replace(/\s+/g, "-");
  }
  return parsed
    .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    .replaceAll(" ", "-");
}

function pickFirst(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text !== "-" && text !== "—") return text;
  }
  return "";
}

/** Sample challan sub-lines under product name from batch_snapshot + product. */
function buildChallanProductSubLines(item: any): string[] {
  const product = readRecord(item?.product);
  const productSnapshot = readRecord(item?.product_snapshot);
  const packingProduct = readRecord(item?.packing_done_product);
  const packingListProduct = readRecord(packingProduct.packing_list_product);
  const inventoryBatch = readRecord(item?.inventory_batch);
  const batchSnap = readRecord(
    item?.batch_snapshot ??
      packingProduct.batch_snapshot ??
      packingListProduct.batch_snapshot,
  );

  const batchNo = pickFirst(
    batchSnap.batch_code,
    batchSnap.batch_no,
    batchSnap.batch_number,
    batchSnap.batchNumber,
    item?.batch_code,
    item?.batch_no,
    packingProduct.batch_code,
    packingProduct.batch_no,
    inventoryBatch.batch_no,
  );

  const mfg = formatMonthYear(
    pickFirst(
      batchSnap.mfg_date,
      batchSnap.manufacture_date,
      batchSnap.manufacturing_date,
      batchSnap.mfgDate,
      batchSnap.manufactureDate,
      batchSnap.manufacturingDate,
      item?.manufacture_date,
      item?.manufacturingDate,
      inventoryBatch.manufacture_date,
      inventoryBatch.manufacturingDate,
    ),
  );

  const exp = formatMonthYear(
    pickFirst(
      batchSnap.expiry_date,
      batchSnap.expiryDate,
      batchSnap.exp_date,
      batchSnap.expDate,
      batchSnap.expiry,
      batchSnap.batchExpiryDate,
      inventoryBatch.expiry_date,
      item?.expiry_date,
    ),
  );

  const packSizeRaw = pickFirst(
    batchSnap.sku_size,
    batchSnap.skuSize,
    batchSnap.pack_size_label,
    productSnapshot.sku_size,
    product.sku_size,
    product.pack_size,
    productSnapshot.pack_size,
    packingProduct.pack_size,
  );
  const packingUnit = pickFirst(
    product.packing_unit,
    productSnapshot.packing_unit,
    product.unit,
    productSnapshot.unit,
    batchSnap.packing_unit,
  );
  let skuSize = "";
  if (packSizeRaw) {
    // If snapshot already has a full label like "500 mL", keep it.
    if (/[a-zA-Z]/.test(packSizeRaw) && /\d/.test(packSizeRaw)) {
      skuSize = packSizeRaw;
    } else {
      const n = Number(packSizeRaw);
      skuSize = Number.isFinite(n)
        ? `${n}${packingUnit ? ` ${packingUnit}` : ""}`.trim()
        : `${packSizeRaw}${packingUnit ? ` ${packingUnit}` : ""}`.trim();
    }
  }

  const lines: string[] = [];
  if (batchNo) lines.push(`Batch No.: ${batchNo}`);
  if (mfg || exp) {
    const parts = [
      mfg ? `Mfg. Date: ${mfg}` : "",
      exp ? `Expiry Date: ${exp}` : "",
    ].filter(Boolean);
    lines.push(parts.join(" | "));
  }
  if (skuSize) lines.push(`SKU Size: ${skuSize}`);
  return lines;
}

export function mapDispatchToDeliveryChallan(
  dispatch: any,
  challanNumber?: string | null,
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
    const packingProduct = readRecord(item.packing_done_product);
    const hsnObj = readRecord(product.hsn ?? productSnapshot.hsn);
    const qty = Number(item.dispatched_base_qty ?? item.dispatchQty ?? 0);
    const rate = Number(
      item.unit_price ?? item.unit_rate ?? product.unit_price ?? 0,
    );
    const amount = Number(item.item_total ?? qty * rate);
    const unitsPerCase = Number(
      product.unit_per_packing ||
        productSnapshot.unit_per_packing ||
        packingProduct.units_per_case ||
        packingProduct.unit_per_packing ||
        0,
    );
    return {
      sr: index + 1,
      productCode: asText(
        product.product_code || productSnapshot.product_code,
        "",
      ),
      productName: asText(
        product.product_name ||
          productSnapshot.product_name ||
          item.product_name ||
          item.product,
      ),
      productSubLines: buildChallanProductSubLines(item),
      hsnCode: asText(
        hsnObj.hsnCode ||
          productSnapshot.hsn_code ||
          productSnapshot.hsnCode ||
          "",
        "",
      ),
      qty,
      unitsPerCase: unitsPerCase > 0 ? unitsPerCase : undefined,
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
      challanNumber || dispatch?.challan_number || dispatch?.challanNumber,
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

export type DeliveryChallanPdfOptions = {
  /** Default true — WITH GOODS VALUE. Pass false for WITHOUT GOODS VALUE. */
  withGoodsValue?: boolean;
};

function lineQtyCase(line: DeliveryChallanLineItem): number {
  const unitsPerCase = Number(line.unitsPerCase || 0);
  const totalUnits = Number(line.qty || 0);
  if (unitsPerCase > 1) {
    return Math.floor(totalUnits / unitsPerCase) || totalUnits;
  }
  return totalUnits;
}

function buildDcColumns(withGoodsValue: boolean): PdfTableColumn[] {
  const base: PdfTableColumn[] = [
    { key: "sr", header: "Sr", width: "4%", align: "center" },
    { key: "productCode", header: "Product Code", width: "10%", align: "center", nowrap: true },
    { key: "productName", header: "Product Name", width: withGoodsValue ? "26%" : "34%" },
    { key: "hsn", header: "HSN", width: "8%", align: "center", nowrap: true },
    { key: "qtyCase", header: "Qty (Case)", width: "9%", numeric: true },
    { key: "unitsPerCase", header: "Units/Case", width: "10%", align: "center" },
    { key: "totalUnits", header: "Total Units", width: "10%", numeric: true },
  ];
  if (!withGoodsValue) return base;
  return [
    ...base,
    { key: "rate", header: "Rate/Unit (₹)", width: "12%", numeric: true },
    { key: "amount", header: "Value (₹)", width: "14%", numeric: true },
  ];
}

export function buildDeliveryChallanHtml(
  data: DeliveryChallanViewModel,
  options: DeliveryChallanPdfOptions = {},
): string {
  const withGoodsValue = options.withGoodsValue !== false;
  const totalUnits = data.lines.reduce(
    (s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0),
    0,
  );
  const totalCases = data.lines.reduce((s, l) => s + lineQtyCase(l), 0);
  const totalAmount = data.lines.reduce(
    (s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0),
    0,
  );

  const rows: PdfTableRow[] = data.lines.map((line) => {
    const unitsPerCase = Number(line.unitsPerCase || 0);
    const cells: Record<string, string> = {
      sr: String(line.sr),
      productCode: asText(line.productCode, ""),
      productName: line.productName,
      hsn: line.hsnCode,
      qtyCase: formatQty(lineQtyCase(line)),
      unitsPerCase:
        unitsPerCase > 0 ? formatQty(unitsPerCase) : asText(line.uom, ""),
      totalUnits: formatQty(line.qty),
    };
    if (withGoodsValue) {
      cells.rate = formatNumber(line.rate);
      cells.amount = formatNumber(line.amount);
    }
    const sub = (line.productSubLines || [])
      .filter((s) => String(s ?? "").trim())
      .map((s) => `<span class="sub">${escapeHtml(s)}</span>`)
      .join("");
    return {
      cells,
      htmlCells: sub
        ? { productName: `${escapeHtml(line.productName)}${sub}` }
        : undefined,
    };
  });

  const footerCells: Record<string, string> = {
    sr: "",
    productCode: "",
    productName: "",
    hsn: "",
    qtyCase: formatQty(totalCases),
    unitsPerCase: "",
    totalUnits: formatQty(totalUnits),
  };
  if (withGoodsValue) {
    footerCells.rate = "";
    footerCells.amount = formatNumber(totalAmount);
  }
  const footerRow: PdfTableRow = { cells: footerCells };

  const summaryBlock = withGoodsValue
    ? `<div class="dc-summary">
        ${renderParamverseSectionTitle("Summary")}
        ${renderSummaryRows([
          { label: "Total Items", value: String(data.lines.length) },
          { label: "Total Quantity", value: formatQty(totalUnits) },
          {
            label: "Total Amount",
            value: formatCurrency(totalAmount),
            strong: true,
          },
        ])}
      </div>`
    : "";

  const bodyHtml = `
    ${renderParamverseHeader({
      logoSrc: data.logoSrc,
      docTitle: "DELIVERY CHALLAN",
      docSubtitle: withGoodsValue
        ? "WITH GOODS VALUE"
        : "WITHOUT GOODS VALUE",
      company: data,
    })}

    ${renderMetaGrid(
      [
        [
          meta("Challan No.", data.challanNo),
          meta("Challan Date", data.date),
          meta("Reference No.", data.referenceNo || data.sourceDocument),
          meta("Vehicle No.", data.vehicleNo),
          meta("Transporter", data.transporter),
        ],
        [
          meta("Place of Supply", data.placeOfSupply),
          meta("Driver Name", data.driverName),
          meta("Driver Mobile", data.driverMobile),
          { label: " ", value: " ", colSpan: 2 },
        ],
      ],
      { withDivider: true },
    )}

    ${renderParamverseSectionTitle("Dispatch, Billing & Shipping Details")}
    ${renderPartyColumns(
      [
        { ...data.dispatchFrom, title: "Bill From" },
        { ...data.billing, title: "Bill To" },
        { ...data.shipping, title: "Ship To" },
      ],
      3,
    )}

    ${renderParamverseSectionTitle("Item Details")}
    ${renderPdfTable({
      columns: buildDcColumns(withGoodsValue),
      rows,
      footerRow,
    })}

    <div class="dc-bottom${withGoodsValue ? "" : " dc-bottom-no-value"}">
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
      ${summaryBlock}
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
      .dc-bottom-no-value {
        grid-template-columns: 1fr 1fr;
        grid-template-areas:
          "declaration remarks";
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
  options: DeliveryChallanPdfOptions = {},
): void {
  const withGoodsValue = options.withGoodsValue !== false;
  void writeHtmlAndPrint(
    buildDeliveryChallanHtml(data, options),
    undefined,
    `${sanitizePdfFileName(
      data.challanNo || data.dispatchNo,
      withGoodsValue ? "DELIVERY_CHALLAN" : "DELIVERY_CHALLAN_WO_VALUE",
    )}.pdf`,
  );
}

export async function openEditableDeliveryChallanPreview(
  data: DeliveryChallanViewModel,
  options: DeliveryChallanPdfOptions = {},
): Promise<void> {
  const withGoodsValue = options.withGoodsValue !== false;
  const logoSrc = data.logoSrc || (await loadNavbarLogoDataUrl());
  await openEditablePdfPreview({
    title: withGoodsValue
      ? "Delivery Challan PDF Preview (With Goods Value)"
      : "Delivery Challan PDF Preview (Without Goods Value)",
    initialData: { ...data, logoSrc } as unknown as Record<string, unknown>,
    renderHtml: (edited) =>
      buildDeliveryChallanHtml(
        edited as unknown as DeliveryChallanViewModel,
        options,
      ),
    printButtonLabel: withGoodsValue
      ? "Download Delivery Challan PDF"
      : "Download Challan Without Goods Value",
    outputFileName: `${sanitizePdfFileName(
      data.challanNo || data.dispatchNo,
      withGoodsValue ? "DELIVERY_CHALLAN" : "DELIVERY_CHALLAN_WO_VALUE",
    )}.pdf`,
  });
}

/** Allocate DC number, load dispatch detail, and open editable preview. */
export async function openDeliveryChallanPreviewForDispatch(
  dispatchId: string,
  options: DeliveryChallanPdfOptions = {},
): Promise<void> {
  const challanNumber = await allocateDeliveryChallanNumber(dispatchId);
  const detail = await getDispatchById(dispatchId);
  await openEditableDeliveryChallanPreview(
    mapDispatchToDeliveryChallan(detail, challanNumber),
    options,
  );
}
