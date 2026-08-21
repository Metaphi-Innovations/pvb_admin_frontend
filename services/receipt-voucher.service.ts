import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  CancelReceiptVoucherPayload,
  CreateReceiptVoucherPayload,
  CustomerOutstandingResponse,
  ReceiptAttachmentMeta,
  ReceiptVoucherConfig,
  ReceiptVoucherDetail,
  ReceiptVoucherListQuery,
  ReceiptVoucherListResponse,
  RejectReceiptVoucherPayload,
  ReverseReceiptVoucherPayload,
  SubmitReceiptVoucherPayload,
  SupplierRecoverableResponse,
  UpdateReceiptVoucherPayload,
} from "@/types/receipt-voucher.types";
import { buildReceiptMultipartFormData } from "@/app/(app)/accounts/vouchers/receipt/receipt-attachment-formdata";

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

async function withReceiptError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

/** Multipart uploads can exceed the default 15s axios timeout. */
const RECEIPT_UPLOAD_TIMEOUT_MS = 120_000;

export const ReceiptVoucherService = {
  extractErrorMessage,

  async getConfig(): Promise<ReceiptVoucherConfig> {
    return withReceiptError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.CONFIG,
      );
      const data = unwrapData<ReceiptVoucherConfig>(response);
      return data ?? { approval_required: true };
    }, "Failed to load Receipt Voucher configuration.");
  },

  async list(params?: ReceiptVoucherListQuery): Promise<ReceiptVoucherListResponse> {
    return withReceiptError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.LIST,
        { params },
      );
      const data = unwrapData<ReceiptVoucherListResponse>(response);
      if (data && Array.isArray((data as ReceiptVoucherListResponse).data)) {
        return data as ReceiptVoucherListResponse;
      }
      const alt = data as unknown as {
        items?: ReceiptVoucherListResponse["data"];
        data?: ReceiptVoucherListResponse["data"];
        pagination?: ReceiptVoucherListResponse["pagination"];
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
    }, "Failed to list Receipt Vouchers.");
  },

  async getById(id: string): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.GET_BY_ID(id),
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to load Receipt Voucher.");
  },

  async listCustomerOutstanding(
    customerId: string,
  ): Promise<CustomerOutstandingResponse> {
    return withReceiptError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.CUSTOMER_OUTSTANDING(customerId),
      );
      return unwrapData<CustomerOutstandingResponse>(response);
    }, "Failed to load customer outstanding items.");
  },

  async listSupplierRecoverable(
    supplierId: string,
  ): Promise<SupplierRecoverableResponse> {
    return withReceiptError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.SUPPLIER_RECOVERABLE(supplierId),
      );
      return unwrapData<SupplierRecoverableResponse>(response);
    }, "Failed to load supplier recoverable items.");
  },

  /**
   * Create draft via multipart/form-data.
   * New files are uploaded as `attachments` File parts.
   */
  async create(
    payload: CreateReceiptVoucherPayload,
    pendingFiles: File[] = [],
  ): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const formData = buildReceiptMultipartFormData(payload, {
        pendingFiles,
        isUpdate: false,
      });
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.CREATE,
        formData,
        { timeout: RECEIPT_UPLOAD_TIMEOUT_MS },
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to create Receipt Voucher draft.");
  },

  /**
   * Update draft via multipart/form-data.
   * Retained metadata → `existing_attachments` JSON string.
   * New files → `attachments` File parts.
   */
  async update(
    id: string,
    payload: UpdateReceiptVoucherPayload,
    options?: {
      pendingFiles?: File[];
      existingAttachments?: ReceiptAttachmentMeta[];
    },
  ): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const formData = buildReceiptMultipartFormData(payload, {
        pendingFiles: options?.pendingFiles ?? [],
        existingAttachments:
          options?.existingAttachments ?? payload.existing_attachments ?? [],
        isUpdate: true,
      });
      const response = await axiosInstance.put(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.UPDATE(id),
        formData,
        { timeout: RECEIPT_UPLOAD_TIMEOUT_MS },
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to update Receipt Voucher draft.");
  },

  async submit(
    id: string,
    payload: SubmitReceiptVoucherPayload,
  ): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.SUBMIT(id),
        payload,
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to submit Receipt Voucher.");
  },

  async approve(id: string): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.APPROVE(id),
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to approve Receipt Voucher.");
  },

  async reject(
    id: string,
    payload: RejectReceiptVoucherPayload,
  ): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.REJECT(id),
        payload,
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to reject Receipt Voucher.");
  },

  async post(id: string): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.POST(id),
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to post Receipt Voucher.");
  },

  async cancel(
    id: string,
    payload: CancelReceiptVoucherPayload,
  ): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.CANCEL(id),
        payload,
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to cancel Receipt Voucher.");
  },

  async reverse(
    id: string,
    payload: ReverseReceiptVoucherPayload,
  ): Promise<ReceiptVoucherDetail> {
    return withReceiptError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.RECEIPT_VOUCHER.REVERSE(id),
        payload,
      );
      return unwrapData<ReceiptVoucherDetail>(response);
    }, "Failed to reverse Receipt Voucher.");
  },
};
