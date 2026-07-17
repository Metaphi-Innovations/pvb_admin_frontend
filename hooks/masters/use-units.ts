"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UnitListService,
  type UnitCreatePayload,
  type UnitExportParams,
  type UnitFilterField,
  type UnitListParams,
  type UnitUpdatePayload,
} from "@/services/unit-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): UnitListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useUnits(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.units.list(params),
    queryFn: ({ signal }) => UnitListService.list({ ...toListParams(params), signal }),
  });
}

export function useUnit(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.units.detail(id ?? ""),
    queryFn: () => UnitListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useParentUomDropdown(excludeId?: string) {
  return useQuery({
    queryKey: masterKeys.units.parentUomDropdown(excludeId ?? ""),
    queryFn: ({ signal }) => UnitListService.getParentUomDropdown(excludeId, signal),
    staleTime: 60_000,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UnitCreatePayload) => UnitListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.units.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.units.parentUomDropdowns() }),
      ]);
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UnitUpdatePayload }) =>
      UnitListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.units.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.units.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.units.parentUomDropdowns() }),
      ]);
    },
  });
}

export function useToggleUnitStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      UnitListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.units.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.units.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.units.parentUomDropdowns() }),
      ]);
    },
  });
}

export function useExportUnits() {
  return useMutation({
    mutationFn: (params: UnitExportParams) => UnitListService.export(params),
  });
}

export function useUnitFilterDropdown(
  fieldName: UnitFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.units.filterDropdown(fieldName),
    queryFn: ({ signal }) => UnitListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
