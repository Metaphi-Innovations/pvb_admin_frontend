import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PricingListService,
  type PricingCreatePayload,
  type PricingExportParams,
  type PricingFilterField,
  type PricingListParams,
  type PricingUpdatePayload,
} from "@/services/pricing-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

export function usePricingList(params: MasterListKeyParams) {
  const listParams: PricingListParams = {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };

  return useQuery({
    queryKey: masterKeys.pricing.list(params),
    queryFn: ({ signal }) => PricingListService.list({ ...listParams, signal }),
  });
}

export function usePricingSummary() {
  return useQuery({
    queryKey: masterKeys.pricing.summary(),
    queryFn: ({ signal }) => PricingListService.getSummary(signal),
  });
}

export function usePricing(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.pricing.detail(id ?? ""),
    queryFn: () => PricingListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PricingCreatePayload) => PricingListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.summary() }),
      ]);
    },
  });
}

export function useUpdatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PricingUpdatePayload }) =>
      PricingListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.summary() }),
      ]);
    },
  });
}

export function useTogglePricingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      PricingListService.updateStatus(id, isActive),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.pricing.summary() }),
      ]);
    },
  });
}

export function useExportPricing() {
  return useMutation({
    mutationFn: (params: PricingExportParams) => PricingListService.export(params),
  });
}

export function usePricingFilterDropdown(
  fieldName: PricingFilterField,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: masterKeys.pricing.filterDropdown(fieldName),
    queryFn: ({ signal }) => PricingListService.getFilterDropdown(fieldName, signal),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function usePricingProductDropdown() {
  return useQuery({
    queryKey: masterKeys.pricing.productDropdown(),
    queryFn: ({ signal }) => PricingListService.getProductDropdown(signal),
    staleTime: 60_000,
  });
}

export { PricingListService };
