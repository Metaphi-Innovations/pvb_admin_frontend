import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface WarehouseDropdownItem {
  warehouse_id: string;
  warehouse_name: string;
  address?: string | null;
  address_1?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  town?: string | null;
  pincode?: string | null;
  gst_applicable?: boolean;
  gst_number?: string | null;
  registered_legal_name?: string | null;
  contacts?: Array<{
    warehouse_contact_id: string;
    contact_person: string;
    mobile_number: string;
    email_address: string;
    is_primary: boolean;
  }> | null;
}

export const WarehouseService = {
  async dropdown(state?: string): Promise<WarehouseDropdownItem[]> {
    const url = `${API_ENDPOINTS.MASTER.WAREHOUSE.DROPDOWN}${state ? `?state=${encodeURIComponent(state)}` : ""}`;
    const response = await axiosInstance.get(url);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data as WarehouseDropdownItem[];
  },
};
