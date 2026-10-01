/**
 * Annual GST Summary — assemble cards, monthly rows, outward/inward annual totals.
 */

import { resolveFinancialYearLabel } from "@/lib/accounts/gst-report-filters";
import { buildAnnualGstDemoMonths } from "./annual-gst-summary-demo";
import type {
  AnnualGstMonthRow,
  AnnualGstParticularRow,
  AnnualGstReport,
  AnnualGstSummaryCards,
} from "./annual-gst-summary-types";

const r = (n: number) => Math.round(n * 100) / 100;

function sumMonths(months: AnnualGstMonthRow[]) {
  return months.reduce(
    (acc, m) => {
      acc.sales += m.salesValue;
      acc.purchase += m.purchaseValue;
      acc.outCgst += m.outputCgst;
      acc.outSgst += m.outputSgst;
      acc.outIgst += m.outputIgst;
      acc.inCgst += m.inputCgst;
      acc.inSgst += m.inputSgst;
      acc.inIgst += m.inputIgst;
      acc.net += m.netGst;
      return acc;
    },
    {
      sales: 0,
      purchase: 0,
      outCgst: 0,
      outSgst: 0,
      outIgst: 0,
      inCgst: 0,
      inSgst: 0,
      inIgst: 0,
      net: 0,
    },
  );
}

function aggregateBuckets(
  months: AnnualGstMonthRow[],
  side: "outward" | "inward",
  order: string[],
): AnnualGstParticularRow[] {
  const map = new Map<string, { taxable: number; gst: number }>();
  for (const name of order) map.set(name, { taxable: 0, gst: 0 });

  for (const m of months) {
    for (const b of m[side]) {
      const cur = map.get(b.particular) ?? { taxable: 0, gst: 0 };
      cur.taxable += b.taxableValue;
      cur.gst += b.gstAmount;
      map.set(b.particular, cur);
    }
  }

  const rows: AnnualGstParticularRow[] = order.map((particular) => {
    const cur = map.get(particular) ?? { taxable: 0, gst: 0 };
    return {
      particular,
      taxableValue: r(cur.taxable),
      gstAmount: r(cur.gst),
    };
  });

  const totalT = r(rows.reduce((s, x) => s + x.taxableValue, 0));
  const totalG = r(rows.reduce((s, x) => s + x.gstAmount, 0));
  rows.push({
    particular: "Grand Total",
    taxableValue: totalT,
    gstAmount: totalG,
    isTotal: true,
  });
  return rows;
}

function creditDebitTotals(months: AnnualGstMonthRow[]) {
  let cn = 0;
  let dn = 0;
  for (const m of months) {
    for (const b of m.outward) {
      if (b.particular === "Credit Notes") cn += b.taxableValue;
      if (b.particular === "Debit Notes") dn += b.taxableValue;
    }
    for (const b of m.inward) {
      if (b.particular === "Supplier Credit Notes") cn += b.taxableValue;
      if (b.particular === "Supplier Debit Notes") dn += b.taxableValue;
    }
  }
  return { cn: r(cn), dn: r(dn) };
}

export function buildAnnualGstSummaryReport(financialYearId: string): AnnualGstReport {
  const months = buildAnnualGstDemoMonths();
  const totals = sumMonths(months);
  const outputGst = r(totals.outCgst + totals.outSgst + totals.outIgst);
  const inputGst = r(totals.inCgst + totals.inSgst + totals.inIgst);
  const netGst = r(outputGst - inputGst);
  const isRefundable = netGst < 0;
  const { cn, dn } = creditDebitTotals(months);

  const summary: AnnualGstSummaryCards = {
    totalTaxableOutward: r(totals.sales),
    totalTaxableInward: r(totals.purchase),
    totalOutputGst: outputGst,
    totalInputGst: inputGst,
    netGstPayableOrRefundable: Math.abs(netGst),
    isRefundable,
    totalCreditNotes: cn,
    totalDebitNotes: dn,
    totalGstLiability: Math.max(0, netGst),
  };

  const outwardBase = aggregateBuckets(months, "outward", [
    "B2B Sales",
    "B2C Sales",
    "Export",
    "SEZ",
    "Credit Notes",
    "Debit Notes",
  ]).filter((x) => !x.isTotal);

  const outwardRename: Record<string, string> = {
    "B2B Sales": "B2B",
    "B2C Sales": "B2C",
  };

  // Exempt / Nil Rated — annual-only lines (GSTR-9), not in monthly taxable sales
  const outwardAnnual: AnnualGstParticularRow[] = [
    ...outwardBase.slice(0, 4).map((row) => ({
      ...row,
      particular: outwardRename[row.particular] ?? row.particular,
    })),
    { particular: "Exempt", taxableValue: 1_85_000, gstAmount: 0 },
    { particular: "Nil Rated", taxableValue: 2_40_000, gstAmount: 0 },
    ...outwardBase.slice(4).map((row) => ({
      ...row,
      particular: outwardRename[row.particular] ?? row.particular,
    })),
  ];
  const outT = r(outwardAnnual.reduce((s, x) => s + x.taxableValue, 0));
  const outG = r(outwardAnnual.reduce((s, x) => s + x.gstAmount, 0));
  outwardAnnual.push({
    particular: "Grand Total",
    taxableValue: outT,
    gstAmount: outG,
    isTotal: true,
  });

  const inwardAnnual = aggregateBuckets(months, "inward", [
    "Purchase of Goods",
    "Purchase of Services",
    "Capital Goods",
    "Imports",
    "Supplier Credit Notes",
    "Supplier Debit Notes",
  ]).map((row) =>
    row.particular === "Purchase of Goods"
      ? { ...row, particular: "Goods" }
      : row.particular === "Purchase of Services"
        ? { ...row, particular: "Services" }
        : row,
  );

  return {
    months,
    summary,
    outwardAnnual,
    inwardAnnual,
    outputGst,
    inputGst,
    netGst,
    isRefundable,
    financialYearLabel: resolveFinancialYearLabel(financialYearId),
  };
}

export function findAnnualMonth(
  report: AnnualGstReport,
  monthId: string,
): AnnualGstMonthRow | null {
  return report.months.find((m) => m.id === monthId) ?? null;
}
