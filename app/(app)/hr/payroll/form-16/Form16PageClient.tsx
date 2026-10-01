"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileCheck2,
  FileText,
  Printer,
  Upload,
  Wand2,
  CheckCircle2,
  PenLine,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FORM16_DEFAULT_FY,
  formatForm16FyLabel,
  formatForm16Money,
  form16StatusLabel,
  form16SummaryCounts,
  generateForm16PartB,
  getForm16ById,
  listForm16FinancialYears,
  loadForm16Records,
  markForm16Signed,
  markForm16Verified,
  partALabel,
  partBLabel,
  publishForm16,
  taxRegimeLabel,
  uploadForm16PartA,
  type Form16Record,
  type Form16Status,
} from "../form-16-data";

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "amber" | "slate" | "navy" | "brand";
}) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    navy: "bg-navy-50 text-navy-700 border-navy-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
        map[tone],
      )}
    >
      {label}
    </span>
  );
}

function partATone(s: Form16Record["partAStatus"]) {
  return s === "uploaded" ? "emerald" : "amber";
}
function partBTone(s: Form16Record["partBStatus"]) {
  return s === "generated" ? "emerald" : "slate";
}
function formTone(s: Form16Status) {
  if (s === "published") return "emerald";
  if (s === "ready_to_publish") return "brand";
  return "amber";
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-0.5 leading-none text-foreground">{value}</p>
    </div>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function Form16PreviewDocument({ record }: { record: Form16Record }) {
  return (
    <div className="bg-white border border-border rounded-[14px] shadow-sm overflow-hidden print:shadow-none print:border-0">
      <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Demo Preview</p>
        <p className="text-[10px] text-amber-700">Not a statutory / TRACES document</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="text-center space-y-1 pb-3 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Form No. 16</p>
          <h2 className="text-base font-bold text-navy-700">Certificate under section 203 of the Income-tax Act</h2>
          <p className="text-[11px] text-muted-foreground">
            FY {formatForm16FyLabel(record.financialYear)} · AY {formatForm16FyLabel(record.assessmentYear)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Employee</p>
            <p className="text-sm font-semibold">{record.employeeName}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{record.employeeCode}</p>
            <p className="text-[11px] mt-1">PAN: <span className="font-mono font-semibold">{record.pan}</span></p>
            <p className="text-[11px]">{record.designation}</p>
            <p className="text-[11px]">Tax Regime: {taxRegimeLabel(record.taxRegime)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Employer</p>
            <p className="text-sm font-semibold">{record.employer.companyName}</p>
            <p className="text-[11px]">PAN: <span className="font-mono font-semibold">{record.employer.employerPan}</span></p>
            <p className="text-[11px]">TAN: <span className="font-mono font-semibold">{record.employer.tan}</span></p>
            <p className="text-[11px] text-muted-foreground mt-1">{record.employer.address}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-[12px] border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Part A</p>
            <InfoRow label="Status" value={partALabel(record.partAStatus)} />
            <InfoRow label="Source" value={record.partASource} />
            <InfoRow label="Uploaded" value={formatWhen(record.partAUploadedAt)} />
            <InfoRow label="File" value={record.partAFileName ?? "—"} />
          </div>
          <div className="rounded-[12px] border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Part B</p>
            <InfoRow label="Status" value={partBLabel(record.partBStatus)} />
            <InfoRow label="Generated" value={formatWhen(record.partBGeneratedAt)} />
            <InfoRow label="Source" value="PVB payroll / tax snapshot (demo)" />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Salary & Tax Summary</p>
          <div className="rounded-[12px] border border-border overflow-hidden">
            {[
              ["Gross Salary", record.salary.grossSalary],
              ["Exemptions", record.salary.exemptions],
              ["Deductions", record.salary.deductions],
              ["Taxable Income", record.salary.taxableIncome],
              ["Income Tax", record.salary.incomeTax],
              ["Health & Education Cess", record.salary.cess],
              ["Total Tax Liability", record.salary.totalTaxLiability],
              ["TDS Deducted", record.salary.tdsDeducted],
              ["Balance Tax", record.salary.balanceTax],
            ].map(([label, amt]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 last:border-0 text-xs"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums">{formatForm16Money(Number(amt))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="rounded-[12px] border border-border p-2.5">
            <p className="text-muted-foreground">Verified</p>
            <p className="font-semibold">{record.verified ? `Yes · ${record.verifiedBy ?? "—"}` : "No"}</p>
          </div>
          <div className="rounded-[12px] border border-border p-2.5">
            <p className="text-muted-foreground">Signed (manual)</p>
            <p className="font-semibold">{record.signed ? `Yes · ${record.signedBy ?? "—"}` : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Form16PageClient() {
  const [fy, setFy] = useState(FORM16_DEFAULT_FY);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Form16Status>("all");
  const [rows, setRows] = useState<Form16Record[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Form16Record | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const years = useMemo(() => listForm16FinancialYears(), []);

  const refresh = useCallback(() => {
    setRows(loadForm16Records());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const fyRows = useMemo(
    () => rows.filter((r) => r.financialYear === fy),
    [rows, fy],
  );

  const visible = useMemo(() => {
    let list = fyRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.pan.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") list = list.filter((r) => r.form16Status === statusFilter);
    return list;
  }, [fyRows, search, statusFilter]);

  const counts = useMemo(() => form16SummaryCounts(fyRows), [fyRows]);
  const detail = detailId ? getForm16ById(detailId) ?? rows.find((r) => r.id === detailId) ?? null : null;
  const preview = previewId
    ? getForm16ById(previewId) ?? rows.find((r) => r.id === previewId) ?? null
    : null;

  const afterMutation = (next: Form16Record | null, msg: string) => {
    refresh();
    if (next && detailId === next.id) setDetailId(next.id);
    setToast(msg);
  };

  const onUploadClick = (r: Form16Record) => {
    setUploadTarget(r);
    window.setTimeout(() => fileRef.current?.click(), 0);
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTarget;
    e.target.value = "";
    setUploadTarget(null);
    if (!target) return;
    const updated = uploadForm16PartA(target.id, file?.name);
    afterMutation(updated, "Part A marked as uploaded (manual).");
  };

  const onGeneratePartB = (r: Form16Record) => {
    const updated = generateForm16PartB(r.id);
    const months = updated?.partBComputation?.sources.finalizedPayrollMonths ?? 0;
    afterMutation(
      updated,
      months > 0
        ? `Part B generated from annual computation (${months} finalized payroll month(s)).`
        : "Part B generated from annual computation (demo snapshot / tax settings fallback).",
    );
  };

  const onPublish = (r: Form16Record) => {
    const { record, error } = publishForm16(r.id);
    if (error) {
      setToast(error);
      return;
    }
    afterMutation(record, "Form 16 published for employee download (demo).");
  };

  const onPrintPreview = () => {
    window.print();
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onFilePicked}
      />

      <HrPageShell
        breadcrumbs={hrBreadcrumb(
          { label: "Payroll", href: "/hr/payroll" },
          { label: "Form 16" },
        )}
        title="Form 16"
        description="Generate, review and publish employee Form 16 for the financial year."
        icon={FileCheck2}
        badge={
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Demo · Manual Part A · No TRACES
          </span>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fy} onValueChange={setFy}>
              <SelectTrigger className={cn(hrInput(), "h-8 w-[130px] text-xs")}>
                <SelectValue placeholder="FY" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    FY {formatForm16FyLabel(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className={cn(hrInput(), "h-8 w-[180px] text-xs")}
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | Form16Status)}
            >
              <SelectTrigger className={cn(hrInput(), "h-8 w-[160px] text-xs")}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="ready_to_publish" className="text-xs">Ready to Publish</SelectItem>
                <SelectItem value="published" className="text-xs">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Total Employees" value={counts.total} />
            <Kpi label="Published" value={counts.published} />
            <Kpi label="Ready to Publish" value={counts.ready} />
            <Kpi label="Pending Part A" value={counts.pendingPartA} />
          </div>

          <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {[
                      "Employee",
                      "Employee Code",
                      "PAN",
                      "Tax Regime",
                      "Gross Salary",
                      "Taxable Income",
                      "TDS Deducted",
                      "Part A",
                      "Part B",
                      "Form 16 Status",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center text-muted-foreground">
                        No Form 16 records for this filter.
                      </td>
                    </tr>
                  ) : (
                    visible.map((r, i) => (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-border/60 hover:bg-muted/20 transition-colors group",
                          i % 2 === 1 && "bg-muted/10",
                        )}
                      >
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="font-semibold text-foreground hover:text-brand-700 text-left"
                            onClick={() => setDetailId(r.id)}
                          >
                            {r.employeeName}
                          </button>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {r.designation}
                          </p>
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-brand-700">
                          {r.employeeCode}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.pan}</td>
                        <td className="px-3 py-2">{taxRegimeLabel(r.taxRegime)}</td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {formatForm16Money(r.salary.grossSalary)}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {formatForm16Money(r.salary.taxableIncome)}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {formatForm16Money(r.salary.tdsDeducted)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusChip label={partALabel(r.partAStatus)} tone={partATone(r.partAStatus)} />
                        </td>
                        <td className="px-3 py-2">
                          <StatusChip label={partBLabel(r.partBStatus)} tone={partBTone(r.partBStatus)} />
                        </td>
                        <td className="px-3 py-2">
                          <StatusChip
                            label={form16StatusLabel(r.form16Status)}
                            tone={formTone(r.form16Status)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={hrBtn("h-7 px-2 text-[11px] gap-1")}
                              onClick={() => setDetailId(r.id)}
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                            {r.partAStatus === "pending" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={hrBtn("h-7 px-2 text-[11px] gap-1")}
                                onClick={() => onUploadClick(r)}
                              >
                                <Upload className="w-3 h-3" /> Part A
                              </Button>
                            ) : null}
                            {r.partBStatus === "not_generated" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={hrBtn("h-7 px-2 text-[11px] gap-1")}
                                onClick={() => onGeneratePartB(r)}
                              >
                                <Wand2 className="w-3 h-3" /> Part B
                              </Button>
                            ) : null}
                            {r.form16Status === "ready_to_publish" ? (
                              <Button
                                type="button"
                                size="sm"
                                className={hrBtn("h-7 px-2 text-[11px] gap-1", true)}
                                onClick={() => onPublish(r)}
                              >
                                Publish
                              </Button>
                            ) : null}
                            {r.form16Status === "published" || r.partBStatus === "generated" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={hrBtn("h-7 px-2 text-[11px] gap-1")}
                                onClick={() => setPreviewId(r.id)}
                              >
                                <Download className="w-3 h-3" /> Preview
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Showing <span className="font-medium text-foreground">{visible.length}</span> of{" "}
                <span className="font-medium text-foreground">{fyRows.length}</span> · FY{" "}
                {formatForm16FyLabel(fy)}
              </span>
              <span>Part A = manual upload · Part B = PVB demo snapshot · Signing/filing tracked manually</span>
            </div>
          </div>
        </div>
      </HrPageShell>

      {/* Detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="sm:max-w-[480px]">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.employeeName}</SheetTitle>
                <SheetDescription>
                  {detail.employeeCode} · Form 16 · FY {formatForm16FyLabel(detail.financialYear)}
                </SheetDescription>
                <div className="pt-1">
                  <StatusChip
                    label={form16StatusLabel(detail.form16Status)}
                    tone={formTone(detail.form16Status)}
                  />
                </div>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Employee Details
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Name" value={detail.employeeName} />
                    <InfoRow label="Code" value={<span className="font-mono">{detail.employeeCode}</span>} />
                    <InfoRow label="PAN" value={<span className="font-mono">{detail.pan}</span>} />
                    <InfoRow label="Designation" value={detail.designation} />
                    <InfoRow label="Tax Regime" value={taxRegimeLabel(detail.taxRegime)} />
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Employer Details
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Company" value={detail.employer.companyName} />
                    <InfoRow label="Employer PAN" value={<span className="font-mono">{detail.employer.employerPan}</span>} />
                    <InfoRow label="TAN" value={<span className="font-mono">{detail.employer.tan}</span>} />
                    <InfoRow label="Address" value={detail.employer.address} />
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Period
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Financial Year" value={formatForm16FyLabel(detail.financialYear)} />
                    <InfoRow label="Assessment Year" value={formatForm16FyLabel(detail.assessmentYear)} />
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Salary Summary
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Gross Salary" value={formatForm16Money(detail.salary.grossSalary)} />
                    <InfoRow label="Exemptions" value={formatForm16Money(detail.salary.exemptions)} />
                    <InfoRow label="Deductions" value={formatForm16Money(detail.salary.deductions)} />
                    <InfoRow label="Taxable Income" value={formatForm16Money(detail.salary.taxableIncome)} />
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Tax Summary
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Income Tax" value={formatForm16Money(detail.salary.incomeTax)} />
                    <InfoRow label="Health & Education Cess" value={formatForm16Money(detail.salary.cess)} />
                    <InfoRow label="Total Tax Liability" value={formatForm16Money(detail.salary.totalTaxLiability)} />
                    <InfoRow label="TDS Deducted" value={formatForm16Money(detail.salary.tdsDeducted)} />
                    <InfoRow label="Balance Tax" value={formatForm16Money(detail.salary.balanceTax)} />
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Part A · Manual upload
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Status" value={partALabel(detail.partAStatus)} />
                    <InfoRow label="Source" value={detail.partASource} />
                    <InfoRow label="Uploaded" value={formatWhen(detail.partAUploadedAt)} />
                    <InfoRow label="File" value={detail.partAFileName ?? "—"} />
                  </div>
                  {detail.partAStatus === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={hrBtn("mt-2 h-8 text-xs gap-1.5")}
                      onClick={() => onUploadClick(detail)}
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Part A
                    </Button>
                  ) : null}
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Part B · Annual computation → Form 16
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3 mb-2">
                    <InfoRow label="Status" value={partBLabel(detail.partBStatus)} />
                    <InfoRow label="Generated" value={formatWhen(detail.partBGeneratedAt)} />
                  </div>
                  <div className="rounded-[12px] border border-dashed border-border bg-white px-3 py-2 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Part B inputs
                    </p>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                      <li>Employee Master</li>
                      <li>Company / Statutory Settings</li>
                      <li>Finalized Payroll Apr–Mar</li>
                      <li>Employee Tax Regime</li>
                      <li>Tax / Deduction Data</li>
                    </ul>
                    {detail.partBComputation ? (
                      <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                        <p className="text-[11px] text-foreground">
                          Payroll months used:{" "}
                          <span className="font-semibold">
                            {detail.partBComputation.sources.finalizedPayrollMonths}
                          </span>
                          {detail.partBComputation.payrollMonthsCovered.length
                            ? ` (${detail.partBComputation.payrollMonthsCovered.slice(0, 4).join(", ")}${
                                detail.partBComputation.payrollMonthsCovered.length > 4 ? "…" : ""
                              })`
                            : ""}
                        </p>
                        <p className="text-[11px] text-foreground">
                          Regime:{" "}
                          <span className="font-semibold">
                            {String(detail.partBComputation.sources.employeeTaxRegime)}
                          </span>
                        </p>
                        {detail.partBComputation.notes.slice(0, 3).map((n) => (
                          <p key={n} className="text-[10px] text-muted-foreground">
                            · {n}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Generate Part B to run Annual Tax Computation from these sources.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.partBStatus === "not_generated" || detail.form16Status !== "published" ? (
                      <Button
                        type="button"
                        size="sm"
                        className={hrBtn("h-8 text-xs gap-1.5", true)}
                        onClick={() => onGeneratePartB(detail)}
                        disabled={detail.form16Status === "published"}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {detail.partBStatus === "generated" ? "Regenerate Part B" : "Generate Part B"}
                      </Button>
                    ) : null}
                    {detail.partBStatus === "generated" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={hrBtn("h-8 text-xs gap-1.5")}
                        onClick={() => setPreviewId(detail.id)}
                      >
                        <FileText className="w-3.5 h-3.5" /> View Preview
                      </Button>
                    ) : null}
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Manual verification & signing
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow
                      label="Verified"
                      value={detail.verified ? `Yes · ${detail.verifiedBy} · ${detail.verifiedOn}` : "No"}
                    />
                    <InfoRow
                      label="Signed"
                      value={detail.signed ? `Yes · ${detail.signedBy} · ${detail.signedOn}` : "No"}
                    />
                    <InfoRow label="Signed remarks" value={detail.signedRemarks || "—"} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {!detail.verified ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={hrBtn("h-8 text-xs gap-1.5")}
                        onClick={() => afterMutation(markForm16Verified(detail.id), "Marked verified.")}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Verified
                      </Button>
                    ) : null}
                    {!detail.signed ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={hrBtn("h-8 text-xs gap-1.5")}
                        onClick={() =>
                          afterMutation(
                            markForm16Signed(detail.id),
                            "Marked signed (manual process outside PVB).",
                          )
                        }
                      >
                        <PenLine className="w-3.5 h-3.5" /> Mark Signed
                      </Button>
                    ) : null}
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Filing (manual · outside PVB)
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow
                      label="Filing status"
                      value={detail.filingStatus === "filed" ? "Filed" : "Not Filed"}
                    />
                    <InfoRow label="Filing date" value={detail.filingDate ?? "—"} />
                    <InfoRow label="Acknowledgement" value={detail.acknowledgementNumber || "—"} />
                    <InfoRow label="Remarks" value={detail.filingRemarks || "—"} />
                  </div>
                </section>

                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Form 16
                  </p>
                  <div className="rounded-[12px] border border-border bg-muted/20 px-3">
                    <InfoRow label="Status" value={form16StatusLabel(detail.form16Status)} />
                    <InfoRow label="Published" value={formatWhen(detail.publishedAt)} />
                    <InfoRow label="Published by" value={detail.publishedBy ?? "—"} />
                  </div>
                </section>
              </SheetBody>
              <SheetFooter className="gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={hrBtn("h-8 text-xs")}
                  onClick={() => setDetailId(null)}
                >
                  Close
                </Button>
                {detail.form16Status === "ready_to_publish" ? (
                  <Button
                    type="button"
                    size="sm"
                    className={hrBtn("h-8 text-xs gap-1.5", true)}
                    onClick={() => onPublish(detail)}
                  >
                    Publish Form 16
                  </Button>
                ) : null}
                {detail.form16Status === "published" ? (
                  <Button
                    type="button"
                    size="sm"
                    className={hrBtn("h-8 text-xs gap-1.5", true)}
                    onClick={() => setPreviewId(detail.id)}
                  >
                    <Download className="w-3.5 h-3.5" /> Download / Print
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Preview / print */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2 text-base">
              Form 16 Preview
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Demo Preview
              </span>
            </DialogTitle>
            <DialogDescription>
              Frontend demo document. Not an official Income Tax / TRACES Form 16.
            </DialogDescription>
          </DialogHeader>
          {preview ? <Form16PreviewDocument record={preview} /> : null}
          <DialogFooter className="print:hidden gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={hrBtn("h-8 text-xs")}
              onClick={() => setPreviewId(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              className={hrBtn("h-8 text-xs gap-1.5", true)}
              onClick={onPrintPreview}
            >
              <Printer className="w-3.5 h-3.5" /> Print Demo Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
          {toast}
        </div>
      ) : null}
    </>
  );
}
