import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SampleOrderService } from "@/services/sample-order.service";
import type { SalesOrderFormValues } from "@/app/(app)/sales/sample-order/components/SampleOrderForm";

const sampleOrderKeys = {
  all: ["sample-orders"] as const,
  lists: () => [...sampleOrderKeys.all, "list"] as const,
  list: (params: any) => [...sampleOrderKeys.lists(), params] as const,
  details: () => [...sampleOrderKeys.all, "detail"] as const,
  detail: (id: string | number) => [...sampleOrderKeys.details(), id] as const,
  nextNumber: () => [...sampleOrderKeys.all, "next-number"] as const,
  dropdowns: () => [...sampleOrderKeys.all, "dropdowns"] as const,
  filterDropdown: (fieldName: string) => [...sampleOrderKeys.all, "filter-dropdown", fieldName] as const,
};

export function useSampleOrders(params: {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  apiFilters?: any;
}) {
  return useQuery({
    queryKey: sampleOrderKeys.list(params),
    queryFn: async ({ signal }) => {
      return SampleOrderService.list({ ...params, signal });
    },
  });
}

export function useSampleOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: sampleOrderKeys.detail(id ?? ""),
    queryFn: ({ signal }) => SampleOrderService.getById(id!, signal),
    enabled: Boolean(id),
  });
}

export function useNextSampleOrderNumber() {
  return useQuery({
    queryKey: sampleOrderKeys.nextNumber(),
    queryFn: ({ signal }) => SampleOrderService.getNextNumber(signal),
  });
}

export function useSampleOrderDropdowns() {
  return useQuery({
    queryKey: sampleOrderKeys.dropdowns(),
    queryFn: ({ signal }) => SampleOrderService.getDropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSampleOrderFilterOptions(fieldName: string) {
  return useQuery({
    queryKey: sampleOrderKeys.filterDropdown(fieldName),
    queryFn: ({ signal }) => SampleOrderService.getFilterDropdown(fieldName, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSampleOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form, options, customerDetails }: { form: SalesOrderFormValues; options: { orderNo: string; status: string }, customerDetails?: any }) =>
      SampleOrderService.create(form, options, customerDetails),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sampleOrderKeys.lists() }),
      ]);
    },
  });
}

export function useUpdateSampleOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form, options, customerDetails }: { id: string; form: SalesOrderFormValues; options: { orderNo: string; status: string }, customerDetails?: any }) =>
      SampleOrderService.update(id, form, options, customerDetails),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sampleOrderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: sampleOrderKeys.detail(variables.id) }),
      ]);
    },
  });
}

export function useUpdateSampleOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) =>
      SampleOrderService.updateStatus(id, status, remarks),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sampleOrderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: sampleOrderKeys.detail(variables.id) }),
      ]);
    },
  });
}
