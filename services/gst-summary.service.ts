import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  GstSummaryFiltersConfig,
  GstSummaryOverviewResult,
  GstSummaryQueryParams,
  Gstr1HubResult,
  Gstr1SectionId,
  Gstr1SectionQueryParams,
  Gstr1SectionResult,
  Gstr2aAuditRowDto,
  Gstr2aCandidatesResult,
  Gstr2aImportDto,
  Gstr2aImportListResult,
  Gstr2aImportUploadResult,
  Gstr2aPortalRecordsResult,
  Gstr2aReconDetailDto,
  Gstr2aReconListQuery,
  Gstr2aReconRunResult,
  Gstr2aReconciliationListResult,
  Gstr2aReviewStatusApi,
  Gstr2bItcTreatmentBody,
  Gstr3bQueryParams,
  Gstr3bWorkingResult,
} from "@/types/gst-summary.types";

const GSTR2A = API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.GSTR2A;
const GSTR2B = API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.GSTR2B;

export type Gstr2aImportsQuery = {
  financial_year_id?: string;
  gstin?: string;
  return_period?: string;
  import_status?: string;
  page?: number;
  page_size?: number;
};

export type Gstr2aPortalRecordsQuery = {
  import_id?: string;
  financial_year_id?: string;
  gstin?: string;
  return_period?: string;
  supplier_gstin?: string;
  document_category?: string;
  document_number?: string;
  portal_section?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
};

export type Gstr2aCandidatesQuery = {
  supplier_gstin?: string;
  document_number?: string;
  invoice_date?: string;
  taxable_amount?: string;
  gst_amount?: string;
  q?: string;
  page?: number;
  page_size?: number;
};

export type Gstr2aAuditListResult = {
  reconciliation_item_id: string;
  rows: Gstr2aAuditRowDto[];
};

export class GstSummaryApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GstSummaryApiError";
    this.status = status;
  }
}

async function toApiError(
  error: unknown,
  fallback: string,
): Promise<GstSummaryApiError> {
  if (error instanceof GstSummaryApiError) return error;
  const err = error as {
    status?: number;
    message?: string;
    error?: string;
    response?: {
      status?: number;
      data?: { message?: string; error?: string } | string;
    };
  };
  const status = err.status ?? err.response?.status;
  const data = err.response?.data;
  const message =
    err.message ||
    (data && typeof data === "object"
      ? data.message || data.error
      : undefined) ||
    (typeof data === "string" ? data : undefined) ||
    err.error ||
    (status === 401 || status === 403
      ? "Session expired or unauthorized. Please sign in again."
      : fallback);
  return new GstSummaryApiError(message, status);
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

export function joinIds(ids: string[] | undefined): string | undefined {
  const unique = Array.from(
    new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)),
  );
  return unique.length > 0 ? unique.join(",") : undefined;
}

export function buildGstSummaryQueryParams(
  params: GstSummaryQueryParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    financial_year_id: params.financial_year_id,
    from_date: params.from_date,
    to_date: params.to_date,
  };

  if (params.gst_period && params.gst_period !== "all") {
    query.gst_period = params.gst_period;
  }

  const branchIds = joinIds(params.branch_ids);
  if (branchIds) query.branch_ids = branchIds;

  const warehouseIds = joinIds(params.warehouse_ids);
  if (warehouseIds) query.warehouse_ids = warehouseIds;

  if (params.gstin?.trim()) query.gstin = params.gstin.trim();

  return query;
}

export function buildGstr1SectionQueryParams(
  params: Gstr1SectionQueryParams,
): Record<string, string | number> {
  const query = buildGstSummaryQueryParams(params);
  query.page = params.page ?? 1;
  query.page_size = params.page_size ?? 25;
  query.sort_by = params.sort_by ?? "document_date";
  query.sort_order = params.sort_order ?? "desc";
  return query;
}

function authHeaders(financialYearId: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (financialYearId.trim()) {
    headers["x-financial-year-id"] = financialYearId.trim();
  }
  return headers;
}

function compactParams(
  params: Record<string, string | number | undefined | null>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(disposition);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

async function messageFromBlob(blob: Blob): Promise<string | undefined> {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    return parsed.message || parsed.error;
  } catch {
    return undefined;
  }
}

export const GstSummaryApiService = {
  async getFilters(signal?: AbortSignal): Promise<GstSummaryFiltersConfig> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.FILTERS,
        { signal },
      );
      return unwrapData<GstSummaryFiltersConfig>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GST Summary filters.");
    }
  },

  async getOverview(
    params: GstSummaryQueryParams,
    signal?: AbortSignal,
  ): Promise<GstSummaryOverviewResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.OVERVIEW,
        {
          params: buildGstSummaryQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<GstSummaryOverviewResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GST Summary overview.");
    }
  },

  async getGstr1Hub(
    params: GstSummaryQueryParams,
    signal?: AbortSignal,
  ): Promise<Gstr1HubResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.GSTR1,
        {
          params: buildGstSummaryQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<Gstr1HubResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-1 summary.");
    }
  },

  async getGstr1Section(
    sectionId: Gstr1SectionId | string,
    params: Gstr1SectionQueryParams,
    signal?: AbortSignal,
  ): Promise<Gstr1SectionResult> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.GSTR1_SECTION(sectionId),
        {
          params: buildGstr1SectionQueryParams(params),
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<Gstr1SectionResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-1 section.");
    }
  },

  async uploadGstr2a(
    payload: {
      financial_year_id: string;
      gstin: string;
      return_period: string;
      file: File;
    },
    signal?: AbortSignal,
  ): Promise<Gstr2aImportUploadResult> {
    try {
      const formData = new FormData();
      formData.append("financial_year_id", payload.financial_year_id);
      formData.append("gstin", payload.gstin);
      formData.append("return_period", payload.return_period);
      formData.append("file", payload.file);
      const response = await axiosInstance.post(GSTR2A.IMPORTS, formData, {
        headers: authHeaders(payload.financial_year_id),
        signal,
        timeout: 120_000,
      });
      return unwrapData<Gstr2aImportUploadResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to upload GSTR-2A JSON.");
    }
  },

  async getGstr2aImports(
    query: Gstr2aImportsQuery,
    signal?: AbortSignal,
  ): Promise<Gstr2aImportListResult> {
    try {
      const response = await axiosInstance.get(GSTR2A.IMPORTS, {
        params: compactParams({
          financial_year_id: query.financial_year_id,
          gstin: query.gstin,
          return_period: query.return_period,
          import_status: query.import_status,
          page: query.page,
          page_size: query.page_size,
        }),
        headers: query.financial_year_id
          ? authHeaders(query.financial_year_id)
          : undefined,
        signal,
      });
      return unwrapData<Gstr2aImportListResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2A imports.");
    }
  },

  async getGstr2aImportDetail(
    id: string,
    signal?: AbortSignal,
  ): Promise<Gstr2aImportDto> {
    try {
      const response = await axiosInstance.get(GSTR2A.IMPORT_DETAIL(id), {
        signal,
      });
      return unwrapData<Gstr2aImportDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2A import detail.");
    }
  },

  async downloadGstr2aImportFile(
    id: string,
    financialYearId?: string,
  ): Promise<void> {
    try {
      const response = await axiosInstance.get(GSTR2A.IMPORT_FILE(id), {
        headers: financialYearId ? authHeaders(financialYearId) : undefined,
        responseType: "blob",
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const contentType = String(response.headers?.["content-type"] ?? "");
      const blob = response.data as Blob;
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/html")
      ) {
        const message =
          (await messageFromBlob(blob)) ||
          "Failed to download GSTR-2A import file.";
        throw new GstSummaryApiError(message, response.status);
      }
      if (!blob || blob.size === 0) {
        throw new GstSummaryApiError("Download returned an empty file.");
      }
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        `gstr2a-import-${id}.json`,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to download GSTR-2A import file.");
    }
  },

  async getGstr2aPortalRecords(
    query: Gstr2aPortalRecordsQuery,
    signal?: AbortSignal,
  ): Promise<Gstr2aPortalRecordsResult> {
    try {
      const response = await axiosInstance.get(GSTR2A.RECORDS, {
        params: compactParams({
          import_id: query.import_id,
          financial_year_id: query.financial_year_id,
          gstin: query.gstin,
          return_period: query.return_period,
          supplier_gstin: query.supplier_gstin,
          document_category: query.document_category,
          document_number: query.document_number,
          portal_section: query.portal_section,
          page: query.page,
          page_size: query.page_size,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        }),
        headers: query.financial_year_id
          ? authHeaders(query.financial_year_id)
          : undefined,
        signal,
      });
      return unwrapData<Gstr2aPortalRecordsResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2A portal records.");
    }
  },

  async runGstr2aReconciliation(
    body: {
      financial_year_id: string;
      gstin: string;
      return_period: string;
    },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconRunResult> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_RUN,
        body,
        {
          headers: authHeaders(body.financial_year_id),
          signal,
        },
      );
      return unwrapData<Gstr2aReconRunResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to run GSTR-2A reconciliation.");
    }
  },

  async getGstr2aReconciliation(
    query: Gstr2aReconListQuery,
    signal?: AbortSignal,
  ): Promise<Gstr2aReconciliationListResult> {
    try {
      const response = await axiosInstance.get(GSTR2A.RECONCILIATION, {
        params: compactParams({
          financial_year_id: query.financial_year_id,
          gstin: query.gstin,
          return_period: query.return_period,
          import_id: query.import_id,
          match_status: query.match_status,
          review_status: query.review_status,
          supplier_gstin: query.supplier_gstin,
          document_number: query.document_number,
          page: query.page,
          page_size: query.page_size,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        }),
        headers: query.financial_year_id
          ? authHeaders(query.financial_year_id)
          : undefined,
        signal,
      });
      return unwrapData<Gstr2aReconciliationListResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2A reconciliation.");
    }
  },

  async getGstr2aReconciliationDetail(
    id: string,
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.get(
        GSTR2A.RECONCILIATION_DETAIL(id),
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(
        error,
        "Failed to load GSTR-2A reconciliation detail.",
      );
    }
  },

  async getGstr2aCandidates(
    id: string,
    query: Gstr2aCandidatesQuery = {},
    signal?: AbortSignal,
  ): Promise<Gstr2aCandidatesResult> {
    try {
      const response = await axiosInstance.get(
        GSTR2A.RECONCILIATION_CANDIDATES(id),
        {
          params: compactParams({
            supplier_gstin: query.supplier_gstin,
            document_number: query.document_number,
            invoice_date: query.invoice_date,
            taxable_amount: query.taxable_amount,
            gst_amount: query.gst_amount,
            q: query.q,
            page: query.page,
            page_size: query.page_size,
          }),
          signal,
        },
      );
      return unwrapData<Gstr2aCandidatesResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load match candidates.");
    }
  },

  async matchGstr2aInvoice(
    id: string,
    body: { purchase_invoice_id: string; reason?: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_MATCH(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to match GSTR-2A invoice.");
    }
  },

  async acceptGstr2aMatch(
    id: string,
    body: { reason: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_ACCEPT_MATCH(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to accept GSTR-2A match.");
    }
  },

  async unmatchGstr2aInvoice(
    id: string,
    body: { reason: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_UNMATCH(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to unmatch GSTR-2A invoice.");
    }
  },

  async markGstr2aReview(
    id: string,
    body: {
      review_status: Extract<
        Gstr2aReviewStatusApi,
        "MARKED_FOR_REVIEW" | "REVIEWED"
      >;
      reason?: string;
    },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_REVIEW(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to update GSTR-2A review status.");
    }
  },

  async resolveGstr2aReview(
    id: string,
    body: { reason: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_RESOLVE(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to resolve GSTR-2A review.");
    }
  },

  async saveGstr2aRemark(
    id: string,
    body: { remark: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2A.RECONCILIATION_REMARKS(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to save GSTR-2A remark.");
    }
  },

  async getGstr2aAudit(
    id: string,
    signal?: AbortSignal,
  ): Promise<Gstr2aAuditListResult> {
    try {
      const response = await axiosInstance.get(GSTR2A.RECONCILIATION_AUDIT(id), {
        signal,
      });
      return unwrapData<Gstr2aAuditListResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2A audit history.");
    }
  },

  /* ─────────── GSTR-2B (same contracts; statement_type = GSTR_2B) ─────────── */

  async uploadGstr2b(
    payload: {
      financial_year_id: string;
      gstin: string;
      return_period: string;
      file: File;
    },
    signal?: AbortSignal,
  ): Promise<Gstr2aImportUploadResult> {
    try {
      const formData = new FormData();
      formData.append("financial_year_id", payload.financial_year_id);
      formData.append("gstin", payload.gstin);
      formData.append("return_period", payload.return_period);
      formData.append("file", payload.file);
      const response = await axiosInstance.post(GSTR2B.IMPORTS, formData, {
        headers: authHeaders(payload.financial_year_id),
        signal,
        timeout: 120_000,
      });
      return unwrapData<Gstr2aImportUploadResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to upload GSTR-2B JSON.");
    }
  },

  async getGstr2bImports(
    query: Gstr2aImportsQuery,
    signal?: AbortSignal,
  ): Promise<Gstr2aImportListResult> {
    try {
      const response = await axiosInstance.get(GSTR2B.IMPORTS, {
        params: compactParams({
          financial_year_id: query.financial_year_id,
          gstin: query.gstin,
          return_period: query.return_period,
          import_status: query.import_status,
          page: query.page,
          page_size: query.page_size,
        }),
        headers: query.financial_year_id
          ? authHeaders(query.financial_year_id)
          : undefined,
        signal,
      });
      return unwrapData<Gstr2aImportListResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2B imports.");
    }
  },

  async getGstr2bImportDetail(
    id: string,
    signal?: AbortSignal,
  ): Promise<Gstr2aImportDto> {
    try {
      const response = await axiosInstance.get(GSTR2B.IMPORT_DETAIL(id), {
        signal,
      });
      return unwrapData<Gstr2aImportDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2B import detail.");
    }
  },

  async downloadGstr2bImportFile(
    id: string,
    financialYearId?: string,
  ): Promise<void> {
    try {
      const response = await axiosInstance.get(GSTR2B.IMPORT_FILE(id), {
        headers: financialYearId ? authHeaders(financialYearId) : undefined,
        responseType: "blob",
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const contentType = String(response.headers?.["content-type"] ?? "");
      const blob = response.data as Blob;
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/html")
      ) {
        const message =
          (await messageFromBlob(blob)) ||
          "Failed to download GSTR-2B import file.";
        throw new GstSummaryApiError(message, response.status);
      }
      if (!blob || blob.size === 0) {
        throw new GstSummaryApiError("Download returned an empty file.");
      }
      const filename = filenameFromDisposition(
        response.headers?.["content-disposition"] as string | undefined,
        `gstr2b-import-${id}.json`,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      throw await toApiError(error, "Failed to download GSTR-2B import file.");
    }
  },

  async getGstr2bPortalRecords(
    query: Gstr2aPortalRecordsQuery,
    signal?: AbortSignal,
  ): Promise<Gstr2aPortalRecordsResult> {
    try {
      const response = await axiosInstance.get(GSTR2B.RECORDS, {
        params: compactParams({
          import_id: query.import_id,
          financial_year_id: query.financial_year_id,
          gstin: query.gstin,
          return_period: query.return_period,
          supplier_gstin: query.supplier_gstin,
          document_category: query.document_category,
          document_number: query.document_number,
          portal_section: query.portal_section,
          page: query.page,
          page_size: query.page_size,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        }),
        headers: query.financial_year_id
          ? authHeaders(query.financial_year_id)
          : undefined,
        signal,
      });
      return unwrapData<Gstr2aPortalRecordsResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2B portal records.");
    }
  },

  async runGstr2bReconciliation(
    body: {
      financial_year_id: string;
      gstin: string;
      return_period: string;
    },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconRunResult> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_RUN,
        body,
        {
          headers: authHeaders(body.financial_year_id),
          signal,
        },
      );
      return unwrapData<Gstr2aReconRunResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to run GSTR-2B reconciliation.");
    }
  },

  async getGstr2bReconciliation(
    query: Gstr2aReconListQuery,
    signal?: AbortSignal,
  ): Promise<Gstr2aReconciliationListResult> {
    try {
      const response = await axiosInstance.get(GSTR2B.RECONCILIATION, {
        params: compactParams({
          financial_year_id: query.financial_year_id,
          gstin: query.gstin,
          return_period: query.return_period,
          import_id: query.import_id,
          match_status: query.match_status,
          review_status: query.review_status,
          supplier_gstin: query.supplier_gstin,
          document_number: query.document_number,
          page: query.page,
          page_size: query.page_size,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        }),
        headers: query.financial_year_id
          ? authHeaders(query.financial_year_id)
          : undefined,
        signal,
      });
      return unwrapData<Gstr2aReconciliationListResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2B reconciliation.");
    }
  },

  async getGstr2bReconciliationDetail(
    id: string,
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.get(
        GSTR2B.RECONCILIATION_DETAIL(id),
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(
        error,
        "Failed to load GSTR-2B reconciliation detail.",
      );
    }
  },

  async getGstr2bCandidates(
    id: string,
    query: Gstr2aCandidatesQuery = {},
    signal?: AbortSignal,
  ): Promise<Gstr2aCandidatesResult> {
    try {
      const response = await axiosInstance.get(
        GSTR2B.RECONCILIATION_CANDIDATES(id),
        {
          params: compactParams({
            supplier_gstin: query.supplier_gstin,
            document_number: query.document_number,
            invoice_date: query.invoice_date,
            taxable_amount: query.taxable_amount,
            gst_amount: query.gst_amount,
            q: query.q,
            page: query.page,
            page_size: query.page_size,
          }),
          signal,
        },
      );
      return unwrapData<Gstr2aCandidatesResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load match candidates.");
    }
  },

  async matchGstr2bInvoice(
    id: string,
    body: { purchase_invoice_id: string; reason?: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_MATCH(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to match GSTR-2B invoice.");
    }
  },

  async acceptGstr2bMatch(
    id: string,
    body: { reason: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_ACCEPT_MATCH(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to accept GSTR-2B match.");
    }
  },

  async unmatchGstr2bInvoice(
    id: string,
    body: { reason: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_UNMATCH(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to unmatch GSTR-2B invoice.");
    }
  },

  async markGstr2bReview(
    id: string,
    body: {
      review_status: Extract<
        Gstr2aReviewStatusApi,
        "MARKED_FOR_REVIEW" | "REVIEWED"
      >;
      reason?: string;
    },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_REVIEW(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to update GSTR-2B review status.");
    }
  },

  async resolveGstr2bReview(
    id: string,
    body: { reason: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_RESOLVE(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to resolve GSTR-2B review.");
    }
  },

  async saveGstr2bRemark(
    id: string,
    body: { remark: string },
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_REMARKS(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to save GSTR-2B remark.");
    }
  },

  async getGstr2bAudit(
    id: string,
    signal?: AbortSignal,
  ): Promise<Gstr2aAuditListResult> {
    try {
      const response = await axiosInstance.get(GSTR2B.RECONCILIATION_AUDIT(id), {
        signal,
      });
      return unwrapData<Gstr2aAuditListResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-2B audit history.");
    }
  },

  async setGstr2bItcTreatment(
    id: string,
    body: Gstr2bItcTreatmentBody,
    signal?: AbortSignal,
  ): Promise<Gstr2aReconDetailDto> {
    try {
      const response = await axiosInstance.post(
        GSTR2B.RECONCILIATION_ITC_TREATMENT(id),
        body,
        { signal },
      );
      return unwrapData<Gstr2aReconDetailDto>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to update PVB ITC treatment.");
    }
  },

  /**
   * GSTR-3B V1 limited working report.
   * Requires gstin + return_period (YYYY-MM).
   */
  async getGstr3b(
    params: Gstr3bQueryParams,
    signal?: AbortSignal,
  ): Promise<Gstr3bWorkingResult> {
    try {
      const base = buildGstSummaryQueryParams(params);
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.REPORTS.GST_SUMMARY.GSTR3B,
        {
          params: {
            ...base,
            return_period: params.return_period,
            gst_period: params.return_period,
          },
          headers: authHeaders(params.financial_year_id),
          signal,
        },
      );
      return unwrapData<Gstr3bWorkingResult>(response);
    } catch (error) {
      throw await toApiError(error, "Failed to load GSTR-3B working report.");
    }
  },
};
