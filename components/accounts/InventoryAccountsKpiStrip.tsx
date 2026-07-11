"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { IndianRupee, TrendingDown, Scale, Clock } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  ensureInventoryAccountingLedgers,
  getInventoryDashboardMetrics,
} from "@/lib/accounts/inventory-accounting-data";
import { formatMoney } from "@/lib/accounts/money-format";

export function InventoryAccountsKpiStrip() {
  useEffect(() => {
    ensureInventoryAccountingLedgers();
  }, []);

  const m = useMemo(() => getInventoryDashboardMetrics(), []);

  return (
    <div className="flex-shrink-0 border-b border-border/60 bg-gradient-to-r from-emerald-50/80 to-white px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Inventory Accounting
        </p>
        <Link href="/accounts/reports/stock-valuation" className="text-xs text-primary hover:underline">
          Stock Valuation →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MiniKPICard label="Total Inventory Value" value={formatMoney(m.totalInventoryValue)} icon={IndianRupee} accent />
        <MiniKPICard label="COGS This Month" value={formatMoney(m.cogsThisMonth)} icon={TrendingDown} />
        <MiniKPICard label="Stock Adjustment Value" value={formatMoney(m.stockAdjustmentValue)} icon={Scale} />
        <MiniKPICard label="Near Expiry Stock Value" value={formatMoney(m.nearExpiryStockValue)} icon={Clock} />
      </div>
    </div>
  );
}
