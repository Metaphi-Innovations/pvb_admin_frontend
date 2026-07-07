"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TdsListService,
  type TdsCreatePayload,
  type TdsExportParams,
  type TdsFilterField,
  type TdsListParams,
  type TdsUpdatePayload,
} from "@/services/tds-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): TdsListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useTdsList(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.tds.list(params),
    queryFn: ({ signal }) => TdsListService.list({ ...toListParams(params), signal }),
  });
}

export function useTds(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.tds.detail(id ?? ""),
    queryFn: () => TdsListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useTdsDropdown() {
  return useQuery({
    queryKey: masterKeys.tds.dropdown(),
    queryFn: ({ signal }) => TdsListService.dropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TdsCreatePayload) => TdsListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.filterDropdowns() }),
      ]);
    },
  });
}

export function useUpdateTds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TdsUpdatePayload }) =>
      TdsListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.filterDropdowns() }),
      ]);
    },
  });
}

export function useToggleTdsStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      TdsListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.tds.dropdown() }),
      ]);
    },
  });
}

export function useExportTds() {
  return useMutation({
    mutationFn: (params: TdsExportParams) => TdsListService.export(params),
  });
}

export function useTdsFilterDropdown(fieldName: TdsFilterField) {
  return useQuery({
    queryKey: masterKeys.tds.filterDropdown(fieldName),
    queryFn: ({ signal }) => TdsListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}
