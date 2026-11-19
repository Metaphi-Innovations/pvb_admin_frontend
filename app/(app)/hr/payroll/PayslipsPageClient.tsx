"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FileSpreadsheet, FileText, Mail, Sparkles } from "lucide-react";
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
import { generateMissingPayslipsFromFinalizedRuns } from "./payslip-generation";
import {
  loadGeneratedHrDocuments,
  type GeneratedHrDocument,
} from "@/app/(app)/hr/settings/hr-template-data";
import {
  hrLetterTypeLabel,
  listHrLetters,
} from "@/app/(app)/hr/hr-letters/hr-letters-data";
import { HrLetterDocumentFrame } from "@/app/(app)/hr/hr-letters/components/HrLetterDocumentFrame";
import { formatDateDisplay } from "@/app/(app)/hr/employees/employee-display";

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

type DocTab = "payslips" | "letters";

export default function PayslipsPageClient() {
  const months = useMemo(() => monthOptions(), []);
  const [periodKey, setPeriodKey] = useState("all");
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<GeneratedHrDocument[]>([]);
  const [letters, setLetters] = useState<GeneratedHrDocument[]>([]);
  const [preview, setPreview] = useState<GeneratedHrDocument | null>(null);
  const [tab, setTab] = useState<DocTab>("payslips");
  const [toast, setToast] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(() => {
    const all = loadGeneratedHrDocuments();
    setDocs(
      all
        .filter((d) => d.templateType === "payslip" || d.sourceModule === "payroll")
        .sort((a, b) => b.generatedOn.localeCompare(a.generatedOn)),
    );
    setLetters(listHrLetters());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const finalizedById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getPayrollRunById>>();
    for (const r of listFinalizedPayrollRuns()) map.set(r.id, r);
    return map;
  }, [docs]);

  const finalizedCount = useMemo(() => listFinalizedPayrollRuns().length, [docs, toast]);

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

  const filteredLetters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return letters;
    return letters.filter(
      (d) =>
        d.employeeName.toLowerCase().includes(q) ||
        d.employeeCode.toLowerCase().includes(q) ||
        (d.documentTitle || "").toLowerCase().includes(q) ||
        d.templateName.toLowerCase().includes(q),
    );
  }, [letters, search]);

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const result = generateMissingPayslipsFromFinalizedRuns({ notify: true });
      refresh();
      if (result.error) {
        setToast(result.error);
      } else if (result.created === 0 && result.runs === 0) {
        setToast("No finalized payroll runs yet. Process and finalize payroll first.");
      } else if (result.created === 0) {
        setToast("All payslips for finalized runs are already generated.");
      } else {
        setToast(`Generated ${result.created} payslip${result.created === 1 ? "" : "s"}.`);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <HrPageShell
      title="Payslips"
      description="Payslip snapshots from finalized payroll. Form 16 uploads and HR letters stay linked from this workspace."
      breadcrumbs={hrBreadcrumb(
        { label: "Payroll", href: "/hr/payroll" },
        { label: "Payslips" },
      )}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
            <Link href="/hr/payroll/form-16">
              <FileText className="w-3.5 h-3.5" /> Form 16
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
            <Link href="/hr/hr-letters">
              <Mail className="w-3.5 h-3.5" /> HR Letters
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
            <Link href="/hr/settings/templates?type=payslip">Payslip Templates</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className={hrBtn("gap-1.5", true)}
            disabled={generating}
            onClick={handleGenerate}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? "Generating…" : "Generate from Payroll"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 max-w-[1200px]">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex rounded-[10px] border border-border bg-muted/30 p-0.5">
            {(
              [
                { id: "payslips" as const, label: "Payslips", count: docs.length },
                { id: "letters" as const, label: "HR Letters", count: letters.length },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-8 px-3 text-xs font-medium rounded-[8px] transition-colors",
                  tab === t.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    tab === t.id ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          {tab === "payslips" ? (
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
          ) : null}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className={cn(hrInput(), "h-8 w-52 text-xs")}
          />
          {tab === "payslips" && finalizedCount > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {finalizedCount} finalized payroll run{finalizedCount === 1 ? "" : "s"} available
            </p>
          ) : null}
        </div>

        {tab === "payslips" ? (
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
                        <p className="text-[11px] mt-1 max-w-md mx-auto">
                          Finalize payroll (or use Demo Workspace → Seed Demo), then click{" "}
                          <span className="font-medium text-foreground">Generate from Payroll</span>.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                          <Button
                            type="button"
                            size="sm"
                            className={cn(hrBtn("gap-1.5", true))}
                            disabled={generating}
                            onClick={handleGenerate}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate from Payroll
                          </Button>
                          <Button asChild size="sm" variant="outline" className={hrBtn("gap-1.5")}>
                            <Link href="/hr/payroll/run">Go to Run Payroll</Link>
                          </Button>
                        </div>
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
        ) : (
          <div className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                HR letters issued for employees — same documents as the HR Letters module.
              </p>
              <Button asChild size="sm" variant="outline" className={hrBtn("h-7 text-[11px] gap-1")}>
                <Link href="/hr/hr-letters">Open HR Letters</Link>
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2.5 font-semibold">Employee</th>
                    <th className="px-3 py-2.5 font-semibold">Letter</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Issued / Generated</th>
                    <th className="px-3 py-2.5 font-semibold w-16" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLetters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                        <Mail className="w-7 h-7 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium text-foreground">No HR letters yet</p>
                        <p className="text-[11px] mt-1">
                          Generate letters from HR Letters, or run Demo Workspace → Seed Demo.
                        </p>
                        <Button asChild size="sm" className={cn(hrBtn("gap-1.5 mt-3", true))}>
                          <Link href="/hr/hr-letters">Go to HR Letters</Link>
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredLetters.map((d) => (
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
                        <td className="px-3 py-2">
                          {d.documentTitle || d.renderedSubject || d.templateName}
                        </td>
                        <td className="px-3 py-2">
                          {hrLetterTypeLabel(d.templateType, d.templateName)}
                        </td>
                        <td className="px-3 py-2 capitalize">{d.status}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatGeneratedOn(d.issuedOn || d.generatedOn || d.issueDate || "")}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent className="w-full sm:max-w-[640px] flex flex-col p-0 gap-0">
          <SheetHeader>
            <SheetTitle>
              {preview?.templateType === "payslip" || preview?.sourceModule === "payroll"
                ? "Payslip"
                : "HR Letter"}
            </SheetTitle>
            <SheetDescription>
              {preview?.employeeName} · {preview?.templateName}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3 text-xs bg-muted/20">
            {preview ? (
              <>
                <HrLetterDocumentFrame
                  title={preview.documentTitle || preview.renderedSubject || preview.templateName}
                  header={preview.renderedHeader}
                  body={preview.renderedBody}
                  footer={preview.renderedFooter}
                  companyName={preview.snapshotCompanyName}
                  companyAddress={preview.snapshotCompanyAddress}
                  companyContact={preview.snapshotCompanyContact}
                  logoUrl={preview.snapshotLogoUrl}
                  useCompanyLogo={preview.snapshotUseCompanyLogo ?? true}
                  showCompanyAddress={preview.snapshotShowCompanyAddress ?? true}
                  showCompanyContact={preview.snapshotShowCompanyContact ?? false}
                  issueDate={
                    preview.issueDate
                      ? formatDateDisplay(preview.issueDate)
                      : formatGeneratedOn(preview.generatedOn)
                  }
                  referenceNumber={preview.referenceNumber || undefined}
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Snapshot generated {formatGeneratedOn(preview.generatedOn)}.
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

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
          {toast}
        </div>
      ) : null}
    </HrPageShell>
  );
}
