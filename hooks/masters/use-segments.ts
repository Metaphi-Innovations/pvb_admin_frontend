"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SegmentListService,
  type SegmentCreatePayload,
  type SegmentExportParams,
  type SegmentFilterField,
  type SegmentListParams,
  type SegmentUpdatePayload,
  type SegmentDropdownItem,
} from "@/services/segment-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";

function toListParams(params: MasterListKeyParams): SegmentListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useSegments(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.segments.list(params),
    queryFn: ({ signal }) => SegmentListService.list({ ...toListParams(params), signal }),
  });
}

export function useSegment(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.segments.detail(id ?? ""),
    queryFn: () => SegmentListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SegmentCreatePayload) => SegmentListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.segments.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.segments.dropdown() }),
      ]);
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SegmentUpdatePayload }) =>
      SegmentListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.segments.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.segments.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.segments.dropdown() }),
      ]);
    },
  });
}

export function useToggleSegmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      SegmentListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.segments.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.segments.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.segments.dropdown() }),
      ]);
    },
  });
}

export function useSegmentsDropdown() {
  return useQuery({
    queryKey: masterKeys.segments.dropdown(),
    queryFn: () => SegmentListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useExportSegments() {
  return useMutation({
    mutationFn: (params: SegmentExportParams) => SegmentListService.export(params),
  });
}

export function useSegmentFilterDropdown(
  fieldName: SegmentFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.segments.filterDropdown(fieldName),
    queryFn: ({ signal }) => SegmentListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
