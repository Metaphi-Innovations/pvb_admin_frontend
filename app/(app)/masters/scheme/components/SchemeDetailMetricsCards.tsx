"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  Percent,
  TrendingUp,
} from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  formatSchemeAnalyticsRupee,
  formatUtilizationPercent,
  type SchemeUtilizationStats,
} from "../scheme-analytics-data";

export default function SchemeDetailMetricsCards({ stats }: { stats: SchemeUtilizationStats }) {
  const cards = [
    { label: "Utilized Count", value: String(stats.utilizedCount), icon: TrendingUp, accent: true },
    {
      label: "Utilization %",
      value: formatUtilizationPercent(stats),
      icon: Percent,
      accent: false,
    },
    {
      label: "Pending Settlement",
      value: String(stats.pendingSettlementCount),
      icon: Clock,
      accent: false,
    },
    {
      label: "Total Benefit Given",
      value: formatSchemeAnalyticsRupee(stats.totalBenefitGiven),
      icon: IndianRupee,
      accent: true,
    },
    {
      label: "Sales Generated",
      value: formatSchemeAnalyticsRupee(stats.salesGenerated),
      icon: FileText,
      accent: false,
    },
    {
      label: "Settlement Status",
      value: stats.hasPendingSettlement ? "Pending" : stats.isUtilized ? "Settled" : "—",
      icon: CheckCircle2,
      accent: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <MiniKPICard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          accent={card.accent}
        />
      ))}
    </div>
  );
}
