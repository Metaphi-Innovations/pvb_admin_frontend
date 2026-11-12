import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export type FormOPurpose = "FRESH" | "RENEWAL";
export type FormORecipientStatus = "WHOLESALE_DEALER" | "RETAIL_DEALER";
export type FormOIssuerStatus =
  | "STATE_GOVERNMENT"
  | "MANUFACTURER"
  | "POOL_HANDLING_AGENCY"
  | "WHOLESALE_DEALER";

export type FormOLinePayload = {
  product_id?: string | null;
  category_name: string;
  product_name: string;
  brand_name: string;
  source: string;
};

export type FormOCreatePayload = {
  customer_id: string;
  issue_date: string;
  purpose: FormOPurpose;
  warehouse_id?: string | null;
  copied_from_form_o_id?: string | null;
  recipient_name: string;
  recipient_address: string;
  recipient_status: FormORecipientStatus;
  recipient_licence_no?: string | null;
  recipient_licence_issue?: string | null;
  recipient_licence_expiry?: string | null;
  recipient_licence_authority?: string | null;
  issuer_name: string;
  issuer_office_address: string;
  issuer_godown_address?: string | null;
  issuer_status: FormOIssuerStatus;
  issuer_mixture_number?: string | null;
  issuer_mixture_expiry?: string | null;
  issuer_mixture_grades?: string | null;
  issuer_mixture_authority?: string | null;
  issuer_licence_no?: string | null;
  issuer_licence_issue?: string | null;
  issuer_licence_expiry?: string | null;
  issuer_licence_authority?: string | null;
  lines: FormOLinePayload[];
};

export type FormOUpdatePayload = Omit<
  FormOCreatePayload,
  "customer_id" | "copied_from_form_o_id"
>;

export type FormOListItem = {
  form_o_id: string;
  form_o_number: string;
  issue_date: string;
  purpose: FormOPurpose;
  state_code: string;
  state_name?: string | null;
  financial_year: string;
  recipient_name: string;
  customer_id: string;
  customer_code?: string;
  customer_name?: string;
  line_count: number;
  customer_fco_expired?: boolean;
  needs_reissue?: boolean;
  created_at: string;
};

export type FormOEligibleProduct = {
  product_id: string;
  product_code: string;
  brand_name: string;
  product_name: string;
  category_name: string;
  source: string;
};

export type FormOFilterOption = {
  label: string;
  value: string;
};

export type FormOFilterField =
  | "form_o_number"
  | "state_name"
  | "state_code"
  | "purpose"
  | "recipient_name"
  | "customer__customer_name"
  | "customer__customer_code";

function unwrapData<T>(response: any): T {
  return (response?.data?.data ?? response?.data) as T;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function mapFilterOptions(
  data: unknown[],
  fieldName: FormOFilterField,
): FormOFilterOption[] {
  const options: FormOFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = asString(raw);
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "purpose") {
      options.push({
        label: value.toUpperCase() === "RENEWAL" ? "Renewal" : "Fresh",
        value: value.toUpperCase() === "RENEWAL" ? "RENEWAL" : "FRESH",
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export async function listFormOs(params: {
  page?: number;
  page_size?: number;
  search?: string;
  customer_id?: string;
  purpose?: FormOPurpose;
  state_code?: string;
  issue_date_from?: string;
  issue_date_to?: string;
  filters?: Record<string, unknown>;
}): Promise<{ items: FormOListItem[]; total: number }> {
  const response = await axiosInstance.post(
    API_ENDPOINTS.MASTER.FORM_O.LIST,
    { filters: params.filters ?? {} },
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        search: params.search || undefined,
        customer_id: params.customer_id || undefined,
        purpose: params.purpose || undefined,
        state_code: params.state_code || undefined,
        issue_date_from: params.issue_date_from || undefined,
        issue_date_to: params.issue_date_to || undefined,
      },
    },
  );
  const body = response.data;
  const items = (body?.data ?? []) as FormOListItem[];
  const total = Number(body?.totalRecords ?? body?.total ?? items.length);
  return { items, total };
}

export async function getFormOFilterDropdown(
  fieldName: FormOFilterField,
  signal?: AbortSignal,
): Promise<FormOFilterOption[]> {
  const response = await axiosInstance.get(
    API_ENDPOINTS.MASTER.FORM_O.FILTER_DROPDOWN,
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
}

export async function getFormO(id: string) {
  const response = await axiosInstance.get(API_ENDPOINTS.MASTER.FORM_O.VIEW(id));
  return unwrapData<any>(response);
}

export async function createFormO(payload: FormOCreatePayload) {
  const response = await axiosInstance.post(
    API_ENDPOINTS.MASTER.FORM_O.CREATE,
    payload,
  );
  return unwrapData<any>(response);
}

export async function updateFormO(id: string, payload: FormOUpdatePayload) {
  const response = await axiosInstance.put(
    API_ENDPOINTS.MASTER.FORM_O.UPDATE(id),
    payload,
  );
  return unwrapData<any>(response);
}

export async function getFormOPrefill(customerId: string) {
  const response = await axiosInstance.get(
    API_ENDPOINTS.MASTER.FORM_O.PREFILL(customerId),
  );
  return unwrapData<any>(response);
}

export async function getFormOEligibleProducts(search?: string) {
  const response = await axiosInstance.get(
    API_ENDPOINTS.MASTER.FORM_O.ELIGIBLE_PRODUCTS,
    { params: search ? { search } : undefined },
  );
  const data = unwrapData<FormOEligibleProduct[] | { data?: FormOEligibleProduct[] }>(
    response,
  );
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as any).data)) {
    return (data as any).data as FormOEligibleProduct[];
  }
  return [];
}

export async function getFormOIssuerDefaults(warehouseId?: string | null) {
  const response = await axiosInstance.get(
    API_ENDPOINTS.MASTER.FORM_O.ISSUER_DEFAULTS,
    { params: warehouseId ? { warehouse_id: warehouseId } : undefined },
  );
  return unwrapData<any>(response);
}

export async function downloadFormOPdf(id: string, fileName?: string) {
  const response = await axiosInstance.get(API_ENDPOINTS.MASTER.FORM_O.PDF(id), {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `FORM_O_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type FormOEmailPreview = {
  to: string | null;
  subject: string;
  text: string;
  html: string;
  customerName: string;
  formONo: string;
  formODate: string;
  purpose: string;
  stateName: string;
  attachmentFileName: string;
  canSend: boolean;
  missingReason?: string;
};

export async function fetchFormOEmailPreview(
  id: string,
  signal?: AbortSignal,
): Promise<FormOEmailPreview> {
  const response = await axiosInstance.get(
    API_ENDPOINTS.MASTER.FORM_O.EMAIL_PREVIEW(id),
    { signal },
  );
  const data = (response.data?.data || {}) as Record<string, unknown>;
  return {
    to: asString(data.to) || null,
    subject: asString(data.subject),
    text: asString(data.text),
    html: asString(data.html),
    customerName: asString(data.customer_name),
    formONo: asString(data.form_o_no),
    formODate: asString(data.form_o_date),
    purpose: asString(data.purpose),
    stateName: asString(data.state_name),
    attachmentFileName: asString(data.attachment_file_name),
    canSend: Boolean(data.can_send),
    missingReason: asString(data.missing_reason) || undefined,
  };
}

export async function sendFormOEmail(
  id: string,
  options?: { to?: string; signal?: AbortSignal },
): Promise<{ to: string; formONo: string }> {
  const response = await axiosInstance.post(
    API_ENDPOINTS.MASTER.FORM_O.SEND_EMAIL(id),
    {
      ...(options?.to ? { to: options.to } : {}),
    },
    { signal: options?.signal },
  );
  const data = (response.data?.data || {}) as Record<string, unknown>;
  return {
    to: asString(data.to),
    formONo: asString(data.form_o_no),
  };
}
