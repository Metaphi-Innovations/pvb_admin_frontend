/**
 * Production Purchase Register column definitions (PR-3).
 * Only includes backend-supported / explicitly Not Available columns.
 */

export type PurchaseRegisterApiColKey =
  | "purchase_date"
  | "voucher_number"
  | "supplier_invoice_number"
  | "supplier_invoice_date"
  | "supplier_name"
  | "supplier_gstin"
  | "invoice_type"
  | "purchase_type"
  | "branch"
  | "warehouse"
  | "posting_date"
  | "po_number"
  | "grn_number"
  | "hsn_sac"
  | "taxable_value"
  | "cgst"
  | "sgst"
  | "igst"
  | "gst_total"
  | "cess"
  | "other_charges"
  | "tcs_amount"
  | "round_off"
  | "total_invoice_value"
  | "gstr2b_simple_status"
  | "voucher_status";

export type PurchaseRegisterApiColGroup =
  | "core"
  | "link"
  | "tax"
  | "recon";

export interface PurchaseRegisterApiColDef {
  key: PurchaseRegisterApiColKey;
  label: string;
  group: PurchaseRegisterApiColGroup;
  align?: "left" | "right";
  money?: boolean;
  /** Supported money that may be null → Not Available */
  nullableMoney?: boolean;
  sortable?: boolean;
  sortKey?: string;
}

export const PURCHASE_REGISTER_API_COLUMNS: PurchaseRegisterApiColDef[] = [
  {
    key: "purchase_date",
    label: "Purchase Date",
    group: "core",
    sortable: true,
    sortKey: "purchase_date",
  },
  {
    key: "voucher_number",
    label: "Voucher Number",
    group: "core",
    sortable: true,
    sortKey: "voucher_number",
  },
  {
    key: "supplier_invoice_number",
    label: "Supplier Invoice No.",
    group: "core",
  },
  {
    key: "supplier_invoice_date",
    label: "Supplier Invoice Date",
    group: "core",
    sortable: true,
    sortKey: "supplier_invoice_date",
  },
  {
    key: "supplier_name",
    label: "Supplier Name",
    group: "core",
    sortable: true,
    sortKey: "supplier_name",
  },
  { key: "supplier_gstin", label: "Supplier GSTIN", group: "core" },
  { key: "invoice_type", label: "Invoice Type", group: "core" },
  { key: "purchase_type", label: "Local / Interstate", group: "core" },
  { key: "branch", label: "Branch", group: "core" },
  { key: "warehouse", label: "Warehouse", group: "core" },
  { key: "posting_date", label: "Posting Date", group: "core" },
  { key: "po_number", label: "PO No.", group: "link" },
  { key: "grn_number", label: "GRN No.", group: "link" },
  { key: "hsn_sac", label: "HSN / SAC", group: "link" },
  {
    key: "taxable_value",
    label: "Taxable Value",
    group: "tax",
    align: "right",
    money: true,
    sortable: true,
    sortKey: "taxable_value",
  },
  {
    key: "cgst",
    label: "CGST",
    group: "tax",
    align: "right",
    money: true,
  },
  {
    key: "sgst",
    label: "SGST / UTGST",
    group: "tax",
    align: "right",
    money: true,
  },
  {
    key: "igst",
    label: "IGST",
    group: "tax",
    align: "right",
    money: true,
  },
  {
    key: "gst_total",
    label: "GST Total",
    group: "tax",
    align: "right",
    money: true,
  },
  {
    key: "cess",
    label: "Cess",
    group: "tax",
    align: "right",
    money: true,
    nullableMoney: true,
  },
  {
    key: "other_charges",
    label: "Other Charges",
    group: "tax",
    align: "right",
    money: true,
    nullableMoney: true,
  },
  {
    key: "tcs_amount",
    label: "TCS",
    group: "tax",
    align: "right",
    money: true,
    nullableMoney: true,
  },
  {
    key: "round_off",
    label: "Round Off",
    group: "tax",
    align: "right",
    money: true,
  },
  {
    key: "total_invoice_value",
    label: "Total Invoice Value",
    group: "tax",
    align: "right",
    money: true,
    sortable: true,
    sortKey: "total_invoice_value",
  },
  {
    key: "gstr2b_simple_status",
    label: "GSTR-2B Status",
    group: "recon",
  },
  { key: "voucher_status", label: "Voucher Status", group: "recon" },
];

/** Default visible production columns. Cess / TCS / RCM / Books ITC excluded. */
export const DEFAULT_VISIBLE_API_COLUMNS: PurchaseRegisterApiColKey[] = [
  "purchase_date",
  "voucher_number",
  "supplier_invoice_number",
  "supplier_name",
  "supplier_gstin",
  "invoice_type",
  "taxable_value",
  "cgst",
  "sgst",
  "igst",
  "total_invoice_value",
  "gstr2b_simple_status",
  "voucher_status",
];

export const API_COL_GROUP_LABELS: Record<PurchaseRegisterApiColGroup, string> =
  {
    core: "Core",
    link: "Links",
    tax: "Tax & Values",
    recon: "Reconciliation",
  };

export function getVisibleApiColumnDefs(
  visible: PurchaseRegisterApiColKey[],
): PurchaseRegisterApiColDef[] {
  const order = new Map(visible.map((k, i) => [k, i]));
  return PURCHASE_REGISTER_API_COLUMNS.filter((c) => order.has(c.key)).sort(
    (a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0),
  );
}

export function estimateApiTableMinWidth(
  visible: PurchaseRegisterApiColKey[],
): number {
  return Math.max(960, visible.length * 112);
}
