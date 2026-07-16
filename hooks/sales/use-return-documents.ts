"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SalesReturnService } from "@/services/sales-return.service";
import { SampleReturnService } from "@/services/sample-return.service";

export const salesReturnKeys = {
  all: ["sales", "sales-return"] as const,
  dropdown: (statuses?: string[]) =>
    [...salesReturnKeys.all, "dropdown", ...(statuses ?? [])] as const,
  details: () => [...salesReturnKeys.all, "detail"] as const,
  detail: (id: string) => [...salesReturnKeys.details(), id] as const,
};

export const sampleReturnKeys = {
  all: ["sales", "sample-return"] as const,
  lists: () => [...sampleReturnKeys.all, "list"] as const,
  list: (params: any) => [...sampleReturnKeys.lists(), params] as const,
  dropdown: (statuses?: string[]) =>
    [...sampleReturnKeys.all, "dropdown", ...(statuses ?? [])] as const,
  details: () => [...sampleReturnKeys.all, "detail"] as const,
  detail: (id: string) => [...sampleReturnKeys.details(), id] as const,
};

export function useSalesReturnDropdown(statuses?: string[], enabled = true) {
  return useQuery({
    queryKey: salesReturnKeys.dropdown(statuses),
    queryFn: ({ signal }) => SalesReturnService.getDropdown(statuses, signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useSalesReturn(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: salesReturnKeys.detail(id ?? ""),
    queryFn: ({ signal }) => SalesReturnService.getById(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useSampleReturnDropdown(statuses?: string[], enabled = true) {
  return useQuery({
    queryKey: sampleReturnKeys.dropdown(statuses),
    queryFn: ({ signal }) => SampleReturnService.getDropdown(statuses, signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useSampleReturn(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: sampleReturnKeys.detail(id ?? ""),
    queryFn: ({ signal }) => SampleReturnService.getById(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useSampleReturns(params: {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}) {
  return useQuery({
    queryKey: sampleReturnKeys.list(params),
    queryFn: () => SampleReturnService.list(params),
  });
}

export function useSampleReturnFilterOptions(fieldName: string) {
  return useQuery({
    queryKey: [...sampleReturnKeys.all, "filter-options", fieldName],
    queryFn: () => SampleReturnService.getFilterDropdown(fieldName),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateSampleReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => SampleReturnService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sampleReturnKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: sampleReturnKeys.all }),
      ]);
    },
  });
}
