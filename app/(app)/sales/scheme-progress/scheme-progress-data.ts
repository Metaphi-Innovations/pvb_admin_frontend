/**
 * Scheme Progress — live read-only progress rows (Sales).
 * Reuses Masters schemes, Customers, Invoices, Sales Returns.
 * Optionally reads entitlement status for settlement hint only.
 */

import { loadCustomers, type Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  loadConsolidatedSchemeRecords,
  formatSchemeRupee,
} from "@/app/(app)/masters/scheme/product-discount-scheme";
import {
  isTurnoverRecord,
} from "@/app/(app)/masters/scheme/standard-schemes";
import type { SchemeRecord, TurnoverSlab } from "@/app/(app)/masters/scheme/scheme-data";
import {
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  getSalesReturnRecords,
  getReturnTotalAmount,
  formatProductReturnQuantity,
  type SalesReturnRecord,
} from "@/app/(app)/sales/orders/sales-return-data";
import {
  formatProgressMoney,
  formatSlabRange,
  type SchemeProgressExclusionRow,
  type SchemeProgressInvoiceRow,
  type SchemeProgressReturnRow,
  type SchemeProgressRow,
  type SchemeProgressSettlementHint,
  type SchemeProgressSlabView,
  type SchemeProgressStatus,
} from "./scheme-progress-types";
import { loadSchemeEntitlements } from "@/lib/accounts/scheme-entitlement-demo";

function inPeriod(date: string, start: string, end: string): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

function invoiceIsActive(inv: InvoiceRecord): boolean {
  return inv.invoiceStatus !== "cancelled";
}

function invoiceTaxable(inv: InvoiceRecord): number {
  return Math.max(0, (inv.subtotal || 0) - (inv.discountTotal || 0));
}

function isExcludedFromTurnover(inv: InvoiceRecord): { excluded: boolean; reason: string } {
  if (inv.productDiscountTurnoverEligible === false) {
    return {
      excluded: true,
      reason:
        inv.productDiscountExclusionReason?.trim() ||
        "Product discount — excluded from turnover",
    };
  }
  const lineScheme = inv.lineItems.find(
    (l) =>
      l.schemeApplied === "Yes" ||
      Boolean(l.schemeCode?.trim()) ||
      Boolean(l.schemeName?.trim()),
  );
  if (lineScheme && /monsoon|product discount|festive/i.test(
    `${lineScheme.schemeName || ""} ${lineScheme.schemeCode || ""}`,
  )) {
    return {
      excluded: true,
      reason: `${lineScheme.schemeName || lineScheme.schemeCode} — excluded`,
    };
  }
  if (inv.invoiceStatus === "cancelled") {
    return { excluded: true, reason: "Cancelled Invoice" };
  }
  return { excluded: false, reason: "" };
}

function resolveSlabs(
  slabs: TurnoverSlab[],
  eligible: number,
): {
  views: SchemeProgressSlabView[];
  currentLabel: string;
  nextLabel: string;
  gap: number;
  rate: number;
  achievementPct: number;
} {
  const sorted = [...slabs].sort((a, b) => a.fromTurnover - b.fromTurnover);
  if (sorted.length === 0) {
    return {
      views: [],
      currentLabel: "—",
      nextLabel: "—",
      gap: 0,
      rate: 0,
      achievementPct: 0,
    };
  }

  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const upper = s.toTurnover ?? Number.POSITIVE_INFINITY;
    if (eligible >= s.fromTurnover && eligible < upper) {
      currentIdx = i;
      break;
    }
    if (s.toTurnover == null && eligible >= s.fromTurnover) {
      currentIdx = i;
      break;
    }
  }
  /** Below first slab — treat first as upcoming current target */
  if (currentIdx < 0 && eligible < sorted[0].fromTurnover) {
    currentIdx = -1;
  } else if (currentIdx < 0) {
    currentIdx = sorted.length - 1;
  }

  const views: SchemeProgressSlabView[] = sorted.map((s, i) => {
    const label = formatSlabRange(s.fromTurnover, s.toTurnover);
    if (currentIdx < 0) {
      return {
        fromTurnover: s.fromTurnover,
        toTurnover: s.toTurnover,
        benefitPercent: s.benefitPercent,
        label,
        state: i === 0 ? "current" : "upcoming",
        progressAmount: i === 0 ? eligible : undefined,
        needAmount: i === 0 ? Math.max(0, s.fromTurnover - eligible) : undefined,
      };
    }
    if (i < currentIdx) {
      return {
        fromTurnover: s.fromTurnover,
        toTurnover: s.toTurnover,
        benefitPercent: s.benefitPercent,
        label,
        state: "completed",
      };
    }
    if (i === currentIdx) {
      const ceiling = s.toTurnover;
      const need =
        ceiling != null ? Math.max(0, ceiling - eligible) : 0;
      return {
        fromTurnover: s.fromTurnover,
        toTurnover: s.toTurnover,
        benefitPercent: s.benefitPercent,
        label,
        state: "current",
        progressAmount: eligible,
        needAmount: ceiling != null ? need : undefined,
      };
    }
    return {
      fromTurnover: s.fromTurnover,
      toTurnover: s.toTurnover,
      benefitPercent: s.benefitPercent,
      label,
      state: "upcoming",
    };
  });

  const current =
    currentIdx >= 0
      ? sorted[currentIdx]
      : null;
  const next =
    currentIdx < 0
      ? sorted[0]
      : currentIdx + 1 < sorted.length
        ? sorted[currentIdx + 1]
        : null;

  const currentLabel = current
    ? formatSlabRange(current.fromTurnover, current.toTurnover)
    : eligible < sorted[0].fromTurnover
      ? "Below first slab"
      : "—";
  const nextLabel = next
    ? formatSlabRange(next.fromTurnover, next.toTurnover)
    : "Top slab achieved";
  const gap = next
    ? Math.max(0, next.fromTurnover - eligible)
    : current?.toTurnover != null
      ? Math.max(0, current.toTurnover - eligible)
      : 0;
  const rate = current?.benefitPercent ?? 0;
  const top = sorted[sorted.length - 1];
  const target = top.toTurnover ?? top.fromTurnover;
  const achievementPct =
    target > 0 ? Math.min(100, Math.round((eligible / target) * 1000) / 10) : 0;

  return {
    views,
    currentLabel,
    nextLabel,
    gap,
    rate,
    achievementPct,
  };
}

function periodReference(start: string, end: string, turnoverPeriod?: string): string {
  if (turnoverPeriod === "Yearly" || turnoverPeriod === "Annual") {
    const y = Number(start.slice(0, 4));
    if (start.slice(5, 7) === "04") return `FY ${y}-${String(y + 1).slice(2)}`;
  }
  return `${start} – ${end}`;
}

function financialYearOf(start: string): string {
  const y = Number(start.slice(0, 4));
  const m = Number(start.slice(5, 7));
  if (m >= 4) return `FY ${y}-${String(y + 1).slice(2)}`;
  return `FY ${y - 1}-${String(y).slice(2)}`;
}

function resolveStatus(opts: {
  schemeStatus: string;
  periodEnd: string;
  eligible: number;
  topSlabFrom: number;
  settlementHint: SchemeProgressSettlementHint;
}): SchemeProgressStatus {
  if (opts.schemeStatus === "inactive" || opts.schemeStatus === "cancelled") {
    return "Cancelled";
  }
  if (opts.settlementHint === "settlement_generated") return "Settled";
  const today = new Date().toISOString().slice(0, 10);
  if (opts.periodEnd < today) return "Expired";
  if (opts.eligible >= opts.topSlabFrom && opts.topSlabFrom > 0) {
    return "Target Achieved";
  }
  return "Running";
}

function readSettlementHint(
  schemeCode: string,
  customerName: string,
): SchemeProgressSettlementHint {
  try {
    const list = loadSchemeEntitlements();
    const hit = list.find(
      (e) =>
        e.schemeCode === schemeCode && e.customerName === customerName,
    );
    const byCustomer = list.find(
      (e) =>
        e.customerName === customerName &&
        (/turnover|annual/i.test(e.schemeCode) ||
          /turnover|annual/i.test(e.schemeName)),
    );
    const ent = hit || (schemeCode.includes("ANNUAL") || schemeCode.includes("TO")
      ? byCustomer
      : undefined);
    if (!ent) return "none";
    if (ent.status === "Credit Note Generated") return "settlement_generated";
    if (
      ent.status === "Pending Review" ||
      ent.status === "Approved" ||
      ent.status === "Sent Back"
    ) {
      return "pending_settlement";
    }
    return "none";
  } catch {
    return "none";
  }
}

function customerMatchesScheme(customer: Customer, scheme: SchemeRecord): boolean {
  const ids = scheme.customerIds ?? [];
  if (ids.length > 0) {
    return ids.includes(customer.customerCode) || ids.includes(String(customer.id));
  }
  if (scheme.customerType && scheme.customerType !== "All") {
    const ct = (customer.customerType || "").toLowerCase();
    const st = scheme.customerType.toLowerCase();
    if (ct && st && !ct.includes(st) && !st.includes(ct)) return false;
  }
  return true;
}

function buildRowForPair(
  scheme: SchemeRecord,
  customer: Customer,
  invoices: InvoiceRecord[],
  returns: SalesReturnRecord[],
): SchemeProgressRow | null {
  if (!isTurnoverRecord(scheme)) return null;
  if (!scheme.startDate || !scheme.endDate) return null;
  if (!customerMatchesScheme(customer, scheme)) return null;

  const start = scheme.startDate;
  const end = scheme.endDate;
  const custInvoices = invoices.filter(
    (inv) =>
      invoiceIsActive(inv) &&
      inPeriod(inv.invoiceDate, start, end) &&
      (inv.customerId === customer.id ||
        inv.customerName === customer.customerName),
  );

  let currentTurnover = 0;
  let excludedTurnover = 0;
  const invoiceRows: SchemeProgressInvoiceRow[] = [];
  const exclusionRows: SchemeProgressExclusionRow[] = [];

  for (const inv of custInvoices) {
    const taxable = invoiceTaxable(inv);
    const { excluded, reason } = isExcludedFromTurnover(inv);
    currentTurnover += taxable;
    if (excluded) {
      excludedTurnover += taxable;
      exclusionRows.push({
        invoiceNo: inv.invoiceNo,
        reason,
        excludedAmount: taxable,
      });
    }
    const retAmt = returns
      .filter(
        (r) =>
          r.status === "approved" &&
          inPeriod(r.returnDate, start, end) &&
          (r.sourceInvoiceNo === inv.invoiceNo ||
            r.sourceInvoiceId === inv.id ||
            ((r.customer === customer.customerName ||
              r.salesOrderNumber === inv.salesOrderNo) &&
              !r.sourceInvoiceNo)),
      )
      .reduce((s, r) => s + getReturnTotalAmount(r), 0);

    invoiceRows.push({
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      invoiceAmount: inv.grandTotal,
      taxableValue: taxable,
      salesReturnAmount: retAmt,
      eligible: !excluded,
      excluded,
      reason: excluded ? reason : "",
      schemeApplied:
        inv.lineItems.find((l) => l.schemeName)?.schemeName ||
        inv.lineItems.find((l) => l.schemeCode)?.schemeCode ||
        "—",
      status: inv.invoiceStatus,
    });
  }

  const custReturns = returns.filter(
    (r) =>
      r.status === "approved" &&
      inPeriod(r.returnDate, start, end) &&
      r.customer === customer.customerName,
  );
  const salesReturnAmount = custReturns.reduce(
    (s, r) => s + getReturnTotalAmount(r),
    0,
  );
  const returnRows: SchemeProgressReturnRow[] = custReturns.map((r) => ({
    returnId: r.id,
    invoiceNo: r.sourceInvoiceNo || r.salesOrderNumber || "—",
    returnedQty: r.products.map(formatProductReturnQuantity).join(", ") || "—",
    returnAmount: getReturnTotalAmount(r),
    returnDate: r.returnDate,
    adjustedTurnover: getReturnTotalAmount(r),
  }));

  const eligibleTurnover = Math.max(
    0,
    currentTurnover - excludedTurnover - salesReturnAmount,
  );

  const slabs = scheme.turnoverSlabs ?? [];
  const slabInfo = resolveSlabs(slabs, eligibleTurnover);
  const projectedCreditNote =
    Math.round(eligibleTurnover * (slabInfo.rate / 100) * 100) / 100;

  const settlementHint = readSettlementHint(scheme.schemeCode, customer.customerName);
  const topFrom = slabs.length
    ? Math.max(...slabs.map((s) => s.fromTurnover))
    : 0;
  const status = resolveStatus({
    schemeStatus: scheme.status,
    periodEnd: end,
    eligible: eligibleTurnover,
    topSlabFrom: topFrom,
    settlementHint,
  });

  /** Skip empty pairs unless scheme explicitly lists this customer */
  const listed =
    (scheme.customerIds?.length ?? 0) > 0 &&
    customerMatchesScheme(customer, scheme);
  if (custInvoices.length === 0 && !listed) return null;

  return {
    id: `${scheme.schemeCode}__${customer.id}__${start}`,
    customerId: customer.id,
    customerName: customer.customerName,
    customerCode: customer.customerCode,
    customerType: customer.customerType || "",
    schemeId: String(scheme.id),
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    schemeType: scheme.schemeType,
    periodStart: start,
    periodEnd: end,
    periodReference: periodReference(start, end, scheme.turnoverPeriod),
    salesperson: customer.salesManName || "",
    territory: customer.territoryName || "",
    region: customer.stateName || "",
    financialYear: financialYearOf(start),
    invoiceCount: invoiceRows.filter((i) => i.eligible).length,
    currentTurnover,
    excludedTurnover,
    salesReturnAmount,
    eligibleTurnover,
    currentSlabLabel: slabInfo.currentLabel,
    nextSlabLabel: slabInfo.nextLabel,
    gapToNextSlab: slabInfo.gap,
    currentRate: slabInfo.rate,
    projectedCreditNote,
    achievementPct: slabInfo.achievementPct,
    status,
    settlementHint,
    slabs: slabInfo.views,
    invoices: invoiceRows,
    returns: returnRows,
    exclusions: exclusionRows,
  };
}

/** Demo rows so the dashboard is usable when live invoice volume is low. */
function buildDemoProgressRows(customers: Customer[]): SchemeProgressRow[] {
  const abc =
    customers.find((c) => /abc agro/i.test(c.customerName)) ||
    customers[0];
  const kisan =
    customers.find((c) => /kisan/i.test(c.customerName)) ||
    customers[1] ||
    abc;
  const green =
    customers.find((c) => /green|reliance|mahindra/i.test(c.customerName)) ||
    customers[2] ||
    abc;

  const slabsAnnual: TurnoverSlab[] = [
    { fromTurnover: 0, toTurnover: 10000000, benefitPercent: 1 },
    { fromTurnover: 10000000, toTurnover: 20000000, benefitPercent: 2 },
    { fromTurnover: 20000000, toTurnover: 30000000, benefitPercent: 2.5 },
  ];

  function demoRow(
    customer: Customer,
    eligible: number,
    excluded: number,
    returns: number,
    status: SchemeProgressStatus,
    settlementHint: SchemeProgressSettlementHint,
  ): SchemeProgressRow {
    const current = eligible + excluded + returns;
    const slabInfo = resolveSlabs(slabsAnnual, eligible);
    const projected =
      Math.round(eligible * (slabInfo.rate / 100) * 100) / 100;
    const settlement =
      settlementHint !== "none"
        ? settlementHint
        : readSettlementHint("SCH-TO-ANNUAL-2", customer.customerName);
    return {
      id: `demo-annual__${customer.id}__2026-04-01`,
      customerId: customer.id,
      customerName: customer.customerName,
      customerCode: customer.customerCode,
      customerType: customer.customerType || "Distributor",
      schemeId: "demo-annual",
      schemeCode: "SCH-TO-ANNUAL-2",
      schemeName: "Annual Turnover Discount",
      schemeType: "Turnover Discount Scheme",
      periodStart: "2026-04-01",
      periodEnd: "2027-03-31",
      periodReference: "FY 2026-27",
      salesperson: customer.salesManName || "Rajesh Kumar",
      territory: customer.territoryName || "West Zone",
      region: customer.stateName || "Maharashtra",
      financialYear: "FY 2026-27",
      invoiceCount: 2,
      currentTurnover: current,
      excludedTurnover: excluded,
      salesReturnAmount: returns,
      eligibleTurnover: eligible,
      currentSlabLabel: slabInfo.currentLabel,
      nextSlabLabel: slabInfo.nextLabel,
      gapToNextSlab: slabInfo.gap,
      currentRate: slabInfo.rate,
      projectedCreditNote: projected,
      achievementPct: slabInfo.achievementPct,
      status:
        settlement === "settlement_generated"
          ? "Settled"
          : status,
      settlementHint: settlement,
      slabs: slabInfo.views,
      invoices: [
        {
          invoiceId: 201,
          invoiceNo: "PVB/SO/26-27/0001",
          invoiceDate: "2026-06-15",
          invoiceAmount: 8500000,
          taxableValue: 8500000,
          salesReturnAmount: 0,
          eligible: true,
          excluded: false,
          reason: "",
          schemeApplied: "—",
          status: "sent",
        },
        {
          invoiceId: 202,
          invoiceNo: "PVB/SO/26-27/0042",
          invoiceDate: "2026-09-10",
          invoiceAmount: 8000000,
          taxableValue: 8000000,
          salesReturnAmount: 0,
          eligible: true,
          excluded: false,
          reason: "",
          schemeApplied: "—",
          status: "sent",
        },
        {
          invoiceId: 101,
          invoiceNo: "PVB/SO/26-27/0101",
          invoiceDate: "2026-07-20",
          invoiceAmount: 3000000,
          taxableValue: 3000000,
          salesReturnAmount: 0,
          eligible: false,
          excluded: true,
          reason: "Monsoon Offer — excluded from Annual Turnover",
          schemeApplied: "Monsoon Product Offer",
          status: "sent",
        },
      ],
      returns:
        returns > 0
          ? [
              {
                returnId: `demo-sr-${customer.id}`,
                invoiceNo: "PVB/SO/26-27/0001",
                returnedQty: "10 Bags",
                returnAmount: returns,
                returnDate: "2026-11-02",
                adjustedTurnover: returns,
              },
            ]
          : [],
      exclusions:
        excluded > 0
          ? [
              {
                invoiceNo: "PVB/SO/26-27/0101",
                reason: "Monsoon Offer — Product Discount Excluded",
                excludedAmount: excluded,
              },
            ]
          : [],
    };
  }

  return [
    demoRow(abc, 17200000, 3000000, 500000, "Running", "none"),
    demoRow(kisan, 9500000, 200000, 0, "Running", "none"),
    demoRow(green, 21000000, 0, 0, "Target Achieved", "none"),
  ].map((r, i) => ({
    ...r,
    id: `demo-annual__${r.customerId}__2026-04-01__${i}`,
    invoiceCount: r.invoices.filter((x) => x.eligible).length,
  }));
}

export function loadSchemeProgressRows(): SchemeProgressRow[] {
  const schemes = loadConsolidatedSchemeRecords().filter(isTurnoverRecord);
  const customers = loadCustomers().filter((c) => c.status === "active");
  const invoices = loadInvoices();
  const returns = getSalesReturnRecords();

  const live: SchemeProgressRow[] = [];
  for (const scheme of schemes) {
    if (scheme.approvalStatus === "draft") continue;
    for (const customer of customers) {
      const row = buildRowForPair(scheme, customer, invoices, returns);
      if (row) live.push(row);
    }
  }

  const demo = buildDemoProgressRows(customers);
  /** Prefer live rows; append demo when no annual demo collision */
  const liveIds = new Set(live.map((r) => `${r.schemeCode}__${r.customerId}`));
  for (const d of demo) {
    const key = `${d.schemeCode}__${d.customerId}`;
    if (!liveIds.has(key)) live.push(d);
  }

  return live.sort((a, b) =>
    a.customerName.localeCompare(b.customerName) ||
    a.schemeName.localeCompare(b.schemeName),
  );
}

export function getSchemeProgressById(id: string): SchemeProgressRow | null {
  return loadSchemeProgressRows().find((r) => r.id === id) ?? null;
}

export function listSchemeProgressFilterOptions(rows: SchemeProgressRow[]) {
  return {
    financialYears: [...new Set(rows.map((r) => r.financialYear))].sort(),
    schemes: [...new Set(rows.map((r) => r.schemeName))].sort(),
    customers: [...new Set(rows.map((r) => r.customerName))].sort(),
    salespersons: [...new Set(rows.map((r) => r.salesperson).filter(Boolean))].sort(),
    territories: [...new Set(rows.map((r) => r.territory).filter(Boolean))].sort(),
    regions: [...new Set(rows.map((r) => r.region).filter(Boolean))].sort(),
    statuses: [
      "Running",
      "Target Achieved",
      "Settled",
      "Expired",
      "Cancelled",
    ] as SchemeProgressStatus[],
    customerTypes: [...new Set(rows.map((r) => r.customerType).filter(Boolean))].sort(),
  };
}

export function exportSchemeProgressCsv(rows: SchemeProgressRow[]): string {
  const headers = [
    "Customer",
    "Customer Code",
    "Scheme Name",
    "Scheme Type",
    "Scheme Period",
    "Invoice Count",
    "Current Turnover",
    "Excluded Turnover",
    "Eligible Turnover",
    "Current Slab",
    "Next Slab",
    "Gap to Next Slab",
    "Projected Credit Note",
    "Status",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.customerName,
        r.customerCode,
        r.schemeName,
        r.schemeType,
        r.periodReference,
        r.invoiceCount,
        r.currentTurnover,
        r.excludedTurnover,
        r.eligibleTurnover,
        r.currentSlabLabel,
        r.nextSlabLabel,
        r.gapToNextSlab,
        r.projectedCreditNote,
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
  }
  return lines.join("\n");
}

export { formatProgressMoney, formatSlabRange, formatSchemeRupee };
