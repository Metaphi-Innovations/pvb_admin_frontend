/**
 * Resolve the display SKU for invoice / transaction product lines.
 * Prefer Product Master `sku` over system `product_code` (e.g. 100000001).
 */
export function resolveProductSkuDisplay(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value) return value;
  }
  return "";
}

/** Read SKU from a product_snapshot JSON object. */
export function resolveSkuFromProductSnapshot(
  snap: Record<string, unknown> | null | undefined,
): string {
  if (!snap) return "";
  return resolveProductSkuDisplay(
    snap.sku as string | undefined,
    snap.product_sku as string | undefined,
    snap.SKU as string | undefined,
    snap.product_code as string | undefined,
    snap.productCode as string | undefined,
  );
}
