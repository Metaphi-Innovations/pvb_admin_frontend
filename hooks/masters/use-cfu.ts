"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CfuListService,
  type CfuCreatePayload,
  type CfuExportParams,
  type CfuFilterField,
  type CfuListParams,
  type CfuUpdatePayload,
} from "@/services/cfu-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): CfuListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useCfuList(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.cfu.list(params),
    queryFn: ({ signal }) => CfuListService.list({ ...toListParams(params), signal }),
  });
}

export function useCfu(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.cfu.detail(id ?? ""),
    queryFn: () => CfuListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCfu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CfuCreatePayload) => CfuListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.summary() }),
      ]);
    },
  });
}

export function useUpdateCfu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CfuUpdatePayload }) =>
      CfuListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.summary() }),
      ]);
    },
  });
}

export function useToggleCfuStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CfuListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.detail(id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.cfu.summary() }),
      ]);
    },
  });
}

export function useCfuDropdown() {
  return useQuery({
    queryKey: masterKeys.cfu.dropdown(),
    queryFn: () => CfuListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useExportCfu() {
  return useMutation({
    mutationFn: (params: CfuExportParams) => CfuListService.export(params),
  });
}

export function useCfuFilterDropdown(
  fieldName: CfuFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.cfu.filterDropdown(fieldName),
    queryFn: ({ signal }) => CfuListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
