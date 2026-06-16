"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, Save, Check, ChevronsUpDown, AlertCircle,
  User, Building2, MapPin, Lock, Calendar, Clock, X, Search,
  Eye, EyeOff, Monitor, Smartphone, ChevronDown, Shield,
} from "lucide-react";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  PERMISSION_REGISTRY,
  MOBILE_PERMISSION_REGISTRY,
  type WebAction,
  type MobileAction,
  type PermModule,
  type MobileGroupDef,
  type PermSubmodule,
  type MobileFeatureDef,
} from "../../employee/employee-data";
import {
  type PermissionTemplate,
  loadNewPermissionTemplates,
} from "../../roles/roles-data";
import { loadUsers, saveUsers } from "../user-data";

const ALL_WEB_ACTIONS: WebAction[] = ["view", "create", "edit", "delete", "approve", "export", "import"];
const ALL_MOBILE_ACTIONS: MobileAction[] = ["view", "create", "edit", "delete", "approve"];

const WEB_ACTION_LABELS: Record<WebAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  import: "Import",
};

const MOBILE_ACTION_LABELS: Record<MobileAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
};

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
  headerRight,
  children,
}: {
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
// ── Main Page ─────────────────────────────────────────────────────────────────
function AddUserForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Permissions state
  const [activeWebPerms, setActiveWebPerms] = useState<Set<string>>(new Set());
  const [activeMobilePerms, setActiveMobilePerms] = useState<Set<string>>(new Set());
  const [accessType, setAccessType] = useState<"web" | "mobile" | null>("web");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [pendingTemplateId, setPendingTemplateId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [pendingAccessType, setPendingAccessType] = useState<"web" | "mobile" | null>(null);
  const [showPlatformWarningModal, setShowPlatformWarningModal] = useState(false);

  const [openMods, setOpenMods] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Load active templates
  const templates = loadNewPermissionTemplates().filter(t => t.status === "Active");
  const templateOptions = templates.map(t => ({
    value: t.id,
    label: t.templateName,
  }));

  const set = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (PERMISSION_REGISTRY.length > 0) {
      setOpenMods(new Set([PERMISSION_REGISTRY[0].id]));
    }
    if (MOBILE_PERMISSION_REGISTRY.length > 0) {
      setOpenGroups(new Set([MOBILE_PERMISSION_REGISTRY[0].id]));
    }

    if (idParam) {
      const uId = Number(idParam);
      const user = loadUsers().find(u => u.id === uId);
      if (user) {
        const dept = DEPARTMENTS.find(d => d.name === user.department);
        const role = ROLES.find(r => r.name === user.role);
        const manager = REPORTING_MANAGERS.find(m => m.name === user.reportingManager);
        
        setForm({
          employeeId: user.employeeId,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          departmentId: dept ? dept.id : null,
          roleId: role ? role.id : null,
          reportingManagerId: manager ? manager.id : null,
          stateAccess: user.stateAccess,
          territoryAccess: user.territoryAccess,
          password: "dummy_password",
          confirmPassword: "dummy_password",
        });
      }
    }
  }, [idParam]);

  const hasCheckedPermissions = () => {
    return activeWebPerms.size > 0 || activeMobilePerms.size > 0;
  };

  const applyTemplate = (tpl: PermissionTemplate) => {
    setSelectedTemplateId(tpl.id);
    setAccessType(tpl.accessType);
    
    if (tpl.accessType === "web") {
      const webSet = new Set<string>();
      tpl.webPermissions.forEach(p => {
        webSet.add(`${p.moduleKey}.${p.actionKey}`);
      });
      setActiveWebPerms(webSet);
      setActiveMobilePerms(new Set());
    } else {
      const mobileSet = new Set<string>();
      tpl.mobilePermissions.forEach(p => {
        mobileSet.add(`${p.moduleKey}.${p.actionKey}`);
      });
      setActiveMobilePerms(mobileSet);
      setActiveWebPerms(new Set());
    }
  };

  const handleTemplateSelect = (val: string) => {
    const tpl = templates.find(t => t.id === val);
    if (!tpl) return;

    if (hasCheckedPermissions()) {
      setPendingTemplateId(val);
      setShowConfirmModal(true);
    } else {
      applyTemplate(tpl);
    }
  };

  const confirmTemplateChange = () => {
    const tpl = templates.find(t => t.id === pendingTemplateId);
    if (tpl) {
      applyTemplate(tpl);
    }
    setPendingTemplateId("");
    setShowConfirmModal(false);
  };

  const cancelTemplateChange = () => {
    setPendingTemplateId("");
    setShowConfirmModal(false);
  };

  const handleAccessTypeChange = (target: "web" | "mobile") => {
    if (accessType === target) return;

    if (hasCheckedPermissions()) {
      setPendingAccessType(target);
      setShowPlatformWarningModal(true);
    } else {
      setAccessType(target);
    }
  };

  const confirmPlatformChange = () => {
    if (!pendingAccessType) return;
    if (accessType === "web") {
      setActiveWebPerms(new Set());
    } else {
      setActiveMobilePerms(new Set());
    }
    setAccessType(pendingAccessType);
    setPendingAccessType(null);
    setShowPlatformWarningModal(false);
  };

  const toggleMod = (id: string) => {
    setOpenMods(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroups(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleWebPerm = (modId: string, subId: string, action: string) => {
    const key = `${modId}.${subId}.${action}`;
    setActiveWebPerms(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleMobilePerm = (grpId: string, featId: string, action: string) => {
    const key = `${grpId}.${featId}.${action}`;
    setActiveMobilePerms(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const grantMod = (mod: PermModule) => {
    setActiveWebPerms(prev => {
      const next = new Set(prev);
      mod.submodules.forEach((sub: PermSubmodule) => {
        sub.actions.forEach((action: WebAction) => {
          next.add(`${mod.id}.${sub.id}.${action}`);
        });
      });
      return next;
    });
  };

  const revokeMod = (mod: PermModule) => {
    setActiveWebPerms(prev => {
      const next = new Set(prev);
      mod.submodules.forEach((sub: PermSubmodule) => {
        sub.actions.forEach((action: WebAction) => {
          next.delete(`${mod.id}.${sub.id}.${action}`);
        });
      });
      return next;
    });
  };

  const grantGroup = (grp: MobileGroupDef) => {
    setActiveMobilePerms(prev => {
      const next = new Set(prev);
      grp.features.forEach((feat: MobileFeatureDef) => {
        feat.actions.forEach((action: MobileAction) => {
          next.add(`${grp.id}.${feat.id}.${action}`);
        });
      });
      return next;
    });
  };

  const revokeGroup = (grp: MobileGroupDef) => {
    setActiveMobilePerms(prev => {
      const next = new Set(prev);
      grp.features.forEach((feat: MobileFeatureDef) => {
        feat.actions.forEach((action: MobileAction) => {
          next.delete(`${grp.id}.${feat.id}.${action}`);
        });
      });
      return next;
    });
  };

  const modHasAny = (mod: PermModule) => {
    return mod.submodules.some((sub: PermSubmodule) =>
      sub.actions.some((action: WebAction) => activeWebPerms.has(`${mod.id}.${sub.id}.${action}`))
    );
  };

  const groupHasAny = (grp: MobileGroupDef) => {
    return grp.features.some((feat: MobileFeatureDef) =>
      feat.actions.some((action: MobileAction) => activeMobilePerms.has(`${grp.id}.${feat.id}.${action}`))
    );
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())    e.fullName    = "Full name is required";
    if (!form.email.trim())       e.email       = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.mobile.trim())      e.mobile      = "Mobile number is required";
    else if (!/^\d{10}$/.test(form.mobile)) e.mobile = "Enter a valid 10-digit mobile";
    if (!form.departmentId)       e.departmentId = "Department is required";
    if (!form.roleId)             e.roleId       = "Role is required";
    if (!idParam) {
      if (!form.password)           e.password     = "Password is required";
      else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
      if (!form.confirmPassword)    e.confirmPassword = "Please confirm the password";
      else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (asDraft = false) => {
    if (!validate()) return;
    const users = loadUsers();
    
    const dept = DEPARTMENTS.find(d => d.id === form.departmentId)?.name || "";
    const role = ROLES.find(r => r.id === form.roleId)?.name || "";
    const manager = REPORTING_MANAGERS.find(m => m.id === form.reportingManagerId)?.name || "";
    
    const nowStr = new Date().toISOString().slice(0, 10);
    
    if (idParam) {
      const uId = Number(idParam);
      const index = users.findIndex(u => u.id === uId);
      if (index !== -1) {
        users[index] = {
          ...users[index],
          fullName: form.fullName,
          email: form.email,
          mobile: form.mobile,
          department: dept,
          role: role,
          reportingManager: manager,
          stateAccess: form.stateAccess,
          territoryAccess: form.territoryAccess,
          status: asDraft ? "inactive" : "active",
          updatedDate: nowStr,
        };
        saveUsers(users);
      }
    } else {
      const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const newUser = {
        id: newId,
        employeeId: form.employeeId,
        fullName: form.fullName,
        email: form.email,
        mobile: form.mobile,
        department: dept,
        role: role,
        reportingManager: manager,
        stateAccess: form.stateAccess,
        territoryAccess: form.territoryAccess,
        status: asDraft ? "inactive" : "active",
        createdBy: "System",
        createdDate: nowStr,
        updatedBy: "System",
        updatedDate: nowStr,
      };
      users.push(newUser);
      saveUsers(users);
    }
    router.push("/user-management/user");
  };

  const selectedDept   = DEPARTMENTS.find(d => d.id === form.departmentId);
  const filteredRoles  = form.departmentId
    ? ROLES.filter(r => r.dept === selectedDept?.name)
    : ROLES;

  return (
    <FormContainer
      title="Add New User"
      description="User Management → User → Add User"
      onBack={() => router.push("/user-management/user")}
      onCancel={() => router.push("/user-management/user")}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <div className="flex items-center gap-2">
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
      }
    >
      <div className="flex flex-col" style={{ height: "calc(100vh - 104px)" }}>
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

              {/* ── Section: Permissions ── */}
              <SectionCard
                icon={Shield}
                iconBg="bg-amber-50 border-amber-100"
                iconColor="text-amber-600"
                title="Permissions"
                subtitle="Select permissions or load from a template"
                headerRight={
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Permission Template
                    </Label>
                    <div className="w-56">
                      <AutocompleteSelect
                        placeholder="Select permission template"
                        options={templateOptions}
                        value={selectedTemplateId}
                        onChange={handleTemplateSelect}
                      />
                    </div>
                  </div>
                }
              >
                <div className="space-y-4">
                  {/* Platform Tab Selection */}
                  <div className="flex gap-1.5 pb-2 border-b border-border">
                    {(
                      [
                        ["web", "Web Portal"],
                        ["mobile", "Mobile App"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleAccessTypeChange(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors border",
                          accessType === key
                            ? "bg-brand-600 text-white border-brand-600"
                            : "border-border text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        {key === "web" ? (
                          <Monitor className="w-3.5 h-3.5" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5" />
                        )}
                        {label} Permissions
                      </button>
                    ))}
                  </div>

                  {/* Permission Accordion */}
                  <div className="space-y-3">
                    {accessType === "web" && (
                      <div className="space-y-2">
                        {PERMISSION_REGISTRY.map((mod: PermModule) => {
                          const expanded = openMods.has(mod.id);
                          const hasAny = modHasAny(mod);
                          return (
                            <div
                              key={mod.id}
                              className="overflow-hidden bg-white border shadow-sm border-border rounded-xl"
                            >
                              <div
                                className={cn(
                                  "flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors select-none",
                                  expanded
                                    ? "border-b border-border bg-muted/5"
                                    : hasAny
                                    ? "hover:bg-brand-50/40"
                                    : "hover:bg-muted/20"
                                )}
                                onClick={() => toggleMod(mod.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown
                                    className={cn(
                                      "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
                                      !expanded && "-rotate-90"
                                    )}
                                  />
                                  <span className="text-xs font-semibold text-foreground">
                                    {mod.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({mod.submodules.length} submodule
                                    {mod.submodules.length > 1 ? "s" : ""})
                                  </span>
                                  {hasAny && !expanded && (
                                    <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                                      configured
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => grantMod(mod)}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-660 hover:bg-brand-100 transition-colors"
                                  >
                                    Grant All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => revokeMod(mod)}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-105 transition-colors"
                                  >
                                    Revoke All
                                  </button>
                                </div>
                              </div>
                              {expanded && (
                                <div className="space-y-2.5 p-4 bg-slate-50/30">
                                  {mod.submodules.map((sub: PermSubmodule) => {
                                    const actions = ALL_WEB_ACTIONS.filter((action) =>
                                      sub.actions.includes(action)
                                    );
                                    const rowActive = actions.some((action) =>
                                      activeWebPerms.has(`${mod.id}.${sub.id}.${action}`)
                                    );
                                    return (
                                      <div
                                        key={sub.id}
                                        className={cn(
                                          "rounded-xl border border-border bg-white px-4 py-3 transition-colors",
                                          rowActive && "bg-brand-50/10 border-brand-100"
                                        )}
                                      >
                                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                          <div className="min-w-0 lg:w-56 lg:flex-shrink-0">
                                            <p className="text-[11px] font-semibold text-foreground">
                                              {sub.label}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">
                                              Available permissions
                                            </p>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1.5 lg:pl-4">
                                            {actions.map((action) => {
                                              const checked = activeWebPerms.has(
                                                `${mod.id}.${sub.id}.${action}`
                                              );
                                              return (
                                                <label
                                                  key={action}
                                                  className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium cursor-pointer transition-colors select-none",
                                                    checked
                                                      ? "border-brand-300 bg-brand-50 text-brand-700 font-semibold"
                                                      : "border-border text-muted-foreground hover:bg-muted/40"
                                                  )}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                      toggleWebPerm(mod.id, sub.id, action)
                                                    }
                                                    className="w-3.5 h-3.5 rounded accent-brand-650 cursor-pointer"
                                                  />
                                                  <span>{WEB_ACTION_LABELS[action]}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {accessType === "mobile" && (
                      <div className="space-y-2">
                        {MOBILE_PERMISSION_REGISTRY.map((grp: MobileGroupDef) => {
                          const expanded = openGroups.has(grp.id);
                          const hasAny = groupHasAny(grp);
                          return (
                            <div
                              key={grp.id}
                              className="overflow-hidden bg-white border shadow-sm border-border rounded-xl"
                            >
                              <div
                                className={cn(
                                  "flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors select-none",
                                  expanded
                                    ? "border-b border-border bg-muted/5"
                                    : hasAny
                                    ? "hover:bg-brand-50/40"
                                    : "hover:bg-muted/20"
                                )}
                                onClick={() => toggleGroup(grp.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown
                                    className={cn(
                                      "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
                                      !expanded && "-rotate-90"
                                    )}
                                  />
                                  <span className="text-xs font-semibold text-foreground">
                                    {grp.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({grp.features.length} feature
                                    {grp.features.length > 1 ? "s" : ""})
                                  </span>
                                  {hasAny && !expanded && (
                                    <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                                      configured
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => grantGroup(grp)}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-660 hover:bg-brand-100 transition-colors"
                                  >
                                    Grant All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => revokeGroup(grp)}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-105 transition-colors"
                                  >
                                    Revoke All
                                  </button>
                                </div>
                              </div>
                              {expanded && (
                                <div className="space-y-2.5 p-4 bg-slate-50/30">
                                  {grp.features.map((feat: MobileFeatureDef) => {
                                    const actions = ALL_MOBILE_ACTIONS.filter((action) =>
                                      feat.actions.includes(action)
                                    );
                                    const rowActive = actions.some((action) =>
                                      activeMobilePerms.has(`${grp.id}.${feat.id}.${action}`)
                                    );
                                    return (
                                      <div
                                        key={feat.id}
                                        className={cn(
                                          "rounded-xl border border-border bg-white px-4 py-3 transition-colors",
                                          rowActive && "bg-brand-50/10 border-brand-100"
                                        )}
                                      >
                                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                                          <div className="min-w-0 lg:w-56 lg:flex-shrink-0">
                                            <p className="text-[11px] font-semibold text-foreground">
                                              {feat.label}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">
                                              Available permissions
                                            </p>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1.5 lg:pl-4">
                                            {actions.map((action) => {
                                              const checked = activeMobilePerms.has(
                                                `${grp.id}.${feat.id}.${action}`
                                              );
                                              return (
                                                <label
                                                  key={action}
                                                  className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium cursor-pointer transition-colors select-none",
                                                    checked
                                                      ? "border-brand-300 bg-brand-50 text-brand-700 font-semibold"
                                                      : "border-border text-muted-foreground hover:bg-muted/40"
                                                  )}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                      toggleMobilePerm(grp.id, feat.id, action)
                                                    }
                                                    className="w-3.5 h-3.5 rounded accent-brand-650 cursor-pointer"
                                                  />
                                                  <span>{MOBILE_ACTION_LABELS[action]}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
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

      {/* Warning Dialog for Permission Template Overwrite */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              Overwrite Permissions?
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs">
              Changing the permission template will replace current permissions. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={cancelTemplateChange}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmTemplateChange}
            >
              Yes, Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog for Access Type (Platform Type) Switch */}
      <Dialog open={showPlatformWarningModal} onOpenChange={setShowPlatformWarningModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-8 h-8 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              Switch Platform Type?
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs">
              Changing the platform type will clear all currently selected permissions for{" "}
              {accessType === "web" ? "Web Portal" : "Mobile App"}. Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setPendingAccessType(null);
                setShowPlatformWarningModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs text-white bg-red-600 hover:bg-red-700"
              onClick={confirmPlatformChange}
            >
              Proceed &amp; Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormContainer>
  );
}

export default function AddUserPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading form...</div>}>
      <AddUserForm />
    </Suspense>
  );
}
