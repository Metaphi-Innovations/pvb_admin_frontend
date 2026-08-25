import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  CancelPaymentVoucherPayload,
  CreatePaymentVoucherPayload,
  CustomerRefundableResponse,
  PaymentAttachmentMeta,
  PaymentVoucherConfig,
  PaymentVoucherDetail,
  PaymentVoucherListQuery,
  PaymentVoucherListResponse,
  RejectPaymentVoucherPayload,
  ReversePaymentVoucherPayload,
  SubmitPaymentVoucherPayload,
  SupplierOutstandingResponse,
  UpdatePaymentVoucherPayload,
} from "@/types/payment-voucher.types";
import { buildPaymentMultipartFormData } from "@/app/(app)/accounts/vouchers/payment/payment-attachment-formdata";

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

async function withPaymentError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

const PAYMENT_UPLOAD_TIMEOUT_MS = 120_000;

export const PaymentVoucherService = {
  extractErrorMessage,

  async getConfig(): Promise<PaymentVoucherConfig> {
    return withPaymentError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.CONFIG,
      );
      const data = unwrapData<PaymentVoucherConfig>(response);
      return data ?? { approval_required: true };
    }, "Failed to load Payment Voucher configuration.");
  },

  async list(params?: PaymentVoucherListQuery): Promise<PaymentVoucherListResponse> {
    return withPaymentError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.LIST,
        { params },
      );
      const data = unwrapData<PaymentVoucherListResponse>(response);
      if (data && Array.isArray((data as PaymentVoucherListResponse).data)) {
        return data as PaymentVoucherListResponse;
      }
      const alt = data as unknown as {
        items?: PaymentVoucherListResponse["data"];
        data?: PaymentVoucherListResponse["data"];
        pagination?: PaymentVoucherListResponse["pagination"];
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
    }, "Failed to list Payment Vouchers.");
  },

  async getById(id: string): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.GET_BY_ID(id),
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to load Payment Voucher.");
  },

  async listSupplierOutstanding(
    supplierId: string,
  ): Promise<SupplierOutstandingResponse> {
    return withPaymentError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.SUPPLIER_OUTSTANDING(supplierId),
      );
      return unwrapData<SupplierOutstandingResponse>(response);
    }, "Failed to load supplier outstanding items.");
  },

  async listCustomerRefundable(
    customerId: string,
  ): Promise<CustomerRefundableResponse> {
    return withPaymentError(async () => {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.CUSTOMER_REFUNDABLE(customerId),
      );
      return unwrapData<CustomerRefundableResponse>(response);
    }, "Failed to load customer refundable items.");
  },

  async create(
    payload: CreatePaymentVoucherPayload,
    pendingFiles: File[] = [],
  ): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const formData = buildPaymentMultipartFormData(payload, {
        pendingFiles,
        isUpdate: false,
      });
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.CREATE,
        formData,
        { timeout: PAYMENT_UPLOAD_TIMEOUT_MS },
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to create Payment Voucher draft.");
  },

  async update(
    id: string,
    payload: UpdatePaymentVoucherPayload,
    options?: {
      pendingFiles?: File[];
      existingAttachments?: PaymentAttachmentMeta[];
    },
  ): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const formData = buildPaymentMultipartFormData(payload, {
        pendingFiles: options?.pendingFiles ?? [],
        existingAttachments:
          options?.existingAttachments ?? payload.existing_attachments ?? [],
        isUpdate: true,
      });
      const response = await axiosInstance.put(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.UPDATE(id),
        formData,
        { timeout: PAYMENT_UPLOAD_TIMEOUT_MS },
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to update Payment Voucher draft.");
  },

  async submit(
    id: string,
    payload: SubmitPaymentVoucherPayload,
  ): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.SUBMIT(id),
        payload,
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to submit Payment Voucher.");
  },

  async approve(id: string): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.APPROVE(id),
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to approve Payment Voucher.");
  },

  async reject(
    id: string,
    payload: RejectPaymentVoucherPayload,
  ): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.REJECT(id),
        payload,
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to reject Payment Voucher.");
  },

  async post(id: string): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.POST(id),
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to post Payment Voucher.");
  },

  async cancel(
    id: string,
    payload: CancelPaymentVoucherPayload,
  ): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.CANCEL(id),
        payload,
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to cancel Payment Voucher.");
  },

  async reverse(
    id: string,
    payload: ReversePaymentVoucherPayload,
  ): Promise<PaymentVoucherDetail> {
    return withPaymentError(async () => {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PAYMENT_VOUCHER.REVERSE(id),
        payload,
      );
      return unwrapData<PaymentVoucherDetail>(response);
    }, "Failed to reverse Payment Voucher.");
  },
};
