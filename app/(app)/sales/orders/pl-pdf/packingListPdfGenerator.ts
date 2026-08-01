"use client";

import {
  loadNavbarLogoDataUrl,
  openEditablePdfPreview,
  openPdfPrintWindow,
  sanitizePdfFileName,
} from "@/lib/pdf/paramverse";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  PACKING_LIST_COMPANY,
  DEFAULT_PACKING_DECLARATION,
  buildPackingListPdfHtml,
  type PackingListPdfData,
  type PackingListPartyBlock,
  type PackingListProductRow,
  type PackingListCartonRow,
} from "./packingListPdfTemplate";
import {
  asText,
  formatDate,
  toNumber,
} from "@/lib/pdf/paramverse";

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

function formatPackSize(product: Record<string, unknown>, snapshot: Record<string, unknown>): string {
  const size =
    pick(product, ["pack_size"]) ??
    pick(snapshot, ["pack_size", "packSize"]);
  const unit =
    asText(pick(product, ["packing_unit", "unit", "mou"]) ?? pick(snapshot, ["packing_unit", "unit", "mou"]), "");
  if (size === undefined || size === null || String(size).trim() === "") {
    return unit || "—";
  }
  const sizeText = String(size).trim();
  if (!unit) return sizeText;
  return `${sizeText} ${unit}`.replace(/\s+/g, " ").trim();
}

function mapParty(
  party: Record<string, unknown>,
  fallbackName: string,
  customer: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  options?: { includeContact?: boolean },
): PackingListPartyBlock {
  const name =
    asText(
      pick(party, ["customer_name", "name", "registered_legal_name"]) ??
        pick(customer, ["customer_name", "registered_legal_name"]) ??
        pick(snapshot, ["customer_name"]) ??
        fallbackName,
      fallbackName,
    ) || fallbackName;

  return {
    name,
    addressLine: asText(
      pick(party, ["address", "address_line", "address_line_1", "shipping_address"]) ??
        pick(snapshot, ["shipping_address", "address"]),
      "",
    ) || undefined,
    city: asText(pick(party, ["city"]) ?? pick(snapshot, ["city"]), "") || undefined,
    state: asText(pick(party, ["state"]) ?? pick(snapshot, ["state"]), "") || undefined,
    pincode: asText(pick(party, ["pincode", "pin", "pin_code"]) ?? pick(snapshot, ["pincode"]), "") || undefined,
    gstin: asText(
      pick(party, ["gstin", "gstin_no", "gst_number"]) ??
        pick(customer, ["gstin_no", "gstin"]) ??
        pick(snapshot, ["gstin", "gstin_no"]),
      "",
    ) || undefined,
    contact: options?.includeContact
      ? asText(
          pick(party, ["contact", "contact_person", "contact_name"]) ??
            pick(snapshot, ["contact_person", "contact_name"]),
          "",
        ) || undefined
      : undefined,
    mobile: options?.includeContact
      ? asText(
          pick(party, ["mobile", "mobile_no", "phone"]) ??
            pick(customer, ["mobile_no", "mobile"]) ??
            pick(snapshot, ["mobile", "mobile_no"]),
          "",
        ) || undefined
      : undefined,
  };
}

function buildPdfData(
  packingList: Record<string, unknown>,
  salesOrder: Record<string, unknown>,
  logoSrc?: string,
): PackingListPdfData {
  const productsRaw = Array.isArray(packingList.products) ? packingList.products : [];
  const customer = readRecord(salesOrder.customer);
  const customerSnapshot = readRecord(packingList.customer_snapshot);
  const billToRaw = readRecord(salesOrder.bill_to);
  const shipToRaw = readRecord(salesOrder.ship_to);
  const fallbackName = asText(
    packingList.customer_name ?? customer.customer_name ?? salesOrder.customer_name,
    "—",
  );

  const packingDones = Array.isArray(packingList.packing_dones)
    ? packingList.packing_dones
    : [];
  const packingDone = readRecord(packingDones[0]);
  const dispatches = Array.isArray(packingDone.dispatches) ? packingDone.dispatches : [];
  const dispatch = readRecord(dispatches[0]);

  const products: PackingListProductRow[] = [];
  const cartons: PackingListCartonRow[] = [];
  let totalQty = 0;
  let unitLabel = "Units";
  let totalNet = 0;
  let totalGross = 0;

  productsRaw.forEach((row, index) => {
    const item = readRecord(row);
    const product = readRecord(item.product);
    const snapshot = readRecord(item.product_snapshot);
    const batchSnap = readRecord(item.batch_snapshot);
    const hsnObj = readRecord(product.hsn ?? snapshot.hsn);

    const qty =
      toNumber(item.packed_base_qty) > 0
        ? toNumber(item.packed_base_qty)
        : toNumber(item.order_base_qty);
    const unit =
      asText(
        pick(product, ["packing_unit", "unit", "mou"]) ??
          pick(snapshot, ["packing_unit", "unit", "mou"]),
        "Units",
      ) || "Units";
    const netPerUnit = toNumber(
      pick(product, ["net_weight"]) ?? pick(snapshot, ["net_weight", "netWeight"]),
    );
    const grossPerUnit = toNumber(
      pick(product, ["gross_weight"]) ?? pick(snapshot, ["gross_weight", "grossWeight"]),
    );
    const netWt = netPerUnit > 0 ? netPerUnit * qty : 0;
    const grossWt = grossPerUnit > 0 ? grossPerUnit * qty : 0;
    const batchNo = asText(
      item.batch_code ??
        pick(batchSnap, ["batch_code", "batch_no", "batch_number", "batchNumber"]) ??
        "—",
    );

    totalQty += qty;
    unitLabel = unit;
    totalNet += netWt;
    totalGross += grossWt;

    products.push({
      sr: index + 1,
      productName: asText(
        product.product_name ?? snapshot.product_name ?? item.product_name,
      ),
      hsnCode: asText(
        pick(hsnObj, ["hsnCode", "hsn_code"]) ??
          pick(product, ["hsn_code"]) ??
          pick(snapshot, ["hsn_code", "hsnCode"]),
      ),
      batchNo,
      mfgDate: formatDate(
        pick(batchSnap, [
          "mfg_date",
          "mfgDate",
          "manufacture_date",
          "manufactureDate",
          "manufacturing_date",
          "manufacturingDate",
        ]),
      ),
      expiryDate: formatDate(
        pick(batchSnap, [
          "expiry_date",
          "expiryDate",
          "exp_date",
          "expDate",
          "expiry",
        ]),
      ),
      qty,
      unit,
      packSize: formatPackSize(product, snapshot),
      netWtKg: netWt,
      grossWtKg: grossWt,
    });

    cartons.push({
      batchNo,
      unitsPacked: qty,
      weightLabel: grossWt > 0 ? `${asText(grossWt.toFixed(0))} Kg` : "—",
    });
  });

  const totalPackages = cartons.length;
  const placeOfSupply = [
    asText(shipToRaw.city ?? customerSnapshot.city, ""),
    asText(shipToRaw.state ?? customerSnapshot.state, ""),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    logoSrc,
    ...PACKING_LIST_COMPANY,
    packingListNo: asText(packingList.packing_number),
    packingListDate: formatDate(
      packingList.generated_at ?? packingList.created_at ?? packingList.order_date,
    ),
    refInvoiceNo: asText(
      pick(dispatch, ["challan_number"]) ??
        pick(customerSnapshot, ["invoice_no", "ref_invoice_no"]),
      "—",
    ),
    dispatchDate: formatDate(
      pick(dispatch, ["dispatch_date"]) ?? packingDone.packing_date,
    ),
    billTo: mapParty(billToRaw, fallbackName, customer, customerSnapshot),
    shipTo: (() => {
      const ship = mapParty(shipToRaw, fallbackName, customer, customerSnapshot, {
        includeContact: true,
      });
      return { ...ship, gstin: undefined };
    })(),
    transporterName: asText(dispatch.transporter, "—"),
    vehicleNumber: asText(dispatch.vehicle_number, "—"),
    lrNumber: asText(dispatch.lr_number, "—"),
    dispatchMode: asText(pick(dispatch, ["dispatch_mode", "mode"]), "Road Transport"),
    placeOfSupply: placeOfSupply || "—",
    totalPackages,
    totalCartons: totalPackages,
    products,
    cartons,
    totalQuantityLabel: `${totalQty} ${unitLabel}`,
    totalNetWeightKg: totalNet,
    totalGrossWeightKg: totalGross,
    declaration: DEFAULT_PACKING_DECLARATION,
    signatoryLabel: PACKING_LIST_COMPANY.signatoryLabel,
  };
}

export function openPackingListPdfWindow(): Window | null {
  return openPdfPrintWindow("Preparing packing list PDF...");
}

async function resolvePackingListId(salesOrderId: string): Promise<string> {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.WAREHOUSE.PACKING_LIST.LIST}?page=1&limit=5`,
    {
      filters: {
        source_id: salesOrderId,
        source_type: "normal_sales",
      },
    },
  );
  const payload = response.data as Record<string, unknown>;
  const dataObj = payload.data as Record<string, unknown> | unknown[];
  const listData = Array.isArray(payload.data)
    ? payload.data
    : dataObj && typeof dataObj === "object" && !Array.isArray(dataObj) && Array.isArray(dataObj.data)
      ? dataObj.data
      : [];

  const first = listData[0] as Record<string, unknown> | undefined;
  const id = asText(first?.packing_list_id ?? first?.id, "");
  if (!id) {
    throw new Error("No packing list found for this sales order.");
  }
  return id;
}

/**
 * Downloads (print dialog) the Paramverse packing list PDF for a sales order.
 */
export async function downloadPackingListPdfForSalesOrder(
  salesOrderId: string,
  _openedWindow?: Window | null,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF download is only supported in the browser.");
  }

  try {
    const packingListId = await resolvePackingListId(String(salesOrderId));

    const [plRes, soRes, logoSrc] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.WAREHOUSE.PACKING_LIST.DETAILS(packingListId)),
      axiosInstance.get(API_ENDPOINTS.SALES.SALES_ORDER.DETAILS(String(salesOrderId))),
      loadNavbarLogoDataUrl(),
    ]);

    const packingList = readRecord(plRes.data?.data);
    const salesOrder = readRecord(soRes.data?.data);
    if (!packingList.packing_list_id && !packingList.packing_number) {
      throw new Error("Packing list details could not be loaded.");
    }

    const templateData = buildPdfData(packingList, salesOrder, logoSrc);
    await openEditablePdfPreview({
      title: "Packing List PDF Preview",
      initialData: templateData as unknown as Record<string, unknown>,
      renderHtml: (edited) =>
        buildPackingListPdfHtml(edited as unknown as PackingListPdfData),
      printButtonLabel: "Download Packing List PDF",
      outputFileName: `${sanitizePdfFileName(templateData.packingListNo, "PACKING_LIST")}.pdf`,
    });
  } catch (error) {
    throw error;
  }
}
