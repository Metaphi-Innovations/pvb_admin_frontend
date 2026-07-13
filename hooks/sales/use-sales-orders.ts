import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SalesOrderService } from "@/services/sales-order.service";
import { salesOrderKeys, type SalesOrderListKeyParams } from "@/lib/sales/sales-order-query-keys";
import type { SalesOrderFormValues } from "@/app/(app)/sales/orders/components/SalesOrderForm";

export function useSalesOrders(params: SalesOrderListKeyParams) {
  return useQuery({
    queryKey: salesOrderKeys.list(params),
    queryFn: ({ signal }) => SalesOrderService.list({ ...params, signal }),
  });
}

export function useSalesOrder(id: string | number | null | undefined) {
  return useQuery({
    queryKey: salesOrderKeys.detail(id ?? ""),
    queryFn: ({ signal }) => SalesOrderService.getById(id!, signal),
    enabled: Boolean(id),
  });
}

export function useNextSoNumber() {
  return useQuery({
    queryKey: salesOrderKeys.nextSoNumber(),
    queryFn: ({ signal }) => SalesOrderService.getNextSoNumber(signal),
  });
}

export function useSalesOrderFilterOptions(fieldName: string, activeTab?: string) {
  return useQuery({
    queryKey: [...salesOrderKeys.all, "filter-options", fieldName, activeTab],
    queryFn: ({ signal }) => SalesOrderService.getFilterDropdown(fieldName, activeTab, signal),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCustomersDropdown() {
  return useQuery({
    queryKey: ["customers", "dropdown"],
    queryFn: () => SalesOrderService.getCustomersDropdown(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCustomerDetails(id: string | null) {
  return useQuery({
    queryKey: ["customers", "details", id],
    queryFn: () => SalesOrderService.getCustomerDetails(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useWarehousesDropdown() {
  return useQuery({
    queryKey: ["warehouses", "dropdown"],
    queryFn: () => SalesOrderService.getWarehousesDropdown(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSalesmenDropdown() {
  return useQuery({
    queryKey: ["salesmen", "dropdown"],
    queryFn: () => SalesOrderService.getSalesmenDropdown(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useProductsDropdown() {
  return useQuery({
    queryKey: ["products", "dropdown"],
    queryFn: () => SalesOrderService.getProductsDropdown(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useProductPricingDropdown() {
  return useQuery({
    queryKey: ["product-pricing", "dropdown"],
    queryFn: () => SalesOrderService.getProductPricingDropdown(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form, options }: { form: SalesOrderFormValues; options: { soNumber: string; status: string } }) =>
      SalesOrderService.create(form, options),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      form,
      options,
    }: {
      id: string | number;
      form: SalesOrderFormValues;
      options: { soNumber: string; status: string };
    }) => SalesOrderService.update(id, form, options),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(variables.id) }),
      ]);
    },
  });
}

export function useApproveRejectSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: string | number; action: "APPROVE" | "REJECT"; remarks?: string }) =>
      SalesOrderService.approveReject(id, action, remarks),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(variables.id) }),
      ]);
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string | number; remarks?: string }) =>
      SalesOrderService.cancel(id, remarks),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(variables.id) }),
      ]);
    },
  });
}

export function useSplitSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      form,
      options,
    }: {
      id: string | number;
      form: SalesOrderFormValues;
      options: { status: string; reason?: string };
    }) => SalesOrderService.split(id, form, options),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useCreatePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      source_type: string;
      source_id: string;
      warehouse_id: string;
      remarks?: string;
      products: Array<{
        source_item_id: string;
        batch_code: string;
        order_qty: number;
        available_inventory_id: string;
      }>;
    }) => SalesOrderService.createPackingList(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}
