"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { userManagementKeys } from "@/lib/user-management/user-management-query-keys";
import {
  TemplateListService,
  type TemplateCreatePayload,
  type TemplateExportParams,
  type TemplateListParams,
  type TemplateUpdatePayload,
} from "@/services/template-list.service";

function toListParams(params: MasterListKeyParams): TemplateListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useTemplates(params: MasterListKeyParams, options?: { enabled?: boolean; refreshKey?: string }) {
  return useQuery({
    queryKey: [...userManagementKeys.templates.list(params), options?.refreshKey ?? ""] as const,
    queryFn: ({ signal }) => TemplateListService.list({ ...toListParams(params), signal }),
    enabled: options?.enabled ?? true,
  });
}

export function useTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: userManagementKeys.templates.detail(id ?? ""),
    queryFn: () => TemplateListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateCreatePayload) => TemplateListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.dropdown() }),
      ]);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TemplateUpdatePayload }) =>
      TemplateListService.update(id, payload),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.detail(vars.id) }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.dropdown() }),
      ]);
    },
  });
}

export function useToggleTemplateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => TemplateListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.detail(id) }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.templates.dropdown() }),
      ]);
    },
  });
}

export function useExportTemplates() {
  return useMutation({
    mutationFn: (params: TemplateExportParams) => TemplateListService.export(params),
  });
}

export function useTemplatesDropdown() {
  return useQuery({
    queryKey: userManagementKeys.templates.dropdown(),
    queryFn: () => TemplateListService.dropdown(),
    staleTime: 60_000,
  });
}
