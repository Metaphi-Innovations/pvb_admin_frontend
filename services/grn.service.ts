import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  GrnBatch,
  GrnItem,
  GrnRecord,
  GrnSupplierInvoice,
} from "@/app/(app)/warehouse/grn/shared/types";
import { mapBackendGrnStatus } from "@/lib/warehouse/grn-status";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asDateOnly(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function assertSuccess(body: Record<string, unknown>, fallback: string): void {
  if (body.success === false) {
    throw new Error(asString(body.message) || fallback);
  }
}

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function mapSourceType(sourceType: string): GrnRecord["sourceType"] {
  switch (sourceType) {
    case "STOCK_TRANSFER":
      return "stock_transfer";
    case "SALES_RETURN":
      return "sales_return";
    case "SAMPLE_RETURN":
      return "sample_return";
    default:
      return "purchase_order";
  }
}

export type GrnSourceType =
  | "PURCHASE_ORDER"
  | "SALES_RETURN"
  | "STOCK_TRANSFER"
  | "SAMPLE_RETURN";

export interface CreateGrnBatchPayload {
  batchNumber: string;
  invoiceNumber: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  quantity_base_qty: number;
  rate?: number | null;
  gst?: number | null;
  remarks?: string | null;
}

export interface CreateGrnItemPayload {
  source_item_id: string;
  ordered_base_qty: number;
  previous_received_base_qty: number;
  current_received_base_qty: number;
  pending_base_qty: number;
  remarks?: string | null;
  productSnapshot?: Record<string, unknown> | null;
  batches: CreateGrnBatchPayload[];
}

export interface CreateGrnInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceFile?: string | null;
  remarks?: string | null;
}

export interface CreateGrnPayload {
  grnNumber?: string | null;
  source_id: string;
  source_type: GrnSourceType;
  supplierId?: string | null;
  warehouseId: string;
  grnDate: string;
  status?: string;
  remarks?: string | null;
  items: CreateGrnItemPayload[];
  invoices: CreateGrnInvoicePayload[];
}

/** Edit payload — source_id / source_type / grnNumber are optional (immutable on backend). */
export type UpdateGrnPayload = Omit<CreateGrnPayload, "source_id" | "source_type" | "grnNumber" | "status"> & {
  source_id?: string;
  source_type?: GrnSourceType;
  grnNumber?: string | null;
};

export function mapGrnDetail(raw: Record<string, unknown>): GrnRecord {
  const supplier = asRecord(raw.supplier);
  const warehouse = asRecord(raw.warehouse);
  const supplierSnapshot = asRecord(raw.supplierSnapshot);
  const warehouseSnapshot = asRecord(raw.warehouseSnapshot);
  const purchaseOrder = asRecord(raw.purchase_order ?? raw.purchaseOrder);

  const vendorName =
    asString(supplier.supplier_name) ||
    asString(supplierSnapshot.supplier_name) ||
    asString(supplierSnapshot.name);
  const warehouseName =
    asString(warehouse.warehouse_name) ||
    asString(warehouseSnapshot.name) ||
    asString(warehouseSnapshot.warehouse_name);

  const poNumber =
    asString(raw.poNumber) ||
    asString(raw.po_no) ||
    asString(raw.purchaseOrderNumber) ||
    asString(raw.purchase_order_number) ||
    asString(purchaseOrder.po_no) ||
    asString(purchaseOrder.poNumber) ||
    "";

  const sourceId =
    asString(raw.source_id) ||
    asString(raw.sourceId) ||
    asString(purchaseOrder.purchase_order_id) ||
    "";
  const supplierId =
    asString(raw.supplierId) ||
    asString(supplier.supplier_id) ||
    asString(supplierSnapshot.supplier_id) ||
    "";
  const warehouseUuid =
    asString(raw.warehouseId) ||
    asString(warehouse.warehouse_id) ||
    asString(warehouseSnapshot.warehouse_id) ||
    "";

  const invoicesRaw = Array.isArray(raw.invoices) ? raw.invoices : [];
  const invoiceById = new Map<string, Record<string, unknown>>();
  const supplierInvoices: GrnSupplierInvoice[] = invoicesRaw.map((inv, idx) => {
    const row = asRecord(inv);
    const id = asString(row.id) || `inv-${idx}`;
    invoiceById.set(id, row);
    return {
      id,
      fileName:
        asString(row.invoiceFile) ||
        asString(row.invoiceNumber) ||
        `Invoice ${idx + 1}`,
      uploadedAt: asDateOnly(row.invoiceDate || row.created_at),
    };
  });

  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: GrnItem[] = [];
  const batches: GrnBatch[] = [];

  for (const itemRaw of itemsRaw) {
    const item = asRecord(itemRaw);
    const snapshot = asRecord(item.productSnapshot);
    const sourceItemId = asString(item.source_item_id) || asString(item.sourceItemId);
    const productId =
      asString(snapshot.product_id) ||
      sourceItemId ||
      asString(item.id);
    const productName =
      asString(snapshot.product_name) ||
      asString(snapshot.name) ||
      "—";
    const productCode =
      asString(snapshot.product_code) ||
      asString(snapshot.sku) ||
      "";

    const orderedQty = asNumber(item.ordered_base_qty);
    const alreadyReceivedQty = asNumber(item.previous_received_base_qty);
    const receivedQty = asNumber(item.current_received_base_qty);
    const pendingQty = asNumber(item.pending_base_qty);

    items.push({
      productId,
      productName,
      productCode,
      sourceItemId: sourceItemId || undefined,
      orderedQty,
      alreadyReceivedQty,
      pendingQty,
      receivedQty,
      unit: asString(snapshot.base_unit) || "Unit",
      poNumber: poNumber || undefined,
      remarks: asString(item.remarks) || undefined,
    });

    const itemBatches = Array.isArray(item.batches) ? item.batches : [];
    for (const batchRaw of itemBatches) {
      const batch = asRecord(batchRaw);
      const invoiceId = asString(batch.invoiceId);
      const invoice = invoiceById.get(invoiceId) ?? {};
      const qty = asNumber(batch.quantity_base_qty);
      const rate = asNumber(batch.rate);
      const gstPct = asNumber(batch.gst);
      const taxable = qty * rate;
      const gstAmount = asNumber(batch.totalPrice)
        ? Math.max(0, asNumber(batch.totalPrice) - taxable)
        : (taxable * gstPct) / 100;
      const totalAmount = asNumber(batch.totalPrice) || taxable + gstAmount;

      batches.push({
        productId,
        productName,
        productCode,
        batchNumber: asString(batch.batchNumber),
        mfgDate: asDateOnly(batch.manufactureDate),
        expDate: asDateOnly(batch.expiryDate),
        quantity: qty,
        invoiceNumber: asString(invoice.invoiceNumber),
        invoiceQty: qty,
        unitPrice: rate || undefined,
        gstPct: gstPct || undefined,
        gstAmount: gstAmount || undefined,
        totalAmount: totalAmount || undefined,
        poNumber: poNumber || undefined,
      });
    }
  }

  const primaryInvoice = asRecord(invoicesRaw[0]);

  return {
    id: asString(raw.id),
    grnNo: asString(raw.grnNumber),
    poNumber,
    sourceId: sourceId || undefined,
    supplierId: supplierId || undefined,
    vendorName,
    warehouse: warehouseName,
    warehouseId: asNumber(warehouse.sr_no) || undefined,
    warehouseUuid: warehouseUuid || undefined,
    grnDate: asDateOnly(raw.grnDate),
    totalProducts: items.length,
    totalQty: items.reduce((sum, it) => sum + it.receivedQty, 0),
    status: mapBackendGrnStatus(asString(raw.status)),
    items,
    batches,
    supplierInvoices,
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    invoiceNumber: asString(primaryInvoice.invoiceNumber) || undefined,
    invoiceDate: asDateOnly(primaryInvoice.invoiceDate) || undefined,
    invoiceFileName: asString(primaryInvoice.invoiceFile) || undefined,
    invoiceFileNames: supplierInvoices.map((inv) => inv.fileName),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
    sourceType: mapSourceType(asString(raw.source_type)),
  };
}

export const GrnService = {
  async getPreviewNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.GRN.PREVIEW_NUMBER, {
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return "";
    return asString((data as Record<string, unknown>).grnNumber);
  },

  async getById(id: string, signal?: AbortSignal): Promise<GrnRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.GRN.DETAILS(id), {
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to load GRN details.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapGrnDetail(data as Record<string, unknown>);
  },

  async create(input: CreateGrnPayload): Promise<Record<string, unknown>> {
    const response = await axiosInstance.post(API_ENDPOINTS.WAREHOUSE.GRN.CREATE, input);
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to create GRN.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return data as Record<string, unknown>;
  },

  async update(id: string, input: UpdateGrnPayload): Promise<Record<string, unknown>> {
    const response = await axiosInstance.put(API_ENDPOINTS.WAREHOUSE.GRN.UPDATE(id), input);
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to update GRN.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return data as Record<string, unknown>;
  },
};
