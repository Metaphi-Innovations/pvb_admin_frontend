"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PurchaseOrderListService,
  type PurchaseOrderFilterField,
  type PurchaseOrderListParams,
} from "@/services/purchase-order-list.service";
import { PurchaseOrderService } from "@/services/purchase-order.service";
import type { POFormValues } from "@/app/(app)/procurement/purchase-orders/components/PurchaseOrderForm";
import type { POListStatus } from "@/lib/procurement/po-status";
import {
  purchaseOrderKeys,
  type PurchaseOrderListKeyParams,
} from "@/lib/procurement/purchase-order-query-keys";

function toListParams(params: PurchaseOrderListKeyParams): PurchaseOrderListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    apiFilters: params.apiFilters,
  };
}

export function usePurchaseOrderList(
  params: PurchaseOrderListKeyParams,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(params),
    queryFn: ({ signal }) =>
      PurchaseOrderListService.list({ ...toListParams(params), signal }),
    enabled,
  });
}

export function usePurchaseOrderSummary() {
  return useQuery({
    queryKey: purchaseOrderKeys.summary(),
    queryFn: ({ signal }) => PurchaseOrderListService.getSummary(signal),
  });
}

export function usePurchaseOrderFilterDropdown(fieldName: PurchaseOrderFilterField) {
  return useQuery({
    queryKey: purchaseOrderKeys.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      PurchaseOrderListService.getFilterDropdown(fieldName, signal),
  });
}

export function useExportPurchaseOrders() {
  return useMutation({
    mutationFn: (params: {
      search: string;
      apiFilters?: Record<string, unknown>;
      ordering?: string;
    }) => PurchaseOrderListService.export(params),
  });
}

export function usePurchaseOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(id ?? ""),
    queryFn: ({ signal }) => PurchaseOrderService.getById(id!, signal),
    enabled: Boolean(id),
  });
}

export function usePurchaseOrderPreviewNumber(enabled = true) {
  return useQuery({
    queryKey: [...purchaseOrderKeys.all, "preview-number"] as const,
    queryFn: ({ signal }) => PurchaseOrderService.getPreviewNumber(signal),
    enabled,
  });
}

async function invalidatePoQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.summaries() }),
    id
      ? queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) })
      : Promise.resolve(),
  ]);
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      form: POFormValues;
      poNumber?: string;
      status: POListStatus;
      files?: File[];
    }) =>
      PurchaseOrderService.create(input.form, {
        poNumber: input.poNumber,
        status: input.status,
        files: input.files,
      }),
    onSuccess: async () => {
      await invalidatePoQueries(queryClient);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      form: POFormValues;
      poNumber?: string;
      status: POListStatus;
      files?: File[];
    }) =>
      PurchaseOrderService.update(input.id, input.form, {
        poNumber: input.poNumber,
        status: input.status,
        files: input.files,
      }),
    onSuccess: async (_data, variables) => {
      await invalidatePoQueries(queryClient, variables.id);
    },
  });
}

export function useCreatePOFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: PurchaseOrderService.createFollowup,
    onSuccess: async (_data, variables) => {
      await invalidatePoQueries(queryClient, variables.purchaseOrderId);
    },
  });
}

export function useUploadPOInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: PurchaseOrderService.uploadInvoice,
    onSuccess: async (_data, variables) => {
      await invalidatePoQueries(queryClient, variables.purchaseOrderId);
    },
  });
}

export function useShortClosePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: PurchaseOrderService.shortClose,
    onSuccess: async (_data, variables) => {
      await invalidatePoQueries(queryClient, variables.purchaseOrderId);
    },
  });
}

export function useClosePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purchaseOrderId: string) => PurchaseOrderService.close(purchaseOrderId),
    onSuccess: async (_data, purchaseOrderId) => {
      await invalidatePoQueries(queryClient, purchaseOrderId);
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purchaseOrderId: string) => PurchaseOrderService.cancel(purchaseOrderId),
    onSuccess: async (_data, purchaseOrderId) => {
      await invalidatePoQueries(queryClient, purchaseOrderId);
    },
  });
}
