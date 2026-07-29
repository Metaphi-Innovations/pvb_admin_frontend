"use client";

import type { PurchaseOrder } from "../po-data";
import { buildPurchaseOrderPdfHtml, type POPdfTemplateData } from "./poPdfTemplate";
import {
  asText,
  formatDate,
  sanitizePdfFileName,
  toNumber,
} from "./poPdfFormatters";

/** Same logo used in TopNavbar. */
const NAVBAR_LOGO_PATH = "/images/dharitri%20sutra.png";

/** Exact company header from the reference PO PDF. */
const COMPANY_HEADER = {
  companyName: "PARAMVERSE BIO PRIVATE LIMITED",
  companyAddress:
    "402, 4th Floor, Omega Tower, Hiranandani Link Road, Hiranandani Gardens, Opp. Colgate Palmolive, Mumbai – 400076, Maharashtra",
  companyMetaLine:
    "GSTIN: 27AAQCP4960M1ZL PAN: AAQCP4960M CIN: U46201MH2025PTC463792",
  companyContactLine:
    "Ph: 022-41276000/01/02/03 Email: info@paramverse.com Web: www.paramversebio.com",
  signatoryCompany: "PARAMVERSE BIO PVT. LTD.",
};

export function openPurchaseOrderPdfWindow(): Window | null {
  if (typeof window === "undefined") return null;
  const popup = window.open("", "_blank");
  if (popup?.document) {
    popup.document.write(
      "<!doctype html><html><head><title>Generating PDF...</title></head><body style='font-family:Arial,sans-serif;padding:12px'>Preparing purchase order PDF...</body></html>",
    );
    popup.document.close();
  }
  return popup;
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

async function loadNavbarLogoDataUrl(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const response = await fetch(NAVBAR_LOGO_PATH);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return `${window.location.origin}${NAVBAR_LOGO_PATH}`;
  }
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

function buildTransactionType(raw: Record<string, unknown>): string {
  const explicit = pick(raw, ["transaction_type", "tax_supply_type"]);
  if (explicit) return asText(explicit);
  const supplier = readRecord(raw.supplier);
  const supplierSnapshot = readRecord(raw.supplier_snapshot);
  const supplierState =
    asText(pick(supplier, ["state", "state_name"]), "") ||
    asText(pick(supplierSnapshot, ["state", "state_name"]), "");
  const poState = asText(raw.state, "");
  if (!supplierState || !poState) return "-";
  return supplierState.toLowerCase() === poState.toLowerCase()
    ? "Intra-State (CGST+SGST)"
    : "Inter-State (IGST)";
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

  const deliveryLocation = asText(
    pick(warehouse, ["warehouse_name"]) ?? po.warehouseName ?? po.shipping.shipToLocation,
  );
  const deliveryLines = [
    deliveryLocation,
    `Branch: ${asText(po.shipping.branch || po.state)}`,
    asText(po.deliveryAddress || po.shipping.address),
    `GSTIN ${asText(pick(company, ["gstin", "gst_number"]) ?? po.billing.gstNumber)}  State Code ${asText(pick(company, ["state_code"]) ?? po.state)}`,
    `Contact ${asText(po.shipping.contactPerson)}  Mobile ${asText(po.shipping.contactNumber)}`,
    asText(po.shipping.contactPerson) !== "-" || asText(po.shipping.contactNumber) !== "-"
      ? `Email ${asText(pick(warehouse, ["email"]) ?? pick(company, ["email"]))}`
      : `Email ${asText(pick(company, ["email"]))}`,
  ];

  const products = Array.isArray(raw.products) ? raw.products : [];
  const lineRows = po.lines.map((line, index) => {
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
      gstAmount: toNumber(line.taxAmount),
      total: toNumber(line.netAmount),
    };
  });

  const summary = po.summary;
  const termsLines = splitLines(pick(raw, ["terms_and_conditions", "terms"]));
  const fallbackTerms = splitLines(po.terms.map((term) => term.content));
  const specialInstructionLines = splitLines(
    pick(raw, ["special_instructions", "instructions"]) ??
      (po.notes ? po.notes : undefined),
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
    fileTitle: sanitizePdfFileName(po.poNumber),
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
    deliveryLocation,
    buyer: asText(
      pick(raw, ["buyer_name", "created_by_name"]) ?? po.createdBy,
    ),
    department: asText(
      pick(raw, ["department", "department_name"]) || "Procurement & Logistics",
    ),
    currency: asText(po.currency || "INR"),
    paymentTerms: buildPaymentTerms(po),
    transactionType: buildTransactionType(raw),
    supplierBlockLines: supplierLines,
    deliveryBlockLines: deliveryLines,
    lines: lineRows,
    summary: {
      grossAmount: toNumber(summary.grossAmount),
      itemDiscount: toNumber(summary.totalDiscount),
      additionalDiscount: 0,
      freight: 0,
      otherCharges: toNumber(summary.additionalChargesTotal),
      taxableValue: toNumber(summary.taxableValue),
      cgst: toNumber(summary.totalCgst),
      sgst: toNumber(summary.totalSgst),
      igst: toNumber(summary.totalIgst),
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
  openedWindow?: Window | null,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF download is only supported in browser.");
  }

  const logoSrc = await loadNavbarLogoDataUrl();
  const templateData = buildTemplateData(po, raw, logoSrc);
  const html = buildPurchaseOrderPdfHtml(templateData);
  const printWindow = openedWindow ?? openPurchaseOrderPdfWindow();

  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups and try again.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = templateData.fileTitle;

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  // Wait briefly so embedded logo paints before print dialog.
  window.setTimeout(triggerPrint, 250);
}
