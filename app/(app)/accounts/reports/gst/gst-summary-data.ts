import { roundMoney } from "@/lib/accounts/money-format";
import {
  buildPurchaseRegisterRows,
  buildSalesRegisterRows,
} from "../register-shared/register-live-data";

export type GstCategory = "output" | "input" | "rcm";

export type GstSummaryRowKind = "section" | "data" | "total" | "net";

export interface GstSummaryAmounts {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalInvoiceValue: number;
}

export interface GstSummaryLine {
  id: string;
  kind: GstSummaryRowKind;
  label: string;
  category?: GstCategory;
  rate?: number;
  amounts?: GstSummaryAmounts;
}

export type GstTypeFilter = "all" | "output" | "input" | "rcm";
export type GstRateFilter = "all" | "5" | "12" | "18" | "28";

export interface GstSummaryFilters {
  gstType: GstTypeFilter;
  gstRate: GstRateFilter;
  search: string;
}

export interface GstSummaryTotals {
  totalOutputGst: number;
  totalInputGst: number;
  netGstPayable: number;
}

const GST_RATES = [5, 12, 18, 28] as const;

type GstRateBucket = Record<number, { taxableValue: number; gstAmount: number }>;

function addToGstBucket(
  buckets: GstRateBucket,
  rate: number,
  taxableValue: number,
  gstAmount: number,
) {
  if (gstAmount <= 0 && taxableValue <= 0) return;
  if (!buckets[rate]) buckets[rate] = { taxableValue: 0, gstAmount: 0 };
  buckets[rate].taxableValue = roundMoney(buckets[rate].taxableValue + taxableValue);
  buckets[rate].gstAmount = roundMoney(buckets[rate].gstAmount + gstAmount);
}

function bucketToGstLine(
  category: "output" | "input",
  rate: number,
  bucket: { taxableValue: number; gstAmount: number },
): Omit<GstSummaryLine, "id" | "kind"> {
  const halfGst = roundMoney(bucket.gstAmount / 2);
  return {
    label: `${category === "output" ? "Output" : "Input"} GST @ ${rate}%`,
    category,
    rate,
    amounts: {
      taxableValue: bucket.taxableValue,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      totalGst: bucket.gstAmount,
      totalInvoiceValue: roundMoney(bucket.taxableValue + bucket.gstAmount),
    },
  };
}

function buildLiveGstDataRows(): Omit<GstSummaryLine, "id" | "kind">[] {
  const outputBuckets: GstRateBucket = {};
  const inputBuckets: GstRateBucket = {};

  for (const row of buildSalesRegisterRows()) {
    if (row.invoiceStatus === "cancelled" || row.invoiceStatus === "draft") continue;
    addToGstBucket(outputBuckets, row.gstRate, row.taxableValue, row.gstAmount);
  }

  for (const row of buildPurchaseRegisterRows()) {
    if (row.invoiceStatus === "cancelled" || row.invoiceStatus === "draft") continue;
    addToGstBucket(inputBuckets, row.gstRate, row.taxableValue, row.gstAmount);
  }

  const rows: Omit<GstSummaryLine, "id" | "kind">[] = [];
  for (const rate of GST_RATES) {
    const out = outputBuckets[rate];
    if (out && out.gstAmount > 0) rows.push(bucketToGstLine("output", rate, out));
    const input = inputBuckets[rate];
    if (input && input.gstAmount > 0) rows.push(bucketToGstLine("input", rate, input));
  }
  return rows;
}

const STATIC_GST_FALLBACK: Omit<GstSummaryLine, "id" | "kind">[] = [
  { label: "Output GST @ 5%", category: "output", rate: 5, amounts: { taxableValue: 250000, cgst: 6250, sgst: 6250, igst: 0, totalGst: 12500, totalInvoiceValue: 262500 } },
  { label: "Output GST @ 12%", category: "output", rate: 12, amounts: { taxableValue: 480000, cgst: 28800, sgst: 28800, igst: 0, totalGst: 57600, totalInvoiceValue: 537600 } },
  { label: "Output GST @ 18%", category: "output", rate: 18, amounts: { taxableValue: 820000, cgst: 73800, sgst: 73800, igst: 0, totalGst: 147600, totalInvoiceValue: 967600 } },
  { label: "Input GST @ 18%", category: "input", rate: 18, amounts: { taxableValue: 540000, cgst: 48600, sgst: 48600, igst: 0, totalGst: 97200, totalInvoiceValue: 637200 } },
];

function getGstDataRows(): Omit<GstSummaryLine, "id" | "kind">[] {
  if (typeof window === "undefined") return STATIC_GST_FALLBACK;
  const live = buildLiveGstDataRows();
  return live.length > 0 ? live : STATIC_GST_FALLBACK;
}

function sumGst(rows: GstSummaryLine[], category: GstCategory): number {
  return rows
    .filter((r) => r.kind === "data" && r.category === category)
    .reduce((acc, r) => acc + (r.amounts?.totalGst ?? 0), 0);
}

function buildFullStatement(): GstSummaryLine[] {
  const GST_DATA_ROWS = getGstDataRows();
  const dataLines: GstSummaryLine[] = [
    { id: "sec-output", kind: "section", label: "Output GST" },
    ...GST_DATA_ROWS.filter((r) => r.category === "output").map((r, i) => ({
      id: `out-${i}`,
      kind: "data" as const,
      ...r,
    })),
    { id: "sec-input", kind: "section", label: "Input GST" },
    ...GST_DATA_ROWS.filter((r) => r.category === "input").map((r, i) => ({
      id: `in-${i}`,
      kind: "data" as const,
      ...r,
    })),
  ];

  const dataOnly = dataLines.filter((l) => l.kind === "data");
  const totalOutput = sumGst(dataOnly, "output");
  const totalInput = sumGst(dataOnly, "input");
  const netGst = totalOutput - totalInput;

  return [
    ...dataLines,
    { id: "sec-net", kind: "section", label: "Net GST Payable / Receivable" },
    {
      id: "total-output",
      kind: "total",
      label: "Total Output GST",
      amounts: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalGst: totalOutput, totalInvoiceValue: 0 },
    },
    {
      id: "total-input",
      kind: "total",
      label: "Total Input GST",
      amounts: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalGst: totalInput, totalInvoiceValue: 0 },
    },
    {
      id: "net-gst",
      kind: "net",
      label: netGst >= 0 ? "Net GST Payable" : "Net GST Receivable",
      amounts: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalGst: netGst, totalInvoiceValue: 0 },
    },
  ];
}

function matchesFilters(line: GstSummaryLine, filters: GstSummaryFilters): boolean {
  if (line.kind === "section" || line.kind === "total" || line.kind === "net") return true;

  if (filters.gstType !== "all" && line.category !== filters.gstType) return false;
  if (filters.gstRate !== "all" && line.rate !== Number(filters.gstRate)) return false;

  const q = filters.search.trim().toLowerCase();
  if (q && !line.label.toLowerCase().includes(q)) return false;

  return true;
}

export function buildGstSummaryStatement(filters: GstSummaryFilters): {
  lines: GstSummaryLine[];
  totals: GstSummaryTotals;
  hasData: boolean;
} {
  const full = buildFullStatement();
  const dataRows = full.filter((l) => l.kind === "data");
  const filteredData = dataRows.filter((l) => matchesFilters(l, filters));

  if (filteredData.length === 0) {
    return {
      lines: [],
      totals: { totalOutputGst: 0, totalInputGst: 0, netGstPayable: 0 },
      hasData: false,
    };
  }

  const lines: GstSummaryLine[] = [];
  const categories: GstCategory[] = ["output", "input", "rcm"];

  for (const cat of categories) {
    const catRows = filteredData.filter((r) => r.category === cat);
    if (catRows.length === 0) continue;

    const sectionLabel =
      cat === "output" ? "Output GST" : cat === "input" ? "Input GST" : "RCM GST";
    lines.push({ id: `sec-${cat}`, kind: "section", label: sectionLabel });
    lines.push(...catRows);
  }

  const totalOutput = sumGst(filteredData, "output");
  const totalInput = sumGst(filteredData, "input");
  const netGst = totalOutput - totalInput;

  lines.push({ id: "sec-net", kind: "section", label: "Net GST Payable / Receivable" });
  lines.push({
    id: "total-output",
    kind: "total",
    label: "Total Output GST",
    amounts: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalGst: totalOutput, totalInvoiceValue: 0 },
  });
  lines.push({
    id: "total-input",
    kind: "total",
    label: "Total Input GST",
    amounts: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalGst: totalInput, totalInvoiceValue: 0 },
  });
  lines.push({
    id: "net-gst",
    kind: "net",
    label: netGst >= 0 ? "Net GST Payable" : "Net GST Receivable",
    amounts: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalGst: netGst, totalInvoiceValue: 0 },
  });

  return {
    lines,
    totals: { totalOutputGst: totalOutput, totalInputGst: totalInput, netGstPayable: netGst },
    hasData: true,
  };
}

export interface GstSummaryExportRow {
  gstType: string;
  taxableValue: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  totalGst: number | null;
  totalInvoiceValue: number | null;
  rowType: GstSummaryRowKind;
}

export function flattenGstSummaryForExport(lines: GstSummaryLine[]): GstSummaryExportRow[] {
  return lines.map((line) => {
    if (line.kind === "section") {
      return {
        gstType: line.label,
        taxableValue: null,
        cgst: null,
        sgst: null,
        igst: null,
        totalGst: null,
        totalInvoiceValue: null,
        rowType: "section",
      };
    }
    const a = line.amounts;
    return {
      gstType: line.label,
      taxableValue: a?.taxableValue ?? null,
      cgst: a?.cgst ?? null,
      sgst: a?.sgst ?? null,
      igst: a?.igst ?? null,
      totalGst: a?.totalGst ?? null,
      totalInvoiceValue: a?.totalInvoiceValue ?? null,
      rowType: line.kind,
    };
  });
}
