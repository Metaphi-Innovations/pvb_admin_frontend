"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CategoryListService,
  type CategoryCreatePayload,
  type CategoryExportParams,
  type CategoryListParams,
  type CategoryUpdatePayload,
  type CategoryDropdownItem,
} from "@/services/category-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): CategoryListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useCategories(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.categories.list(params),
    queryFn: ({ signal }) => CategoryListService.list({ ...toListParams(params), signal }),
  });
}

export function useCategory(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.categories.detail(id ?? ""),
    queryFn: () => CategoryListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCategoryDropdown() {
  return useQuery({
    queryKey: masterKeys.categories.dropdown(),
    queryFn: () => CategoryListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryCreatePayload) => CategoryListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.dropdown() }),
      ]);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdatePayload }) =>
      CategoryListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.dropdown() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.categories.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.dropdown() }),
      ]);
    },
  });
}

export function useToggleCategoryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CategoryListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.detail(id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.categories.dropdown() }),
      ]);
    },
  });
}

export function useCategoriesDropdown() {
  return useQuery({
    queryKey: masterKeys.categories.dropdown(),
    queryFn: () => CategoryListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useExportCategories() {
  return useMutation({
    mutationFn: (params: CategoryExportParams) => CategoryListService.export(params),
  });
}
