"use client";

import React, { useCallback, useState } from "react";
import {
  User, Briefcase, Building2, CalendarDays, Network, BadgeCheck, Timer,
  TreePalm, Calculator, TrendingUp, Target, Receipt, FileSignature,
  UserCheck, LogOut, Upload, Save, X, ArrowLeft, AlertCircle, AlertTriangle,
  ChevronDown, Pencil, Eye, Check, FileText, Mail, Wallet,
  Clock, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase, HrmsExampleLabel,
} from "../_components/SectionShell";
import { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent } from "../_components/TemplateTabs";
import {
  MOCK_EMPLOYEES, MOCK_DEPARTMENTS, MOCK_SHIFTS, MOCK_LEAVE_REQUESTS,
  MOCK_CANDIDATES, MOCK_DOCUMENTS,
} from "../mock/hrms-data";

// ── Shared form atoms ────────────────────────────────────────────────────────

const INPUT_CLS = cn(
  "h-9 text-sm rounded-[10px] border border-border",
  "focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
);

function FormSectionDivider({ title }: { title: string }) {
  return (
    <div className="pb-2.5 border-b border-border mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  );
}

function MockSelect({
  label, placeholder, value, required, helper, error, className,
}: {
  label: string; placeholder: string; value?: string; required?: boolean;
  helper?: string; error?: string; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <button
        type="button"
        className={cn(
          "w-full h-9 px-3 text-sm text-left border rounded-[10px] bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
          error ? "border-red-400" : "border-border",
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      ) : helper ? (
        <p className="text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function FormField({
  label, required, helper, error, readOnly, children, className,
}: {
  label: string; required?: boolean; helper?: string; error?: string;
  readOnly?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label} {required && !readOnly && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      ) : helper ? (
        <p className="text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function TextInput({
  label, value, onChange, placeholder, required, helper, error, readOnly,
  type = "text", mono, className,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; required?: boolean; helper?: string; error?: string;
  readOnly?: boolean; type?: string; mono?: boolean; className?: string;
}) {
  if (readOnly) {
    return (
      <FormField label={label} required={required} helper={helper} className={className}>
        <p className="text-[13px] text-foreground py-1.5">{value || "—"}</p>
      </FormField>
    );
  }
  return (
    <FormField label={label} required={required} helper={helper} error={error} className={className}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_CLS, mono && "font-mono", error && "border-red-400 focus-visible:ring-red-300")}
      />
    </FormField>
  );
}

function StatusToggleCard({
  label, description, active, onChange, readOnly, className,
}: {
  label: string; description: string; active: boolean;
  onChange?: (v: boolean) => void; readOnly?: boolean; className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between p-3 rounded-[14px] border border-border bg-muted/20", className)}>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      {readOnly ? (
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
        )}>
          {active ? "Active" : "Inactive"}
        </span>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-medium", active ? "text-emerald-600" : "text-muted-foreground")}>
            {active ? "Active" : "Inactive"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => onChange?.(!active)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              active ? "bg-brand-600" : "bg-muted",
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              active ? "translate-x-4" : "translate-x-0",
            )} />
          </button>
        </div>
      )}
    </div>
  );
}

function AuditMetadata({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-[12px] border border-border bg-muted/20 px-3 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
      {rows.map((r) => (
        <div key={r.label}>
          <span className="text-muted-foreground">{r.label}</span>
          <p className="font-medium text-foreground">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function StickyFormActions({
  dirty, onDiscard, onDraft, onSave, readOnly, onEdit,
}: {
  dirty?: boolean; onDiscard?: () => void; onDraft?: () => void;
  onSave?: () => void; readOnly?: boolean; onEdit?: () => void;
}) {
  if (readOnly) {
    return (
      <div className="sticky bottom-0 border-t border-border bg-muted/20 px-4 py-2.5 flex justify-end rounded-b-[14px]">
        <Button size="sm" className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
      </div>
    );
  }
  return (
    <div className="sticky bottom-0 border-t border-border bg-white px-4 py-2.5 flex items-center gap-2 rounded-b-[14px]">
      {dirty ? (
        <p className="text-[11px] text-amber-700 mr-auto flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
        </p>
      ) : (
        <div className="mr-auto" />
      )}
      <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={onDiscard}>
        <X className="w-3.5 h-3.5 mr-1" /> Discard
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={onDraft}>
        Save draft
      </Button>
      <Button size="sm" className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white" onClick={onSave}>
        <Save className="w-3.5 h-3.5 mr-1" /> Save &amp; Publish
      </Button>
    </div>
  );
}

function UnsavedDialog({
  open, onClose, onConfirm,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-[14px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            Discard unsaved changes?
          </DialogTitle>
          <DialogDescription className="pt-1">
            You have unsaved edits. Leaving now will discard them.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={onClose}>
            Keep editing
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => { onConfirm(); onClose(); }}
          >
            Discard changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Form definitions ─────────────────────────────────────────────────────────

const FORM_OPTIONS = [
  { id: "employee", label: "Employee Creation", icon: User, group: "People" },
  { id: "leave", label: "Leave Application", icon: CalendarDays, group: "Self-service" },
  { id: "attendance-reg", label: "Attendance Regularization", icon: Clock, group: "Self-service" },
  { id: "department", label: "Department Master", icon: Network, group: "Masters" },
  { id: "designation", label: "Designation Master", icon: BadgeCheck, group: "Masters" },
  { id: "shift", label: "Shift Master", icon: Timer, group: "Masters" },
  { id: "holiday", label: "Holiday Master", icon: TreePalm, group: "Masters" },
  { id: "org", label: "Organization Setup", icon: Building2, group: "Setup" },
  { id: "payroll-setup", label: "Payroll Setup", icon: Calculator, group: "Setup" },
  { id: "salary", label: "Salary Revision", icon: TrendingUp, group: "Compensation" },
  { id: "performance", label: "Performance Review", icon: Target, group: "Talent" },
  { id: "expense", label: "Expense Claim", icon: Receipt, group: "Self-service" },
  { id: "offer", label: "Offer Letter", icon: FileSignature, group: "Talent" },
  { id: "joining", label: "Joining Form", icon: UserCheck, group: "Talent" },
  { id: "exit", label: "Exit Clearance", icon: LogOut, group: "Talent" },
  { id: "document", label: "Document Upload", icon: Upload, group: "Self-service" },
] as const;

type FormId = (typeof FORM_OPTIONS)[number]["id"];

const EMP_SECTIONS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "employment", label: "Employment", icon: Briefcase },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "compliance", label: "Compliance", icon: Shield },
];

function EmployeeCreationForm() {
  const seed = MOCK_EMPLOYEES[2];
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState("personal");
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    firstName: seed.name.split(" ")[0],
    lastName: seed.name.split(" ")[1] ?? "",
    email: seed.email,
    phone: seed.phone,
    department: seed.department,
    designation: seed.designation,
    branch: seed.branch,
    manager: seed.manager,
    doj: seed.doj,
    pan: "",
    uan: "",
    bankAccount: "",
  });

  const set = useCallback((key: keyof typeof form, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }, []);

  const guard = (action: () => void) => {
    if (dirty && editMode) {
      setPendingAction(() => action);
      setUnsavedOpen(true);
    } else {
      action();
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.email.trim()) e.email = "Work email is required";
    else if (!form.email.includes("@")) e.email = "Enter a valid email address";
    if (!form.pan.trim()) e.pan = "PAN is required for payroll";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setDirty(false);
  };

  const handleDiscard = () => {
    guard(() => { setEditMode(false); setDirty(false); setErrors({}); });
  };

  const tryLeaveEdit = () => guard(() => setEditMode(false));

  return (
    <div className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-2.5 flex items-center gap-3">
        <button type="button" className="p-1.5 hover:bg-muted rounded-[10px] text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-navy-700">New Employee</h2>
            <HrmsExampleLabel>{null}</HrmsExampleLabel>
            {editMode && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[6px]">
                Edit mode
              </span>
            )}
            {!editMode && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-navy-700 bg-navy-50 border border-navy-100 px-1.5 py-0.5 rounded-[6px] inline-flex items-center gap-1">
                <Eye className="w-3 h-3" /> View mode
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">HR → People → Employee Directory → Create</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => editMode ? tryLeaveEdit() : setEditMode(true)}
            className={cn(
              "h-8 px-3 text-xs rounded-[10px] border font-medium transition-colors",
              editMode ? "border-border text-muted-foreground hover:bg-muted" : "bg-brand-600 text-white border-brand-600",
            )}
          >
            {editMode ? "Switch to view" : "Switch to edit"}
          </button>
        </div>
      </div>

      <div className="flex min-h-[380px]">
        {/* Section nav sidebar */}
        <aside className="w-40 shrink-0 border-r border-border bg-muted/20 p-1.5 space-y-0.5">
          {EMP_SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => guard(() => setSection(s.id))}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-xs font-medium text-left transition-colors",
                  active ? "bg-brand-50 text-brand-700 border-l-2 border-brand-600" : "text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", active ? "text-brand-600" : "text-muted-foreground")} />
                {s.label}
              </button>
            );
          })}
        </aside>

        {/* Scrollable form body */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 overflow-y-auto max-h-[340px] space-y-4">
            {section === "personal" && (
              <>
                <FormSectionDivider title="Personal details" />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} required error={errors.firstName} readOnly={!editMode} />
                  <TextInput label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} readOnly={!editMode} />
                  <TextInput label="Work email" value={form.email} onChange={(v) => set("email", v)} required helper="Used for login and payslip delivery" error={errors.email} readOnly={!editMode} className="col-span-2 sm:col-span-1" />
                  <TextInput label="Mobile" value={form.phone} onChange={(v) => set("phone", v)} required readOnly={!editMode} />
                </div>
              </>
            )}
            {section === "employment" && (
              <>
                <FormSectionDivider title="Employment" />
                <div className="grid grid-cols-2 gap-3">
                  {editMode ? (
                    <>
                      <MockSelect label="Department" placeholder="Select department…" value={form.department} required helper="Determines approval hierarchy" />
                      <MockSelect label="Designation" placeholder="Select designation…" value={form.designation} required />
                      <MockSelect label="Branch / Location" placeholder="Select branch…" value={form.branch} required />
                      <MockSelect label="Reporting manager" placeholder="Search employee…" value={form.manager} required helper="Must be an active employee" />
                      <TextInput label="Date of joining" value={form.doj} onChange={(v) => set("doj", v)} type="date" required readOnly={false} />
                    </>
                  ) : (
                    <>
                      <TextInput label="Department" value={form.department} readOnly />
                      <TextInput label="Designation" value={form.designation} readOnly />
                      <TextInput label="Branch" value={form.branch} readOnly />
                      <TextInput label="Reporting manager" value={form.manager} readOnly />
                      <TextInput label="Date of joining" value={form.doj} readOnly />
                    </>
                  )}
                </div>
              </>
            )}
            {section === "contact" && (
              <>
                <FormSectionDivider title="Contact & address" />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Personal email" value="" onChange={() => setDirty(true)} placeholder="optional@email.com" readOnly={!editMode} />
                  <TextInput label="Emergency contact" value="" onChange={() => setDirty(true)} placeholder="+91 …" required readOnly={!editMode} />
                  <FormField label="Current address" required={editMode} className="col-span-2">
                    {editMode ? (
                      <textarea rows={2} placeholder="House no., street, city, PIN…" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" onChange={() => setDirty(true)} />
                    ) : (
                      <p className="text-[13px] text-muted-foreground py-1">Not provided yet</p>
                    )}
                  </FormField>
                </div>
              </>
            )}
            {section === "payroll" && (
              <>
                <FormSectionDivider title="Payroll & bank" />
                <div className="grid grid-cols-2 gap-3">
                  <MockSelect label="Pay group" placeholder="Select pay group…" value="Monthly — HO" required />
                  <MockSelect label="Shift" placeholder="Select shift…" value={MOCK_SHIFTS[0].name} required />
                  <TextInput label="Bank account" value={form.bankAccount} onChange={(v) => set("bankAccount", v)} placeholder="Account number" helper="Verified via penny drop" readOnly={!editMode} />
                  <TextInput label="IFSC" value="" onChange={() => setDirty(true)} placeholder="SBIN0001234" mono readOnly={!editMode} />
                </div>
              </>
            )}
            {section === "compliance" && (
              <>
                <FormSectionDivider title="Statutory & compliance" />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="PAN" value={form.pan} onChange={(v) => set("pan", v)} placeholder="ABCDE1234F" required mono error={errors.pan} helper="Required before first payroll run" readOnly={!editMode} />
                  <TextInput label="UAN (PF)" value={form.uan} onChange={(v) => set("uan", v)} placeholder="12-digit UAN" readOnly={!editMode} />
                  <TextInput label="Aadhaar (last 4)" value="" onChange={() => setDirty(true)} placeholder="XXXX" readOnly={!editMode} />
                  <MockSelect label="Tax regime" placeholder="Select regime…" value="New regime (FY26)" required />
                </div>
                {editMode && Object.keys(errors).length > 0 && (
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-red-700">Fix validation errors before publishing. Required fields are marked with *.</p>
                  </div>
                )}
              </>
            )}
          </div>

          <StickyFormActions
            dirty={dirty}
            readOnly={!editMode}
            onEdit={() => setEditMode(true)}
            onDiscard={handleDiscard}
            onDraft={() => setDirty(false)}
            onSave={handleSave}
          />
        </div>

        {/* Right metadata sidebar */}
        <aside className="w-44 shrink-0 border-l border-border bg-muted/20 p-3 space-y-4 hidden lg:block">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Progress</p>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-leaf-600 rounded-full" style={{ width: `${seed.profilePct}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{seed.profilePct}% complete</p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Draft status</p>
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Draft
            </span>
          </div>
          <div className="border-t border-border pt-3 space-y-1.5 text-[11px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Record info</p>
            <div><span className="text-muted-foreground">Created by</span><p className="font-medium">HR Admin</p></div>
            <div><span className="text-muted-foreground">Created</span><p className="font-medium">—</p></div>
          </div>
        </aside>
      </div>

      <div className="border-t border-border p-3">
        <AuditMetadata rows={[
          { label: "Created by", value: "HR Admin" },
          { label: "Created", value: "—" },
          { label: "Updated by", value: "—" },
          { label: "Updated", value: "—" },
        ]} />
      </div>

      <UnsavedDialog
        open={unsavedOpen}
        onClose={() => { setUnsavedOpen(false); setPendingAction(null); }}
        onConfirm={() => { pendingAction?.(); setDirty(false); setPendingAction(null); }}
      />
    </div>
  );
}

function CompactMasterForm({
  title, breadcrumb, children, onSave,
}: {
  title: string; breadcrumb: string; children: React.ReactNode; onSave?: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  return (
    <div className="rounded-[14px] border border-border bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-700">{title}</p>
          <p className="text-[11px] text-muted-foreground">{breadcrumb}</p>
        </div>
      </div>
      <div className="p-4 space-y-4" onChange={() => setDirty(true)}>
        {children}
      </div>
      <StickyFormActions dirty={dirty} onDiscard={() => setDirty(false)} onDraft={() => setDirty(false)} onSave={() => { onSave?.(); setDirty(false); }} />
    </div>
  );
}

function LeaveApplicationForm() {
  const lr = MOCK_LEAVE_REQUESTS[0];
  const [errors] = useState({ to: "End date must be on or after start date" });
  return (
    <CompactMasterForm title="Apply for Leave" breadcrumb="My Workspace → Leave → New request">
      <FormSectionDivider title="Leave details" />
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Leave type" placeholder="Select type…" value={`${lr.type} Leave`} required helper="Balance: Casual 6 / 12 remaining" />
        <TextInput label="Start date" value={lr.from} onChange={() => {}} type="date" required />
        <TextInput label="End date" value={lr.to} onChange={() => {}} type="date" required error={errors.to} />
        <FormField label="Half day" helper="Apply only for single-day requests">
          <div className="flex gap-2">
            {["Full day", "First half", "Second half"].map((o) => (
              <button key={o} type="button" className={cn(
                "h-8 px-2.5 text-xs rounded-[10px] border font-medium",
                o === "Full day" ? "bg-brand-50 border-brand-400 text-brand-700" : "border-border text-muted-foreground",
              )}>{o}</button>
            ))}
          </div>
        </FormField>
        <FormField label="Reason" required className="col-span-2">
          <textarea rows={2} defaultValue={lr.reason} className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          <p className="text-[11px] text-muted-foreground">Visible to your reporting manager</p>
        </FormField>
        <MockSelect label="Handover to" placeholder="Select colleague…" helper="Optional — for planned leave" className="col-span-2" />
      </div>
    </CompactMasterForm>
  );
}

function AttendanceRegularizationForm() {
  return (
    <CompactMasterForm title="Attendance Regularization" breadcrumb="My Workspace → Attendance → Regularize">
      <FormSectionDivider title="Punch correction" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Date" value="2026-08-03" onChange={() => {}} type="date" required />
        <MockSelect label="Request type" placeholder="Select…" value="Missed punch-out" required />
        <TextInput label="Actual in time" value="09:12" onChange={() => {}} type="time" required />
        <TextInput label="Actual out time" value="18:05" onChange={() => {}} type="time" required error="Out time must be after in time when both are set" />
        <MockSelect label="Shift" placeholder="Select…" value="General (09:00–18:00)" required />
        <MockSelect label="Approver" placeholder="Manager lookup…" value="Ananya Deshmukh" required helper="Defaults to reporting manager" />
        <FormField label="Reason" required className="col-span-2">
          <textarea rows={2} defaultValue="Client site visit — network drop caused missed punch-out." className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          <p className="text-[11px] text-muted-foreground">Attach supporting evidence if available</p>
        </FormField>
        <FormField label="Attachment" className="col-span-2">
          <button type="button" className="h-9 px-3 text-xs rounded-[10px] border border-dashed border-border inline-flex items-center gap-1.5 text-muted-foreground hover:bg-muted/40">
            <Upload className="w-3.5 h-3.5" /> Upload gate pass / email proof
          </button>
        </FormField>
      </div>
      <AuditMetadata rows={[
        { label: "System punch in", value: "09:12" },
        { label: "System punch out", value: "—" },
        { label: "Policy", value: "Max 2 regularizations / month" },
        { label: "Used this month", value: "1" },
      ]} />
    </CompactMasterForm>
  );
}

function DepartmentMasterForm() {
  const dept = MOCK_DEPARTMENTS[0];
  const [active, setActive] = useState(true);
  return (
    <CompactMasterForm title="Department Master" breadcrumb="HR → Admin → Departments → Edit">
      <FormSectionDivider title="Basic information" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Department name" value={dept.name} onChange={() => {}} required />
        <TextInput label="Code" value={dept.code} onChange={() => {}} required mono helper="Uppercase, no spaces — e.g. HR, FIN" />
        <MockSelect label="Department head" placeholder="Search employee…" value={dept.head} required />
        <TextInput label="Cost centre" value="CC-HO-001" onChange={() => {}} mono />
        <StatusToggleCard label="Active status" description={active ? "Visible in org chart and lookups" : "Hidden from new assignments"} active={active} onChange={setActive} />
        <FormField label="Remarks" className="col-span-2">
          <textarea rows={2} placeholder="Optional notes…" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
      </div>
      <AuditMetadata rows={[
        { label: "Employees", value: String(dept.count) },
        { label: "Created by", value: "Admin" },
        { label: "Updated by", value: "Ananya Deshmukh" },
        { label: "Updated", value: "15 Jul 2026" },
      ]} />
    </CompactMasterForm>
  );
}

function DesignationMasterForm() {
  return (
    <CompactMasterForm title="Designation Master" breadcrumb="HR → Admin → Designations → New">
      <FormSectionDivider title="Designation" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Title" value="" onChange={() => {}} placeholder="e.g. HR Business Partner" required />
        <TextInput label="Code" value="" onChange={() => {}} placeholder="DESIG-HR-01" required mono error="" helper="Unique across organization" />
        <MockSelect label="Department" placeholder="Select department…" value="Human Resources" required />
        <MockSelect label="Grade / band" placeholder="Select grade…" required helper="Drives compensation ranges" />
        <MockSelect label="Reports to (designation)" placeholder="Select designation…" />
        <StatusToggleCard label="Active" description="Inactive designations cannot be assigned" active={true} onChange={() => {}} />
      </div>
    </CompactMasterForm>
  );
}

function ShiftMasterForm() {
  const shift = MOCK_SHIFTS[1];
  return (
    <CompactMasterForm title="Shift Master" breadcrumb="HR → Admin → Shifts → Edit">
      <FormSectionDivider title="Shift timing" />
      <div className="grid grid-cols-3 gap-3">
        <TextInput label="Shift name" value={shift.name} onChange={() => {}} required />
        <TextInput label="Code" value={shift.code} onChange={() => {}} required mono />
        <TextInput label="Grace (mins)" value={String(shift.grace)} onChange={() => {}} required helper="Late mark threshold" />
        <TextInput label="Start time" value={shift.start} onChange={() => {}} type="time" required />
        <TextInput label="End time" value={shift.end} onChange={() => {}} type="time" required />
        <TextInput label="Break (mins)" value={String(shift.breakMins)} onChange={() => {}} required />
        <MockSelect label="Applicable branches" placeholder="Multi-select…" value="All branches" required className="col-span-3" />
        <StatusToggleCard label="Night shift" description="Triggers shift allowance in payroll" active={false} onChange={() => {}} className="col-span-3" />
      </div>
    </CompactMasterForm>
  );
}

function HolidayMasterForm() {
  return (
    <CompactMasterForm title="Holiday Master" breadcrumb="HR → Admin → Holidays → FY 2026-27">
      <FormSectionDivider title="Holiday entry" />
      <div className="grid grid-cols-3 gap-3">
        <TextInput label="Holiday name" value="" onChange={() => {}} placeholder="Independence Day" required />
        <TextInput label="Date" value="2026-08-15" onChange={() => {}} type="date" required />
        <MockSelect label="Type" placeholder="Select…" value="National" required />
        <MockSelect label="Applicable locations" placeholder="Multi-select…" value="All India" required className="col-span-2" />
        <MockSelect label="Optional / restricted" placeholder="Select…" value="Mandatory" required />
        <FormField label="Description" className="col-span-3">
          <textarea rows={2} placeholder="Notes for calendar sync…" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
      </div>
    </CompactMasterForm>
  );
}

function OrganizationSetupForm() {
  return (
    <CompactMasterForm title="Organization Setup" breadcrumb="HR → Admin → Organization → Settings">
      <div className="grid grid-cols-3 gap-3">
        <TextInput label="Legal entity name" value="Dharitri Sutra Agri Pvt Ltd" onChange={() => {}} required />
        <TextInput label="CIN / registration" value="U01100PN2018PTC123456" onChange={() => {}} mono />
        <MockSelect label="Default FY" placeholder="Select FY…" value="FY 2026-27" required />
        <TextInput label="HQ address" value="Pune, Maharashtra" onChange={() => {}} className="col-span-2" />
        <MockSelect label="Default pay cycle" placeholder="Select…" value="Monthly (last working day)" required />
        <MockSelect label="Week start" placeholder="Select…" value="Monday" />
        <MockSelect label="Date format" placeholder="Select…" value="DD MMM YYYY" />
        <StatusToggleCard label="Multi-branch" description="Enable branch-wise holiday and shift rules" active={true} onChange={() => {}} className="col-span-3" />
      </div>
    </CompactMasterForm>
  );
}

function PayrollSetupForm() {
  return (
    <CompactMasterForm title="Payroll Setup" breadcrumb="HR → Compensation → Payroll → Configuration">
      <div className="grid grid-cols-3 gap-3">
        <MockSelect label="Pay group" placeholder="Select…" value="Monthly — HO" required />
        <MockSelect label="Salary components template" placeholder="Select…" value="Standard India — CTC" required />
        <TextInput label="Pay day" value="Last working day" onChange={() => {}} required helper="Or fixed date: 1st / 7th" />
        <MockSelect label="PF applicability" placeholder="Select…" value="All eligible employees" />
        <MockSelect label="ESI threshold" placeholder="Select…" value="₹21,000 gross" />
        <MockSelect label="TDS calculation" placeholder="Select…" value="Automated — regime aware" />
        <StatusToggleCard label="Pro-rata for joiners" description="Auto-calculate for mid-month join/exit" active={true} onChange={() => {}} className="col-span-3" />
      </div>
    </CompactMasterForm>
  );
}

function SalaryRevisionForm() {
  const emp = MOCK_EMPLOYEES[0];
  return (
    <CompactMasterForm title="Salary Revision" breadcrumb="HR → Compensation → Revision → New">
      <FormSectionDivider title="Revision details" />
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Employee" placeholder="Search…" value={`${emp.name} (${emp.code})`} required />
        <TextInput label="Effective date" value="2026-09-01" onChange={() => {}} type="date" required />
        <TextInput label="Current CTC (annual)" value="₹9,60,000" onChange={() => {}} readOnly />
        <TextInput label="Revised CTC (annual)" value="" onChange={() => {}} placeholder="₹10,80,000" required helper="Must be approved per compensation policy" />
        <MockSelect label="Revision reason" placeholder="Select…" value="Annual increment" required />
        <MockSelect label="Approver" placeholder="Select…" value="Ananya Deshmukh" required />
        <FormField label="Justification" required className="col-span-2">
          <textarea rows={2} placeholder="Performance rating, market correction, promotion…" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
      </div>
    </CompactMasterForm>
  );
}

function PerformanceReviewForm() {
  const emp = MOCK_EMPLOYEES[1];
  return (
    <CompactMasterForm title="Performance Review" breadcrumb="HR → Admin → Performance → Q2 FY26">
      <FormSectionDivider title="Review cycle" />
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Employee" placeholder="Search…" value={emp.name} required />
        <MockSelect label="Review period" placeholder="Select…" value="Q2 FY 2025-26 (Apr–Jun)" required />
        <FormField label="Goals achievement (%)" required>
          <Input type="number" defaultValue="82" className={INPUT_CLS} />
          <p className="text-[11px] text-muted-foreground">Weighted average of assigned KRA scores</p>
        </FormField>
        <MockSelect label="Overall rating" placeholder="Select…" value="Meets expectations (3/5)" required />
        <FormField label="Manager comments" required className="col-span-2">
          <textarea rows={3} defaultValue="Consistent territory coverage. Needs improvement in collection follow-up." className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
        <MockSelect label="Recommended action" placeholder="Select…" value="Continue — development plan" className="col-span-2" />
      </div>
    </CompactMasterForm>
  );
}

function ExpenseClaimForm() {
  return (
    <CompactMasterForm title="Expense Claim" breadcrumb="My Workspace → Claims → New">
      <FormSectionDivider title="Claim header" />
      <div className="grid grid-cols-3 gap-3">
        <MockSelect label="Expense category" placeholder="Select…" value="Travel — Local conveyance" required />
        <TextInput label="Expense date" value="2026-08-01" onChange={() => {}} type="date" required />
        <TextInput label="Amount (₹)" value="" onChange={() => {}} placeholder="1,250" required />
        <TextInput label="Project / cost centre" value="" onChange={() => {}} placeholder="Optional" className="col-span-2" />
        <FormField label="Description" required className="col-span-3">
          <textarea rows={2} placeholder="Client visit — Nagar to Pune HO" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
        <FormField label="Receipt" required helper="PDF, JPG or PNG — max 5 MB" className="col-span-3">
          <div className="rounded-[14px] border-2 border-dashed border-border bg-muted/20 p-4 text-center">
            <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Drag &amp; drop or <span className="text-brand-600 font-medium">browse</span></p>
          </div>
        </FormField>
      </div>
    </CompactMasterForm>
  );
}

function OfferLetterForm() {
  const cand = MOCK_CANDIDATES[1];
  return (
    <CompactMasterForm title="Offer Letter" breadcrumb="HR → Talent → Offer Letters → Generate">
      <FormSectionDivider title="Candidate & offer" />
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Candidate" placeholder="Search…" value={cand.name} required />
        <TextInput label="Role" value={cand.role} onChange={() => {}} required />
        <MockSelect label="Department" placeholder="Select…" value="Human Resources" required />
        <MockSelect label="Designation" placeholder="Select…" value="Payroll Specialist" required />
        <TextInput label="Proposed CTC (annual)" value="₹7,20,000" onChange={() => {}} required />
        <TextInput label="Joining date" value="2026-09-15" onChange={() => {}} type="date" required />
        <MockSelect label="Work location" placeholder="Select…" value="Pune HO" required />
        <MockSelect label="Offer template" placeholder="Select…" value="Standard — Full time" required />
        <FormField label="Special terms" className="col-span-2">
          <textarea rows={2} placeholder="Probation 6 months, notice 60 days…" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
      </div>
    </CompactMasterForm>
  );
}

function JoiningForm() {
  const cand = MOCK_CANDIDATES[3];
  return (
    <CompactMasterForm title="Joining Form" breadcrumb="HR → Talent → Joining → Pre-boarding">
      <FormSectionDivider title="Personal & statutory" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Full name" value={cand.name} onChange={() => {}} required />
        <TextInput label="Personal email" value="" onChange={() => {}} placeholder="candidate@email.com" required />
        <TextInput label="Mobile" value="" onChange={() => {}} placeholder="+91 …" required />
        <TextInput label="Date of birth" value="" onChange={() => {}} type="date" required />
        <TextInput label="PAN" value="" onChange={() => {}} placeholder="ABCDE1234F" required mono error="" helper="Must match uploaded document" />
        <TextInput label="Aadhaar" value="" onChange={() => {}} placeholder="XXXX XXXX 1234" required />
        <MockSelect label="Blood group" placeholder="Select…" />
        <MockSelect label="Emergency contact relation" placeholder="Select…" value="Spouse" />
        <FormField label="Permanent address" required className="col-span-2">
          <textarea rows={2} className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
        </FormField>
      </div>
    </CompactMasterForm>
  );
}

function ExitClearanceForm() {
  const emp = MOCK_EMPLOYEES[4];
  return (
    <CompactMasterForm title="Exit Clearance" breadcrumb="HR → Talent → Exit → Clearance checklist">
      <FormSectionDivider title="Separation details" />
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Employee" placeholder="Search…" value={`${emp.name} (${emp.code})`} required />
        <TextInput label="Last working day" value="2026-09-30" onChange={() => {}} type="date" required />
        <MockSelect label="Separation type" placeholder="Select…" value="Resignation — voluntary" required />
        <MockSelect label="Notice period status" placeholder="Select…" value="Serving — 30 days" required />
      </div>
      <FormSectionDivider title="Department clearance" />
      <div className="space-y-2">
        {[
          { dept: "IT / Assets", item: "Laptop & access revoked", done: true },
          { dept: "Finance", item: "Outstanding advances settled", done: false },
          { dept: "HR", item: "Exit interview completed", done: false },
          { dept: "Admin", item: "ID card & locker returned", done: true },
        ].map((c) => (
          <div key={c.dept} className="flex items-center justify-between p-2.5 rounded-[10px] border border-border bg-muted/10">
            <div>
              <p className="text-xs font-medium text-foreground">{c.dept}</p>
              <p className="text-[11px] text-muted-foreground">{c.item}</p>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
              c.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            )}>
              {c.done ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {c.done ? "Cleared" : "Pending"}
            </span>
          </div>
        ))}
      </div>
      <FormField label="HR remarks" className="mt-3">
        <textarea rows={2} placeholder="FnF settlement notes…" className="w-full text-sm rounded-[10px] border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
      </FormField>
    </CompactMasterForm>
  );
}

function DocumentUploadForm() {
  const doc = MOCK_DOCUMENTS[0];
  return (
    <CompactMasterForm title="Document Upload" breadcrumb="My Workspace → Documents → Upload">
      <FormSectionDivider title="Document metadata" />
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Document type" placeholder="Select…" value={doc.folder} required />
        <MockSelect label="Category" placeholder="Select…" value="Identity proof" required />
        <TextInput label="Document title" value={doc.name.replace(".pdf", "")} onChange={() => {}} required />
        <TextInput label="Expiry date" value="" onChange={() => {}} type="date" helper="Required for licenses & certificates" />
        <FormField label="File" required className="col-span-2">
          <div className="rounded-[14px] border-2 border-dashed border-brand-300 bg-brand-50/30 p-5 text-center">
            <FileText className="w-6 h-6 text-brand-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-foreground">Drop file here or browse</p>
            <p className="text-[11px] text-muted-foreground mt-1">PDF, JPG, PNG — max 10 MB per file</p>
            <Button size="sm" variant="outline" className="h-8 text-xs rounded-[10px] mt-3">
              <Upload className="w-3.5 h-3.5 mr-1" /> Choose file
            </Button>
          </div>
        </FormField>
        <StatusToggleCard label="Confidential" description="Restrict visibility to HR & self" active={false} onChange={() => {}} className="col-span-2" />
      </div>
    </CompactMasterForm>
  );
}

function FormRenderer({ id }: { id: FormId }) {
  switch (id) {
    case "employee": return <EmployeeCreationForm />;
    case "leave": return <LeaveApplicationForm />;
    case "attendance-reg": return <AttendanceRegularizationForm />;
    case "department": return <DepartmentMasterForm />;
    case "designation": return <DesignationMasterForm />;
    case "shift": return <ShiftMasterForm />;
    case "holiday": return <HolidayMasterForm />;
    case "org": return <OrganizationSetupForm />;
    case "payroll-setup": return <PayrollSetupForm />;
    case "salary": return <SalaryRevisionForm />;
    case "performance": return <PerformanceReviewForm />;
    case "expense": return <ExpenseClaimForm />;
    case "offer": return <OfferLetterForm />;
    case "joining": return <JoiningForm />;
    case "exit": return <ExitClearanceForm />;
    case "document": return <DocumentUploadForm />;
    default: return null;
  }
}

// ── Main section ─────────────────────────────────────────────────────────────

export default function HrmsFormsSection() {
  const [activeForm, setActiveForm] = useState<FormId>("employee");

  return (
    <SectionShell overview="HRMS forms cover the full employee lifecycle — from master data and org setup to self-service leave and exit clearance. Use compact 2-column grids for masters (≤7 fields), 3-column for timing/setup fields, and full-page layouts with contextual section nav for employee creation. Every form demonstrates required markers, inline validation, helper text, sticky save actions, and brand tokens.">
      <SectionBlock
        title="Variants"
        subtitle="Field states, layouts, and interaction patterns used across HRMS forms"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: "Compact master", desc: "2-col grid, ≤7 fields, sticky footer", icon: Network },
            { title: "Full-page create", desc: "Section nav + sidebar + audit metadata", icon: User },
            { title: "Self-service", desc: "Employee-facing apply/upload flows", icon: CalendarDays },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
                <div className="w-9 h-9 rounded-[10px] bg-brand-50 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4 text-brand-600" />
                </div>
                <p className="text-xs font-semibold text-foreground">{v.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{v.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-[14px] border border-border bg-muted/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Field anatomy</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Required with helper" required helper="Helper text explains format or business rule">
              <Input placeholder="Example value…" className={INPUT_CLS} />
            </FormField>
            <FormField label="Validation error" required error="This field is required — show inline on blur or submit">
              <Input value="" readOnly className={cn(INPUT_CLS, "border-red-400")} />
            </FormField>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Real HRMS example"
        subtitle="Switch between 15 HRMS form patterns — Employee Creation includes view/edit toggle and unsaved-change dialog"
      >
        <PreviewFrame title="Interactive HRMS form gallery">
          <TplTabs value={activeForm} onValueChange={(v) => setActiveForm(v as FormId)}>
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TplTabsList variant="pill" className="w-max min-w-full flex-wrap h-auto gap-1">
                {FORM_OPTIONS.map((f) => {
                  const Icon = f.icon;
                  return (
                    <TplTabsTrigger key={f.id} value={f.id} variant="pill" className="h-8 px-2.5 text-[11px] gap-1.5">
                      <Icon className="w-3 h-3 shrink-0" />
                      {f.label}
                    </TplTabsTrigger>
                  );
                })}
              </TplTabsList>
            </div>

            {FORM_OPTIONS.map((f) => (
              <TplTabsContent key={f.id} value={f.id}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{f.group}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{f.label}</span>
                </div>
                <FormRenderer id={f.id} />
              </TplTabsContent>
            ))}
          </TplTabs>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Vendor onboarding & party master forms"
        description="The same form anatomy applies to ERP procurement and accounts: compact masters in drawers (≤7 fields), full-page party creation with section nav (billing, shipping, statutory), sticky save, draft status, and audit metadata. Reuse FormField patterns — do not fork styling."
      />

      <BestPractices items={[
        "Use drawer forms for master data with ≤7 fields; full-page for employee creation and offer/joining flows.",
        "Group fields with uppercase section dividers — Personal, Employment, Compliance — not unlabeled stacks.",
        "Validate on section save where possible; show errors adjacent to fields, not only in a toast.",
        "Always expose draft vs published state and audit metadata on transactional HR records.",
        "Warn with a confirmation dialog when discarding unsaved changes or switching sections.",
      ]} />

      <DoDont
        dos={[
          "Use rounded-[10px] for inputs/buttons and rounded-[14px] for cards",
          "Mark required fields with red asterisk on labels (text-xs font-medium)",
          "Provide helper text in text-[11px] text-muted-foreground below fields",
          "Use sticky footer with Discard / Save draft / Save & Publish on full-page forms",
          "Toggle view vs edit on long employee forms — read-only shows plain text, not disabled inputs",
        ]}
        donts={[
          "Don't use native HTML select — use Popover autocomplete pattern",
          "Don't mix h-8 and h-10 input heights within the same form",
          "Don't hide validation until final submit with no field-level feedback",
          "Don't omit unsaved-change warnings when navigating away from dirty forms",
          "Don't hardcode hex colors — use brand-*, navy-*, leaf-* tokens",
        ]}
      />

      <TokenUsage tokens={[
        { token: "rounded-[10px]", use: "Inputs, buttons, section nav items, sticky action bar controls" },
        { token: "rounded-[14px]", use: "Form cards, upload zones, status toggle cards" },
        { token: "bg-brand-600 hover:bg-brand-700", use: "Primary Save & Publish CTA" },
        { token: "focus-visible:ring-brand-300", use: "Input focus ring — orange brand accent" },
        { token: "text-navy-700", use: "Form titles and section headings" },
        { token: "border-red-400 + text-red-500", use: "Validation error state on inputs and messages" },
        { token: "bg-brand-50 text-brand-700", use: "Active section nav, selected pill tabs" },
        { token: "text-[11px] text-muted-foreground", use: "Helper text and breadcrumbs" },
      ]} />

      <AccessibilityNotes items={[
        "Associate labels with inputs via htmlFor/id; required fields should include aria-required.",
        "Announce validation errors with role=\"alert\" or aria-live=\"polite\" on submit failure.",
        "Section nav in employee creation should use nav landmark with aria-current on active section.",
        "Unsaved-change dialog must trap focus and restore focus to the triggering control on close.",
        "Mock select triggers need aria-haspopup=\"listbox\" and keyboard navigation when wired in production.",
      ]} />

      <ProductionNotes items={[
        "Template-only mocks — no API calls from /template. Wire forms to HRMS endpoints in dedicated module tasks.",
        "Employee Creation view/edit toggle is demonstrative; production should persist draft server-side.",
        "Do not modify existing ERP form pages until an explicit redesign task references this section.",
        "Reuse components/ui Input, Label, Button — extend with FormField wrappers in the HR module, not in ui/.",
      ]} />
    </SectionShell>
  );
}
