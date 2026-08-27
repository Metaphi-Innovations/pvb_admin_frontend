import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { QcRecord, QcItem } from "@/app/(app)/warehouse/qc/types";
import { resolvePackingSize } from "@/lib/warehouse/grn-quantity";
import { resolveNetWeightPerPack } from "@/lib/procurement/procurement-line-utils";

export interface QcListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, any>;
}

import { GrnSourceFilter } from "@/lib/warehouse/grn-source";

export interface QcListResponse {
  success: boolean;
  data: any[];
  totalRecords: number;
}

const mapSourceType = (type: string | null | undefined): GrnSourceFilter => {
  if (!type) return "purchase";
  const upper = type.toUpperCase();
  if (upper === "STOCK_TRANSFER") return "stock_transfer";
  if (upper === "SALES_RETURN") return "sales_return";
  if (upper === "SAMPLE_RETURN") return "sample_return";
  return "purchase";
};

function asText(value: unknown): string {
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asDateOnly(value: unknown): string {
  const raw = asText(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function mapProductWeightMeta(product: Record<string, unknown>, unitPerPacking: number) {
  const packSize =
    asNumber(product.pack_size) ||
    asNumber(product.packSize) ||
    asNumber(product.unit_size) ||
    undefined;
  const baseUnit =
    asText(product.base_unit) ||
    asText(product.unit) ||
    "Unit";
  return resolveNetWeightPerPack({
    netWeight:
      asNumber(product.net_weight) ||
      asNumber(product.netWeight) ||
      asNumber(product.net_weight_per_pack) ||
      null,
    packSize: packSize || null,
    unitPerPacking,
    baseUnit,
  });
}

function mapGrnLineToQcItem(
  batch: Record<string, unknown>,
  item: Record<string, unknown>,
  overrides: Partial<QcItem> = {},
): QcItem {
  const product = asRecord(item.productSnapshot);
  const unitPerPacking =
    resolvePackingSize({ productSnapshot: product }) ||
    asNumber(product.unit_per_packing || product.unitPerPacking || product.packaging_ratio) ||
    10;
  const weightMeta = mapProductWeightMeta(product, unitPerPacking);

  return {
    productId: asText(product.product_id),
    productName: asText(product.product_name),
    productCode: asText(product.product_code),
    batchNumber: asText(batch.batchNumber),
    receivedQty: asNumber(
      batch.quantity_base_qty || batch.quantity_base_unit || batch.quantity,
    ),
    acceptedQty: 0,
    rejectedQty: 0,
    holdQty: 0,
    grnBatchId: asText(batch.id),
    unitPerPacking,
    quantityType: asText(item.quantity_type) || null,
    mfgDate: asDateOnly(batch.manufactureDate),
    expDate: asDateOnly(batch.expiryDate),
    netWeightPerPack: weightMeta?.netWeightPerPack,
    weightUom: weightMeta?.weightUom,
    ...overrides,
  };
}

function mapQcDetailItemToFrontend(item: Record<string, unknown>): QcItem {
  const product = asRecord(item.productSnapshot);
  const batch = asRecord(item.grnBatch);
  const batchSnap = asRecord(item.batchSnapshot);
  const unitPerPacking =
    resolvePackingSize({ productSnapshot: product }) ||
    asNumber(product.unit_per_packing || product.unitPerPacking || product.packaging_ratio) ||
    10;
  const weightMeta = mapProductWeightMeta(product, unitPerPacking);

  return {
    productId: asText(product.product_id),
    productName: asText(product.product_name),
    productCode: asText(product.product_code),
    batchNumber: asText(batch.batchNumber || batchSnap.batchNumber),
    receivedQty: asNumber(
      item.received_base_qty || item.receivedQty_base_unit || item.receivedQty,
    ),
    acceptedQty: asNumber(
      item.accepted_base_qty || item.acceptedQty_base_unit || item.acceptedQty,
    ),
    rejectedQty: asNumber(
      item.rejected_base_qty || item.rejectedQty_base_unit || item.rejectedQty,
    ),
    holdQty: 0,
    grnBatchId: asText(batch.id || item.source_batch_id),
    unitPerPacking,
    rejectionReason: asText(item.remarks),
    quantityType: asText(item.quantity_type) || null,
    mfgDate: asDateOnly(batch.manufactureDate || batchSnap.manufactureDate),
    expDate: asDateOnly(batch.expiryDate || batchSnap.expiryDate),
    netWeightPerPack: weightMeta?.netWeightPerPack,
    weightUom: weightMeta?.weightUom,
  };
}

function resolveVendorName(payload: any): string {
  const snap = payload?.grn?.supplierSnapshot || payload?.supplierSnapshot;
  const snapName =
    snap && typeof snap === "object" ? asText(snap.supplier_name || snap.warehouse_name) : "";
  return (
    asText(payload?.supplierName) ||
    asText(payload?.fromWarehouse) ||
    asText(payload?.grn?.supplier?.supplier_name) ||
    asText(payload?.supplier?.supplier_name) ||
    snapName ||
    asText(payload?.customer_name) ||
    asText(payload?.customerName) ||
    ""
  );
}

export function mapBackendRecordToFrontend(item: any): QcRecord {
  const vendorName = resolveVendorName(item);
  return {
    id: item.id,
    qcNo: item.qcNumber,
    grnNo: item.grnNumber || "",
    vendorName,
    warehouse: item.warehouseName || "",
    toWarehouse: item.warehouseName || item.toWarehouse || "",
    fromWarehouse: item.fromWarehouse || vendorName || "",
    poNumber: item.poNumber || "",
    stockTransferNo: item.poNumber || item.stockTransferNo || "",
    inspectionDate: item.qcDate ? item.qcDate.split("T")[0] : "",
    totalReceivedQty: item.receivedQty || 0,
    totalAcceptedQty: item.acceptedQty || 0,
    totalRejectedQty: item.rejectedQty || 0,
    totalHoldQty: 0,
    status: "completed",
    sourceType: mapSourceType(item.sourceType),
    items: item.items || [],
    isEditable: item.isEditable ?? false,
  };
}

export function mapBackendGrnToPendingQc(grn: any): QcRecord {
  const qcItems: QcItem[] = [];
  grn.items?.forEach((item: any) => {
    item.batches?.forEach((batch: any) => {
      qcItems.push(mapGrnLineToQcItem(batch, item));
    });
  });

  const totalReceived = qcItems.reduce((sum, it) => sum + it.receivedQty, 0) || (grn.receivedQty ?? 0);
  const vendorName = resolveVendorName(grn);

  return {
    id: grn.id,
    qcNo: "—",
    grnId: grn.id,
    grnNo: grn.grnNumber,
    poNumber: grn.sales_return_no || grn.sample_return_no || grn.poNumber || grn.po_no || "",
    stockTransferNo: grn.stockTransferNo || grn.poNumber || grn.po_no || "",
    vendorName,
    fromWarehouse: grn.fromWarehouse || vendorName || "",
    warehouse: grn.warehouse?.warehouse_name || "",
    toWarehouse: grn.warehouse?.warehouse_name || grn.toWarehouse || "",
    warehouseId: grn.warehouseId || grn.warehouse_id || grn.warehouse?.warehouse_id || "",
    inspectionDate: "",
    totalReceivedQty: totalReceived,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    sourceType: mapSourceType(grn.source_type),
    items: qcItems,
  };
}

export function mapBackendQcDetailToFrontend(qc: any): QcRecord {
  const qcItems: QcItem[] =
    qc.items?.map((item: any) => mapQcDetailItemToFrontend(item)) || [];

  const totalReceived = qcItems.reduce((sum: number, it: any) => sum + it.receivedQty, 0);
  const totalAccepted = qcItems.reduce((sum: number, it: any) => sum + it.acceptedQty, 0);
  const totalRejected = qcItems.reduce((sum: number, it: any) => sum + it.rejectedQty, 0);
  const vendorName = resolveVendorName(qc);

  return {
    id: qc.id,
    qcNo: qc.qcNumber,
    grnId: qc.grn?.id || qc.source_id,
    grnNo: qc.grn?.grnNumber || "",
    poNumber:
      qc.poNumber ||
      qc.grn?.poNumber ||
      qc.grn?.sales_return_no ||
      qc.grn?.salesReturnNo ||
      qc.grn?.sample_return_no ||
      qc.grn?.sampleReturnNo ||
      qc.grn?.stockTransferNo ||
      "",
    stockTransferNo: qc.poNumber || qc.stockTransferNo || qc.grn?.stockTransferNo || "",
    vendorName,
    fromWarehouse: qc.fromWarehouse || vendorName || "",
    warehouse: qc.grn?.warehouse?.warehouse_name || "",
    toWarehouse: qc.grn?.warehouse?.warehouse_name || qc.toWarehouse || "",
    warehouseId:
      qc.grn?.warehouseId ||
      qc.grn?.warehouse_id ||
      qc.grn?.warehouse?.warehouse_id ||
      "",
    inspectionDate: qc.qcDate ? qc.qcDate.split("T")[0] : "",
    totalReceivedQty: totalReceived,
    totalAcceptedQty: totalAccepted,
    totalRejectedQty: totalRejected,
    totalHoldQty: 0,
    status: "completed",
    sourceType: mapSourceType(qc.source_type || qc.grn?.source_type),
    items: qcItems,
    qcRemarks: qc.remarks || "",
    isEditable: qc.isEditable ?? false,
  };
}

export function mapBackendGrnToQcRecord(grn: any): QcRecord {
  const qcItems: QcItem[] = [];

  grn.items?.forEach((item: any) => {
    item.batches?.forEach((batch: any) => {
      qcItems.push(mapGrnLineToQcItem(batch, item));
    });
  });

  const totalReceived = qcItems.reduce((sum, it) => sum + it.receivedQty, 0);
  const vendorName = resolveVendorName(grn);

  return {
    id: grn.id,
    qcNo: "—",
    grnId: grn.id,
    grnNo: grn.grnNumber,
    poNumber:
      grn.sales_return_no ||
      grn.salesReturnNo ||
      grn.sample_return_no ||
      grn.sampleReturnNo ||
      grn.stockTransferNo ||
      grn.poNumber ||
      grn.po_no ||
      "",
    stockTransferNo: grn.stockTransferNo || grn.poNumber || grn.po_no || "",
    vendorName,
    fromWarehouse: grn.fromWarehouse || vendorName || "",
    warehouse: grn.warehouse?.warehouse_name || "",
    toWarehouse: grn.warehouse?.warehouse_name || grn.toWarehouse || "",
    warehouseId: grn.warehouseId || grn.warehouse_id || grn.warehouse?.warehouse_id || "",
    inspectionDate: "",
    totalReceivedQty: totalReceived,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    sourceType: mapSourceType(grn.source_type),
    items: qcItems,
  };
}

export const QcService = {
  async list(params: QcListParams = {}): Promise<{ success: boolean; data: QcRecord[]; totalRecords: number }> {
    const { page, page_size, search, ordering, filters } = params;
    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.QC.LIST,
      { filters },
      {
        params: {
          page,
          page_size: page_size,
          search,
          ordering,
        },
      }
    );
    const backendData = response.data?.data || [];
    const totalRecords = response.data?.totalRecords || 0;
    const mapped = backendData.map(mapBackendRecordToFrontend);
    return {
      success: true,
      data: mapped,
      totalRecords,
    };
  },

  async listPending(params: QcListParams = {}): Promise<{ success: boolean; data: QcRecord[]; totalRecords: number }> {
    const { page, page_size, search, ordering, filters } = params;
    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.GRN.LIST,
      {
        filters: {
          ...filters,
          status: "QC_PENDING",
        },
      },
      {
        params: {
          page,
          page_size,
          search,
          ordering,
        },
      }
    );
    const backendData = response.data?.data || [];
    const totalRecords = response.data?.totalRecords || 0;
    const mapped = backendData.map(mapBackendGrnToPendingQc);
    return {
      success: true,
      data: mapped,
      totalRecords,
    };
  },

  async getFilterDropdown(fieldName: string, sourceType?: string): Promise<Array<Record<string, string>>> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WAREHOUSE.QC.FILTER_DROPDOWN}?field_name=${fieldName}${sourceType ? `&source_type=${sourceType}` : ""}&_t=${Date.now()}`
    );
    return response.data?.data || [];
  },

  async getGrnFilterDropdown(fieldName: string, sourceType?: string, status?: string): Promise<Array<Record<string, string>>> {
    const response = await axiosInstance.get(
      `/warehouse/grnqc/grn/filter?field_name=${fieldName}${sourceType ? `&source_type=${sourceType}` : ""}${status ? `&status=${status}` : ""}&_t=${Date.now()}`
    );
    return response.data?.data || [];
  },

  async get(id: string): Promise<QcRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.QC.DETAILS(id));
    return mapBackendQcDetailToFrontend(response.data?.data);
  },

  async getGrn(id: string): Promise<QcRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.GRN.DETAILS(id));
    return mapBackendGrnToQcRecord(response.data?.data);
  },

  async create(payload: { grnId: string; qcDate: string; remarks?: string; items: any[] }): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.WAREHOUSE.QC.CREATE, payload, { timeout: 120000 });
    return response.data;
  },

  async update(id: string, payload: { grnId: string; qcDate: string; remarks?: string; items: any[] }): Promise<any> {
    const response = await axiosInstance.put(API_ENDPOINTS.WAREHOUSE.QC.UPDATE(id), payload, { timeout: 120000 });
    return response.data;
  },
  
  async getPreviewNumber(warehouseId?: string | null): Promise<{ qcNumber: string }> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.WAREHOUSE.QC.PREVIEW_NUMBER,
      {
        params: warehouseId ? { warehouse_id: warehouseId } : undefined,
        headers: { "Cache-Control": "no-cache" },
      },
    );
    return response.data?.data || { qcNumber: "" };
  },
};
