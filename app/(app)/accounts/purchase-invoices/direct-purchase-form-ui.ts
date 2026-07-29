import type { AutocompleteOption } from "@/components/ui/AutocompleteSelect";
import { COMPANY_BILLING } from "@/lib/procurement/config";

/** Shared field styling — compact ERP density, page-level scroll. */
export const DP_LABEL_CLASS = "text-xs font-medium leading-none text-muted-foreground";
export const DP_FIELD_CLASS = "h-8 text-[13px] rounded-lg px-2.5";
export const DP_SELECT_CLASS = "h-8 text-[13px] rounded-lg px-2.5 shadow-none";
export const DP_TABLE_INPUT_CLASS = "h-8 text-[13px] rounded-lg px-2 w-full min-w-0";
export const DP_HEADER_ROW_CLASS =
  "flex items-end gap-1.5 flex-nowrap overflow-x-auto pb-0.5";
export const DP_HEADER_FIELD_CLASS = "flex-shrink-0 space-y-0.5";
export const DP_HEADER_SECTION_CLASS =
  "bg-white rounded-lg border border-border px-2 py-1.5 flex-shrink-0";
export const DP_FORM_STACK = "flex flex-col gap-1.5 w-full";
export const DP_ITEMS_SECTION_CLASS =
  "bg-white rounded-lg border border-border overflow-hidden";

export const BRANCH_GSTIN_OPTIONS: AutocompleteOption[] = [
  {
    value: COMPANY_BILLING.gstNumber,
    label: "HQ — Pune",
    sublabel: COMPANY_BILLING.gstNumber,
    searchText: "hq pune",
  },
  {
    value: "27AABCD1234E2Z6",
    label: "Branch — Mumbai",
    sublabel: "27AABCD1234E2Z6",
    searchText: "mumbai branch",
  },
  {
    value: "27AABCD1234E3Z1",
    label: "Branch — Nagpur",
    sublabel: "27AABCD1234E3Z1",
    searchText: "nagpur branch",
  },
  {
    value: "27AABCD1234E4Z8",
    label: "Warehouse — Aurangabad",
    sublabel: "27AABCD1234E4Z8",
    searchText: "aurangabad warehouse",
  },
];

export function withCustomBranchGstinOption(
  gstin: string,
  options: AutocompleteOption[],
): AutocompleteOption[] {
  if (!gstin || options.some((o) => o.value === gstin)) return options;
  return [{ value: gstin, label: gstin, sublabel: "Current value" }, ...options];
}
