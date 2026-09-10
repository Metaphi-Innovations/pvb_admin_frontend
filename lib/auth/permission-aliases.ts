/**
 * Legacy submodule keys seeded / accepted by older route maps.
 * Canonical IDs live in PERMISSION_REGISTRY (employee-data).
 *
 * On read we DROP these keys (no merge) so incomplete UI revoke that left only
 * aliases behind correctly removes module access. Route maps still list both
 * names; after normalize, only canonical keys remain in the tree.
 */
export const WEB_MODULE_ALIASES: Record<string, string> = {
  userManagement: "usermanagement",
};

/** module → { legacySubmodule → canonicalSubmodule } */
export const WEB_SUBMODULE_ALIASES: Record<string, Record<string, string>> = {
  masters: {
    crop: "cropMaster",
    products: "productMaster",
    brand: "brandMaster",
    Brand: "brandMaster",
    categoryMaster: "category",
    hsn: "hsnTax",
    customer_type: "customerCategory",
    customer: "customerMaster",
    customers: "customerMaster",
    vendor_type: "supplier_type",
    supplier_master: "supplier",
    vendor_master: "supplier",
    warehouse: "warehouseMaster",
    unit: "uomMaster",
  },
  procurement: {
    purchase_requests: "purchaseRequisition",
    purchase_orders: "purchaseOrder",
    purchase_return: "purchaseOrder",
    purchase_order_returns: "purchaseOrder",
  },
  sales: {
    sales_orders: "salesOrder",
    sample_returns: "sample_orders",
    sales_order_returns: "salesOrder",
    sample_order_returns: "sample_orders",
  },
  warehouse: {
    grn_qc: "qc",
  },
  hr: {
    "ta-da-claims": "tadaClaims",
  },
  accounts: {
    coa: "chart_of_accounts",
    bank_account: "bank_accounts",
    ledger: "general_ledger",
    financial_year: "chart_of_accounts",
  },
  events: {
    events: "event",
  },
};

/** Reverse lookup: module → canonical → legacy keys (for revoke / toggle). */
export function getLegacySubmoduleKeys(moduleId: string, canonicalSubId: string): string[] {
  const map = WEB_SUBMODULE_ALIASES[moduleId];
  if (!map) return [];
  return Object.entries(map)
    .filter(([, canonical]) => canonical === canonicalSubId)
    .map(([legacy]) => legacy);
}

export function canonicalizeModuleId(moduleId: string): string {
  return WEB_MODULE_ALIASES[moduleId] ?? moduleId;
}

/** True if this submodule key is a known legacy alias for the module. */
export function isLegacySubmoduleKey(moduleId: string, subId: string): boolean {
  const canonicalMod = canonicalizeModuleId(moduleId);
  const map = WEB_SUBMODULE_ALIASES[canonicalMod] ?? WEB_SUBMODULE_ALIASES[moduleId];
  if (!map) return false;
  return Object.prototype.hasOwnProperty.call(map, subId);
}

/**
 * Map a stored submodule id to the registry canonical id (if aliased).
 * Returns the input when it is already canonical or unknown.
 */
export function toCanonicalSubmoduleId(moduleId: string, subId: string): string {
  const canonicalMod = canonicalizeModuleId(moduleId);
  const map = WEB_SUBMODULE_ALIASES[canonicalMod] ?? WEB_SUBMODULE_ALIASES[moduleId];
  return map?.[subId] ?? subId;
}

/** Remove every permission key under a module (or mobile group) prefix. */
export function revokeKeysForPrefix(keys: Set<string>, prefix: string): Set<string> {
  const next = new Set<string>();
  const needle = `${prefix}.`;
  for (const key of keys) {
    if (!key.startsWith(needle)) next.add(key);
  }
  return next;
}

/**
 * Rewrite Set keys so legacy aliases become canonical registry ids.
 * Used by permission forms so checkboxes reflect real access.
 */
export function canonicalizePermKeySet(keys: Set<string>): Set<string> {
  const next = new Set<string>();
  for (const key of keys) {
    const parts = key.split(".");
    if (parts.length < 3) {
      next.add(key);
      continue;
    }
    const [modId, subId, ...rest] = parts;
    const canonicalMod = canonicalizeModuleId(modId);
    if (isLegacySubmoduleKey(canonicalMod, subId) || isLegacySubmoduleKey(modId, subId)) {
      // Drop legacy-only keys — they must not reappear as checked canonical perms
      // unless the canonical key is also present.
      continue;
    }
    const action = rest.join(".");
    next.add(`${canonicalMod}.${subId}.${action}`);
  }
  return next;
}
