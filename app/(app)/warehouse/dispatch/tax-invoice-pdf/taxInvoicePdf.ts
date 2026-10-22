"use client";

import {
  PARAMVERSE_COMPANY,
  asText,
  buildParamversePdfDocument,
  escapeHtml,
  escapeSrcAttr,
  formatAmountInWords,
  formatCurrency,
  formatDate,
  formatNumber,
  loadNavbarLogoDataUrl,
  openEditablePdfPreview,
  renderParamverseFooter,
  renderParamverseSignatory,
  renderPdfTable,
  renderSummaryRows,
  sanitizePdfFileName,
  toNumber,
  type PdfTableColumn,
  type PdfTableRow,
} from "@/lib/pdf/paramverse";

interface PdfPartyBlock {
  name: string;
  lines: string[];
}

const DEFAULT_TI_DECLARATION =
  "Goods once sold will not be taken back or exchanged. All disputes subject to Aurangabad jurisdiction only. We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";

export interface TaxInvoiceBankDetails {
  accountName: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
}

/** Empty placeholders only — never invent bank account numbers on PDFs. */
const DEFAULT_BANK: TaxInvoiceBankDetails = {
  accountName: "—",
  bankName: "—",
  accountNo: "—",
  ifsc: "—",
  branch: "—",
};

export interface TaxInvoiceLineItem {
  sr: number;
  productCode: string;
  productName: string;
  batchLine: string;
  sku: string;
  hsnCode: string;
  qtyInCase: number;
  totalUnits: number;
  totalQty: number;
  uom: string;
  rate: number;
  grossAmt: number;
  discPct: number;
  discAmt: number;
  taxableValue: number;
  gstPct: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  interstate: boolean;
}

export interface TaxInvoiceHsnSummaryRow {
  hsnCode: string;
  taxableValue: number;
  gstPct: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface TaxInvoiceViewModel {
  logoSrc?: string;
  companyName: string;
  companyAddress: string;
  companyMetaLine: string;
  companyContactLine: string;
  signatoryCompany: string;
  copyLabel: string;
  invoiceNo: string;
  invoiceDate: string;
  customerPoNo: string;
  customerPoDate: string;
  salesOrderNo: string;
  salesOrderDate: string;
  salesPerson: string;
  dispatchThrough: string;
  vehicleNo: string;
  placeOfSupply: string;
  stateCode: string;
  transportDocNo: string;
  transportDocDate: string;
  eInvoiceNo: string;
  acknowledgementNo: string;
  acknowledgementDate: string;
  ewayBillNo: string;
  ewayBillExpiry: string;
  irn: string;
  qrDataUrl?: string;
  billFrom: PdfPartyBlock;
  billTo: PdfPartyBlock;
  shipTo: PdfPartyBlock;
  lines: TaxInvoiceLineItem[];
  hsnSummary: TaxInvoiceHsnSummaryRow[];
  bank: TaxInvoiceBankDetails;
  /** From sales_invoice.narration, fallback remarks. Empty when absent. */
  narration: string;
  terms: string;
  summary: {
    grossAmount: number;
    discount: number;
    additionalCharges: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    roundOff: number;
    grandTotal: number;
  };
  amountInWords: string;
  interstate: boolean;
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

function resolveWeightUom(baseUnit: string): "Kg" | "Ltr" | "" {
  const u = baseUnit.trim().toLowerCase();
  if (u === "kg" || u === "gms" || u === "g" || u === "gram" || u === "grams") {
    return "Kg";
  }
  if (u === "ltr" || u === "l" || u === "ml" || u === "litre" || u === "liter") {
    return "Ltr";
  }
  return "";
}

function resolveNetWeightPerCase(
  snapshot: Record<string, unknown>,
  product: Record<string, unknown>,
  baseUnit: string,
): number {
  const stored = toNumber(
    pick(snapshot, ["net_weight", "netWeight"]) ??
      pick(product, ["net_weight", "netWeight"]),
  );
  if (stored > 0) return stored;

  const packSize = toNumber(
    pick(snapshot, ["pack_size", "packSize"]) ??
      pick(product, ["pack_size", "packSize"]),
  );
  const unitPerPacking = toNumber(
    pick(snapshot, ["unit_per_packing", "unitPerPacking"]) ??
      pick(product, ["unit_per_packing", "unitPerPacking"]),
  );
  if (!(packSize > 0) || !(unitPerPacking > 0)) return 0;

  const raw = packSize * unitPerPacking;
  const u = baseUnit.trim().toLowerCase();
  if (u === "gms" || u === "g" || u === "gram" || u === "grams" || u === "ml") {
    return raw / 1000;
  }
  if (u === "kg" || u === "ltr" || u === "l" || u === "litre" || u === "liter") {
    return raw;
  }
  return 0;
}

function formatDisplayDate(value: unknown): string {
  return formatDate(value);
}

function stateCodeFromGstin(gstin: string): string {
  const digits = String(gstin || "").replace(/\s/g, "");
  if (digits.length >= 2 && /^\d{2}/.test(digits)) return digits.slice(0, 2);
  return "";
}

function partyFromRaw(
  name: string,
  raw: Record<string, unknown>,
  fallbacks: Record<string, unknown> = {},
): PdfPartyBlock {
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
  const gstin = asText(
    raw.gstin ?? raw.gstin_no ?? raw.gst_number ?? raw.gstin_number ?? fallbacks.gstin,
    "",
  );
  const pan = asText(
    raw.pan ?? raw.pan_no ?? raw.pan_number ?? fallbacks.pan,
    "",
  );
  const stateCode = stateCodeFromGstin(gstin);
  const mobile = asText(raw.mobile ?? raw.mobile_no ?? fallbacks.mobile, "");
  const email = asText(raw.email ?? fallbacks.email, "");

  const lines: string[] = [];
  if (address) lines.push(address);
  if (cityStatePin) lines.push(cityStatePin);
  const taxIds = [
    gstin ? `GSTIN : ${gstin}` : "",
    stateCode ? `State Code : ${stateCode}` : "",
    pan ? `PAN : ${pan}` : "",
  ].filter(Boolean);
  if (taxIds.length) lines.push(taxIds.join("; "));
  if (mobile || email) {
    lines.push(
      [mobile ? `Mobile : ${mobile}` : "", email ? `Email : ${email}` : ""]
        .filter(Boolean)
        .join("; "),
    );
  }
  return { name: asText(name, "—"), lines };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function deriveSiFallbackFromDispatch(dispatch: any): string {
  const rawDispatchNo = asText(
    dispatch?.dispatch_number || dispatch?.dispatch_no || dispatch?.dispatchNumber,
    "",
  );
  const rawChallanNo = asText(
    dispatch?.challan_number || dispatch?.challanNumber,
    "",
  );
  const rawNo = rawDispatchNo || rawChallanNo;
  if (!rawNo || rawNo === "—") return "";
  if (/^DSP\//i.test(rawNo)) {
    return rawNo.replace(/^DSP\//i, "SI/");
  }
  if (/^DC\//i.test(rawNo)) {
    return rawNo.replace(/^DC\//i, "SI/");
  }
  return rawNo;
}

export function mapDispatchToTaxInvoice(
  dispatch: any,
  salesOrder?: Record<string, unknown> | null,
  invoiceNoOverride?: string | null,
): TaxInvoiceViewModel {
  const warehouse = readRecord(dispatch?.warehouse);
  const customer = readRecord(dispatch?.customer);
  const snapshot = readRecord(dispatch?.customer_snapshot);
  const billTo = readRecord(dispatch?.bill_to);
  const shipTo = readRecord(dispatch?.ship_to);
  const so = readRecord(salesOrder);

  const customerName = asText(
    customer.customer_name ??
      dispatch?.customer_name ??
      snapshot.customer_name,
    "—",
  );

  const placeOfSupply = [
    asText(shipTo.city || snapshot.city || customer.city, ""),
    asText(shipTo.state || snapshot.state || customer.state, ""),
  ]
    .filter(Boolean)
    .join(", ");

  const customerGstin = asText(
    billTo.gstin || customer.gstin_no || snapshot.gstin_no,
    "",
  );
  const warehouseState = asText(warehouse.state, "");
  const customerState = asText(
    shipTo.state || billTo.state || customer.state || snapshot.state,
    "",
  );
  const interstate =
    warehouseState.toLowerCase() !== customerState.toLowerCase() ||
    toNumber(pick(readRecord((dispatch?.items || [])[0]), ["igst_percentage", "igst_amount"])) >
      0;

  const salesInvoice = readRecord(
    dispatch?.sales_invoice ??
      (Array.isArray(dispatch?.sales_invoices) ? dispatch.sales_invoices[0] : null),
  );

  const items = (dispatch?.items || dispatch?.products || []) as any[];
  const lines: TaxInvoiceLineItem[] = items.map((item, index) => {
    const product = readRecord(item.product);
    const productSnapshot = readRecord(item.product_snapshot);
    const batchSnap = readRecord(
      item.batch_snapshot ??
        item.inventory_batch ??
        item.packing_done_product?.batch_snapshot ??
        item.packing_done_product?.packing_list_product?.batch_snapshot,
    );
    const hsnObj = readRecord(product.hsn ?? productSnapshot.hsn);

    const totalUnits = toNumber(item.dispatched_base_qty ?? item.dispatchQty);
    // Prefer true units-per-case fields over pack_size (SKU size).
    const packingUnits = Math.max(
      1,
      toNumber(
        product.unit_per_packing ??
          productSnapshot.unit_per_packing ??
          productSnapshot.unitPerPacking ??
          1,
      ),
    );
    const qtyInCase =
      packingUnits > 1 ? totalUnits / packingUnits : totalUnits;
    const baseUnit = asText(
      product.unit ||
        product.mou ||
        productSnapshot.unit ||
        productSnapshot.mou ||
        item.quantity_type ||
        "Units",
      "Units",
    );
    const weightUom = resolveWeightUom(baseUnit);
    const netWeightPerCase = resolveNetWeightPerCase(
      productSnapshot,
      product,
      baseUnit,
    );
    const totalQtyKgLtr =
      qtyInCase > 0 && netWeightPerCase > 0
        ? Math.round((qtyInCase * netWeightPerCase + Number.EPSILON) * 1000) / 1000
        : 0;
    const displayTotalQty = totalQtyKgLtr > 0 ? totalQtyKgLtr : 0;
    const displayUom =
      weightUom || (displayTotalQty > 0 ? "Kg" : "—");
    const rate = toNumber(item.unit_price ?? item.unit_rate ?? product.unit_price);
    const grossAmt = round2(totalUnits * rate);
    const discPct = toNumber(item.discount_percentage);
    const discAmt =
      toNumber(item.discount_amount) ||
      round2((grossAmt * discPct) / 100);
    const taxableValue = round2(grossAmt - discAmt);

    const cgstPct = toNumber(item.cgst_percentage);
    const sgstPct = toNumber(item.sgst_percentage);
    const igstPct = toNumber(item.igst_percentage);
    const gstPct =
      toNumber(item.gst_percentage) ||
      (igstPct > 0 ? igstPct : cgstPct + sgstPct);

    let cgst = toNumber(item.cgst_amount);
    let sgst = toNumber(item.sgst_amount);
    let igst = toNumber(item.igst_amount);
    if (!cgst && !sgst && !igst && gstPct > 0) {
      const tax = round2((taxableValue * gstPct) / 100);
      if (interstate || igstPct > 0) {
        igst = tax;
      } else {
        cgst = round2(tax / 2);
        sgst = round2(tax - cgst);
      }
    }

    const total = round2(taxableValue + cgst + sgst + igst);
    const batchNo = asText(
      item.inventory_batch?.batch_no ??
        item.batch_code ??
        pick(batchSnap, ["batch_no", "batch_code", "batch_number"]),
      "",
    );
    const mfg = formatDisplayDate(
      pick(
        {
          ...batchSnap,
          ...readRecord(item.inventory_batch),
          ...readRecord(item.dispatch_product),
          ...readRecord(item.packing_done_product),
          ...readRecord(item.packing_done_product?.packing_list_product),
          ...item,
        },
        [
          "mfg_date",
          "manufacture_date",
          "manufacturing_date",
          "mfgDate",
          "manufactureDate",
          "manufacturingDate",
        ],
      ),
    );
    const exp = formatDisplayDate(
      pick(
        {
          ...batchSnap,
          ...readRecord(item.inventory_batch),
          ...item,
        },
        ["expiry_date", "expiryDate", "exp_date", "expDate", "expiry", "batchExpiryDate"],
      ),
    );
    const batchParts = [
      batchNo ? `Batch No.: ${batchNo}` : "",
      mfg !== "-" ? `Mfg. Date: ${mfg}` : "",
      exp !== "-" ? `Expiry Date: ${exp}` : "",
    ].filter(Boolean);

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
      batchLine: batchParts.join(" | "),
      sku: asText(
        product.sku ?? productSnapshot.sku,
        "—",
      ),
      hsnCode: asText(
        hsnObj.hsnCode ||
          productSnapshot.hsn_code ||
          productSnapshot.hsnCode ||
          "",
        "",
      ),
      qtyInCase,
      totalUnits,
      totalQty: displayTotalQty,
      uom: displayUom,
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
  });

  const invoiceCharges = Array.isArray(salesInvoice.additional_charges)
    ? (salesInvoice.additional_charges as unknown[])
    : [];
  for (const rawCharge of invoiceCharges) {
    const charge = readRecord(rawCharge);
    const gstPct =
      toNumber(charge.gst_rate) ||
      toNumber(charge.igst_rate) ||
      toNumber(charge.cgst_rate) + toNumber(charge.sgst_rate);
    lines.push({
      sr: lines.length + 1,
      productCode: "—",
      productName: asText(charge.charge_name, "Additional Charge"),
      batchLine: "",
      sku: "—",
      hsnCode: asText(
        pick(readRecord(charge.hsn_snapshot), ["hsn_code"]) ||
          pick(readRecord(charge.additional_charge_snapshot), ["hsn_sac_code"]),
        "",
      ),
      qtyInCase: 0,
      totalUnits: 1,
      totalQty: 1,
      uom: "—",
      rate: toNumber(charge.amount),
      grossAmt: round2(toNumber(charge.amount)),
      discPct: 0,
      discAmt: 0,
      taxableValue: toNumber(charge.taxable_amount),
      gstPct,
      cgst: toNumber(charge.cgst_amount),
      sgst: toNumber(charge.sgst_amount),
      igst: toNumber(charge.igst_amount),
      total: toNumber(charge.total_amount),
      interstate: interstate || toNumber(charge.igst_amount) > 0,
    });
  }

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

  const linesGross = round2(lines.reduce((s, l) => s + l.grossAmt, 0));
  const linesDiscount = round2(lines.reduce((s, l) => s + l.discAmt, 0));
  const linesTaxable = round2(lines.reduce((s, l) => s + l.taxableValue, 0));
  const linesCgst = round2(lines.reduce((s, l) => s + l.cgst, 0));
  const linesSgst = round2(lines.reduce((s, l) => s + l.sgst, 0));
  const linesIgst = round2(lines.reduce((s, l) => s + l.igst, 0));
  const linesTax = round2(linesCgst + linesSgst + linesIgst);
  const additionalChargesFromRows = round2(
    invoiceCharges.reduce((sum: number, rawCharge) => {
      const charge = readRecord(rawCharge);
      return sum + toNumber(charge.amount);
    }, 0),
  );

  // Prefer posted sales-invoice totals when present so PDF matches Accounts.
  const grossAmount =
    toNumber(salesInvoice.gross_amount) || linesGross;
  const discount =
    toNumber(salesInvoice.product_discount_amount) || linesDiscount;
  const additionalCharges =
    toNumber(salesInvoice.additional_charge_amount) || additionalChargesFromRows;
  const taxableValue =
    toNumber(salesInvoice.taxable_amount) || linesTaxable;
  const cgst = toNumber(salesInvoice.cgst_amount) || linesCgst;
  const sgst = toNumber(salesInvoice.sgst_amount) || linesSgst;
  const igst = toNumber(salesInvoice.igst_amount) || linesIgst;
  const totalTax =
    toNumber(salesInvoice.gst_amount) || round2(cgst + sgst + igst) || linesTax;
  const hasInvoiceTotals =
    toNumber(salesInvoice.invoice_amount) > 0 ||
    Object.prototype.hasOwnProperty.call(salesInvoice, "round_off_amount");
  const derivedBeforeRound = round2(taxableValue + totalTax);
  const derivedGrand = Math.round(derivedBeforeRound);
  const grandTotal = hasInvoiceTotals
    ? toNumber(salesInvoice.invoice_amount) || derivedGrand
    : derivedGrand;
  const roundOff = hasInvoiceTotals
    ? toNumber(salesInvoice.round_off_amount)
    : round2(derivedGrand - derivedBeforeRound);

  const warehouseName = asText(warehouse.warehouse_name, "—");
  const billFrom = partyFromRaw(warehouseName, warehouse, {
    address: [asText(warehouse.address, ""), asText(warehouse.address_1, "")]
      .filter(Boolean)
      .join(", "),
    city: warehouse.city,
    state: warehouse.state,
    pincode: warehouse.pincode,
    gstin: asText(warehouse.gst_number ?? warehouse.gstin, ""),
    mobile: warehouse.mobile || warehouse.phone,
    email: warehouse.email,
  });

  const billing = partyFromRaw(customerName, billTo, {
    ...snapshot,
    ...customer,
    gstin: customerGstin,
  });
  const shipping = partyFromRaw(customerName, shipTo, {
    ...snapshot,
    ...customer,
    gstin: shipTo.gstin || customerGstin,
  });

  const derivedSiNo = deriveSiFallbackFromDispatch(dispatch);
  const invoiceNo = asText(
    invoiceNoOverride ||
    dispatch?.sales_invoice?.invoice_no ||
      dispatch?.sales_invoices?.[0]?.invoice_no ||
      dispatch?.sales_invoice?.invoice_number ||
      dispatch?.sales_invoices?.[0]?.invoice_number ||
      derivedSiNo ||
      dispatch?.challan_number ||
      dispatch?.challanNumber,
    "Assigned on download",
  );

  return {
    ...PARAMVERSE_COMPANY,
    logoSrc: undefined,
    copyLabel: "Duplicate for Warehouse",
    invoiceNo,
    invoiceDate: formatDisplayDate(
      dispatch?.dispatch_date || dispatch?.created_at,
    ),
    customerPoNo: asText(
      pick(so, ["customer_po_number", "customer_po_no", "po_number", "reference_number"]),
      "—",
    ),
    customerPoDate: formatDisplayDate(
      pick(so, ["customer_po_date", "po_date"]),
    ),
    salesOrderNo: asText(
      dispatch?.source_document_no ||
        so.so_number ||
        dispatch?.salesOrderNumber,
    ),
    salesOrderDate: formatDisplayDate(
      so.order_date || so.so_date || so.created_at,
    ),
    salesPerson: asText(
      pick(so, ["sales_person_name", "tm_name", "created_by_name"]) ??
        pick(readRecord(so.created_by_user), ["full_name", "name", "user_name"]),
      "—",
    ),
    dispatchThrough: asText(dispatch?.transporter, "—"),
    vehicleNo: asText(dispatch?.vehicle_number || dispatch?.vehicleNumber, "—"),
    placeOfSupply: placeOfSupply || "—",
    stateCode: stateCodeFromGstin(customerGstin),
    transportDocNo: asText(dispatch?.lr_number || dispatch?.lrNumber, "—"),
    transportDocDate: formatDisplayDate(dispatch?.dispatch_date),
    eInvoiceNo: asText(
      dispatch?.sales_invoice?.acknowledgement_number ||
        dispatch?.e_invoice_no,
      "—",
    ),
    acknowledgementNo: asText(
      dispatch?.sales_invoice?.acknowledgement_number ||
        dispatch?.acknowledgement_no,
      "—",
    ),
    acknowledgementDate: asText(
      dispatch?.sales_invoice?.acknowledgement_date ||
        dispatch?.acknowledgement_date,
      "—",
    ),
    ewayBillNo: asText(
      dispatch?.sales_invoice?.eway_bill_number || dispatch?.eway_bill_number,
      "—",
    ),
    ewayBillExpiry: asText(
      dispatch?.sales_invoice?.eway_bill_valid_upto ||
        dispatch?.eway_bill_expiry ||
        dispatch?.eway_bill_date,
      "—",
    ),
    irn: asText(
      dispatch?.sales_invoice?.irn_number || dispatch?.irn,
      "—",
    ),
    billFrom,
    billTo: billing,
    shipTo: shipping,
    lines,
    hsnSummary: Array.from(hsnMap.values()),
    bank: {
      accountName: asText(warehouse.account_holder_name, DEFAULT_BANK.accountName),
      bankName: asText(warehouse.bank_name, DEFAULT_BANK.bankName),
      accountNo: asText(warehouse.account_number, DEFAULT_BANK.accountNo),
      ifsc: asText(warehouse.ifsc_code, DEFAULT_BANK.ifsc),
      branch: asText(warehouse.branch_name, DEFAULT_BANK.branch),
    },
    narration: (() => {
      const fromNarration = String(salesInvoice.narration ?? "").trim();
      if (fromNarration) return fromNarration;
      return String(
        salesInvoice.remarks ??
          dispatch?.remarks ??
          dispatch?.narration ??
          "",
      ).trim();
    })(),
    terms: DEFAULT_TI_DECLARATION,
    summary: {
      grossAmount,
      discount,
      additionalCharges,
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

function pctLabel(value: number): string {
  return `${toNumber(value).toFixed(2)}%`;
}

function blankCell(): string {
  return "\u00A0";
}

function metaFieldHtml(
  label: string,
  value: string,
  opts?: { dotted?: boolean; wide?: boolean },
): string {
  const raw = String(value ?? "").trim();
  const empty = !raw || raw === "-" || raw === "—";
  const dotted = Boolean(opts?.dotted);
  const display = dotted && empty ? "" : escapeHtml(asText(value, "—"));
  return `<div class="ti-field${opts?.wide ? " wide" : ""}">
    <div class="ti-lbl">${escapeHtml(label)}</div>
    <div class="ti-val${dotted && empty ? " dotted" : ""}">${display || "&nbsp;"}</div>
  </div>`;
}

function partyBoxHtml(title: string, party: { name: string; lines: string[] }): string {
  return `<div class="ti-party">
    <div class="ti-party-h">${escapeHtml(title)}</div>
    <div class="ti-party-b">
      <p class="name">${escapeHtml(party.name)}</p>
      ${(party.lines || []).map((l) => `<p>${escapeHtml(l)}</p>`).join("")}
    </div>
  </div>`;
}

function companyMetaHtml(data: TaxInvoiceViewModel): string {
  const meta = [
    ["GSTIN", (data.companyMetaLine || PARAMVERSE_COMPANY.companyMetaLine).match(/GSTIN:\s*([^\s]+)/i)?.[1] || ""],
    ["PAN", (data.companyMetaLine || PARAMVERSE_COMPANY.companyMetaLine).match(/PAN:\s*([^\s]+)/i)?.[1] || ""],
    ["CIN", (data.companyMetaLine || PARAMVERSE_COMPANY.companyMetaLine).match(/CIN:\s*([^\s]+)/i)?.[1] || ""],
  ];
  const contact = [
    ["Ph", (data.companyContactLine || PARAMVERSE_COMPANY.companyContactLine).match(/Ph:\s*([^\s]+)/i)?.[1] || ""],
    ["Email", (data.companyContactLine || PARAMVERSE_COMPANY.companyContactLine).match(/Email:\s*([^\s]+)/i)?.[1] || ""],
    ["Web", (data.companyContactLine || PARAMVERSE_COMPANY.companyContactLine).match(/Web:\s*([^\s]+)/i)?.[1] || ""],
  ];
  const parts = [...meta, ...contact]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<span class="ti-meta-pair"><span class="k">${escapeHtml(k)}:</span> <strong>${escapeHtml(v)}</strong></span>`,
    )
    .join(" &nbsp; ");
  return parts;
}

function buildItemsTotalsRowHtml(options: {
  totalCases: number;
  totalUnits: number;
  totalQty: number;
  uom: string;
  gross: string;
  discAmt: string;
  taxable: string;
  total: string;
  /** Extra blank cell after SKU (Sales Person column on proforma). */
  salesPersonColumn?: boolean;
}): string {
  // Sr+Code (merged) | Name | SKU | [TM] | HSN | Cases | Units | Qty | Rate | Gross | Disc% | Disc Amt | Taxable | GST% | Total
  const salesPersonCell = options.salesPersonColumn ? "<td>&nbsp;</td>" : "";
  return `<tr class="pv-totals-row">
    <td colspan="2"><strong>Totals</strong></td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    ${salesPersonCell}
    <td>&nbsp;</td>
    <td class="pv-r pv-num ti-tot-qty">${escapeHtml(formatNumber(options.totalCases))}</td>
    <td class="pv-r pv-num ti-tot-qty">${escapeHtml(formatNumber(options.totalUnits))}</td>
    <td class="pv-r pv-num ti-tot-qty">${
      options.totalQty > 0
        ? `${escapeHtml(formatNumber(options.totalQty))}${options.uom ? ` ${escapeHtml(options.uom)}` : ""}`
        : "—"
    }</td>
    <td>&nbsp;</td>
    <td class="pv-r pv-num">${escapeHtml(options.gross)}</td>
    <td>&nbsp;</td>
    <td class="pv-r pv-num">${escapeHtml(options.discAmt)}</td>
    <td class="pv-r pv-num">${escapeHtml(options.taxable)}</td>
    <td>&nbsp;</td>
    <td class="pv-r pv-num"><strong>${escapeHtml(options.total)}</strong></td>
  </tr>`;
}

export function buildTaxInvoiceHtml(
  data: TaxInvoiceViewModel,
  options?: {
    docTitle?: string;
    /** bill_ship = Bill From/To/Ship To; branches = Transferring/Receiving Branch */
    partyMode?: "bill_ship" | "branches";
    /** tax_invoice (default) vs proforma (no e-invoice; sales person column; simpler meta) */
    layout?: "tax_invoice" | "proforma";
  },
): string {
  const docTitle = options?.docTitle || "SALES INVOICE";
  const partyMode = options?.partyMode || "bill_ship";
  const isProforma = options?.layout === "proforma";
  const useIgst = data.interstate || data.lines.some((l) => l.igst > 0);

  // Portrait widths: short headers + tight % so line table fits A4 (~200mm printable).
  const finalColumns: PdfTableColumn[] = isProforma
    ? [
        { key: "sr", header: "Sr", width: "2%", align: "center" },
        { key: "productCode", header: "Code", width: "5%", nowrap: true },
        { key: "productName", header: "Product", width: "13%" },
        { key: "sku", header: "SKU", width: "4%", nowrap: true },
        { key: "salesPerson", header: "TM", width: "5.5%", nowrap: true },
        { key: "hsn", header: "HSN", width: "4.5%", align: "center", nowrap: true },
        { key: "qtyCase", header: "Cases", width: "4%", numeric: true },
        { key: "totalUnits", header: "Units", width: "4.5%", numeric: true },
        { key: "totalQty", header: "Qty Kg/Ltr", width: "6%", numeric: true },
        { key: "rate", header: "Rate", width: "5.5%", numeric: true },
        { key: "gross", header: "Gross", width: "6%", numeric: true },
        { key: "discPct", header: "Disc%", width: "3.5%", numeric: true },
        { key: "discAmt", header: "Disc Amt", width: "5%", numeric: true },
        { key: "taxable", header: "Taxable", width: "6%", numeric: true },
        { key: "gstPct", header: "GST%", width: "3.5%", numeric: true },
        { key: "total", header: "Total", width: "6.5%", numeric: true },
      ]
    : [
        { key: "sr", header: "Sr", width: "2.5%", align: "center" },
        { key: "productCode", header: "Code", width: "6%", nowrap: true },
        { key: "productName", header: "Product", width: "14%" },
        { key: "sku", header: "SKU", width: "4%", nowrap: true },
        { key: "hsn", header: "HSN", width: "8%", align: "center", nowrap: true },
        { key: "qtyCase", header: "Cases", width: "5%", numeric: true },
        { key: "totalUnits", header: "Units", width: "5.5%", numeric: true },
        { key: "totalQty", header: "Qty Kg/Ltr", width: "7.5%", numeric: true },
        { key: "rate", header: "Rate", width: "7%", numeric: true },
        { key: "gross", header: "Gross", width: "8.5%", numeric: true },
        { key: "discPct", header: "Disc%", width: "4%", numeric: true },
        { key: "discAmt", header: "Disc Amt", width: "6.5%", numeric: true },
        { key: "taxable", header: "Taxable", width: "8.5%", numeric: true },
        { key: "gstPct", header: "GST%", width: "4%", numeric: true },
        { key: "total", header: "Total", width: "9%", numeric: true },
      ];

  const finalRows: PdfTableRow[] = data.lines.map((line) => {
    const isCharge = line.productCode === "—" && line.uom === "—";
    return {
      cells: {
        sr: String(line.sr),
        productCode: line.productCode,
        productName: line.productName,
        sku: line.sku,
        salesPerson: data.salesPerson,
        hsn: line.hsnCode,
        qtyCase: isCharge ? "—" : formatNumber(line.qtyInCase),
        totalUnits: isCharge ? "—" : formatNumber(line.totalUnits),
        totalQty: isCharge
          ? "—"
          : line.totalQty > 0 && line.uom && line.uom !== "—"
            ? `${formatNumber(line.totalQty)} ${line.uom}`
            : "—",
        rate: formatCurrency(line.rate),
        gross: formatCurrency(line.grossAmt),
        discPct: line.discPct ? pctLabel(line.discPct) : "—",
        discAmt: isCharge ? "—" : formatCurrency(line.discAmt),
        taxable: formatCurrency(line.taxableValue),
        gstPct: pctLabel(line.gstPct),
        total: formatCurrency(line.total),
      },
      htmlCells: {
        productName: `<div class="ti-pname">${escapeHtml(line.productName)}</div>${
          line.batchLine
            ? `<span class="sub">${escapeHtml(line.batchLine).replace(/ \| /g, "<br/>")}</span>`
            : ""
        }`,
        hsn: line.hsnCode
          ? `<span class="ti-hsn-code">${escapeHtml(line.hsnCode)}</span>`
          : "—",
        total: `<strong>${escapeHtml(formatCurrency(line.total))}</strong>`,
      },
    };
  });

  const productLines = data.lines.filter(
    (l) => l.productCode !== "—" || l.uom !== "—",
  );
  const totalCases = productLines.reduce((s, l) => s + l.qtyInCase, 0);
  const totalUnitsSum = productLines.reduce((s, l) => s + l.totalUnits, 0);
  const totalQty = productLines.reduce((s, l) => s + l.totalQty, 0);
  const uom =
    productLines.find((l) => l.totalQty > 0 && (l.uom === "Kg" || l.uom === "Ltr"))?.uom ||
    productLines.find((l) => l.uom === "Kg" || l.uom === "Ltr")?.uom ||
    (totalQty > 0 ? "Kg" : "");
  const linesGrossTotal = round2(data.lines.reduce((s, l) => s + l.grossAmt, 0));
  const linesDiscTotal = round2(data.lines.reduce((s, l) => s + l.discAmt, 0));
  const linesTaxableTotal = round2(data.lines.reduce((s, l) => s + l.taxableValue, 0));
  const linesTotal = round2(data.lines.reduce((s, l) => s + l.total, 0));
  const b = blankCell();

  const itemsTableHtml = renderPdfTable({
    columns: finalColumns,
    rows: finalRows,
  }).replace(
    "</tbody>",
    `${buildItemsTotalsRowHtml({
      totalCases,
      totalUnits: totalUnitsSum,
      totalQty,
      uom,
      gross: formatCurrency(linesGrossTotal),
      discAmt: formatCurrency(linesDiscTotal),
      taxable: formatCurrency(linesTaxableTotal),
      total: formatCurrency(linesTotal),
      salesPersonColumn: isProforma,
    })}</tbody>`,
  );

  const hsnColumns: PdfTableColumn[] = [
    { key: "hsn", header: "HSN Code", width: "14%" },
    { key: "taxable", header: "Taxable Value", width: "20%", numeric: true },
    { key: "gstPct", header: "GST %", width: "12%", align: "center", numeric: true },
    {
      key: "cgst",
      header: useIgst ? "IGST Amt" : "CGST Amt",
      width: useIgst ? "27%" : "18%",
      numeric: true,
    },
    ...(useIgst
      ? []
      : [{ key: "sgst", header: "SGST Amt", width: "18%", numeric: true } as PdfTableColumn]),
    { key: "totalTax", header: "Total Tax", width: useIgst ? "27%" : "18%", numeric: true },
  ];

  const hsnRows: PdfTableRow[] = data.hsnSummary.map((row) => ({
    cells: {
      hsn: row.hsnCode,
      taxable: formatCurrency(row.taxableValue),
      gstPct: pctLabel(row.gstPct),
      cgst: formatCurrency(useIgst ? row.igst : row.cgst),
      sgst: formatCurrency(useIgst ? 0 : row.sgst),
      totalTax: formatCurrency(row.totalTax),
    },
  }));

  const hsnFooter: PdfTableRow = {
    cells: {
      hsn: "Total",
      taxable: formatCurrency(data.summary.taxableValue),
      gstPct: b,
      cgst: formatCurrency(useIgst ? data.summary.igst : data.summary.cgst),
      sgst: formatCurrency(useIgst ? 0 : data.summary.sgst),
      totalTax: formatCurrency(data.summary.totalTax),
    },
    htmlCells: { hsn: "<strong>Total</strong>", gstPct: "&nbsp;" },
  };

  const roundOffValue =
    data.summary.roundOff === 0
      ? "—"
      : data.summary.roundOff < 0
        ? `- ${formatCurrency(Math.abs(data.summary.roundOff))}`
        : formatCurrency(data.summary.roundOff);

  const summaryRows = [
    { label: "Gross Amount / Subtotal", value: formatCurrency(data.summary.grossAmount) },
    { label: "(-) Discount", value: formatCurrency(data.summary.discount) },
    ...(Number(data.summary.additionalCharges || 0) > 0
      ? [
          {
            label: "Additional Charges",
            value: formatCurrency(data.summary.additionalCharges),
          },
        ]
      : []),
    { label: "Taxable Value", value: formatCurrency(data.summary.taxableValue) },
    ...(useIgst
      ? [{ label: "IGST", value: formatCurrency(data.summary.igst) }]
      : [
          { label: "CGST", value: formatCurrency(data.summary.cgst) },
          { label: "SGST", value: formatCurrency(data.summary.sgst) },
        ]),
    { label: "Total Tax", value: formatCurrency(data.summary.totalTax) },
    { label: "Rounding Off", value: roundOffValue },
    {
      label: "Grand Total",
      value: formatCurrency(data.summary.grandTotal),
      strong: true,
    },
  ];

  const soNoLabel =
    partyMode === "branches" ? "Stock Transfer No." : "Sales Order No.";
  const soDateLabel =
    partyMode === "branches" ? "Stock Transfer Date" : "Sales Order Date";

  const metaBlock = isProforma
    ? `
    <div class="ti-meta-row cols-4">${[
      metaFieldHtml("Proforma Invoice No.", data.invoiceNo),
      metaFieldHtml("Invoice Date", data.invoiceDate),
      metaFieldHtml("Customer PO No.", data.customerPoNo),
      metaFieldHtml("Customer PO Date", data.customerPoDate),
    ].join("")}</div>
    <div class="ti-dash"></div>
    <div class="ti-meta-row cols-4">${[
      metaFieldHtml(soNoLabel, data.salesOrderNo),
      metaFieldHtml(soDateLabel, data.salesOrderDate),
      metaFieldHtml("Place of Supply", data.placeOfSupply),
      metaFieldHtml("State Code", data.stateCode),
    ].join("")}</div>
    <div class="ti-solid"></div>
    `
    : `
    <div class="ti-meta-row cols-7">${[
      metaFieldHtml("Invoice No.", data.invoiceNo),
      metaFieldHtml("Invoice Date", data.invoiceDate),
      metaFieldHtml(
        partyMode === "branches" ? "Reference No." : "Customer PO No.",
        data.customerPoNo,
      ),
      metaFieldHtml(
        partyMode === "branches" ? "Reference Date" : "Customer PO Date",
        data.customerPoDate,
      ),
      metaFieldHtml(soNoLabel, data.salesOrderNo),
      metaFieldHtml(soDateLabel, data.salesOrderDate),
      metaFieldHtml(
        partyMode === "branches" ? "Requested By" : "Sales Person (TM)",
        data.salesPerson,
      ),
    ].join("")}</div>
    <div class="ti-dash"></div>
    <div class="ti-meta-row cols-6">${[
      metaFieldHtml("Dispatch Through", data.dispatchThrough),
      metaFieldHtml("Vehicle No.", data.vehicleNo),
      metaFieldHtml("Place of Supply", data.placeOfSupply),
      metaFieldHtml("State Code", data.stateCode),
      metaFieldHtml("Transport Doc No.", data.transportDocNo),
      metaFieldHtml("Transport Doc Date", data.transportDocDate),
    ].join("")}</div>
    <div class="ti-solid"></div>

    <div class="ti-einvoice">
      <div class="ti-einvoice-main">
        <div class="ti-einvoice-top">
          <div class="ti-meta-row cols-5">${[
            metaFieldHtml("E-Invoice No.", data.eInvoiceNo, { dotted: true }),
            metaFieldHtml("Acknowledgement No.", data.acknowledgementNo, { dotted: true }),
            metaFieldHtml("Acknowledgement Date", data.acknowledgementDate, { dotted: true }),
            metaFieldHtml("E-Way Bill No.", data.ewayBillNo, { dotted: true }),
            metaFieldHtml("E-Way Bill Expiry Date", data.ewayBillExpiry, { dotted: true }),
          ].join("")}</div>
        </div>
        <div class="ti-irn">
          ${metaFieldHtml("IRN", data.irn, { dotted: true, wide: true })}
        </div>
      </div>
    </div>
    <div class="ti-solid"></div>
    `;

  const bodyHtml = `
    <div class="ti-header">
      <div class="ti-logo">
        ${data.logoSrc ? `<img src="${escapeSrcAttr(data.logoSrc)}" alt="Logo" />` : ""}
      </div>
      <div class="ti-company">
        <div class="ti-company-name">${escapeHtml(data.companyName || PARAMVERSE_COMPANY.companyName)}</div>
        <div class="ti-muted">${escapeHtml(data.companyAddress || PARAMVERSE_COMPANY.companyAddress)}</div>
        <div class="ti-muted ti-company-meta">${companyMetaHtml(data)}</div>
      </div>
      <div class="ti-title-wrap">
        <div class="ti-doc-title">${escapeHtml(docTitle)}</div>
        <div class="ti-copy">${escapeHtml(data.copyLabel)}</div>
      </div>
    </div>

    ${metaBlock}

    <div class="ti-parties${partyMode === "branches" ? " cols-2" : ""}">
      ${
        partyMode === "branches"
          ? `${partyBoxHtml("Transferring Branch", data.billFrom)}${partyBoxHtml("Receiving Branch", data.billTo)}`
          : `${partyBoxHtml("Bill From", data.billFrom)}${partyBoxHtml("Bill To", data.billTo)}${partyBoxHtml("Ship To", data.shipTo)}`
      }
    </div>

    <div class="ti-items">
      ${itemsTableHtml}
    </div>

    <div class="ti-lower">
      <div class="ti-lower-left">
        <div class="ti-hsn-title">HSN-Wise Tax Summary</div>
        <div class="ti-hsn">
          ${renderPdfTable({
            columns: hsnColumns,
            rows: hsnRows,
            footerRow: hsnFooter,
          })}
        </div>

        <div class="ti-panel">
          <div class="ti-panel-h">Bank Details</div>
          <div class="ti-panel-b ti-bank-body ti-bank-grid">
            <div class="ti-kv ti-kv-inline"><span class="k">Account Name</span><span class="v">${escapeHtml(data.bank.accountName)}</span></div>
            <div class="ti-kv ti-kv-inline"><span class="k">Bank Name</span><span class="v">${escapeHtml(data.bank.bankName)}</span></div>
            <div class="ti-kv ti-kv-inline"><span class="k">A/C No.</span><span class="v">${escapeHtml(data.bank.accountNo)}</span></div>
            <div class="ti-kv ti-kv-inline"><span class="k">IFSC</span><span class="v">${escapeHtml(data.bank.ifsc)}</span></div>
            <div class="ti-kv ti-kv-inline span-2"><span class="k">Branch</span><span class="v">${escapeHtml(data.bank.branch)}</span></div>
          </div>
        </div>

        ${(() => {
          const narrationText = asText(data.narration, "").trim();
          if (!narrationText) return "";
          return `<div class="ti-panel">
          <div class="ti-panel-h">Narration</div>
          <div class="ti-panel-b ti-narration-body">${escapeHtml(narrationText).replace(/\r\n|\r|\n/g, "<br/>")}</div>
        </div>`;
        })()}

        <div class="ti-panel">
          <div class="ti-panel-h">Terms &amp; Declaration</div>
          <div class="ti-panel-b ti-terms">${escapeHtml(data.terms)}</div>
        </div>
      </div>

      <div class="ti-lower-right">
        <div class="ti-panel">
          <div class="ti-panel-h">Invoice Summary</div>
          <div class="ti-panel-b ti-summary-wrap">
            ${renderSummaryRows(summaryRows)}
          </div>
        </div>
        <div class="ti-words">
          <div class="ti-words-lbl">Amount In Words</div>
          <div class="ti-words-val">${escapeHtml(data.amountInWords)}</div>
        </div>
        <div class="ti-sign">
          ${renderParamverseSignatory(
            data.companyName || PARAMVERSE_COMPANY.companyName,
          )}
        </div>
      </div>
    </div>

    <div class="ti-accept">
      <div class="ti-panel-h">Customer Acceptance / Receiver Seal &amp; Signature</div>
      <div class="ti-accept-body">
        <div class="ti-accept-cols">
          <div class="ti-accept-col"><div class="line"></div><div class="lbl">Receiver Seal</div></div>
          <div class="ti-accept-col"><div class="line"></div><div class="lbl">Signature</div></div>
          <div class="ti-accept-col"><div class="line"></div><div class="lbl">Name</div></div>
          <div class="ti-accept-col"><div class="line"></div><div class="lbl">Date</div></div>
        </div>
      </div>
    </div>

    ${renderParamverseFooter({
      left: isProforma
        ? "This is a computer generated proforma invoice."
        : "This is a computer generated invoice.",
      center: `${asText(data.invoiceNo)}  ·  ${asText(data.invoiceDate)}`,
      right: asText(data.companyName || PARAMVERSE_COMPANY.companyName),
    })}
  `;

  return buildParamversePdfDocument({
    title: " ",
    bodyHtml,
    extraCss: `
      /* Portrait A4 — compact columns so the line table fits print width */
      @page { size: A4 portrait; margin: 5mm; }

      :root {
        --ti-band: #edf2fa;
        --ti-band-text: #2f4a6e;
        --ti-border: #cfd6e0;
        --ti-line: #d8dde5;
        --ti-label: #6b7280;
        --ti-text: #1a1a1a;
        --ti-muted: #4b5563;
      }

      body { font-size: 10px !important; line-height: 1.25 !important; color: var(--ti-text); }
      .pv-header, .pv-section-title { display: none !important; }

      .ti-header {
        display: grid;
        grid-template-columns: 72px 1fr auto;
        gap: 8px;
        align-items: end;
        padding-bottom: 5px;
        border-bottom: 1px solid #222;
        margin-bottom: 6px;
      }
      .ti-logo {
        border-right: 1px solid var(--ti-border);
        padding-right: 6px;
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        min-height: 32px;
      }
      .ti-logo img {
        max-height: 32px;
        max-width: 70px;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
      }
      .ti-company {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        gap: 0;
        line-height: 1.15;
      }
      .ti-company-name {
        font-size: 14px !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        margin: 0;
        padding: 0;
        line-height: 1.15;
      }
      .ti-muted {
        color: var(--ti-muted);
        font-size: 8.5px !important;
        line-height: 1.25;
        margin: 1px 0 0;
        padding: 0;
      }
      .ti-company-meta { margin-top: 1px !important; }
      .ti-company-meta .ti-meta-pair .k {
        font-weight: 400;
        color: var(--ti-muted);
      }
      .ti-company-meta .ti-meta-pair strong {
        font-weight: 700;
        color: var(--ti-text);
      }
      .ti-title-wrap {
        text-align: right;
        align-self: end;
      }
      .ti-doc-title {
        font-size: 16px !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        line-height: 1.1;
      }
      .ti-copy {
        display: inline-block;
        margin-top: 4px;
        border: 1px solid #b8c0cc;
        border-radius: 999px;
        padding: 2px 9px;
        font-size: 8.5px !important;
        font-weight: 600;
        color: #374151;
        text-transform: none;
      }

      .ti-lbl {
        font-size: 8px !important;
        color: var(--ti-label);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.25px;
      }
      .ti-val {
        font-size: 10px !important;
        font-weight: 700;
        color: var(--ti-text);
        margin-top: 2px;
        min-height: 12px;
      }
      .ti-val.dotted {
        border-bottom: 1px dashed #9aa3b2;
        min-height: 14px;
        margin-top: 5px;
      }
      .ti-meta-row {
        display: grid;
        gap: 4px 10px;
        align-items: start;
      }
      .ti-meta-row.cols-7 { grid-template-columns: repeat(7, 1fr); }
      .ti-meta-row.cols-6 { grid-template-columns: repeat(6, 1fr); }
      .ti-meta-row.cols-5 { grid-template-columns: repeat(5, 1fr); }
      .ti-meta-row.cols-4 { grid-template-columns: repeat(4, 1fr); }
      .ti-meta-row.cols-3 { grid-template-columns: repeat(3, 1fr); }
      .ti-meta-row.cols-2 { grid-template-columns: 1fr 1fr; }
      .ti-field.wide { grid-column: 1 / -1; }

      .ti-cn-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 16px;
        align-items: start;
      }
      .ti-cn-meta-left {
        display: grid;
        gap: 4px;
      }
      .ti-cn-ref-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 16px;
      }
      .ti-cn-ref-col {
        display: grid;
        gap: 4px;
      }

      .ti-dash {
        border: none;
        border-top: 1px dashed #9aa3b2;
        margin: 5px 0;
      }
      .ti-solid {
        border: none;
        border-top: 1px solid var(--ti-line);
        margin: 5px 0;
      }

      .ti-einvoice { margin: 2px 0 0; }
      .ti-einvoice-top {
        display: block;
        max-width: 100%;
      }
      .ti-irn { margin-top: 4px; max-width: 100%; }
      .ti-irn .ti-val { font-size: 9px !important; word-break: break-all; }

      .ti-parties {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
        margin: 6px 0 8px;
      }
      .ti-parties.cols-2 { grid-template-columns: 1fr 1fr; }
      .ti-party {
        border: 1px solid var(--ti-border);
        min-height: 78px;
        overflow: hidden;
      }
      .ti-party-h {
        background: var(--ti-band);
        color: var(--ti-band-text);
        font-size: 9px !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 3px 7px;
        border-bottom: 1px solid var(--ti-border);
      }
      .ti-party-b { padding: 5px 7px; }
      .ti-party .name {
        font-weight: 700;
        font-size: 10.5px !important;
        margin: 0 0 2px;
      }
      .ti-party p {
        margin: 0 0 1px;
        font-size: 9px !important;
        line-height: 1.35;
        color: #2a2a2a;
      }

      .ti-items table.pv-table {
        width: 100%;
        table-layout: fixed !important;
        font-size: 9px !important;
        border-collapse: collapse;
      }
      .ti-items table.pv-table th {
        background: var(--ti-band) !important;
        color: var(--ti-band-text) !important;
        border: 1px solid #b7c2d4 !important;
        font-size: 7.5px !important;
        padding: 3px 2px !important;
        white-space: normal !important;
        line-height: 1.15;
        word-break: break-word;
        overflow-wrap: anywhere;
        hyphens: auto;
      }
      .ti-items table.pv-table td {
        border: 1px solid #d5dae3 !important;
        padding: 3px 2px !important;
        vertical-align: top;
        font-size: 8.5px !important;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .ti-items table.pv-table td.pv-num,
      .ti-items table.pv-table td.pv-r {
        white-space: nowrap !important;
        overflow: hidden;
        text-overflow: clip;
        font-size: 8px !important;
        padding: 3px 2px !important;
      }
      .ti-items table.pv-table td.pv-nowrap {
        white-space: nowrap !important;
        overflow: visible;
      }
      .ti-items table.pv-table td.pv-c {
        text-align: center;
        vertical-align: middle;
      }
      .ti-items .ti-pname {
        font-size: 9px !important;
        font-weight: 700;
        line-height: 1.2;
        color: #111111;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .ti-items .sub {
        display: block;
        font-size: 9px !important;
        color: #1a1a1a;
        font-weight: 500;
        margin-top: 2px;
        line-height: 1.35;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .ti-items .ti-hsn-code {
        display: inline-block;
        font-size: 8px !important;
        font-weight: 600;
        letter-spacing: 0;
        white-space: nowrap;
        line-height: 1.2;
      }
      .ti-items .pv-totals-row td {
        background: #f3f5f8 !important;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        font-size: 8px !important;
        vertical-align: middle;
      }
      .ti-items .pv-totals-row td.ti-tot-qty {
        white-space: normal !important;
        overflow: hidden !important;
        word-break: break-word;
        overflow-wrap: anywhere;
        font-size: 7.5px !important;
        line-height: 1.2;
        text-align: right;
      }
      .ti-items .pv-totals-row td.ti-tot-qty .ti-tot-lbl {
        display: block;
        font-size: 6.5px !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        color: #4b5563;
      }

      .ti-lower {
        margin-top: 6px;
        display: grid;
        grid-template-columns: 1.65fr 1fr;
        gap: 8px;
        align-items: start;
      }
      .ti-lower-left {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .ti-hsn-title {
        background: var(--ti-band);
        color: var(--ti-band-text);
        font-size: 9px !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 3px 7px;
        border: 1px solid var(--ti-border);
        border-bottom: none;
      }
      .ti-hsn {
        width: 100%;
        border: 1px solid var(--ti-border);
        border-top: none;
      }
      .ti-hsn table.pv-table {
        width: 100% !important;
        table-layout: fixed !important;
        font-size: 8.5px !important;
        border-collapse: collapse;
      }
      .ti-hsn table.pv-table th {
        background: #f3f5f8 !important;
        color: var(--ti-band-text) !important;
        border: none !important;
        border-bottom: 1px solid var(--ti-line) !important;
        font-size: 8px !important;
        text-align: left !important;
        padding: 3px 5px !important;
      }
      .ti-hsn table.pv-table th.pv-r,
      .ti-hsn table.pv-table th.pv-num { text-align: right !important; }
      .ti-hsn table.pv-table th.pv-c { text-align: center !important; }
      .ti-hsn table.pv-table td {
        border: none !important;
        border-bottom: 1px solid var(--ti-line) !important;
        padding: 2px 5px !important;
        font-size: 8.5px !important;
      }
      .ti-hsn .pv-totals-row td {
        background: transparent !important;
        font-weight: 700;
        border-bottom: none !important;
      }

      .ti-panel {
        border: 1px solid var(--ti-border);
        overflow: hidden;
      }
      .ti-panel-h {
        background: var(--ti-band);
        color: var(--ti-band-text);
        font-size: 9px !important;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 3px 7px;
        border-bottom: 1px solid var(--ti-border);
      }
      .ti-panel-b { padding: 6px 8px; }
      .ti-panel-b.ti-bank-body { padding: 4px 7px; }
      .ti-panel-b.ti-narration-body {
        padding: 4px 7px;
        font-size: 9px !important;
        line-height: 1.4;
        color: #262626;
        font-weight: 400;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .ti-bank-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px 12px;
      }
      .ti-bank-grid .span-2 { grid-column: 1 / -1; }
      .ti-kv .k {
        font-size: 7.5px !important;
        color: var(--ti-label);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .ti-kv .v {
        font-size: 9.5px !important;
        font-weight: 700;
        margin-top: 1px;
        color: var(--ti-text);
        word-break: break-word;
      }
      .ti-bank-grid .ti-kv-inline {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0 4px;
        min-width: 0;
      }
      .ti-bank-grid .ti-kv-inline .k {
        margin: 0;
        flex-shrink: 0;
      }
      .ti-bank-grid .ti-kv-inline .k::after { content: ":"; }
      .ti-bank-grid .ti-kv-inline .v {
        margin-top: 0;
        font-size: 9px !important;
        min-width: 0;
      }
      .ti-terms {
        font-size: 8.5px !important;
        line-height: 1.4;
        color: #262626;
        font-weight: 400;
      }

      .ti-lower-right {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .ti-summary-wrap .pv-summary {
        width: 100%;
        border: none;
      }
      .ti-summary-wrap .pv-summary td {
        border-bottom: 1px solid #eceff3;
        padding: 2px 0;
        font-size: 9.5px !important;
      }
      .ti-summary-wrap .pv-summary tr:last-child td {
        border-bottom: none;
        background: #e8edf5 !important;
        font-weight: 700;
        font-size: 11.5px !important;
        padding: 5px 6px;
      }
      .ti-words-lbl {
        font-size: 7.5px !important;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ti-label);
        letter-spacing: 0.25px;
      }
      .ti-words-val {
        font-size: 9.5px !important;
        font-weight: 700;
        margin-top: 2px;
        line-height: 1.35;
      }
      .ti-sign .pv-sign {
        margin-top: 8px;
        text-align: right;
      }
      .ti-sign .pv-sign-company {
        font-size: 9.5px !important;
        color: var(--ti-text);
      }
      .ti-sign .pv-sign-gap { height: 34px; }
      .ti-sign .pv-sign-label {
        color: var(--ti-label);
        border-top: 1px solid #b8c0cc;
        font-size: 9px !important;
      }

      .ti-accept {
        margin-top: 8px;
        border: 1px solid var(--ti-border);
        overflow: hidden;
      }
      .ti-accept .ti-panel-h { border-bottom: 1px solid var(--ti-border); }
      .ti-accept-body { padding: 10px 12px 6px; }
      .ti-accept-cols {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
      }
      .ti-accept-col .line {
        border-top: 1px solid #9aa3b2;
        margin-bottom: 4px;
      }
      .ti-accept-col .lbl {
        text-align: center;
        font-size: 7.5px !important;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ti-label);
        letter-spacing: 0.3px;
      }

      .pv-footer {
        margin-top: 6px;
        border-top: none;
        color: #374151;
        font-size: 8px !important;
      }
    `,
  });
}

export async function openEditableTaxInvoicePreview(
  data: TaxInvoiceViewModel,
): Promise<void> {
  const logoSrc = data.logoSrc || (await loadNavbarLogoDataUrl());
  await openEditablePdfPreview({
    title: "Tax Invoice PDF Preview",
    initialData: { ...data, logoSrc } as unknown as Record<string, unknown>,
    renderHtml: (edited) =>
      buildTaxInvoiceHtml(edited as unknown as TaxInvoiceViewModel),
    printButtonLabel: "Download Tax Invoice PDF",
    outputFileName: `${sanitizePdfFileName(data.invoiceNo, "TAX_INVOICE")}.pdf`,
  });
}
