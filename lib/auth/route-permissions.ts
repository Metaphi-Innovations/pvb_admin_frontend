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
    prefix: "/events",
    candidates: [
      { module: "events", submodule: "events" },
      { module: "events", submodule: "event" },
    ],
  },

  // Auth-only (no module/submodule gate)
  { prefix: "/dashboard" },
  { prefix: "/unauthorized" },
  { prefix: "/403" },
  { prefix: "/template" },
  { prefix: "/hr" },
  { prefix: "/accounts" },
  { prefix: "/database" },
];

/** Nav href → module/submodule candidates (view required to show link). */
export const NAV_PERMISSION_MAP: Record<string, ModuleSubmoduleRef[]> = {
  "/dashboard": [],
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
  "/warehouse/grn": [{ module: "warehouse", submodule: "grn" }],
  "/warehouse/qc": [{ module: "warehouse", submodule: "qc" }],
  "/warehouse/packing": [{ module: "warehouse", submodule: "packing" }],
  "/warehouse/dispatch": [{ module: "warehouse", submodule: "dispatch" }],
  "/warehouse/reorder-level": [{ module: "warehouse", submodule: "reorder_level" }],
  "/warehouse/stockoverview": [{ module: "warehouse", submodule: "stock_overview" }],
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
};

function isLikelyId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    segment,
  );
}

/**
 * Stable key for permission refetch — changes on module OR submodule navigation.
 * - Full logical path (skips record id segments like UUIDs)
 * - `?tab=` for tabbed submodules on the same path (roles/templates, HR tabs, vouchers)
 */
export function getPermissionScopeKey(pathname: string, search = ""): string {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  const logical: string[] = [];
  for (const segment of segments) {
    if (isLikelyId(segment)) break;
    logical.push(segment);
  }

  const base = logical.length === 0 ? "/" : `/${logical.join("/")}`;

  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const tab = params.get("tab");
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
