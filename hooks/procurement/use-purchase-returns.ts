"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";
import {
  buildPurchaseReturnApiFilters,
  buildPurchaseReturnOrdering,
  PurchaseReturnService,
  type PurchaseReturnFilterField,
  type PurchaseReturnListParams,
} from "@/services/purchase-return.service";
import {
  purchaseReturnKeys,
  type PurchaseReturnListKeyParams,
} from "@/lib/procurement/purchase-return-query-keys";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";
import type { FilterState } from "@/components/listing/types";
import type { PurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";

function toListParams(params: PurchaseReturnListKeyParams): PurchaseReturnListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    apiFilters: params.apiFilters,
  };
}

/** POR listing/filters change from packing, dispatch, and PO updates — never serve stale cache. */
const POR_LIVE_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
};

export function usePurchaseReturnList(params: PurchaseReturnListKeyParams, enabled = true) {
  return useQuery({
    queryKey: purchaseReturnKeys.list(params),
    queryFn: ({ signal }) => PurchaseReturnService.list({ ...toListParams(params), signal }),
    enabled,
    ...POR_LIVE_QUERY_OPTIONS,
  });
}

export function usePurchaseReturnFilterDropdown(
  fieldName: PurchaseReturnFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: purchaseReturnKeys.filterDropdown(fieldName),
    queryFn: ({ signal }) => PurchaseReturnService.getFilterDropdown(fieldName, signal),
    enabled: options?.enabled ?? true,
    ...POR_LIVE_QUERY_OPTIONS,
  });
}

export function usePurchaseReturn(id: string | null | undefined) {
  return useQuery({
    queryKey: purchaseReturnKeys.detail(id ?? ""),
    queryFn: ({ signal }) => PurchaseReturnService.getById(id!, signal),
    enabled: Boolean(id),
  });
}

export function usePurchaseReturnPreviewNumber(enabled = true) {
  return useQuery({
    queryKey: purchaseReturnKeys.preview(),
    queryFn: ({ signal }) => PurchaseReturnService.getPreviewNumber(signal),
    enabled,
  });
}

export function useEligiblePurchaseReturnItems(
  purchaseOrderId: string | null | undefined,
  warehouseId?: string,
  excludeReturnId?: string,
) {
  return useQuery({
    queryKey: purchaseReturnKeys.eligible(
      purchaseOrderId ?? "",
      warehouseId,
      excludeReturnId,
    ),
    queryFn: ({ signal }) =>
      PurchaseReturnService.getEligibleItems({
        purchaseOrderId: purchaseOrderId!,
        warehouseId,
        excludeReturnId,
        signal,
      }),
    enabled: Boolean(purchaseOrderId),
  });
}

async function invalidatePurchaseReturnQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await Promise.all([
    // POR + default PO tab listing/filters (status/counts can change together).
    invalidatePurchaseOrderModuleListingQueries(queryClient),
    id
      ? queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.detail(id) })
      : Promise.resolve(),
  ]);
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record: PurchaseReturn) => PurchaseReturnService.create(record),
    onSuccess: async (data) => {
      await invalidatePurchaseReturnQueries(queryClient, String(data.id));
    },
  });
}

export function useUpdatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; record: PurchaseReturn }) =>
      PurchaseReturnService.update(input.id, input.record),
    onSuccess: async (data) => {
      await invalidatePurchaseReturnQueries(queryClient, String(data.id));
    },
  });
}

export { buildPurchaseReturnApiFilters, buildPurchaseReturnOrdering };
export type { PurchaseReturnListKeyParams, FilterState };
export {
  invalidatePurchaseOrderListingQueries,
  invalidatePurchaseReturnListingQueries,
  invalidatePurchaseOrderModuleListingQueries,
} from "@/lib/procurement/invalidate-po-listing-queries";

