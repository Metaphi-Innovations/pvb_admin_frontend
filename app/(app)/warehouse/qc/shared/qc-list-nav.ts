import type { QcRecord } from "../types";

export type QcStatusTab = "pending" | "completed";

export type QcListSource =
  | "purchase"
  | "stock-transfer"
  | "sales-return"
  | "sample-return";

export function getQcStatusTab(searchParams: { get: (key: string) => string | null }): QcStatusTab {
  return searchParams.get("qcStatus") === "completed" ? "completed" : "pending";
}

export function qcListPathForSource(sourceType?: QcRecord["sourceType"] | string | null): string {
  switch (sourceType) {
    case "stock_transfer":
      return "/warehouse/qc/stock-transfer";
    case "sales_return":
      return "/warehouse/qc/sales-return";
    case "sample_return":
      return "/warehouse/qc/sample-return";
    case "purchase_order":
    case "purchase":
    default:
      return "/warehouse/qc/purchase";
  }
}

export function buildQcListHref(
  listPath: string,
  opts: {
    qcStatus?: QcStatusTab;
    destinationWarehouse?: string | null;
    searchParams?: { toString: () => string; get: (key: string) => string | null };
  } = {},
): string {
  const params = opts.searchParams
    ? new URLSearchParams(opts.searchParams.toString())
    : new URLSearchParams();

  const status = opts.qcStatus ?? getQcStatusTab(params);
  params.set("qcStatus", status);

  if (opts.destinationWarehouse != null) {
    if (!opts.destinationWarehouse || opts.destinationWarehouse === "All") {
      params.delete("destinationWarehouse");
    } else {
      params.set("destinationWarehouse", opts.destinationWarehouse);
    }
  }

  const qs = params.toString();
  return qs ? `${listPath}?${qs}` : listPath;
}

export function buildQcCreateHref(opts: {
  qcId?: string;
  grnId?: string;
  edit?: boolean;
  returnTo: string;
}): string {
  const params = new URLSearchParams();
  if (opts.qcId) params.set("qcId", opts.qcId);
  if (opts.grnId) params.set("grnId", opts.grnId);
  if (opts.edit) params.set("edit", "true");
  if (opts.returnTo) params.set("returnTo", opts.returnTo);
  const qs = params.toString();
  return qs ? `/warehouse/qc/create?${qs}` : "/warehouse/qc/create";
}

export function resolveQcReturnTo(
  searchParams: { get: (key: string) => string | null },
  fallbackSourceType?: QcRecord["sourceType"] | string | null,
  fallbackStatus: QcStatusTab = "pending",
): string {
  const returnTo = searchParams.get("returnTo");
  if (returnTo && returnTo.startsWith("/warehouse/qc")) {
    return returnTo;
  }
  return buildQcListHref(qcListPathForSource(fallbackSourceType), {
    qcStatus: fallbackStatus,
  });
}
