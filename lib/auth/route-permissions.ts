import type { PermissionAction } from "./permissions";

/**
 * Route → Module + Submodule requirement.
 * Page access requires the action (default: view) on that submodule.
 * Alternatives cover UI registry ids vs backend codes.
 */

export interface ModuleSubmoduleRef {
  module: string;
  submodule: string;
}

export interface RoutePermissionRule {
  prefix: string;
  /** Auth-only when omitted / empty candidates. */
  candidates?: ModuleSubmoduleRef[];
  action?: PermissionAction;
}

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  {
    prefix: "/user-management/employee",
    candidates: [
      { module: "usermanagement", submodule: "user" },
      { module: "userManagement", submodule: "user" },
    ],
  },
  {
    prefix: "/user-management/department",
    candidates: [
      { module: "usermanagement", submodule: "department" },
      { module: "userManagement", submodule: "department" },
    ],
  },
  {
    prefix: "/user-management/roles",
    candidates: [
      { module: "usermanagement", submodule: "roles" },
      { module: "userManagement", submodule: "roles" },
    ],
  },
  {
    prefix: "/masters/geography",
    candidates: [
      { module: "usermanagement", submodule: "geography" },
      { module: "userManagement", submodule: "geography" },
    ],
  },
  {
    prefix: "/masters/crops",
    candidates: [
      { module: "masters", submodule: "crop" },
      { module: "masters", submodule: "cropMaster" },
    ],
  },
  {
    prefix: "/masters/products",
    candidates: [
      { module: "masters", submodule: "products" },
      { module: "masters", submodule: "productMaster" },
    ],
  },
  {
    prefix: "/masters/brands",
    candidates: [
      { module: "masters", submodule: "brand" },
      { module: "masters", submodule: "brandMaster" },
    ],
  },
  {
    prefix: "/masters/categories",
    candidates: [
      { module: "masters", submodule: "category" },
      { module: "masters", submodule: "categoryMaster" },
    ],
  },
  {
    prefix: "/masters/hsn",
    candidates: [
      { module: "masters", submodule: "hsn" },
      { module: "masters", submodule: "hsnTax" },
    ],
  },
  { prefix: "/masters/gst", candidates: [{ module: "masters", submodule: "gst" }] },
  {
    prefix: "/masters/customers",
    candidates: [
      { module: "masters", submodule: "customer" },
      { module: "masters", submodule: "customerMaster" },
    ],
  },
  {
    prefix: "/masters/customer-types",
    candidates: [
      { module: "masters", submodule: "customer_type" },
      { module: "masters", submodule: "customerCategory" },
    ],
  },
  {
    prefix: "/masters/vendors",
    candidates: [
      { module: "masters", submodule: "supplier" },
      { module: "masters", submodule: "vendorManagement" },
    ],
  },
  {
    prefix: "/masters/vendor-type",
    candidates: [
      { module: "masters", submodule: "supplier_type" },
      { module: "masters", submodule: "vendorCategory" },
    ],
  },
  {
    prefix: "/masters/warehouse",
    candidates: [
      { module: "masters", submodule: "warehouse" },
      { module: "masters", submodule: "warehouseMaster" },
    ],
  },
  {
    prefix: "/masters/uom",
    candidates: [
      { module: "masters", submodule: "unit" },
      { module: "masters", submodule: "uomMaster" },
    ],
  },
  { prefix: "/masters/tds", candidates: [{ module: "masters", submodule: "tds" }] },
  { prefix: "/masters/tcs", candidates: [{ module: "masters", submodule: "tcs" }] },
  {
    prefix: "/masters/additional-charges",
    candidates: [{ module: "masters", submodule: "additional_charge" }],
  },
  {
    prefix: "/masters/document-types",
    candidates: [{ module: "masters", submodule: "document_type" }],
  },
  {
    prefix: "/masters/event-types",
    candidates: [{ module: "masters", submodule: "event_type" }],
  },
  {
    prefix: "/masters/formulation",
    candidates: [{ module: "masters", submodule: "formulation" }],
  },
  { prefix: "/masters/cfu", candidates: [{ module: "masters", submodule: "cfu" }] },
  { prefix: "/masters/pricing", candidates: [{ module: "masters", submodule: "pricing" }] },
  { prefix: "/masters/scheme", candidates: [{ module: "masters", submodule: "scheme" }] },
  { prefix: "/masters/segment", candidates: [{ module: "masters", submodule: "segment" }] },
  {
    prefix: "/procurement/purchase-requests",
    candidates: [
      { module: "procurement", submodule: "purchase_requests" },
      { module: "procurement", submodule: "purchaseRequisition" },
    ],
  },
  {
    prefix: "/procurement/purchase-orders",
    candidates: [
      { module: "procurement", submodule: "purchase_orders" },
      { module: "procurement", submodule: "purchaseOrder" },
    ],
  },
  {
    prefix: "/sales/orders",
    candidates: [
      { module: "sales", submodule: "sales_orders" },
      { module: "sales", submodule: "salesOrder" },
    ],
  },
  {
    prefix: "/sales/sample-order",
    candidates: [{ module: "sales", submodule: "sample_orders" }],
  },
  {
    prefix: "/sales/stock-transfer",
    candidates: [{ module: "sales", submodule: "stock_transfers" }],
  },
  {
    prefix: "/sales/scheme-progress",
    candidates: [{ module: "sales", submodule: "scheme_progress" }],
  },
  {
    prefix: "/warehouse/grn",
    candidates: [
      { module: "warehouse", submodule: "grn" },
      { module: "warehouse", submodule: "grn_qc" },
    ],
  },
  {
    prefix: "/warehouse/qc",
    candidates: [
      { module: "warehouse", submodule: "qc" },
      { module: "warehouse", submodule: "grn_qc" },
    ],
  },
  { prefix: "/warehouse/packing", candidates: [{ module: "warehouse", submodule: "packing" }] },
  { prefix: "/warehouse/dispatch", candidates: [{ module: "warehouse", submodule: "dispatch" }] },
  {
    prefix: "/warehouse/reorder-level",
    candidates: [{ module: "warehouse", submodule: "reorder_level" }],
  },
  {
    prefix: "/warehouse/stockoverview",
    candidates: [{ module: "warehouse", submodule: "stock_overview" }],
  },
  {
    prefix: "/warehouse/stock-overview",
    candidates: [{ module: "warehouse", submodule: "stock_overview" }],
  },
  {
    prefix: "/events/event",
    candidates: [
      { module: "events", submodule: "event" },
      { module: "events", submodule: "events" },
    ],
  },
  {
    prefix: "/events/demo",
    candidates: [
      { module: "events", submodule: "demo" },
    ],
  },
  {
    prefix: "/events",
    candidates: [
      { module: "events", submodule: "event" },
      { module: "events", submodule: "demo" },
      { module: "events", submodule: "events" },
    ],
  },
  {
    prefix: "/database/farmer",
    candidates: [
      { module: "database", submodule: "farmer" },
    ],
  },
  {
    prefix: "/database/distributor",
    candidates: [
      { module: "database", submodule: "distributor" },
    ],
  },

  // Accounts routes
  { prefix: "/accounts/masters/chart-of-accounts", candidates: [{ module: "accounts", submodule: "chart_of_accounts" }, { module: "accounts", submodule: "masters.chart_of_accounts" }, { module: "accounts", submodule: "coa" }] },
  { prefix: "/accounts/sales/pending-tax-invoices", candidates: [{ module: "accounts", submodule: "pending_invoices" }, { module: "accounts", submodule: "transactions.pending_invoices" }] },
  { prefix: "/accounts/transactions/invoices", candidates: [{ module: "accounts", submodule: "sales_invoice" }, { module: "accounts", submodule: "transactions.sales_invoice" }] },
  { prefix: "/accounts/purchase-invoices", candidates: [{ module: "accounts", submodule: "purchase_invoice" }, { module: "accounts", submodule: "transactions.purchase_invoice" }] },
  { prefix: "/accounts/purchases/pending-vendor-bills", candidates: [{ module: "accounts", submodule: "purchase_invoice" }, { module: "accounts", submodule: "transactions.purchase_invoice" }] },
  { prefix: "/accounts/transactions/credit-notes", candidates: [{ module: "accounts", submodule: "credit_note" }, { module: "accounts", submodule: "transactions.credit_note" }] },
  { prefix: "/accounts/transactions/debit-notes", candidates: [{ module: "accounts", submodule: "debit_note" }, { module: "accounts", submodule: "transactions.debit_note" }] },
  { prefix: "/accounts/vouchers", candidates: [
    { module: "accounts", submodule: "receipt_voucher" },
    { module: "accounts", submodule: "payment_voucher" },
    { module: "accounts", submodule: "journal_voucher" },
    { module: "accounts", submodule: "contra_voucher" },
    { module: "accounts", submodule: "transactions.receipt_voucher" },
    { module: "accounts", submodule: "transactions.payment_voucher" },
    { module: "accounts", submodule: "transactions.journal_voucher" },
    { module: "accounts", submodule: "transactions.contra_voucher" },
  ] },
  { prefix: "/accounts/receivables/outstanding", candidates: [{ module: "accounts", submodule: "customer_outstanding" }, { module: "accounts", submodule: "receivables.customer_outstanding" }] },
  { prefix: "/accounts/payables/outstanding", candidates: [{ module: "accounts", submodule: "outstanding" }, { module: "accounts", submodule: "payables.outstanding" }] },
  { prefix: "/accounts/banking/bank-accounts", candidates: [{ module: "accounts", submodule: "bank_accounts" }, { module: "accounts", submodule: "banking.bank_accounts" }] },
  { prefix: "/accounts/banking/reconciliation", candidates: [{ module: "accounts", submodule: "bank_reconciliation" }, { module: "accounts", submodule: "banking.bank_reconciliation" }] },
  { prefix: "/accounts/reports/bank-book", candidates: [{ module: "accounts", submodule: "bank_book" }, { module: "accounts", submodule: "banking.bank_book" }] },
  { prefix: "/accounts/reports/cash-book", candidates: [{ module: "accounts", submodule: "cash_book" }, { module: "accounts", submodule: "banking.cash_book" }] },
  { prefix: "/accounts/reports/trial-balance", candidates: [{ module: "accounts", submodule: "trial_balance" }, { module: "accounts", submodule: "reports.trial_balance" }] },
  { prefix: "/accounts/reports/pl", candidates: [{ module: "accounts", submodule: "profit_loss" }, { module: "accounts", submodule: "reports.profit_loss" }] },
  { prefix: "/accounts/reports/balance-sheet", candidates: [{ module: "accounts", submodule: "balance_sheet" }, { module: "accounts", submodule: "reports.balance_sheet" }] },
  { prefix: "/accounts/reports/cash-flow", candidates: [{ module: "accounts", submodule: "cash_flow" }, { module: "accounts", submodule: "reports.cash_flow" }] },
  { prefix: "/accounts/reports/general-ledger", candidates: [{ module: "accounts", submodule: "general_ledger" }, { module: "accounts", submodule: "reports.general_ledger" }] },
  { prefix: "/accounts/reports/day-book", candidates: [{ module: "accounts", submodule: "day_book" }, { module: "accounts", submodule: "reports.day_book" }] },
  { prefix: "/accounts/reports/gst-summary", candidates: [{ module: "accounts", submodule: "gst_summary" }, { module: "accounts", submodule: "reports.gst_summary" }] },
  { prefix: "/accounts/reports/tds-party-wise", candidates: [{ module: "accounts", submodule: "tds_summary" }, { module: "accounts", submodule: "reports.tds_summary" }] },
  { prefix: "/accounts/reports/sales-register", candidates: [{ module: "accounts", submodule: "sales_register" }, { module: "accounts", submodule: "reports.sales_register" }] },
  { prefix: "/accounts/reports/purchase-register", candidates: [{ module: "accounts", submodule: "purchase_register" }, { module: "accounts", submodule: "reports.purchase_register" }] },
  { prefix: "/accounts/reports/stock-valuation", candidates: [{ module: "accounts", submodule: "stock_valuation" }, { module: "accounts", submodule: "reports.stock_valuation" }] },
  { prefix: "/accounts/reports/stock-register", candidates: [{ module: "accounts", submodule: "stock_register" }, { module: "accounts", submodule: "reports.stock_register" }] },
  { prefix: "/accounts/reports/audit-trail", candidates: [{ module: "accounts", submodule: "audit_trail" }, { module: "accounts", submodule: "reports.audit_trail" }] },

  // Auth-only (no module/submodule gate)
  { prefix: "/dashboard" },
  { prefix: "/unauthorized" },
  { prefix: "/403" },
  { prefix: "/template" },
  { prefix: "/hr" },
];

/** Nav href → module/submodule candidates (view required to show link). */
export const NAV_PERMISSION_MAP: Record<string, ModuleSubmoduleRef[]> = {
  "/dashboard": [],
  "/accounts/masters/chart-of-accounts": [
    { module: "accounts", submodule: "chart_of_accounts" },
    { module: "accounts", submodule: "masters.chart_of_accounts" },
    { module: "accounts", submodule: "coa" },
  ],
  "/accounts/sales/pending-tax-invoices": [
    { module: "accounts", submodule: "pending_invoices" },
    { module: "accounts", submodule: "transactions.pending_invoices" },
  ],
  "/accounts/transactions/invoices": [
    { module: "accounts", submodule: "sales_invoice" },
    { module: "accounts", submodule: "transactions.sales_invoice" },
  ],
  "/accounts/purchase-invoices": [
    { module: "accounts", submodule: "purchase_invoice" },
    { module: "accounts", submodule: "transactions.purchase_invoice" },
  ],
  "/accounts/purchases/pending-vendor-bills": [
    { module: "accounts", submodule: "purchase_invoice" },
    { module: "accounts", submodule: "transactions.purchase_invoice" },
  ],
  "/accounts/transactions/credit-notes": [
    { module: "accounts", submodule: "credit_note" },
    { module: "accounts", submodule: "transactions.credit_note" },
  ],
  "/accounts/transactions/debit-notes": [
    { module: "accounts", submodule: "debit_note" },
    { module: "accounts", submodule: "transactions.debit_note" },
  ],
  "/accounts/vouchers?tab=receipt": [
    { module: "accounts", submodule: "receipt_voucher" },
    { module: "accounts", submodule: "transactions.receipt_voucher" },
  ],
  "/accounts/vouchers?tab=payment": [
    { module: "accounts", submodule: "payment_voucher" },
    { module: "accounts", submodule: "transactions.payment_voucher" },
  ],
  "/accounts/vouchers?tab=journal": [
    { module: "accounts", submodule: "journal_voucher" },
    { module: "accounts", submodule: "transactions.journal_voucher" },
  ],
  "/accounts/vouchers?tab=contra": [
    { module: "accounts", submodule: "contra_voucher" },
    { module: "accounts", submodule: "transactions.contra_voucher" },
  ],
  "/accounts/receivables/outstanding": [
    { module: "accounts", submodule: "customer_outstanding" },
    { module: "accounts", submodule: "receivables.customer_outstanding" },
  ],
  "/accounts/payables/outstanding": [
    { module: "accounts", submodule: "outstanding" },
    { module: "accounts", submodule: "payables.outstanding" },
  ],
  "/accounts/banking/bank-accounts": [
    { module: "accounts", submodule: "bank_accounts" },
    { module: "accounts", submodule: "banking.bank_accounts" },
  ],
  "/accounts/banking/reconciliation": [
    { module: "accounts", submodule: "bank_reconciliation" },
    { module: "accounts", submodule: "banking.bank_reconciliation" },
  ],
  "/accounts/reports/bank-book": [
    { module: "accounts", submodule: "bank_book" },
    { module: "accounts", submodule: "banking.bank_book" },
  ],
  "/accounts/reports/cash-book": [
    { module: "accounts", submodule: "cash_book" },
    { module: "accounts", submodule: "banking.cash_book" },
  ],
  "/accounts/reports/trial-balance": [
    { module: "accounts", submodule: "trial_balance" },
    { module: "accounts", submodule: "reports.trial_balance" },
  ],
  "/accounts/reports/pl": [
    { module: "accounts", submodule: "profit_loss" },
    { module: "accounts", submodule: "reports.profit_loss" },
  ],
  "/accounts/reports/balance-sheet": [
    { module: "accounts", submodule: "balance_sheet" },
    { module: "accounts", submodule: "reports.balance_sheet" },
  ],
  "/accounts/reports/cash-flow": [
    { module: "accounts", submodule: "cash_flow" },
    { module: "accounts", submodule: "reports.cash_flow" },
  ],
  "/accounts/reports/general-ledger": [
    { module: "accounts", submodule: "general_ledger" },
    { module: "accounts", submodule: "reports.general_ledger" },
  ],
  "/accounts/reports/day-book": [
    { module: "accounts", submodule: "day_book" },
    { module: "accounts", submodule: "reports.day_book" },
  ],
  "/accounts/reports/gst-summary": [
    { module: "accounts", submodule: "gst_summary" },
    { module: "accounts", submodule: "reports.gst_summary" },
  ],
  "/accounts/reports/tds-party-wise": [
    { module: "accounts", submodule: "tds_summary" },
    { module: "accounts", submodule: "reports.tds_summary" },
  ],
  "/accounts/reports/sales-register": [
    { module: "accounts", submodule: "sales_register" },
    { module: "accounts", submodule: "reports.sales_register" },
  ],
  "/accounts/reports/purchase-register": [
    { module: "accounts", submodule: "purchase_register" },
    { module: "accounts", submodule: "reports.purchase_register" },
  ],
  "/accounts/reports/stock-valuation": [
    { module: "accounts", submodule: "stock_valuation" },
    { module: "accounts", submodule: "reports.stock_valuation" },
  ],
  "/accounts/reports/stock-register": [
    { module: "accounts", submodule: "stock_register" },
    { module: "accounts", submodule: "reports.stock_register" },
  ],
  "/accounts/reports/audit-trail": [
    { module: "accounts", submodule: "audit_trail" },
    { module: "accounts", submodule: "reports.audit_trail" },
  ],
  "/masters/geography": [
    { module: "usermanagement", submodule: "geography" },
    { module: "userManagement", submodule: "geography" },
  ],
  "/user-management/department": [
    { module: "usermanagement", submodule: "department" },
    { module: "userManagement", submodule: "department" },
  ],
  "/user-management/roles": [
    { module: "usermanagement", submodule: "roles" },
    { module: "userManagement", submodule: "roles" },
  ],
  "/user-management/employee": [
    { module: "usermanagement", submodule: "user" },
    { module: "userManagement", submodule: "user" },
  ],
  "/masters/categories": [
    { module: "masters", submodule: "category" },
    { module: "masters", submodule: "categoryMaster" },
  ],
  "/masters/crops": [
    { module: "masters", submodule: "crop" },
    { module: "masters", submodule: "cropMaster" },
  ],
  "/masters/brands": [
    { module: "masters", submodule: "brand" },
    { module: "masters", submodule: "brandMaster" },
  ],
  "/masters/cfu": [{ module: "masters", submodule: "cfu" }],
  "/masters/customer-types": [
    { module: "masters", submodule: "customer_type" },
    { module: "masters", submodule: "customerCategory" },
  ],
  "/masters/customers": [
    { module: "masters", submodule: "customer" },
    { module: "masters", submodule: "customerMaster" },
  ],
  "/masters/document-types": [{ module: "masters", submodule: "document_type" }],
  "/masters/event-types": [{ module: "masters", submodule: "event_type" }],
  "/masters/formulation": [{ module: "masters", submodule: "formulation" }],
  "/masters/gst": [{ module: "masters", submodule: "gst" }],
  "/masters/hsn": [
    { module: "masters", submodule: "hsn" },
    { module: "masters", submodule: "hsnTax" },
  ],
  "/masters/products": [
    { module: "masters", submodule: "products" },
    { module: "masters", submodule: "productMaster" },
  ],
  "/masters/pricing": [{ module: "masters", submodule: "pricing" }],
  "/masters/scheme": [{ module: "masters", submodule: "scheme" }],
  "/masters/segment": [{ module: "masters", submodule: "segment" }],
  "/masters/tds": [{ module: "masters", submodule: "tds" }],
  "/masters/tcs": [{ module: "masters", submodule: "tcs" }],
  "/masters/additional-charges": [
    { module: "masters", submodule: "additional_charge" },
  ],
  "/masters/uom": [
    { module: "masters", submodule: "unit" },
    { module: "masters", submodule: "uomMaster" },
  ],
  "/masters/vendor-type": [
    { module: "masters", submodule: "supplier_type" },
    { module: "masters", submodule: "vendorCategory" },
  ],
  "/masters/vendors": [{ module: "masters", submodule: "supplier" }],
  "/masters/warehouse": [
    { module: "masters", submodule: "warehouse" },
    { module: "masters", submodule: "warehouseMaster" },
  ],
  "/procurement/purchase-requests": [
    { module: "procurement", submodule: "purchase_requests" },
    { module: "procurement", submodule: "purchaseRequisition" },
  ],
  "/procurement/purchase-orders": [
    { module: "procurement", submodule: "purchase_orders" },
    { module: "procurement", submodule: "purchaseOrder" },
  ],
  "/sales/orders": [
    { module: "sales", submodule: "sales_orders" },
    { module: "sales", submodule: "salesOrder" },
  ],
  "/sales/sample-order": [{ module: "sales", submodule: "sample_orders" }],
  "/sales/stock-transfer": [{ module: "sales", submodule: "stock_transfers" }],
  "/sales/scheme-progress": [{ module: "sales", submodule: "scheme_progress" }],
  "/warehouse/grn": [{ module: "warehouse", submodule: "grn" }],
  "/warehouse/qc": [{ module: "warehouse", submodule: "qc" }],
  "/warehouse/packing": [{ module: "warehouse", submodule: "packing" }],
  "/warehouse/dispatch": [{ module: "warehouse", submodule: "dispatch" }],
  "/warehouse/reorder-level": [{ module: "warehouse", submodule: "reorder_level" }],
  "/warehouse/stockoverview": [{ module: "warehouse", submodule: "stock_overview" }],
  "/warehouse/stock-overview": [{ module: "warehouse", submodule: "stock_overview" }],
  "/database/farmer": [{ module: "database", submodule: "farmer" }],
  "/database/distributor": [{ module: "database", submodule: "distributor" }],
  "/events/event": [{ module: "events", submodule: "event" }, { module: "events", submodule: "events" }],
  "/events/demo": [{ module: "events", submodule: "demo" }],
};

/** Top-level nav module id → permission module codes. */
export const NAV_MODULE_MAP: Record<string, string[]> = {
  dashboard: [],
  "user-management": ["usermanagement", "userManagement"],
  masters: ["masters"],
  procurement: ["procurement"],
  sales: ["sales"],
  warehouse: ["warehouse"],
  hr: ["hr"],
  accounts: ["accounts"],
  database: ["database", "farmer"],
  events: ["events"],
  event: ["events"],
};

function isLikelyId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    segment,
  );
}

/** Trailing route actions that share permissions with the list page. */
const ROUTE_ACTION_SEGMENTS = new Set([
  "add",
  "new",
  "create",
  "edit",
  "view",
  "details",
]);

/**
 * Stable key for permission refetch — changes on module OR submodule navigation.
 * Uses the matched route-permission prefix when available so list / add / edit / view
 * share one cache key (avoids refetch + "Checking access…" on every form open).
 * - Falls back to logical path (skips record ids and trailing action segments)
 * - `?tab=` for tabbed submodules on the same path (roles/templates, HR tabs, vouchers)
 */
export function getPermissionScopeKey(pathname: string, search = ""): string {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const tab = params.get("tab");

  const rule = resolveRouteRule(path);
  if (rule?.prefix) {
    return tab ? `${rule.prefix}?tab=${tab}` : rule.prefix;
  }

  const segments = path.split("/").filter(Boolean);
  const logical: string[] = [];
  for (const segment of segments) {
    if (isLikelyId(segment)) break;
    if (ROUTE_ACTION_SEGMENTS.has(segment.toLowerCase())) break;
    logical.push(segment);
  }

  const base = logical.length === 0 ? "/" : `/${logical.join("/")}`;
  if (tab) return `${base}?tab=${tab}`;
  return base;
}

export function resolveRouteRule(pathname: string): RoutePermissionRule | null {
  const path = pathname.split("?")[0];
  const sorted = [...ROUTE_PERMISSION_RULES].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  return (
    sorted.find(
      (rule) => path === rule.prefix || path.startsWith(rule.prefix + "/"),
    ) ?? null
  );
}
