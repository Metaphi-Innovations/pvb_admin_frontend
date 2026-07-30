"use client";

import {
  PARAMVERSE_COMPANY,
  asText,
  buildParamversePdfDocument,
  escapeHtml,
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

const DEFAULT_BANK = {
  accountName: "ParamVerse Bio Pvt. Ltd.",
  bankName: "HDFC Bank Ltd.",
  accountNo: "50200098765432",
  ifsc: "HDFC0002874",
  branch: "Aurangabad - MIDC Branch",
} as const;

export interface TaxInvoiceLineItem {
  sr: number;
  productCode: string;
  productName: string;
  batchLine: string;
  sku: string;
  hsnCode: string;
  qtyInCase: number;
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
  bank: typeof DEFAULT_BANK;
  terms: string;
  summary: {
    grossAmount: number;
    discount: number;
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

function formatDisplayDate(value: unknown): string {
  return formatDate(value);
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

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function mapDispatchToTaxInvoice(
  dispatch: any,
  salesOrder?: Record<string, unknown> | null,
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
  const warehouseState = asText(warehouse.state, "Maharashtra");
  const customerState = asText(
    shipTo.state || billTo.state || customer.state || snapshot.state,
    "Maharashtra",
  );
  const interstate =
    warehouseState.toLowerCase() !== customerState.toLowerCase() ||
    toNumber(pick(readRecord((dispatch?.items || [])[0]), ["igst_percentage", "igst_amount"])) >
      0;

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

    const totalQty = toNumber(item.dispatched_base_qty ?? item.dispatchQty);
    const packSize = Math.max(
      1,
      toNumber(
        product.unit_per_packing ??
          product.pack_size ??
          productSnapshot.unit_per_packing ??
          productSnapshot.pack_size ??
          1,
      ),
    );
    const qtyInCase = packSize > 1 ? Math.floor(totalQty / packSize) : totalQty;
    const rate = toNumber(item.unit_price ?? item.unit_rate ?? product.unit_price);
    const grossAmt = round2(totalQty * rate);
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
        product.sku ?? productSnapshot.sku ?? product.product_code,
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
      totalQty,
      uom: asText(
        product.unit ||
          product.mou ||
          productSnapshot.unit ||
          productSnapshot.mou ||
          item.quantity_type ||
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
  });

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
    warehouse.warehouse_name,
    "ParamVerse Bio Pvt. Ltd.",
  );
  const billFrom = partyFromRaw(warehouseName, warehouse, {
    address: [asText(warehouse.address, ""), asText(warehouse.address_1, "")]
      .filter(Boolean)
      .join(", "),
    city: warehouse.city,
    state: warehouse.state,
    pincode: warehouse.pincode,
    gstin: "27AAQCP4960M1ZL",
    mobile: warehouse.mobile || warehouse.phone,
    email: warehouse.email || "sales@paramversebio.com",
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

  const invoiceNo = asText(
    dispatch?.sales_invoice?.invoice_number ||
      dispatch?.sales_invoices?.[0]?.invoice_number ||
      dispatch?.challan_number ||
      dispatch?.challanNumber,
    "Assigned on download",
  );

  return {
    logoSrc: undefined,
    ...PARAMVERSE_COMPANY,
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
    eInvoiceNo: asText(dispatch?.e_invoice_no, "—"),
    acknowledgementNo: asText(dispatch?.acknowledgement_no, "—"),
    acknowledgementDate: asText(dispatch?.acknowledgement_date, "—"),
    ewayBillNo: asText(dispatch?.eway_bill_number, "—"),
    ewayBillExpiry: asText(dispatch?.eway_bill_expiry || dispatch?.eway_bill_date, "—"),
    irn: asText(dispatch?.irn, "—"),
    billFrom,
    billTo: billing,
    shipTo: shipping,
    lines,
    hsnSummary: Array.from(hsnMap.values()),
    bank: { ...DEFAULT_BANK },
    terms: DEFAULT_TI_DECLARATION,
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
  useIgst: boolean;
  totalCases: number;
  totalQty: number;
  uom: string;
  gross: string;
  discAmt: string;
  taxable: string;
  cgstOrIgst: string;
  sgst: string;
  total: string;
  /** Extra blank cell after SKU (Sales Person column on proforma). */
  salesPersonColumn?: boolean;
}): string {
  // Sr | Code | Name | SKU | [Sales Person] | HSN | Qty In Case | Total Qty | Rate | Gross | Disc% | Disc Amt | Taxable | GST% | Tax | [SGST] | Total
  const sgstCell = options.useIgst
    ? ""
    : `<td class="pv-r pv-num">${escapeHtml(options.sgst)}</td>`;
  const salesPersonCell = options.salesPersonColumn ? "<td>&nbsp;</td>" : "";
  return `<tr class="pv-totals-row">
    <td><strong>Totals</strong></td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    ${salesPersonCell}
    <td>&nbsp;</td>
    <td class="pv-r pv-num ti-tot-qty">Grand Total Qty in Case:<br/>${escapeHtml(formatNumber(options.totalCases))}</td>
    <td class="pv-r pv-num ti-tot-qty">Grand Total Qty:<br/>${escapeHtml(formatNumber(options.totalQty))} ${escapeHtml(options.uom)}</td>
    <td>&nbsp;</td>
    <td class="pv-r pv-num">${escapeHtml(options.gross)}</td>
    <td>&nbsp;</td>
    <td class="pv-r pv-num">${escapeHtml(options.discAmt)}</td>
    <td class="pv-r pv-num">${escapeHtml(options.taxable)}</td>
    <td>&nbsp;</td>
    <td class="pv-r pv-num">${escapeHtml(options.cgstOrIgst)}</td>
    ${sgstCell}
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
  const docTitle = options?.docTitle || "TAX INVOICE";
  const partyMode = options?.partyMode || "bill_ship";
  const isProforma = options?.layout === "proforma";
  const useIgst = data.interstate || data.lines.some((l) => l.igst > 0);
  const qrSrc =
    data.qrDataUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=0&data=${encodeURIComponent(
      asText(data.irn, "") !== "—" && asText(data.irn, "")
        ? data.irn
        : asText(data.invoiceNo, "TAX-INVOICE"),
    )}`;

  const finalColumns: PdfTableColumn[] = isProforma
    ? [
        { key: "sr", header: "Sr", width: "2.2%", align: "center" },
        { key: "productCode", header: "Product Code", width: "6.5%", nowrap: true },
        { key: "productName", header: "Product Name", width: "14%" },
        { key: "sku", header: "SKU", width: "6%", nowrap: true },
        { key: "salesPerson", header: "Sales Person (TM)", width: "7%", nowrap: true },
        { key: "hsn", header: "HSN", width: "4%", align: "center", nowrap: true },
        { key: "qtyCase", header: "Qty In Case", width: "4.5%", numeric: true },
        { key: "totalQty", header: "Total Qty (Kg/Ltr)", width: "6.5%", numeric: true },
        { key: "rate", header: "Rate Per Unit", width: "5.5%", numeric: true },
        { key: "gross", header: "Gross Amt", width: "6%", numeric: true },
        { key: "discPct", header: "Disc %", width: "3.5%", numeric: true },
        { key: "discAmt", header: "Disc Amt", width: "5%", numeric: true },
        { key: "taxable", header: "Taxable Val", width: "6%", numeric: true },
        { key: "gstPct", header: "GST %", width: "3.5%", numeric: true },
        {
          key: "cgst",
          header: useIgst ? "IGST" : "CGST",
          width: "5%",
          numeric: true,
        },
        ...(useIgst
          ? []
          : [{ key: "sgst", header: "SGST", width: "5%", numeric: true } as PdfTableColumn]),
        { key: "total", header: "Total", width: "6%", numeric: true },
      ]
    : [
        { key: "sr", header: "Sr", width: "2.5%", align: "center" },
        { key: "productCode", header: "Product Code", width: "7%", nowrap: true },
        { key: "productName", header: "Product Name", width: "16%" },
        { key: "sku", header: "SKU", width: "7%", nowrap: true },
        { key: "hsn", header: "HSN", width: "4.5%", align: "center", nowrap: true },
        { key: "qtyCase", header: "Qty In Case", width: "5%", numeric: true },
        { key: "totalQty", header: "Total Qty (Kg/Ltr)", width: "7%", numeric: true },
        { key: "rate", header: "Rate Per Unit", width: "6%", numeric: true },
        { key: "gross", header: "Gross Amt", width: "6.5%", numeric: true },
        { key: "discPct", header: "Disc %", width: "4%", numeric: true },
        { key: "discAmt", header: "Disc Amt", width: "5.5%", numeric: true },
        { key: "taxable", header: "Taxable Val", width: "6.5%", numeric: true },
        { key: "gstPct", header: "GST %", width: "4%", numeric: true },
        {
          key: "cgst",
          header: useIgst ? "IGST" : "CGST",
          width: "5.5%",
          numeric: true,
        },
        ...(useIgst
          ? []
          : [{ key: "sgst", header: "SGST", width: "5.5%", numeric: true } as PdfTableColumn]),
        { key: "total", header: "Total", width: "6.5%", numeric: true },
      ];

  const finalRows: PdfTableRow[] = data.lines.map((line) => ({
    cells: {
      sr: String(line.sr),
      productCode: line.productCode,
      productName: line.productName,
      sku: line.sku,
      salesPerson: data.salesPerson,
      hsn: line.hsnCode,
      qtyCase: formatNumber(line.qtyInCase),
      totalQty: `${formatNumber(line.totalQty)} ${line.uom}`,
      rate: formatCurrency(line.rate),
      gross: formatCurrency(line.grossAmt),
      discPct: line.discPct ? pctLabel(line.discPct) : "—",
      discAmt: formatCurrency(line.discAmt),
      taxable: formatCurrency(line.taxableValue),
      gstPct: pctLabel(line.gstPct),
      cgst: formatCurrency(useIgst ? line.igst : line.cgst),
      sgst: formatCurrency(line.sgst),
      total: formatCurrency(line.total),
    },
    htmlCells: {
      productName: `<strong>${escapeHtml(line.productName)}</strong>${
        line.batchLine
          ? `<span class="sub">${escapeHtml(line.batchLine)}</span>`
          : ""
      }`,
      total: `<strong>${escapeHtml(formatCurrency(line.total))}</strong>`,
    },
  }));

  const totalCases = data.lines.reduce((s, l) => s + l.qtyInCase, 0);
  const totalQty = data.lines.reduce((s, l) => s + l.totalQty, 0);
  const uom = data.lines[0]?.uom || "Units";
  const linesTotal = round2(data.lines.reduce((s, l) => s + l.total, 0));
  const b = blankCell();

  const itemsTableHtml = renderPdfTable({
    columns: finalColumns,
    rows: finalRows,
  }).replace(
    "</tbody>",
    `${buildItemsTotalsRowHtml({
      useIgst,
      totalCases,
      totalQty,
      uom,
      gross: formatCurrency(data.summary.grossAmount),
      discAmt: formatCurrency(data.summary.discount),
      taxable: formatCurrency(data.summary.taxableValue),
      cgstOrIgst: formatCurrency(useIgst ? data.summary.igst : data.summary.cgst),
      sgst: formatCurrency(data.summary.sgst),
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
      metaFieldHtml("Sales Order No.", data.salesOrderNo),
      metaFieldHtml("Sales Order Date", data.salesOrderDate),
      metaFieldHtml("Place of Supply", data.placeOfSupply),
      metaFieldHtml("State Code", data.stateCode),
    ].join("")}</div>
    <div class="ti-solid"></div>
    `
    : `
    <div class="ti-meta-row cols-7">${[
      metaFieldHtml("Invoice No.", data.invoiceNo),
      metaFieldHtml("Invoice Date", data.invoiceDate),
      metaFieldHtml("Customer PO No.", data.customerPoNo),
      metaFieldHtml("Customer PO Date", data.customerPoDate),
      metaFieldHtml("Sales Order No.", data.salesOrderNo),
      metaFieldHtml("Sales Order Date", data.salesOrderDate),
      metaFieldHtml("Sales Person (TM)", data.salesPerson),
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
          <div class="ti-qr">
            <img src="${escapeHtml(qrSrc)}" alt="E-Invoice QR" width="30" height="30" />
          </div>
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
        ${data.logoSrc ? `<img src="${escapeHtml(data.logoSrc)}" alt="Logo" />` : ""}
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
          <div class="ti-panel-b ti-bank-grid">
            <div class="ti-kv"><div class="k">Account Name</div><div class="v">${escapeHtml(data.bank.accountName)}</div></div>
            <div class="ti-kv"><div class="k">Bank Name</div><div class="v">${escapeHtml(data.bank.bankName)}</div></div>
            <div class="ti-kv"><div class="k">A/C No.</div><div class="v">${escapeHtml(data.bank.accountNo)}</div></div>
            <div class="ti-kv"><div class="k">IFSC</div><div class="v">${escapeHtml(data.bank.ifsc)}</div></div>
            <div class="ti-kv span-2"><div class="k">Branch</div><div class="v">${escapeHtml(data.bank.branch)}</div></div>
          </div>
        </div>

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
      @page { size: A4 landscape; margin: 7mm; }

      :root {
        --ti-band: #edf2fa;
        --ti-band-text: #2f4a6e;
        --ti-border: #cfd6e0;
        --ti-line: #d8dde5;
        --ti-label: #6b7280;
        --ti-text: #1a1a1a;
        --ti-muted: #4b5563;
      }

      body { font-size: 7.5px; color: var(--ti-text); }
      .pv-header, .pv-section-title { display: none !important; }

      .ti-header {
        display: grid;
        grid-template-columns: 100px 1fr auto;
        gap: 8px;
        align-items: end;
        padding-bottom: 5px;
        border-bottom: 1px solid #222;
        margin-bottom: 6px;
      }
      .ti-logo {
        border-right: 1px solid var(--ti-border);
        padding-right: 8px;
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        min-height: 42px;
      }
      .ti-logo img {
        max-height: 42px;
        max-width: 96px;
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
        font-size: 12.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        margin: 0;
        padding: 0;
        line-height: 1.15;
      }
      .ti-muted {
        color: var(--ti-muted);
        font-size: 6.2px;
        line-height: 1.2;
        margin: 1px 0 0;
        padding: 0;
      }
      .ti-company-meta {
        margin-top: 1px !important;
      }
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
        font-size: 15px;
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
        font-size: 6.5px;
        font-weight: 600;
        color: #374151;
        text-transform: none;
      }

      .ti-lbl {
        font-size: 5.8px;
        color: var(--ti-label);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.25px;
      }
      .ti-val {
        font-size: 7.6px;
        font-weight: 700;
        color: var(--ti-text);
        margin-top: 2px;
        min-height: 10px;
      }
      .ti-val.dotted {
        border-bottom: 1px dashed #9aa3b2;
        min-height: 12px;
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
      .ti-field.wide { grid-column: 1 / -1; }

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
        display: grid;
        grid-template-columns: 1fr 32px;
        gap: 10px;
        align-items: start;
        max-width: 62%;
      }
      .ti-qr {
        width: 30px;
        height: 30px;
        margin-top: 2px;
      }
      .ti-qr img {
        width: 30px !important;
        height: 30px !important;
        display: block;
        border: none;
      }
      .ti-irn { margin-top: 4px; max-width: 78%; }
      .ti-irn .ti-val { font-size: 7px; word-break: break-all; }

      .ti-parties {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
        margin: 6px 0 8px;
      }
      .ti-parties.cols-2 {
        grid-template-columns: 1fr 1fr;
      }
      .ti-party {
        border: 1px solid var(--ti-border);
        min-height: 78px;
        overflow: hidden;
      }
      .ti-party-h {
        background: var(--ti-band);
        color: var(--ti-band-text);
        font-size: 6.8px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 3px 7px;
        border-bottom: 1px solid var(--ti-border);
      }
      .ti-party-b { padding: 5px 7px; }
      .ti-party .name {
        font-weight: 700;
        font-size: 8px;
        margin: 0 0 2px;
      }
      .ti-party p {
        margin: 0 0 1px;
        font-size: 6.8px;
        line-height: 1.35;
        color: #2a2a2a;
      }

      .ti-items table.pv-table {
        width: 100%;
        font-size: 6.2px;
        border-collapse: collapse;
      }
      .ti-items table.pv-table th {
        background: var(--ti-band) !important;
        color: var(--ti-band-text) !important;
        border: 1px solid #b7c2d4 !important;
        font-size: 5.6px !important;
        padding: 3px 2px !important;
        white-space: normal !important;
        line-height: 1.15;
      }
      .ti-items table.pv-table td {
        border: 1px solid #d5dae3 !important;
        padding: 2px 2px !important;
        vertical-align: top;
      }
      .ti-items .pv-totals-row td {
        background: #f3f5f8 !important;
        font-weight: 700;
        white-space: nowrap;
        font-size: 6.2px;
        vertical-align: middle;
      }
      .ti-items .pv-totals-row td.ti-tot-qty {
        white-space: normal !important;
        font-size: 5.6px;
        line-height: 1.25;
        text-align: right;
      }
      .ti-items .sub {
        display: block;
        font-size: 5.6px;
        color: #6b7280;
        font-weight: 400;
        margin-top: 1px;
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
        font-size: 6.8px;
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
        font-size: 6.4px;
        border-collapse: collapse;
      }
      .ti-hsn table.pv-table th {
        background: #f3f5f8 !important;
        color: var(--ti-band-text) !important;
        border: none !important;
        border-bottom: 1px solid var(--ti-line) !important;
        font-size: 5.8px !important;
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
        font-size: 6.8px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 3px 7px;
        border-bottom: 1px solid var(--ti-border);
      }
      .ti-panel-b { padding: 6px 8px; }
      .ti-bank-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 14px;
      }
      .ti-bank-grid .span-2 { grid-column: 1 / -1; }
      .ti-kv .k {
        font-size: 5.8px;
        color: var(--ti-label);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .ti-kv .v {
        font-size: 7.4px;
        font-weight: 700;
        margin-top: 1px;
        color: var(--ti-text);
      }
      .ti-terms {
        font-size: 6.6px;
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
        font-size: 7.2px;
      }
      .ti-summary-wrap .pv-summary tr:last-child td {
        border-bottom: none;
        background: #e8edf5 !important;
        font-weight: 700;
        font-size: 9px;
        padding: 5px 6px;
      }
      .ti-words-lbl {
        font-size: 5.8px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ti-label);
        letter-spacing: 0.25px;
      }
      .ti-words-val {
        font-size: 7.4px;
        font-weight: 700;
        margin-top: 2px;
        line-height: 1.35;
      }
      .ti-sign .pv-sign {
        margin-top: 8px;
        text-align: right;
      }
      .ti-sign .pv-sign-company {
        font-size: 7.2px;
        color: var(--ti-text);
      }
      .ti-sign .pv-sign-gap { height: 34px; }
      .ti-sign .pv-sign-label {
        color: var(--ti-label);
        border-top: 1px solid #b8c0cc;
      }

      .ti-accept {
        margin-top: 8px;
        border: 1px solid var(--ti-border);
        overflow: hidden;
      }
      .ti-accept .ti-panel-h {
        border-bottom: 1px solid var(--ti-border);
      }
      .ti-accept-body {
        padding: 10px 12px 6px;
      }
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
        font-size: 5.8px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ti-label);
        letter-spacing: 0.3px;
      }

      .pv-footer {
        margin-top: 6px;
        border-top: none;
        color: #374151;
        font-size: 6.2px;
      }
    `,
  });
}

export async function loadQrDataUrl(text: string): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const payload = String(text || "").trim() || "TAX-INVOICE";
  try {
    const response = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=0&data=${encodeURIComponent(payload)}`,
    );
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function openEditableTaxInvoicePreview(
  data: TaxInvoiceViewModel,
): Promise<void> {
  const logoSrc = data.logoSrc || (await loadNavbarLogoDataUrl());
  const qrSeed =
    asText(data.irn, "") !== "—" && asText(data.irn, "")
      ? data.irn
      : asText(data.invoiceNo, "TAX-INVOICE");
  const qrDataUrl = data.qrDataUrl || (await loadQrDataUrl(qrSeed));
  await openEditablePdfPreview({
    title: "Tax Invoice PDF Preview",
    initialData: { ...data, logoSrc, qrDataUrl } as unknown as Record<
      string,
      unknown
    >,
    renderHtml: (edited) =>
      buildTaxInvoiceHtml(edited as unknown as TaxInvoiceViewModel),
    printButtonLabel: "Download Tax Invoice PDF",
    outputFileName: `${sanitizePdfFileName(data.invoiceNo, "TAX_INVOICE")}.pdf`,
  });
}
