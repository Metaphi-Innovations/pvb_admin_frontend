"use client";

import {
  buildTaxInvoiceHtml,
  type TaxInvoiceHsnSummaryRow,
  type TaxInvoiceLineItem,
  type TaxInvoiceViewModel,
} from "@/app/(app)/warehouse/dispatch/tax-invoice-pdf/taxInvoicePdf";
import {
  PARAMVERSE_COMPANY,
  asText,
  formatAmountInWords,
  formatDate,
  loadNavbarLogoDataUrl,
  openEditablePdfPreview,
  sanitizePdfFileName,
  toNumber,
} from "@/lib/pdf/paramverse";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

const DEFAULT_BANK = {
  accountName: "ParamVerse Bio Pvt. Ltd.",
  bankName: "HDFC Bank Ltd.",
  accountNo: "50200098765432",
  ifsc: "HDFC0002874",
  branch: "Aurangabad - MIDC Branch",
} as const;

const PROFORMA_TERMS =
  "This is a Proforma Invoice issued for a sample order and is for quotation / internal approval purposes only. It is not a tax invoice and does not constitute a demand for payment. GST shown is indicative and will be charged as applicable on the date of actual supply. Goods will be dispatched only after receipt of a confirmed Purchase Order.";

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function pick(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function stateCodeFromGstin(gstin: string): string {
  const digits = String(gstin || "").replace(/\s/g, "");
  if (digits.length >= 2 && /^\d{2}/.test(digits)) return digits.slice(0, 2);
  return "27";
}

function partyFromRaw(
  name: string,
  raw: Record<string, unknown>,
  fallbacks: Record<string, unknown> = {},
): { name: string; lines: string[] } {
  const address =
    asText(raw.address ?? raw.address_line ?? fallbacks.address, "") ||
    [asText(raw.address_line_1, ""), asText(raw.address_line_2, "")]
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
  const stateCode = stateCodeFromGstin(gstin);
  const mobile = asText(raw.mobile ?? raw.mobile_no ?? fallbacks.mobile, "");
  const email = asText(raw.email ?? fallbacks.email, "");

  const lines: string[] = [];
  if (address) lines.push(address);
  if (cityStatePin) lines.push(cityStatePin);
  if (gstin) lines.push(`GSTIN ${gstin}  State Code ${stateCode}`);
  if (mobile || email) {
    lines.push(
      [mobile ? `Mobile ${mobile}` : "", email ? `Email ${email}` : ""]
        .filter(Boolean)
        .join("  "),
    );
  }
  return { name: asText(name, "—"), lines };
}

function salespersonName(raw: Record<string, unknown>): string {
  const full = [asText(raw.first_name, ""), asText(raw.last_name, "")]
    .filter(Boolean)
    .join(" ")
    .trim();
  return asText(full || raw.full_name || raw.name || raw.username, "—");
}

function collectPackingProducts(order: Record<string, unknown>): any[] {
  const lists = Array.isArray(order.packing_lists) ? order.packing_lists : [];
  const products: any[] = [];
  for (const list of lists) {
    const rows = Array.isArray(list?.products) ? list.products : [];
    for (const row of rows) products.push(row);
  }
  return products;
}

function formatMonthYear(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-" || raw === "—") return "";
  // Already month-year like "Aug-2025"
  if (/^[A-Za-z]{3}-\d{4}$/.test(raw)) return raw;

  // Prefer YYYY-MM-DD as local calendar date (avoid UTC day shift)
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let parsed: Date;
  if (ymd) {
    parsed = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  } else {
    parsed = new Date(raw);
  }
  if (Number.isNaN(parsed.getTime())) return "";
  const mon = parsed.toLocaleDateString("en-GB", { month: "short" });
  const year = parsed.getFullYear();
  return `${mon}-${year}`;
}

function batchLineFromPackingProduct(plProduct: any): string {
  // Dates come only from packing list product (batch_code + batch_snapshot) — no inventory/GrnBatch fallback
  const snapRaw = plProduct?.batch_snapshot;
  const snap =
    typeof snapRaw === "string"
      ? readRecord((() => {
          try {
            return JSON.parse(snapRaw);
          } catch {
            return {};
          }
        })())
      : readRecord(snapRaw);
  const batchNo = asText(
    plProduct?.batch_code ||
      pick(snap, ["batch_code", "batch_no", "batch_number"]),
    "",
  );
  const mfg = formatMonthYear(
    pick(snap, [
      "mfg_date",
      "manufacture_date",
      "manufacturing_date",
      "mfgDate",
      "manufactureDate",
    ]),
  );
  const exp = formatMonthYear(
    pick(snap, ["expiry_date", "expiryDate", "exp_date", "expDate"]),
  );
  return [
    batchNo ? `Batch No.: ${batchNo}` : "",
    mfg ? `Mfg. Date: ${mfg}` : "",
    exp ? `Expiry Date: ${exp}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function findPackingProductsForItem(
  item: any,
  packingProducts: any[],
): any[] {
  const itemId = asText(item.sample_order_item_id || item.id, "");
  const productId = asText(item.product_id, "");
  const bySource = packingProducts.filter(
    (p) =>
      itemId &&
      asText(p.source_item_id, "") === itemId,
  );
  if (bySource.length) return bySource;
  if (!productId) return [];
  return packingProducts.filter(
    (p) => asText(p.product_id, "") === productId,
  );
}

function buildLineFromSampleItem(
  item: any,
  index: number,
  interstate: boolean,
  packingOverride?: { qty?: number; batchLine?: string },
): TaxInvoiceLineItem {
  const product = readRecord(item.product);
  const productSnapshot = readRecord(item.product_snapshot);
  const hsnObj = readRecord(product.hsn ?? productSnapshot.hsn);
  const gstRateObj = readRecord(product.gst_rate ?? productSnapshot.gst_rate);

  const totalQty =
    packingOverride?.qty !== undefined
      ? packingOverride.qty
      : toNumber(item.base_qty ?? item.quantity);
  const packSize = Math.max(
    1,
    toNumber(
      product.unit_per_packing ??
        product.pack_size ??
        productSnapshot.conversion_qty ??
        productSnapshot.unit_per_packing ??
        1,
    ),
  );
  const qtyInCase = packSize > 1 ? Math.floor(totalQty / packSize) : totalQty;
  const rate = toNumber(item.dp_price ?? item.unit_price);
  const grossAmt = round2(totalQty * rate);
  const discPct = toNumber(
    item.discount_percent !== undefined
      ? item.discount_percent
      : item.discount_percentage ?? 100,
  );
  const discAmt =
    packingOverride?.qty !== undefined
      ? round2((grossAmt * discPct) / 100)
      : toNumber(item.discount_amount) || round2((grossAmt * discPct) / 100);
  const taxableValue = round2(Math.max(0, grossAmt - discAmt));

  const gstPct =
    toNumber(productSnapshot.gst_percent) ||
    toNumber(gstRateObj.gstPercentage) ||
    toNumber(gstRateObj.gst_percentage) ||
    toNumber(item.gst_percentage) ||
    0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const taxAmt =
    packingOverride?.qty !== undefined
      ? 0
      : toNumber(item.tax_amount);
  if (taxAmt > 0 && packingOverride?.qty === undefined) {
    // Prefer stored tax when using full SO line qty
    const fullQty = toNumber(item.base_qty ?? item.quantity) || totalQty;
    const share = fullQty > 0 ? totalQty / fullQty : 1;
    const scaledTax = round2(taxAmt * share);
    if (interstate) {
      igst = scaledTax;
    } else {
      cgst = round2(scaledTax / 2);
      sgst = round2(scaledTax - cgst);
    }
  } else if (gstPct > 0 && taxableValue > 0) {
    const tax = round2((taxableValue * gstPct) / 100);
    if (interstate) {
      igst = tax;
    } else {
      cgst = round2(tax / 2);
      sgst = round2(tax - cgst);
    }
  }

  const total = round2(taxableValue + cgst + sgst + igst);

  let batchLine = packingOverride?.batchLine || "";
  if (!batchLine) {
    const batchNo = asText(
      pick(readRecord(item), ["batch_no", "batch_number", "batchNumber"]),
      "",
    );
    const mfg = formatMonthYear(
      pick(readRecord(item), [
        "mfg_date",
        "manufacture_date",
        "manufacturing_date",
      ]),
    );
    const exp = formatMonthYear(
      pick(readRecord(item), ["expiry_date", "expiryDate", "exp_date"]),
    );
    batchLine = [
      batchNo ? `Batch No.: ${batchNo}` : "",
      mfg ? `Mfg. Date: ${mfg}` : "",
      exp ? `Expiry Date: ${exp}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return {
    sr: index + 1,
    productCode: asText(
      product.product_code ?? productSnapshot.product_code,
      "—",
    ),
    productName: asText(
      product.product_name ||
        productSnapshot.product_name ||
        item.product_name,
    ),
    batchLine,
    sku: asText(
      product.sku ?? productSnapshot.sku ?? product.product_code,
      "—",
    ),
    hsnCode: asText(
      hsnObj.hsnCode ||
        hsnObj.hsn_code ||
        productSnapshot.hsn_code ||
        productSnapshot.hsnCode ||
        "",
      "",
    ),
    qtyInCase,
    totalQty,
    uom: asText(
      product.unit ||
        product.mou ||
        productSnapshot.base_unit ||
        productSnapshot.unit ||
        "Units",
      "Units",
    ),
    rate,
    grossAmt,
    discPct,
    discAmt,
    taxableValue,
    gstPct,
    cgst,
    sgst,
    igst,
    total,
    interstate: interstate || igst > 0,
  };
}

/**
 * Map sample order API payload → shared Paramverse invoice view-model.
 * @param piNumber Allocated PFI code for Proforma Invoice No. (Sales Order No. stays order_no).
 */
export function mapSampleOrderToProforma(
  rawOrder: any,
  piNumber?: string | null,
): TaxInvoiceViewModel {
  const order = readRecord(rawOrder);
  const warehouse = readRecord(order.warehouse);
  const customer = readRecord(order.customer);
  const snapshot = readRecord(order.customer_snapshot);
  const billTo = readRecord(order.bill_to);
  const shipTo = readRecord(order.ship_to);
  const salesperson = readRecord(order.salesperson);

  const customerName = asText(
    billTo.name ||
      billTo.customer_name ||
      customer.customer_name ||
      snapshot.customer_name,
    "—",
  );

  const placeOfSupply = [
    asText(shipTo.city || billTo.city || snapshot.city || customer.city, ""),
    asText(shipTo.state || billTo.state || snapshot.state || customer.state, ""),
  ]
    .filter(Boolean)
    .join(", ");

  const customerGstin = asText(
    billTo.gstin ||
      billTo.gstin_no ||
      customer.gstin_no ||
      snapshot.gstin_no,
    "",
  );

  const warehouseState = asText(warehouse.state, "Maharashtra");
  const customerState = asText(
    shipTo.state || billTo.state || customer.state || snapshot.state,
    "Maharashtra",
  );
  const interstate =
    warehouseState.toLowerCase() !== customerState.toLowerCase();

  const items = (Array.isArray(order.items) ? order.items : []) as any[];
  const packingProducts = collectPackingProducts(order);
  const usedPackingIds = new Set<string>();

  const lines: TaxInvoiceLineItem[] = [];
  for (const item of items) {
    const matches = findPackingProductsForItem(item, packingProducts).filter(
      (p) => {
        const id = asText(p.packing_list_product_id || p.id, "");
        if (id && usedPackingIds.has(id)) return false;
        return true;
      },
    );

    if (matches.length) {
      for (const pl of matches) {
        const id = asText(pl.packing_list_product_id || pl.id, "");
        if (id) usedPackingIds.add(id);
        const qty = toNumber(
          pl.order_base_qty ?? pl.packed_base_qty ?? pl.pending_base_qty,
        );
        lines.push(
          buildLineFromSampleItem(item, lines.length, interstate, {
            qty: qty > 0 ? qty : undefined,
            batchLine: batchLineFromPackingProduct(pl),
          }),
        );
      }
    } else {
      lines.push(buildLineFromSampleItem(item, lines.length, interstate));
    }
  }

  // Any packing products not matched to an SO item (edge case) — skip; SO items are source of truth for pricing.
  const hsnMap = new Map<string, TaxInvoiceHsnSummaryRow>();
  for (const line of lines) {
    const key = `${line.hsnCode}|${line.gstPct}`;
    const existing = hsnMap.get(key);
    if (!existing) {
      hsnMap.set(key, {
        hsnCode: line.hsnCode || "—",
        taxableValue: line.taxableValue,
        gstPct: line.gstPct,
        cgst: line.cgst,
        sgst: line.sgst,
        igst: line.igst,
        totalTax: round2(line.cgst + line.sgst + line.igst),
      });
    } else {
      existing.taxableValue = round2(existing.taxableValue + line.taxableValue);
      existing.cgst = round2(existing.cgst + line.cgst);
      existing.sgst = round2(existing.sgst + line.sgst);
      existing.igst = round2(existing.igst + line.igst);
      existing.totalTax = round2(existing.cgst + existing.sgst + existing.igst);
    }
  }

  const grossAmount = round2(lines.reduce((s, l) => s + l.grossAmt, 0));
  const discount = round2(lines.reduce((s, l) => s + l.discAmt, 0));
  const taxableValue = round2(lines.reduce((s, l) => s + l.taxableValue, 0));
  const cgst = round2(lines.reduce((s, l) => s + l.cgst, 0));
  const sgst = round2(lines.reduce((s, l) => s + l.sgst, 0));
  const igst = round2(lines.reduce((s, l) => s + l.igst, 0));
  const totalTax = round2(cgst + sgst + igst);
  const beforeRound = round2(taxableValue + totalTax);
  const grandTotal = Math.round(beforeRound);
  const roundOff = round2(grandTotal - beforeRound);

  const warehouseName = asText(
    warehouse.registered_legal_name || warehouse.warehouse_name,
    "ParamVerse Bio Pvt. Ltd.",
  );
  const billFrom = partyFromRaw(warehouseName, warehouse, {
    address: [asText(warehouse.address, ""), asText(warehouse.address_1, "")]
      .filter(Boolean)
      .join(", "),
    city: warehouse.city,
    state: warehouse.state,
    pincode: warehouse.pincode,
    gstin: asText(warehouse.gst_number || warehouse.gstin, "27AAQCP4960M1ZL"),
    mobile: warehouse.mobile || warehouse.phone,
    email: warehouse.email,
  });

  const billing = partyFromRaw(customerName, billTo, {
    ...customer,
    ...snapshot,
    address:
      asText(billTo.address, "") ||
      asText(customer.registered_gst_address || customer.address, ""),
    city: billTo.city || customer.city || snapshot.city,
    state:
      billTo.state ||
      customer.registered_gst_state ||
      customer.state ||
      snapshot.state,
    pincode: billTo.pincode || customer.pincode || snapshot.pincode,
    gstin: customerGstin,
    mobile: billTo.mobile || customer.mobile_no || snapshot.mobile_no,
    email: billTo.email || customer.email || snapshot.email,
  });

  const shipName = asText(
    shipTo.name || shipTo.customer_name || customerName,
    customerName,
  );
  const shipping = partyFromRaw(shipName, shipTo, {
    ...customer,
    ...snapshot,
    address:
      asText(shipTo.address, "") ||
      asText(customer.shipping_address || customer.address, ""),
    city: shipTo.city || customer.city || snapshot.city,
    state: shipTo.state || customer.state || snapshot.state,
    pincode: shipTo.pincode || customer.pincode || snapshot.pincode,
    gstin: asText(shipTo.gstin || shipTo.gstin_no || customerGstin, ""),
    mobile: shipTo.mobile || customer.mobile_no || snapshot.mobile_no,
    email: shipTo.email || customer.email || snapshot.email,
  });

  const orderNo = asText(order.order_no, "—");
  const proformaNo = asText(piNumber, "—");

  return {
    logoSrc: undefined,
    ...PARAMVERSE_COMPANY,
    copyLabel: "Proforma Invoice - Sample Order",
    invoiceNo: proformaNo,
    invoiceDate: formatDate(order.order_date || order.created_at),
    customerPoNo: asText(
      pick(order, ["customer_po_number", "customer_po_no", "po_number", "reference_number"]),
      "—",
    ),
    customerPoDate: formatDate(
      pick(order, ["customer_po_date", "po_date"]),
    ),
    salesOrderNo: orderNo,
    salesOrderDate: formatDate(order.order_date || order.created_at),
    salesPerson: salespersonName(salesperson),
    dispatchThrough: "—",
    vehicleNo: "—",
    placeOfSupply: placeOfSupply || "—",
    stateCode: stateCodeFromGstin(customerGstin),
    transportDocNo: "—",
    transportDocDate: "—",
    eInvoiceNo: "—",
    acknowledgementNo: "—",
    acknowledgementDate: "—",
    ewayBillNo: "—",
    ewayBillExpiry: "—",
    irn: "—",
    billFrom,
    billTo: billing,
    shipTo: shipping,
    lines,
    hsnSummary: Array.from(hsnMap.values()),
    bank: { ...DEFAULT_BANK },
    terms: PROFORMA_TERMS,
    summary: {
      grossAmount,
      discount,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      roundOff,
      grandTotal,
    },
    amountInWords: formatAmountInWords(grandTotal),
    interstate,
  };
}

export function buildProformaInvoiceHtml(data: TaxInvoiceViewModel): string {
  return buildTaxInvoiceHtml(data, {
    docTitle: "PROFORMA INVOICE",
    partyMode: "bill_ship",
    layout: "proforma",
  });
}

export async function openEditableProformaPreview(
  data: TaxInvoiceViewModel,
): Promise<void> {
  const logoSrc = data.logoSrc || (await loadNavbarLogoDataUrl());
  await openEditablePdfPreview({
    title: "Proforma Invoice PDF Preview",
    initialData: { ...data, logoSrc } as unknown as Record<string, unknown>,
    renderHtml: (edited) =>
      buildProformaInvoiceHtml(edited as unknown as TaxInvoiceViewModel),
    printButtonLabel: "Download Proforma Invoice PDF",
    outputFileName: `${sanitizePdfFileName(data.invoiceNo || data.salesOrderNo, "PROFORMA_INVOICE")}.pdf`,
  });
}

/** Fetch sample order by id and open editable Paramverse Proforma Invoice preview. */
export async function downloadProformaInvoicePdf(
  orderId: string | number,
): Promise<void> {
  // Allocate first (same pattern as Delivery Challan) so PDF always has SM number.
  const pfiRes = await axiosInstance.get(
    API_ENDPOINTS.SALES.SAMPLE_ORDER.ALLOCATE_PFI(String(orderId)),
  );
  const piNumber = String(
    pfiRes.data?.data?.pi_number ||
      pfiRes.data?.pi_number ||
      "",
  ).trim();
  if (!piNumber) {
    throw new Error("Failed to allocate Proforma Invoice number.");
  }

  const response = await axiosInstance.get(
    API_ENDPOINTS.SALES.SAMPLE_ORDER.DETAILS(String(orderId)),
  );
  const raw = response.data?.data || {};

  // Fallback: if detail payload has no packing lists, load them by source
  let packingLists = Array.isArray(raw.packing_lists) ? raw.packing_lists : [];
  if (packingLists.length === 0) {
    try {
      const listRes = await axiosInstance.post(
        `${API_ENDPOINTS.WAREHOUSE.PACKING_LIST.LIST}?page=1&page_size=20`,
        {
          filters: {
            source_type: "sample",
            source_id: String(orderId),
          },
        },
      );
      const payload = listRes.data as Record<string, unknown>;
      const dataObj = payload.data as Record<string, unknown> | unknown[];
      const rows = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray((dataObj as any)?.data)
          ? (dataObj as any).data
          : [];
      const details = await Promise.all(
        rows.slice(0, 5).map(async (row: any) => {
          const id = row?.packing_list_id || row?.id;
          if (!id) return null;
          const detailRes = await axiosInstance.get(
            API_ENDPOINTS.WAREHOUSE.PACKING_LIST.DETAILS(String(id)),
          );
          return detailRes.data?.data || null;
        }),
      );
      packingLists = details.filter(Boolean);
    } catch {
      // keep empty; PDF still renders without batch lines
    }
  }

  const mapped = mapSampleOrderToProforma(
    {
      ...raw,
      packing_lists: packingLists,
    },
    piNumber,
  );
  await openEditableProformaPreview(mapped);
}
