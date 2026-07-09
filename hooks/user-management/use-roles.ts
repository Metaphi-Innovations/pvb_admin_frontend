"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RoleListService,
  type RoleCreatePayload,
  type RoleExportParams,
  type RoleFilterField,
  type RoleListParams,
  type RoleUpdatePayload,
} from "@/services/role-list.service";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { userManagementKeys } from "@/lib/user-management/user-management-query-keys";

function toListParams(params: MasterListKeyParams): RoleListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useRoles(params: MasterListKeyParams) {
  return useQuery({
    queryKey: userManagementKeys.roles.list(params),
    queryFn: ({ signal }) => RoleListService.list({ ...toListParams(params), signal }),
  });
}

export function useRole(id: string | null | undefined) {
  return useQuery({
    queryKey: userManagementKeys.roles.detail(id ?? ""),
    queryFn: () => RoleListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoleCreatePayload) => RoleListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.dropdown() }),
      ]);
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoleUpdatePayload }) =>
      RoleListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.lists() }),
        queryClient.invalidateQueries({
          queryKey: userManagementKeys.roles.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.dropdown() }),
      ]);
    },
  });
}

export function useToggleRoleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RoleListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.detail(id) }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.roles.dropdown() }),
      ]);
    },
  });
}

export function useExportRoles() {
  return useMutation({
    mutationFn: (params: RoleExportParams) => RoleListService.export(params),
  });
}

export function useRoleFilterDropdown(fieldName: RoleFilterField) {
  return useQuery({
    queryKey: userManagementKeys.roles.filterDropdown(fieldName),
    queryFn: ({ signal }) => RoleListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRolesDropdown() {
  return useQuery({
    queryKey: userManagementKeys.roles.dropdown(),
    queryFn: () => RoleListService.dropdown(),
    staleTime: 60_000,
  });
}
