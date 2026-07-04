"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GstListService,
  type GstCreatePayload,
  type GstExportParams,
  type GstListParams,
  type GstUpdatePayload,
} from "@/services/gst-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): GstListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering ?? "",
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useGstList(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.gst.list(params),
    queryFn: ({ signal }) => GstListService.list({ ...toListParams(params), signal }),
  });
}

export function useGst(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.gst.detail(id ?? ""),
    queryFn: () => GstListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useGstDropdown() {
  return useQuery({
    queryKey: masterKeys.gst.dropdown(),
    queryFn: () => GstListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useCreateGst() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GstCreatePayload) => GstListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.dropdown() }),
      ]);
    },
  });
}

export function useUpdateGst() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GstUpdatePayload }) =>
      GstListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.dropdown() }),
      ]);
    },
  });
}

export function useToggleGstStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => GstListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.detail(id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.gst.dropdown() }),
      ]);
    },
  });
}

export function useExportGst() {
  return useMutation({
    mutationFn: (params: GstExportParams) => GstListService.export(params),
  });
}
