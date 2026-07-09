"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FormulationListService,
  type FormulationCreatePayload,
  type FormulationExportParams,
  type FormulationFilterField,
  type FormulationListParams,
  type FormulationUpdatePayload,
} from "@/services/formulation-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): FormulationListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useFormulations(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.formulations.list(params),
    queryFn: ({ signal }) => FormulationListService.list({ ...toListParams(params), signal }),
  });
}

export function useFormulation(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.formulations.detail(id ?? ""),
    queryFn: () => FormulationListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateFormulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormulationCreatePayload) => FormulationListService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: masterKeys.formulations.lists() });
    },
  });
}

export function useUpdateFormulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormulationUpdatePayload }) =>
      FormulationListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.formulations.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.formulations.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useToggleFormulationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      FormulationListService.updateStatus(id, isActive),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.formulations.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.formulations.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useExportFormulations() {
  return useMutation({
    mutationFn: (params: FormulationExportParams) => FormulationListService.export(params),
  });
}

export function useFormulationFilterDropdown(fieldName: FormulationFilterField) {
  return useQuery({
    queryKey: masterKeys.formulations.filterDropdown(fieldName),
    queryFn: ({ signal }) => FormulationListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFormulationDropdown() {
  return useQuery({
    queryKey: masterKeys.formulations.dropdown(),
    queryFn: () => FormulationListService.dropdown(),
    staleTime: 5 * 60 * 1000,
  });
}
