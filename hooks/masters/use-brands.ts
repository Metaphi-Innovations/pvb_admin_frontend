"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrandListService,
  type BrandCreatePayload,
  type BrandExportParams,
  type BrandFilterField,
  type BrandListParams,
  type BrandUpdatePayload,
} from "@/services/brand-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): BrandListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useBrands(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.brands.list(params),
    queryFn: ({ signal }) => BrandListService.list({ ...toListParams(params), signal }),
  });
}

export function useBrand(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.brands.detail(id ?? ""),
    queryFn: () => BrandListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BrandCreatePayload) => BrandListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.dropdown() }),
      ]);
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BrandUpdatePayload }) =>
      BrandListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.brands.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.dropdown() }),
      ]);
    },
  });
}

export function useToggleBrandStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => BrandListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.detail(id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.brands.dropdown() }),
      ]);
    },
  });
}

export function useBrandsDropdown() {
  return useQuery({
    queryKey: masterKeys.brands.dropdown(),
    queryFn: () => BrandListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useExportBrands() {
  return useMutation({
    mutationFn: (params: BrandExportParams) => BrandListService.export(params),
  });
}

export function useBrandFilterDropdown(
  fieldName: BrandFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.brands.filterDropdown(fieldName),
    queryFn: ({ signal }) => BrandListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
