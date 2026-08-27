import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  CancelContraVoucherPayload,
  ContraAttachmentMeta,
  ContraEligibleAccountsQuery,
  ContraEligibleAccountsResponse,
  ContraVoucherConfig,
  ContraVoucherDetail,
  ContraVoucherListQuery,
  ContraVoucherListResponse,
  CreateContraVoucherPayload,
  RejectContraVoucherPayload,
  ReverseContraVoucherPayload,
  SubmitContraVoucherPayload,
  UpdateContraVoucherPayload,
} from "@/types/contra-voucher.types";
import { buildContraMultipartFormData } from "@/app/(app)/accounts/vouchers/contra/contra-attachment-formdata";

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

/** Post/reverse may wrap the detail under `contra_voucher`. */
function unwrapContraDetail(data: unknown): ContraVoucherDetail {
  if (
    data &&
    typeof data === "object" &&
    "contra_voucher" in data &&
    (data as { contra_voucher?: ContraVoucherDetail }).contra_voucher
  ) {
    return (data as { contra_voucher: ContraVoucherDetail }).contra_voucher;
  }
  return data as ContraVoucherDetail;
}

async function withContraError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

const CONTRA_UPLOAD_TIMEOUT_MS = 120_000;

export const ContraVoucherService = {
  extractErrorMessage,

  async getConfig(): Promise<ContraVoucherConfig> {
    return withContraError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.CONFIG,
      );
      const data = unwrapData<ContraVoucherConfig>(response);
      return (
        data ?? {
          approval_required: true,
          cross_warehouse_cash_supported: false,
          cross_warehouse_bank_to_bank_supported: true,
        }
      );
    }, "Failed to load Contra Voucher configuration.");
  },

  async listEligibleAccounts(
    params: ContraEligibleAccountsQuery,
  ): Promise<ContraEligibleAccountsResponse> {
    return withContraError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.ELIGIBLE_ACCOUNTS,
        { params },
      );
      const data = unwrapData<ContraEligibleAccountsResponse>(response);
      if (data && Array.isArray(data.data)) {
        return data;
      }
      const alt = data as unknown as {
        items?: ContraEligibleAccountsResponse["data"];
        data?: ContraEligibleAccountsResponse["data"];
        warehouse_id?: string;
        pagination?: ContraEligibleAccountsResponse["pagination"];
      };
      return {
        warehouse_id: alt?.warehouse_id ?? params.warehouse_id,
        data: alt?.data ?? alt?.items ?? [],
        pagination: alt?.pagination ?? {
          page: 1,
          page_size: params.page_size ?? 50,
          total: 0,
          total_pages: 1,
        },
      };
    }, "Failed to load eligible Contra accounts.");
  },

  async list(params?: ContraVoucherListQuery): Promise<ContraVoucherListResponse> {
    return withContraError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.LIST,
        { params },
      );
      const data = unwrapData<ContraVoucherListResponse>(response);
      if (data && Array.isArray((data as ContraVoucherListResponse).data)) {
        return data as ContraVoucherListResponse;
      }
      const alt = data as unknown as {
        items?: ContraVoucherListResponse["data"];
        data?: ContraVoucherListResponse["data"];
        pagination?: ContraVoucherListResponse["pagination"];
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
    }, "Failed to list Contra Vouchers.");
  },

  async getById(id: string): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.GET_BY_ID(id),
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to load Contra Voucher.");
  },

  async create(
    payload: CreateContraVoucherPayload,
    pendingFiles: File[] = [],
  ): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const formData = buildContraMultipartFormData(payload, {
        pendingFiles,
        isUpdate: false,
      });
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.CREATE,
        formData,
        { timeout: CONTRA_UPLOAD_TIMEOUT_MS },
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to create Contra Voucher draft.");
  },

  async update(
    id: string,
    payload: UpdateContraVoucherPayload,
    options?: {
      pendingFiles?: File[];
      existingAttachments?: ContraAttachmentMeta[];
    },
  ): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const formData = buildContraMultipartFormData(payload, {
        pendingFiles: options?.pendingFiles ?? [],
        existingAttachments:
          options?.existingAttachments ?? payload.existing_attachments ?? [],
        isUpdate: true,
      });
      const response = await axiosInstance.put(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.UPDATE(id),
        formData,
        { timeout: CONTRA_UPLOAD_TIMEOUT_MS },
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to update Contra Voucher draft.");
  },

  async submit(
    id: string,
    payload: SubmitContraVoucherPayload,
  ): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.SUBMIT(id),
        payload,
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to submit Contra Voucher.");
  },

  async approve(id: string): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.APPROVE(id),
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to approve Contra Voucher.");
  },

  async reject(
    id: string,
    payload: RejectContraVoucherPayload,
  ): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.REJECT(id),
        payload,
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to reject Contra Voucher.");
  },

  async post(id: string): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.POST(id),
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to post Contra Voucher.");
  },

  async cancel(
    id: string,
    payload: CancelContraVoucherPayload,
  ): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.CANCEL(id),
        payload,
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to cancel Contra Voucher.");
  },

  async reverse(
    id: string,
    payload: ReverseContraVoucherPayload,
  ): Promise<ContraVoucherDetail> {
    return withContraError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.CONTRA_VOUCHER.REVERSE(id),
        payload,
      );
      return unwrapContraDetail(unwrapData(response));
    }, "Failed to reverse Contra Voucher.");
  },
};
