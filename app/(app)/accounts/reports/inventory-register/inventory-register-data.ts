/**
 * Inventory Register — re-exports from compute layer (real transaction data).
 */

export {
  buildInventoryRegisterReport,
  formatInventoryRegisterDate,
  formatQty,
  getInventoryRegisterCategoryOptions,
  getInventoryRegisterProductOptions,
  getInventoryRegisterWarehouseOptions,
  type InventoryRegisterFilters,
  type InventoryRegisterMovementDetail,
  type InventoryRegisterProductRow,
  type InventoryRegisterReport,
  type InventoryRegisterTotals,
} from "@/lib/accounts/inventory-register-compute";
