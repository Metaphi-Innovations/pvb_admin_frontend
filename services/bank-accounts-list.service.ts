import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export type BankAccountApiStatus = "ACTIVE" | "INACTIVE";
export type BankAccountDetailsStatus = "PENDING" | "COMPLETE";
export type BankAccountApiAccountType =
  | "CURRENT"
  | "SAVINGS"
  | "CASH_CREDIT"
  | "OVERDRAFT";
export type BankAccountOpeningBalanceType = "DEBIT" | "CREDIT";

export type BankAccountsListSortBy =
  | "ledgerName"
  | "ledgerCode"
  | "bankName"
  | "createdAt"
  | "updatedAt"
  | "status";

export type BankAccountsListSortOrder = "asc" | "desc";

export interface BankAccountsListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BankAccountApiStatus;
  detailsStatus?: BankAccountDetailsStatus;
  accountType?: BankAccountApiAccountType;
  warehouseId?: string;
  sortBy?: BankAccountsListSortBy;
  sortOrder?: BankAccountsListSortOrder;
  signal?: AbortSignal;
}

export interface BankAccountWarehouse {
  id: string;
  name: string;
}

export interface BankAccountAuditUser {
  user_id: string;
  username: string;
}

/** Row shape used by the Bank Accounts listing UI. */
export interface BankAccountListRow {
  ledgerId: string;
  bankAccountId: string | null;
  ledgerCode: string;
  ledgerName: string;
  alias: string;
  /** Display alias used by existing Account Name column key. */
  accountNickname: string;
  bankName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: string;
  accountTypeRaw: BankAccountApiAccountType | "";
  openingBalance: number;
  balanceType: "Debit" | "Credit";
  /** Not provided by listing API — always null for display as em dash. */
  currentBalance: number | null;
  mappedWarehouseNames: string[];
  mappedWarehousesLabel: string;
  bankDetailsStatus: BankAccountDetailsStatus;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountsListResult {
  items: BankAccountListRow[];
  total: number;
}

export interface CreateBankAccountPayload {
  ledgerName: string;
  alias?: string | null;
  openingBalance?: string | number;
  openingBalanceType?: BankAccountOpeningBalanceType;
  description?: string | null;
  status?: BankAccountApiStatus;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: BankAccountApiAccountType;
  currencyCode?: string;
  reconciliationEnabled?: boolean;
  defaultForReceipts?: boolean;
  defaultForPayments?: boolean;
  warehouseIds?: string[];
}

export interface CompleteBankAccountDetailsPayload {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: BankAccountApiAccountType;
  currencyCode?: string;
  reconciliationEnabled?: boolean;
  defaultForReceipts?: boolean;
  defaultForPayments?: boolean;
  warehouseIds?: string[];
}

export interface BankAccountDetail {
  ledgerId: string;
  bankAccountId: string | null;
  ledgerCode: string;
  ledgerName: string;
  alias: string;
  description: string;
  openingBalance: string;
  openingBalanceType: BankAccountOpeningBalanceType;
  parentPath: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: BankAccountApiAccountType | "";
  currencyCode: string;
  reconciliationEnabled: boolean;
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
  warehouses: BankAccountWarehouse[];
  bankDetailsStatus: BankAccountDetailsStatus;
  status: BankAccountApiStatus;
  editable: boolean;
  createdBy: BankAccountAuditUser | null;
  updatedBy: BankAccountAuditUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountMutationResult {
  message: string;
  data: BankAccountDetail;
}

const ACCOUNT_TYPE_LABELS: Record<BankAccountApiAccountType, string> = {
  CURRENT: "Current",
  SAVINGS: "Savings",
  CASH_CREDIT: "Cash Credit",
  OVERDRAFT: "Overdraft",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  const s = String(value).toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return fallback;
}

function mapAccountType(raw: unknown): {
  label: string;
  raw: BankAccountApiAccountType | "";
} {
  const key = asString(raw).toUpperCase() as BankAccountApiAccountType;
  if (key in ACCOUNT_TYPE_LABELS) {
    return { label: ACCOUNT_TYPE_LABELS[key], raw: key };
  }
  return { label: asString(raw) || "—", raw: "" };
}

function mapBalanceType(raw: unknown): "Debit" | "Credit" {
  const v = asString(raw).toUpperCase();
  return v === "CREDIT" ? "Credit" : "Debit";
}

function mapOpeningBalanceType(raw: unknown): BankAccountOpeningBalanceType {
  return asString(raw).toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT";
}

function mapStatus(raw: unknown): "active" | "inactive" {
  return asString(raw).toUpperCase() === "INACTIVE" ? "inactive" : "active";
}

function mapApiStatus(raw: unknown): BankAccountApiStatus {
  return asString(raw).toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

function mapDetailsStatus(raw: unknown): BankAccountDetailsStatus {
  return asString(raw).toUpperCase() === "PENDING" ? "PENDING" : "COMPLETE";
}

function mapWarehouses(raw: unknown): BankAccountWarehouse[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => {
      if (!w || typeof w !== "object") return null;
      const row = w as Record<string, unknown>;
      const id = asString(row.id);
      const name = asString(row.name);
      if (!id && !name) return null;
      return { id, name };
    })
    .filter((w): w is BankAccountWarehouse => w != null);
}

function mapAuditUser(raw: unknown): BankAccountAuditUser | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const user_id = asString(row.user_id ?? row.userId);
  const username = asString(row.username ?? row.name);
  if (!user_id && !username) return null;
  return { user_id, username };
}

function fyHeaders(financialYearId?: string | null): Record<string, string> | undefined {
  const id = financialYearId?.trim();
  if (!id || !UUID_RE.test(id)) return undefined;
  return { "x-financial-year-id": id };
}

export function mapBankAccountListItem(
  row: Record<string, unknown>,
): BankAccountListRow {
  const ledgerName = asString(row.ledgerName);
  const alias = asString(row.alias);
  const masked =
    asNullableString(row.maskedAccountNumber) ??
    asNullableString(row.accountNumber) ??
    "";
  const accountType = mapAccountType(row.accountType);
  const warehouses = mapWarehouses(row.warehouses);
  const warehouseNames = warehouses.map((w) => w.name).filter(Boolean);

  return {
    ledgerId: asString(row.ledgerId),
    bankAccountId: asNullableString(row.bankAccountId),
    ledgerCode: asString(row.ledgerCode),
    ledgerName,
    alias,
    accountNickname: alias || ledgerName,
    bankName: asString(row.bankName),
    accountNumber: masked,
    maskedAccountNumber: masked,
    ifsc: asString(row.ifscCode ?? row.ifsc),
    branchName: asString(row.branchName),
    accountType: accountType.label,
    accountTypeRaw: accountType.raw,
    openingBalance: asNumber(row.openingBalance),
    balanceType: mapBalanceType(row.openingBalanceType),
    currentBalance: null,
    mappedWarehouseNames: warehouseNames,
    mappedWarehousesLabel: warehouseNames.join(", "),
    bankDetailsStatus: mapDetailsStatus(row.bankDetailsStatus),
    status: mapStatus(row.status),
    createdAt: asString(row.createdAt),
    updatedAt: asString(row.updatedAt),
  };
}

export function mapBankAccountDetail(row: Record<string, unknown>): BankAccountDetail {
  const accountType = mapAccountType(row.accountType);
  return {
    ledgerId: asString(row.ledgerId),
    bankAccountId: asNullableString(row.bankAccountId),
    ledgerCode: asString(row.ledgerCode),
    ledgerName: asString(row.ledgerName),
    alias: asString(row.alias),
    description: asString(row.description),
    openingBalance: asString(row.openingBalance, "0"),
    openingBalanceType: mapOpeningBalanceType(row.openingBalanceType),
    parentPath: asString(row.parentPath),
    bankName: asString(row.bankName),
    accountHolderName: asString(row.accountHolderName),
    accountNumber: asString(row.accountNumber),
    maskedAccountNumber: asString(
      row.maskedAccountNumber ?? row.accountNumber,
    ),
    ifscCode: asString(row.ifscCode ?? row.ifsc),
    branchName: asString(row.branchName),
    accountType: accountType.raw,
    currencyCode: asString(row.currencyCode, "INR").toUpperCase() || "INR",
    reconciliationEnabled: asBoolean(row.reconciliationEnabled, false),
    defaultForReceipts: asBoolean(row.defaultForReceipts, false),
    defaultForPayments: asBoolean(row.defaultForPayments, false),
    warehouses: mapWarehouses(row.warehouses),
    bankDetailsStatus: mapDetailsStatus(row.bankDetailsStatus),
    status: mapApiStatus(row.status),
    editable: asBoolean(row.editable, true),
    createdBy: mapAuditUser(row.createdBy),
    updatedBy: mapAuditUser(row.updatedBy),
    createdAt: asString(row.createdAt),
    updatedAt: asString(row.updatedAt),
  };
}

/** Map UI SortTh column keys to API sortBy when supported; null if client-only. */
export function mapUiSortToApi(
  sortKey: string | null | undefined,
  sortDir: "asc" | "desc" | null | undefined,
): { sortBy: BankAccountsListSortBy; sortOrder: BankAccountsListSortOrder } | null {
  const order: BankAccountsListSortOrder = sortDir === "desc" ? "desc" : "asc";
  switch (sortKey) {
    case "accountNickname":
    case "ledgerName":
      return { sortBy: "ledgerName", sortOrder: order };
    case "bankName":
      return { sortBy: "bankName", sortOrder: order };
    case "status":
      return { sortBy: "status", sortOrder: order };
    case "ledgerCode":
      return { sortBy: "ledgerCode", sortOrder: order };
    default:
      return null;
  }
}

function extractMutationResult(
  payload: Record<string, unknown>,
  fallbackMessage: string,
): BankAccountMutationResult {
  const dataRaw = payload.data;
  if (!dataRaw || typeof dataRaw !== "object") {
    throw new Error("Unexpected response shape: missing 'data'.");
  }
  return {
    message: asString(payload.message, fallbackMessage),
    data: mapBankAccountDetail(dataRaw as Record<string, unknown>),
  };
}

export function extractBankAccountErrorMessage(
  error: unknown,
  fallback: string,
): string {
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

export const ACCOUNT_TYPE_OPTIONS: {
  value: BankAccountApiAccountType;
  label: string;
}[] = [
  { value: "CURRENT", label: "Current" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CASH_CREDIT", label: "Cash Credit" },
  { value: "OVERDRAFT", label: "Overdraft" },
];

export const BankAccountsListService = {
  async list(params: BankAccountsListParams = {}): Promise<BankAccountsListResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.LIST,
      {
        params: {
          page,
          limit,
          ...(params.search?.trim() ? { search: params.search.trim() } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.detailsStatus ? { detailsStatus: params.detailsStatus } : {}),
          ...(params.accountType ? { accountType: params.accountType } : {}),
          ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
          sortBy: params.sortBy ?? "ledgerName",
          sortOrder: params.sortOrder ?? "asc",
        },
        signal: params.signal,
      },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row) =>
      mapBankAccountListItem((row ?? {}) as Record<string, unknown>),
    );

    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async getByLedgerId(
    ledgerId: string,
    options?: { signal?: AbortSignal; financialYearId?: string | null },
  ): Promise<BankAccountDetail> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.BY_LEDGER(ledgerId),
      {
        signal: options?.signal,
        headers: fyHeaders(options?.financialYearId),
      },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object") {
      throw new Error("Unexpected response shape: missing 'data'.");
    }
    return mapBankAccountDetail(data as Record<string, unknown>);
  },

  async create(
    payload: CreateBankAccountPayload,
    options?: { financialYearId?: string | null },
  ): Promise<BankAccountMutationResult> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.CREATE,
      payload,
      { headers: fyHeaders(options?.financialYearId) },
    );
    return extractMutationResult(
      response.data as Record<string, unknown>,
      "Bank account created successfully",
    );
  },

  async completeDetails(
    ledgerId: string,
    payload: CompleteBankAccountDetailsPayload,
    options?: { financialYearId?: string | null },
  ): Promise<BankAccountMutationResult> {
    const response = await axiosInstance.put(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.COMPLETE_DETAILS(ledgerId),
      payload,
      { headers: fyHeaders(options?.financialYearId) },
    );
    return extractMutationResult(
      response.data as Record<string, unknown>,
      "Bank account details saved successfully",
    );
  },

  extractErrorMessage: extractBankAccountErrorMessage,
};
