import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";

export type CoaApiNodeType =
  | "PRIMARY_HEAD"
  | "ACCOUNT_GROUP"
  | "ACCOUNT_SUB_GROUP"
  | "LEDGER";

export interface CoaApiTreeNode {
  id: string;
  name: string;
  code: string;
  level: number;
  type: CoaApiNodeType;
  status: string;
  childCount: number;
  parentId: string | null;
  isExpandable: boolean;
  isSystemDefined: boolean;
  sourceType?: string | null;
  sourceEntityId?: string | null;
  sourceEntityCode?: string | null;
  openingBalance?: {
    amount: string;
    balanceType: string;
    financialYearId: string;
  } | null;
  children?: CoaApiTreeNode[];
}

export interface CoaTreeQueryParams {
  search?: string;
  status?: string;
  includeLedgers?: boolean;
  sourceType?: string;
  financialYearId?: string;
  parentId?: string;
  signal?: AbortSignal;
}

function unwrapData<T>(response: { data?: ApiResponse<T> | T }): T {
  const body = response.data as ApiResponse<T> | T | undefined;
  if (body && typeof body === "object" && "data" in body && (body as ApiResponse<T>).data !== undefined) {
    return (body as ApiResponse<T>).data as T;
  }
  return body as T;
}

export const ChartOfAccountsService = {
  async getTree(params: CoaTreeQueryParams = {}): Promise<CoaApiTreeNode[]> {
    const { signal, ...query } = params;
    const response = await axiosInstance.get<ApiResponse<CoaApiTreeNode[]>>(
      API_ENDPOINTS.ACCOUNTS.CHART_OF_ACCOUNTS.TREE,
      {
        params: {
          includeLedgers: query.includeLedgers ?? true,
          ...(query.search ? { search: query.search } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.sourceType ? { sourceType: query.sourceType } : {}),
          ...(query.financialYearId ? { financialYearId: query.financialYearId } : {}),
          ...(query.parentId ? { parentId: query.parentId } : {}),
        },
        signal,
      },
    );
    const data = unwrapData(response);
    return Array.isArray(data) ? data : [];
  },

  async previewLedgerNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get<ApiResponse<{ previewNumber: string }>>(
      API_ENDPOINTS.ACCOUNTS.LEDGERS.PREVIEW_NUMBER,
      { signal },
    );
    const data = unwrapData(response);
    return data?.previewNumber ?? "";
  },

  async generateCoaPdf(params: {
    htmlContent: string;
    filename: string;
    landscape?: boolean;
  }): Promise<Blob> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.CHART_OF_ACCOUNTS.PDF,
      { htmlContent: params.htmlContent, filename: params.filename, landscape: params.landscape ?? false },
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
};
