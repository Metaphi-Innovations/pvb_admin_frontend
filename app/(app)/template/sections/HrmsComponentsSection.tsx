"use client";

import React, { useMemo, useState } from "react";
import {
  Search, ChevronsUpDown, Check, X, User, Building2, BadgeCheck, Users,
  MapPin, Calendar, CalendarDays, Wallet, Clock, TrendingUp, CheckCircle2,
  AlertCircle, FileText, Paperclip, Bell, Zap, SlidersHorizontal, Shield,
  GitBranch, Command, Loader2, Inbox, Plus, ChevronRight, ChevronLeft,
  MessageSquare, History, Filter, RotateCcw, Download, Eye, MoreHorizontal,
  ArrowRight, IndianRupee, Briefcase, Mail, Phone, Send, Upload, Lock,
  Unlock, GripVertical, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase, HrmsExampleLabel,
} from "../_components/SectionShell";
import { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent } from "../_components/TemplateTabs";
import {
  MOCK_EMPLOYEES, MOCK_DEPARTMENTS, MOCK_LEAVE_REQUESTS, MOCK_ATTENDANCE,
  MOCK_PAYROLL, MOCK_DOCUMENTS, initials, type MockEmployee,
} from "../mock/hrms-data";

// ── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  probation: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  notice: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  "on-leave": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  exited: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.active;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-foreground">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

interface SelectOption { value: string; label: string; sub?: string; meta?: string }

function MockAutocomplete({
  label, placeholder, options, value, onChange, icon: Icon = Search, required,
}: {
  label: string; placeholder: string; options: SelectOption[];
  value: string; onChange: (v: string) => void; icon?: React.ElementType; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(q.toLowerCase()) ||
    o.sub?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-1.5 relative">
      <FieldLabel required={required}>{label}</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full h-9 px-3 text-sm text-left border border-border rounded-[10px] bg-background",
          "flex items-center justify-between hover:bg-muted/30 transition-colors",
          open && "ring-2 ring-brand-300 border-brand-400",
        )}
      >
        <span className={cn("truncate", selected ? "text-foreground" : "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-[10px] border border-border bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Icon className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-[10px] border border-border focus:outline-none focus:ring-2 focus:ring-brand-300"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-[10px] transition-colors hover:bg-muted/60",
                  value === opt.value && "bg-brand-50",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{opt.label}</p>
                  {opt.sub && <p className="text-[11px] text-muted-foreground truncate">{opt.sub}</p>}
                </div>
                {opt.meta && <span className="text-[10px] font-mono text-brand-700 shrink-0">{opt.meta}</span>}
                {value === opt.value && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Selector components ───────────────────────────────────────────────────────

function EmployeeSelectorDemo() {
  const [val, setVal] = useState(MOCK_EMPLOYEES[0].id);
  const opts = MOCK_EMPLOYEES.map((e) => ({
    value: e.id, label: e.name, sub: `${e.designation} · ${e.department}`, meta: e.code,
  }));
  return <MockAutocomplete label="Employee" placeholder="Select employee…" options={opts} value={val} onChange={setVal} icon={User} required />;
}

function DepartmentSelectorDemo() {
  const [val, setVal] = useState(MOCK_DEPARTMENTS[0].code);
  const opts = MOCK_DEPARTMENTS.map((d) => ({
    value: d.code, label: d.name, sub: `Head: ${d.head}`, meta: `${d.count} emp`,
  }));
  return <MockAutocomplete label="Department" placeholder="Select department…" options={opts} value={val} onChange={setVal} icon={Building2} />;
}

function DesignationSelectorDemo() {
  const designations = [...new Set(MOCK_EMPLOYEES.map((e) => e.designation))];
  const [val, setVal] = useState(designations[0]);
  const opts = designations.map((d) => ({ value: d, label: d, sub: "Active designation" }));
  return <MockAutocomplete label="Designation" placeholder="Select designation…" options={opts} value={val} onChange={setVal} icon={BadgeCheck} />;
}

function ManagerLookupDemo() {
  const managers = [...new Set(MOCK_EMPLOYEES.map((e) => e.manager))];
  const [val, setVal] = useState(managers[0]);
  const opts = managers.map((m) => {
    const emp = MOCK_EMPLOYEES.find((e) => e.name === m);
    return { value: m, label: m, sub: emp?.designation ?? "Manager", meta: emp?.code };
  });
  return <MockAutocomplete label="Reporting manager" placeholder="Search manager…" options={opts} value={val} onChange={setVal} icon={Users} required />;
}

function BranchSelectorDemo() {
  const branches = [...new Set(MOCK_EMPLOYEES.map((e) => e.branch))];
  const [val, setVal] = useState(branches[0]);
  const opts = branches.map((b) => ({ value: b, label: b, sub: "Branch / location" }));
  return <MockAutocomplete label="Branch" placeholder="Select branch…" options={opts} value={val} onChange={setVal} icon={MapPin} />;
}

function FinancialYearSelectorDemo() {
  const fys = [
    { value: "2025-26", label: "FY 2025-26", sub: "Apr 1, 2025 – Mar 31, 2026", meta: "Live" },
    { value: "2024-25", label: "FY 2024-25", sub: "Closed · read-only", meta: "Closed" },
    { value: "2026-27", label: "FY 2026-27", sub: "Upcoming", meta: "Upcoming" },
  ];
  const [val, setVal] = useState("2025-26");
  return <MockAutocomplete label="Financial year" placeholder="Select FY…" options={fys} value={val} onChange={setVal} icon={Calendar} />;
}

function RoleSelectorDemo() {
  const roles = [
    { value: "hr-admin", label: "HR Admin", sub: "Full HR module access" },
    { value: "manager", label: "People Manager", sub: "Team approvals + directory" },
    { value: "employee", label: "Employee", sub: "Self-service only" },
    { value: "payroll", label: "Payroll Specialist", sub: "Compensation + payroll run" },
  ];
  const [val, setVal] = useState("manager");
  return <MockAutocomplete label="Role" placeholder="Select role…" options={roles} value={val} onChange={setVal} icon={Shield} />;
}

// ── Employee display components ───────────────────────────────────────────────

function EmployeeCard({ emp }: { emp: MockEmployee }) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm hover:shadow-card transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {initials(emp.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground truncate">{emp.name}</p>
            <StatusPill status={emp.status} />
          </div>
          <p className="text-[11px] font-mono text-brand-700 mt-0.5">{emp.code}</p>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{emp.designation}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{emp.department}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{emp.branch}</span>
          </div>
        </div>
        <button className="p-1.5 rounded-[10px] hover:bg-muted text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmployeeProfileHeaderCompact({ emp }: { emp: MockEmployee }) {
  return (
    <div className="rounded-[14px] border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[10px] bg-brand-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {initials(emp.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-navy-700">{emp.name}</h3>
            <StatusPill status={emp.status} />
          </div>
          <p className="text-[11px] font-mono text-brand-700">{emp.code}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{emp.designation} · {emp.department}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button className="h-8 px-2.5 text-xs rounded-[10px] border border-border hover:bg-muted inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button className="h-8 px-2.5 text-xs rounded-[10px] bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> View profile
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveBalanceCard() {
  const balances = [
    { type: "Casual", used: 3, total: 12, color: "bg-brand-600" },
    { type: "Sick", used: 1, total: 8, color: "bg-navy-600" },
    { type: "Earned", used: 5, total: 18, color: "bg-leaf-600" },
  ];
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-navy-700">Leave balance</p>
        <span className="text-[10px] text-muted-foreground">FY 2025-26</span>
      </div>
      {balances.map((b) => {
        const pct = Math.round(((b.total - b.used) / b.total) * 100);
        return (
          <div key={b.type}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-medium text-foreground">{b.type}</span>
              <span className="text-muted-foreground">{b.total - b.used} / {b.total} left</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full", b.color)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AttendanceSummaryCard() {
  const present = MOCK_ATTENDANCE.filter((a) => a.status === "present" || a.status === "late").length;
  const absent = MOCK_ATTENDANCE.filter((a) => a.status === "absent").length;
  const onLeave = MOCK_ATTENDANCE.filter((a) => a.status === "on-leave").length;
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-navy-700">Today&apos;s attendance</p>
        <span className="text-[10px] font-mono text-muted-foreground">03 Aug 2026</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Present", value: present, icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-50" },
          { label: "Absent", value: absent, icon: AlertCircle, accent: "text-red-600 bg-red-50" },
          { label: "On leave", value: onLeave, icon: CalendarDays, accent: "text-sky-600 bg-sky-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-[10px] border border-border/60 p-2 text-center">
              <div className={cn("w-7 h-7 rounded-[10px] mx-auto flex items-center justify-center mb-1", s.accent)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PayrollSummaryCard() {
  const cycle = MOCK_PAYROLL[2];
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-navy-700">Payroll — {cycle.cycle}</p>
          <p className="text-[11px] text-muted-foreground">{cycle.employees} employees</p>
        </div>
        <StatusPill status={cycle.status === "in-progress" ? "pending" : "approved"} />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-[10px] bg-muted/20 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gross</p>
          <p className="text-sm font-bold text-foreground">{cycle.gross}</p>
        </div>
        <div className="rounded-[10px] bg-muted/20 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net payable</p>
          <p className="text-sm font-bold text-foreground">{cycle.net}</p>
        </div>
      </div>
    </div>
  );
}

function SalaryRevisionCard() {
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Salary revision — Priya Sharma</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Effective 01 Sep 2026 · Annual increment</p>
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="text-muted-foreground line-through">₹8.2L CTC</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-semibold text-leaf-700">₹9.0L CTC</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-[6px]">+9.8%</span>
          </div>
        </div>
        <StatusPill status="pending" />
      </div>
    </div>
  );
}

// ── Workflow & approval ───────────────────────────────────────────────────────

function ApprovalCardDemo() {
  const req = MOCK_LEAVE_REQUESTS[0];
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-mono text-brand-700">{req.id}</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{req.type} leave · {req.days} day{req.days > 1 ? "s" : ""}</p>
          <p className="text-[11px] text-muted-foreground">{req.employee} · {req.from} → {req.to}</p>
        </div>
        <StatusPill status={req.status} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/60 pt-2">{req.reason}</p>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" className="h-8 text-xs flex-1 rounded-[10px]">Reject</Button>
        <Button size="sm" className="h-8 text-xs flex-1 rounded-[10px] bg-brand-600 hover:bg-brand-700">Approve</Button>
      </div>
    </div>
  );
}

function CompactApprovalTimeline() {
  const steps = [
    { label: "Submitted", actor: "Priya Sharma", status: "done" as const },
    { label: "L1 — Manager", actor: "Ananya Deshmukh", status: "active" as const },
    { label: "HR Review", actor: "HR Admin", status: "pending" as const },
  ];
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center min-w-[72px]">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
              step.status === "done" && "bg-emerald-500 text-white",
              step.status === "active" && "bg-brand-600 text-white ring-2 ring-brand-100",
              step.status === "pending" && "bg-white border-2 border-border text-muted-foreground",
            )}>
              {step.status === "done" ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <p className="text-[10px] font-medium text-foreground mt-1 text-center leading-tight">{step.label}</p>
            <p className="text-[9px] text-muted-foreground text-center truncate w-full">{step.actor}</p>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-0.5 flex-1 min-w-[16px] mb-6", step.status === "done" ? "bg-emerald-300" : "bg-border")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function AuditLogSnippet() {
  const entries = [
    { action: "Status changed", field: "employment_status", from: "Probation", to: "Active", by: "HR Admin", at: "02 Aug 2026 14:32" },
    { action: "Updated", field: "phone", from: "+91 98…210", to: "+91 98…211", by: "Self", at: "28 Jul 2026 09:15" },
    { action: "Document verified", field: "PAN Card", from: "Pending", to: "Verified", by: "HR Admin", at: "15 Jul 2026 11:00" },
  ];
  return (
    <div className="rounded-[14px] border border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[11px] font-semibold text-foreground">Audit log</p>
      </div>
      <div className="divide-y divide-border/60">
        {entries.map((e, i) => (
          <div key={i} className="px-3 py-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{e.action}</span>
              <span className="text-muted-foreground">{e.at}</span>
            </div>
            <p className="text-muted-foreground mt-0.5">
              <span className="font-mono text-brand-700">{e.field}</span>: {e.from} → {e.to} · by {e.by}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTimeline() {
  const items = [
    { icon: CalendarDays, color: "text-brand-600 bg-brand-50", label: "Leave applied", detail: "Casual leave · 10–11 Aug", time: "2h ago" },
    { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", label: "Attendance marked", detail: "In 09:12 · Out 18:05", time: "Today" },
    { icon: Wallet, color: "text-navy-600 bg-navy-50", label: "Payslip generated", detail: "Jul 2026 · ₹72,400 net", time: "31 Jul" },
    { icon: FileText, color: "text-amber-600 bg-amber-50", label: "Document uploaded", detail: "Form 16 FY25.pdf", time: "28 Jul" },
  ];
  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="flex gap-3 pb-3 last:pb-0">
            <div className={cn("w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0", item.color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 border-l-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkflowBuilderDemo() {
  const [steps, setSteps] = useState(["Submit", "Manager", "HR", "Payroll"]);
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-navy-700 mb-2">Approval workflow</p>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <span className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-[10px] border border-border bg-muted/20">
              <GripVertical className="w-3 h-3 text-muted-foreground" />
              {s}
              <button
                type="button"
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                className="ml-0.5 text-muted-foreground hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </React.Fragment>
        ))}
        <button
          type="button"
          onClick={() => setSteps([...steps, "New step"])}
          className="h-8 px-2.5 text-xs rounded-[10px] border border-dashed border-brand-300 text-brand-700 hover:bg-brand-50 inline-flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add step
        </button>
      </div>
    </div>
  );
}

// ── Collaboration ─────────────────────────────────────────────────────────────

function CommentsThreadDemo() {
  const comments = [
    { author: "Ananya Deshmukh", time: "Today 10:24", text: "Approved — please ensure handover notes before leave.", avatar: "AD" },
    { author: "Priya Sharma", time: "Today 09:15", text: "Applying for family function. Will complete pending onboarding checklist before leave.", avatar: "PS" },
  ];
  return (
    <div className="rounded-[14px] border border-border bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/20">
        <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
        </p>
      </div>
      <div className="p-3 space-y-3 max-h-36 overflow-y-auto">
        {comments.map((c, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center shrink-0">
              {c.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{c.author}</span>
                <span className="text-[10px] text-muted-foreground">{c.time}</span>
              </div>
              <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border flex gap-2">
        <input
          placeholder="Add a comment…"
          className="flex-1 h-8 px-3 text-xs rounded-[10px] border border-border focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button className="h-8 w-8 rounded-[10px] bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center justify-center">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AttachmentsListDemo() {
  const files = MOCK_DOCUMENTS.slice(0, 4);
  return (
    <div className="rounded-[14px] border border-border overflow-hidden">
      {files.map((f, i) => (
        <div key={f.id} className={cn("flex items-center gap-3 px-3 py-2.5", i > 0 && "border-t border-border/60")}>
          <div className="w-8 h-8 rounded-[10px] bg-muted/40 flex items-center justify-center shrink-0">
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
            <p className="text-[10px] text-muted-foreground">{f.size} · {f.uploadedBy}</p>
          </div>
          <StatusPill status={f.status === "verified" ? "approved" : f.status === "pending" ? "pending" : "rejected"} />
          <button className="p-1.5 rounded-[10px] hover:bg-muted text-muted-foreground">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button className="w-full px-3 py-2 text-xs text-brand-600 hover:bg-brand-50 border-t border-border inline-flex items-center justify-center gap-1.5">
        <Upload className="w-3.5 h-3.5" /> Upload attachment
      </button>
    </div>
  );
}

function NotificationCenterDemo() {
  const [open, setOpen] = useState(false);
  const notifs = [
    { id: 1, title: "Leave approval pending", body: "LR-2401 · Priya Sharma", unread: true, time: "5m" },
    { id: 2, title: "Payroll cycle started", body: "Aug 2026 · 251 employees", unread: true, time: "1h" },
    { id: 3, title: "Document expiring", body: "Medical Certificate · Amit Verma", unread: false, time: "Yesterday" },
  ];
  const unread = notifs.filter((n) => n.unread).length;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 rounded-[10px] border border-border hover:bg-muted inline-flex items-center justify-center"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-[14px] border border-border bg-white shadow-xl z-20 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Notifications</p>
            <button className="text-[10px] text-brand-600 hover:underline">Mark all read</button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border/60">
            {notifs.map((n) => (
              <button key={n.id} className={cn("w-full px-3 py-2.5 text-left hover:bg-muted/30", n.unread && "bg-brand-50/40")}>
                <div className="flex items-start gap-2">
                  {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionsDemo() {
  const actions = [
    { label: "Apply leave", icon: CalendarDays },
    { label: "Mark attendance", icon: Clock },
    { label: "View payslip", icon: Wallet },
    { label: "Upload doc", icon: Upload },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            className="rounded-[14px] border border-border bg-white p-3 shadow-sm hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-center"
          >
            <div className="w-9 h-9 rounded-[10px] bg-brand-600 text-white mx-auto flex items-center justify-center mb-2">
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-foreground">{a.label}</p>
          </button>
        );
      })}
    </div>
  );
}

// ── Search, filters, calendar ───────────────────────────────────────────────────

function AdvancedFilterPanelDemo() {
  const [dept, setDept] = useState<string[]>(["HR"]);
  const [status, setStatus] = useState<string[]>(["active"]);
  const toggle = (arr: string[], v: string, set: (v: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="rounded-[14px] border border-border bg-white overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Advanced filters
        </p>
        <button className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Department</p>
          <div className="flex flex-wrap gap-1.5">
            {MOCK_DEPARTMENTS.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => toggle(dept, d.code, setDept)}
                className={cn(
                  "h-7 px-2.5 text-[11px] rounded-[10px] border font-medium transition-colors",
                  dept.includes(d.code) ? "bg-brand-50 border-brand-400 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {["active", "probation", "on-leave", "notice"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(status, s, setStatus)}
                className={cn(
                  "h-7 px-2.5 text-[11px] rounded-[10px] border font-medium capitalize transition-colors",
                  status.includes(s) ? "bg-brand-50 border-brand-400 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {s.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-8 text-xs flex-1 rounded-[10px]">Cancel</Button>
          <Button size="sm" className="h-8 text-xs flex-1 rounded-[10px] bg-brand-600 hover:bg-brand-700">Apply filters</Button>
        </div>
      </div>
    </div>
  );
}

function PermissionMatrixDemo() {
  const perms = ["View", "Create", "Edit", "Approve", "Delete"];
  const modules = ["Employees", "Leave", "Payroll"];
  const matrix: Record<string, boolean[]> = {
    Employees: [true, true, true, false, false],
    Leave: [true, true, true, true, false],
    Payroll: [true, false, false, true, false],
  };
  return (
    <div className="rounded-[14px] border border-border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-foreground">Module</th>
            {perms.map((p) => (
              <th key={p} className="px-2 py-2 text-center font-semibold text-foreground">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium text-foreground">{m}</td>
              {matrix[m].map((on, i) => (
                <td key={i} className="px-2 py-2 text-center">
                  {on ? (
                    <Unlock className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarMonthStub() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const dates = Array.from({ length: 35 }, (_, i) => i - 2);
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <button className="p-1 rounded-[10px] hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-xs font-semibold text-navy-700">August 2026</p>
        <button className="p-1 rounded-[10px] hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {days.map((d) => (
          <span key={d} className="text-[10px] font-bold text-muted-foreground py-1">{d}</span>
        ))}
        {dates.map((d, i) => {
          const inMonth = d >= 1 && d <= 31;
          const isToday = d === 3;
          const isLeave = d === 10 || d === 11;
          return (
            <button
              key={i}
              type="button"
              disabled={!inMonth}
              className={cn(
                "h-7 text-[11px] rounded-[10px] transition-colors",
                !inMonth && "text-transparent pointer-events-none",
                inMonth && !isToday && !isLeave && "text-foreground hover:bg-muted",
                isToday && "bg-brand-600 text-white font-bold",
                isLeave && "bg-sky-100 text-sky-700 font-medium",
              )}
            >
              {inMonth ? d : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePickerStub() {
  const [from, setFrom] = useState("2026-08-10");
  const [to, setTo] = useState("2026-08-11");
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm space-y-2">
      <p className="text-xs font-semibold text-navy-700">Date range</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <FieldLabel>From</FieldLabel>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-[10px] border border-border focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
        <div className="space-y-1">
          <FieldLabel>To</FieldLabel>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-[10px] border border-border focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">2 days selected · Casual leave</p>
    </div>
  );
}

function UniversalSearchDemo() {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    return MOCK_EMPLOYEES.filter((e) =>
      e.name.toLowerCase().includes(lower) || e.code.toLowerCase().includes(lower),
    ).slice(0, 4);
  }, [q]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employees, documents, policies…"
          className="w-full h-9 pl-10 pr-4 text-sm rounded-[10px] border border-border focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      {q && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-[14px] border border-border bg-white shadow-xl z-10 overflow-hidden">
          {results.length > 0 ? (
            <>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">Employees</p>
              {results.map((e) => (
                <button key={e.id} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 text-left">
                  <div className="w-7 h-7 rounded-[10px] bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {initials(e.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground">{e.designation}</p>
                  </div>
                  <span className="text-[10px] font-mono text-brand-700">{e.code}</span>
                </button>
              ))}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No results for &quot;{q}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}

function CommandPaletteStub() {
  const [open, setOpen] = useState(true);
  const cmds = [
    { group: "Navigate", items: [{ label: "Employee Directory", shortcut: "G D" }, { label: "Leave approvals", shortcut: "G L" }] },
    { group: "Actions", items: [{ label: "Apply leave", shortcut: "N L" }, { label: "New employee", shortcut: "N E" }] },
  ];
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-3 text-xs rounded-[10px] border border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-2"
      >
        <Command className="w-3.5 h-3.5" /> Open command palette
        <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded-[6px] font-mono">⌘K</kbd>
      </button>
    );
  }
  return (
    <div className="rounded-[14px] border border-border bg-white shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Command className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Type a command or search…"
          className="flex-1 text-sm bg-transparent focus:outline-none"
          autoFocus
        />
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-44 overflow-y-auto p-1">
        {cmds.map((g) => (
          <div key={g.group}>
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{g.group}</p>
            {g.items.map((item) => (
              <button key={item.label} className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[10px] hover:bg-brand-50 text-left">
                <span className="text-xs text-foreground">{item.label}</span>
                <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-[6px] font-mono">{item.shortcut}</kbd>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeletonDemo() {
  return (
    <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
          <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted/60 animate-pulse rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}

function EmptyStateDemo() {
  return (
    <div className="rounded-[14px] border border-border bg-muted/20 p-8 flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Inbox className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No leave requests</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">You have no pending or approved leave for this period.</p>
      <Button size="sm" className="mt-4 h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Apply leave
      </Button>
    </div>
  );
}

// ── Gallery grid wrapper ──────────────────────────────────────────────────────

function ComponentTile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
        {title}
        <HrmsExampleLabel />
      </p>
      {children}
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function HrmsComponentsSection() {
  const featured = MOCK_EMPLOYEES[0];

  return (
    <SectionShell overview="Production-ready HRMS component patterns: searchable selectors, employee identity cards, leave and payroll summaries, approval workflows, collaboration widgets, permission matrices, and global search. All previews use template mock data — radius 14px cards, 10px inputs/buttons, Dharitri Sutra brand tokens.">
      <SectionBlock
        title="Component gallery"
        subtitle="Interactive and static previews grouped by domain — reference before building HRMS screens"
      >
        <TplTabs defaultValue="selectors">
          <TplTabsList variant="pill" className="flex-wrap">
            <TplTabsTrigger value="selectors" variant="pill">Selectors</TplTabsTrigger>
            <TplTabsTrigger value="employee" variant="pill" count={6}>Employee</TplTabsTrigger>
            <TplTabsTrigger value="workflow" variant="pill">Workflow</TplTabsTrigger>
            <TplTabsTrigger value="collab" variant="pill">Collaboration</TplTabsTrigger>
            <TplTabsTrigger value="search" variant="pill">Search &amp; filters</TplTabsTrigger>
            <TplTabsTrigger value="system" variant="pill">System</TplTabsTrigger>
          </TplTabsList>

          <TplTabsContent value="selectors">
            <PreviewFrame title="HRMS selectors — Popover-style autocomplete">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ComponentTile title="Employee selector"><EmployeeSelectorDemo /></ComponentTile>
                <ComponentTile title="Department selector"><DepartmentSelectorDemo /></ComponentTile>
                <ComponentTile title="Designation selector"><DesignationSelectorDemo /></ComponentTile>
                <ComponentTile title="Manager lookup"><ManagerLookupDemo /></ComponentTile>
                <ComponentTile title="Branch selector"><BranchSelectorDemo /></ComponentTile>
                <ComponentTile title="Financial year selector"><FinancialYearSelectorDemo /></ComponentTile>
                <ComponentTile title="Role selector"><RoleSelectorDemo /></ComponentTile>
              </div>
            </PreviewFrame>
          </TplTabsContent>

          <TplTabsContent value="employee">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComponentTile title="Employee card">
                <EmployeeCard emp={MOCK_EMPLOYEES[1]} />
              </ComponentTile>
              <ComponentTile title="Profile header (compact)">
                <EmployeeProfileHeaderCompact emp={featured} />
              </ComponentTile>
              <ComponentTile title="Leave balance card"><LeaveBalanceCard /></ComponentTile>
              <ComponentTile title="Attendance summary"><AttendanceSummaryCard /></ComponentTile>
              <ComponentTile title="Payroll summary"><PayrollSummaryCard /></ComponentTile>
              <ComponentTile title="Salary revision card"><SalaryRevisionCard /></ComponentTile>
            </div>
          </TplTabsContent>

          <TplTabsContent value="workflow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComponentTile title="Approval card"><ApprovalCardDemo /></ComponentTile>
              <ComponentTile title="Approval timeline (compact)">
                <div className="rounded-[14px] border border-border bg-white p-4 shadow-sm">
                  <CompactApprovalTimeline />
                </div>
              </ComponentTile>
              <ComponentTile title="Audit log snippet"><AuditLogSnippet /></ComponentTile>
              <ComponentTile title="Activity timeline">
                <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
                  <ActivityTimeline />
                </div>
              </ComponentTile>
              <ComponentTile title="Workflow builder" >
                <WorkflowBuilderDemo />
              </ComponentTile>
            </div>
          </TplTabsContent>

          <TplTabsContent value="collab">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComponentTile title="Comments thread"><CommentsThreadDemo /></ComponentTile>
              <ComponentTile title="Attachments list"><AttachmentsListDemo /></ComponentTile>
              <ComponentTile title="Notification center">
                <div className="rounded-[14px] border border-border bg-muted/20 p-6 flex justify-center">
                  <NotificationCenterDemo />
                </div>
              </ComponentTile>
              <ComponentTile title="Quick actions"><QuickActionsDemo /></ComponentTile>
            </div>
          </TplTabsContent>

          <TplTabsContent value="search">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComponentTile title="Universal search"><UniversalSearchDemo /></ComponentTile>
              <ComponentTile title="Advanced filter panel"><AdvancedFilterPanelDemo /></ComponentTile>
              <ComponentTile title="Command palette (⌘K)"><CommandPaletteStub /></ComponentTile>
              <ComponentTile title="Calendar month stub"><CalendarMonthStub /></ComponentTile>
              <ComponentTile title="Date range picker"><DateRangePickerStub /></ComponentTile>
            </div>
          </TplTabsContent>

          <TplTabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComponentTile title="Permission matrix"><PermissionMatrixDemo /></ComponentTile>
              <ComponentTile title="Loading skeleton"><LoadingSkeletonDemo /></ComponentTile>
              <ComponentTile title="Empty state"><EmptyStateDemo /></ComponentTile>
            </div>
          </TplTabsContent>
        </TplTabs>
      </SectionBlock>

      <SectionBlock title="Real HRMS example" subtitle="Composite leave approval drawer context using multiple patterns together">
        <PreviewFrame title="Leave request review — multi-component layout">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <EmployeeProfileHeaderCompact emp={featured} />
              <div className="grid grid-cols-2 gap-3">
                <LeaveBalanceCard />
                <DateRangePickerStub />
              </div>
              <ApprovalCardDemo />
              <CommentsThreadDemo />
            </div>
            <div className="space-y-3">
              <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Approval chain</p>
                <CompactApprovalTimeline />
              </div>
              <ActivityTimeline />
              <AttachmentsListDemo />
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="Variants" subtitle="Density and layout options for the same primitives">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PreviewFrame title="Compact employee card">
            <EmployeeCard emp={MOCK_EMPLOYEES[2]} />
          </PreviewFrame>
          <PreviewFrame title="Inline status + actions">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status="active" />
              <StatusPill status="pending" />
              <StatusPill status="on-leave" />
              <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-[10px]">View</Button>
              <Button size="sm" className="h-7 text-[11px] rounded-[10px] bg-brand-600 hover:bg-brand-700">Approve</Button>
            </div>
          </PreviewFrame>
          <PreviewFrame title="Icon-only quick actions">
            <div className="flex gap-2">
              {[Zap, Filter, GitBranch, LayoutGrid].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-[10px] border border-border hover:bg-brand-50 hover:border-brand-300 inline-flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </PreviewFrame>
        </div>
      </SectionBlock>

      <ErpUseCase
        title="Shared selectors across HRMS and Finance"
        description="Employee, branch, and financial year selectors must behave identically in HRMS (leave, payroll) and Accounts (reimbursements, journal entries). Use the same autocomplete shell, debounced server search for 500+ employees, and FY-scoped option lists."
      />

      <BestPractices items={[
        "Never use native <select> — always Popover + searchable list for HRMS pickers.",
        "Show employee code (font-mono, brand-700) alongside name in every employee selector.",
        "Scope all transactional widgets (leave balance, payroll, attendance) to selected FY.",
        "Approval cards must surface actor, dates, and one-click approve/reject without navigation.",
        "Permission matrix is read-only in UI — edits go through Role management, not inline toggles.",
        "Empty states always include a contextual CTA (Apply leave, Add employee, Clear filters).",
      ]} />

      <DoDont
        dos={[
          "Use rounded-[14px] for cards and rounded-[10px] for inputs, buttons, chips.",
          "Reuse initials avatar pattern with brand-600 background for employee identity.",
          "Group gallery tabs by user journey: selectors → employee → workflow → collaboration.",
          "Show loading skeletons that mirror final layout (avatar + 2 text lines + rows).",
          "Keep approval timeline compact (horizontal) in drawers; vertical in full pages.",
        ]}
        donts={[
          "Don't hardcode hex colors — use brand-*, navy-*, leaf-* tokens only.",
          "Don't mix emerald and brand orange for the same active/approved semantic.",
          "Don't build manager lookup without department/designation context in results.",
          "Don't show permission delete toggles without confirmation and audit trail.",
          "Don't use consumer-grade airy spacing (space-y-6) in HRMS dense layouts.",
        ]}
      />

      <TokenUsage tokens={[
        { token: "rounded-[14px]", use: "Cards, preview frames, table containers, notification popover" },
        { token: "rounded-[10px]", use: "Inputs h-9, buttons, chips, calendar cells, autocomplete dropdown" },
        { token: "bg-brand-600", use: "Primary CTAs, avatar fills, active calendar day, notification badge" },
        { token: "text-navy-700", use: "Section titles, card headers, calendar month label" },
        { token: "text-brand-700 / font-mono", use: "Employee codes, voucher IDs, audit field names" },
        { token: "bg-brand-50", use: "Selected autocomplete row, active filter chip, unread notification tint" },
        { token: "bg-emerald-50 / text-emerald-700", use: "Approved/active status — not brand orange" },
        { token: "ring-brand-300", use: "Focus ring on inputs, autocomplete trigger, tab focus" },
      ]} />

      <AccessibilityNotes items={[
        "Autocomplete triggers need aria-expanded and aria-haspopup; listbox options use role=option.",
        "Notification badge count must be announced to screen readers (aria-label with unread count).",
        "Approval action buttons need discernible labels — not icon-only for Approve/Reject.",
        "Permission matrix: use aria-label on lock/unlock icons ('Edit permission granted').",
        "Command palette: trap focus while open; Escape closes; arrow keys navigate results.",
        "Calendar stub: disabled out-of-month cells use aria-hidden; today has aria-current=date.",
      ]} />

      <ProductionNotes items={[
        "Wire employee/manager selectors to async API with 300ms debounce after 500+ records.",
        "FY selector must trigger read-only mode warning when switching to closed/archived years.",
        "Approval timeline steps map to backend workflow engine — don't hardcode step count in production.",
        "Audit log snippet is a truncated view; full history lives on dedicated Audit tab with pagination.",
        "Command palette shortcuts are tenant-configurable; mock shortcuts here are illustrative only.",
        "Extract repeated MockAutocomplete into components/hrms/ when second production module adopts it.",
      ]} />
    </SectionShell>
  );
}
