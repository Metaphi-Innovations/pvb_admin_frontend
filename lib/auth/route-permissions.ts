import type { PermissionAction } from "./permissions";

/**
 * Route → Module + Submodule requirement.
 * Keys MUST match DB `web_permission` JSON (canonical registry ids).
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

const ref = (module: string, submodule: string): ModuleSubmoduleRef => ({ module, submodule });

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  { prefix: "/user-management/employee", candidates: [ref("usermanagement", "user")] },
  { prefix: "/user-management/department", candidates: [ref("usermanagement", "department")] },
  { prefix: "/user-management/roles", candidates: [ref("usermanagement", "roles")] },
  { prefix: "/masters/geography", candidates: [ref("usermanagement", "geography")] },

  { prefix: "/masters/crops", candidates: [ref("masters", "cropMaster")] },
  { prefix: "/masters/products", candidates: [ref("masters", "productMaster")] },
  { prefix: "/masters/brands", candidates: [ref("masters", "brandMaster")] },
  { prefix: "/masters/categories", candidates: [ref("masters", "category")] },
  { prefix: "/masters/hsn", candidates: [ref("masters", "hsnTax")] },
  { prefix: "/masters/gst", candidates: [ref("masters", "gst")] },
  { prefix: "/masters/customers", candidates: [ref("masters", "customerMaster")] },
  { prefix: "/masters/customer-types", candidates: [ref("masters", "customerCategory")] },
  { prefix: "/masters/vendors", candidates: [ref("masters", "supplier")] },
  { prefix: "/masters/vendor-type", candidates: [ref("masters", "supplier_type")] },
  { prefix: "/masters/warehouse", candidates: [ref("masters", "warehouseMaster")] },
  { prefix: "/masters/uom", candidates: [ref("masters", "uomMaster")] },
  { prefix: "/masters/tds", candidates: [ref("masters", "tds")] },
  { prefix: "/masters/tcs", candidates: [ref("masters", "tcs")] },
  { prefix: "/masters/additional-charges", candidates: [ref("masters", "additional_charge")] },
  { prefix: "/masters/document-types", candidates: [ref("masters", "document_type")] },
  { prefix: "/masters/event-types", candidates: [ref("masters", "event_type")] },
  { prefix: "/masters/formulation", candidates: [ref("masters", "formulation")] },
  { prefix: "/masters/cfu", candidates: [ref("masters", "cfu")] },
  { prefix: "/masters/pricing", candidates: [ref("masters", "pricing")] },
  { prefix: "/masters/scheme", candidates: [ref("masters", "scheme")] },
  { prefix: "/masters/segment", candidates: [ref("masters", "segment")] },

  { prefix: "/procurement/purchase-requests", candidates: [ref("procurement", "purchaseRequisition")] },
  { prefix: "/procurement/purchase-orders", candidates: [ref("procurement", "purchaseOrder")] },

  { prefix: "/sales/orders", candidates: [ref("sales", "salesOrder")] },
  { prefix: "/sales/sample-order", candidates: [ref("sales", "sample_orders")] },
  { prefix: "/sales/stock-transfer", candidates: [ref("sales", "stock_transfers")] },
  { prefix: "/sales/scheme-progress", candidates: [ref("sales", "scheme_progress")] },

  { prefix: "/warehouse/grn", candidates: [ref("warehouse", "grn")] },
  { prefix: "/warehouse/qc", candidates: [ref("warehouse", "qc")] },
  { prefix: "/warehouse/packing", candidates: [ref("warehouse", "packing")] },
  { prefix: "/warehouse/dispatch", candidates: [ref("warehouse", "dispatch")] },
  { prefix: "/warehouse/reorder-level", candidates: [ref("warehouse", "reorder_level")] },
  { prefix: "/warehouse/stockoverview", candidates: [ref("warehouse", "stock_overview")] },
  { prefix: "/warehouse/stock-overview", candidates: [ref("warehouse", "stock_overview")] },

  {
    prefix: "/hr/sales-force-attendance",
    candidates: [
      ref("hr", "attendance"),
      ref("hr", "holidaySetup"),
      ref("hr", "weekOffSetup"),
    ],
  },
  { prefix: "/hr/sales-force-policy", candidates: [ref("hr", "policyMaster")] },
  { prefix: "/hr/claims/tada", candidates: [ref("hr", "tadaClaims")] },
  {
    prefix: "/hr",
    candidates: [
      ref("hr", "attendance"),
      ref("hr", "holidaySetup"),
      ref("hr", "weekOffSetup"),
      ref("hr", "policyMaster"),
      ref("hr", "tadaClaims"),
    ],
  },

  { prefix: "/events/event", candidates: [ref("events", "event")] },
  { prefix: "/events/demo", candidates: [ref("events", "demo")] },
  {
    prefix: "/events",
    candidates: [ref("events", "event"), ref("events", "demo")],
  },

  { prefix: "/database/farmer", candidates: [ref("database", "farmer")] },
  { prefix: "/database/distributor", candidates: [ref("database", "distributor")] },

  { prefix: "/accounts/masters/chart-of-accounts", candidates: [ref("accounts", "chart_of_accounts")] },
  { prefix: "/accounts/sales/pending-tax-invoices", candidates: [ref("accounts", "pending_invoices")] },
  { prefix: "/accounts/transactions/invoices", candidates: [ref("accounts", "sales_invoice")] },
  { prefix: "/accounts/purchase-invoices", candidates: [ref("accounts", "purchase_invoice")] },
  { prefix: "/accounts/purchases/pending-vendor-bills", candidates: [ref("accounts", "purchase_invoice")] },
  { prefix: "/accounts/transactions/credit-notes", candidates: [ref("accounts", "credit_note")] },
  { prefix: "/accounts/transactions/debit-notes", candidates: [ref("accounts", "debit_note")] },
  {
    prefix: "/accounts/vouchers",
    candidates: [
      ref("accounts", "receipt_voucher"),
      ref("accounts", "payment_voucher"),
      ref("accounts", "journal_voucher"),
      ref("accounts", "contra_voucher"),
    ],
  },
  { prefix: "/accounts/receivables/outstanding", candidates: [ref("accounts", "customer_outstanding")] },
  { prefix: "/accounts/payables/outstanding", candidates: [ref("accounts", "outstanding")] },
  { prefix: "/accounts/banking/bank-accounts", candidates: [ref("accounts", "bank_accounts")] },
  { prefix: "/accounts/banking/reconciliation", candidates: [ref("accounts", "bank_reconciliation")] },
  { prefix: "/accounts/reports/bank-book", candidates: [ref("accounts", "bank_book")] },
  { prefix: "/accounts/reports/cash-book", candidates: [ref("accounts", "cash_book")] },
  { prefix: "/accounts/reports/trial-balance", candidates: [ref("accounts", "trial_balance")] },
  { prefix: "/accounts/reports/pl", candidates: [ref("accounts", "profit_loss")] },
  { prefix: "/accounts/reports/balance-sheet", candidates: [ref("accounts", "balance_sheet")] },
  { prefix: "/accounts/reports/cash-flow", candidates: [ref("accounts", "cash_flow")] },
  { prefix: "/accounts/reports/general-ledger", candidates: [ref("accounts", "general_ledger")] },
  { prefix: "/accounts/reports/day-book", candidates: [ref("accounts", "day_book")] },
  { prefix: "/accounts/reports/gst-summary", candidates: [ref("accounts", "gst_summary")] },
  { prefix: "/accounts/reports/tds-party-wise", candidates: [ref("accounts", "tds_summary")] },
  { prefix: "/accounts/reports/sales-register", candidates: [ref("accounts", "sales_register")] },
  { prefix: "/accounts/reports/purchase-register", candidates: [ref("accounts", "purchase_register")] },
  { prefix: "/accounts/reports/stock-valuation", candidates: [ref("accounts", "stock_valuation")] },
  { prefix: "/accounts/reports/stock-register", candidates: [ref("accounts", "stock_register")] },
  { prefix: "/accounts/reports/audit-trail", candidates: [ref("accounts", "audit_trail")] },

  // Auth-only (no module/submodule gate)
  { prefix: "/dashboard" },
  { prefix: "/unauthorized" },
  { prefix: "/403" },
  { prefix: "/template" },
];

/** Nav href → module/submodule candidates (view required to show link). */
export const NAV_PERMISSION_MAP: Record<string, ModuleSubmoduleRef[]> = {
  "/dashboard": [],
  "/accounts/masters/chart-of-accounts": [ref("accounts", "chart_of_accounts")],
  "/accounts/sales/pending-tax-invoices": [ref("accounts", "pending_invoices")],
  "/accounts/transactions/invoices": [ref("accounts", "sales_invoice")],
  "/accounts/purchase-invoices": [ref("accounts", "purchase_invoice")],
  "/accounts/purchases/pending-vendor-bills": [ref("accounts", "purchase_invoice")],
  "/accounts/transactions/credit-notes": [ref("accounts", "credit_note")],
  "/accounts/transactions/debit-notes": [ref("accounts", "debit_note")],
  "/accounts/vouchers?tab=receipt": [ref("accounts", "receipt_voucher")],
  "/accounts/vouchers?tab=payment": [ref("accounts", "payment_voucher")],
  "/accounts/vouchers?tab=journal": [ref("accounts", "journal_voucher")],
  "/accounts/vouchers?tab=contra": [ref("accounts", "contra_voucher")],
  "/accounts/receivables/outstanding": [ref("accounts", "customer_outstanding")],
  "/accounts/payables/outstanding": [ref("accounts", "outstanding")],
  "/accounts/banking/bank-accounts": [ref("accounts", "bank_accounts")],
  "/accounts/banking/reconciliation": [ref("accounts", "bank_reconciliation")],
  "/accounts/reports/bank-book": [ref("accounts", "bank_book")],
  "/accounts/reports/cash-book": [ref("accounts", "cash_book")],
  "/accounts/reports/trial-balance": [ref("accounts", "trial_balance")],
  "/accounts/reports/pl": [ref("accounts", "profit_loss")],
  "/accounts/reports/balance-sheet": [ref("accounts", "balance_sheet")],
  "/accounts/reports/cash-flow": [ref("accounts", "cash_flow")],
  "/accounts/reports/general-ledger": [ref("accounts", "general_ledger")],
  "/accounts/reports/day-book": [ref("accounts", "day_book")],
  "/accounts/reports/gst-summary": [ref("accounts", "gst_summary")],
  "/accounts/reports/tds-party-wise": [ref("accounts", "tds_summary")],
  "/accounts/reports/sales-register": [ref("accounts", "sales_register")],
  "/accounts/reports/purchase-register": [ref("accounts", "purchase_register")],
  "/accounts/reports/stock-valuation": [ref("accounts", "stock_valuation")],
  "/accounts/reports/stock-register": [ref("accounts", "stock_register")],
  "/accounts/reports/audit-trail": [ref("accounts", "audit_trail")],

  "/masters/geography": [ref("usermanagement", "geography")],
  "/user-management/department": [ref("usermanagement", "department")],
  "/user-management/roles": [ref("usermanagement", "roles")],
  "/user-management/employee": [ref("usermanagement", "user")],

  "/masters/categories": [ref("masters", "category")],
  "/masters/crops": [ref("masters", "cropMaster")],
  "/masters/brands": [ref("masters", "brandMaster")],
  "/masters/cfu": [ref("masters", "cfu")],
  "/masters/customer-types": [ref("masters", "customerCategory")],
  "/masters/customers": [ref("masters", "customerMaster")],
  "/masters/document-types": [ref("masters", "document_type")],
  "/masters/event-types": [ref("masters", "event_type")],
  "/masters/formulation": [ref("masters", "formulation")],
  "/masters/gst": [ref("masters", "gst")],
  "/masters/hsn": [ref("masters", "hsnTax")],
  "/masters/products": [ref("masters", "productMaster")],
  "/masters/pricing": [ref("masters", "pricing")],
  "/masters/scheme": [ref("masters", "scheme")],
  "/masters/segment": [ref("masters", "segment")],
  "/masters/tds": [ref("masters", "tds")],
  "/masters/tcs": [ref("masters", "tcs")],
  "/masters/additional-charges": [ref("masters", "additional_charge")],
  "/masters/uom": [ref("masters", "uomMaster")],
  "/masters/vendor-type": [ref("masters", "supplier_type")],
  "/masters/vendors": [ref("masters", "supplier")],
  "/masters/warehouse": [ref("masters", "warehouseMaster")],

  "/procurement/purchase-requests": [ref("procurement", "purchaseRequisition")],
  "/procurement/purchase-orders": [ref("procurement", "purchaseOrder")],

  "/sales/orders": [ref("sales", "salesOrder")],
  "/sales/sample-order": [ref("sales", "sample_orders")],
  "/sales/stock-transfer": [ref("sales", "stock_transfers")],
  "/sales/scheme-progress": [ref("sales", "scheme_progress")],

  "/warehouse/grn": [ref("warehouse", "grn")],
  "/warehouse/qc": [ref("warehouse", "qc")],
  "/warehouse/packing": [ref("warehouse", "packing")],
  "/warehouse/dispatch": [ref("warehouse", "dispatch")],
  "/warehouse/reorder-level": [ref("warehouse", "reorder_level")],
  "/warehouse/stockoverview": [ref("warehouse", "stock_overview")],
  "/warehouse/stock-overview": [ref("warehouse", "stock_overview")],

  "/hr/sales-force-attendance": [
    ref("hr", "attendance"),
    ref("hr", "holidaySetup"),
    ref("hr", "weekOffSetup"),
  ],
  "/hr/sales-force-policy": [ref("hr", "policyMaster")],
  "/hr/claims/tada": [ref("hr", "tadaClaims")],

  "/database/farmer": [ref("database", "farmer")],
  "/database/distributor": [ref("database", "distributor")],
  "/events/event": [ref("events", "event")],
  "/events/demo": [ref("events", "demo")],
};

/** Top-level nav module id → permission module codes (DB keys). */
export const NAV_MODULE_MAP: Record<string, string[]> = {
  dashboard: [],
  "user-management": ["usermanagement"],
  masters: ["masters"],
  procurement: ["procurement"],
  sales: ["sales"],
  warehouse: ["warehouse"],
  hr: ["hr"],
  accounts: ["accounts"],
  database: ["database"],
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
