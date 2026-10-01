"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { hrBtn, hrInput } from "@/app/(app)/hr/settings/organization/_components";
import {
  formatPayrollPeriodLabel,
  getPayrollRunById,
  listFinalizedPayrollRuns,
  formatPayrollMoney,
} from "./payroll-run-data";
import {
  loadGeneratedHrDocuments,
  type GeneratedHrDocument,
} from "@/app/(app)/hr/settings/hr-template-data";

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [{ value: "all", label: "All Months" }];
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

function formatGeneratedOn(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PayslipsPageClient() {
  const months = useMemo(() => monthOptions(), []);
  const [periodKey, setPeriodKey] = useState("all");
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<GeneratedHrDocument[]>([]);
  const [preview, setPreview] = useState<GeneratedHrDocument | null>(null);

  const refresh = useCallback(() => {
    setDocs(
      loadGeneratedHrDocuments()
        .filter((d) => d.templateType === "payslip" || d.sourceModule === "payroll")
        .sort((a, b) => b.generatedOn.localeCompare(a.generatedOn)),
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const finalizedById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getPayrollRunById>>();
    for (const r of listFinalizedPayrollRuns()) map.set(r.id, r);
    return map;
  }, [docs]);

  const filtered = useMemo(() => {
    let list = docs;
    if (periodKey !== "all") {
      const [ys, ms] = periodKey.split("-");
      const y = Number(ys);
      const m = Number(ms);
      list = list.filter((d) => {
        if (!d.payrollRunId) return false;
        const run = finalizedById.get(d.payrollRunId) ?? getPayrollRunById(d.payrollRunId);
        return run?.periodYear === y && run?.periodMonth === m;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.employeeName.toLowerCase().includes(q) ||
          d.employeeCode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [docs, periodKey, search, finalizedById]);

  return (
    <HrPageShell
      title="Payslips"
      description="Generated payslip snapshots from finalized payroll. Layout from Template Management."
      breadcrumbs={hrBreadcrumb(
        { label: "Payroll", href: "/hr/payroll" },
        { label: "Payslips" },
      )}
      actions={
        <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
          <Link href="/hr/settings/templates?type=payslip">Payslip Templates</Link>
        </Button>
      }
    >
      <div className="space-y-3 max-w-[1200px]">
        <div className="flex flex-wrap gap-2 items-center">
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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className={cn(hrInput(), "h-8 w-52 text-xs")}
          />
        </div>

        <div className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="px-3 py-2.5 font-semibold">Employee</th>
                  <th className="px-3 py-2.5 font-semibold">Payroll Month</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Gross</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Deductions</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Net Pay</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Generated On</th>
                  <th className="px-3 py-2.5 font-semibold w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                      <FileSpreadsheet className="w-7 h-7 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No payslips yet</p>
                      <p className="text-[11px] mt-1">
                        Finalize payroll, then save a payslip snapshot from the employee drawer.
                      </p>
                      <Button asChild size="sm" className={cn(hrBtn("gap-1.5 mt-3", true))}>
                        <Link href="/hr/payroll/run">Go to Run Payroll</Link>
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const run =
                      (d.payrollRunId
                        ? finalizedById.get(d.payrollRunId) ?? getPayrollRunById(d.payrollRunId)
                        : null) ?? null;
                    const row = run?.employees.find(
                      (e) =>
                        e.employeeCode.trim().toLowerCase() ===
                        d.employeeCode.trim().toLowerCase(),
                    );
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <p className="font-semibold text-foreground">{d.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {d.employeeCode}
                          </p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {run?.periodLabel ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPayrollMoney(row?.grossEarnings)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPayrollMoney(row?.employeeDeductionsTotal)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {formatPayrollMoney(row?.netPay)}
                        </td>
                        <td className="px-3 py-2 capitalize">{d.status}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatGeneratedOn(d.generatedOn)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setPreview(d)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent className="w-full sm:max-w-[640px] flex flex-col p-0 gap-0">
          <SheetHeader>
            <SheetTitle>Payslip</SheetTitle>
            <SheetDescription>
              {preview?.employeeName} · {preview?.templateName}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3 text-xs">
            {preview ? (
              <>
                {preview.renderedSubject ? (
                  <p className="font-semibold text-sm">{preview.renderedSubject}</p>
                ) : null}
                {preview.renderedHeader ? (
                  <div
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: preview.renderedHeader }}
                  />
                ) : null}
                <div
                  className="prose prose-sm max-w-none text-foreground border border-border rounded-[12px] p-3 bg-white"
                  dangerouslySetInnerHTML={{ __html: preview.renderedBody }}
                />
                {preview.renderedFooter ? (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: preview.renderedFooter }}
                  />
                ) : null}
                <p className="text-[11px] text-muted-foreground pt-2 border-t">
                  Snapshot generated {formatGeneratedOn(preview.generatedOn)}. Later template or
                  settings edits do not change this document.
                </p>
              </>
            ) : null}
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={hrBtn()}
              onClick={() => setPreview(null)}
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrPageShell>
  );
}
