import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  CancelJournalVoucherPayload,
  CreateJournalVoucherPayload,
  JournalAttachmentMeta,
  JournalEligibleLedgersQuery,
  JournalEligibleLedgersResponse,
  JournalVoucherConfig,
  JournalVoucherDetail,
  JournalVoucherListQuery,
  JournalVoucherListResponse,
  RejectJournalVoucherPayload,
  ReverseJournalVoucherPayload,
  SubmitJournalVoucherPayload,
  UpdateJournalVoucherPayload,
} from "@/types/journal-voucher.types";
import { buildJournalMultipartFormData } from "@/app/(app)/accounts/vouchers/journal/journal-attachment-formdata";

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

function unwrapData<T>(response: { data?: { data?: T } | T }): T {
  const body = response.data as { data?: T } | T | undefined;
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as { data?: T }).data !== undefined
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Post/reverse may wrap the detail under `journal_voucher`. */
function unwrapJournalDetail(data: unknown): JournalVoucherDetail {
  if (
    data &&
    typeof data === "object" &&
    "journal_voucher" in data &&
    (data as { journal_voucher?: JournalVoucherDetail }).journal_voucher
  ) {
    return (data as { journal_voucher: JournalVoucherDetail }).journal_voucher;
  }
  return data as JournalVoucherDetail;
}

async function withJournalError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

const JOURNAL_UPLOAD_TIMEOUT_MS = 120_000;

export const JournalVoucherService = {
  extractErrorMessage,

  async getConfig(): Promise<JournalVoucherConfig> {
    return withJournalError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.CONFIG,
      );
      const data = unwrapData<JournalVoucherConfig>(response);
      return data ?? { approval_required: true };
    }, "Failed to load Journal Voucher configuration.");
  },

  async listEligibleLedgers(
    params?: JournalEligibleLedgersQuery,
  ): Promise<JournalEligibleLedgersResponse> {
    return withJournalError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.ELIGIBLE_LEDGERS,
        { params },
      );
      const data = unwrapData<JournalEligibleLedgersResponse>(response);
      if (data && Array.isArray(data.data)) {
        return data;
      }
      const alt = data as unknown as {
        items?: JournalEligibleLedgersResponse["data"];
        data?: JournalEligibleLedgersResponse["data"];
        pagination?: JournalEligibleLedgersResponse["pagination"];
      };
      return {
        data: alt?.data ?? alt?.items ?? [],
        pagination: alt?.pagination ?? {
          page: 1,
          page_size: params?.page_size ?? 20,
          total: 0,
          total_pages: 1,
        },
      };
    }, "Failed to load eligible Journal ledgers.");
  },

  async list(params?: JournalVoucherListQuery): Promise<JournalVoucherListResponse> {
    return withJournalError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.LIST,
        { params },
      );
      const data = unwrapData<JournalVoucherListResponse>(response);
      if (data && Array.isArray((data as JournalVoucherListResponse).data)) {
        return data as JournalVoucherListResponse;
      }
      const alt = data as unknown as {
        items?: JournalVoucherListResponse["data"];
        data?: JournalVoucherListResponse["data"];
        pagination?: JournalVoucherListResponse["pagination"];
      };
      return {
        data: alt?.data ?? alt?.items ?? [],
        pagination: alt?.pagination ?? {
          page: 1,
          page_size: params?.page_size ?? 20,
          total: 0,
          total_pages: 1,
        },
      };
    }, "Failed to list Journal Vouchers.");
  },

  async getById(id: string): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.GET_BY_ID(id),
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to load Journal Voucher.");
  },

  async create(
    payload: CreateJournalVoucherPayload,
    pendingFiles: File[] = [],
  ): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const formData = buildJournalMultipartFormData(payload, {
        pendingFiles,
        isUpdate: false,
      });
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.CREATE,
        formData,
        { timeout: JOURNAL_UPLOAD_TIMEOUT_MS },
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to create Journal Voucher draft.");
  },

  async update(
    id: string,
    payload: UpdateJournalVoucherPayload,
    options?: {
      pendingFiles?: File[];
      existingAttachments?: JournalAttachmentMeta[];
    },
  ): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const formData = buildJournalMultipartFormData(payload, {
        pendingFiles: options?.pendingFiles ?? [],
        existingAttachments:
          options?.existingAttachments ?? payload.existing_attachments ?? [],
        isUpdate: true,
      });
      const response = await axiosInstance.put(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.UPDATE(id),
        formData,
        { timeout: JOURNAL_UPLOAD_TIMEOUT_MS },
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to update Journal Voucher draft.");
  },

  async submit(
    id: string,
    payload: SubmitJournalVoucherPayload,
  ): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.SUBMIT(id),
        payload,
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to submit Journal Voucher.");
  },

  async approve(id: string): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.APPROVE(id),
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to approve Journal Voucher.");
  },

  async reject(
    id: string,
    payload: RejectJournalVoucherPayload,
  ): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.REJECT(id),
        payload,
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to reject Journal Voucher.");
  },

  async post(id: string): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.POST(id),
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to post Journal Voucher.");
  },

  async cancel(
    id: string,
    payload: CancelJournalVoucherPayload,
  ): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.CANCEL(id),
        payload,
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to cancel Journal Voucher.");
  },

  async reverse(
    id: string,
    payload: ReverseJournalVoucherPayload,
  ): Promise<JournalVoucherDetail> {
    return withJournalError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.JOURNAL_VOUCHER.REVERSE(id),
        payload,
      );
      return unwrapJournalDetail(unwrapData(response));
    }, "Failed to reverse Journal Voucher.");
  },
};
