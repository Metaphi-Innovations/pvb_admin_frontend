import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface SupplierDropdownItem {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  supplier_type?: {
    supplier_type_id: string;
    supplier_type_name: string;
    initial_code: string;
  } | null;
}

export interface SupplierDetailRecord {
  supplier_id: string;
  supplier_type_id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person?: string | null;
  mobile_country_code?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  gst_registered?: boolean;
  registration_type?: string | null;
  gstin_number?: string | null;
  registered_legal_name?: string | null;
  registered_gst_address?: string | null;
  pan_number?: string | null;
  tan_number?: string | null;
  tds_applicable?: boolean;
  tds_section_id?: string | null;
  msme_registered?: boolean;
  msme_reg_no?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  town?: string | null;
  pincode_master_id?: string | null;
  state?: string | null;
  city?: string | null;
  is_active: boolean;
  supplier_type?: {
    supplier_type_id: string;
    supplier_type_name: string;
    initial_code: string;
  } | null;
}

export const SupplierService = {
  async dropdown(search?: string, limit?: number): Promise<SupplierDropdownItem[]> {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append("search", search);
    if (limit) queryParams.append("limit", String(limit));

    const url = `${API_ENDPOINTS.MASTER.SUPPLIER.DROPDOWN}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await axiosInstance.get(url);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data as SupplierDropdownItem[];
  },

  async view(id: string): Promise<SupplierDetailRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SUPPLIER.DETAILS(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return data as SupplierDetailRecord;
  },
};
