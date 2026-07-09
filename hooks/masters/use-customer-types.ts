"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CustomerTypeListService,
  type CustomerTypeCreatePayload,
  type CustomerTypeExportParams,
  type CustomerTypeFilterField,
  type CustomerTypeListParams,
  type CustomerTypeUpdatePayload,
} from "@/services/customer-type-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): CustomerTypeListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering ?? "",
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useCustomerTypes(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.customerTypes.list(params),
    queryFn: ({ signal }) =>
      CustomerTypeListService.list({ ...toListParams(params), signal }),
  });
}

export function useCustomerType(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.customerTypes.detail(id ?? ""),
    queryFn: () => CustomerTypeListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCustomerType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CustomerTypeCreatePayload) =>
      CustomerTypeListService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: masterKeys.customerTypes.lists() });
    },
  });
}

export function useUpdateCustomerType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerTypeUpdatePayload }) =>
      CustomerTypeListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.customerTypes.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.customerTypes.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useToggleCustomerTypeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CustomerTypeListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.customerTypes.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.customerTypes.detail(id) }),
      ]);
    },
  });
}

export function useExportCustomerTypes() {
  return useMutation({
    mutationFn: (params: CustomerTypeExportParams) =>
      CustomerTypeListService.export(params),
  });
}

export function useCustomerTypeFilterDropdown(fieldName: CustomerTypeFilterField) {
  return useQuery({
    queryKey: masterKeys.customerTypes.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      CustomerTypeListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}
