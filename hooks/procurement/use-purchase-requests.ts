"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PurchaseRequestListService,
  type PurchaseRequestFilterField,
  type PurchaseRequestListParams,
} from "@/services/purchase-request-list.service";
import {
  PurchaseRequestService,
  detailToFormValues,
} from "@/services/purchase-request.service";
import type { PRFormValues } from "@/app/(app)/procurement/purchase-requests/components/PurchaseRequestForm";
import {
  purchaseRequestKeys,
  type PurchaseRequestListKeyParams,
} from "@/lib/procurement/purchase-request-query-keys";
import type { FilterDropdownQueryOptions } from "@/lib/masters/use-lazy-filter-columns";
import type { PRListStatus } from "@/lib/procurement/pr-status";

function toListParams(
  params: PurchaseRequestListKeyParams,
): PurchaseRequestListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    apiFilters: params.apiFilters,
  };
}

const PR_LIVE_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
};

async function invalidatePrListing(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: purchaseRequestKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: purchaseRequestKeys.summaries() }),
    id
      ? queryClient.invalidateQueries({
          queryKey: purchaseRequestKeys.detail(id),
        })
      : Promise.resolve(),
  ]);
}

export function usePurchaseRequestList(
  params: PurchaseRequestListKeyParams,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseRequestKeys.list(params),
    queryFn: ({ signal }) =>
      PurchaseRequestListService.list({ ...toListParams(params), signal }),
    enabled,
    ...PR_LIVE_QUERY_OPTIONS,
  });
}

export function usePurchaseRequestSummary() {
  return useQuery({
    queryKey: purchaseRequestKeys.summary(),
    queryFn: ({ signal }) => PurchaseRequestListService.getSummary(signal),
    ...PR_LIVE_QUERY_OPTIONS,
  });
}

export function usePurchaseRequestFilterDropdown(
  fieldName: PurchaseRequestFilterField,
  options?: FilterDropdownQueryOptions,
) {
  return useQuery({
    queryKey: purchaseRequestKeys.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      PurchaseRequestListService.getFilterDropdown(fieldName, signal),
    enabled: options?.enabled ?? true,
    ...PR_LIVE_QUERY_OPTIONS,
  });
}

export function useExportPurchaseRequests() {
  return useMutation({
    mutationFn: (params: {
      search: string;
      apiFilters?: Record<string, unknown>;
      ordering?: string;
    }) => PurchaseRequestListService.export(params),
  });
}

export function usePurchaseRequestPreviewNumber(
  state?: string | null,
  enabled = true,
) {
  const resolvedState = (state?.trim() || "Maharashtra").trim();
  return useQuery({
    queryKey: purchaseRequestKeys.previewNumber(resolvedState),
    queryFn: ({ signal }) =>
      PurchaseRequestService.getPreviewNumber(resolvedState, signal),
    enabled: Boolean(enabled && resolvedState),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function usePurchaseRequest(id: string | null | undefined) {
  return useQuery({
    queryKey: purchaseRequestKeys.detail(id ?? ""),
    queryFn: ({ signal }) => PurchaseRequestService.getById(id!, signal),
    enabled: Boolean(id),
    ...PR_LIVE_QUERY_OPTIONS,
  });
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      form: PRFormValues;
      status: PRListStatus;
      files?: File[];
    }) =>
      PurchaseRequestService.create(input.form, {
        status: input.status,
        files: input.files ?? input.form.attachmentFiles,
      }),
    onSuccess: async () => {
      await Promise.all([
        invalidatePrListing(queryClient),
        queryClient.invalidateQueries({
          queryKey: [...purchaseRequestKeys.all, "preview-number"],
        }),
      ]);
    },
  });
}

export function useUpdatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      form: PRFormValues;
      status: PRListStatus;
      files?: File[];
    }) =>
      PurchaseRequestService.update(input.id, input.form, {
        status: input.status,
        files: input.files ?? input.form.attachmentFiles,
      }),
    onSuccess: async (_data, variables) => {
      await invalidatePrListing(queryClient, variables.id);
    },
  });
}

export function useDeletePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PurchaseRequestService.delete(id),
    onSuccess: async () => {
      await invalidatePrListing(queryClient);
    },
  });
}

export function useApproveRejectPurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      action: "approve" | "reject";
      remarks?: string;
    }) =>
      PurchaseRequestService.approveReject(
        params.id,
        params.action,
        params.remarks,
      ),
    onSuccess: async (_data, variables) => {
      await invalidatePrListing(queryClient, variables.id);
    },
  });
}

export { detailToFormValues };
