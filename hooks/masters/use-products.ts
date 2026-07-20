"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProductListService,
  type ProductCreatePayload,
  type ProductExportParams,
  type ProductFilterField,
  type ProductListParams,
  type ProductUpdatePayload,
} from "@/services/product-list.service";
import { ProductDropdownService } from "@/services/product-dropdown.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): ProductListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useProducts(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.products.list(params),
    queryFn: ({ signal }) => ProductListService.list({ ...toListParams(params), signal }),
  });
}

export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.products.detail(id ?? ""),
    queryFn: () => ProductListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useProductDropdown() {
  return useQuery({
    queryKey: masterKeys.products.all(),
    queryFn: () => ProductDropdownService.dropdown(),
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, images }: { payload: ProductCreatePayload; images: File[] }) =>
      ProductListService.create(payload, images),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: masterKeys.products.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      images,
    }: {
      id: string;
      payload: ProductUpdatePayload;
      images: File[];
    }) => ProductListService.update(id, payload, images),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.products.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.products.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      ProductListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.products.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.products.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useExportProducts() {
  return useMutation({
    mutationFn: (params: ProductExportParams) => ProductListService.export(params),
  });
}

export function useProductPreviewNumber() {
  return useQuery({
    queryKey: ["product-preview-number"],
    queryFn: () => ProductListService.previewNumber(),
  });
}

type FilterDropdownQueryOptions = {
  enabled?: boolean;
};

export function useProductFilterDropdown(
  fieldName: ProductFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: masterKeys.products.filterDropdown(fieldName),
    queryFn: ({ signal }) => ProductListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}