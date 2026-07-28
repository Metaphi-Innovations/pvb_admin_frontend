/**
 * Annual GST Summary — realistic FY demo (Apr–Mar), monthly totals roll up to annual.
 */

import type { AnnualGstMonthRow } from "./annual-gst-summary-types";

const r = (n: number) => Math.round(n * 100) / 100;

type MonthSeed = {
  key: string;
  label: string;
  sales: number;
  purchase: number;
  /** output GST split: intra vs inter (IGST share of output) */
  outputIgstShare: number;
  /** input GST split */
  inputIgstShare: number;
  factor: number;
};

/** Seasonal factors — relative weights (sum ≈ 12). */
const MONTH_SEEDS: MonthSeed[] = [
  { key: "2025-04", label: "Apr 2025", sales: 48_50_000, purchase: 32_20_000, outputIgstShare: 0.28, inputIgstShare: 0.22, factor: 0.92 },
  { key: "2025-05", label: "May 2025", sales: 51_20_000, purchase: 34_80_000, outputIgstShare: 0.3, inputIgstShare: 0.24, factor: 0.98 },
  { key: "2025-06", label: "Jun 2025", sales: 55_80_000, purchase: 36_40_000, outputIgstShare: 0.32, inputIgstShare: 0.25, factor: 1.05 },
  { key: "2025-07", label: "Jul 2025", sales: 52_40_000, purchase: 35_10_000, outputIgstShare: 0.29, inputIgstShare: 0.23, factor: 1.0 },
  { key: "2025-08", label: "Aug 2025", sales: 49_10_000, purchase: 33_50_000, outputIgstShare: 0.27, inputIgstShare: 0.21, factor: 0.95 },
  { key: "2025-09", label: "Sep 2025", sales: 58_60_000, purchase: 38_20_000, outputIgstShare: 0.34, inputIgstShare: 0.26, factor: 1.1 },
  { key: "2025-10", label: "Oct 2025", sales: 61_20_000, purchase: 40_80_000, outputIgstShare: 0.35, inputIgstShare: 0.27, factor: 1.15 },
  { key: "2025-11", label: "Nov 2025", sales: 64_50_000, purchase: 42_60_000, outputIgstShare: 0.36, inputIgstShare: 0.28, factor: 1.2 },
  { key: "2025-12", label: "Dec 2025", sales: 68_80_000, purchase: 44_20_000, outputIgstShare: 0.38, inputIgstShare: 0.3, factor: 1.25 },
  { key: "2026-01", label: "Jan 2026", sales: 56_40_000, purchase: 37_90_000, outputIgstShare: 0.31, inputIgstShare: 0.24, factor: 1.05 },
  { key: "2026-02", label: "Feb 2026", sales: 53_20_000, purchase: 35_60_000, outputIgstShare: 0.3, inputIgstShare: 0.23, factor: 1.0 },
  { key: "2026-03", label: "Mar 2026", sales: 59_70_000, purchase: 39_40_000, outputIgstShare: 0.33, inputIgstShare: 0.25, factor: 1.12 },
];

const OUTPUT_RATE = 0.18;
const INPUT_RATE = 0.18;

function buildOutward(
  sales: number,
  outputGst: number,
): AnnualGstMonthRow["outward"] {
  const b2bT = r(sales * 0.58);
  const b2cT = r(sales * 0.22);
  const exportT = r(sales * 0.08);
  const sezT = r(sales * 0.05);
  const cnT = r(sales * 0.04);
  const dnT = r(sales * 0.03);
  // Normalize slight rounding so sums match sales
  const sumT = b2bT + b2cT + exportT + sezT + cnT + dnT;
  const adj = r(sales - sumT);

  const b2bG = r(outputGst * 0.58);
  const b2cG = r(outputGst * 0.22);
  const exportG = r(outputGst * 0.05);
  const sezG = r(outputGst * 0.06);
  const cnG = r(outputGst * 0.05);
  const dnG = r(outputGst * 0.04);
  const sumG = b2bG + b2cG + exportG + sezG + cnG + dnG;
  const adjG = r(outputGst - sumG);

  return [
    { particular: "B2B Sales", taxableValue: r(b2bT + adj), gstAmount: r(b2bG + adjG) },
    { particular: "B2C Sales", taxableValue: b2cT, gstAmount: b2cG },
    { particular: "Export", taxableValue: exportT, gstAmount: exportG },
    { particular: "SEZ", taxableValue: sezT, gstAmount: sezG },
    { particular: "Credit Notes", taxableValue: cnT, gstAmount: cnG },
    { particular: "Debit Notes", taxableValue: dnT, gstAmount: dnG },
  ];
}

function buildInward(
  purchase: number,
  inputGst: number,
): AnnualGstMonthRow["inward"] {
  const goodsT = r(purchase * 0.55);
  const servicesT = r(purchase * 0.2);
  const capitalT = r(purchase * 0.1);
  const importsT = r(purchase * 0.08);
  const cnT = r(purchase * 0.04);
  const dnT = r(purchase * 0.03);
  const sumT = goodsT + servicesT + capitalT + importsT + cnT + dnT;
  const adj = r(purchase - sumT);

  const goodsG = r(inputGst * 0.55);
  const servicesG = r(inputGst * 0.2);
  const capitalG = r(inputGst * 0.1);
  const importsG = r(inputGst * 0.08);
  const cnG = r(inputGst * 0.04);
  const dnG = r(inputGst * 0.03);
  const sumG = goodsG + servicesG + capitalG + importsG + cnG + dnG;
  const adjG = r(inputGst - sumG);

  return [
    {
      particular: "Purchase of Goods",
      taxableValue: r(goodsT + adj),
      gstAmount: r(goodsG + adjG),
    },
    { particular: "Purchase of Services", taxableValue: servicesT, gstAmount: servicesG },
    { particular: "Capital Goods", taxableValue: capitalT, gstAmount: capitalG },
    { particular: "Imports", taxableValue: importsT, gstAmount: importsG },
    { particular: "Supplier Credit Notes", taxableValue: cnT, gstAmount: cnG },
    { particular: "Supplier Debit Notes", taxableValue: dnT, gstAmount: dnG },
  ];
}

export function buildAnnualGstDemoMonths(): AnnualGstMonthRow[] {
  return MONTH_SEEDS.map((m) => {
    const salesValue = r(m.sales);
    const purchaseValue = r(m.purchase);
    const outputGst = r(salesValue * OUTPUT_RATE);
    const inputGst = r(purchaseValue * INPUT_RATE);

    const outputIgst = r(outputGst * m.outputIgstShare);
    const outputIntra = r(outputGst - outputIgst);
    const outputCgst = r(outputIntra / 2);
    const outputSgst = r(outputIntra - outputCgst);

    const inputIgst = r(inputGst * m.inputIgstShare);
    const inputIntra = r(inputGst - inputIgst);
    const inputCgst = r(inputIntra / 2);
    const inputSgst = r(inputIntra - inputCgst);

    const netGst = r(
      outputCgst + outputSgst + outputIgst - (inputCgst + inputSgst + inputIgst),
    );

    return {
      id: `month-${m.key}`,
      monthKey: m.key,
      monthLabel: m.label,
      salesValue,
      purchaseValue,
      outputCgst,
      outputSgst,
      outputIgst,
      inputCgst,
      inputSgst,
      inputIgst,
      netGst,
      outward: buildOutward(salesValue, outputGst),
      inward: buildInward(purchaseValue, inputGst),
    };
  });
}
