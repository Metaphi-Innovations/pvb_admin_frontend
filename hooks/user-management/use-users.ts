"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { userManagementKeys } from "@/lib/user-management/user-management-query-keys";
import {
  UserListService,
  type UserCreatePayload,
  type UserExportParams,
  type UserFilterField,
  type UserListParams,
  type UserUpdatePayload,
  permissionsHaveEnabled,
} from "@/services/user-list.service";
import type { EmployeeDocument } from "@/app/(app)/user-management/employee/employee-documents";

function toListParams(params: MasterListKeyParams): UserListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useUsers(params: MasterListKeyParams) {
  return useQuery({
    queryKey: userManagementKeys.users.list(params),
    queryFn: ({ signal }) => UserListService.list({ ...toListParams(params), signal }),
  });
}

export function useUser(id: string | null | undefined) {
  return useQuery({
    queryKey: userManagementKeys.users.detail(id ?? ""),
    queryFn: () => UserListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      documents,
    }: {
      payload: UserCreatePayload;
      documents?: EmployeeDocument[];
    }) => UserListService.create(payload, documents),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userManagementKeys.users.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      documents,
    }: {
      id: string;
      payload: UserUpdatePayload;
      documents?: EmployeeDocument[];
    }) => UserListService.update(id, payload, documents),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.users.lists() }),
        queryClient.invalidateQueries({
          queryKey: userManagementKeys.users.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      UserListService.updateStatus(id, active),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.users.lists() }),
        queryClient.invalidateQueries({
          queryKey: userManagementKeys.users.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useSaveUserPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: string;
      permissions: Parameters<typeof UserListService.savePermissions>[1];
    }) => UserListService.savePermissions(id, permissions),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: userManagementKeys.users.detail(variables.id),
      });
    },
  });
}

export function useExportUsers() {
  return useMutation({
    mutationFn: (params: UserExportParams) => UserListService.export(params),
  });
}

export function useUserFilterDropdown(fieldName: UserFilterField) {
  return useQuery({
    queryKey: userManagementKeys.users.filterDropdown(fieldName),
    queryFn: ({ signal }) => UserListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNextEmployeeId(enabled = true) {
  return useQuery({
    queryKey: userManagementKeys.users.nextEmployeeId(),
    queryFn: () => UserListService.getNextEmployeeId(),
    enabled,
    staleTime: 0,
  });
}

export function useApprovalUsers(roleId: string | null | undefined) {
  return useQuery({
    queryKey: userManagementKeys.users.approvalUsers(roleId ?? ""),
    queryFn: () => UserListService.getApprovalUsers(roleId!),
    enabled: Boolean(roleId),
    staleTime: 60_000,
  });
}

export function useUsersDropdown() {
  return useQuery({
    queryKey: userManagementKeys.users.dropdown(),
    queryFn: () => UserListService.dropdown(),
    staleTime: 5 * 60 * 1000,
  });
}
