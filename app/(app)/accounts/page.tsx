"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowRightLeft, BarChart3 } from "lucide-react";

const sections = [
  {
    title: "Transactions",
    icon: ArrowRightLeft,
    links: [
      { label: "Invoices", href: "/accounts/transactions/invoices" },
      { label: "Credit Notes", href: "/accounts/transactions/credit-notes" },
      { label: "Purchase", href: "/accounts/transactions/purchase" },
      { label: "Debit Notes", href: "/accounts/transactions/debit-notes" },
      { label: "Expenses (Payments)", href: "/accounts/transactions/expenses" },
      { label: "Payments", href: "/accounts/transactions/payments" },
      { label: "Reconciliation", href: "/accounts/transactions/reconciliation" },
      { label: "Journal", href: "/accounts/transactions/journal" },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    links: [
      { label: "Trial Balance", href: "/accounts/reports/trial-balance" },
      { label: "P&L", href: "/accounts/reports/pl" },
      { label: "Balance Sheet", href: "/accounts/reports/balance-sheet" },
    ],
  },
];

export default function AccountsHomePage() {
  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Accounts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Financial transactions, accounting entries and reports.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="bg-white border border-border/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold">{s.title}</h2>
                </div>
                <div className="space-y-1">
                  {s.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="h-8 px-2.5 rounded-md hover:bg-muted/30 text-xs flex items-center justify-between"
                    >
                      <span>{l.label}</span>
                      <span className="text-muted-foreground">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
