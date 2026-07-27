export type PurchaseRequestListKeyParams = {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters: Record<string, unknown>;
};

export const purchaseRequestKeys = {
  all: ["procurement", "purchase-requests"] as const,
  lists: () => [...purchaseRequestKeys.all, "list"] as const,
  list: (params: PurchaseRequestListKeyParams) =>
    [...purchaseRequestKeys.lists(), params] as const,
  summaries: () => [...purchaseRequestKeys.all, "summary"] as const,
  summary: () => [...purchaseRequestKeys.summaries()] as const,
  filterDropdowns: () =>
    [...purchaseRequestKeys.all, "filter-dropdown"] as const,
  filterDropdown: (fieldName: string, scope?: string) =>
    [
      ...purchaseRequestKeys.filterDropdowns(),
      fieldName,
      scope ?? "all",
    ] as const,
  details: () => [...purchaseRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseRequestKeys.details(), id] as const,
  previewNumber: (state: string) =>
    [...purchaseRequestKeys.all, "preview-number", state] as const,
} as const;
