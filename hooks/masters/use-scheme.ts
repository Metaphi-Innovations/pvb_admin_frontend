"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SchemeListService,
  type SchemeCreatePayload,
  type SchemeExportParams,
  type SchemeFilterField,
  type SchemeListParams,
  type SchemeUpdatePayload,
} from "@/services/scheme-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): SchemeListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useSchemes(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.schemes.list(params),
    queryFn: ({ signal }) =>
      SchemeListService.list({ ...toListParams(params), signal }),
  });
}

export function useScheme(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.schemes.detail(id ?? ""),
    queryFn: () => SchemeListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useSchemeDropdown() {
  return useQuery({
    queryKey: masterKeys.schemes.dropdown(),
    queryFn: ({ signal }) => SchemeListService.dropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSchemePreviewNumber() {
  return useQuery({
    queryKey: masterKeys.schemes.previewNumber(),
    queryFn: ({ signal }) => SchemeListService.previewNumber(signal),
    staleTime: 30_000,
  });
}

export function useSchemeSummary() {
  return useQuery({
    queryKey: masterKeys.schemes.summary(),
    queryFn: ({ signal }) => SchemeListService.summary(signal),
    staleTime: 30_000,
  });
}

export function useCreateScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SchemeCreatePayload) => SchemeListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.dropdown() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.schemes.filterDropdowns(),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.summary() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.schemes.previewNumber(),
        }),
      ]);
    },
  });
}

export function useUpdateScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: SchemeUpdatePayload;
    }) => SchemeListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.schemes.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.dropdown() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.schemes.filterDropdowns(),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.summary() }),
      ]);
    },
  });
}

export function useToggleSchemeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      SchemeListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.schemes.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.schemes.summary() }),
      ]);
    },
  });
}

export function useExportSchemes() {
  return useMutation({
    mutationFn: (params: SchemeExportParams) => SchemeListService.export(params),
  });
}

export function useSchemeFilterDropdown(
  fieldName: SchemeFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.schemes.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      SchemeListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
