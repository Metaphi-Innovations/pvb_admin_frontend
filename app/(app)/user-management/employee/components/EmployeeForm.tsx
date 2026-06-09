"use client";

import React, { useState, useMemo } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertCircle, ChevronsUpDown, Check, ArrowLeft, Save, MapPin,
  Shield, Info, ChevronDown, ChevronUp, Plus, Trash2, GripVertical,
  Monitor, Smartphone,
} from "lucide-react";
import { loadGeoNodes, type GeoNode, type GeoLevel } from "@/app/(app)/masters/geography/geo-data";
import {
  type Employee, type RoleType, type SalesType, type UserPermissions,
  type WebAction, type MobileAction, type PermModule, type MobileGroupDef,
  type SubmodulePermission, type MobileFeaturePermission,
  BLOOD_GROUPS, GENDERS, EMPLOYEE_TYPES, RELATIONS, COUNTRY_CODES,
  ROLE_TYPES, SALES_TYPES,
  RETAIL_SALES_ROLES, INSTITUTIONAL_SALES_ROLES, ADMIN_ROLES,
  ROLE_GEO_FIELDS, PERMISSION_REGISTRY, MOBILE_PERMISSION_REGISTRY,
  defaultPermissions, defaultSubPerm, defaultMobilePerm,
  migratePermissions, roleDefaultPermissions,
  validateEmail, validateEmailUnique, validateMobile, validateMobileUnique,
  validateCircularReporting, todayStr, loadEmployees, nextEmployeeId,
} from "../employee-data";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  mode: "add" | "edit";
  employee?: Employee;
  onSave: (emp: Employee) => void;
  onCancel: () => void;
  departments: Array<{ id: number; name: string }>;
}

// ── Country Code Picker ───────────────────────────────────────────────────────
function CountryCodePicker({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(
          "h-8 px-2 text-xs border border-border rounded-lg bg-background flex items-center gap-1 hover:bg-muted/30 transition-colors flex-shrink-0",
          hasError && "border-red-400"
        )}>
          <span className="font-medium text-foreground">{value}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {COUNTRY_CODES.map(cc => (
          <button key={cc.code} type="button" onClick={() => { onChange(cc.code); setOpen(false); }}
            className={cn(
              "w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors flex items-center justify-between",
              value === cc.code && "bg-brand-50 text-brand-700"
            )}>
            {cc.label}
            {value === cc.code && <Check className="w-3 h-3 text-brand-600" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, error, helper, children }: {
  label: string; required?: boolean; error?: string; helper?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</p>}
      {helper && !error && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Autocomplete (searchable dropdown) ───────────────────────────────────────

interface ACOption { label: string; value: string | number; sub?: string }
interface ApprovalLevel { empId: number | null; name: string; role: string; employeeCode: string }
function AC({ label, value, onChange, options, placeholder, required, error, disabled, sub }: {
  label: string; value: string | number; onChange: (v: string | number) => void;
  options: ACOption[]; placeholder?: string; required?: boolean; error?: string;
  disabled?: boolean; sub?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const selected = options.find(o => o.value === value);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Popover open={open && !disabled} onOpenChange={v => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
        <PopoverTrigger asChild>
          <button disabled={disabled} className={cn(
            "w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between transition-colors",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            error && "border-red-400",
          )}>
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected?.label || placeholder || "Select…"}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-1.5 border-b border-border">
            <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}
              className="h-7 text-xs focus-visible:ring-0" autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-4 text-center text-xs text-muted-foreground">No options</p>
              : filtered.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                    selected?.value === opt.value && "bg-brand-50"
                  )}>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.sub && <span className="text-[10px] text-muted-foreground">{opt.sub}</span>}
                  </div>
                  {selected?.value === opt.value && <Check className="w-3 h-3 text-brand-600 flex-shrink-0" />}
                </button>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      {sub && !error && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ── Pill selector ─────────────────────────────────────────────────────────────
function PillSelect({ label, required, options, value, onChange, error }: {
  label: string; required?: boolean;
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 px-3 text-xs rounded-lg border font-medium transition-colors",
              value === opt.value
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted/40"
            )}>
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ── Hierarchy data ────────────────────────────────────────────────────────────

// Hierarchy: NSM → ZSM → RSM → ASM → TM/FMO (same level) → DO/Intern
const RETAIL_NODES = [
  { label: "NSM",      roles: ["NSM"] },
  { label: "ZSM",      roles: ["ZSM"] },
  { label: "RSM",      roles: ["RSM"] },
  { label: "ASM",      roles: ["ASM"] },
  { label: "TM / FMO", roles: ["TM", "FMO"] },
  { label: "DO/Intern",roles: ["DO", "Intern"] },
];

// Hierarchy: NSM/SPM → ZSM → RSM → ASM/KAM → TM/FMO (same level) → DO/Intern
const INSTITUTIONAL_NODES = [
  { label: "NSM/SPM",  roles: ["NSM", "SPM"] },
  { label: "ZSM",      roles: ["ZSM"] },
  { label: "RSM",      roles: ["RSM"] },
  { label: "ASM/KAM",  roles: ["ASM", "KAM"] },
  { label: "TM / FMO", roles: ["TM", "FMO"] },
  { label: "DO/Intern",roles: ["DO", "Intern"] },
];

const ROLE_DESC: Record<string, string> = {
  NSM:   "National-level visibility. Can view all zones, regions, areas, territories and users.",
  SPM:   "Senior Planning Manager. Top-level institutional sales role with national visibility. Equivalent authority to NSM within institutional sales.",
  ZSM:   "Zone-level visibility. Can view all users and records under assigned zones.",
  RSM:   "Region-level visibility. Can view all users and records under assigned regions.",
  ASM:   "Area-level visibility. Can view all users and records under assigned areas.",
  KAM:   "Key Account Manager. Manages institutional sales accounts at area level. Same hierarchy level as ASM — reports to RSM.",
  TM:    "Territory-level visibility. Same hierarchy level as FMO — both report directly to ASM/KAM. Manages DOs and Interns under assigned territories.",
  FMO:   "Territory-level visibility. Same hierarchy level as TM — both report directly to ASM/KAM. Handles Demo Management, Demo Scheduling, Demo Reporting and field activation within assigned territories.",
  DO:    "Lowest level field user. Limited operational access as per assigned permissions. Reports to TM or FMO.",
  Intern:"Lowest level field user. Limited operational access. Supervised by TM or FMO.",
  "Procurement Head":   "Oversees all procurement operations and vendor relationships.",
  "Accounts Manager":   "Manages financial accounts, invoices and payment reconciliation.",
  "HR Admin":           "Oversees employee lifecycle, attendance, payroll and compliance.",
  "Operations Manager": "Manages day-to-day operational workflows and logistics.",
  "Finance Manager":    "Handles financial planning, reporting and budget management.",
  "Back Office Manager":"Handles administrative and data management support activities.",
};

const REPORTS_TO_ROLE: Record<string, string> = {
  NSM: "—", SPM: "—",
  ZSM: "NSM / SPM", RSM: "ZSM",
  ASM: "RSM", KAM: "RSM",
  TM: "ASM / KAM", FMO: "ASM / KAM",   // TM and FMO are at the same level
  DO: "TM / FMO", Intern: "TM / FMO",
};

// Roles above each role — used for reporting manager + approval level suggestions.
// TM and FMO are at the same level: both report to ASM/KAM.
// Hierarchy is suggestion only; admin can override manually.
const ROLES_ABOVE: Record<string, string[]> = {
  NSM:   [],
  SPM:   [],                                                         // same level as NSM (institutional)
  ZSM:   ["NSM", "SPM"],
  RSM:   ["ZSM", "NSM", "SPM"],
  ASM:   ["RSM", "ZSM", "NSM", "SPM"],
  KAM:   ["RSM", "ZSM", "NSM", "SPM"],                              // same level as ASM
  TM:    ["ASM", "KAM", "RSM", "ZSM", "NSM", "SPM"],
  FMO:   ["ASM", "KAM", "RSM", "ZSM", "NSM", "SPM"],               // same level as TM — reports to ASM/KAM
  DO:    ["TM", "FMO", "ASM", "KAM", "RSM", "ZSM", "NSM", "SPM"],
  Intern:["TM", "FMO", "ASM", "KAM", "RSM", "ZSM", "NSM", "SPM"],
};

// ── Hierarchy info card ───────────────────────────────────────────────────────

interface HierarchyCardProps {
  roleType: RoleType;
  salesType?: SalesType;
  role: string;
  geoFields: string[];
  accent: { bg: string; border: string; text: string };
}

function HierarchyInfoCard({ roleType, salesType, role, geoFields, accent }: HierarchyCardProps) {
  if (roleType === "Admin User") {
    return (
      <div className={cn("rounded-lg border px-3 py-2.5 text-xs", accent.bg, accent.border, accent.text)}>
        <p className="font-semibold mb-1">Admin User</p>
        <p className="leading-relaxed">
          Organisation-wide access within their department.{" "}
          <strong>No geography mapping required.</strong> Only a reporting manager can be assigned.
          {role && ROLE_DESC[role] && (
            <span className="block mt-1 opacity-80">{ROLE_DESC[role]}</span>
          )}
        </p>
      </div>
    );
  }

  // Field User
  const nodes = salesType === "Institutional Sales" ? INSTITUTIONAL_NODES : RETAIL_NODES;
  const allRolesList = [...RETAIL_SALES_ROLES, ...INSTITUTIONAL_SALES_ROLES, ...ADMIN_ROLES];
  const roleObj = allRolesList.find(r => r.name === role);
  const reportsTo = role ? (REPORTS_TO_ROLE[role] || "—") : null;
  const geoLevel = geoFields.length === 0 ? "National — No mapping" : geoFields.join(" → ");
  const desc = role ? ROLE_DESC[role] : null;

  return (
    <div className={cn("rounded-xl border overflow-hidden text-xs", accent.border)}>
      {/* Hierarchy chain */}
      <div className={cn("px-3 py-2 border-b flex items-center flex-wrap gap-x-1.5 gap-y-1", accent.bg, accent.border)}>
        <span className={cn("font-semibold text-[11px] mr-1 shrink-0", accent.text)}>
          {salesType ? `${salesType} Hierarchy:` : "Field User Hierarchy:"}
        </span>
        {!salesType ? (
          <span className="text-muted-foreground text-[11px]">Select a Sales Type to view the hierarchy.</span>
        ) : (
          nodes.map((node, i) => {
            const isSelected = !!role && node.roles.includes(role);
            return (
              <React.Fragment key={node.label}>
                {i > 0 && <span className={cn("text-[10px] opacity-40", accent.text)}>→</span>}
                <span className={cn(
                  "font-medium text-[11px]",
                  isSelected
                    ? cn("font-bold underline underline-offset-2", accent.text)
                    : "text-foreground/60",
                )}>
                  {node.label}
                </span>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Detail row — only when role is selected */}
      {role ? (
        <div className="bg-white px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Selected Role</p>
              <p className={cn("font-semibold text-[11px]", accent.text)}>
                {roleObj?.fullName || role}{" "}
                <span className="opacity-60 font-normal">({role})</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Reports To</p>
              <p className="font-semibold text-[11px] text-foreground">{reportsTo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Geography Level</p>
              <p className="font-semibold text-[11px] text-foreground">{geoLevel}</p>
            </div>
          </div>
          {desc && (
            <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-1.5 leading-relaxed">{desc}</p>
          )}
        </div>
      ) : salesType ? (
        <div className="bg-white px-3 py-2 text-[11px] text-muted-foreground">
          Select a <strong className="text-foreground">Role</strong> to view the reporting line, reports-to, and geography mapping.
        </div>
      ) : null}
    </div>
  );
}

// ── Permissions Tab (metadata-driven accordion) ────────────────────────────────

const ALL_WEB_ACTIONS: WebAction[]    = ["view","create","edit","delete","approve","export","import"];
const ALL_MOBILE_ACTIONS: MobileAction[] = ["view","create","edit","delete","approve"];
const WEB_ACTION_LABELS: Record<WebAction, string>    = { view:"View", create:"Create", edit:"Edit", delete:"Delete", approve:"Approve", export:"Export", import:"Import" };
const MOBILE_ACTION_LABELS: Record<MobileAction, string> = { view:"View", create:"Create", edit:"Edit", delete:"Delete", approve:"Approve" };

function PermissionsTab({ perms, onChange, role }: {
  perms: UserPermissions;
  onChange: (p: UserPermissions) => void;
  role?: string;
}) {
  const [section, setSection]       = useState<"web"|"mobile">("web");
  const [openMods, setOpenMods]     = useState<Set<string>>(new Set([PERMISSION_REGISTRY[0].id]));
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([MOBILE_PERMISSION_REGISTRY[0].id]));

  const toggleMod   = (id: string) => setOpenMods(s   => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroup = (id: string) => setOpenGroups(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Getters ──────────────────────────────────────────────────────────────────
  const getSub = (modId: string, subId: string): SubmodulePermission =>
    (perms.web?.[modId]?.[subId]) || defaultSubPerm();
  const getMob = (grpId: string, featId: string): MobileFeaturePermission =>
    (perms.mobile?.[grpId]?.[featId]) || defaultMobilePerm();

  // ── Setters ──────────────────────────────────────────────────────────────────
  const setSubAction = (modId: string, subId: string, action: WebAction, val: boolean) =>
    onChange({ ...perms, web: { ...perms.web, [modId]: { ...(perms.web?.[modId]||{}), [subId]: { ...getSub(modId,subId), [action]: val } } } });

  const setMobAction = (grpId: string, featId: string, action: MobileAction, val: boolean) =>
    onChange({ ...perms, mobile: { ...perms.mobile, [grpId]: { ...(perms.mobile?.[grpId]||{}), [featId]: { ...getMob(grpId,featId), [action]: val } } } });

  // ── Bulk grant / revoke ───────────────────────────────────────────────────────
  const grantMod = (mod: PermModule) => {
    const updated = { ...(perms.web||{}) };
    updated[mod.id] = {};
    mod.submodules.forEach(s => { updated[mod.id][s.id] = { view:true,create:true,edit:true,delete:true,approve:true,export:true,import:true }; });
    onChange({ ...perms, web: updated });
  };
  const revokeMod = (mod: PermModule) => {
    const updated = { ...(perms.web||{}) };
    updated[mod.id] = {};
    mod.submodules.forEach(s => { updated[mod.id][s.id] = defaultSubPerm(); });
    onChange({ ...perms, web: updated });
  };
  const grantGroup = (grp: MobileGroupDef) => {
    const updated = { ...(perms.mobile||{}) };
    updated[grp.id] = {};
    grp.features.forEach(f => { updated[grp.id][f.id] = { view:true,create:true,edit:true,delete:true,approve:true }; });
    onChange({ ...perms, mobile: updated });
  };
  const revokeGroup = (grp: MobileGroupDef) => {
    const updated = { ...(perms.mobile||{}) };
    updated[grp.id] = {};
    grp.features.forEach(f => { updated[grp.id][f.id] = defaultMobilePerm(); });
    onChange({ ...perms, mobile: updated });
  };
  const grantAll  = () => {
    const f: UserPermissions = { web: {}, mobile: {} };
    PERMISSION_REGISTRY.forEach(m => { f.web[m.id] = {}; m.submodules.forEach(s => { f.web[m.id][s.id] = { view:true,create:true,edit:true,delete:true,approve:true,export:true,import:true }; }); });
    MOBILE_PERMISSION_REGISTRY.forEach(g => { f.mobile[g.id] = {}; g.features.forEach(ft => { f.mobile[g.id][ft.id] = { view:true,create:true,edit:true,delete:true,approve:true }; }); });
    onChange(f);
  };
  const revokeAll = () => onChange(defaultPermissions());

  // ── Status helpers ────────────────────────────────────────────────────────────
  const modHasAny = (mod: PermModule) =>
    mod.submodules.some(s => ALL_WEB_ACTIONS.some(a => (getSub(mod.id,s.id) as any)[a]));
  const groupHasAny = (grp: MobileGroupDef) =>
    grp.features.some(f => ALL_MOBILE_ACTIONS.some(a => (getMob(grp.id,f.id) as any)[a]));

  return (
    <div className="space-y-3">

      {/* ── Role defaults banner ─────────────────────────────────────────────── */}
      {role && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Role: <span className="text-brand-700">{role}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Load suggested permissions for this role. You can adjust individually after loading.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
              onClick={() => onChange(roleDefaultPermissions(role))}>
              Load Role Defaults
            </Button>
            <button type="button" onClick={grantAll}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">
              Grant All
            </button>
            <button type="button" onClick={revokeAll}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              Revoke All
            </button>
          </div>
        </div>
      )}

      {/* ── Section switcher ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 pb-3 border-b border-border">
        {([["web","Web Portal","Monitor"],["mobile","Mobile App","Smartphone"]] as const).map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setSection(key as "web"|"mobile")}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors border",
              section === key
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted/40",
            )}>
            {key === "web" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            {label} Permissions
          </button>
        ))}
      </div>

      {/* ── Web Portal ────────────────────────────────────────────────────────── */}
      {section === "web" && (
        <div className="space-y-1.5">
          {PERMISSION_REGISTRY.map(mod => {
            const expanded = openMods.has(mod.id);
            const hasAny = modHasAny(mod);
            return (
              <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                {/* Module header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors select-none",
                    expanded ? "bg-muted/30 border-b border-border" : hasAny ? "bg-brand-50/50" : "bg-white hover:bg-muted/20",
                  )}
                  onClick={() => toggleMod(mod.id)}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-150", !expanded && "-rotate-90")} />
                    <span className="text-xs font-semibold text-foreground">{mod.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({mod.submodules.length} submodule{mod.submodules.length > 1 ? "s" : ""})
                    </span>
                    {hasAny && !expanded && (
                      <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">configured</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => grantMod(mod)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">
                      Grant All
                    </button>
                    <button type="button" onClick={() => revokeMod(mod)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      Revoke All
                    </button>
                  </div>
                </div>

                {/* Submodule permission table */}
                {expanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/60">
                          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-44">
                            Submodule
                          </th>
                          {ALL_WEB_ACTIONS.map(a => (
                            <th key={a} className="px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">
                              {WEB_ACTION_LABELS[a]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mod.submodules.map((sub, si) => {
                          const sp = getSub(mod.id, sub.id);
                          const rowActive = ALL_WEB_ACTIONS.some(a => sub.actions.includes(a) && (sp as any)[a]);
                          return (
                            <tr key={sub.id} className={cn(
                              "border-b border-border/40 last:border-0 transition-colors",
                              si % 2 === 0 ? "bg-white" : "bg-muted/10",
                              rowActive && "bg-brand-50/30",
                            )}>
                              <td className="px-3 py-2 text-[11px] font-medium text-foreground/80">{sub.label}</td>
                              {ALL_WEB_ACTIONS.map(action => {
                                const supported = sub.actions.includes(action);
                                const checked   = (sp as any)[action] || false;
                                return (
                                  <td key={action} className="px-2 py-2 text-center">
                                    {supported ? (
                                      <input type="checkbox"
                                        checked={checked}
                                        onChange={e => setSubAction(mod.id, sub.id, action, e.target.checked)}
                                        className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer"
                                      />
                                    ) : (
                                      <span className="text-border text-[11px] select-none">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Mobile App ───────────────────────────────────────────────────────── */}
      {section === "mobile" && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-0.5 pb-1">
            <Info className="w-3 h-3 flex-shrink-0" />
            Mobile permissions primarily apply to field roles: DO, Intern, FMO, TM, ASM, KAM, RSM, ZSM.
          </p>
          {MOBILE_PERMISSION_REGISTRY.map(grp => {
            const expanded = openGroups.has(grp.id);
            const hasAny = groupHasAny(grp);
            return (
              <div key={grp.id} className="border border-border rounded-xl overflow-hidden">
                {/* Group header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors select-none",
                    expanded ? "bg-muted/30 border-b border-border" : hasAny ? "bg-brand-50/50" : "bg-white hover:bg-muted/20",
                  )}
                  onClick={() => toggleGroup(grp.id)}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-150", !expanded && "-rotate-90")} />
                    <span className="text-xs font-semibold text-foreground">{grp.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({grp.features.length} feature{grp.features.length > 1 ? "s" : ""})
                    </span>
                    {hasAny && !expanded && (
                      <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">configured</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => grantGroup(grp)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">
                      Grant All
                    </button>
                    <button type="button" onClick={() => revokeGroup(grp)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      Revoke All
                    </button>
                  </div>
                </div>

                {/* Feature permission table */}
                {expanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[520px]">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/60">
                          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-52">
                            Feature
                          </th>
                          {ALL_MOBILE_ACTIONS.map(a => (
                            <th key={a} className="px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">
                              {MOBILE_ACTION_LABELS[a]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grp.features.map((feat, fi) => {
                          const fp = getMob(grp.id, feat.id);
                          const rowActive = ALL_MOBILE_ACTIONS.some(a => feat.actions.includes(a) && (fp as any)[a]);
                          return (
                            <tr key={feat.id} className={cn(
                              "border-b border-border/40 last:border-0 transition-colors",
                              fi % 2 === 0 ? "bg-white" : "bg-muted/10",
                              rowActive && "bg-brand-50/30",
                            )}>
                              <td className="px-3 py-2 text-[11px] font-medium text-foreground/80">{feat.label}</td>
                              {ALL_MOBILE_ACTIONS.map(action => {
                                const supported = feat.actions.includes(action);
                                const checked   = (fp as any)[action] || false;
                                return (
                                  <td key={action} className="px-2 py-2 text-center">
                                    {supported ? (
                                      <input type="checkbox"
                                        checked={checked}
                                        onChange={e => setMobAction(grp.id, feat.id, action, e.target.checked)}
                                        className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer"
                                      />
                                    ) : (
                                      <span className="text-border text-[11px] select-none">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

// ── Geo helpers ───────────────────────────────────────────────────────────────

function isDescendantOf(node: GeoNode, ancestorLevel: GeoLevel, ancestorName: string, nodes: GeoNode[]): boolean {
  let cur: GeoNode | undefined = node;
  while (cur) {
    if (cur.level === ancestorLevel && cur.name === ancestorName) return true;
    if (cur.parentId === null) break;
    cur = nodes.find(n => n.id === cur!.parentId);
  }
  return false;
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function EmployeeForm({ mode, employee, onSave, onCancel, departments }: EmployeeFormProps) {
  const allEmployees = loadEmployees();
  const newEmpId = mode === "add" ? nextEmployeeId(allEmployees) : (employee?.employeeId || "");

  const initPerms = migratePermissions(employee?.permissions);

  // Geography master data (loaded once)
  const geoNodes = useMemo(() => loadGeoNodes().filter(n => n.status === "active"), []);

  const [form, setFormState] = useState<Partial<Employee>>(employee || {
    firstName: "", lastName: "", fullName: "",
    email: "", mobile: "", countryCode: "+91", alternativeMobile: "",
    bloodGroup: "Unknown", gender: undefined, dob: "",
    currentAddress: "", permanentAddress: "",
    emergencyContactName: "", emergencyContactMobile: "",
    emergencyContactRelation: "Spouse", emergencyContactAddress: "",
    departmentId: null, employeeType: undefined,
    roleType: undefined, salesType: undefined,
    roleId: null, role: "",
    reportingManagerId: null,
    status: "draft", joiningDate: todayStr(),
    geoZone: "", geoRegion: "", geoArea: "", territory: "", geoLocality: "",
    approvalLevel1Id: null, approvalLevel1Name: "", approvalLevel1Role: "",
    approvalLevel2Id: null, approvalLevel2Name: "", approvalLevel2Role: "",
    approvalLevel3Id: null, approvalLevel3Name: "", approvalLevel3Role: "",
  });

  const [perms, setPerms] = useState<UserPermissions>(initPerms);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sameAddress, setSameAddress] = useState(false);

  // ── Dynamic approval chain ──────────────────────────────────────────────────
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>(() => {
    const levels: ApprovalLevel[] = [];
    const resolve = (id?: number | null, name?: string, role?: string): ApprovalLevel | null => {
      if (!id) return null;
      const emp = allEmployees.find(e => e.id === id);
      return { empId: id, name: emp?.fullName || name || "", role: emp?.role || role || "", employeeCode: emp?.employeeId || "" };
    };
    const l1 = resolve(employee?.approvalLevel1Id, employee?.approvalLevel1Name, employee?.approvalLevel1Role);
    const l2 = resolve(employee?.approvalLevel2Id, employee?.approvalLevel2Name, employee?.approvalLevel2Role);
    const l3 = resolve(employee?.approvalLevel3Id, employee?.approvalLevel3Name, employee?.approvalLevel3Role);
    if (l1) levels.push(l1);
    if (l2) levels.push(l2);
    if (l3) levels.push(l3);
    // Start with at least one empty row
    if (levels.length === 0) levels.push({ empId: null, name: "", role: "", employeeCode: "" });
    return levels;
  });

  const set = (key: string, value: any) => {
    setFormState(prev => {
      const upd: Partial<Employee> = { ...prev, [key]: value };
      // Cascade resets
      if (key === "roleType") {
        upd.salesType = undefined;
        upd.roleId = null; upd.role = "";
        upd.geoZone = ""; upd.geoRegion = ""; upd.geoArea = "";
        upd.territory = ""; upd.geoLocality = "";
        upd.approvalLevel1Id = null; upd.approvalLevel1Name = ""; upd.approvalLevel1Role = "";
        upd.approvalLevel2Id = null; upd.approvalLevel2Name = ""; upd.approvalLevel2Role = "";
        upd.approvalLevel3Id = null; upd.approvalLevel3Name = ""; upd.approvalLevel3Role = "";
        setPerms(initPerms);
      }
      if (key === "salesType") {
        upd.roleId = null; upd.role = "";
      }
      // Cascade geo resets
      if (key === "geoZone") {
        upd.geoRegion = ""; upd.geoArea = ""; upd.territory = ""; upd.geoLocality = "";
      }
      if (key === "geoRegion") {
        upd.geoArea = ""; upd.territory = ""; upd.geoLocality = "";
      }
      if (key === "geoArea") {
        upd.territory = ""; upd.geoLocality = "";
      }
      if (key === "territory") {
        upd.geoLocality = "";
      }
      if (key === "firstName" || key === "lastName")
        upd.fullName = `${key === "firstName" ? value : prev.firstName || ""} ${key === "lastName" ? value : prev.lastName || ""}`.trim();
      return upd;
    });
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  // ── Derived options ──────────────────────────────────────────────────────────

  const deptOptions = departments.map(d => ({ label: d.name, value: d.id }));

  const roleOptions = useMemo(() => {
    if (!form.roleType) return [];
    if (form.roleType === "Field User") {
      if (!form.salesType) return [];
      const list = form.salesType === "Retail Sales" ? RETAIL_SALES_ROLES : INSTITUTIONAL_SALES_ROLES;
      return list.map(r => ({ label: r.fullName, value: r.id }));
    }
    return ADMIN_ROLES.map(r => ({ label: r.fullName, value: r.id }));
  }, [form.roleType, form.salesType]);

  // Reporting manager options — suggested (direct superior) first, all active users available
  const managerOptions = useMemo(() => {
    const aboveRoles = form.role ? (ROLES_ABOVE[form.role] || []) : [];
    const directRole = aboveRoles[0] || "";
    const geoMatch = (e: Employee) =>
      (form.geoZone && e.geoZone && e.geoZone === form.geoZone) ||
      (form.geoRegion && e.geoRegion && e.geoRegion === form.geoRegion);

    const priority = (e: Employee): number => {
      const isGeo = geoMatch(e);
      if (directRole && e.role === directRole && isGeo) return 0;  // direct superior + same geo
      if (directRole && e.role === directRole) return 1;            // direct superior
      if (aboveRoles.includes(e.role) && isGeo) return 2;          // any higher role + same geo
      if (aboveRoles.includes(e.role)) return 3;                    // any higher role
      return 4;                                                      // everyone else
    };

    return allEmployees
      .filter(e => e.status === "active" && e.id !== employee?.id)
      .sort((a, b) => {
        const diff = priority(a) - priority(b);
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName);
      })
      .map(e => ({
        label: e.fullName,
        value: e.id,
        sub: `${e.employeeId} · ${e.role}${e.department ? ` · ${e.department}` : ""}${e.geoZone ? ` · ${e.geoZone}` : e.geoRegion ? ` · ${e.geoRegion}` : ""}`,
      }));
  }, [employee?.id, form.role, form.geoZone, form.geoRegion]);

  const geoFields: string[] = useMemo(() => {
    if (form.roleType !== "Field User" || !form.role) return [];
    return ROLE_GEO_FIELDS[form.role] || [];
  }, [form.roleType, form.role]);

  // ── Geo dropdown options (cascading from Geography Master) ──────────────────
  const geoZoneOptions = useMemo(() =>
    geoNodes.filter(n => n.level === "Zone").map(n => ({ label: n.name, value: n.name })),
  [geoNodes]);

  const geoRegionOptions = useMemo(() => {
    const nodes = geoNodes.filter(n => n.level === "Region");
    if (!form.geoZone) return nodes.map(n => ({ label: n.name, value: n.name }));
    return nodes
      .filter(n => isDescendantOf(n, "Zone", form.geoZone!, geoNodes))
      .map(n => ({ label: n.name, value: n.name }));
  }, [geoNodes, form.geoZone]);

  const geoAreaOptions = useMemo(() => {
    const nodes = geoNodes.filter(n => n.level === "Area");
    if (!form.geoRegion) return nodes.map(n => ({ label: n.name, value: n.name }));
    return nodes
      .filter(n => isDescendantOf(n, "Region", form.geoRegion!, geoNodes))
      .map(n => ({ label: n.name, value: n.name }));
  }, [geoNodes, form.geoRegion]);

  const geoTerritoryOptions = useMemo(() => {
    const nodes = geoNodes.filter(n => n.level === "Territory");
    if (!form.geoArea) return nodes.map(n => ({ label: n.name, value: n.name }));
    return nodes
      .filter(n => isDescendantOf(n, "Area", form.geoArea!, geoNodes))
      .map(n => ({ label: n.name, value: n.name }));
  }, [geoNodes, form.geoArea]);

  const geoLocalityOptions = useMemo(() => {
    const nodes = geoNodes.filter(n => n.level === "Locality");
    if (!form.territory) return nodes.map(n => ({ label: n.name, value: n.name }));
    return nodes
      .filter(n => isDescendantOf(n, "Territory", form.territory!, geoNodes))
      .map(n => ({ label: n.name, value: n.name }));
  }, [geoNodes, form.territory]);

  const geoOptionsMap: Record<string, ACOption[]> = {
    Zone: geoZoneOptions, Region: geoRegionOptions, Area: geoAreaOptions,
    Territory: geoTerritoryOptions, Locality: geoLocalityOptions,
  };

  // ── Flexible approval options — ALL active users, hierarchy-suggested first ──
  const allApprovalOptions: ACOption[] = useMemo(() => {
    const aboveRoles = ROLES_ABOVE[form.role || ""] || [];
    const directRole = aboveRoles[0] || "";
    const geoMatch = (e: Employee) =>
      (form.geoZone && e.geoZone && e.geoZone === form.geoZone) ||
      (form.geoRegion && e.geoRegion && e.geoRegion === form.geoRegion);

    const priority = (e: Employee): number => {
      const isDirect = e.role === directRole;
      const isHigher = aboveRoles.includes(e.role);
      const isGeo = geoMatch(e);
      if (isDirect && isGeo) return 0;
      if (isDirect) return 1;
      if (isHigher && isGeo) return 2;
      if (isHigher) return 3;
      return 4;
    };

    return allEmployees
      .filter(e => e.status === "active" && e.id !== employee?.id)
      .sort((a, b) => {
        const diff = priority(a) - priority(b);
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName);
      })
      .map(e => ({
        label: e.fullName,
        value: e.id,
        sub: `${e.employeeId} · ${e.role}${e.department ? ` · ${e.department}` : ""}${e.geoZone ? ` · ${e.geoZone}` : e.geoRegion ? ` · ${e.geoRegion}` : ""}`,
      }));
  }, [employee?.id, form.role, form.geoZone, form.geoRegion]);

  // ── Approval chain helpers ──────────────────────────────────────────────────
  const addApprovalLevel = () =>
    setApprovalLevels(prev => [...prev, { empId: null, name: "", role: "", employeeCode: "" }]);

  const removeApprovalLevel = (idx: number) =>
    setApprovalLevels(prev => prev.filter((_, i) => i !== idx));

  const moveApprovalLevel = (idx: number, dir: "up" | "down") =>
    setApprovalLevels(prev => {
      const arr = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });

  const setApprovalLevelUser = (idx: number, empId: number | "") => {
    const emp = empId ? allEmployees.find(e => e.id === empId) : null;
    setApprovalLevels(prev => {
      const arr = [...prev];
      arr[idx] = {
        empId: emp ? emp.id : null,
        name: emp?.fullName || "",
        role: emp?.role || "",
        employeeCode: emp?.employeeId || "",
      };
      return arr;
    });
  };

  // ── Geo value map ────────────────────────────────────────────────────────────
  const geoKey: Record<string, keyof Employee> = {
    Zone: "geoZone", Region: "geoRegion", Area: "geoArea",
    Territory: "territory", Locality: "geoLocality",
  };

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName?.trim()) e.firstName = "Required";
    if (!form.lastName?.trim()) e.lastName = "Required";
    const eErr = validateEmail(form.email || "");
    if (eErr) e.email = eErr;
    else {
      const eu = validateEmailUnique(form.email || "", allEmployees, employee?.id);
      if (eu) e.email = eu;
    }
    const mErr = validateMobile(form.mobile || "");
    if (mErr) e.mobile = mErr;
    else {
      const mu = validateMobileUnique(form.mobile || "", allEmployees, employee?.id);
      if (mu) e.mobile = mu;
    }
    if (!form.departmentId) e.departmentId = "Required";
    if (!form.employeeType) e.employeeType = "Required";
    if (!form.roleType) e.roleType = "Required";
    if (form.roleType === "Field User" && !form.salesType) e.salesType = "Required";
    if (!form.roleId) e.roleId = "Required";
    if (!form.emergencyContactName?.trim()) e.emergencyContactName = "Required";
    const emErr = validateMobile(form.emergencyContactMobile || "");
    if (emErr) e.emergencyContactMobile = emErr;
    if (form.roleType === "Field User") {
      geoFields.forEach(f => {
        const k = geoKey[f] as string;
        if (!(form as any)[k]?.trim()) e[k] = "Required";
      });
    }
    const cErr = validateCircularReporting(form.id || 0, form.reportingManagerId || null, allEmployees);
    if (cErr) e.reportingManagerId = cErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    // Resolve role name from id
    const allRoles = [...RETAIL_SALES_ROLES, ...INSTITUTIONAL_SALES_ROLES, ...ADMIN_ROLES];
    const roleObj = allRoles.find(r => r.id === form.roleId);
    const dept = departments.find(d => d.id === form.departmentId);
    const rm = allEmployees.find(e => e.id === form.reportingManagerId);
    const now = todayStr();

    const saved: Employee = {
      id: form.id || (Math.max(0, ...allEmployees.map(e => e.id)) + 1),
      employeeId: form.employeeId || newEmpId,
      firstName: form.firstName || "",
      lastName: form.lastName || "",
      fullName: form.fullName || `${form.firstName || ""} ${form.lastName || ""}`.trim(),
      email: form.email || "",
      mobile: form.mobile || "",
      countryCode: form.countryCode || "+91",
      alternativeMobile: form.alternativeMobile || "",
      bloodGroup: (form.bloodGroup as any) || "Unknown",
      gender: form.gender,
      dob: form.dob || "",
      currentAddress: form.currentAddress || "",
      permanentAddress: form.permanentAddress || "",
      emergencyContactName: form.emergencyContactName || "",
      emergencyContactMobile: form.emergencyContactMobile || "",
      emergencyContactRelation: (form.emergencyContactRelation as any) || "Spouse",
      emergencyContactAddress: form.emergencyContactAddress || "",
      departmentId: form.departmentId || null,
      department: dept?.name || "",
      employeeType: (form.employeeType as any) || undefined,
      roleType: form.roleType,
      salesType: form.salesType,
      roleId: form.roleId || null,
      role: roleObj?.name || "",
      reportingManagerId: form.reportingManagerId || null,
      reportingManager: rm?.fullName || "",
      status: (form.status as any) || "draft",
      joiningDate: form.joiningDate || now,
      geoZone: form.geoZone || "",
      geoRegion: form.geoRegion || "",
      geoArea: form.geoArea || "",
      territory: form.territory || "",
      geoLocality: form.geoLocality || "",
      permissions: perms,
      // Approval chain — dynamic levels, save up to 3 for backward compat
      approvalLevel1Id: approvalLevels[0]?.empId || null,
      approvalLevel1Name: approvalLevels[0]?.name || "",
      approvalLevel1Role: approvalLevels[0]?.role || "",
      approvalLevel2Id: approvalLevels[1]?.empId || null,
      approvalLevel2Name: approvalLevels[1]?.name || "",
      approvalLevel2Role: approvalLevels[1]?.role || "",
      approvalLevel3Id: approvalLevels[2]?.empId || null,
      approvalLevel3Name: approvalLevels[2]?.name || "",
      approvalLevel3Role: approvalLevels[2]?.role || "",
      profilePhotoPath: form.profilePhotoPath || "",
      createdBy: form.createdBy || "Admin",
      createdDate: form.createdDate || now,
      updatedBy: "Admin",
      updatedDate: now,
      lastStatusChange: form.lastStatusChange || now,
    };
    onSave(saved);
  };

  // ── Role type accent colors ──────────────────────────────────────────────────
  const roleTypeAccent = form.roleType === "Field User"
    ? { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" }
    : { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" };

  const inp = (key: string) => cn("h-8 text-xs", errors[key] && "border-red-400");

  return (
    <FormContainer
      title={mode === "add" ? "Add User" : "Edit User"}
      description={`User Management → User → ${mode === "add" ? "Create" : "Update"}`}
      onBack={onCancel}
      onCancel={onCancel}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[11px] font-mono font-semibold px-2 py-0.5 rounded",
            mode === "add" ? "bg-muted/40 text-muted-foreground" : "bg-brand-50 text-brand-700"
          )}>
            {mode === "add" ? `ID: ${newEmpId}` : employee?.employeeId}
          </span>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        </div>
      }
    >
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        {/* ── Tabs ───────────────────────────────────────────────────────────────── */}
        <div className="flex-1 px-5 py-4">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="h-8 p-0.5 bg-muted/30 mb-4 inline-flex gap-0.5">
            <TabsTrigger value="personal" className="text-xs h-7 px-4">Personal Details</TabsTrigger>
            <TabsTrigger value="employment" className="text-xs h-7 px-4">Employment Details</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs h-7 px-4 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Permissions
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 1 — PERSONAL DETAILS
              ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="personal" className="space-y-5 mt-0">

            {/* Basic Info */}
            <div>
              <SectionHead label="Basic Information" />
              <div className="grid grid-cols-4 gap-3">

                {/* Full Name */}
                <Field label="First Name" required error={errors.firstName}>
                  <Input value={form.firstName || ""} onChange={e => set("firstName", e.target.value)}
                    placeholder="First name" className={inp("firstName")} />
                </Field>
                <Field label="Last Name" required error={errors.lastName}>
                  <Input value={form.lastName || ""} onChange={e => set("lastName", e.target.value)}
                    placeholder="Last name" className={inp("lastName")} />
                </Field>

                {/* Mobile with Country Code */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mobile Number <span className="text-red-500">*</span></Label>
                  <div className="flex gap-1">
                    <CountryCodePicker
                      value={form.countryCode || "+91"}
                      onChange={v => set("countryCode", v)}
                      hasError={!!errors.mobile}
                    />
                    <Input value={form.mobile || ""} onChange={e => set("mobile", e.target.value)}
                      placeholder="10-digit mobile" maxLength={10}
                      className={cn("h-8 text-xs flex-1", errors.mobile && "border-red-400")} />
                  </div>
                  {errors.mobile && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.mobile}</p>}
                </div>

                {/* Email */}
                <div className="col-span-1">
                  <Field label="Email ID" required error={errors.email}>
                    <Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)}
                      placeholder="user@example.com" className={inp("email")} />
                  </Field>
                </div>

                {/* DOB */}
                <Field label="Date of Birth">
                  <Input type="date" value={form.dob || ""} onChange={e => set("dob", e.target.value)}
                    className="h-8 text-xs" />
                </Field>

                {/* Gender */}
                <AC label="Gender" value={form.gender || ""} onChange={v => set("gender", v)}
                  options={["Male", "Female", "Other"].map(g => ({ label: g, value: g }))}
                  placeholder="Select gender" />

                {/* Blood Group */}
                <AC label="Blood Group" value={form.bloodGroup || "Unknown"} onChange={v => set("bloodGroup", v)}
                  options={BLOOD_GROUPS.map(b => ({ label: b, value: b }))} />

              </div>
            </div>

            {/* Emergency Contact */}
            <div className="border-t border-border/60 pt-4">
              <SectionHead label="Emergency Contact" />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Contact Name" required error={errors.emergencyContactName}>
                  <Input value={form.emergencyContactName || ""} onChange={e => set("emergencyContactName", e.target.value)}
                    placeholder="Full name" className={inp("emergencyContactName")} />
                </Field>
                <AC label="Relationship" value={form.emergencyContactRelation || "Spouse"}
                  onChange={v => set("emergencyContactRelation", v)}
                  options={RELATIONS.map(r => ({ label: r, value: r }))} />
                <Field label="Contact Number" required error={errors.emergencyContactMobile}>
                  <Input value={form.emergencyContactMobile || ""} onChange={e => set("emergencyContactMobile", e.target.value)}
                    placeholder="10-digit mobile" maxLength={10} className={inp("emergencyContactMobile")} />
                </Field>
                <div className="col-span-3">
                  <Field label="Emergency Contact Address">
                    <Textarea value={form.emergencyContactAddress || ""} onChange={e => set("emergencyContactAddress", e.target.value)}
                      placeholder="Emergency contact's home address" rows={2} className="text-xs resize-none" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="border-t border-border/60 pt-4">
              <SectionHead label="Address Details" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Current Address</Label>
                  <Textarea value={form.currentAddress || ""} onChange={e => {
                    set("currentAddress", e.target.value);
                    if (sameAddress) set("permanentAddress", e.target.value);
                  }}
                    placeholder="Current / residential address" rows={3} className="text-xs resize-none" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Permanent Address</Label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={sameAddress} onChange={e => {
                        setSameAddress(e.target.checked);
                        if (e.target.checked) set("permanentAddress", form.currentAddress || "");
                      }} className="w-3.5 h-3.5 accent-brand-600 rounded" />
                      <span className="text-[11px] text-muted-foreground">Same as current address</span>
                    </label>
                  </div>
                  <Textarea value={form.permanentAddress || ""} onChange={e => set("permanentAddress", e.target.value)}
                    disabled={sameAddress}
                    placeholder={sameAddress ? "Same as current address" : "Permanent / home town address"}
                    rows={3} className={cn("text-xs resize-none", sameAddress && "opacity-50")} />
                </div>
              </div>
            </div>

            {/* Audit Info (edit mode) */}
            {mode === "edit" && employee && (
              <div className="border-t border-border/60 pt-4">
                <div className="bg-muted/30 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Record Info</p>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                    <div><span className="text-muted-foreground block">User ID</span><span className="font-mono font-semibold text-brand-700">{employee.employeeId}</span></div>
                    <div><span className="text-muted-foreground block">Created By</span><span className="font-medium">{employee.createdBy}</span></div>
                    <div><span className="text-muted-foreground block">Created Date</span><span className="font-medium">{employee.createdDate}</span></div>
                    <div><span className="text-muted-foreground block">Last Updated</span><span className="font-medium">{employee.updatedDate}</span></div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 2 — EMPLOYMENT DETAILS
              ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="employment" className="space-y-5 mt-0">

            {/* Employee ID + Basic Employment */}
            <div>
              <SectionHead label="Employment Information" />
              <div className="grid grid-cols-4 gap-3">

                {/* Employee ID (read-only) */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Employee ID</Label>
                  <div className="h-8 px-2.5 border border-border rounded-lg bg-muted/30 flex items-center">
                    <span className="text-xs font-mono font-semibold text-brand-700">
                      {mode === "add" ? newEmpId : employee?.employeeId}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Auto</span>
                  </div>
                </div>

                <AC label="Department" required value={form.departmentId || ""}
                  onChange={v => set("departmentId", v)}
                  options={deptOptions} placeholder="Select department"
                  error={errors.departmentId} />

                <AC label="Employee Type" required value={form.employeeType || ""}
                  onChange={v => set("employeeType", v)}
                  options={EMPLOYEE_TYPES.map(t => ({ label: t, value: t }))}
                  placeholder="Select type" error={errors.employeeType} />

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Date of Joining <span className="text-red-500">*</span></Label>
                  <Input type="date" value={form.joiningDate || todayStr()}
                    onChange={e => set("joiningDate", e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* Role Type */}
            <div className="border-t border-border/60 pt-4">
              <SectionHead label="Role & Access Level" />
              <div className="space-y-3">

                <PillSelect
                  label="Role Type" required
                  options={ROLE_TYPES.map(r => ({ value: r, label: r }))}
                  value={form.roleType || ""}
                  onChange={v => set("roleType", v as RoleType)}
                  error={errors.roleType}
                />

                {/* Sales Type — only for Field User */}
                {form.roleType === "Field User" && (
                  <PillSelect
                    label="Sales Type" required
                    options={SALES_TYPES.map(s => ({ value: s, label: s }))}
                    value={form.salesType || ""}
                    onChange={v => set("salesType", v as SalesType)}
                    error={errors.salesType}
                  />
                )}

                {/* Hierarchy info card */}
                {form.roleType && (
                  <HierarchyInfoCard
                    roleType={form.roleType}
                    salesType={form.salesType}
                    role={form.role || ""}
                    geoFields={geoFields}
                    accent={roleTypeAccent}
                  />
                )}

                {/* Role dropdown */}
                {form.roleType && (form.roleType !== "Field User" || form.salesType) && (
                  <div className="grid grid-cols-3 gap-3">
                    <AC label="Role" required value={form.roleId || ""}
                      onChange={v => {
                        const allRoles = [...RETAIL_SALES_ROLES, ...INSTITUTIONAL_SALES_ROLES, ...ADMIN_ROLES];
                        const r = allRoles.find(x => x.id === v);
                        setFormState(prev => ({
                          ...prev, roleId: v as number, role: r?.name || "",
                          geoZone: "", geoRegion: "", geoArea: "", territory: "", geoLocality: "",
                          approvalLevel1Id: null, approvalLevel1Name: "", approvalLevel1Role: "",
                          approvalLevel2Id: null, approvalLevel2Name: "", approvalLevel2Role: "",
                          approvalLevel3Id: null, approvalLevel3Name: "", approvalLevel3Role: "",
                        }));
                        setErrors(prev => ({ ...prev, roleId: "" }));
                      }}
                      options={roleOptions}
                      placeholder="Select role"
                      error={errors.roleId} />

                    {/* Reporting Manager */}
                    <AC label="Reporting Manager" value={form.reportingManagerId || ""}
                      onChange={v => set("reportingManagerId", v)}
                      options={managerOptions}
                      placeholder="Search by name, ID, role… (hierarchy suggested)"
                      error={errors.reportingManagerId} />

                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Status</Label>
                      <div className="flex gap-1.5 pt-0.5">
                        {["draft", "active", "inactive"].map(s => (
                          <label key={s} className={cn(
                            "flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
                            form.status === s ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted/30"
                          )}>
                            <input type="radio" name="status" value={s} checked={form.status === s}
                              onChange={e => set("status", e.target.value)} className="w-3 h-3 accent-brand-600" />
                            <span className="capitalize">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Geography Mapping */}
            {form.roleType === "Field User" && form.role && (
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <SectionHead label={`Geography Mapping — ${form.role}`} />
                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">
                    {geoFields.length > 0 ? geoFields.join(" → ") : "National Level — No mapping required"}
                  </span>
                </div>

                {geoFields.length === 0 ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {form.role ? `${form.role} operates at national level` : "This role operates at national level"} — no specific geography mapping required.
                  </div>
                ) : (
                  <>
                    <div className={cn("grid gap-3", geoFields.length <= 3 ? "grid-cols-3" : "grid-cols-5")}>
                      {geoFields.map(f => {
                        const k = geoKey[f] as string;
                        const opts = geoOptionsMap[f] || [];
                        const currentVal = (form as any)[k] || "";
                        return (
                          <AC key={f} label={f} required
                            value={currentVal}
                            onChange={v => set(k, v)}
                            options={opts}
                            placeholder={`Select ${f}`}
                            error={errors[k]}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3 flex-shrink-0" />
                      Selections are loaded from Geography Master. Choosing a higher level filters the options below it automatically.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Admin User — no geography required */}
            {form.roleType && form.roleType !== "Field User" && (
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Admin User</strong> — No geography mapping required.
                    Admin users have organisation-wide visibility within their module scope.
                  </p>
                </div>
              </div>
            )}

            {/* ── Approval Chain Configuration ──────────────────────────────── */}
            {form.role && (
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <SectionHead
                    label="Approval Chain Configuration"
                    sub="Select any active user for each level. Hierarchy-suggested users appear first. Drag or reorder levels freely."
                  />
                </div>

                {/* ── Level rows ── */}
                <div className="border border-border rounded-xl overflow-hidden mb-2">
                  {/* Header */}
                  <div className="grid grid-cols-[28px_52px_1fr_52px] bg-muted/40 border-b border-border px-3 py-2 gap-2">
                    <div />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Level</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Approver</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Order</p>
                  </div>

                  {approvalLevels.map((lvl, i) => (
                    <div key={i} className={cn(
                      "grid grid-cols-[28px_52px_1fr_52px] gap-2 px-3 py-2.5 items-center",
                      i < approvalLevels.length - 1 && "border-b border-border/60",
                      i % 2 === 0 ? "bg-white" : "bg-muted/10",
                    )}>
                      {/* Drag handle (cosmetic) */}
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />

                      {/* Level badge */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[9px] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">L{i + 1}</span>
                      </div>

                      {/* Approver dropdown */}
                      <AC
                        label=""
                        value={lvl.empId || ""}
                        onChange={v => setApprovalLevelUser(i, v as number | "")}
                        options={allApprovalOptions}
                        placeholder={`Search name, ID, role, department…`}
                      />

                      {/* Up / Down / Remove */}
                      <div className="flex flex-col gap-0.5 items-end">
                        <button type="button" disabled={i === 0} onClick={() => moveApprovalLevel(i, "up")}
                          className={cn("p-0.5 rounded transition-colors", i === 0 ? "opacity-25 cursor-not-allowed" : "hover:bg-muted/60")}>
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button type="button" disabled={i === approvalLevels.length - 1} onClick={() => moveApprovalLevel(i, "down")}
                          className={cn("p-0.5 rounded transition-colors", i === approvalLevels.length - 1 ? "opacity-25 cursor-not-allowed" : "hover:bg-muted/60")}>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {approvalLevels.length > 1 && (
                          <button type="button" onClick={() => removeApprovalLevel(i)}
                            className="p-0.5 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add level button */}
                <button type="button" onClick={addApprovalLevel}
                  className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium px-1 py-1 rounded hover:bg-brand-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Add Approval Level
                </button>

                {/* Chain preview */}
                {approvalLevels.some(l => l.empId) && (
                  <div className="bg-muted/20 border border-border/50 rounded-lg px-3 py-2.5 mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Approval Chain Preview
                    </p>
                    <div className="space-y-1.5">
                      {approvalLevels.map((lvl, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground text-[10px] w-5">L{i + 1}</span>
                          <span className="text-muted-foreground text-[10px]">→</span>
                          {lvl.empId ? (
                            <>
                              <span className="font-semibold text-foreground text-[11px]">{lvl.name}</span>
                              <span className="text-muted-foreground text-[10px]">({lvl.role})</span>
                              <span className="font-mono text-[10px] text-brand-700">{lvl.employeeCode}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-[10px] italic">Not selected</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                      Applied for: Procurement, Sales, Leave, Expense and Event approvals.
                    </p>
                  </div>
                )}
              </div>
            )}

          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 3 — PERMISSIONS
              ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="permissions" className="mt-0">
            <PermissionsTab perms={perms} onChange={setPerms} role={form.role} />
          </TabsContent>

        </Tabs>
        </div>
      </div>
    </FormContainer>
  );
}
