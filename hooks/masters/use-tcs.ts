"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TcsListService,
  type TcsCreatePayload,
  type TcsExportParams,
  type TcsFilterField,
  type TcsListParams,
  type TcsUpdatePayload,
} from "@/services/tcs-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): TcsListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useTcsList(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.tcs.list(params),
    queryFn: ({ signal }) => TcsListService.list({ ...toListParams(params), signal }),
  });
}

export function useTcs(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.tcs.detail(id ?? ""),
    queryFn: () => TcsListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useTcsDropdown() {
  return useQuery({
    queryKey: masterKeys.tcs.dropdown(),
    queryFn: ({ signal }) => TcsListService.dropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTcs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TcsCreatePayload) => TcsListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.filterDropdowns() }),
      ]);
    },
  });
}

export function useUpdateTcs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TcsUpdatePayload }) =>
      TcsListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.filterDropdowns() }),
      ]);
    },
  });
}

export function useToggleTcsStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      TcsListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tcs.dropdown() }),
      ]);
    },
  });
}

export function useExportTcs() {
  return useMutation({
    mutationFn: (params: TcsExportParams) => TcsListService.export(params),
  });
}

export function useTcsFilterDropdown(
  fieldName: TcsFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.tcs.filterDropdown(fieldName),
    queryFn: ({ signal }) => TcsListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
