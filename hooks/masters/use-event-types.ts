"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EventTypeListService,
  type EventTypeCreatePayload,
  type EventTypeExportParams,
  type EventTypeFilterField,
  type EventTypeListParams,
  type EventTypeUpdatePayload,
} from "@/services/event-type-list.service";
import { masterKeys, type MasterListKeyParams } from "@/lib/masters/master-query-keys";

function toListParams(params: MasterListKeyParams): EventTypeListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    ordering: params.ordering,
    status: params.status,
    apiFilters: params.apiFilters,
  };
}

export function useEventTypes(params: MasterListKeyParams) {
  return useQuery({
    queryKey: masterKeys.eventTypes.list(params),
    queryFn: ({ signal }) => EventTypeListService.list({ ...toListParams(params), signal }),
  });
}

export function useEventType(id: string | null | undefined) {
  return useQuery({
    queryKey: masterKeys.eventTypes.detail(id ?? ""),
    queryFn: () => EventTypeListService.view(id!),
    enabled: Boolean(id),
  });
}

export function useCreateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EventTypeCreatePayload) => EventTypeListService.create(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.summary() }),
      ]);
    },
  });
}

export function useUpdateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EventTypeUpdatePayload }) =>
      EventTypeListService.update(id, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.lists() }),
        queryClient.invalidateQueries({
          queryKey: masterKeys.eventTypes.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.summary() }),
      ]);
    },
  });
}

export function useToggleEventTypeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => EventTypeListService.updateStatus(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.lists() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.detail(id) }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.dropdown() }),
        queryClient.invalidateQueries({ queryKey: masterKeys.eventTypes.summary() }),
      ]);
    },
  });
}

export function useEventTypesDropdown() {
  return useQuery({
    queryKey: masterKeys.eventTypes.dropdown(),
    queryFn: () => EventTypeListService.dropdown(),
    staleTime: 60_000,
  });
}

export function useExportEventTypes() {
  return useMutation({
    mutationFn: (params: EventTypeExportParams) => EventTypeListService.export(params),
  });
}

export function useEventTypeFilterDropdown(fieldName: EventTypeFilterField) {
  return useQuery({
    queryKey: masterKeys.eventTypes.filterDropdown(fieldName),
    queryFn: ({ signal }) => EventTypeListService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}
