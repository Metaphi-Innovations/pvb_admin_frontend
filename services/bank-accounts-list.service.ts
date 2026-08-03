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

/** POST /list and /export query + body params (Sales Order style). */
export interface BankAccountsListParams {
  page?: number;
  pageSize?: number;
  /** @deprecated use pageSize */
  limit?: number;
  search?: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
  financialYearId?: string | null;
  signal?: AbortSignal;
}

export type BankAccountFilterField =
  | "ledger_name"
  | "bank_account__bank_name"
  | "bank_account__account_holder_name"
  | "bank_account__account_number"
  | "bank_account__ifsc_code"
  | "bank_account__account_type"
  | "bank_account__warehouse_mappings__warehouse__warehouse_name"
  | "opening_balances__opening_amount"
  | "opening_balances__balance_type"
  | "status";

/** UI column key → GET /filter?field_name= */
export const BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN: Record<string, BankAccountFilterField> = {
  ledgerName: "ledger_name",
  bankName: "bank_account__bank_name",
  accountHolderName: "bank_account__account_holder_name",
  accountNumber: "bank_account__account_number",
  ifsc: "bank_account__ifsc_code",
  accountType: "bank_account__account_type",
  mappedWarehousesLabel: "bank_account__warehouse_mappings__warehouse__warehouse_name",
  openingBalance: "opening_balances__opening_amount",
  status: "status",
};

/** UI column key → ordering field (prefix `-` for desc). */
export const BANK_ACCOUNT_ORDERING_BY_COLUMN: Record<string, string> = {
  ledgerName: "ledger_name",
  accountNickname: "ledger_name",
  bankName: "bank_account__bank_name",
  accountHolderName: "bank_account__account_holder_name",
  accountNumber: "bank_account__account_number",
  ifsc: "bank_account__ifsc_code",
  accountType: "bank_account__account_type",
  status: "status",
  openingBalance: "opening_balances__opening_amount",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

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
  accountHolderName: string;
  /** Full unmasked account number (empty when bank details pending). */
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: string;
  accountTypeRaw: BankAccountApiAccountType | "";
  openingBalance: number;
  balanceType: "Debit" | "Credit";
  /** Null when API omits / pending — show em dash. */
  currentBalance: number | null;
  currentBalanceType: "Debit" | "Credit" | null;
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

/** Edit/upsert body — same shape as create; backend treats fields as optional. */
export type UpdateBankAccountPayload = CreateBankAccountPayload;

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
  /** Full unmasked account number. */
  accountNumber: string;
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
  currentBalance: string | null;
  currentBalanceType: BankAccountOpeningBalanceType | null;
}

/** Dropdown option from GET .../bank-accounts/options */
export interface BankAccountOption {
  ledgerId: string;
  bankAccountId: string | null;
  bankName: string;
  accountNumber: string;
  label: string;
  ifscCode: string;
  accountHolderName: string;
  status: BankAccountApiStatus;
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

function mapBalanceTypeOrNull(raw: unknown): "Debit" | "Credit" | null {
  if (raw == null || raw === "") return null;
  const v = asString(raw).toUpperCase();
  if (v === "CREDIT") return "Credit";
  if (v === "DEBIT") return "Debit";
  return null;
}

export function mapBankAccountListItem(
  row: Record<string, unknown>,
): BankAccountListRow {
  const ledgerName = asString(row.ledgerName);
  const alias = asString(row.alias);
  const accountNumber = asNullableString(row.accountNumber) ?? "";
  const accountType = mapAccountType(row.accountType);
  const warehouses = mapWarehouses(row.warehouses);
  const warehouseNames = warehouses.map((w) => w.name).filter(Boolean);

  const currentBalanceRaw = row.currentBalance ?? row.current_balance;
  const currentBalance =
    currentBalanceRaw == null || currentBalanceRaw === ""
      ? null
      : asNumber(currentBalanceRaw);

  return {
    ledgerId: asString(row.ledgerId),
    bankAccountId: asNullableString(row.bankAccountId),
    ledgerCode: asString(row.ledgerCode),
    ledgerName,
    alias,
    accountNickname: alias || ledgerName,
    bankName: asString(row.bankName),
    accountHolderName: asString(row.accountHolderName),
    accountNumber,
    ifsc: asString(row.ifscCode ?? row.ifsc),
    branchName: asString(row.branchName),
    accountType: accountType.label,
    accountTypeRaw: accountType.raw,
    openingBalance: asNumber(row.openingBalance),
    balanceType: mapBalanceType(row.openingBalanceType),
    currentBalance,
    currentBalanceType: mapBalanceTypeOrNull(
      row.currentBalanceType ?? row.current_balance_type,
    ),
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
  const currentBalanceRaw = row.currentBalance ?? row.current_balance;
  const currentBalanceTypeRaw =
    row.currentBalanceType ?? row.current_balance_type;
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
    currentBalance:
      currentBalanceRaw == null || currentBalanceRaw === ""
        ? null
        : asString(currentBalanceRaw),
    currentBalanceType:
      currentBalanceTypeRaw == null || currentBalanceTypeRaw === ""
        ? null
        : mapOpeningBalanceType(currentBalanceTypeRaw),
  };
}

function mapBankAccountOption(row: Record<string, unknown>): BankAccountOption {
  const bankName = asString(row.bankName);
  const accountNumber = asString(row.accountNumber);
  const labelFromApi = asNullableString(row.label);
  return {
    ledgerId: asString(row.ledgerId),
    bankAccountId: asNullableString(row.bankAccountId),
    bankName,
    accountNumber,
    label:
      labelFromApi ??
      (bankName && accountNumber
        ? `${bankName} - ${accountNumber}`
        : bankName || accountNumber || "—"),
    ifscCode: asString(row.ifscCode ?? row.ifsc),
    accountHolderName: asString(row.accountHolderName),
    status: mapApiStatus(row.status),
  };
}

/** Map UI SortTh column keys to API ordering string; null if unsupported. */
export function mapUiSortToOrdering(
  sortKey: string | null | undefined,
  sortDir: "asc" | "desc" | null | undefined,
): string | undefined {
  if (!sortKey) return undefined;
  const field = BANK_ACCOUNT_ORDERING_BY_COLUMN[sortKey];
  if (!field) return undefined;
  return sortDir === "desc" ? `-${field}` : field;
}

/** @deprecated Prefer mapUiSortToOrdering for POST /list. */
export function mapUiSortToApi(
  sortKey: string | null | undefined,
  sortDir: "asc" | "desc" | null | undefined,
): { sortBy: BankAccountsListSortBy; sortOrder: BankAccountsListSortOrder } | null {
  const ordering = mapUiSortToOrdering(sortKey, sortDir);
  if (!ordering) return null;
  const desc = ordering.startsWith("-");
  const field = desc ? ordering.slice(1) : ordering;
  const sortBy =
    field === "ledger_name"
      ? "ledgerName"
      : field === "bank_account__bank_name"
        ? "bankName"
        : field === "status"
          ? "status"
          : field === "created_at"
            ? "createdAt"
            : field === "updated_at"
              ? "updatedAt"
              : null;
  if (!sortBy) return null;
  return { sortBy, sortOrder: desc ? "desc" : "asc" };
}

/** Build POST body `filters` from Accounts Excel column filter state (multi-select arrays). */
export function buildBankAccountApiFilters(
  columnFilters: Record<string, { selectedValues?: string[] } | undefined>,
): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  const bankAccount: Record<string, unknown> = {};

  const selected = (key: string): string[] =>
    (columnFilters[key]?.selectedValues ?? []).map((v) => String(v).trim()).filter(Boolean);

  const ledgerName = selected("ledgerName");
  if (ledgerName.length) filters.ledger_name = ledgerName;

  const status = selected("status").map((v) =>
    v.toUpperCase() === "INACTIVE" || v.toLowerCase() === "inactive" ? "INACTIVE" : "ACTIVE",
  );
  if (status.length) filters.status = [...new Set(status)];

  const bankName = selected("bankName");
  if (bankName.length) bankAccount.bank_name = bankName;

  const holder = selected("accountHolderName");
  if (holder.length) bankAccount.account_holder_name = holder;

  const accountNumber = selected("accountNumber");
  if (accountNumber.length) bankAccount.account_number = accountNumber;

  const ifsc = selected("ifsc");
  if (ifsc.length) bankAccount.ifsc_code = ifsc;

  const accountType = selected("accountType").map((v) => {
    const upper = v.toUpperCase().replace(/\s+/g, "_");
    const byLabel = (
      Object.entries(ACCOUNT_TYPE_LABELS) as [BankAccountApiAccountType, string][]
    ).find(
      ([value, label]) =>
        label.toLowerCase() === v.toLowerCase() || value === upper,
    );
    return byLabel?.[0] ?? upper;
  });
  if (accountType.length) bankAccount.account_type = [...new Set(accountType)];

  const warehouses = selected("mappedWarehousesLabel");
  if (warehouses.length) {
    bankAccount.warehouse_mappings = {
      warehouse: { warehouse_name: warehouses },
    };
  }

  if (Object.keys(bankAccount).length > 0) {
    filters.bank_account = bankAccount;
  }

  const openingAmount = selected("openingBalance");
  if (openingAmount.length) {
    filters.opening_balances = {
      ...((filters.opening_balances as Record<string, unknown>) ?? {}),
      opening_amount: openingAmount,
    };
  }

  return filters;
}

/** Map GET /filter response rows → Excel filter value options (no counts — API returns distinct values). */
export function mapBankAccountFilterOptions(
  rows: unknown[],
  fieldName: string,
): { value: string; count: number }[] {
  const values = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const obj = row as Record<string, unknown>;
    const raw = obj[fieldName] ?? Object.values(obj)[0];
    if (raw == null || raw === "") continue;
    values.add(String(raw));
  }
  return [...values]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, count: 0 }));
}

function parseFilenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(disposition);
  if (plain?.[2]) return plain[2].trim();
  return fallback;
}

async function downloadOrHandleEmptyExport(
  response: { data: Blob; headers: Record<string, unknown> },
  fallbackFilename: string,
): Promise<"downloaded" | "empty"> {
  const blob = response.data as Blob;
  const contentType = String(
    response.headers?.["content-type"] ?? response.headers?.["Content-Type"] ?? blob.type ?? "",
  ).toLowerCase();

  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    const text = await blob.text();
    let parsed: { message?: string; data?: unknown } = {};
    try {
      parsed = JSON.parse(text) as { message?: string; data?: unknown };
    } catch {
      throw new Error(text || "Export failed.");
    }
    const msg = String(parsed.message ?? "");
    if (
      /no records found/i.test(msg) ||
      (Array.isArray(parsed.data) && parsed.data.length === 0)
    ) {
      return "empty";
    }
    throw new Error(msg || "Export failed.");
  }

  // Some gateways return JSON with a generic blob type — sniff empty payload.
  if (blob.size > 0 && blob.size < 512 && !contentType.includes("spreadsheet") && !contentType.includes("excel")) {
    try {
      const text = await blob.slice(0, 512).text();
      if (text.trim().startsWith("{")) {
        const parsed = JSON.parse(text) as { message?: string; data?: unknown };
        if (
          /no records found/i.test(String(parsed.message ?? "")) ||
          (Array.isArray(parsed.data) && parsed.data.length === 0)
        ) {
          return "empty";
        }
      }
    } catch {
      /* treat as file */
    }
  }

  const disposition = String(
    response.headers?.["content-disposition"] ?? response.headers?.["Content-Disposition"] ?? "",
  );
  const filename = parseFilenameFromDisposition(disposition, fallbackFilename);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return "downloaded";
}

function buildListQuery(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  financialYearId?: string | null;
}): string {
  const query = new URLSearchParams();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  query.set("page", String(page));
  query.set("page_size", String(pageSize));
  if (params.ordering?.trim()) query.set("ordering", params.ordering.trim());
  if (params.search?.trim()) query.set("search", params.search.trim());
  const fy = params.financialYearId?.trim();
  if (fy && UUID_RE.test(fy)) query.set("financialYearId", fy);
  return query.toString();
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
    const pageSize = params.pageSize ?? params.limit ?? 25;
    const query = buildListQuery({
      page: params.page,
      pageSize,
      search: params.search,
      ordering: params.ordering,
      financialYearId: params.financialYearId,
    });

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.LIST}?${query}`,
      { filters: params.apiFilters ?? {} },
      {
        signal: params.signal,
        headers: fyHeaders(params.financialYearId),
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

  async getFilterDropdown(
    fieldName: BankAccountFilterField | string,
    signal?: AbortSignal,
  ): Promise<unknown[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.FILTER,
      {
        params: { field_name: fieldName },
        signal,
      },
    );
    const payload = response.data as Record<string, unknown>;
    return Array.isArray(payload.data) ? payload.data : [];
  },

  async getOptions(signal?: AbortSignal): Promise<BankAccountOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.OPTIONS,
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      mapBankAccountOption((row ?? {}) as Record<string, unknown>),
    );
  },

  /**
   * POST export with same filters/search/ordering as list (no page/page_size).
   * Returns "empty" when API responds with JSON "No records found".
   */
  async export(params: {
    search?: string;
    ordering?: string;
    apiFilters?: Record<string, unknown>;
    financialYearId?: string | null;
  }): Promise<"downloaded" | "empty"> {
    const query = new URLSearchParams();
    if (params.ordering?.trim()) query.set("ordering", params.ordering.trim());
    if (params.search?.trim()) query.set("search", params.search.trim());
    const fy = params.financialYearId?.trim();
    if (fy && UUID_RE.test(fy)) query.set("financialYearId", fy);

    const qs = query.toString();
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.EXPORT}${qs ? `?${qs}` : ""}`,
      { filters: params.apiFilters ?? {} },
      {
        responseType: "blob",
        headers: fyHeaders(params.financialYearId),
      },
    );

    const today = new Date().toISOString().slice(0, 10);
    return downloadOrHandleEmptyExport(response, `bank_accounts_${today}.xlsx`);
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

  /**
   * Edit / upsert bank account by ledgerId.
   * Used for both completed accounts and PENDING ledgers (upserts bank details).
   * Sends x-financial-year-id only when openingBalance > 0.
   */
  async update(
    ledgerId: string,
    payload: UpdateBankAccountPayload,
    options?: { financialYearId?: string | null },
  ): Promise<BankAccountMutationResult> {
    const openingRaw = payload.openingBalance;
    const openingNum =
      openingRaw == null || openingRaw === "" ? 0 : Number(openingRaw);
    const sendFyHeader = Number.isFinite(openingNum) && openingNum > 0;

    const response = await axiosInstance.put(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.BY_LEDGER(ledgerId),
      payload,
      {
        headers: sendFyHeader
          ? fyHeaders(options?.financialYearId)
          : undefined,
      },
    );
    return extractMutationResult(
      response.data as Record<string, unknown>,
      "Bank account updated successfully",
    );
  },

  async updateStatus(
    bankAccountId: string,
    status: BankAccountApiStatus,
  ): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.ACCOUNTS.BANKING.BANK_ACCOUNTS.STATUS_UPDATE(bankAccountId),
      { status },
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(
        asString(body.message) || "Failed to update bank account status.",
      );
    }
  },

  extractErrorMessage: extractBankAccountErrorMessage,
};
