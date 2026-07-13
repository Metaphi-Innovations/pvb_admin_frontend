import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { QcRecord, QcItem } from "@/app/(app)/warehouse/qc/types";

export interface QcListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, any>;
}

export interface QcListResponse {
  success: boolean;
  data: any[];
  totalRecords: number;
}

export function mapBackendRecordToFrontend(item: any): QcRecord {
  return {
    id: item.id,
    qcNo: item.qcNumber,
    grnNo: item.grnNumber || "",
    vendorName: item.supplierName || "",
    warehouse: item.warehouseName || "",
    poNumber: item.poNumber || "",
    inspectionDate: item.qcDate ? item.qcDate.split("T")[0] : "",
    totalReceivedQty: item.receivedQty || 0,
    totalAcceptedQty: item.acceptedQty || 0,
    totalRejectedQty: item.rejectedQty || 0,
    totalHoldQty: 0,
    status: "completed",
    sourceType: item.sourceType === "stock_transfer" ? "stock_transfer" : "purchase",
    items: item.items || [],
    isEditable: item.isEditable ?? false,
  };
}

export function mapBackendGrnToPendingQc(grn: any): QcRecord {
  const totalReceived = (grn.receivedQty ?? grn.items?.reduce((sum: number, it: any) => sum + Number(it.current_received_base_qty || 0), 0)) || 0;
  return {
    id: grn.id,
    qcNo: "—",
    grnId: grn.id,
    grnNo: grn.grnNumber,
    poNumber: grn.poNumber || "",
    vendorName: grn.supplier?.supplier_name || "",
    warehouse: grn.warehouse?.warehouse_name || "",
    inspectionDate: "",
    totalReceivedQty: totalReceived,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    sourceType: grn.source_type === "STOCK_TRANSFER" ? "stock_transfer" : "purchase",
    items: [],
  };
}

export function mapBackendQcDetailToFrontend(qc: any): QcRecord {
  const qcItems: QcItem[] = qc.items?.map((item: any) => {
    const product = item.productSnapshot || {};
    const batch = item.grnBatch || {};
    return {
      productId: product.product_id || "",
      productName: product.product_name || "",
      productCode: product.product_code || "",
      batchNumber: batch.batchNumber || (item.batchSnapshot?.batchNumber) || "",
      receivedQty: Number(item.received_base_qty || item.receivedQty_base_unit || item.receivedQty || 0),
      acceptedQty: Number(item.accepted_base_qty || item.acceptedQty_base_unit || item.acceptedQty || 0),
      rejectedQty: Number(item.rejected_base_qty || item.rejectedQty_base_unit || item.rejectedQty || 0),
      holdQty: 0,
      grnBatchId: batch.id || item.source_batch_id,
      unitPerPacking: Number(product.packaging_ratio || 10),
      rejectionReason: item.remarks || "",
    };
  }) || [];

  const totalReceived = qcItems.reduce((sum: number, it: any) => sum + it.receivedQty, 0);
  const totalAccepted = qcItems.reduce((sum: number, it: any) => sum + it.acceptedQty, 0);
  const totalRejected = qcItems.reduce((sum: number, it: any) => sum + it.rejectedQty, 0);

  return {
    id: qc.id,
    qcNo: qc.qcNumber,
    grnId: qc.grn?.id || qc.source_id,
    grnNo: qc.grn?.grnNumber || "",
    poNumber: qc.poNumber || qc.grn?.poNumber || "",
    vendorName: qc.grn?.supplier?.supplier_name || "",
    warehouse: qc.grn?.warehouse?.warehouse_name || "",
    inspectionDate: qc.qcDate ? qc.qcDate.split("T")[0] : "",
    totalReceivedQty: totalReceived,
    totalAcceptedQty: totalAccepted,
    totalRejectedQty: totalRejected,
    totalHoldQty: 0,
    status: "completed",
    sourceType: qc.grn?.source_type === "STOCK_TRANSFER" ? "stock_transfer" : "purchase",
    items: qcItems,
    qcRemarks: qc.remarks || "",
    isEditable: qc.isEditable ?? false,
  };
}

export function mapBackendGrnToQcRecord(grn: any): QcRecord {
  const qcItems: QcItem[] = [];

  grn.items?.forEach((item: any) => {
    const product = item.productSnapshot || {};
    item.batches?.forEach((batch: any) => {
      qcItems.push({
        productId: product.product_id || "",
        productName: product.product_name || "",
        productCode: product.product_code || "",
        batchNumber: batch.batchNumber,
        receivedQty: Number(batch.quantity_base_qty || batch.quantity_base_unit || batch.quantity || 0),
        acceptedQty: 0,
        rejectedQty: 0,
        holdQty: 0,
        grnBatchId: batch.id,
        unitPerPacking: Number(product.packaging_ratio || 10),
      });
    });
  });

  const totalReceived = qcItems.reduce((sum, it) => sum + it.receivedQty, 0);

  return {
    id: grn.id,
    qcNo: "—",
    grnId: grn.id,
    grnNo: grn.grnNumber,
    poNumber: grn.poNumber || "",
    vendorName: grn.supplier?.supplier_name || "",
    warehouse: grn.warehouse?.warehouse_name || "",
    inspectionDate: "",
    totalReceivedQty: totalReceived,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    sourceType: grn.source_type === "STOCK_TRANSFER" ? "stock_transfer" : "purchase",
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

  async getFilterDropdown(fieldName: string): Promise<Array<Record<string, string>>> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WAREHOUSE.QC.FILTER_DROPDOWN}?field_name=${fieldName}`
    );
    return response.data?.data || [];
  },

  async getGrnFilterDropdown(fieldName: string): Promise<Array<Record<string, string>>> {
    const response = await axiosInstance.get(
      `/warehouse/grnqc/grn/filter-dropdown?field_name=${fieldName}`
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
    const response = await axiosInstance.post(API_ENDPOINTS.WAREHOUSE.QC.CREATE, payload);
    return response.data;
  },

  async update(id: string, payload: { grnId: string; qcDate: string; remarks?: string; items: any[] }): Promise<any> {
    const response = await axiosInstance.put(API_ENDPOINTS.WAREHOUSE.QC.UPDATE(id), payload);
    return response.data;
  },
  
  async getPreviewNumber(): Promise<{ qcNumber: string }> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.QC.PREVIEW_NUMBER);
    return response.data?.data || { qcNumber: "" };
  },
};
