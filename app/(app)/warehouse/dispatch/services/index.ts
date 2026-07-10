import { axiosInstance as api } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export async function getPreviewNumber(): Promise<string> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.PREVIEW_NUMBER);
  const data = response.data?.data;
  return typeof data === "string" ? data : data?.dispatchNumber || data?.dispatch_number || "";
}

export async function getDispatches(params?: any) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.LIST, params);
  return response.data;
}

export async function getDispatchById(id: string) {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.DETAILS(id));
  return response.data?.data;
}

export async function createDispatch(payload: any) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.CREATE, payload);
  return response.data;
}

export async function getDispatchFilterDropdown(fieldName: string) {
  const response = await api.get(`${API_ENDPOINTS.WAREHOUSE.DISPATCH.FILTER_DROPDOWN}?field_name=${fieldName}`);
  return response.data?.data || [];
}

export async function revertDispatch(id: string) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.REVERT(id));
  return response.data;
}

export async function getFilterDropdown(fieldName: string, sourceType?: string) {
  const params: any = { field_name: fieldName };
  if (sourceType) params.source_type = sourceType;
  
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.FILTER_DROPDOWN, { params });
  return response.data?.data || [];
}

export async function getPackingDoneList(payload: any = {}) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.PACKING_DONE.LIST, payload);
  return response.data;
}