"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    WarehouseListService,
    type WarehouseCreatePayload,
    type WarehouseExportParams,
    type WarehouseListParams,
    type WarehouseUpdatePayload,
    type WarehouseDropdownItem,
} from "@/services/warehouse-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { CustomerListService } from "@/services/customer-list.service";

function toListParams(params: MasterListKeyParams): WarehouseListParams {
    return {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        ordering: params.ordering,
        status: params.status,
        apiFilters: params.apiFilters,
    };
}

export function useWarehouses(params: MasterListKeyParams) {
    return useQuery({
        queryKey: masterKeys.warehouses.list(params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            WarehouseListService.list({ ...toListParams(params), signal }),
    });
}

export function useWarehouse(id: string | null | undefined) {
    return useQuery({
        queryKey: masterKeys.warehouses.detail(id ?? ""),
        queryFn: () => WarehouseListService.view(id!),
        enabled: Boolean(id),
    });
}

export function useCreateWarehouse() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: WarehouseCreatePayload) => WarehouseListService.create(payload),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.warehouses.lists() }),
                queryClient.invalidateQueries({ queryKey: masterKeys.warehouses.dropdown() }),
            ]);
        },
    });
}

export function useUpdateWarehouse() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: WarehouseUpdatePayload }) =>
            WarehouseListService.update(id, payload),
        onSuccess: async (_data: void, variables: { id: string; payload: WarehouseUpdatePayload }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.warehouses.lists() }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.warehouses.detail(variables.id),
                }),
                queryClient.invalidateQueries({ queryKey: masterKeys.warehouses.dropdown() }),
            ]);
        },
    });
}

export function useToggleWarehouseStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: "Active" | "Inactive" | "Under Maintenance" | "Closed" }) =>
            WarehouseListService.updateStatus(id, status),
        onSuccess: async (_data: void, variables: { id: string; status: "Active" | "Inactive" | "Under Maintenance" | "Closed" }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: masterKeys.warehouses.lists() }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.warehouses.detail(variables.id),
                }),
                queryClient.invalidateQueries({ queryKey: masterKeys.warehouses.dropdown() }),
            ]);
        },
    });
}

export function useWarehousesDropdown() {
    return useQuery({
        queryKey: masterKeys.warehouses.dropdown(),
        queryFn: () => WarehouseListService.dropdown(),
        staleTime: 60_000,
    });
}

export function useWarehousePreviewNumber(enabled = false) {
    return useQuery({
        queryKey: masterKeys.warehouses.previewNumber(),
        queryFn: () => WarehouseListService.previewNumber(),
        enabled,
        staleTime: 0,
    });
}

export function useExportWarehouses() {
    return useMutation({
        mutationFn: (params: WarehouseExportParams) => WarehouseListService.export(params),
    });
}