"use client";

import {
  buildTaxInvoiceHtml,
  mapDispatchToTaxInvoice,
  loadQrDataUrl,
  type TaxInvoiceViewModel,
} from "../tax-invoice-pdf/taxInvoicePdf";
import {
  asText,
  formatDate,
  toNumber,
  openEditablePdfPreview,
  loadNavbarLogoDataUrl,
  sanitizePdfFileName,
} from "@/lib/pdf/paramverse";

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stateCodeFromGstin(gstin: string): string {
  const digits = String(gstin || "").replace(/\s/g, "");
  if (digits.length >= 2 && /^\d{2}/.test(digits)) return digits.slice(0, 2);
  return "27";
}

function warehouseBranchCode(wh: Record<string, unknown>): string {
  const code = asText(wh.warehouse_code, "");
  if (code && code !== "-") return code;
  const sr = toNumber(wh.sr_no);
  if (sr > 0) return `WH-${String(sr).padStart(3, "0")}`;
  return "";
}

function partyFromWarehouse(
  wh: Record<string, unknown>,
  fallbackName = "—",
): { name: string; lines: string[] } {
  const contact = Array.isArray(wh.contacts)
    ? readRecord((wh.contacts as unknown[])[0])
    : {};
  const name = asText(
    wh.registered_legal_name || wh.warehouse_name || fallbackName,
    fallbackName,
  );
  const address =
    asText(wh.address ?? wh.address_1 ?? wh.registered_gst_address, "") ||
    [asText(wh.address, ""), asText(wh.address_1, "")].filter(Boolean).join(", ");
  const cityStatePin = [
    asText(wh.city || wh.town || wh.district, ""),
    asText(wh.state, ""),
    asText(wh.pincode, "") ? `– ${asText(wh.pincode, "")}` : "",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(", –", " –");
  const gstin = asText(wh.gst_number || wh.gstin, "");
  const stateCode = stateCodeFromGstin(gstin);
  const mobile = asText(
    contact.mobile || contact.phone || wh.mobile || wh.phone,
    "",
  );
  const branchCode = warehouseBranchCode(wh);

  const lines: string[] = [];
  if (address) lines.push(address);
  if (cityStatePin) lines.push(cityStatePin);
  if (gstin) lines.push(`GSTIN ${gstin}   State Code ${stateCode}`);
  if (mobile) lines.push(`Mobile ${mobile}`);
  if (branchCode) lines.push(`Branch Code: ${branchCode}`);

  return { name, lines };
}

/**
 * Map dispatch (stock_transfer) → Tax Invoice view-model shape used by the
 * shared Paramverse invoice layout, with Transferring / Receiving branches.
 */
export function mapDispatchToStockTransfer(
  dispatch: any,
  stockTransfer?: Record<string, unknown> | null,
): TaxInvoiceViewModel {
  const st = {
    ...readRecord(dispatch?.stock_transfer),
    ...readRecord(stockTransfer),
  };
  const fromWh = readRecord(
    st.from_warehouse || dispatch?.warehouse || dispatch?.source_warehouse,
  );
  const toWh = readRecord(st.to_warehouse || dispatch?.target_warehouse);

  // Seed sales-order-like meta so transfer no/date populate SO fields on the PDF
  const pseudoSo = {
    so_number: asText(st.transfer_no || dispatch?.source_document_no, ""),
    order_date: st.transfer_date || dispatch?.dispatch_date,
    customer_po_number: "—",
    customer_po_date: "",
    sales_person_name: asText(
      pickName(st) || pickName(readRecord(dispatch?.requested_by_user)),
      "—",
    ),
  };

  // Patch dispatch so tax interstate logic uses from/to warehouse states
  const fromForTax = Object.keys(fromWh).length
    ? fromWh
    : readRecord(dispatch?.warehouse);
  const patchedDispatch = {
    ...dispatch,
    warehouse: {
      ...readRecord(dispatch?.warehouse),
      ...fromForTax,
    },
    customer: {
      customer_name: asText(toWh.warehouse_name, "Receiving Branch"),
      city: toWh.city || toWh.town,
      state: toWh.state,
      gstin_no: toWh.gst_number || toWh.gstin,
      pincode: toWh.pincode,
    },
    bill_to: {
      city: toWh.city || toWh.town,
      state: toWh.state,
      gstin: toWh.gst_number || toWh.gstin,
      pincode: toWh.pincode,
      address: toWh.address || toWh.address_1,
    },
    ship_to: {
      city: toWh.city || toWh.town,
      state: toWh.state,
      gstin: toWh.gst_number || toWh.gstin,
      pincode: toWh.pincode,
      address: toWh.address || toWh.address_1,
    },
  };

  const base = mapDispatchToTaxInvoice(patchedDispatch, pseudoSo);

  const transferring = partyFromWarehouse(
    Object.keys(fromWh).length ? fromWh : readRecord(dispatch?.warehouse),
    asText(dispatch?.warehouse?.warehouse_name, "Transferring Branch"),
  );
  const receiving = partyFromWarehouse(
    toWh,
    asText(toWh.warehouse_name, "Receiving Branch"),
  );

  const receivingGstin = asText(toWh.gst_number || toWh.gstin, "");
  const placeOfSupply = [
    asText(toWh.city || toWh.town || toWh.district, ""),
    asText(toWh.state, ""),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ...base,
    copyLabel: "Duplicate for Warehouse",
    invoiceNo: asText(
      dispatch?.sales_invoice?.invoice_number ||
        dispatch?.challan_number ||
        dispatch?.dispatch_number ||
        st.transfer_no,
      "Assigned on download",
    ),
    invoiceDate: formatDate(
      dispatch?.dispatch_date || st.transfer_date || dispatch?.created_at,
    ),
    customerPoNo: "—",
    customerPoDate: "—",
    salesOrderNo: asText(
      st.transfer_no || dispatch?.source_document_no,
      "—",
    ),
    salesOrderDate: formatDate(st.transfer_date || dispatch?.dispatch_date),
    placeOfSupply: placeOfSupply || base.placeOfSupply,
    stateCode: receivingGstin
      ? stateCodeFromGstin(receivingGstin)
      : base.stateCode,
    billFrom: transferring,
    billTo: receiving,
    shipTo: receiving,
  };
}

function pickName(raw: Record<string, unknown>): string {
  return asText(
    raw.full_name ||
      raw.name ||
      [asText(raw.first_name, ""), asText(raw.last_name, "")]
        .filter(Boolean)
        .join(" "),
    "",
  );
}

export function buildStockTransferHtml(data: TaxInvoiceViewModel): string {
  return buildTaxInvoiceHtml(data, {
    docTitle: "STOCK TRANSFER",
    partyMode: "branches",
  });
}

export async function openEditableStockTransferPreview(
  data: TaxInvoiceViewModel,
): Promise<void> {
  const logoSrc = data.logoSrc || (await loadNavbarLogoDataUrl());
  // Embed QR as data URL so Puppeteer PDF keeps it (external image URLs often fail)
  const qrSeed =
    asText(data.irn, "") !== "—" && asText(data.irn, "")
      ? data.irn
      : asText(
          data.invoiceNo || data.salesOrderNo,
          "STOCK-TRANSFER",
        );
  const qrDataUrl = data.qrDataUrl || (await loadQrDataUrl(qrSeed));
  await openEditablePdfPreview({
    title: "Stock Transfer PDF Preview",
    initialData: { ...data, logoSrc, qrDataUrl } as unknown as Record<
      string,
      unknown
    >,
    renderHtml: (edited) =>
      buildStockTransferHtml(edited as unknown as TaxInvoiceViewModel),
    printButtonLabel: "Download Stock Transfer PDF",
    outputFileName: `${sanitizePdfFileName(data.invoiceNo || data.salesOrderNo, "STOCK_TRANSFER")}.pdf`,
  });
}

/** Convenience: map + open in one call (optional ST detail override). */
export async function downloadStockTransferPdfFromDispatch(
  dispatch: any,
  stockTransfer?: Record<string, unknown> | null,
): Promise<void> {
  const mapped = mapDispatchToStockTransfer(dispatch, stockTransfer);
  await openEditableStockTransferPreview(mapped);
}
