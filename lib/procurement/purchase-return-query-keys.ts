export interface PurchaseReturnListKeyParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export const purchaseReturnKeys = {
  all: ["purchase-returns"] as const,
  lists: () => [...purchaseReturnKeys.all, "list"] as const,
  list: (params: PurchaseReturnListKeyParams) => [...purchaseReturnKeys.lists(), params] as const,
  details: () => [...purchaseReturnKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseReturnKeys.details(), id] as const,
  preview: () => [...purchaseReturnKeys.all, "preview-number"] as const,
  filterDropdowns: () => [...purchaseReturnKeys.all, "filter-dropdown"] as const,
  filterDropdown: (fieldName: string) =>
    [...purchaseReturnKeys.filterDropdowns(), fieldName] as const,
  eligible: (purchaseOrderId: string, warehouseId?: string, excludeReturnId?: string) =>
    [
      ...purchaseReturnKeys.all,
      "eligible-items",
      purchaseOrderId,
      warehouseId ?? "",
      excludeReturnId ?? "",
    ] as const,
};

