"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";
import { policyToday } from "@/lib/hr/policy-common";
import { PolicyMasterTable, PolicyField, compactSelect } from "./components/PolicyMasterTable";
import { RolePolicyMappingSection } from "./components/RolePolicyMappingSection";
import { EntitlementMatrixSection } from "./components/EntitlementMatrixSection";
import { TravelRulesSection } from "./components/TravelRulesSection";
import { CityCategorySection } from "./components/CityCategorySection";
import { ClaimCategorySection } from "./components/ClaimCategorySection";
import { LodgingRulesSection } from "./components/LodgingRulesSection";
import { FlatStayAllowanceSection } from "./components/FlatStayAllowanceSection";
import { LocalCityTravelRulesSection } from "./components/LocalCityTravelRulesSection";
import { ApprovalSection } from "./components/ApprovalSection";
import {
  CITY_CATEGORIES,
  VEHICLE_TYPES,
  loadRolePolicyMappings,
  saveRolePolicyMappings,
  loadCityCategories,
  saveCityCategories,
  loadClaimCategories,
  saveClaimCategories,
  loadEntitlements,
  saveEntitlements,
  loadTravelModeRules,
  saveTravelModeRules,
  loadLodgingRules,
  saveLodgingRules,
  loadFlatStayRules,
  saveFlatStayRules,
  loadMealsAllowanceRules,
  saveMealsAllowanceRules,
  loadLocalConveyanceRules,
  saveLocalConveyanceRules,
  loadPersonalVehicleKmRules,
  savePersonalVehicleKmRules,
  loadIncidentalRules,
  saveIncidentalRules,
  loadApprovalThresholdRules,
  saveApprovalThresholdRules,
  loadAutoValidationSettings,
  saveAutoValidationSettings,
  getRoleDisplayName,
  getSalesForceRoleIds,
  stampNew,
  stampUpdate,
  type CityCategory,
  type PersonalVehicleKmRule,
  type IncidentalAllowanceRule,
  type TravelMode,
  type VehicleType,
} from "./tada-policy-data";

type PolicyGroupId = "general" | "travel" | "stay" | "approval";

type PolicyTabId =
  | "roleMapping"
  | "cities"
  | "claimCategories"
  | "air"
  | "rail"
  | "bus"
  | "personalKm"
  | "lodging"
  | "flatStay"
  | "meals"
  | "conveyance"
  | "incidental"
  | "entitlements"
  | "approval";

const POLICY_GROUPS: {
  id: PolicyGroupId;
  label: string;
  description: string;
  tabs: { id: PolicyTabId; label: string }[];
}[] = [
  {
    id: "general",
    label: "General Setup",
    description: "Roles, city categories, and claim types that drive entitlement lookup.",
    tabs: [
      { id: "roleMapping", label: "Role Policy Mapping" },
      { id: "cities", label: "City Category Master" },
      { id: "claimCategories", label: "Claim Category Master" },
    ],
  },
  {
    id: "travel",
    label: "Travel Policy",
    description: "Inter-city travel classes and personal vehicle reimbursement.",
    tabs: [
      { id: "air", label: "Air Travel" },
      { id: "rail", label: "Rail Travel" },
      { id: "bus", label: "Bus Travel" },
      { id: "personalKm", label: "Personal Vehicle KM Rules" },
    ],
  },
  {
    id: "stay",
    label: "Stay & Allowances",
    description: "Lodging, daily allowances, and within-city expense limits.",
    tabs: [
      { id: "lodging", label: "Lodging Rules" },
      { id: "flatStay", label: "Flat Stay Allowance" },
      { id: "meals", label: "Meals Allowance" },
      { id: "conveyance", label: "Local Conveyance" },
      { id: "incidental", label: "Incidental Allowance" },
    ],
  },
  {
    id: "approval",
    label: "Approval Rules",
    description: "Entitlement matrix, approval thresholds, and auto-validation.",
    tabs: [
      { id: "entitlements", label: "Entitlement Matrix" },
      { id: "approval", label: "Approval & Auto Validation" },
    ],
  },
];

const TAB_TO_GROUP = new Map<PolicyTabId, PolicyGroupId>(
  POLICY_GROUPS.flatMap((g) => g.tabs.map((t) => [t.id, g.id] as const)),
);

const TRAVEL_TAB_MODE: Partial<Record<PolicyTabId, TravelMode>> = {
  air: "Air",
  rail: "Rail",
  bus: "Bus",
};

const LEGACY_TAB: Record<string, PolicyTabId> = {
  roles: "roleMapping",
  roleMapping: "roleMapping",
  cities: "cities",
  claimCategories: "claimCategories",
  entitlements: "entitlements",
  travelClass: "air",
  travelRules: "air",
  lodging: "lodging",
  flatStay: "flatStay",
  localTravel: "meals",
  personalKm: "personalKm",
  incidental: "incidental",
  approval: "approval",
  travelModes: "air",
  expenseLimits: "entitlements",
  eligibility: "air",
  billRules: "entitlements",
  autoApproval: "approval",
  approvalHierarchy: "approval",
  attendanceRules: "roleMapping",
};

function resolveNav(searchParams: URLSearchParams): { group: PolicyGroupId; tab: PolicyTabId } {
  const groupParam = searchParams.get("group") as PolicyGroupId | null;
  const tabParam = searchParams.get("tab");
  const sub = searchParams.get("sub");

  let tab: PolicyTabId = "roleMapping";
  if (tabParam && LEGACY_TAB[tabParam]) tab = LEGACY_TAB[tabParam];
  else if (tabParam && TAB_TO_GROUP.has(tabParam as PolicyTabId)) tab = tabParam as PolicyTabId;

  if (tabParam === "travelRules" && sub === "Rail") tab = "rail";
  else if (tabParam === "travelRules" && sub === "Bus") tab = "bus";
  else if (tabParam === "travelRules" && sub === "Air") tab = "air";
  else if (tabParam === "localTravel" && sub === "conveyance") tab = "conveyance";
  else if (tabParam === "localTravel" && sub === "meals") tab = "meals";

  const group = groupParam && POLICY_GROUPS.some((g) => g.id === groupParam)
    ? groupParam
    : TAB_TO_GROUP.get(tab) ?? "general";

  if (!POLICY_GROUPS.find((g) => g.id === group)?.tabs.some((t) => t.id === tab)) {
    tab = POLICY_GROUPS.find((g) => g.id === group)!.tabs[0].id;
  }

  return { group, tab };
}

function PolicyTabBar({
  tabs,
  active,
  onSelect,
  size = "primary",
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
  size?: "primary" | "secondary";
}) {
  const isPrimary = size === "primary";
  return (
    <div
      className={cn(
        "flex gap-0 overflow-x-auto",
        isPrimary ? "border-b border-border/70" : "bg-muted/30 rounded-lg p-1",
      )}
    >
      {tabs.map((t) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              "whitespace-nowrap transition-colors font-medium",
              isPrimary
                ? cn(
                    "px-4 py-3 text-sm border-b-2 -mb-px",
                    selected
                      ? "border-brand-600 text-brand-800 bg-brand-50/40"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
                  )
                : cn(
                    "px-3 py-1.5 text-xs rounded-md",
                    selected
                      ? "bg-white text-brand-800 shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/60",
                  ),
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SalesForceTadaPolicyPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [group, setGroup] = useState<PolicyGroupId>("general");
  const [tab, setTab] = useState<PolicyTabId>("roleMapping");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);

  const [roleMappings, setRoleMappings] = useState(loadRolePolicyMappings);
  const [cities, setCities] = useState(loadCityCategories);
  const [claimCategories, setClaimCategories] = useState(loadClaimCategories);
  const [entitlements, setEntitlements] = useState(loadEntitlements);
  const [travelRules, setTravelRules] = useState(loadTravelModeRules);
  const [lodging, setLodging] = useState(loadLodgingRules);
  const [flatStay, setFlatStay] = useState(loadFlatStayRules);
  const [meals, setMeals] = useState(loadMealsAllowanceRules);
  const [conveyance, setConveyance] = useState(loadLocalConveyanceRules);
  const [personalKm, setPersonalKm] = useState(loadPersonalVehicleKmRules);
  const [incidental, setIncidental] = useState(loadIncidentalRules);
  const [approvalThresholds, setApprovalThresholds] = useState(loadApprovalThresholdRules);
  const [autoValidation, setAutoValidation] = useState(loadAutoValidationSettings);

  const sfIds = getSalesForceRoleIds();
  const activeGroup = POLICY_GROUPS.find((g) => g.id === group)!;
  const activeTabMeta = activeGroup.tabs.find((t) => t.id === tab);
  const travelMode = TRAVEL_TAB_MODE[tab];

  useEffect(() => {
    const resolved = resolveNav(searchParams);
    setGroup(resolved.group);
    setTab(resolved.tab);
    const rf = searchParams.get("roleId");
    setRoleFilter(rf ? Number(rf) : null);
  }, [searchParams]);

  const refresh = useCallback(() => {
    setRoleMappings(loadRolePolicyMappings());
    setCities(loadCityCategories());
    setClaimCategories(loadClaimCategories());
    setEntitlements(loadEntitlements());
    setTravelRules(loadTravelModeRules());
    setLodging(loadLodgingRules());
    setFlatStay(loadFlatStayRules());
    setMeals(loadMealsAllowanceRules());
    setConveyance(loadLocalConveyanceRules());
    setPersonalKm(loadPersonalVehicleKmRules());
    setIncidental(loadIncidentalRules());
    setApprovalThresholds(loadApprovalThresholdRules());
    setAutoValidation(loadAutoValidationSettings());
  }, []);

  useEffect(() => {
    refresh();
  }, [tab, refresh]);

  const goTo = (nextGroup: PolicyGroupId, nextTab: PolicyTabId, roleId?: number | null) => {
    setGroup(nextGroup);
    setTab(nextTab);
    setRoleFilter(roleId ?? null);
    const params = new URLSearchParams();
    params.set("group", nextGroup);
    params.set("tab", nextTab);
    if (roleId != null) params.set("roleId", String(roleId));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const navigate = (legacyTab: string, roleId?: number) => {
    const resolved = LEGACY_TAB[legacyTab] ?? legacyTab;
    const nextTab = (TAB_TO_GROUP.has(resolved as PolicyTabId) ? resolved : "entitlements") as PolicyTabId;
    const nextGroup = TAB_TO_GROUP.get(nextTab) ?? "approval";
    goTo(nextGroup, nextTab, roleId ?? null);
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-full">
        <PageHeader
          title="Sales Force TA/DA Policy Master"
          description="Business-friendly policy configuration for Sales Force roles. Role + City Category + Claim Category = Eligible Amount."
          icon={Shield}
          breadcrumbs={[
            { label: "HR", href: "/hr/sales-force-attendance" },
            { label: "Sales Force TA/DA Policy Master", href: "/hr/sales-force-policy" },
            { label: activeGroup.label },
            ...(activeTabMeta ? [{ label: activeTabMeta.label }] : []),
          ]}
        />

        <div className="rounded-xl border border-border/70 bg-white shadow-sm overflow-hidden">
          <PolicyTabBar
            tabs={POLICY_GROUPS.map((g) => ({ id: g.id, label: g.label }))}
            active={group}
            onSelect={(id) => {
              const g = POLICY_GROUPS.find((x) => x.id === id)!;
              goTo(g.id, g.tabs[0].id, roleFilter);
            }}
            size="primary"
          />

          <div className="px-4 pt-3 pb-2 border-b border-border/50 bg-gradient-to-r from-slate-50/80 to-white">
            <p className="text-xs text-muted-foreground mb-2">{activeGroup.description}</p>
            <PolicyTabBar
              tabs={activeGroup.tabs}
              active={tab}
              onSelect={(id) => goTo(group, id as PolicyTabId, roleFilter)}
              size="secondary"
            />
          </div>

          <div className="p-4 md:p-5 min-h-[480px]">
            {tab === "roleMapping" && (
              <RolePolicyMappingSection
                mappings={roleMappings}
                onSave={(l) => {
                  saveRolePolicyMappings(l);
                  setRoleMappings(l);
                }}
                onNavigate={navigate}
              />
            )}

            {tab === "cities" && (
              <CityCategorySection
                records={cities}
                onSave={(l) => {
                  saveCityCategories(l);
                  setCities(l);
                }}
              />
            )}

            {tab === "claimCategories" && (
              <ClaimCategorySection
                records={claimCategories}
                onSave={(l) => {
                  saveClaimCategories(l);
                  setClaimCategories(l);
                }}
              />
            )}

            {travelMode && (
              <TravelRulesSection
                records={roleFilter ? travelRules.filter((r) => r.roleId === roleFilter) : travelRules}
                activeTab={travelMode}
                hideTabs
                onTabChange={(mode) => {
                  const next =
                    mode === "Air" ? "air" : mode === "Rail" ? "rail" : "bus";
                  goTo("travel", next, roleFilter);
                }}
                onSave={(list) => {
                  const merged = roleFilter
                    ? [...travelRules.filter((r) => r.roleId !== roleFilter), ...list]
                    : list;
                  saveTravelModeRules(merged);
                  setTravelRules(merged);
                }}
              />
            )}

            {tab === "lodging" && (
              <LodgingRulesSection
                records={lodging}
                onSave={(l) => {
                  saveLodgingRules(l);
                  setLodging(l);
                }}
              />
            )}

            {tab === "flatStay" && (
              <FlatStayAllowanceSection
                records={flatStay}
                onSave={(l) => {
                  saveFlatStayRules(l);
                  setFlatStay(l);
                }}
              />
            )}

            {tab === "meals" && (
              <LocalCityTravelRulesSection
                meals={meals}
                conveyance={conveyance}
                activeTab="meals"
                hideTabs
                hideHeader
                onSaveMeals={(l) => {
                  saveMealsAllowanceRules(l);
                  setMeals(l);
                }}
                onSaveConveyance={(l) => {
                  saveLocalConveyanceRules(l);
                  setConveyance(l);
                }}
              />
            )}

            {tab === "conveyance" && (
              <LocalCityTravelRulesSection
                meals={meals}
                conveyance={conveyance}
                activeTab="conveyance"
                hideTabs
                hideHeader
                onSaveMeals={(l) => {
                  saveMealsAllowanceRules(l);
                  setMeals(l);
                }}
                onSaveConveyance={(l) => {
                  saveLocalConveyanceRules(l);
                  setConveyance(l);
                }}
              />
            )}

            {tab === "personalKm" && (
              <PolicyMasterTable<PersonalVehicleKmRule>
                title="Personal Vehicle KM Rules"
                description="Two Wheeler ₹5/KM, Four Wheeler ₹12.5/KM — role-wise limits."
                entityName="Personal Vehicle KM"
                records={personalKm}
                onSave={(l) => {
                  savePersonalVehicleKmRules(l);
                  setPersonalKm(l);
                }}
                searchKeys={["roleId", "vehicleType"]}
                columns={[
                  { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
                  { key: "vehicleType", header: "Vehicle" },
                  { key: "ratePerKm", header: "Rate/KM", render: (r) => `₹${r.ratePerKm}` },
                  { key: "maxKmPerDay", header: "Max KM/Day" },
                  { key: "approvalRequiredAboveKm", header: "Approval Above KM" },
                  { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
                ]}
                defaultForm={{
                  roleId: sfIds[0] ?? 0,
                  vehicleType: "Two Wheeler",
                  ratePerKm: 5,
                  maxKmPerDay: 100,
                  approvalRequiredAboveKm: 60,
                  autoApprovalAllowed: true,
                  effectiveFrom: policyToday(),
                  effectiveTo: "",
                  remarks: "",
                  status: "active",
                }}
                getFormFromRecord={(r) => ({ ...r })}
                recordFromForm={(f, id, ex) => {
                  const b = {
                    roleId: Number(f.roleId),
                    vehicleType: f.vehicleType as VehicleType,
                    ratePerKm: Number(f.ratePerKm) || 0,
                    maxKmPerDay: Number(f.maxKmPerDay) || 0,
                    approvalRequiredAboveKm: Number(f.approvalRequiredAboveKm) || 0,
                    autoApprovalAllowed: !!f.autoApprovalAllowed,
                    effectiveFrom: f.effectiveFrom ?? policyToday(),
                    effectiveTo: f.effectiveTo ?? "",
                    remarks: f.remarks ?? "",
                  };
                  return ex ? stampUpdate<PersonalVehicleKmRule>({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew<PersonalVehicleKmRule>(b, id);
                }}
                validate={() => null}
                renderFormFields={({ form, setForm }) => (
                  <div className="space-y-3">
                    <PolicyField label="Role"><Select value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}><SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger><SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent></Select></PolicyField>
                    <PolicyField label="Vehicle Type"><Select value={form.vehicleType ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, vehicleType: v as any, ratePerKm: v === "Four Wheeler" ? 12.5 : 5 }))}><SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger><SelectContent>{VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent></Select></PolicyField>
                    <PolicyField label="Rate Per KM"><Input type="number" step="0.1" className="h-8 text-xs" value={form.ratePerKm ?? ""} onChange={(e) => setForm((f) => ({ ...f, ratePerKm: Number(e.target.value) }))} /></PolicyField>
                    <PolicyField label="Max KM Per Day"><Input type="number" className="h-8 text-xs" value={form.maxKmPerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, maxKmPerDay: Number(e.target.value) }))} /></PolicyField>
                    <PolicyField label="Approval Required Above KM"><Input type="number" className="h-8 text-xs" value={form.approvalRequiredAboveKm ?? ""} onChange={(e) => setForm((f) => ({ ...f, approvalRequiredAboveKm: Number(e.target.value) }))} /></PolicyField>
                    <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Auto Approval Allowed</span><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
                    <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
                    <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
                  </div>
                )}
              />
            )}

            {tab === "incidental" && (
              <PolicyMasterTable<IncidentalAllowanceRule>
                title="Incidental Allowance Rules"
                description="Role-wise daily incidental — typically ₹100/day. Bill not required."
                entityName="Incidental Allowance"
                records={incidental}
                onSave={(l) => {
                  saveIncidentalRules(l);
                  setIncidental(l);
                }}
                searchKeys={["roleId", "cityCategory"]}
                columns={[
                  { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
                  { key: "cityCategory", header: "City Category" },
                  { key: "allowancePerDay", header: "Per Day", render: (r) => `₹${r.allowancePerDay}` },
                  { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
                  { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
                ]}
                defaultForm={{
                  roleId: sfIds[0] ?? 0,
                  cityCategory: "All",
                  allowancePerDay: 100,
                  billRequired: false,
                  autoApprovalAllowed: true,
                  effectiveFrom: policyToday(),
                  effectiveTo: "",
                  remarks: "",
                  status: "active",
                }}
                getFormFromRecord={(r) => ({ ...r })}
                recordFromForm={(f, id, ex) => {
                  const b = {
                    roleId: Number(f.roleId),
                    cityCategory: (f.cityCategory ?? "All") as CityCategory | "All",
                    allowancePerDay: Number(f.allowancePerDay) || 0,
                    billRequired: !!f.billRequired,
                    autoApprovalAllowed: !!f.autoApprovalAllowed,
                    effectiveFrom: f.effectiveFrom ?? policyToday(),
                    effectiveTo: f.effectiveTo ?? "",
                    remarks: f.remarks ?? "",
                  };
                  return ex ? stampUpdate<IncidentalAllowanceRule>({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew<IncidentalAllowanceRule>(b, id);
                }}
                validate={() => null}
                renderFormFields={({ form, setForm }) => (
                  <div className="space-y-3">
                    <PolicyField label="Role"><Select value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}><SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger><SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent></Select></PolicyField>
                    <PolicyField label="City Category"><Select value={form.cityCategory ?? "All"} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v as any }))}><SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All" className="text-xs">All</SelectItem>{CITY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select></PolicyField>
                    <PolicyField label="Incidental Allowance Per Day"><Input type="number" className="h-8 text-xs" value={form.allowancePerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, allowancePerDay: Number(e.target.value) }))} /></PolicyField>
                    <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Bill Required</span><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
                    <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Auto Approval Allowed</span><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
                    <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
                    <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
                  </div>
                )}
              />
            )}

            {tab === "entitlements" && (
              <EntitlementMatrixSection
                records={roleFilter ? entitlements.filter((e) => e.roleId === roleFilter) : entitlements}
                onSave={(l) => {
                  const merged = roleFilter
                    ? [...entitlements.filter((e) => e.roleId !== roleFilter), ...l]
                    : l;
                  saveEntitlements(merged);
                  setEntitlements(merged);
                }}
                claimCategories={claimCategories}
              />
            )}

            {tab === "approval" && (
              <ApprovalSection
                thresholds={approvalThresholds}
                settings={autoValidation}
                onSaveThresholds={(l) => {
                  saveApprovalThresholdRules(l);
                  setApprovalThresholds(l);
                }}
                onSaveSettings={(s) => {
                  saveAutoValidationSettings(s);
                  setAutoValidation(s);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
