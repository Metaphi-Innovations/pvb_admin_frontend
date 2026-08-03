"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CropListService,
  type CropCreatePayload,
  type CropExportParams,
  type CropFilterField,
  type CropListParams,
  type CropUpdatePayload,
} from "@/services/crop-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): CropListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useCrops(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.crops.list(params),
    queryFn: ({ signal }) => CropListService.list({ ...toListParams(params), signal }),
  });
}

export function useCrop(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.crops.detail(id ?? ""),
    queryFn: () => CropListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CropCreatePayload) => CropListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.crops.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.crops.dropdown() }),
      ]);
    },
  });
}

export function useUpdateCrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CropUpdatePayload }) =>
      CropListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.crops.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.crops.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.crops.dropdown() }),
      ]);
    },
  });
}

export function useToggleCropStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      CropListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.crops.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.crops.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.crops.dropdown() }),
      ]);
    },
  });
}

export function useCropsDropdown() {
  return useQuery({
    queryKey: masterKeys.crops.dropdown(),
    queryFn: () => CropListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useExportCrops() {
  return useMutation({
    mutationFn: (params: CropExportParams) => CropListService.export(params),
  });
}

export function useCropFilterDropdown(
  fieldName: CropFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.crops.filterDropdown(fieldName),
    queryFn: ({ signal }) => CropListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
