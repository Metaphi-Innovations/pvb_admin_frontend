export function getSnapshotField(snapshot: unknown, ...keys: string[]): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const record = snapshot as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return null;
}

export function resolveProductSku(product: {
  sku?: string | null;
  product_code?: string | null;
  product_snapshot?: unknown;
  product?: { sku?: string | null; product_code?: string | null };
}): string {
  const snap =
    product.product_snapshot && typeof product.product_snapshot === "object"
      ? (product.product_snapshot as Record<string, unknown>)
      : {};
  return (
    product.sku ||
    product.product?.sku ||
    (typeof snap.sku === "string" ? snap.sku : null) ||
    (typeof snap.SKU === "string" ? snap.SKU : null) ||
    getSnapshotField(product.product_snapshot, "sku", "SKU") ||
    product.product_code ||
    product.product?.product_code ||
    getSnapshotField(product.product_snapshot, "product_code") ||
    "—"
  );
}

export function formatDateOnly(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDateInputValue(value: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value);
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export function resolveUnitsPerCase(product: {
  quantity_type?: string | null;
  unit_per_packing?: number | null;
  product_snapshot?: unknown;
}): number {
  const qtyType = String(product.quantity_type || "").toUpperCase();
  if (qtyType === "PIECE" || qtyType === "PIECES" || qtyType === "PCS" || qtyType === "UNIT") {
    return 1;
  }
  const fromField = Number(product.unit_per_packing || 0);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  const fromSnap = Number(
    getSnapshotField(
      product.product_snapshot,
      "unit_per_packing",
      "units_per_case",
      "pack_size",
      "conversion_rate",
    ) || 0,
  );
  if (Number.isFinite(fromSnap) && fromSnap > 0) return fromSnap;
  return 1;
}

export function formatDisplayQty(
  baseQty: number,
  product: {
    quantity_type?: string | null;
    unit_per_packing?: number | null;
    product_snapshot?: unknown;
  },
): string {
  const unitsPerCase = resolveUnitsPerCase(product);
  const qtyType = String(product.quantity_type || "").toUpperCase();
  if (unitsPerCase <= 1 || qtyType === "PIECE" || qtyType === "PIECES" || qtyType === "PCS") {
    return `${baseQty} ${qtyType === "PIECE" || qtyType === "PIECES" || qtyType === "PCS" ? "Pieces" : "Units"}`;
  }
  const cases = baseQty / unitsPerCase;
  const caseLabel = Number.isInteger(cases) ? String(cases) : cases.toFixed(2).replace(/\.?0+$/, "");
  return `${caseLabel} Cases`;
}

export function getLatestPackingDate(
  packings: Array<{ packing_date?: string | null }>,
): Date | null {
  const dates = packings
    .map((p) => p.packing_date)
    .filter((d): d is string => d != null && String(d).trim() !== "")
    .map((d) => new Date(String(d).includes("T") ? d : `${d}T00:00:00`))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export function validateDispatchDateAgainstPacking(
  dispatchDate: string,
  packings: Array<{ packing_date?: string | null; packing_done_no?: string }>,
): string | null {
  if (!dispatchDate) return null;
  const latestPacking = getLatestPackingDate(packings);
  if (!latestPacking) return null;
  const dispatch = new Date(
    dispatchDate.includes("T") ? dispatchDate : `${dispatchDate}T00:00:00`,
  );
  if (Number.isNaN(dispatch.getTime())) return null;
  latestPacking.setHours(0, 0, 0, 0);
  dispatch.setHours(0, 0, 0, 0);
  if (dispatch < latestPacking) {
    return `Dispatch date cannot be before packing done date (${formatDateOnly(latestPacking)}).`;
  }
  return null;
}

export function formatPackingDates(
  packings: Array<{ packing_date?: string | null }>,
): string {
  const labels = packings
    .map((p) => formatDateOnly(p.packing_date))
    .filter((d) => d !== "—");
  if (labels.length === 0) return "—";
  return Array.from(new Set(labels)).join(", ");
}
