"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    SupplierListService,
    type SupplierCreatePayload,
    type SupplierExportParams,
    type SupplierListParams,
    type SupplierUpdatePayload,
    type SupplierDropdownItem,
} from "@/services/supplier-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): SupplierListParams {
    return {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        ordering: params.ordering,
        status: params.status,
        apiFilters: params.apiFilters,
    };
}

export function useSuppliers(params: MasterListKeyParams) {
    return useQuery({
        queryKey: masterKeys.suppliers.list(params),
        queryFn: ({ signal }: { signal: AbortSignal }) => SupplierListService.list({ ...toListParams(params), signal }),
    });
}

export function useSupplier(id: string | null | undefined) {
    return useQuery({
        queryKey: masterKeys.suppliers.detail(id ?? ""),
        queryFn: () => SupplierListService.view(id!),
        enabled: Boolean(id),
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SupplierCreatePayload) => SupplierListService.create(payload),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.suppliers.lists() }),
                queryClient.invalidateQueries({ queryKey: masterKeys.suppliers.dropdown() }),
            ]);
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: SupplierUpdatePayload }) =>
            SupplierListService.update(id, payload),
        onSuccess: async (_data: void, variables: { id: string; payload: SupplierUpdatePayload }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.suppliers.lists() }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.suppliers.detail(variables.id),
                }),
                queryClient.invalidateQueries({ queryKey: masterKeys.suppliers.dropdown() }),
            ]);
        },
    });
}

export function useToggleSupplierStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            SupplierListService.updateStatus(id, isActive),
        onSuccess: async (_data: void, variables: { id: string; isActive: boolean }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.suppliers.lists() }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.suppliers.detail(variables.id),
                }),
                queryClient.invalidateQueries({ queryKey: masterKeys.suppliers.dropdown() }),
            ]);
        },
    });
}

export function useSuppliersDropdown() {
    return useQuery({
        queryKey: masterKeys.suppliers.dropdown(),
        queryFn: () => SupplierListService.dropdown(),
        staleTime: 60_000,
    });
}

export function useSupplierPreviewNumber(enabled = false) {
    return useQuery({
        queryKey: masterKeys.suppliers.previewNumber(),
        queryFn: () => SupplierListService.previewNumber(),
        enabled,
        staleTime: 0,
    });
}

export function useExportSuppliers() {
    return useMutation({
        mutationFn: (params: SupplierExportParams) => SupplierListService.export(params),
    });
}