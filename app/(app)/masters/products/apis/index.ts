/**
 * Barrel re-export for product API utilities.
 * All actual API calls live in @/services/product-list.service.
 */
export {
  ProductListService,
  sortStateToOrdering,
  type ProductListParams,
  type ProductListRecord,
  type ProductListResult,
  type ProductCreatePayload,
  type ProductUpdatePayload,
  type ProductExportParams,
} from "@/services/product-list.service";
