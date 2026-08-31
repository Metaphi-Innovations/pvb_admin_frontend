import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  AuditHistoryResponse,
  BankReconDashboardResponse,
  BookEntriesQuery,
  BookEntriesResponse,
  DashboardQuery,
  ManualReconcilePayload,
  ManualReconcileResponse,
  MatchesQuery,
  ReconciledMatchesResponse,
  StatementImportDetailItem,
  StatementImportsQuery,
  StatementImportsResponse,
  StatementLinesQuery,
  StatementLinesResponse,
  StatementReconcilePayload,
  StatementReconcileResponse,
  StatementUploadResponse,
  UnreconcilePayload,
  UnreconcileResponse,
} from "@/types/bank-reconciliation.types";

const BASE = API_ENDPOINTS.ACCOUNTS.BANKING.BANK_RECONCILIATION;
const UPLOAD_TIMEOUT_MS = 120_000;

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  const raw =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  if (typeof raw === "string" && raw.includes(":")) {
    const parts = raw.split(":");
    if (parts.length > 1) return parts.slice(1).join(":").trim();
  }
  return raw;
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

async function withBankReconError<T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
}

export const BankReconciliationService = {
  extractErrorMessage,

  async getDashboard(params?: DashboardQuery): Promise<BankReconDashboardResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.DASHBOARD, { params });
      return unwrapData<BankReconDashboardResponse>(response);
    }, "Failed to load Bank Reconciliation dashboard.");
  },

  async getBookEntries(params: BookEntriesQuery): Promise<BookEntriesResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.BOOK_ENTRIES, { params });
      return unwrapData<BookEntriesResponse>(response);
    }, "Failed to load book entries.");
  },

  async manualReconcile(
    payload: ManualReconcilePayload,
  ): Promise<ManualReconcileResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.post(BASE.MANUAL_RECONCILE, payload);
      return unwrapData<ManualReconcileResponse>(response);
    }, "Failed to mark entries reconciled.");
  },

  async unreconcile(payload: UnreconcilePayload): Promise<UnreconcileResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.post(BASE.UNRECONCILE, payload);
      return unwrapData<UnreconcileResponse>(response);
    }, "Failed to unreconcile entries.");
  },

  async uploadStatement(
    bankAccountId: string,
    file: File,
    options?: {
      statementFromDate?: string;
      statementToDate?: string;
      openingBalance?: string | number;
      closingBalance?: string | number;
      columnMapping?: Record<string, string>;
    },
  ): Promise<StatementUploadResponse> {
    return withBankReconError(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bank_account_id", bankAccountId);
      if (options?.statementFromDate) {
        formData.append("statement_from_date", options.statementFromDate);
      }
      if (options?.statementToDate) {
        formData.append("statement_to_date", options.statementToDate);
      }
      if (options?.openingBalance != null && options.openingBalance !== "") {
        formData.append("opening_balance", String(options.openingBalance));
      }
      if (options?.closingBalance != null && options.closingBalance !== "") {
        formData.append("closing_balance", String(options.closingBalance));
      }
      if (options?.columnMapping) {
        formData.append("column_mapping", JSON.stringify(options.columnMapping));
      }

      const response = await axiosInstance.post(BASE.STATEMENT_UPLOAD, formData, {
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return unwrapData<StatementUploadResponse>(response);
    }, "Failed to upload bank statement.");
  },

  async getStatementImports(
    params: StatementImportsQuery,
  ): Promise<StatementImportsResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.STATEMENT_IMPORTS, { params });
      return unwrapData<StatementImportsResponse>(response);
    }, "Failed to load statement import history.");
  },

  async getStatementImportDetail(
    importId: string,
  ): Promise<StatementImportDetailItem> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.STATEMENT_IMPORT_DETAIL(importId));
      return unwrapData<StatementImportDetailItem>(response);
    }, "Failed to load statement import details.");
  },

  async getStatementLines(
    params: StatementLinesQuery,
  ): Promise<StatementLinesResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.STATEMENT_LINES, { params });
      return unwrapData<StatementLinesResponse>(response);
    }, "Failed to load statement lines.");
  },

  async statementReconcile(
    payload: StatementReconcilePayload,
  ): Promise<StatementReconcileResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.post(BASE.STATEMENT_RECONCILE, payload);
      return unwrapData<StatementReconcileResponse>(response);
    }, "Failed to match and reconcile entries.");
  },

  async getMatches(params: MatchesQuery): Promise<ReconciledMatchesResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.MATCHES, { params });
      return unwrapData<ReconciledMatchesResponse>(response);
    }, "Failed to load reconciled matches.");
  },

  async getAudit(params: {
    bank_account_id?: string;
    bank_detail_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<AuditHistoryResponse> {
    return withBankReconError(async () => {
      const response = await axiosInstance.get(BASE.AUDIT, { params });
      return unwrapData<AuditHistoryResponse>(response);
    }, "Failed to load reconciliation audit history.");
  },
};
