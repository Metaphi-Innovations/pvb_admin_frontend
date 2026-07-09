"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DocumentTypeListService,
  type DocumentTypeCreatePayload,
  type DocumentTypeExportParams,
  type DocumentTypeFilterField,
  type DocumentTypeListParams,
  type DocumentTypeUpdatePayload,
} from "@/services/document-type-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): DocumentTypeListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useDocumentTypes(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.documentTypes.list(params),
    queryFn: ({ signal }) =>
      DocumentTypeListService.list({ ...toListParams(params), signal }),
  });
}

export function useDocumentType(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.documentTypes.detail(id ?? ""),
    queryFn: () => DocumentTypeListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useDocumentTypeDropdown() {
  return useQuery({
    queryKey: masterKeys.documentTypes.dropdown(),
    queryFn: () => DocumentTypeListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentTypeCreatePayload) =>
      DocumentTypeListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.dropdown() }),
      ]);
    },
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DocumentTypeUpdatePayload }) =>
      DocumentTypeListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.documentTypes.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.dropdown() }),
      ]);
    },
  });
}

export function useToggleDocumentTypeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DocumentTypeListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.detail(id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.documentTypes.dropdown() }),
      ]);
    },
  });
}

export function useExportDocumentTypes() {
  return useMutation({
    mutationFn: (params: DocumentTypeExportParams) =>
      DocumentTypeListService.export(params),
  });
}

export function useDocumentTypeFilterDropdown(fieldName: DocumentTypeFilterField) {
  return useQuery({
    queryKey: masterKeys.documentTypes.filterDropdown(fieldName),
    queryFn: ({ signal }) =>
      DocumentTypeListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}
