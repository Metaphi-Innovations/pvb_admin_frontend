"use client";

import React from "react";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  IndianRupee,
  type LucideIcon,
} from "lucide-react";
import type { StockDateMode, StockPositionKpis } from "../types/stock-position";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

interface StockKpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  borderColor: string;
  iconBg: string;
  iconColor: string;
}

function StockKpiCard({ label, value, icon: Icon, borderColor, iconBg, iconColor }: StockKpiCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border border-l-4 p-3.5 flex items-center gap-3 shadow-sm min-w-0",
        borderColor,
      )}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground leading-none tabular-nums truncate">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}

export function StockPositionKpiRow({ kpis, dateMode = "single" }: { kpis: StockPositionKpis; dateMode?: StockDateMode }) {
  const inLabel = dateMode === "single" ? "Day In Qty" : "Period In Qty";
  const outLabel = dateMode === "single" ? "Day Out Qty" : "Period Out Qty";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StockKpiCard
        label="Opening Stock Qty"
        value={kpis.openingStockQty.toLocaleString("en-IN")}
        icon={Package}
        borderColor="border-l-slate-400"
        iconBg="bg-slate-100"
        iconColor="text-slate-600"
      />
      <StockKpiCard
        label={inLabel}
        value={kpis.dayInQty.toLocaleString("en-IN")}
        icon={ArrowDownToLine}
        borderColor="border-l-emerald-500"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <StockKpiCard
        label={outLabel}
        value={kpis.dayOutQty.toLocaleString("en-IN")}
        icon={ArrowUpFromLine}
        borderColor="border-l-red-500"
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />
      <StockKpiCard
        label="Closing Stock Qty"
        value={kpis.closingStockQty.toLocaleString("en-IN")}
        icon={Boxes}
        borderColor="border-l-brand-600"
        iconBg="bg-brand-50"
        iconColor="text-brand-600"
      />
      <StockKpiCard
        label="Closing Stock Value"
        value={formatMoney(kpis.closingStockValue)}
        icon={IndianRupee}
        borderColor="border-l-navy-500"
        iconBg="bg-navy-50"
        iconColor="text-navy-600"
      />
    </div>
  );
}
