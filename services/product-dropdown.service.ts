import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface ProductDropdownItem {
  product_id: string;
  product_code: string;
  product_name: string;
  scientific_name?: string | null;
  category?: {
    id: string;
    categoryName: string;
  } | null;
  segment?: {
    segment_id: string;
    segment_code: string;
    segment_name: string;
  } | null;
  formulation?: {
    formulation_id: string;
    formulation_code: string;
    formulation_name: string;
  } | null;
  hsn?: {
    id: string;
    hsnDescription: string;
  } | null;
  gst_rate?: {
    id: string;
    gstPercentage: string | number;
  } | null;
  sku?: string | null;
  unit?: string | null;
  packing_unit?: string | null;
  unit_per_packing?: string | number | null;
  pack_size?: string | number | null;
}

export const ProductDropdownService = {
  async dropdown(): Promise<ProductDropdownItem[]> {
    const url = API_ENDPOINTS.MASTER.PRODUCT.DROPDOWN;
    const response = await axiosInstance.get(url);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data as ProductDropdownItem[];
  },
};
