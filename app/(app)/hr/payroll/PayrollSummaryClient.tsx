"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { hrBtn, hrInput } from "@/app/(app)/hr/settings/organization/_components";
import {
  aggregatePayrollComponentTotals,
  collectPayrollPendingActions,
  findPayrollRunForPeriod,
  formatPayrollMoney,
  formatPayrollPeriodLabel,
  payrollRunStatusLabel,
  type PayrollRun,
} from "./payroll-run-data";

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums mt-0.5 leading-none",
          accent ? "text-brand-700" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    opts.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label: formatPayrollPeriodLabel(y, m),
    });
  }
  return opts;
}

export default function PayrollSummaryClient() {
  const months = useMemo(() => monthOptions(), []);
  const [periodKey, setPeriodKey] = useState(months[0]?.value ?? "");
  const [run, setRun] = useState<PayrollRun | null>(null);

  const refresh = useCallback(() => {
    const [ys, ms] = periodKey.split("-");
    const y = Number(ys);
    const m = Number(ms);
    if (!y || !m) {
      setRun(null);
      return;
    }
    setRun(findPayrollRunForPeriod(y, m));
  }, [periodKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-payroll-runs-updated", onUpd);
    return () => window.removeEventListener("hr-payroll-runs-updated", onUpd);
  }, [refresh]);

  const aggregates = useMemo(
    () => (run ? aggregatePayrollComponentTotals(run) : []),
    [run],
  );
  const earnings = aggregates.filter((a) => a.type === "earning");
  const deductions = aggregates.filter((a) => a.type === "deduction");
  const pending = useMemo(() => collectPayrollPendingActions(run), [run]);

  const calculated = run?.totals.calculatedCount ?? 0;
  const total = run?.totals.employeeCount ?? 0;
  const pendingCount = Math.max(0, total - calculated);

  return (
    <HrPageShell
      title="Payroll Summary"
      description="Period overview from payroll runs. Configuration lives in HR Settings."
      breadcrumbs={hrBreadcrumb(
        { label: "Payroll", href: "/hr/payroll" },
        { label: "Payroll Summary" },
      )}
      actions={
        <Button asChild size="sm" className={hrBtn("gap-1.5", true)}>
          <Link href="/hr/payroll/run">
            <Calculator className="w-3.5 h-3.5" /> Run Payroll
          </Link>
        </Button>
      }
    >
      <div className="space-y-4 max-w-[1200px]">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className={cn(hrInput(), "h-8 w-48 text-xs")}>
              <SelectValue placeholder="Payroll Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {run ? (
            <span className="text-[11px] text-muted-foreground">
              Status:{" "}
              <span className="font-medium text-foreground">
                {payrollRunStatusLabel(run.status)}
              </span>
              {" · "}
              {run.cycleName}
            </span>
          ) : null}
        </div>

        {!run ? (
          <div className="rounded-[14px] border border-dashed border-border bg-muted/10 px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              Payroll has not been calculated for this period.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a run to calculate earnings, deductions, and net pay.
            </p>
            <Button asChild size="sm" className={cn(hrBtn("gap-1.5 mt-3", true))}>
              <Link href="/hr/payroll/run">
                <Calculator className="w-3.5 h-3.5" /> Run Payroll
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <Kpi label="Total Employees" value={String(total)} />
              <Kpi label="Calculated" value={String(calculated)} />
              <Kpi label="Pending" value={String(pendingCount)} />
              <Kpi label="Gross Payroll" value={formatPayrollMoney(run.totals.grossEarnings)} />
              <Kpi label="Total Deductions" value={formatPayrollMoney(run.totals.deductions)} />
              <Kpi label="Net Payroll" value={formatPayrollMoney(run.totals.netPay)} accent />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-[14px] border border-border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Earnings Summary
                </p>
                {earnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No calculated earnings yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {earnings.map((e) => (
                      <li key={e.name} className="flex justify-between gap-3">
                        <span className="text-muted-foreground truncate">{e.name}</span>
                        <span className="font-medium tabular-nums">{formatPayrollMoney(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-[14px] border border-border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Deduction / Statutory Summary
                </p>
                {deductions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No calculated deductions yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {deductions.map((e) => (
                      <li key={e.name} className="flex justify-between gap-3">
                        <span className="text-muted-foreground truncate">{e.name}</span>
                        <span className="font-medium tabular-nums">{formatPayrollMoney(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Pending Actions
              </p>
              {pending.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No configuration blockers on this run.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pending.slice(0, 12).map((issue, i) => (
                    <li
                      key={`${issue.code}-${i}`}
                      className="flex items-start gap-2 text-xs"
                    >
                      <AlertTriangle
                        className={cn(
                          "w-3.5 h-3.5 mt-0.5 shrink-0",
                          issue.severity === "blocking" ? "text-red-500" : "text-amber-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">{issue.message}</p>
                        {issue.href ? (
                          <Link
                            href={issue.href}
                            className="text-[11px] text-brand-700 hover:underline"
                          >
                            Open configuration
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {run.status !== "finalized" ? (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
                    <Link href="/hr/payroll/run">Continue in Run Payroll</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
                    <Link href="/hr/payroll/history">View in Payroll History</Link>
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </HrPageShell>
  );
}
