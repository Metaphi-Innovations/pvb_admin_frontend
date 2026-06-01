"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, Save, Check, ChevronsUpDown, AlertCircle,
  User, Building2, MapPin, Lock, Calendar, Clock, X, Search,
  Eye, EyeOff,
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: 1, name: "Sales" },
  { id: 2, name: "HR" },
  { id: 3, name: "Accounts" },
  { id: 4, name: "Procurement" },
  { id: 5, name: "Field Force" },
  { id: 6, name: "Operations" },
];

const ROLES = [
  { id: 1, name: "NSM",    dept: "Sales" },
  { id: 2, name: "ZSM",    dept: "Sales" },
  { id: 3, name: "RSM",    dept: "Sales" },
  { id: 4, name: "ASM",    dept: "Sales" },
  { id: 5, name: "TM",     dept: "Sales" },
  { id: 6, name: "DO",     dept: "Sales" },
  { id: 7, name: "FMO",    dept: "Field Force" },
  { id: 8, name: "Admin",  dept: "HR" },
  { id: 9, name: "Manager",dept: "Operations" },
  { id: 10, name: "Intern",dept: "Sales" },
];

const REPORTING_MANAGERS = [
  { id: 1, name: "Priya Sharma",  role: "RSM" },
  { id: 2, name: "Nikhil Joshi",  role: "ZSM" },
  { id: 3, name: "Anil Verma",    role: "NSM" },
  { id: 4, name: "Suresh Patil",  role: "TM"  },
  { id: 5, name: "Vikram Singh",  role: "ASM" },
  { id: 6, name: "Kavita Jain",   role: "ZSM" },
  { id: 7, name: "Deepak Rao",    role: "RSM" },
];

const STATES = [
  "Maharashtra", "Gujarat", "Rajasthan", "Karnataka", "Tamil Nadu",
  "Andhra Pradesh", "Telangana", "Kerala", "Punjab", "Haryana",
  "Delhi", "West Bengal", "Odisha", "Assam", "Uttar Pradesh",
];

const TERRITORIES = [
  "Mumbai", "Pune", "Nagpur", "Nashik", "Ahmedabad", "Surat",
  "Vadodara", "Jaipur", "Bangalore", "Chennai", "Hyderabad",
  "Kochi", "Delhi", "Kolkata", "Chandigarh",
];

function generateEmployeeId(): string {
  const num = Math.floor(Math.random() * 900) + 100;
  return `EMP-${num}`;
}

// ── Reusable: Searchable single-select Dropdown ───────────────────────────────
function SearchableDropdown({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  renderOption,
  getLabel,
}: {
  label: string;
  required?: boolean;
  value: number | null;
  onChange: (id: number) => void;
  options: { id: number; name: string; [key: string]: unknown }[];
  placeholder: string;
  error?: string;
  renderOption?: (opt: { id: number; name: string; [key: string]: unknown }) => React.ReactNode;
  getLabel?: (opt: { id: number; name: string; [key: string]: unknown }) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full h-9 px-3 text-sm text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
              error ? "border-red-400" : "border-border",
            )}
          >
            <span className={selected ? "text-foreground text-xs" : "text-muted-foreground text-xs"}>
              {selected ? (getLabel ? getLabel(selected) : selected.name) : placeholder}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors hover:bg-muted/60",
                  value === opt.id && "bg-brand-50",
                )}
              >
                {renderOption ? renderOption(opt) : (
                  <span className="flex-1">{getLabel ? getLabel(opt) : opt.name}</span>
                )}
                {value === opt.id && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 ml-auto" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">No results found</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Reusable: Multi-select Dropdown ──────────────────────────────────────────
function MultiSelectDropdown({
  label,
  selected,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  selected: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="w-full min-h-[36px] px-3 py-1.5 text-xs text-left border border-border rounded-lg bg-background flex items-start justify-between hover:bg-muted/30 transition-colors gap-2"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground self-center">{placeholder}</span>
              ) : (
                selected.map(v => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggle(v); }}
                      className="hover:text-brand-900"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1">
            {filtered.map(opt => (
              <label
                key={opt}
                className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer hover:bg-muted/60 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <span className="text-xs text-foreground flex-1">{opt}</span>
                {selected.includes(opt) && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">No results found</p>
            )}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => onChange([])}
                className="text-xs text-brand-600 hover:underline"
              >
                Clear all ({selected.length})
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Section Card wrapper ──────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  iconColor = "text-brand-600",
  iconBg = "bg-brand-50 border-brand-100",
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AddUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    employeeId: generateEmployeeId(),
    fullName: "",
    email: "",
    mobile: "",
    departmentId: null as number | null,
    roleId: null as number | null,
    reportingManagerId: null as number | null,
    stateAccess: [] as string[],
    territoryAccess: [] as string[],
    password: "",
    confirmPassword: "",
    status: "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())    e.fullName    = "Full name is required";
    if (!form.email.trim())       e.email       = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.mobile.trim())      e.mobile      = "Mobile number is required";
    else if (!/^\d{10}$/.test(form.mobile)) e.mobile = "Enter a valid 10-digit mobile";
    if (!form.departmentId)       e.departmentId = "Department is required";
    if (!form.roleId)             e.roleId       = "Role is required";
    if (!form.password)           e.password     = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.confirmPassword)    e.confirmPassword = "Please confirm the password";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (asDraft = false) => {
    if (!validate()) return;
    console.log("Creating user:", { ...form, status: asDraft ? "inactive" : form.status });
    router.push("/user-management/user");
  };

  const selectedDept   = DEPARTMENTS.find(d => d.id === form.departmentId);
  const filteredRoles  = form.departmentId
    ? ROLES.filter(r => r.dept === selectedDept?.name)
    : ROLES;

  return (
    <AppLayout noPadding>
      <div className="flex flex-col h-full">

        {/* ── Sticky Header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => router.push("/user-management/user")}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
              <span>User Management</span>
              <span>/</span>
              <span>User</span>
              <span>/</span>
              <span className="text-foreground font-medium">Add User</span>
            </div>
            <h2 className="text-sm font-semibold text-foreground leading-none">Add New User</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push("/user-management/user")}
          >
            Discard
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSave(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
          >
            <Save className="w-3.5 h-3.5" /> Save &amp; Publish
          </Button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Main Form Area ── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/10">
            <div className="max-w-3xl space-y-6">

              {/* ── Section 1: Personal Information ── */}
              <SectionCard
                icon={User}
                title="Personal Information"
                subtitle="Basic identity details of the employee"
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* Employee ID — auto-generated, read-only */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Employee ID</Label>
                    <div className="h-9 px-3 border border-border rounded-lg bg-muted/30 flex items-center">
                      <span className="font-mono text-xs font-semibold text-brand-700">{form.employeeId}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Auto-generated on save</p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.fullName}
                      onChange={e => set("fullName", e.target.value)}
                      placeholder="e.g., Rajesh Kumar"
                      className={cn("h-9 text-sm rounded-lg", errors.fullName && "border-red-400")}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                      placeholder="user@dharitrisutra.com"
                      className={cn("h-9 text-sm rounded-lg", errors.email && "border-red-400")}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.mobile}
                      onChange={e => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className={cn("h-9 text-sm rounded-lg", errors.mobile && "border-red-400")}
                    />
                    {errors.mobile && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.mobile}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* ── Section 2: Organization & Role ── */}
              <SectionCard
                icon={Building2}
                iconBg="bg-blue-50 border-blue-100"
                iconColor="text-blue-600"
                title="Organization & Role"
                subtitle="Department assignment, role and reporting structure"
              >
                <div className="grid grid-cols-3 gap-4">
                  {/* Department */}
                  <SearchableDropdown
                    label="Department"
                    required
                    value={form.departmentId}
                    onChange={id => {
                      set("departmentId", id);
                      set("roleId", null); // reset role when dept changes
                    }}
                    options={DEPARTMENTS}
                    placeholder="Select department…"
                    error={errors.departmentId}
                  />

                  {/* Role */}
                  <SearchableDropdown
                    label="Role"
                    required
                    value={form.roleId}
                    onChange={id => set("roleId", id)}
                    options={filteredRoles}
                    placeholder="Select role…"
                    error={errors.roleId}
                    renderOption={opt => (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="flex-1">{opt.name}</span>
                        <span className="text-[10px] px-1.5 py-px rounded-full bg-slate-100 text-slate-500 font-medium">
                          {String(opt.dept ?? "")}
                        </span>
                      </div>
                    )}
                  />

                  {/* Reporting Manager */}
                  <SearchableDropdown
                    label="Reporting Manager"
                    value={form.reportingManagerId}
                    onChange={id => set("reportingManagerId", id)}
                    options={REPORTING_MANAGERS}
                    placeholder="Select manager…"
                    renderOption={opt => (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {String(opt.name).split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{opt.name}</p>
                          <p className="text-[10px] text-muted-foreground">{String(opt.role ?? "")}</p>
                        </div>
                      </div>
                    )}
                    getLabel={opt => String(opt.name)}
                  />
                </div>
              </SectionCard>

              {/* ── Section 3: Geographic Access ── */}
              <SectionCard
                icon={MapPin}
                iconBg="bg-emerald-50 border-emerald-100"
                iconColor="text-emerald-600"
                title="Geographic Access"
                subtitle="Define which states and territories this user can access"
              >
                <div className="grid grid-cols-2 gap-4">
                  <MultiSelectDropdown
                    label="State Access"
                    selected={form.stateAccess}
                    onChange={vals => set("stateAccess", vals)}
                    options={STATES}
                    placeholder="Select states…"
                  />
                  <MultiSelectDropdown
                    label="Territory Access"
                    selected={form.territoryAccess}
                    onChange={vals => set("territoryAccess", vals)}
                    options={TERRITORIES}
                    placeholder="Select territories…"
                  />
                </div>
                {(form.stateAccess.length === 0 && form.territoryAccess.length === 0) && (
                  <p className="text-[11px] text-muted-foreground mt-3">
                    No geography selected — user will have no geographic access until assigned.
                  </p>
                )}
              </SectionCard>

              {/* ── Section 4: Account Security ── */}
              <SectionCard
                icon={Lock}
                iconBg="bg-purple-50 border-purple-100"
                iconColor="text-purple-600"
                title="Account Security"
                subtitle="Set login credentials for this user"
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={e => set("password", e.target.value)}
                        placeholder="Min. 8 characters"
                        className={cn("h-9 text-sm rounded-lg pr-9", errors.password && "border-red-400")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.password}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">At least 8 characters required</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={e => set("confirmPassword", e.target.value)}
                        placeholder="Re-enter password"
                        className={cn("h-9 text-sm rounded-lg pr-9", errors.confirmPassword && "border-red-400")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.confirmPassword}
                      </p>
                    ) : form.password && form.confirmPassword && form.password === form.confirmPassword ? (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Passwords match
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700">
                    The user&apos;s login email will be their registered email address. They can change their password after first login.
                  </p>
                </div>
              </SectionCard>

            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="w-64 flex-shrink-0 border-l border-border bg-white overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Save Options */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Save Options
                </p>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                    onClick={() => handleSave(false)}
                  >
                    <Save className="w-3.5 h-3.5" /> Save &amp; Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => handleSave(true)}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => router.push("/user-management/user")}
                  >
                    Discard
                  </Button>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Status */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Status
                </p>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {form.status === "active" ? "Active" : "Inactive"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {form.status === "active" ? "Can log in immediately" : "Account disabled"}
                      </p>
                    </div>
                    <Switch
                      checked={form.status === "active"}
                      onCheckedChange={v => set("status", v ? "active" : "inactive")}
                    />
                  </div>
                  <div className={cn(
                    "mt-2.5 flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md",
                    form.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600",
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      form.status === "active" ? "bg-emerald-500" : "bg-slate-400",
                    )} />
                    {form.status === "active" ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Record Info (placeholder for new) */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Record Info
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-3 h-3 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Created</p>
                      <p className="text-[11px] text-muted-foreground">Will be set on save</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Last Updated</p>
                      <p className="text-[11px] text-muted-foreground">Will be set on save</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Form progress indicator */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Form Completion
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: "Personal Info",    done: !!(form.fullName && form.email && form.mobile) },
                    { label: "Organization",     done: !!(form.departmentId && form.roleId) },
                    { label: "Geographic Access",done: form.stateAccess.length > 0 },
                    { label: "Credentials",      done: !!(form.password && form.password === form.confirmPassword) },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                        done ? "bg-emerald-100" : "bg-muted",
                      )}>
                        {done
                          ? <Check className="w-2.5 h-2.5 text-emerald-600" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        }
                      </div>
                      <span className={cn(
                        "text-[11px]",
                        done ? "text-foreground font-medium" : "text-muted-foreground",
                      )}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
