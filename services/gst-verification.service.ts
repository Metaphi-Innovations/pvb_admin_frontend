import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type { GstVerificationDetails } from "@/components/gst/gst.types";

export class GstVerificationApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GstVerificationApiError";
  }
}

function friendlyGstError(error: unknown): string {
  const ax = error as {
    response?: { data?: { message?: string; error?: string }; status?: number };
    code?: string;
    message?: string;
  };

  const apiMessage =
    ax.response?.data?.message || ax.response?.data?.error || "";

  if (apiMessage) {
    const known = [
      "Please enter a valid GSTIN.",
      "GSTIN details could not be found.",
      "GST service is temporarily unavailable.",
      "GSTIN verification failed.",
    ];
    if (known.some((m) => apiMessage.includes(m))) {
      return known.find((m) => apiMessage.includes(m)) || apiMessage;
    }
    if (/valid.*gstin|gstin.*required/i.test(apiMessage)) {
      return "Please enter a valid GSTIN.";
    }
    if (/not found/i.test(apiMessage)) {
      return "GSTIN details could not be found.";
    }
    if (/unavailable|timeout|bad gateway|503|504/i.test(apiMessage)) {
      return "GST service is temporarily unavailable.";
    }
  }

  if (
    ax.code === "ECONNABORTED" ||
    ax.response?.status === 503 ||
    ax.response?.status === 504 ||
    ax.response?.status === 502
  ) {
    return "GST service is temporarily unavailable.";
  }

  if (ax.response?.status === 404) {
    return "GSTIN details could not be found.";
  }

  if (ax.response?.status === 400) {
    return "Please enter a valid GSTIN.";
  }

  return "GSTIN verification failed.";
}

export async function verifyGstinApi(
  gstin: string,
): Promise<GstVerificationDetails> {
  try {
    const response = await axiosInstance.post<ApiResponse<GstVerificationDetails>>(
      API_ENDPOINTS.GST.VERIFY,
      { gstin: gstin.trim().toUpperCase() },
      { timeout: 25000 },
    );

    if (!response.data?.success || !response.data.data) {
      throw new GstVerificationApiError(
        response.data?.message || "GSTIN verification failed.",
      );
    }

    return response.data.data;
  } catch (error) {
    if (error instanceof GstVerificationApiError) {
      throw error;
    }
    throw new GstVerificationApiError(friendlyGstError(error));
  }
}
