"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HsnListService,
  type HsnCreatePayload,
  type HsnExportParams,
  type HsnListParams,
  type HsnUpdatePayload,
} from "@/services/hsn-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): HsnListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useHsnList(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.hsn.list(params),
    queryFn: ({ signal }) => HsnListService.list({ ...toListParams(params), signal }),
  });
}

export function useHsn(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.hsn.detail(id ?? ""),
    queryFn: () => HsnListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateHsn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HsnCreatePayload) => HsnListService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: masterKeys.hsn.lists() });
    },
  });
}

export function useUpdateHsn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HsnUpdatePayload }) =>
      HsnListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.hsn.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.hsn.detail(variables.id) }),
      ]);
    },
  });
}

export function useToggleHsnStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => HsnListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.hsn.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.hsn.detail(id) }),
      ]);
    },
  });
}

export function useExportHsn() {
  return useMutation({
    mutationFn: (params: HsnExportParams) => HsnListService.export(params),
  });
}
