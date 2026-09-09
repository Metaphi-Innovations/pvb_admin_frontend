import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

const POSTAL = API_ENDPOINTS.USER_MANAGEMENT.POSTAL_MASTER.POSTAL;

export type PostalLocationType = "CITY" | "VILLAGE";

export interface PostalListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PostalListRecord {
  id: string;
  mappingId: string;
  pincode: string;
  pincodeId: string;
  officeName: string;
  stateId: string;
  stateName: string;
  stateCode: string;
  districtId: string;
  districtName: string;
  districtCode: string;
  locationId: string;
  locationName: string;
  locationType: PostalLocationType | "";
  /** City column: city or village name */
  city: string;
  status: "active" | "inactive";
}

export interface PostalListResult {
  items: PostalListRecord[];
  total: number;
}

export interface PostalSummary {
  totalMappings: number;
  activeMappings: number;
  inactiveMappings: number;
  citiesLinked: number;
  villagesLinked: number;
}

export interface PostalLookupOption {
  id: string;
  label: string;
  code?: string;
  locationType?: PostalLocationType;
}

export interface CreatePostalMappingPayload {
  location_id: string;
  pincode_id?: string;
  pincode?: string;
}

export interface PostalExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  pincode: "pincode",
  stateName: "stateName",
  districtName: "districtName",
  district: "districtName",
  city: "locationName",
  locationName: "locationName",
  status: "status",
};

export function sortStateToOrdering(
  key: string,
  direction: "asc" | "desc" | "none",
): string {
  if (!key || direction === "none") return "";
  const field = SORT_KEY_TO_ORDERING[key];
  if (!field) return "";
  return direction === "desc" ? `-${field}` : field;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "active" | "inactive" {
  return value === true || value === "active" ? "active" : "inactive";
}

function mapItem(raw: Record<string, unknown>): PostalListRecord {
  const locationName = asString(raw.location_name);
  const locationType = asString(raw.location_type) as PostalLocationType | "";
  return {
    id: asString(raw.mapping_id),
    mappingId: asString(raw.mapping_id),
    pincode: asString(raw.pincode),
    pincodeId: asString(raw.pincode_id),
    officeName: asString(raw.officename),
    stateId: asString(raw.state_id),
    stateName: asString(raw.state_name),
    stateCode: asString(raw.state_code),
    districtId: asString(raw.district_id),
    districtName: asString(raw.district_name),
    districtCode: asString(raw.district_code),
    locationId: asString(raw.location_id),
    locationName,
    locationType,
    city: locationName,
    status: toStatus(raw.status),
  };
}

function unwrapData(payload: Record<string, unknown>): unknown {
  return payload.data;
}

function buildStatusFilters(
  status: PostalListParams["status"],
  apiFilters?: Record<string, unknown>,
): Record<string, unknown> {
  const filters = { ...(apiFilters ?? {}) };
  if (status === "active") filters.status = true;
  if (status === "inactive") filters.status = false;
  return filters;
}

export const PostalMasterListService = {
  async list(params: PostalListParams): Promise<PostalListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");
    const filters = buildStatusFilters(params.status, params.apiFilters);

    const response = await axiosInstance.post(
      `${POSTAL.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = unwrapData(payload);

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row) => mapItem((row ?? {}) as Record<string, unknown>));
    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async summary(signal?: AbortSignal): Promise<PostalSummary> {
    const response = await axiosInstance.get(POSTAL.SUMMARY, { signal });
    const payload = response.data as Record<string, unknown>;
    const data = (unwrapData(payload) ?? {}) as Record<string, unknown>;

    return {
      totalMappings: Number(data.totalMappings ?? 0),
      activeMappings: Number(data.activeMappings ?? 0),
      inactiveMappings: Number(data.inactiveMappings ?? 0),
      citiesLinked: Number(data.citiesLinked ?? 0),
      villagesLinked: Number(data.villagesLinked ?? 0),
    };
  },

  async updateStatus(mappingId: string): Promise<void> {
    const response = await axiosInstance.patch(POSTAL.STATUS_UPDATE(mappingId));
    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update mapping status.");
    }
  },

  async createMapping(payload: CreatePostalMappingPayload): Promise<void> {
    const response = await axiosInstance.post(POSTAL.MAPPING_CREATE, {
      location_id: payload.location_id,
      ...(payload.pincode_id ? { pincode_id: payload.pincode_id } : {}),
      ...(payload.pincode ? { pincode: payload.pincode.trim() } : {}),
    });
    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create postal mapping.");
    }
  },

  async deleteMapping(mappingId: string): Promise<void> {
    const response = await axiosInstance.delete(POSTAL.MAPPING_DELETE(mappingId));
    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to delete postal mapping.");
    }
  },

  async export(params: PostalExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");
    const filters = buildStatusFilters(params.status, params.apiFilters);

    const response = await axiosInstance.post(
      `${POSTAL.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters },
      { responseType: "blob" },
    );

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (response.data as Blob).text();
      const body = JSON.parse(text) as Record<string, unknown>;
      throw new Error(asString(body.message) || "No records found to export.");
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `postal_mappings_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async lookupStates(signal?: AbortSignal): Promise<PostalLookupOption[]> {
    const response = await axiosInstance.get(POSTAL.LOOKUP_STATES, { signal });
    const payload = response.data as Record<string, unknown>;
    const data = unwrapData(payload);
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        code: asString(item.state_code),
        label: asString(item.state_name),
      };
    });
  },

  async lookupDistricts(
    stateId?: string,
    signal?: AbortSignal,
  ): Promise<PostalLookupOption[]> {
    const response = await axiosInstance.get(POSTAL.LOOKUP_DISTRICTS, {
      params: stateId ? { state_id: stateId } : {},
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    const data = unwrapData(payload);
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        code: asString(item.district_code),
        label: asString(item.district_name),
      };
    });
  },

  async lookupCities(
    districtId: string,
    signal?: AbortSignal,
  ): Promise<PostalLookupOption[]> {
    const response = await axiosInstance.get(POSTAL.LOOKUP_CITIES, {
      params: { district_id: districtId },
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    const data = unwrapData(payload);
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        code: asString(item.location_code),
        label: asString(item.location_name),
        locationType: "CITY",
      };
    });
  },

  async lookupVillages(
    params: { district_id?: string; subdistrict_id?: string },
    signal?: AbortSignal,
  ): Promise<PostalLookupOption[]> {
    const response = await axiosInstance.get(POSTAL.LOOKUP_VILLAGES, {
      params,
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    const data = unwrapData(payload);
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id),
        code: asString(item.location_code),
        label: asString(item.location_name),
        locationType: "VILLAGE",
      };
    });
  },

  async lookupLocationsForDistrict(
    districtId: string,
    signal?: AbortSignal,
  ): Promise<PostalLookupOption[]> {
    const [cities, villages] = await Promise.all([
      this.lookupCities(districtId, signal),
      this.lookupVillages({ district_id: districtId }, signal),
    ]);
    return [...cities, ...villages].sort((a, b) => a.label.localeCompare(b.label));
  },
};
