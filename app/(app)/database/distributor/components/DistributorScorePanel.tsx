"use client";

import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import type { DistributorAssessment } from "@/lib/distributor/distributor-scoring";
import { formatAmountInCrores } from "@/lib/distributor/distributor-scoring";
import { DistributorCategoryBadge } from "./DistributorCategoryBadge";

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-bold text-foreground",
          highlight ? "text-xl" : "text-sm",
        )}
      >
        {value}
      </p>
    </div>
  );
}

const POLICY_RULES = [
  {
    category: "A" as const,
    score: "Score ≥ 80",
    credit: "50% of Business Plan",
    period: "90 Days",
  },
  {
    category: "B" as const,
    score: "Score 70–79.99",
    credit: "30% of Business Plan",
    period: "90 Days",
  },
  {
    category: "C" as const,
    score: "Score < 70",
    credit: "Cash & Carry · ₹0 Credit",
    period: "0 Days",
  },
];

function formatRawValue(criteria: string, rawData: string): string {
  if (criteria.includes("Turnover") || criteria.includes("Business Plan")) {
    const formatted = formatAmountInCrores(rawData);
    return formatted !== "—" ? formatted : rawData;
  }
  return rawData;
}

export function DistributorScorePanel({ assessment }: { assessment: DistributorAssessment }) {
  const businessPlanRow = assessment.breakdownRows.find((r) =>
    r.criteria.includes("Business Plan"),
  );
  const businessPlanDisplay = businessPlanRow
    ? formatRawValue(businessPlanRow.criteria, businessPlanRow.rawData)
    : "—";

  const creditPct = assessment.category === "A" ? "50%" : assessment.category === "B" ? "30%" : "0%";

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="rounded-xl border border-navy-200 bg-navy-50/60 px-3 py-2.5">
        <p className="text-xs font-semibold text-navy-800">ERP Intelligence</p>
        <p className="text-[11px] text-muted-foreground">
          System-calculated score, category, and credit policy — explains why this distributor
          received their rating.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Final Score"
          value={`${assessment.weightedScore.toFixed(2)}%`}
          highlight
        />
        <MetricCard
          label="Auto Category"
          value={<DistributorCategoryBadge category={assessment.category} />}
        />
        <MetricCard
          label="Credit Limit"
          value={
            assessment.creditLimit > 0
              ? formatIndianRupeeDisplay(assessment.creditLimit)
              : "₹0"
          }
        />
        <MetricCard
          label="Credit Period"
          value={
            assessment.creditPeriodDays > 0
              ? `${assessment.creditPeriodDays} Days`
              : "0 Days"
          }
        />
        <MetricCard label="Credit Status" value={assessment.creditStatus} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <p className="text-xs font-semibold text-foreground">Calculation Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Criteria", "Raw Value", "Marks", "Weightage", "Weighted Score", "Reason"].map(
                  (h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2 text-xs font-semibold text-foreground",
                        h === "Criteria" || h === "Raw Value" || h === "Reason"
                          ? "text-left"
                          : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {assessment.breakdownRows.map((row) => (
                <tr key={row.criteria} className="border-b border-border/60">
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{row.criteria}</td>
                  <td className="max-w-[160px] px-3 py-2 text-xs text-foreground break-words">
                    {formatRawValue(row.criteria, row.rawData)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-brand-700">
                    {row.marks}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {row.weightage}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-foreground">
                    {row.weightedPoints}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{row.reason}</td>
                </tr>
              ))}
              <tr className="border-b border-border/60 bg-muted/10">
                <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-foreground">
                  Total Weighted Score
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs font-bold text-foreground">
                  {assessment.totalWeightedPoints}
                </td>
                <td />
              </tr>
              <tr className="border-b border-border/60 bg-brand-50/30">
                <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-brand-800">
                  Final Score
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm font-bold text-brand-700">
                  {assessment.weightedScore.toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground">
                  {assessment.totalWeightedPoints} ÷ 100
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-foreground">
                  Category
                </td>
                <td colSpan={2} className="px-3 py-2">
                  <DistributorCategoryBadge category={assessment.category} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-foreground">Calculation Formula</p>
        <div className="mt-2 space-y-1 font-mono text-xs text-foreground">
          {assessment.breakdownRows.map((row) => (
            <p key={row.criteria}>
              {row.weightage} × {row.marks} = {row.weightedPoints}
            </p>
          ))}
          <p className="pt-1 font-semibold text-brand-700">
            Total = {assessment.totalWeightedPoints}
          </p>
          <p className="font-semibold text-brand-700">
            Final Score = {assessment.totalWeightedPoints} ÷ 100 ={" "}
            {assessment.weightedScore.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-foreground">Credit Policy Applied</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Category</span>
              <DistributorCategoryBadge category={assessment.category} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Business Plan</span>
              <span className="font-medium">{businessPlanDisplay}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Credit Policy</span>
              <span className="font-medium">
                {assessment.category === "C" ? "Cash & Carry" : `${creditPct} of Business Plan`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Recommended Credit Limit</span>
              <span className="font-mono font-semibold text-brand-700">
                {assessment.creditLimit > 0
                  ? formatIndianRupeeDisplay(assessment.creditLimit)
                  : "₹0"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Credit Period</span>
              <span className="font-medium">
                {assessment.creditPeriodDays > 0
                  ? `${assessment.creditPeriodDays} Days`
                  : "0 Days"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-foreground">Policy Rule Reference</p>
          <div className="mt-3 space-y-2">
            {POLICY_RULES.map((rule) => (
              <div
                key={rule.category}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  assessment.category === rule.category
                    ? "border-brand-300 bg-brand-50"
                    : "border-border/60 bg-muted/10",
                )}
              >
                <p className="font-semibold text-foreground">Category {rule.category}</p>
                <p className="mt-0.5 text-muted-foreground">{rule.score}</p>
                <p className="text-muted-foreground">{rule.credit}</p>
                <p className="text-muted-foreground">{rule.period}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-600" />
        <p className="text-[11px] text-navy-700">
          Credit limit is auto-calculated here. It can be edited in Customer Master after
          conversion on the Customer Conversion tab.
        </p>
      </div>
    </div>
  );
}
