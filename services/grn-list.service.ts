import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";
import type { GrnRecord, GrnStatus } from "@/app/(app)/warehouse/grn/shared/types";
import {
  getGrnStatusLabel,
  mapBackendGrnStatus,
  mapFrontendGrnStatusToBackend,
  type BackendGrnSourceType,
} from "@/lib/warehouse/grn-status";
import type { GrnTabApiContext } from "@/lib/warehouse/grn-list-config";

export interface GrnListItem extends GrnRecord {
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
}

export interface GrnListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  tabContext: GrnTabApiContext;
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface GrnListResult {
  items: GrnListItem[];
  total: number;
}

export interface GrnFilterOption {
  label: string;
  value: string;
}

export type GrnFilterField =
  | "grnNumber"
  | "status"
  | "supplier__supplier_name"
  | "warehouse__warehouse_name"
  | "po_no";

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

function firstFilterValue(value: unknown): string {
  if (Array.isArray(value)) return asString(value[0]).trim();
  return asString(value).trim();
}

function mapSourceTypeToFrontend(
  sourceType: BackendGrnSourceType,
): GrnRecord["sourceType"] {
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

function mapListItem(
  raw: Record<string, unknown>,
  tabContext: GrnTabApiContext,
): GrnListItem {
  const supplier =
    raw.supplier &&
    typeof raw.supplier === "object" &&
    !Array.isArray(raw.supplier)
      ? (raw.supplier as Record<string, unknown>)
      : {};
  const warehouse =
    raw.warehouse &&
    typeof raw.warehouse === "object" &&
    !Array.isArray(raw.warehouse)
      ? (raw.warehouse as Record<string, unknown>)
      : {};
  const purchaseOrder =
    raw.purchase_order &&
    typeof raw.purchase_order === "object" &&
    !Array.isArray(raw.purchase_order)
      ? (raw.purchase_order as Record<string, unknown>)
      : raw.purchaseOrder &&
          typeof raw.purchaseOrder === "object" &&
          !Array.isArray(raw.purchaseOrder)
        ? (raw.purchaseOrder as Record<string, unknown>)
        : {};

  const status = mapBackendGrnStatus(asString(raw.status));
  const receivedQty = asNumber(raw.receivedQty);
  const acceptedQty = asNumber(raw.acceptedQty);
  const rejectedQty = asNumber(raw.rejectedQty);
  const grnNo = asString(raw.grnNumber);
  const warehouseName =
    asString(warehouse.warehouse_name) ||
    asString(raw.warehouseName) ||
    asString(raw.warehouse_name);
  const supplierName = asString(supplier.supplier_name);
  const poNumber =
    asString(raw.poNumber) ||
    asString(raw.po_no) ||
    asString(raw.purchaseOrderNumber) ||
    asString(raw.purchase_order_number) ||
    asString(purchaseOrder.po_no) ||
    asString(purchaseOrder.poNumber) ||
    "";

  return {
    id: asString(raw.id),
    grnNo,
    poNumber,
    vendorName: supplierName,
    warehouse: warehouseName,
    warehouseId: asNumber(warehouse.sr_no) || undefined,
    grnDate: asDateOnly(raw.grnDate),
    totalProducts: 0,
    totalQty: receivedQty,
    status,
    items: [],
    batches: [],
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    sourceType: mapSourceTypeToFrontend(tabContext.sourceType),
    stockTransferNo: tabContext.sourceType === "STOCK_TRANSFER" ? grnNo : undefined,
    fromWarehouse: tabContext.sourceType === "STOCK_TRANSFER" ? supplierName || "—" : undefined,
    toWarehouse: tabContext.sourceType === "STOCK_TRANSFER" ? warehouseName : undefined,
    dispatchDate: tabContext.sourceType === "STOCK_TRANSFER" ? asDateOnly(raw.grnDate) : undefined,
    salesReturnNo: tabContext.sourceType === "SALES_RETURN" ? "" : undefined,
    sampleReturnNo: tabContext.sourceType === "SAMPLE_RETURN" ? "" : undefined,
    customerName: "",
    receivedQty,
    acceptedQty,
    rejectedQty,
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: GrnFilterField,
): GrnFilterOption[] {
  const options: GrnFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const value = asString(record[fieldName]).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "status") {
      const frontendStatus = mapBackendGrnStatus(value) as GrnStatus;
      options.push({
        label: getGrnStatusLabel(frontendStatus),
        value: frontendStatus,
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function buildListQueryString(params: GrnListParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("page_size", String(params.pageSize));
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.search) query.set("search", params.search);
  return query.toString();
}

export function buildGrnApiFilters(
  filters: FilterState,
  tabContext: GrnTabApiContext,
  destinationWarehouse?: string | null,
): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {
    source_type: tabContext.sourceType,
  };

  if (tabContext.status) {
    apiFilters.status = tabContext.status;
  }

  const grnNumber = firstFilterValue(filters.grnNo);
  if (grnNumber) {
    apiFilters.grnNumber = grnNumber;
  }

  const vendorName = firstFilterValue(filters.vendorName);
  if (vendorName) {
    apiFilters.supplier = { supplier_name: vendorName };
  }

  const poNumber = firstFilterValue(filters.poNumber);
  if (poNumber) {
    apiFilters.po_no = poNumber;
  }

  const warehouseFilter = filters.warehouse;
  if (warehouseFilter) {
    const warehouseName = firstFilterValue(warehouseFilter);
    if (warehouseName) {
      apiFilters.warehouse = { warehouse_name: warehouseName };
    }
  }

  if (destinationWarehouse && destinationWarehouse !== "All") {
    apiFilters.warehouse = { warehouse_name: destinationWarehouse };
  }

  const columnStatus = firstFilterValue(filters.status);
  if (columnStatus && !tabContext.status) {
    const backendStatus = mapFrontendGrnStatusToBackend(columnStatus);
    if (backendStatus) {
      apiFilters.status = backendStatus;
    }
  }

  const grnDate = filters.grnDate;
  if (grnDate && typeof grnDate === "object" && !Array.isArray(grnDate)) {
    const range = grnDate as { fromDate?: string; toDate?: string };
    if (range.fromDate || range.toDate) {
      apiFilters.range = {
        grnDate: {
          ...(range.fromDate ? { from: range.fromDate } : {}),
          ...(range.toDate ? { to: range.toDate } : {}),
        },
      };
    }
  }

  return apiFilters;
}

export function buildGrnOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;

  const fieldMap: Record<string, string> = {
    grnNo: "grnNumber",
    grnDate: "grnDate",
    poNumber: "po_no",
    vendorName: "supplier__supplier_name",
    warehouse: "warehouse__warehouse_name",
    status: "status",
    receivedQty: "grnNumber",
    acceptedQty: "grnNumber",
    rejectedQty: "grnNumber",
    totalQty: "grnNumber",
    salesReturnNo: "grnNumber",
    sampleReturnNo: "grnNumber",
    customerName: "supplier__supplier_name",
    stockTransferNo: "grnNumber",
    fromWarehouse: "supplier__supplier_name",
    toWarehouse: "warehouse__warehouse_name",
    dispatchDate: "grnDate",
    products: "grnNumber",
    dispatchedQty: "grnNumber",
    displayStatus: "status",
  };

  const backendKey = fieldMap[sortKey];
  if (!backendKey) return undefined;

  return direction === "desc" ? `-${backendKey}` : backendKey;
}

export const GRN_FILTER_COLUMN_MAP: Record<string, GrnFilterField> = {
  grnNo: "grnNumber",
  status: "status",
  vendorName: "supplier__supplier_name",
  warehouse: "warehouse__warehouse_name",
  poNumber: "po_no",
};

export const GrnListService = {
  async list(params: GrnListParams): Promise<GrnListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.GRN.LIST}?${buildListQueryString(params)}`,
      {
        filters: params.apiFilters ?? {},
      },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row) =>
      mapListItem((row ?? {}) as Record<string, unknown>, params.tabContext),
    );
    const totalRecords = Number(payload.totalRecords);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async getFilterDropdown(
    fieldName: GrnFilterField,
    signal?: AbortSignal,
  ): Promise<GrnFilterOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.GRN.FILTER, {
      params: { field_name: fieldName },
      signal,
    });

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return mapFilterOptions(data, fieldName);
  },
};
