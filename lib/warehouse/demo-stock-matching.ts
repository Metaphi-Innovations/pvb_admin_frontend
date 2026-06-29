/**
 * Demo-only warehouse ↔ QC stock name resolution.
 * Maps master-data / sales document labels to QC-passed inventory ledger rows.
 */

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export const WAREHOUSE_STOCK_ALIASES: Record<string, string[]> = {
  "central warehouse": ["central warehouse", "central distribution hub", "mumbai transit point"],
  "central distribution hub": ["central warehouse", "central distribution hub", "mumbai transit point"],
  "north zone hub": ["north zone hub", "north zone regional store"],
  "north zone regional store": ["north zone hub", "north zone regional store"],
  "south zone depot": ["south zone depot", "south zone warehouse"],
  "south zone warehouse": ["south zone depot", "south zone warehouse"],
  "west zone hub": ["west zone hub", "gujarat distribution center", "western regional depot"],
  "gujarat distribution center": ["west zone hub", "gujarat distribution center", "western regional depot"],
  "western regional depot": ["west zone hub", "gujarat distribution center", "western regional depot"],
  "east zone depot": ["east zone depot"],
  "mumbai transit point": ["central warehouse", "central distribution hub", "mumbai transit point"],
  "main warehouse": ["central warehouse", "central distribution hub"],
  "mumbai warehouse": ["central warehouse", "mumbai transit point"],
  "pune warehouse": ["west zone hub", "gujarat distribution center"],
};

export const PRODUCT_STOCK_ALIASES_BY_CODE: Record<string, string[]> = {
  "SKU-UR-50": ["urea 50kg", "urea 46%", "urea"],
  "SKU-NPK-26": ["npk 10:26:26", "npk 19:19:19"],
  "SKU-DAP-50": ["dap 50kg", "dap fertilizer"],
  "SKU-ZN-21": ["zinc sulphate 21%"],
  "SKU-MZ-12": ["hybrid maize seed", "hybrid tomato seeds"],
  "BIO-000001": ["bio fertilizer a"],
  "PRD-001": ["npk 19:19:19", "npk 10:26:26"],
  "PRD-002": ["dap fertilizer", "dap 50kg"],
  "PRD-003": ["urea 46%", "urea 50kg", "urea"],
  "PRD-004": ["chlorpyrifos 20 ec"],
  "PRD-005": ["glyphosate 41% sl"],
  "PRD-006": ["hybrid tomato seeds", "hybrid maize seed"],
  "PRD-008": ["vermicompost"],
  "PRD-011": ["mop potash"],
};

const PRODUCT_STOCK_ALIASES_BY_NAME: Record<string, string[]> = {
  "urea 50kg": ["urea 50kg", "urea 46%", "urea"],
  "urea 46%": ["urea 46%", "urea 50kg", "urea"],
  "npk 10:26:26": ["npk 10:26:26", "npk 19:19:19"],
  "npk 19:19:19": ["npk 19:19:19", "npk 10:26:26"],
  "dap 50kg": ["dap 50kg", "dap fertilizer"],
  "dap fertilizer": ["dap fertilizer", "dap 50kg"],
  "zinc sulphate 21%": ["zinc sulphate 21%"],
  "hybrid maize seed": ["hybrid maize seed", "hybrid tomato seeds"],
  "hybrid tomato seeds": ["hybrid tomato seeds", "hybrid maize seed"],
  "bio fertilizer a": ["bio fertilizer a"],
  "chlorpyrifos 20 ec": ["chlorpyrifos 20 ec"],
  "glyphosate 41% sl": ["glyphosate 41% sl"],
  "vermicompost": ["vermicompost"],
  "mop potash": ["mop potash"],
};

export function resolveWarehouseNamesForStockLookup(warehouseName: string): string[] {
  const key = normalizeKey(warehouseName);
  const aliases = WAREHOUSE_STOCK_ALIASES[key] ?? [key];
  return [...new Set(aliases.map(normalizeKey))];
}

export function resolveProductNamesForStockLookup(
  productName: string,
  productCode?: string,
): string[] {
  const names = new Set<string>();
  const normalizedName = normalizeKey(productName);
  if (normalizedName) {
    names.add(normalizedName);
    (PRODUCT_STOCK_ALIASES_BY_NAME[normalizedName] ?? []).forEach((n) => names.add(n));
  }
  if (productCode) {
    const codeKey = productCode.trim().toUpperCase();
    (PRODUCT_STOCK_ALIASES_BY_CODE[codeKey] ?? []).forEach((n) => names.add(normalizeKey(n)));
    names.add(normalizeKey(productCode));
  }
  return [...names];
}

export function warehouseMatchesStockRecord(
  recordWarehouse: string,
  sourceWarehouseName: string,
): boolean {
  const aliases = resolveWarehouseNamesForStockLookup(sourceWarehouseName);
  return aliases.includes(normalizeKey(recordWarehouse));
}

export function productMatchesStockRecord(
  recordProduct: string,
  productName: string,
  productCode?: string,
): boolean {
  const aliases = resolveProductNamesForStockLookup(productName, productCode);
  const normalizedProduct = normalizeKey(recordProduct);
  return aliases.some(
    (alias) =>
      normalizedProduct === alias ||
      normalizedProduct.includes(alias) ||
      alias.includes(normalizedProduct),
  );
}
