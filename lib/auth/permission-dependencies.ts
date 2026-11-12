/**
 * Mirrors backend `permissionDependencies.ts` for UI transparency only.
 * Authorization is enforced on the backend; this map is not a security boundary.
 */

export type LookupTarget = { module: string; submodule: string; label: string };

const L = (
  module: string,
  submodule: string,
  label: string,
): LookupTarget => ({ module, submodule, label });

const FORM_ACTIONS = ["create", "edit", "update"] as const;

function withFormActions(
  moduleId: string,
  submoduleId: string,
  lookups: LookupTarget[],
): Record<string, LookupTarget[]> {
  const out: Record<string, LookupTarget[]> = {};
  for (const action of FORM_ACTIONS) {
    out[`${moduleId}.${submoduleId}.${action}`] = lookups;
  }
  return out;
}

const SALES_PARTY: LookupTarget[] = [
  L("masters", "customerMaster", "Customer Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
  L("masters", "pricing", "Pricing Lookup"),
  L("masters", "scheme", "Scheme Lookup"),
  L("masters", "additional_charge", "Additional Charge Lookup"),
  L("usermanagement", "user", "User / Salesman Lookup"),
];

const PROCUREMENT: LookupTarget[] = [
  L("masters", "supplier", "Supplier Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
  L("masters", "additional_charge", "Additional Charge Lookup"),
  L("masters", "gst", "GST Lookup"),
];

const SAMPLE_ORDER: LookupTarget[] = [
  L("masters", "customerMaster", "Customer Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
];

const STOCK_TRANSFER: LookupTarget[] = [
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
  L("usermanagement", "user", "User Lookup"),
];

const GRN: LookupTarget[] = [
  L("procurement", "purchaseOrder", "Purchase Order Lookup"),
  L("masters", "supplier", "Supplier Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
];

const PACKING: LookupTarget[] = [
  L("sales", "salesOrder", "Sales Order Lookup"),
  L("sales", "sample_orders", "Sample Order Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
];

const DISPATCH: LookupTarget[] = [
  L("sales", "salesOrder", "Sales Order Lookup"),
  L("warehouse", "packing", "Packing Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
  L("masters", "customerMaster", "Customer Lookup"),
];

const SALES_INVOICE: LookupTarget[] = [
  L("masters", "customerMaster", "Customer Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
  L("masters", "hsnTax", "HSN Lookup"),
  L("masters", "gst", "GST Lookup"),
  L("masters", "additional_charge", "Additional Charge Lookup"),
  L("warehouse", "dispatch", "Dispatch Lookup"),
  L("accounts", "chart_of_accounts", "Ledger Lookup"),
];

const PURCHASE_INVOICE: LookupTarget[] = [
  L("masters", "supplier", "Supplier Lookup"),
  L("masters", "productMaster", "Product Lookup"),
  L("masters", "warehouseMaster", "Warehouse Lookup"),
  L("masters", "hsnTax", "HSN Lookup"),
  L("masters", "gst", "GST Lookup"),
  L("warehouse", "grn", "GRN Lookup"),
  L("accounts", "chart_of_accounts", "Ledger Lookup"),
];

/** `${module}.${submodule}.${action}` → lookup labels included automatically. */
export const PERMISSION_DEPENDENCY_LABELS: Record<string, LookupTarget[]> = {
  ...withFormActions("sales", "salesOrder", SALES_PARTY),
  ...withFormActions("sales", "sample_orders", SAMPLE_ORDER),
  ...withFormActions("sales", "stock_transfers", STOCK_TRANSFER),

  ...withFormActions("procurement", "purchaseOrder", PROCUREMENT),
  ...withFormActions("procurement", "purchaseRequisition", [
    L("masters", "productMaster", "Product Lookup"),
    L("masters", "warehouseMaster", "Warehouse Lookup"),
    L("usermanagement", "user", "User Lookup"),
  ]),

  ...withFormActions("warehouse", "grn", GRN),
  ...withFormActions("warehouse", "qc", [
    L("warehouse", "grn", "GRN Lookup"),
    L("masters", "productMaster", "Product Lookup"),
    L("masters", "warehouseMaster", "Warehouse Lookup"),
  ]),
  ...withFormActions("warehouse", "packing", PACKING),
  ...withFormActions("warehouse", "dispatch", DISPATCH),

  ...withFormActions("accounts", "sales_invoice", SALES_INVOICE),
  ...withFormActions("accounts", "purchase_invoice", PURCHASE_INVOICE),
  ...withFormActions("accounts", "credit_note", [
    L("masters", "customerMaster", "Customer Lookup"),
    L("masters", "productMaster", "Product Lookup"),
    L("masters", "warehouseMaster", "Warehouse Lookup"),
    L("masters", "hsnTax", "HSN Lookup"),
    L("masters", "gst", "GST Lookup"),
    L("usermanagement", "user", "User Lookup"),
    L("accounts", "chart_of_accounts", "Ledger Lookup"),
  ]),
  ...withFormActions("accounts", "debit_note", [
    L("masters", "supplier", "Supplier Lookup"),
    L("masters", "productMaster", "Product Lookup"),
    L("masters", "warehouseMaster", "Warehouse Lookup"),
    L("masters", "hsnTax", "HSN Lookup"),
    L("masters", "gst", "GST Lookup"),
    L("usermanagement", "user", "User Lookup"),
    L("accounts", "chart_of_accounts", "Ledger Lookup"),
  ]),
  ...withFormActions("accounts", "receipt_voucher", [
    L("masters", "customerMaster", "Customer Lookup"),
    L("masters", "warehouseMaster", "Warehouse Lookup"),
    L("usermanagement", "user", "User Lookup"),
    L("accounts", "bank_accounts", "Bank Account Lookup"),
    L("accounts", "chart_of_accounts", "Ledger Lookup"),
  ]),
  ...withFormActions("accounts", "payment_voucher", [
    L("masters", "supplier", "Supplier Lookup"),
    L("masters", "warehouseMaster", "Warehouse Lookup"),
    L("usermanagement", "user", "User Lookup"),
    L("accounts", "bank_accounts", "Bank Account Lookup"),
    L("accounts", "chart_of_accounts", "Ledger Lookup"),
  ]),
};

export function getAutoLookupLabels(
  moduleId: string,
  submoduleId: string,
  action: string,
): LookupTarget[] {
  const key = `${moduleId}.${submoduleId}.${action}`;
  const editKey = `${moduleId}.${submoduleId}.${action === "update" ? "edit" : action}`;
  return PERMISSION_DEPENDENCY_LABELS[key] ?? PERMISSION_DEPENDENCY_LABELS[editKey] ?? [];
}
