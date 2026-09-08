"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PostalMasterListService,
  type CreatePostalMappingPayload,
  type PostalExportParams,
  type PostalListParams,
} from "@/services/postal-master-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): PostalListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function usePostalMasterList(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.postalMaster.list(params),
    queryFn: ({ signal }) =>
      PostalMasterListService.list({ ...toListParams(params), signal }),
  });
}

export function usePostalMasterSummary() {
  return useQuery({
    queryKey: masterKeys.postalMaster.summary(),
    queryFn: ({ signal }) => PostalMasterListService.summary(signal),
    staleTime: 30_000,
  });
}

export function useTogglePostalMappingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) => PostalMasterListService.updateStatus(mappingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.postalMaster.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.postalMaster.summary() }),
      ]);
    },
  });
}

export function useCreatePostalMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePostalMappingPayload) =>
      PostalMasterListService.createMapping(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.postalMaster.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.postalMaster.summary() }),
      ]);
    },
  });
}

export function useDeletePostalMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) => PostalMasterListService.deleteMapping(mappingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.postalMaster.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.postalMaster.summary() }),
      ]);
    },
  });
}

export function useExportPostalMaster() {
  return useMutation({
    mutationFn: (params: PostalExportParams) => PostalMasterListService.export(params),
  });
}

export function usePostalLookupStates() {
  return useQuery({
    queryKey: masterKeys.postalMaster.lookupStates(),
    queryFn: ({ signal }) => PostalMasterListService.lookupStates(signal),
    staleTime: 5 * 60_000,
  });
}

export function usePostalLookupDistricts(stateId?: string | null) {
  return useQuery({
    queryKey: masterKeys.postalMaster.lookupDistricts(stateId ?? ""),
    queryFn: ({ signal }) =>
      PostalMasterListService.lookupDistricts(stateId || undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function usePostalLookupLocations(districtId: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.postalMaster.lookupLocations(districtId ?? ""),
    queryFn: ({ signal }) =>
      PostalMasterListService.lookupLocationsForDistrict(districtId!, signal),
    enabled: Boolean(districtId),
    staleTime: 5 * 60_000,
  });
}
