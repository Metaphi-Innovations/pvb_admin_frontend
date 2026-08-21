import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface AdditionalChargeListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AdditionalChargeListRecord {
  id: string;
  srNo: number;
  chargeCode: string;
  chargeName: string;
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  gstApplicable: boolean;
  defaultGstRateId: string | null;
  defaultGstRate: string;
  hsnId: string | null;
  hsnSacCode: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface AdditionalChargeListResult {
  items: AdditionalChargeListRecord[];
  total: number;
}

export interface AdditionalChargeCreatePayload {
  charge_name: string;
  charge_code?: string | null;
  gst_applicable?: boolean;
  default_gst_rate_id?: string | null;
  hsn_id?: string | null;
  hsn_sac_code?: string | null;
  description?: string | null;
  ledger_name?: string | null;
}

export interface AdditionalChargeUpdatePayload {
  charge_name?: string;
  gst_applicable?: boolean;
  default_gst_rate_id?: string | null;
  hsn_id?: string | null;
  hsn_sac_code?: string | null;
  description?: string | null;
}

export interface AdditionalChargeExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface AdditionalChargeFilterOption {
  label: string;
  value: string;
}

export type AdditionalChargeFilterField =
  | "charge_code"
  | "charge_name"
  | "hsn_sac_code"
  | "description"
  | "gst_applicable"
  | "is_active"
  | "created_by_user__username"
  | "created_by_user__first_name"
  | "created_by_user__last_name"
  | "updated_by_user__username"
  | "updated_by_user__first_name"
  | "updated_by_user__last_name";

/** Maps UI column keys to backend ORDERING_FIELD_MAP keys. */
const SORT_KEY_TO_ORDERING: Record<string, string> = {
  chargeCode: "chargeCode",
  chargeName: "chargeName",
  hsnSacCode: "hsnSacCode",
  description: "description",
  gstApplicable: "gstApplicable",
  status: "isActive",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  createdBy: "createdAt",
  updatedBy: "updatedAt",
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

function toStatus(value: unknown): "Active" | "Inactive" {
  return value === true ? "Active" : "Inactive";
}

function toDisplayName(user: unknown, fallbackName?: unknown): string {
  if (typeof fallbackName === "string" && fallbackName.trim()) {
    return fallbackName.trim();
  }
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function formatDate(value: unknown): string {
  const raw = asString(value);
  return raw ? raw.slice(0, 10) : "";
}

function formatGstRate(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const pct = record.gstPercentage;
    if (pct == null) return "";
    const num = Number(pct);
    return Number.isFinite(num) ? num.toFixed(2) : asString(pct);
  }
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : asString(value);
}

function mapLedger(raw: Record<string, unknown>): {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
} {
  const ledger =
    raw.ledger && typeof raw.ledger === "object" && !Array.isArray(raw.ledger)
      ? (raw.ledger as Record<string, unknown>)
      : null;

  return {
    ledgerId: asString(raw.ledger_id || ledger?.ledger_id),
    ledgerCode: asString(ledger?.ledger_code),
    ledgerName: asString(ledger?.ledger_name),
  };
}

function mapItem(
  raw: Record<string, unknown>,
  fallbackIndex = 0,
): AdditionalChargeListRecord {
  const ledger = mapLedger(raw);
  const srNo = Number(raw.sr_no);
  const gstRateObj =
    raw.default_gst_rate &&
    typeof raw.default_gst_rate === "object" &&
    !Array.isArray(raw.default_gst_rate)
      ? (raw.default_gst_rate as Record<string, unknown>)
      : null;

  const hsnObj =
    raw.hsn && typeof raw.hsn === "object" && !Array.isArray(raw.hsn)
      ? (raw.hsn as Record<string, unknown>)
      : null;

  return {
    id: asString(raw.additional_charge_id),
    srNo: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    chargeCode: asString(raw.charge_code),
    chargeName: asString(raw.charge_name),
    ledgerId: ledger.ledgerId,
    ledgerCode: ledger.ledgerCode,
    ledgerName: ledger.ledgerName,
    gstApplicable: Boolean(raw.gst_applicable),
    defaultGstRateId: raw.default_gst_rate_id
      ? asString(raw.default_gst_rate_id)
      : gstRateObj?.id
        ? asString(gstRateObj.id)
        : null,
    defaultGstRate: formatGstRate(raw.default_gst_rate),
    hsnId: raw.hsn_id
      ? asString(raw.hsn_id)
      : hsnObj?.id
        ? asString(hsnObj.id)
        : null,
    hsnSacCode: asString(
      raw.hsn_sac_code || hsnObj?.hsnCode || hsnObj?.hsn_code,
    ),
    description: asString(raw.description),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user, raw.createdByName),
    updatedBy: toDisplayName(raw.updated_by_user, raw.updatedByName),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: AdditionalChargeFilterField,
): AdditionalChargeFilterOption[] {
  const options: AdditionalChargeFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = asString(raw).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "is_active") {
      const active = raw === true || value.toLowerCase() === "true";
      options.push({
        label: active ? "Active" : "Inactive",
        value: active ? "active" : "inactive",
      });
      continue;
    }

    if (fieldName === "gst_applicable") {
      const applicable = raw === true || value.toLowerCase() === "true";
      options.push({
        label: applicable ? "Yes" : "No",
        value: applicable ? "yes" : "no",
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export const AdditionalChargeListService = {
  async list(params: AdditionalChargeListParams): Promise<AdditionalChargeListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row, idx) =>
      mapItem((row ?? {}) as Record<string, unknown>, idx),
    );

    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<AdditionalChargeListRecord> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.VIEW(id),
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapItem(data as Record<string, unknown>);
  },

  async create(payload: AdditionalChargeCreatePayload): Promise<void> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.CREATE,
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create additional charge.");
    }
  },

  async update(id: string, payload: AdditionalChargeUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(
      API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.UPDATE(id),
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update additional charge.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.STATUS_UPDATE(id),
      { is_active: isActive },
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(
        asString(body.message) || "Failed to update additional charge status.",
      );
    }
  },

  async getFilterDropdown(
    fieldName: AdditionalChargeFilterField,
    signal?: AbortSignal,
  ): Promise<AdditionalChargeFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.FILTER_DROPDOWN,
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

  async export(params: AdditionalChargeExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (response.data as Blob).text();
      let message = "No records found to export.";
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        message = String(json.message ?? message);
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `additional_charges_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  extractErrorMessage,
};
