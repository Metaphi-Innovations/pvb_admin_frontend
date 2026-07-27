"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { SupplierTypeCreatePayload, SupplierTypeExportParams, SupplierTypeFilterField, SupplierTypeListParams, SupplierTypeListService, SupplierTypeUpdatePayload } from "@/services/supplier-type.service";

function toListParams(params: MasterListKeyParams): SupplierTypeListParams {
    return {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        ordering: params.ordering,
        status: params.status,
        apiFilters: params.apiFilters,
    };
}

export function useSupplierTypes(params: MasterListKeyParams) {
    return useQuery({
        queryKey: masterKeys.supplierTypes.list(params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            SupplierTypeListService.list({ ...toListParams(params), signal }),
    });
}

export function useSupplierType(id: string | null | undefined) {
    return useQuery({
        queryKey: masterKeys.supplierTypes.detail(id ?? ""),
        queryFn: () => SupplierTypeListService.view(id!),
        enabled: Boolean(id),
    });
}

export function useCreateSupplierType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SupplierTypeCreatePayload) => SupplierTypeListService.create(payload),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.supplierTypes.lists() }),
                queryClient.invalidateQueries({ queryKey: masterKeys.supplierTypes.dropdown() }),
            ]);
        },
    });
}

export function useDropdownSupplierTypes() {
    return useQuery({
        queryKey: masterKeys.supplierTypes.dropdown(),
        queryFn: () => SupplierTypeListService.dropdown(),
        staleTime: 60_000,
    });
}

export function useUpdateSupplierType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: SupplierTypeUpdatePayload }) =>
            SupplierTypeListService.update(id, payload),
        onSuccess: async (_data: void, variables: { id: string; payload: SupplierTypeUpdatePayload }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.supplierTypes.lists() }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.supplierTypes.detail(variables.id),
                }),
                queryClient.invalidateQueries({ queryKey: masterKeys.supplierTypes.dropdown() }),
            ]);
        },
    });
}

export function useToggleSupplierTypeStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            SupplierTypeListService.updateStatus(id, isActive),
        onSuccess: async (_data: void, variables: { id: string; isActive: boolean }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.supplierTypes.lists() }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.supplierTypes.detail(variables.id),
                }),
                queryClient.invalidateQueries({ queryKey: masterKeys.supplierTypes.dropdown() }),
            ]);
        },
    });
}

export function useSupplierTypesDropdown() {
    return useQuery({
        queryKey: masterKeys.supplierTypes.dropdown(),
        queryFn: () => SupplierTypeListService.dropdown(),
        staleTime: 60_000,
    });
}

export function useExportSupplierTypes() {
    return useMutation({
        mutationFn: (params: SupplierTypeExportParams) => SupplierTypeListService.export(params),
    });
}

type FilterDropdownQueryOptions = {
    enabled?: boolean;
};

export function useSupplierTypeFilterDropdown(
    fieldName: SupplierTypeFilterField,
    options?: FilterDropdownQueryOptions,
) {
    return useQuery({
        queryKey: masterKeys.supplierTypes.filterDropdown(fieldName),
        queryFn: ({ signal }) => SupplierTypeListService.getFilterDropdown(fieldName, signal),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}