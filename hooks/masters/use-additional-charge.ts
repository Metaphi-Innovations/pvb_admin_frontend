"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdditionalChargeService,
  type ResolvedAdditionalChargeOption,
} from "@/services/additional-charge.service";
import {
  AdditionalChargeListService,
  type AdditionalChargeCreatePayload,
  type AdditionalChargeExportParams,
  type AdditionalChargeFilterField,
  type AdditionalChargeListParams,
  type AdditionalChargeUpdatePayload,
} from "@/services/additional-charge-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): AdditionalChargeListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useAdditionalCharges(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.additionalCharges.list(params),
    queryFn: ({ signal }) =>
      AdditionalChargeListService.list({ ...toListParams(params), signal }),
  });
}

export function useAdditionalCharge(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.additionalCharges.detail(id ?? ""),
    queryFn: () => AdditionalChargeListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useAdditionalChargeDropdown() {
  return useQuery({
    queryKey: masterKeys.additionalCharges.dropdown(),
    queryFn: ({ signal }) => AdditionalChargeService.dropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdditionalChargeDropdownResolved() {
  return useQuery({
    queryKey: [...masterKeys.additionalCharges.dropdown(), "resolved"] as const,
    queryFn: ({ signal }): Promise<ResolvedAdditionalChargeOption[]> =>
      AdditionalChargeService.dropdownResolved(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAdditionalCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdditionalChargeCreatePayload) =>
      AdditionalChargeListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.dropdown(),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.filterDropdowns(),
        }),
      ]);
    },
  });
}

export function useUpdateAdditionalCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AdditionalChargeUpdatePayload;
    }) => AdditionalChargeListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.detail(variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.dropdown(),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.filterDropdowns(),
        }),
      ]);
    },
  });
}

export function useToggleAdditionalChargeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      AdditionalChargeListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.detail(variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.additionalCharges.dropdown(),
        }),
      ]);
    },
  });
}

export function useExportAdditionalCharges() {
  return useMutation({
    mutationFn: (params: AdditionalChargeExportParams) =>
      AdditionalChargeListService.export(params),
  });
}

export function useAdditionalChargeFilterDropdown(
  fieldName: AdditionalChargeFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.additionalCharges.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      AdditionalChargeListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
