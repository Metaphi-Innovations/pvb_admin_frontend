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
  });
}

export function useCustomersDropdown() {
  return useQuery({
    queryKey: ["customers", "dropdown"],
    queryFn: () => SalesOrderService.getCustomersDropdown(),
  });
}

export function useCustomerDetails(id: string | null) {
  return useQuery({
    queryKey: ["customers", "details", id],
    queryFn: () => SalesOrderService.getCustomerDetails(id!),
    enabled: !!id,
  });
}

export function useWarehousesDropdown() {
  return useQuery({
    queryKey: ["warehouses", "dropdown"],
    queryFn: () => SalesOrderService.getWarehousesDropdown(),
  });
}

export function useSalesmenDropdown() {
  return useQuery({
    queryKey: ["salesmen", "dropdown"],
    queryFn: () => SalesOrderService.getSalesmenDropdown(),
  });
}

export function useProductsDropdown() {
  return useQuery({
    queryKey: ["products", "dropdown"],
    queryFn: () => SalesOrderService.getProductsDropdown(),
  });
}

export function useProductPricingDropdown() {
  return useQuery({
    queryKey: ["product-pricing", "dropdown"],
    queryFn: () => SalesOrderService.getProductPricingDropdown(),
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
