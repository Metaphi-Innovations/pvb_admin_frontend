"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GrnService,
  type CreateGrnPayload,
  type UpdateGrnPayload,
} from "@/services/grn.service";
import { GrnListService } from "@/services/grn-list.service";
import { grnKeys } from "@/lib/warehouse/grn-query-keys";
import { purchaseOrderKeys } from "@/lib/procurement/purchase-order-query-keys";
import type { BackendGrnSourceType } from "@/lib/warehouse/grn-status";
import {
  salesReturnKeys,
  sampleReturnKeys,
} from "@/hooks/sales/use-return-documents";

export function useGrnPreviewNumber(enabled = true) {
  return useQuery({
    queryKey: grnKeys.previewNumber(),
    queryFn: ({ signal }) => GrnService.getPreviewNumber(signal),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useGrnSummary(
  sourceType: BackendGrnSourceType,
  warehouseId?: string,
  enabled = true,
) {
  const warehouseKey =
    warehouseId && warehouseId !== "All" ? warehouseId : undefined;

  return useQuery({
    queryKey: grnKeys.summary(sourceType, warehouseKey),
    queryFn: ({ signal }) =>
      GrnListService.getSummary(sourceType, warehouseKey, signal),
    enabled,
  });
}

export function useGrn(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: grnKeys.detail(id ?? ""),
    queryFn: ({ signal }) => GrnService.getById(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGrnPayload) => GrnService.create(input),
    onSuccess: async (data) => {
      const createdId = typeof data?.id === "string" ? data.id : undefined;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: grnKeys.summaries() }),
        queryClient.invalidateQueries({ queryKey: grnKeys.previewNumber() }),
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        queryClient.invalidateQueries({ queryKey: salesReturnKeys.all }),
        queryClient.invalidateQueries({ queryKey: sampleReturnKeys.all }),
        createdId
          ? queryClient.invalidateQueries({ queryKey: grnKeys.detail(createdId) })
          : Promise.resolve(),
      ]);
    },
  });
}

export function useUpdateGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGrnPayload }) =>
      GrnService.update(id, input),
    onSuccess: async (data, variables) => {
      const updatedId =
        (typeof data?.id === "string" ? data.id : undefined) || variables.id;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: grnKeys.summaries() }),
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        queryClient.invalidateQueries({ queryKey: salesReturnKeys.all }),
        queryClient.invalidateQueries({ queryKey: sampleReturnKeys.all }),
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(updatedId) }),
      ]);
    },
  });
}
