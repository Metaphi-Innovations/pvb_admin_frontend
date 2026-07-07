"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import type { CoaWorkflowContext } from "@/lib/accounts/coa-workflow-context";

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export function CoaWorkflowPanel({
  context,
  onViewLedgerStatement,
}: {
  context: CoaWorkflowContext;
  onViewLedgerStatement?: () => void;
}) {
  if (!context) return null;

  if (context.kind === "sales_group") {
    return (
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40 bg-brand-50/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800 mb-3">
          Sales Ledger Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl">
          <SummaryField label="Ledgers" value={context.ledgerCount} />
          <SummaryField
            label="Balance"
            value={<MoneyAmount amount={context.totalBalance} side="Credit" />}
          />
          <SummaryField label="Transaction Count" value={context.transactionCount} />
          <div className="flex items-end">
            <Button asChild size="sm" className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white">
              <Link href="/accounts/reports/sales-register">View Sales Register</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (context.kind === "customer_ledger") {
    return (
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40 bg-brand-50/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800 mb-3">
          Customer Ledger — {context.ledgerName}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-5xl">
          <SummaryField
            label="Outstanding Amount"
            value={<MoneyAmount amount={context.outstanding} side="Debit" />}
          />
          <SummaryField label="Invoices" value={context.invoiceCount} />
          <SummaryField label="Payments" value={context.paymentCount} />
          <div className="flex items-end">
            <Button asChild variant="outline" size="sm" className="h-9 text-sm font-medium w-full">
              <Link href="/accounts/receivables/outstanding?tab=ageing">Ageing</Link>
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-sm font-medium w-full"
              onClick={onViewLedgerStatement}
            >
              Ledger Statement
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-border/40 bg-brand-50/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-800 mb-3">
        Supplier Ledger — {context.ledgerName}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-5xl">
        <SummaryField
          label="Outstanding Amount"
          value={<MoneyAmount amount={context.outstanding} side="Credit" />}
        />
        <SummaryField label="Bills" value={context.billCount} />
        <SummaryField label="Payments" value={context.paymentCount} />
        <div className="flex items-end">
          <Button asChild variant="outline" size="sm" className="h-9 text-sm font-medium w-full">
            <Link href="/accounts/payables/outstanding?tab=ageing">Ageing</Link>
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium w-full"
            onClick={onViewLedgerStatement}
          >
            Ledger Statement
          </Button>
        </div>
      </div>
    </div>
  );
}
