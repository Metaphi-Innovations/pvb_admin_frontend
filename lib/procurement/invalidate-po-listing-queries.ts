import type { QueryClient } from "@tanstack/react-query";
import { purchaseOrderKeys } from "@/lib/procurement/purchase-order-query-keys";
import { purchaseReturnKeys } from "@/lib/procurement/purchase-return-query-keys";

/** Invalidate PO listing, KPIs, and filter dropdowns. */
export async function invalidatePurchaseOrderListingQueries(
  queryClient: QueryClient,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.summaries() }),
    queryClient.invalidateQueries({
      queryKey: purchaseOrderKeys.filterDropdowns(),
    }),
  ]);
}

/** Invalidate POR listing and filter dropdowns. */
export async function invalidatePurchaseReturnListingQueries(
  queryClient: QueryClient,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() }),
    queryClient.invalidateQueries({
      queryKey: purchaseReturnKeys.filterDropdowns(),
    }),
  ]);
}

/**
 * Invalidate both PO (default tab) and POR listing caches.
 * Use after GRN, QC, packing, dispatch, or any action that can change either list.
 */
export async function invalidatePurchaseOrderModuleListingQueries(
  queryClient: QueryClient,
) {
  await Promise.all([
    invalidatePurchaseOrderListingQueries(queryClient),
    invalidatePurchaseReturnListingQueries(queryClient),
  ]);
}
