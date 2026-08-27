import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  CreateDirectCreditNotePayload,
  CreateFromPendingPayload,
  CreditNoteApprovalConfig,
  CreditNoteDetail,
  EligibleSalesInvoicesQuery,
  EligibleSalesInvoicesResponse,
  PendingCreditNoteDetail,
  ReverseCreditNotePayload,
  SchemeTypeLedgerMapping,
  UpdateDraftCreditNotePayload,
} from "./credit-note-form-types";

/** Form-local CN routes — do not add these to the shared endpoints map. */
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

function errorBlob(error: unknown): string {
  const err = error as {
    message?: string;
    error?: string;
    validation_errors?: Array<{ message?: string; path?: string }>;
    response?: { data?: { message?: string; error?: string } };
  };
  return [
    err?.message,
    err?.error,
    err?.response?.data?.message,
    err?.response?.data?.error,
    err?.validation_errors?.[0]?.message,
  ]
    .filter(Boolean)
    .join(" ");
}

export function creditNoteApiError(error: unknown, fallback: string): string {
  const err = error as {
    message?: string;
    error?: string;
    validation_errors?: Array<{ message?: string; path?: string }>;
    response?: { data?: { message?: string; error?: string } };
  };
  const validation = err?.validation_errors?.[0]?.message;
  if (validation) return validation;
  const message =
    err?.message ||
    err?.error ||
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    fallback;
  const code = err?.error || err?.response?.data?.error;
  if (code && /^[A-Z][A-Z0-9_]+$/.test(code) && !message.includes(code)) {
    return `${code}: ${message}`;
  }
  return message;
}

export function creditNoteErrorIncludes(error: unknown, code: string): boolean {
  return errorBlob(error).includes(code);
}

function unwrapCreditNoteDetail(data: unknown): CreditNoteDetail {
  if (data && typeof data === "object") {
    const rec = data as { credit_note?: CreditNoteDetail; credit_note_id?: string };
    if (rec.credit_note && typeof rec.credit_note === "object" && rec.credit_note.credit_note_id) {
      return rec.credit_note;
    }
    if (typeof rec.credit_note_id === "string" && rec.credit_note_id) {
      return data as CreditNoteDetail;
    }
  }
  throw new Error("CREDIT_NOTE_ID_MISSING: The server did not return a Credit Note id.");
}

export const CreditNoteFormApi = {
  async getConfig(): Promise<CreditNoteApprovalConfig> {
    const response = await axiosInstance.get<ApiResponse<CreditNoteApprovalConfig>>(
      `${CN}/config`,
    );
    const data = unwrapData(response) as CreditNoteApprovalConfig | undefined;
    return {
      // Missing/invalid payload must not enable bypass.
      approval_required: data?.approval_required !== false,
    };
  },

  async getPendingById(id: string): Promise<PendingCreditNoteDetail> {
    const response = await axiosInstance.get<ApiResponse<PendingCreditNoteDetail>>(
      `${CN}/pending/${id}`,
    );
    return unwrapData(response);
  },

  async getById(id: string): Promise<CreditNoteDetail> {
    const response = await axiosInstance.get<ApiResponse<CreditNoteDetail>>(
      `${CN}/${id}`,
    );
    return unwrapData(response);
  },

  async createDirect(payload: CreateDirectCreditNotePayload): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetail>>(
      `${CN}/direct`,
      payload,
    );
    return unwrapCreditNoteDetail(unwrapData(response));
  },

  async createFromPending(
    pendingId: string,
    payload: CreateFromPendingPayload,
  ): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetail>>(
      `${CN}/from-pending/${pendingId}`,
      payload,
    );
    return unwrapCreditNoteDetail(unwrapData(response));
  },

  async updateDraft(
    id: string,
    payload: UpdateDraftCreditNotePayload,
  ): Promise<CreditNoteDetail> {
    const response = await axiosInstance.put<ApiResponse<CreditNoteDetail>>(
      `${CN}/${id}`,
      payload,
    );
    return unwrapCreditNoteDetail(unwrapData(response));
  },

  async submit(id: string, approverId: string): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetail>>(
      `${CN}/${id}/submit`,
      { approver_id: approverId },
    );
    return unwrapData(response);
  },

  async approve(id: string): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetail>>(
      `${CN}/${id}/approve`,
      {},
    );
    return unwrapData(response);
  },

  async reject(id: string, rejectionReason: string): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetail>>(
      `${CN}/${id}/reject`,
      { rejection_reason: rejectionReason },
    );
    return unwrapData(response);
  },

  async post(id: string): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<
      ApiResponse<CreditNoteDetail | { credit_note?: CreditNoteDetail }>
    >(`${CN}/${id}/post`, {});
    return unwrapCreditNoteDetail(unwrapData(response));
  },

  async cancel(id: string, reason: string): Promise<CreditNoteDetail> {
    const response = await axiosInstance.post<ApiResponse<CreditNoteDetail>>(
      `${CN}/${id}/cancel`,
      { reason },
    );
    return unwrapData(response);
  },

  async reverse(id: string, payload: ReverseCreditNotePayload): Promise<CreditNoteDetail> {
    const body: ReverseCreditNotePayload = { reason: payload.reason.trim() };
    if (payload.reversal_date?.trim()) body.reversal_date = payload.reversal_date.trim();
    const response = await axiosInstance.post<
      ApiResponse<CreditNoteDetail | { credit_note?: CreditNoteDetail }>
    >(`${CN}/${id}/reverse`, body);
    return unwrapCreditNoteDetail(unwrapData(response));
  },

  async listEligibleSalesInvoices(
    customerId: string,
    query: EligibleSalesInvoicesQuery = {},
  ): Promise<EligibleSalesInvoicesResponse> {
    const response = await axiosInstance.get<ApiResponse<EligibleSalesInvoicesResponse>>(
      `${CN}/customer/${customerId}/eligible-sales-invoices`,
      {
        params: {
          search: query.search?.trim() || undefined,
          page: query.page ?? 1,
          page_size: query.page_size ?? 100,
        },
      },
    );
    const data = unwrapData(response) as EligibleSalesInvoicesResponse | undefined;
    const items = Array.isArray(data?.items) ? data.items : [];
    const pagination = data?.pagination;
    return {
      customer_id: String(data?.customer_id ?? customerId),
      party_ledger_id: String(data?.party_ledger_id ?? ""),
      items,
      pagination: {
        page: Number(pagination?.page) || 1,
        page_size: Number(pagination?.page_size) || items.length,
        total: Number(pagination?.total) || items.length,
        total_pages: Number(pagination?.total_pages) || 1,
      },
    };
  },

  async listSchemeTypeLedgerMappings(): Promise<SchemeTypeLedgerMapping[]> {
    const response = await axiosInstance.get<ApiResponse<SchemeTypeLedgerMapping[]>>(
      `${CN}/scheme-type-ledger-mappings`,
    );
    const data = unwrapData(response);
    return Array.isArray(data) ? data : [];
  },

  async listManualLedgers(search?: string): Promise<
    Array<{
      ledgerId: string;
      ledgerCode: string;
      ledgerName: string;
      allowManualPosting?: boolean;
      status?: string;
    }>
  > {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.LEDGERS.LIST, {
      params: {
        search: search?.trim() || undefined,
        status: "ACTIVE",
        page: 1,
        limit: 50,
      },
    });
    const body = response.data as { data?: unknown };
    const rows = Array.isArray(body?.data) ? body.data : [];
    return (rows as Array<Record<string, unknown>>)
      .map((row) => ({
        ledgerId: String(row.ledgerId ?? row.ledger_id ?? ""),
        ledgerCode: String(row.ledgerCode ?? row.ledger_code ?? ""),
        ledgerName: String(row.ledgerName ?? row.ledger_name ?? ""),
        allowManualPosting: Boolean(
          row.allowManualPosting ?? row.allow_manual_posting ?? false,
        ),
        status: String(row.status ?? ""),
      }))
      .filter((row) => row.ledgerId && row.allowManualPosting !== false);
  },
};
