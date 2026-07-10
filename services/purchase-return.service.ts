import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";
import { amountInWords, round2 } from "@/lib/procurement/utils";
import type { ProcurementAdditionalCharge } from "@/lib/procurement/procurement-line-utils";
import type {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatus,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import { PURCHASE_RETURN_STATUS_CFG } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import { emptyReturnSummary, recalcPurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-calc";
import type { PurchaseOrder } from "@/app/(app)/procurement/purchase-orders/po-data";

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

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  return `${asString(record.first_name)} ${asString(record.last_name)}`.trim();
}

type BackendStatus = PurchaseReturnStatus;

function mapAdditionalCharges(raw: unknown): ProcurementAdditionalCharge[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      uid: `chg-${idx}`,
      chargeName: asString(row.charge_name),
      amount: asNumber(row.amount),
      remarks: asString(row.remarks),
      cgstPct: asNumber(row.cgst_percent),
      sgstPct: asNumber(row.sgst_percent),
      igstPct: asNumber(row.igst_percent),
    };
  });
}

function mapListItem(raw: Record<string, unknown>): PurchaseReturn {
  const supplier = (raw.supplier ?? {}) as Record<string, unknown>;
  const warehouse = (raw.warehouse ?? {}) as Record<string, unknown>;
  const po = (raw.purchase_order ?? {}) as Record<string, unknown>;
  const productsCount = asNumber(((raw._count ?? {}) as Record<string, unknown>).products);
  return {
    id: asString(raw.purchase_order_return_id),
    returnNumber: asString(raw.return_no),
    returnDate: asDateOnly(raw.return_date),
    poId: asString(raw.purchase_order_id),
    poNumber: asString(po.po_no),
    supplierId: asString(raw.supplier_id),
    supplierCode: asString(supplier.supplier_code),
    supplierName: asString(supplier.supplier_name),
    warehouseId: asString(raw.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    initiatedBy: toDisplayName(raw.created_by_user),
    status: asString(raw.status) as BackendStatus,
    overallRemarks: asString(raw.remarks),
    additionalCharges: [],
    summary: {
      ...emptyReturnSummary(),
      productTotal: asNumber(raw.product_total),
      taxableValue: asNumber(raw.taxable_amount),
      additionalChargesTotal: asNumber(raw.additional_charges_amount),
      totalCgst: asNumber(raw.cgst_amount),
      totalSgst: asNumber(raw.sgst_amount),
      totalIgst: asNumber(raw.igst_amount),
      grandTotal: asNumber(raw.grand_total),
      amountInWords: amountInWords(asNumber(raw.grand_total)),
    },
    attachments: [],
    taxSupplyType: "intra",
    items: [],
    totalItems: productsCount,
    totalReturnQty: 0,
    createdBy: toDisplayName(raw.created_by_user),
    createdDate: asDateOnly(raw.created_at),
    updatedBy: toDisplayName(raw.updated_by_user),
    updatedDate: asDateOnly(raw.updated_at),
    activity: [],
  };
}

function mapDetailItem(raw: Record<string, unknown>): PurchaseReturnItem {
  const balanceQty = asNumber(raw.balance_qty);
  const returnQty = asNumber(raw.return_base_qty);
  const selected = returnQty > 0;
  return {
    id: asString(raw.purchase_order_return_product_id) || asString(raw.inventory_rejected_item_id),
    purchaseOrderProductId: asString(raw.purchase_order_product_id) || undefined,
    productId: asString(raw.product_id),
    productCode: asString(raw.product_code),
    productName: asString(raw.product_name),
    batchNumber: asString(raw.batch_no),
    grnNo: asString(raw.grn_no),
    grnId: asString(raw.grn_id),
    grnItemId: asString(raw.grn_item_id) || undefined,
    grnBatchId: asString(raw.grn_batch_id) || undefined,
    inventoryDetailId: asString(raw.inventory_detail_id),
    inventoryRejectedItemId: asString(raw.inventory_rejected_item_id),
    mfgDate: asDateOnly(raw.manufacture_date),
    expDate: asDateOnly(raw.expiry_date),
    caseSize: asNumber(raw.case_size),
    grnReceivedQty: asNumber(raw.grn_received_base_qty),
    qcRejectedQty: asNumber(raw.qc_rejected_base_qty),
    alreadyReturnedQty: asNumber(raw.already_returned_base_qty),
    balanceRejectedQty: balanceQty,
    returnQty,
    lineRemark: asString(raw.line_remark),
    selected,
    lineStatus: balanceQty <= 0 ? "fully_returned" : "available",
    unitPrice: asNumber(raw.rate),
    gstPct: asNumber(raw.gst_percent),
    cgstPct: asNumber(raw.cgst_percent),
    sgstPct: asNumber(raw.sgst_percent),
    igstPct: asNumber(raw.igst_percent),
    grossAmount: asNumber(raw.amount),
    taxableValue: asNumber(raw.amount),
    cgstAmount: round2((asNumber(raw.amount) * asNumber(raw.cgst_percent)) / 100),
    sgstAmount: round2((asNumber(raw.amount) * asNumber(raw.sgst_percent)) / 100),
    igstAmount: round2((asNumber(raw.amount) * asNumber(raw.igst_percent)) / 100),
    taxAmount: asNumber(raw.gst_amount),
    netAmount: round2(asNumber(raw.amount) + asNumber(raw.gst_amount)),
  };
}

function mapDetail(raw: Record<string, unknown>): PurchaseReturn {
  const supplier = (raw.supplier ?? {}) as Record<string, unknown>;
  const warehouse = (raw.warehouse ?? {}) as Record<string, unknown>;
  const po = (raw.purchase_order ?? {}) as Record<string, unknown>;
  const products = Array.isArray(raw.products) ? raw.products : [];
  const items = products.map((row) => mapDetailItem((row ?? {}) as Record<string, unknown>));
  const base: PurchaseReturn = {
    id: asString(raw.purchase_order_return_id),
    returnNumber: asString(raw.return_no),
    returnDate: asDateOnly(raw.return_date),
    poId: asString(raw.purchase_order_id),
    poNumber: asString(po.po_no),
    supplierId: asString(raw.supplier_id),
    supplierCode: asString(supplier.supplier_code),
    supplierName: asString(supplier.supplier_name),
    warehouseId: asString(raw.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    initiatedBy: toDisplayName(raw.created_by_user),
    status: asString(raw.status) as BackendStatus,
    overallRemarks: asString(raw.remarks),
    additionalCharges: mapAdditionalCharges(raw.additional_charges),
    summary: {
      ...emptyReturnSummary(),
      productTotal: asNumber(raw.product_total),
      taxableValue: asNumber(raw.taxable_amount),
      additionalChargesTotal: asNumber(raw.additional_charges_amount),
      totalCgst: asNumber(raw.cgst_amount),
      totalSgst: asNumber(raw.sgst_amount),
      totalIgst: asNumber(raw.igst_amount),
      grandTotal: asNumber(raw.grand_total),
      amountInWords: amountInWords(asNumber(raw.grand_total)),
    },
    attachments: Array.isArray(raw.attachment_urls)
      ? raw.attachment_urls.map((item) => asString(item)).filter(Boolean)
      : [],
    taxSupplyType: "intra",
    items,
    totalItems: items.filter((item) => item.selected).length,
    totalReturnQty: items.reduce((sum, item) => sum + (item.selected ? item.returnQty : 0), 0),
    createdBy: toDisplayName(raw.created_by_user),
    createdDate: asDateOnly(raw.created_at),
    updatedBy: toDisplayName(raw.updated_by_user),
    updatedDate: asDateOnly(raw.updated_at),
    activity: [],
  };
  return recalcPurchaseReturn(base);
}

export interface PurchaseReturnFilterOption {
  label: string;
  value: string;
}

export type PurchaseReturnFilterField =
  | "status"
  | "return_no"
  | "supplier__supplier_name"
  | "purchase_order__po_no"
  | "warehouse__warehouse_name"
  | "created_by_user__username";

function firstFilterValue(value: unknown): string {
  if (Array.isArray(value)) return asString(value[0]).trim();
  return asString(value).trim();
}

function mapFilterOptions(
  data: unknown[],
  fieldName: PurchaseReturnFilterField,
): PurchaseReturnFilterOption[] {
  const options: PurchaseReturnFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const value = asString(record[fieldName]).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "status") {
      const cfg = PURCHASE_RETURN_STATUS_CFG[value];
      options.push({
        label: cfg?.label ?? value.replace(/_/g, " "),
        value,
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildPurchaseReturnApiFilters(filters: FilterState): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {};

  const status = firstFilterValue(filters.status);
  if (status) apiFilters.status = status;

  const supplierName = firstFilterValue(filters.supplierName);
  if (supplierName) {
    apiFilters.supplier = { supplier_name: supplierName };
  }

  const poNumber = firstFilterValue(filters.poNumber);
  if (poNumber) {
    apiFilters.purchase_order = { po_no: poNumber };
  }

  const warehouseName = firstFilterValue(filters.warehouseName);
  if (warehouseName) {
    apiFilters.warehouse = { warehouse_name: warehouseName };
  }

  const initiatedBy = firstFilterValue(filters.initiatedBy);
  if (initiatedBy) {
    apiFilters.created_by_user = { username: initiatedBy };
  }

  const returnDate = filters.returnDate;
  if (returnDate && typeof returnDate === "object" && !Array.isArray(returnDate)) {
    const range = returnDate as { fromDate?: string; toDate?: string };
    if (range.fromDate || range.toDate) {
      apiFilters.range = {
        return_date: {
          ...(range.fromDate ? { from: range.fromDate } : {}),
          ...(range.toDate ? { to: range.toDate } : {}),
        },
      };
    }
  }

  return apiFilters;
}

export function buildPurchaseReturnOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;
  const map: Record<string, string> = {
    returnNumber: "returnNo",
    returnDate: "returnDate",
    poNumber: "poNo",
    supplierName: "supplierName",
    totalItems: "itemCount",
    grandTotal: "grandTotal",
    status: "status",
    initiatedBy: "createdBy",
  };
  const key = map[sortKey];
  if (!key) return undefined;
  return direction === "desc" ? `-${key}` : key;
}

function buildListQuery(page: number, pageSize: number, search: string, ordering?: string): string {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(pageSize));
  if (search) query.set("search", search);
  if (ordering) query.set("ordering", ordering);
  return query.toString();
}

function assertDataObject(payload: Record<string, unknown>, fallback: string): Record<string, unknown> {
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(fallback);
  }
  return data as Record<string, unknown>;
}

export interface PurchaseReturnListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PurchaseReturnListResult {
  items: PurchaseReturn[];
  total: number;
}

export const PurchaseReturnService = {
  async list(params: PurchaseReturnListParams): Promise<PurchaseReturnListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.LIST}?${buildListQuery(
        params.page,
        params.pageSize,
        params.search,
        params.ordering,
      )}`,
      { filters: params.apiFilters ?? {}, search: params.search || undefined },
      { signal: params.signal },
    );
    const payload = response.data as Record<string, unknown>;
    const rows = Array.isArray(payload.data) ? payload.data : [];
    return {
      items: rows.map((row) => mapListItem((row ?? {}) as Record<string, unknown>)),
      total: asNumber(payload.totalRecords) || rows.length,
    };
  },

  async getFilterDropdown(
    fieldName: PurchaseReturnFilterField,
    signal?: AbortSignal,
  ): Promise<PurchaseReturnFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.FILTER_DROPDOWN,
      {
        params: { field_name: fieldName },
        signal,
      },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return mapFilterOptions(data, fieldName);
  },

  async getById(id: string, signal?: AbortSignal): Promise<PurchaseReturn> {
    const response = await axiosInstance.get(API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.DETAILS(id), { signal });
    const payload = response.data as Record<string, unknown>;
    return mapDetail(assertDataObject(payload, "Unexpected purchase return details response."));
  },

  async getPreviewNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.PREVIEW_NUMBER, { signal });
    const payload = response.data as Record<string, unknown>;
    const data = assertDataObject(payload, "Unexpected purchase return preview response.");
    return asString(data.return_no);
  },

  async getEligibleItems(input: {
    purchaseOrderId: string;
    warehouseId?: string;
    excludeReturnId?: string;
    signal?: AbortSignal;
  }): Promise<PurchaseReturnItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.ELIGIBLE_ITEMS, {
      params: {
        purchase_order_id: input.purchaseOrderId,
        warehouse_id: input.warehouseId || undefined,
        exclude_return_id: input.excludeReturnId || undefined,
      },
      signal: input.signal,
    });
    const payload = response.data as Record<string, unknown>;
    const rows = Array.isArray(payload.data) ? payload.data : [];
    return rows.map((row) => {
      const raw = (row ?? {}) as Record<string, unknown>;
      const balanceQty = asNumber(raw.balance_base_qty);
      return {
        id: asString(raw.inventory_rejected_item_id),
        purchaseOrderProductId: asString(raw.purchase_order_product_id) || undefined,
        productId: asString(raw.product_id),
        productCode: asString(raw.product_code),
        productName: asString(raw.product_name),
        batchNumber: asString(raw.batch_no),
        grnNo: asString(raw.grn_no),
        grnId: asString(raw.grn_id),
        grnItemId: asString(raw.grn_item_id) || undefined,
        grnBatchId: asString(raw.grn_batch_id) || undefined,
        inventoryDetailId: asString(raw.inventory_detail_id),
        inventoryRejectedItemId: asString(raw.inventory_rejected_item_id),
        mfgDate: asDateOnly(raw.manufacture_date),
        expDate: asDateOnly(raw.expiry_date),
        caseSize: asNumber(raw.case_size),
        grnReceivedQty: asNumber(raw.grn_received_base_qty),
        qcRejectedQty: asNumber(raw.qc_rejected_base_qty),
        alreadyReturnedQty: asNumber(raw.already_returned_base_qty),
        balanceRejectedQty: balanceQty,
        returnQty: 0,
        lineRemark: "",
        selected: false,
        lineStatus: balanceQty <= 0 ? "fully_returned" : "available",
        unitPrice: asNumber(raw.rate),
        gstPct: asNumber(raw.gst_percent),
        cgstPct: asNumber(raw.cgst_percent),
        sgstPct: asNumber(raw.sgst_percent),
        igstPct: asNumber(raw.igst_percent),
        grossAmount: 0,
        taxableValue: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        taxAmount: 0,
        netAmount: 0,
      };
    });
  },

  buildCreateFromPo(po: PurchaseOrder, returnNo: string, eligibleItems: PurchaseReturnItem[]): PurchaseReturn {
    return recalcPurchaseReturn({
      id: "",
      returnNumber: returnNo,
      returnDate: asDateOnly(new Date().toISOString()),
      poId: String(po.id),
      poNumber: po.poNumber,
      supplierId: asString(po.supplierId),
      supplierCode: "",
      supplierName: po.supplierName,
      warehouseId: asString(po.warehouseId),
      warehouseName: po.warehouseName,
      initiatedBy: "",
      status: "Draft",
      overallRemarks: "",
      additionalCharges: [],
      summary: emptyReturnSummary(),
      attachments: [],
      taxSupplyType: "intra",
      items: eligibleItems,
      totalItems: 0,
      totalReturnQty: 0,
      createdBy: "",
      createdDate: "",
      updatedBy: "",
      updatedDate: "",
      activity: [],
    }, po);
  },

  toWritePayload(record: PurchaseReturn): Record<string, unknown> {
    return {
      return_no: record.returnNumber || undefined,
      purchase_order_id: record.poId,
      supplier_id: record.supplierId,
      warehouse_id: record.warehouseId,
      return_date: record.returnDate,
      remarks: record.overallRemarks || undefined,
      additional_charges: (record.additionalCharges ?? []).map((item) => ({
        charge_name: item.chargeName,
        charge_type: "Fixed",
        value: item.amount,
        amount: item.amount,
        cgst_percent: item.cgstPct ?? 0,
        sgst_percent: item.sgstPct ?? 0,
        igst_percent: item.igstPct ?? 0,
        remarks: item.remarks ?? "",
      })),
      product_total: record.summary.productTotal,
      additional_charges_amount: record.summary.additionalChargesTotal,
      taxable_amount: record.summary.taxableValue,
      cgst_amount: record.summary.totalCgst,
      sgst_amount: record.summary.totalSgst,
      igst_amount: record.summary.totalIgst,
      gst_amount: round2(record.summary.totalCgst + record.summary.totalSgst + record.summary.totalIgst),
      grand_total: record.summary.grandTotal,
      attachment_urls: record.attachments ?? [],
      products: record.items
        .filter((item) => item.selected && item.returnQty > 0)
        .map((item) => ({
          purchase_order_product_id: item.purchaseOrderProductId || undefined,
          product_id: item.productId,
          inventory_detail_id: item.inventoryDetailId,
          inventory_rejected_item_id: item.inventoryRejectedItemId,
          grn_id: item.grnId,
          grn_item_id: item.grnItemId || undefined,
          grn_batch_id: item.grnBatchId || undefined,
          grn_no: item.grnNo || undefined,
          product_code: item.productCode || undefined,
          product_name: item.productName || undefined,
          batch_no: item.batchNumber || undefined,
          manufacture_date: item.mfgDate || undefined,
          expiry_date: item.expDate || undefined,
          case_size: item.caseSize,
          grn_received_base_qty: item.grnReceivedQty,
          qc_rejected_base_qty: item.qcRejectedQty,
          already_returned_base_qty: item.alreadyReturnedQty,
          balance_base_qty: item.balanceRejectedQty,
          return_base_qty: item.returnQty,
          return_unit: item.returnCases && item.returnCases > 0 ? "CASE" : (item.returnLooseQty && item.returnLooseQty > 0 ? "PIECE" : undefined),
          return_value: item.returnCases && item.returnCases > 0 ? item.returnCases : (item.returnLooseQty && item.returnLooseQty > 0 ? item.returnLooseQty : undefined),
          rate: item.unitPrice,
          gst_percent: item.gstPct || round2(item.cgstPct + item.sgstPct + item.igstPct),
          cgst_percent: item.cgstPct,
          sgst_percent: item.sgstPct,
          igst_percent: item.igstPct,
          gst_amount: item.taxAmount,
          amount: item.taxableValue || item.grossAmount,
          return_reason: "QC_REJECTED",
          line_remark: item.lineRemark || undefined,
        })),
    };
  },

  async create(record: PurchaseReturn): Promise<PurchaseReturn> {
    const payload = this.toWritePayload(record);
    const response = await axiosInstance.post(API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.CREATE, payload);
    const body = response.data as Record<string, unknown>;
    return mapDetail(assertDataObject(body, "Unexpected create purchase return response."));
  },

  async update(id: string, record: PurchaseReturn): Promise<PurchaseReturn> {
    const payload = this.toWritePayload(record);
    const response = await axiosInstance.put(API_ENDPOINTS.PROCUREMENT.PURCHASE_RETURN.UPDATE(id), payload);
    const body = response.data as Record<string, unknown>;
    return mapDetail(assertDataObject(body, "Unexpected update purchase return response."));
  },
};

