/** Display / business source kinds for Credit Note pending queue and forms. */

export type CreditNoteSourceKind =
  | "sales_return"
  | "cash_discount"
  | "near_expiry"
  | "festive_scheme"
  | "payment_discount"
  | "turnover_discount"
  | "manual";

export const CREDIT_NOTE_SOURCE_KIND_LABELS: Record<CreditNoteSourceKind, string> = {
  sales_return: "Sales Return",
  cash_discount: "Cash Discount",
  near_expiry: "Near Expiry Scheme",
  festive_scheme: "Festive Scheme",
  payment_discount: "Payment Discount",
  turnover_discount: "Turnover Discount",
  manual: "Manual Adjustment",
};

export function isSchemeSourceKind(kind: CreditNoteSourceKind): boolean {
  return (
    kind === "cash_discount" ||
    kind === "near_expiry" ||
    kind === "festive_scheme" ||
    kind === "payment_discount" ||
    kind === "turnover_discount"
  );
}

export function schemeKindFromSchemeType(schemeType: string): CreditNoteSourceKind | null {
  switch (schemeType) {
    case "Cash Discount Scheme":
      return "cash_discount";
    case "Product Near Expiry Scheme":
      return "near_expiry";
    case "Festive Discount Scheme":
      return "festive_scheme";
    case "Payment Discount Scheme":
      return "payment_discount";
    case "Turnover Discount Scheme":
      return "turnover_discount";
    default:
      return null;
  }
}

/** Maps stored credit note source + scheme metadata to display kind. */
export function resolveCreditNoteSourceKind(input: {
  source?: string;
  schemeName?: string;
  schemeCode?: string;
  schemeSettlementKey?: string;
  sourceReturnId?: string;
  sourceReturnNo?: string;
  reason?: string;
}): CreditNoteSourceKind {
  if (input.sourceReturnId || input.sourceReturnNo) return "sales_return";
  if (input.source === "sales_return") return "sales_return";
  if (input.source === "manual") return "manual";

  const name = `${input.schemeName ?? ""} ${input.reason ?? ""}`.toLowerCase();
  if (name.includes("near expiry") || input.schemeSettlementKey?.includes(":")) {
    const keyParts = input.schemeSettlementKey?.split(":") ?? [];
    if (keyParts.length >= 3) return "near_expiry";
  }
  if (name.includes("cash discount") || name.includes("cash payment")) return "cash_discount";
  if (name.includes("festive") || name.includes("diwali") || name.includes("holi")) return "festive_scheme";
  if (name.includes("turnover")) return "turnover_discount";
  if (name.includes("payment discount") || input.source === "payment_discount_scheme") {
    return "payment_discount";
  }
  if (input.schemeCode || input.schemeName) return "near_expiry";
  return "manual";
}
