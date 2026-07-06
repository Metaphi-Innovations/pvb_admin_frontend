export type PurchaseOrderListKeyParams = {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters: Record<string, unknown>;
};

export const purchaseOrderKeys = {
  all: ["procurement", "purchase-orders"] as const,
  lists: () => [...purchaseOrderKeys.all, "list"] as const,
  list: (params: PurchaseOrderListKeyParams) =>
    [...purchaseOrderKeys.lists(), params] as const,
  summaries: () => [...purchaseOrderKeys.all, "summary"] as const,
  summary: () => [...purchaseOrderKeys.summaries()] as const,
  filterDropdowns: () => [...purchaseOrderKeys.all, "filter-dropdown"] as const,
  filterDropdown: (fieldName: string) =>
    [...purchaseOrderKeys.filterDropdowns(), fieldName] as const,
  details: () => [...purchaseOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
} as const;
