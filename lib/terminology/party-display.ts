/** User-facing labels: ERP vendor records are shown as Supplier in the UI. */

export const SUPPLIER_LABEL = "Supplier";
export const SUPPLIER_MASTER_LABEL = "Supplier Master";
export const SUPPLIER_TYPE_LABEL = "Supplier Type";
export const SUPPLIER_NAME_LABEL = "Supplier Name";
export const SUPPLIER_CODE_LABEL = "Supplier Code";

/** Map internal ledger/party type values to display labels. */
export function partyTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  if (type === "Vendor") return SUPPLIER_LABEL;
  return type;
}
