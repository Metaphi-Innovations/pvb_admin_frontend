"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DepartmentListService,
  type DepartmentCreatePayload,
  type DepartmentExportParams,
  type DepartmentFilterField,
  type DepartmentListParams,
  type DepartmentUpdatePayload,
} from "@/services/department-list.service";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { userManagementKeys } from "@/lib/user-management/user-management-query-keys";

function toListParams(params: MasterListKeyParams): DepartmentListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useDepartments(params: MasterListKeyParams) {
  return useQuery({
    queryKey: userManagementKeys.departments.list(params),
    queryFn: ({ signal }) => DepartmentListService.list({ ...toListParams(params), signal }),
  });
}

export function useDepartment(id: string | null | undefined) {
  return useQuery({
    queryKey: userManagementKeys.departments.detail(id ?? ""),
    queryFn: () => DepartmentListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DepartmentCreatePayload) => DepartmentListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.dropdown() }),
      ]);
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentUpdatePayload }) =>
      DepartmentListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.lists() }),
        queryClient.invalidateQueries({
          queryKey: userManagementKeys.departments.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.dropdown() }),
      ]);
    },
  });
}

export function useToggleDepartmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DepartmentListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.lists() }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.detail(id) }),
        queryClient.invalidateQueries({ queryKey: userManagementKeys.departments.dropdown() }),
      ]);
    },
  });
}

export function useExportDepartments() {
  return useMutation({
    mutationFn: (params: DepartmentExportParams) => DepartmentListService.export(params),
  });
}

export function useDepartmentFilterDropdown(fieldName: DepartmentFilterField) {
  return useQuery({
    queryKey: userManagementKeys.departments.filterDropdown(fieldName),
    queryFn: ({ signal }) => DepartmentListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentsDropdown() {
  return useQuery({
    queryKey: userManagementKeys.departments.dropdown(),
    queryFn: () => DepartmentListService.dropdown(),
    staleTime: 60_000,
  });
}
