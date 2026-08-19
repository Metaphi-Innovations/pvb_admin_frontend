"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CustomerListService,
    type CustomerCreatePayload,
    type CustomerExportParams,
    type CustomerListParams,
    type CustomerUpdatePayload,
    type CustomerDropdownItem
} from "@/services/customer-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { CustomerBranch } from "@/app/(app)/masters/customers/customer-data";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";
import type { CustomerFilterField } from "@/services/customer-list.service";

function toListParams(params: MasterListKeyParams): CustomerListParams {
    return {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        ordering: params.ordering,
        status: params.status,
        apiFilters: params.apiFilters,
    };
}

export function useCustomers(params: MasterListKeyParams) {
    return useQuery({
        queryKey: masterKeys.customers.list(params),
        queryFn: ({ signal }) =>
            CustomerListService.list({ ...toListParams(params), signal }),
    });
}

export function useCustomerSummary() {
    return useQuery({
        queryKey: masterKeys.customers.summary(),
        queryFn: ({ signal }) => CustomerListService.getSummary(signal),
        staleTime: 30_000,
    });
}

export function useCustomer(id: string | null | undefined) {
    return useQuery({
        queryKey: masterKeys.customers.detail(id ?? ""),
        queryFn: () => CustomerListService.view(id!),
        enabled: Boolean(id),
    });
}

export function useCustomerDropdown() {
    return useQuery<CustomerDropdownItem[]>({
        queryKey: masterKeys.customers.all(),
        queryFn: () => CustomerListService.dropdown(),
        staleTime: 30_000,
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            payload,
            branches,
        }: {
            payload: CustomerCreatePayload;
            branches: CustomerBranch[];
        }) => CustomerListService.create(payload, branches),

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.lists(),
                }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.summary(),
                }),
            ]);
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
            branches,
        }: {
            id: string;
            payload: CustomerUpdatePayload;
            branches: CustomerBranch[];
        }) => CustomerListService.update(id, payload, branches),

        onSuccess: async (_data, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.lists(),
                }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.summary(),
                }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.detail(variables.id),
                }),
            ]);
        },
    });
}

export function useToggleCustomerStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            isActive,
        }: {
            id: string;
            isActive: boolean;
        }) => CustomerListService.updateStatus(id, isActive),

        onSuccess: async (_data, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.lists(),
                }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.summary(),
                }),
                queryClient.invalidateQueries({
                    queryKey: masterKeys.customers.detail(variables.id),
                }),
            ]);
        },
    });
}

export function useExportCustomers() {
    return useMutation({
        mutationFn: (params: CustomerExportParams) =>
            CustomerListService.export(params),
    });
}

export function useCfDropdown() {
    return useQuery({
        queryKey: masterKeys.customers.cfDropdown(),
        queryFn: () => CustomerListService.getCfCustomerDropdown(),
    });
}

export function useCustomerFilterDropdown(
    fieldName: CustomerFilterField,
    options?: FilterDropdownQueryOptions,
) {
    return useQuery({
        queryKey: masterKeys.customers.filterDropdown(fieldName),
        queryFn: ({ signal }) => CustomerListService.getFilterDropdown(fieldName, signal),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}