import { axiosInstance } from "@/api/axios";
import type { ApiResponse } from "@/types/api.types";

/** List/view-local CN routes — do not add these to the shared endpoints map. */
const CN = "/accounts/credit-note";

function unwrapData<T>(response: { data?: ApiResponse<T> | T }): T {
  const body = response.data as ApiResponse<T> | T | undefined;
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as ApiResponse<T>).data !== undefined
  ) {
    return (body as ApiResponse<T>).data as T;
  }
  return body as T;
}

export function creditNoteListApiError(error: unknown, fallback: string): string {
  const err = error as {
    message?: string;
    error?: string;
    validation_errors?: Array<{ message?: string }>;
    response?: { data?: { message?: string; error?: string } };
  };
  return (
    err?.validation_errors?.[0]?.message ||
    err?.message ||
    err?.error ||
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    fallback
  );
}

export type CreditNoteListQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  source_type?: string;
  from_date?: string;
  to_date?: string;
  cn_number?: string;
};

export type PendingCreditNoteListQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  source_type?: string;
};

export type CreditNoteListApiRow = {
  credit_note_id: string;
  cn_number?: string | null;
  cn_date?: string | null;
  source_type?: string | null;
  status?: string | null;
  taxable_amount?: string | number | null;
  cgst_amount?: string | number | null;
  sgst_amount?: string | number | null;
  igst_amount?: string | number | null;
  gst_amount?: string | number | null;
  cn_amount?: string | number | null;
  narration?: string | null;
  customer?: {
    customer_id?: string;
    customer_code?: string | null;
    customer_name?: string | null;
  } | null;
  warehouse?: {
    warehouse_id?: string;
    warehouse_name?: string | null;
  } | null;
  scheme?: {
    scheme_id?: string;
    scheme_code?: string | null;
    scheme_name?: string | null;
    scheme_type?: string | null;
  } | null;
  references?: Array<{
    reference_type?: string | null;
    reference_code?: string | null;
  }>;
};

export type PendingCreditNoteListApiRow = {
  pending_credit_note_id: string;
  source_type?: string | null;
  status?: string | null;
  eligibility_key?: string | null;
  eligibility_date?: string | null;
  eligibility_from?: string | null;
  eligibility_to?: string | null;
  eligible_base_amount?: string | number | null;
  taxable_credit_amount?: string | number | null;
  gst_amount?: string | number | null;
  eligible_cn_amount?: string | number | null;
  customer?: {
    customer_id?: string;
    customer_code?: string | null;
    customer_name?: string | null;
  } | null;
  warehouse?: {
    warehouse_id?: string;
    warehouse_name?: string | null;
  } | null;
  scheme?: {
    scheme_id?: string;
    scheme_code?: string | null;
    scheme_name?: string | null;
    scheme_type?: string | null;
  } | null;
  credit_note?: {
    credit_note_id: string;
    cn_number?: string | null;
    status?: string | null;
  } | null;
  references?: Array<{
    reference_type?: string | null;
    reference_code?: string | null;
    relation_type?: string | null;
  }>;
  _count?: { lines?: number; references?: number };
};

export type CreditNoteListPage<T> = {
  items?: T[];
  pagination?: {
    page?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
  };
};

export type ReverseCreditNotePayload = {
  reason: string;
  reversal_date?: string;
};

export type CreditNoteDetailApi = CreditNoteListApiRow & {
  warehouse_id?: string;
  customer_id?: string;
  party_ledger?: { ledger_name?: string | null; ledger_code?: string | null } | null;
  lines?: Array<Record<string, unknown>>;
  references?: Array<Record<string, unknown>>;
  round_off_amount?: string | number | null;
  is_interstate?: boolean;
  pending_credit_note_id?: string | null;
};

function unwrapCreditNoteDetail(data: unknown): CreditNoteDetailApi {
  if (data && typeof data === "object") {
    const rec = data as { credit_note?: CreditNoteDetailApi; credit_note_id?: string };
    if (rec.credit_note && typeof rec.credit_note === "object" && rec.credit_note.credit_note_id) {
      return rec.credit_note;
    }
  }
  return data as CreditNoteDetailApi;
}

export const CreditNoteListApi = {
  async listPending(
    query: PendingCreditNoteListQuery = {},
  ): Promise<CreditNoteListPage<PendingCreditNoteListApiRow>> {
    const response = await axiosInstance.get<
      ApiResponse<CreditNoteListPage<PendingCreditNoteListApiRow>>
    >(`${CN}/pending`, { params: query });
    return unwrapData(response) ?? { items: [], pagination: { total: 0 } };
  },

  async list(
    query: CreditNoteListQuery = {},
  ): Promise<CreditNoteListPage<CreditNoteListApiRow>> {
    const response = await axiosInstance.get<
      ApiResponse<CreditNoteListPage<CreditNoteListApiRow>>
    >(CN, { params: query });
    return unwrapData(response) ?? { items: [], pagination: { total: 0 } };
  },

  async getById(id: string): Promise<CreditNoteDetailApi> {
    const response = await axiosInstance.get<ApiResponse<CreditNoteDetailApi>>(
      `${CN}/${id}`,
    );
    return unwrapData(response);
  },

  async cancel(id: string, reason: string): Promise<CreditNoteDetailApi> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetailApi>>(
      `${CN}/${id}/cancel`,
      { reason },
    );
    return unwrapData(response);
  },

  async reverse(id: string, payload: ReverseCreditNotePayload): Promise<CreditNoteDetailApi> {
    const body: ReverseCreditNotePayload = { reason: payload.reason.trim() };
    if (payload.reversal_date?.trim()) body.reversal_date = payload.reversal_date.trim();
    const response = await axiosInstance.post<
      ApiResponse<CreditNoteDetailApi | { credit_note?: CreditNoteDetailApi }>
    >(`${CN}/${id}/reverse`, body);
    return unwrapCreditNoteDetail(unwrapData(response));
  },
};
