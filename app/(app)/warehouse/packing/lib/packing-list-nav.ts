export type PackingStatusTab = "ready-for-packing" | "packing-done";

export type PackingSourceTab =
  | "sales"
  | "sample"
  | "stock_transfer"
  | "purchase_return";

export function getPackingStatusTab(searchParams: {
  get: (key: string) => string | null;
}): PackingStatusTab {
  return searchParams.get("tab") === "packing-done"
    ? "packing-done"
    : "ready-for-packing";
}

export function packingListPathForSource(
  sourceType?: string | null,
): string {
  switch (sourceType) {
    case "Stock Transfer":
    case "stock_transfer":
      return "/warehouse/packing/stock-transfer";
    case "Purchase Return":
    case "purchase_return":
      return "/warehouse/packing/purchase-return";
    case "Sample Order":
    case "sample":
      return "/warehouse/packing/sample";
    case "Sales Order":
    case "normal_sales":
    case "sales":
    default:
      return "/warehouse/packing/sales";
  }
}

export function buildPackingListHref(
  listPath: string,
  opts: {
    tab?: PackingStatusTab;
    warehouse?: string | null;
    searchParams?: { toString: () => string; get: (key: string) => string | null };
  } = {},
): string {
  const params = opts.searchParams
    ? new URLSearchParams(opts.searchParams.toString())
    : new URLSearchParams();

  const tab = opts.tab ?? getPackingStatusTab(params);
  params.set("tab", tab);

  if (opts.warehouse != null) {
    if (!opts.warehouse || opts.warehouse === "All") {
      params.delete("warehouse");
    } else {
      params.set("warehouse", opts.warehouse);
    }
  }

  const qs = params.toString();
  return qs ? `${listPath}?${qs}` : listPath;
}

export function buildPackingViewHref(id: string, returnTo: string): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  const qs = params.toString();
  return qs
    ? `/warehouse/packing/view/${id}?${qs}`
    : `/warehouse/packing/view/${id}`;
}

export function buildPackingEditHref(id: string, returnTo: string): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  const qs = params.toString();
  return qs
    ? `/warehouse/packing/edit/${id}?${qs}`
    : `/warehouse/packing/edit/${id}`;
}

export function buildPackingCreateHref(id: string, returnTo: string): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  const qs = params.toString();
  return qs
    ? `/warehouse/packing/create/${id}?${qs}`
    : `/warehouse/packing/create/${id}`;
}

export function resolvePackingReturnTo(
  searchParams: { get: (key: string) => string | null },
  fallbackSourceType?: string | null,
  fallbackTab: PackingStatusTab = "ready-for-packing",
): string {
  const returnTo = searchParams.get("returnTo");
  if (returnTo && returnTo.startsWith("/warehouse/packing")) {
    return returnTo;
  }
  return buildPackingListHref(packingListPathForSource(fallbackSourceType), {
    tab: fallbackTab,
  });
}
