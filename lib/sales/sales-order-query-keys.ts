export type SalesOrderListKeyParams = {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters: Record<string, unknown>;
  status?: string;
};

export const salesOrderKeys = {
  all: ["sales", "sales-orders"] as const,
  lists: () => [...salesOrderKeys.all, "list"] as const,
  list: (params: SalesOrderListKeyParams) =>
    [...salesOrderKeys.lists(), params] as const,
  filterDropdowns: () => [...salesOrderKeys.all, "filter-dropdown"] as const,
  filterDropdown: (fieldName: string) =>
    [...salesOrderKeys.filterDropdowns(), fieldName] as const,
  details: () => [...salesOrderKeys.all, "detail"] as const,
  detail: (id: string | number) => [...salesOrderKeys.details(), String(id)] as const,
  nextSoNumber: () => [...salesOrderKeys.all, "next-so-number"] as const,
} as const;
