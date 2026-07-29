"use client";

export interface DeliveryChallanLine {
  sr: number;
  sku: string;
  productName: string;
  qtyLabel: string;
}

export interface DeliveryChallanViewModel {
  companyName: string;
  companyAddress: string;
  companyGstin: string;
  challanNo: string;
  dispatchNo: string;
  date: string;
  deliverTo: string;
  sourceDocument: string;
  warehouse: string;
  transporter: string;
  vehicleNo: string;
  lrNo: string;
  lines: DeliveryChallanLine[];
  generatedOn: string;
}

export const DELIVERY_CHALLAN_COMPANY = {
  companyName: "Dharitri Sutra Agri Solutions Pvt Ltd",
  companyAddress:
    "Plot 12, Agri Park, Hinjawadi Phase 2, Pune, Maharashtra 411057",
  companyGstin: "27AABCD1234E1Z5",
} as const;

function asText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatIsoDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
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
  const items = (dispatch?.items || dispatch?.products || []) as any[];
  const lines: DeliveryChallanLine[] = items.map((item, index) => {
    const product = item.product || {};
    const snapshot = item.product_snapshot || {};
    const packSize =
      product.unit_per_packing ||
      product.conversion_rate ||
      snapshot.unit_per_packing ||
      snapshot.conversion_rate ||
      1;
    const baseQty = item.dispatched_base_qty ?? item.dispatchQty ?? 0;
    return {
      sr: index + 1,
      sku: asText(
        product.product_code ||
          snapshot.product_code ||
          item.sku ||
          item.product_code,
        "—",
      ),
      productName: asText(
        product.product_name ||
          snapshot.product_name ||
          item.product_name ||
          item.product,
        "—",
      ),
      qtyLabel: formatDispatchQtyLabel(baseQty, packSize),
    };
  });

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
    date: formatIsoDate(
      dispatch?.dispatch_date || dispatch?.created_at || dispatch?.createdAt,
    ),
    deliverTo: asText(
      dispatch?.customer?.customer_name ||
        dispatch?.customer_name ||
        dispatch?.customer_snapshot?.customer_name,
    ),
    sourceDocument: asText(
      dispatch?.source_document_no ||
        dispatch?.packing_done?.packing_done_no ||
        dispatch?.salesOrderNumber,
    ),
    warehouse: asText(dispatch?.warehouse?.warehouse_name),
    transporter: asText(dispatch?.transporter),
    vehicleNo: asText(dispatch?.vehicle_number || dispatch?.vehicleNumber),
    lrNo: asText(dispatch?.lr_number || dispatch?.lrNumber),
    lines,
    generatedOn: formatIsoDate(new Date()),
  };
}

export function buildDeliveryChallanHtml(data: DeliveryChallanViewModel): string {
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rows = data.lines.length
    ? data.lines
        .map(
          (line) => `
      <tr>
        <td class="c">${line.sr}</td>
        <td>${esc(line.sku)}</td>
        <td>${esc(line.productName)}</td>
        <td class="r">${esc(line.qtyLabel)}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No line items</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Delivery Challan ${esc(data.challanNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 10mm; }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      padding: 28px 24px;
      background: #fff;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 24px; }
    .company-name { font-size: 20px; font-weight: 700; color: #B85508; line-height: 1.25; margin-bottom: 4px; }
    .company-line { font-size: 12px; color: #1a1a1a; line-height: 1.45; }
    .meta { text-align: right; min-width: 180px; }
    .doc-title { font-size: 14px; font-weight: 700; color: #1A3A96; margin-bottom: 10px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    .meta .value { font-size: 12px; margin-top: 2px; margin-bottom: 10px; }
    .meta .value.strong { font-weight: 700; }
    .grid-2 { display: flex; gap: 48px; margin-bottom: 24px; }
    .col { flex: 1; min-width: 0; }
    .field { margin-bottom: 10px; }
    .field .value { font-size: 12px; margin-top: 4px; }
    .field .value.strong { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; font-weight: 700; }
    td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 12px; }
    td.c { text-align: center; width: 36px; }
    td.r, th.r { text-align: right; }
    td.empty { text-align: center; color: #6b7280; padding: 12px; }
    .footer { margin-top: 28px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; line-height: 1.5; }
    .footer p + p { margin-top: 6px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${esc(data.companyName)}</div>
      <p class="company-line">${esc(data.companyAddress)}</p>
      <p class="company-line">GSTIN: ${esc(data.companyGstin)}</p>
    </div>
    <div class="meta">
      <div class="doc-title">DELIVERY CHALLAN</div>
      <p class="label">Challan No.</p>
      <p class="value strong">${esc(data.challanNo)}</p>
      <p class="label">Dispatch No.</p>
      <p class="value">${esc(data.dispatchNo)}</p>
      <p class="label">Date</p>
      <p class="value">${esc(data.date)}</p>
    </div>
  </div>
  <div class="grid-2">
    <div class="col">
      <div class="field"><p class="label">Deliver To</p><p class="value strong">${esc(data.deliverTo)}</p></div>
      <div class="field"><p class="label">Source Document</p><p class="value">${esc(data.sourceDocument)}</p></div>
    </div>
    <div class="col">
      <div class="field"><p class="label">Warehouse</p><p class="value strong">${esc(data.warehouse)}</p></div>
      <div class="field"><p class="label">Transporter</p><p class="value">${esc(data.transporter)}</p></div>
      <div class="field"><p class="label">Vehicle No.</p><p class="value">${esc(data.vehicleNo)}</p></div>
      <div class="field"><p class="label">LR No.</p><p class="value">${esc(data.lrNo)}</p></div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th style="width:120px">SKU</th>
        <th>Product</th>
        <th class="r" style="width:140px">Dispatch Qty</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <p>This is a Delivery Challan for goods dispatched. Not a tax invoice.</p>
    <p>Generated on ${esc(data.generatedOn)} · Challan No: ${esc(data.challanNo)} · Dispatch: ${esc(data.dispatchNo)}</p>
  </div>
</body>
</html>`;
}

export function openDeliveryChallanPrintWindow(data: DeliveryChallanViewModel): void {
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(buildDeliveryChallanHtml(data));
  popup.document.close();
  popup.focus();
  popup.onload = () => {
    popup.print();
  };
  // Fallback if onload already fired
  setTimeout(() => {
    try {
      popup.print();
    } catch {
      /* ignore */
    }
  }, 350);
}
