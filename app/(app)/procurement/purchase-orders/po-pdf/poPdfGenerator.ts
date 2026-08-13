"use client";

import type { PurchaseOrder } from "../po-data";
import { buildPurchaseOrderPdfHtml, type POPdfLineRow, type POPdfTemplateData } from "./poPdfTemplate";
import {
  asText,
  formatDate,
  toNumber,
} from "./poPdfFormatters";
import {
  PARAMVERSE_COMPANY,
  loadNavbarLogoDataUrl,
  openEditablePdfPreview,
  openPdfPrintWindow,
  sanitizePdfFileName,
} from "@/lib/pdf/paramverse";
import {
  calcAdditionalChargeTax,
  sumAdditionalChargeTaxes,
} from "@/lib/procurement/procurement-line-utils";
import { round2 } from "@/lib/procurement/utils";

const COMPANY_HEADER = {
  ...PARAMVERSE_COMPANY,
  companyMetaLine:
    "GSTIN: 27AAQCP4960M1ZL   PAN: AAQCP4960M   CIN: U46201MH2025PTC463792",
  companyContactLine:
    "Ph: 022-41276000/01/02/03   Email: info@paramverse.com   Web: www.paramversebio.com",
};

export function openPurchaseOrderPdfWindow(): Window | null {
  return openPdfPrintWindow("Preparing purchase order PDF...");
}

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

function splitLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text
    .split(/\r?\n|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const DEFAULT_TERMS_AND_CONDITIONS: string[] = [
  "Material must be supplied strictly as per specifications and approved quality standards.",
  "Delivery must be completed on or before the Expected Delivery Date mentioned in this PO.",
  "GST Tax Invoice, E-Way Bill and Test Certificate must accompany every shipment.",
  "All material is subject to quality inspection at the point of receipt.",
  "Payment will be processed within the agreed terms following successful quality acceptance.",
  "Any deviation from specifications or quantity requires prior written approval from Procurement.",
  "Supplier must provide a batch-wise Certificate of Analysis (COA) for all biological inputs.",
  "Partial shipments are permitted only with prior written intimation and Procurement approval.",
];

const DEFAULT_SPECIAL_INSTRUCTIONS: string[] = [
  "Deliver directly to Central Warehouse, MIDC Phase-II. No direct site deliveries.",
  "Batch-wise packing required, with batch stickers on each carton.",
  "Test Certificate and COA mandatory for all biological raw materials.",
  "Maintain cold chain (2–8°C) for Trichoderma and Bacillus concentrates during transport.",
  "Fragile – handle HDPE bottles with care. Maximum stacking of 4 layers.",
];

function buildPaymentTerms(po: PurchaseOrder): string {
  const payment = asText(po.paymentType);
  if (payment === "Credit" && po.creditDays > 0) {
    return `${po.creditDays} Days from Invoice Date`;
  }
  return payment;
}

function textOrEmpty(value: unknown): string {
  const text = asText(value, "");
  return text === "-" || text === "—" ? "" : text;
}

function joinNonEmpty(parts: unknown[], sep = ", "): string {
  return parts
    .map((part) => textOrEmpty(part))
    .filter(Boolean)
    .join(sep);
}

function firstWarehouseContact(snapshot: Record<string, unknown>): {
  name: string;
  mobile: string;
  email: string;
} {
  const contacts = Array.isArray(snapshot.contacts) ? snapshot.contacts : [];
  const primary =
    contacts.find((item) => Boolean(readRecord(item).is_primary)) ?? contacts[0];
  const rec = readRecord(primary);
  return {
    name: textOrEmpty(pick(rec, ["contact_person", "name"])),
    mobile: textOrEmpty(pick(rec, ["mobile_number", "mobile"])),
    email: textOrEmpty(pick(rec, ["email_address", "email"])),
  };
}

function buildAddressPartyLines(params: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  stateCode?: string;
  contact?: string;
  mobile?: string;
  email?: string;
}): string[] {
  const cityStatePin = joinNonEmpty([params.city, params.state, params.pincode]);
  const gstLine = joinNonEmpty(
    [
      params.gstin ? `GSTIN ${params.gstin}` : "",
      params.stateCode ? `State Code ${params.stateCode}` : "",
    ],
    "  ",
  );
  const contactLine = joinNonEmpty(
    [
      params.contact ? `Contact ${params.contact}` : "",
      params.mobile ? `Mobile ${params.mobile}` : "",
    ],
    "  ",
  );
  return [
    params.name || "—",
    params.address || "",
    cityStatePin,
    gstLine,
    contactLine,
    params.email ? `Email ${params.email}` : "",
  ].filter((line) => String(line).trim());
}

function buildTemplateData(
  po: PurchaseOrder,
  raw: Record<string, unknown>,
  logoSrc?: string,
): POPdfTemplateData {
  const company = readRecord(raw.company_snapshot);
  const warehouse = readRecord(raw.warehouse_snapshot);
  const supplier = readRecord(raw.supplier);
  const supplierSnapshot = readRecord(raw.supplier_snapshot);
  const requisition = readRecord(raw.purchase_requisition);

  const companyName = COMPANY_HEADER.companyName;
  const companyAddress = COMPANY_HEADER.companyAddress;
  const companyMetaLine = COMPANY_HEADER.companyMetaLine;
  const companyContactLine = COMPANY_HEADER.companyContactLine;

  const supplierAddress =
    asText(pick(supplier, ["address"])) ||
    asText(pick(supplierSnapshot, ["address"]));
  const supplierLines = [
    asText(po.supplierName),
    `Supplier Code: ${asText(pick(supplier, ["supplier_code"]) ?? pick(supplierSnapshot, ["supplier_code"]) ?? po.supplierCode)}`,
    supplierAddress,
    `GSTIN ${asText(po.supplierGstin)}  PAN ${asText(pick(supplier, ["pan_number"]) ?? pick(supplierSnapshot, ["pan_no"]))}`,
    `Contact ${asText(po.supplierContactPerson)}  Mobile ${asText(po.supplierMobile)}`,
    `Email ${asText(po.supplierEmail)}`,
  ];

  const billingSnapshot = readRecord(raw.billing_address);
  const shippingSnapshot = readRecord(raw.shipping_address);
  const billContact = firstWarehouseContact(billingSnapshot);
  const shipContact = firstWarehouseContact(
    Object.keys(shippingSnapshot).length ? shippingSnapshot : warehouse,
  );

  const billToLines = buildAddressPartyLines({
    name:
      textOrEmpty(
        pick(billingSnapshot, ["registered_legal_name", "warehouse_name", "company_name", "name"]) ??
          po.billing.companyName ??
          companyName,
      ) || companyName,
    address:
      textOrEmpty(
        pick(billingSnapshot, ["registered_gst_address", "address", "billingAddress"]) ??
          po.billing.billingAddress,
      ) ||
      joinNonEmpty([
        pick(billingSnapshot, ["address"]),
        pick(billingSnapshot, ["address_1"]),
      ]),
    city: textOrEmpty(pick(billingSnapshot, ["city"]) ?? po.billing.city),
    state: textOrEmpty(pick(billingSnapshot, ["state"]) ?? po.billing.state ?? po.state),
    pincode: textOrEmpty(pick(billingSnapshot, ["pincode"]) ?? po.billing.pincode),
    gstin: textOrEmpty(
      pick(billingSnapshot, ["gst_number", "gstin", "gstNumber"]) ??
        pick(company, ["gstin", "gst_number"]) ??
        po.billing.gstNumber,
    ),
    stateCode: textOrEmpty(pick(billingSnapshot, ["state_code"]) ?? pick(company, ["state_code"])),
    contact: billContact.name || textOrEmpty(po.shipping.contactPerson),
    mobile: billContact.mobile || textOrEmpty(po.shipping.contactNumber),
    email: billContact.email || textOrEmpty(pick(company, ["email"])),
  });

  const shipSnapshot = Object.keys(shippingSnapshot).length ? shippingSnapshot : warehouse;
  const shipToLines = buildAddressPartyLines({
    name:
      textOrEmpty(
        pick(shipSnapshot, ["warehouse_name", "registered_legal_name", "name"]) ??
          po.warehouseName ??
          po.shipping.shipToLocation,
      ) || "—",
    address:
      textOrEmpty(
        po.deliveryAddress ||
          po.shipping.address ||
          pick(shipSnapshot, ["address", "registered_gst_address"]),
      ) ||
      joinNonEmpty([
        pick(shipSnapshot, ["address"]),
        pick(shipSnapshot, ["address_1"]),
      ]),
    city: textOrEmpty(pick(shipSnapshot, ["city"])),
    state: textOrEmpty(
      pick(shipSnapshot, ["state"]) ?? po.shipping.branch ?? po.state,
    ),
    pincode: textOrEmpty(pick(shipSnapshot, ["pincode"])),
    gstin: textOrEmpty(
      pick(shipSnapshot, ["gst_number", "gstin", "gstNumber"]) ??
        pick(company, ["gstin", "gst_number"]) ??
        po.billing.gstNumber,
    ),
    stateCode: textOrEmpty(pick(shipSnapshot, ["state_code"]) ?? pick(company, ["state_code"])),
    contact: shipContact.name || textOrEmpty(po.shipping.contactPerson),
    mobile: shipContact.mobile || textOrEmpty(po.shipping.contactNumber),
    email:
      shipContact.email ||
      textOrEmpty(pick(shipSnapshot, ["email"]) ?? pick(company, ["email"])),
  });

  const products = Array.isArray(raw.products) ? raw.products : [];
  const lineRows: POPdfLineRow[] = po.lines.map((line, index) => {
    const gross = toNumber(line.grossAmount);
    const discountAmount = toNumber(line.discountAmount);
    const taxable =
      gross > 0
        ? gross - discountAmount
        : toNumber(line.orderedQty) * toNumber(line.unitPrice) - discountAmount;
    const rawProduct = readRecord(products[index]);
    const snapshot = readRecord(rawProduct.product_snapshot);
    const snapshotHsn = readRecord(snapshot.hsn);
    const hsn =
      asText(line.hsnCode, "") ||
      asText(rawProduct.hsn_code, "") ||
      asText(snapshot.hsn_code, "") ||
      asText(snapshot.hsnCode, "") ||
      asText(snapshotHsn.hsnCode, "") ||
      asText(snapshotHsn.hsn_code, "") ||
      "-";
    return {
      sr: index + 1,
      itemCode: asText(line.productCode),
      itemName: asText(line.productName),
      hsn,
      qty: toNumber(line.orderedQty),
      uom: asText(line.uom || line.baseUnit),
      rate: toNumber(line.unitPrice),
      discount: toNumber(line.discountPct),
      taxableValue: taxable,
      gstPercent:
        toNumber(line.cgstPct) + toNumber(line.sgstPct) + toNumber(line.igstPct),
      cgstAmount: round2(taxable * (toNumber(line.cgstPct) / 100)),
      sgstAmount: round2(taxable * (toNumber(line.sgstPct) / 100)),
      igstAmount: round2(taxable * (toNumber(line.igstPct) / 100)),
      total: toNumber(line.netAmount),
    };
  });

  const additionalCharges = (po.additionalCharges ?? []).filter(
    (charge) => textOrEmpty(charge.chargeName) || toNumber(charge.amount) > 0,
  );
  if (
    !additionalCharges.length &&
    toNumber(po.summary.additionalChargesTotal || po.otherCharges) > 0
  ) {
    additionalCharges.push({
      uid: "other-charges",
      chargeName: "Other Charges",
      amount: toNumber(po.summary.additionalChargesTotal || po.otherCharges),
      cgstPct: 0,
      sgstPct: 0,
      igstPct: 0,
    });
  }
  additionalCharges.forEach((charge) => {
    const tax = calcAdditionalChargeTax(charge);
    lineRows.push({
      sr: lineRows.length + 1,
      itemCode: "",
      itemName: asText(charge.chargeName, "Additional Charge"),
      itemSubName: textOrEmpty(charge.remarks) || undefined,
      hsn: "",
      qty: 0,
      uom: "",
      rate: tax.taxableValue,
      discount: 0,
      taxableValue: tax.taxableValue,
      gstPercent: toNumber(charge.cgstPct) + toNumber(charge.sgstPct) + toNumber(charge.igstPct),
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      total: tax.netAmount,
      isCharge: true,
    });
  });

  const summary = po.summary;
  const chargeTaxes = sumAdditionalChargeTaxes(additionalCharges);
  const termsLines = splitLines(pick(raw, ["terms_and_conditions", "terms"]));
  const fallbackTerms = splitLines(po.terms.map((term) => term.content));
  const specialInstructionLines = splitLines(
    pick(raw, ["special_instructions", "instructions"]),
  );

  const quotationRef = asText(
    pick(raw, [
      "supplier_quotation_ref",
      "supplier_quotation_no",
      "quotation_ref",
      "reference_number",
    ]) ?? po.referenceNumber,
  );
  const quotationDate = formatDate(
    pick(raw, ["supplier_quotation_date", "quotation_date"]),
  );
  const prReference = asText(
    pick(requisition, ["pr_number"]) ?? po.sourcePrNumber,
  );

  return {
    fileTitle: asText(po.poNumber, "Purchase Order"),
    logoSrc,
    companyName,
    companyAddress,
    companyMetaLine,
    companyContactLine,
    poNumber: asText(po.poNumber),
    poDate: formatDate(po.poDate),
    prReference,
    supplierQuotationRef: quotationRef,
    supplierQuotationDate: quotationDate,
    expectedDelivery: formatDate(po.expectedDeliveryDate),
    buyer: asText(
      pick(raw, ["buyer_name", "created_by_name"]) ?? po.createdBy,
    ),
    department: asText(
      pick(raw, ["department", "department_name"]) || "Procurement & Logistics",
    ),
    currency: asText(po.currency || "INR"),
    paymentTerms: buildPaymentTerms(po),
    supplierBlockLines: supplierLines,
    billToBlockLines: billToLines,
    shipToBlockLines: shipToLines,
    lines: lineRows,
    summary: {
      grossAmount: toNumber(summary.grossAmount),
      itemDiscount: toNumber(summary.totalDiscount),
      additionalDiscount: 0,
      freight: 0,
      otherCharges: toNumber(summary.additionalChargesTotal),
      taxableValue: toNumber(summary.taxableValue),
      cgst: toNumber(summary.totalCgst) + chargeTaxes.totalCgst,
      sgst: toNumber(summary.totalSgst) + chargeTaxes.totalSgst,
      igst: toNumber(summary.totalIgst) + chargeTaxes.totalIgst,
      roundOff: 0,
      grandTotal: toNumber(summary.grandTotal),
    },
    amountInWords: asText(summary.amountInWords),
    termsLines: termsLines.length
      ? termsLines
      : fallbackTerms.length
        ? fallbackTerms
        : DEFAULT_TERMS_AND_CONDITIONS,
    specialInstructionLines: specialInstructionLines.length
      ? specialInstructionLines
      : DEFAULT_SPECIAL_INSTRUCTIONS,
    signatoryCompany: COMPANY_HEADER.signatoryCompany,
    footerLeftText: "This is a computer-generated Purchase Order.",
    footerCenterText: `${asText(po.poNumber)} · ${formatDate(po.poDate)}`,
    footerRightText: COMPANY_HEADER.signatoryCompany,
  };
}

export async function generateAndPrintPurchaseOrderPdf(
  po: PurchaseOrder,
  raw: Record<string, unknown>,
  _openedWindow?: Window | null,
): Promise<void> {
  const logoSrc = await loadNavbarLogoDataUrl();
  const templateData = buildTemplateData(po, raw, logoSrc);
  await openEditablePdfPreview({
    title: "Purchase Order PDF Preview",
    initialData: templateData as unknown as Record<string, unknown>,
    renderHtml: (edited) =>
      buildPurchaseOrderPdfHtml(edited as unknown as POPdfTemplateData),
    printButtonLabel: "Download PO PDF",
    outputFileName: `${sanitizePdfFileName(po.poNumber, "PO")}.pdf`,
  });
}
