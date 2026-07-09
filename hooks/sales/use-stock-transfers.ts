import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StockTransferService } from "@/services/stock-transfer.service";
import type { StockTransferFormValues } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";

const stockTransferKeys = {
  all: ["stock-transfers"] as const,
  lists: () => [...stockTransferKeys.all, "list"] as const,
  list: (params: any) => [...stockTransferKeys.lists(), params] as const,
  details: () => [...stockTransferKeys.all, "detail"] as const,
  detail: (id: string | number) => [...stockTransferKeys.details(), id] as const,
  nextNumber: () => [...stockTransferKeys.all, "next-number"] as const,
  dropdowns: () => [...stockTransferKeys.all, "dropdowns"] as const,
  filterDropdown: (fieldName: string) => [...stockTransferKeys.all, "filter-dropdown", fieldName] as const,
  summary: () => [...stockTransferKeys.all, "summary"] as const,
};

export function useStockTransfers(params: {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  apiFilters?: any;
}) {
  console.log("useStockTransfers hook executing with params:", params);
  return useQuery({
    queryKey: stockTransferKeys.list(params),
    queryFn: async ({ signal }) => {
      console.log("useStockTransfers queryFn firing fetch request!");
      try {
        const result = await StockTransferService.list({ ...params, signal });
        console.log("useStockTransfers queryFn succeeded with result:", result);
        return result;
      } catch (err) {
        console.error("useStockTransfers queryFn failed with error:", err);
        throw err;
      }
    },
  });
}

export function useStockTransfer(id: string | null | undefined) {
  return useQuery({
    queryKey: stockTransferKeys.detail(id ?? ""),
    queryFn: ({ signal }) => StockTransferService.getById(id!, signal),
    enabled: Boolean(id),
  });
}

export function useNextStockTransferNumber() {
  return useQuery({
    queryKey: stockTransferKeys.nextNumber(),
    queryFn: ({ signal }) => StockTransferService.getNextNumber(signal),
  });
}

export function useStockTransferDropdowns() {
  return useQuery({
    queryKey: stockTransferKeys.dropdowns(),
    queryFn: ({ signal }) => StockTransferService.getDropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockTransferFilterOptions(fieldName: string, status?: string) {
  return useQuery({
    queryKey: [...stockTransferKeys.filterDropdown(fieldName), status],
    queryFn: ({ signal }) => StockTransferService.getFilterDropdown(fieldName, status, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form, options }: { form: StockTransferFormValues; options: { transferNo: string; status: string } }) =>
      StockTransferService.create(form, options),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.summary() }),
      ]);
    },
  });
}

export function useUpdateStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form, options }: { id: string; form: StockTransferFormValues; options: { transferNo: string; status: string } }) =>
      StockTransferService.update(id, form, options),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.summary() }),
      ]);
    },
  });
}

export function useUpdateStockTransferStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) =>
      StockTransferService.updateStatus(id, status, remarks),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.summary() }),
      ]);
    },
  });
}

export function useCancelStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      StockTransferService.updateStatus(id, "cancelled", remarks),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.summary() }),
      ]);
    },
  });
}

export function useStockTransferSummary() {
  return useQuery({
    queryKey: stockTransferKeys.summary(),
    queryFn: ({ signal }) => StockTransferService.getSummary(signal),
  });
}
