"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart3, Download, FileText, TrendingUp, TrendingDown, Wallet, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const REPORTS = [
  {
    category: "Financial Statements",
    items: [
      { name: "Profit & Loss Statement", description: "Income, expenses, and net profit for the period", icon: TrendingUp, color: "bg-emerald-600" },
      { name: "Balance Sheet", description: "Assets, liabilities, and equity snapshot", icon: Wallet, color: "bg-brand-600" },
      { name: "Cash Flow Statement", description: "Operating, investing, and financing activities", icon: TrendingDown, color: "bg-blue-600" },
    ]
  },
  {
    category: "Sales Reports",
    items: [
      { name: "Sales Summary", description: "Total sales by period, territory, and salesperson", icon: BarChart3, color: "bg-purple-600" },
      { name: "Customer-wise Sales", description: "Sales breakdown by customer", icon: FileText, color: "bg-amber-600" },
      { name: "Territory-wise Sales", description: "Sales performance by territory and zone", icon: BarChart3, color: "bg-brand-600" },
    ]
  },
  {
    category: "Purchase Reports",
    items: [
      { name: "Purchase Summary", description: "Total purchases by period and vendor", icon: BarChart3, color: "bg-red-600" },
      { name: "Vendor-wise Purchases", description: "Purchase breakdown by vendor", icon: FileText, color: "bg-orange-600" },
    ]
  },
  {
    category: "Tax Reports",
    items: [
      { name: "GST Summary", description: "GST collected and paid for the period", icon: FileText, color: "bg-sky-600" },
      { name: "TDS Report", description: "TDS deducted and remitted", icon: FileText, color: "bg-indigo-600" },
    ]
  },
];

const QUICK_STATS = [
  { label: "Revenue (Jan)", value: "₹12.4L", change: "+8.2%", positive: true },
  { label: "Expenses (Jan)", value: "₹8.6L", change: "+3.1%", positive: false },
  { label: "Profit (Jan)", value: "₹3.8L", change: "+18.5%", positive: true },
  { label: "Outstanding", value: "₹9.1L", change: "7 parties", positive: false },
];

export default function AccountsReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (reportName: string) => {
    setGenerating(reportName);
    setTimeout(() => setGenerating(null), 1500);
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generate and download financial statements</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          {QUICK_STATS.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-3.5">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-base font-bold text-foreground mt-1">{s.value}</p>
              <p className={cn("text-[11px] font-medium mt-0.5", s.positive ? "text-emerald-600" : "text-red-500")}>{s.change}</p>
            </div>
          ))}
        </div>

        {/* Report categories */}
        <div className="space-y-4">
          {REPORTS.map(cat => (
            <div key={cat.category}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{cat.category}</p>
              <div className="grid grid-cols-1 gap-2">
                {cat.items.map(report => (
                  <div key={report.name} className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", report.color)}>
                      <report.icon className="w-4.5 h-4.5 text-white" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{report.name}</p>
                      <p className="text-[11px] text-muted-foreground">{report.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerate(report.name)}
                        className="h-7 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {generating === report.name ? "Generating…" : "Download"}
                      </button>
                      <button className="h-7 px-3 text-xs rounded-lg inline-flex items-center gap-1 font-medium bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors">
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
