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
  filterDropdown: (fieldName: string, scope?: string) =>
    [...purchaseOrderKeys.filterDropdowns(), fieldName, scope ?? "all"] as const,
  supplierDropdown: () => [...purchaseOrderKeys.all, "supplier-dropdown"] as const,
  warehouseDropdown: (supplierId: string) =>
    [...purchaseOrderKeys.all, "warehouse-dropdown", supplierId] as const,
  dropdown: (filters: { supplier_id?: string; warehouse_id?: string }) =>
    [...purchaseOrderKeys.all, "dropdown", filters] as const,
  details: () => [...purchaseOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
} as const;
