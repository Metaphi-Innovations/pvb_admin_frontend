"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { policyToday } from "@/lib/hr/policy-common";
import {
  CITY_CATEGORIES,
  LOCAL_TRAVEL_MODES,
  getRoleDisplayName,
  getSalesForceRoleIds,
  stampNew,
  stampUpdate,
  type CityCategory,
  type LocalConveyanceRule,
  type MealsAllowanceRule,
} from "../tada-policy-data";
import { PolicyMasterTable, PolicyField, compactSelect } from "./PolicyMasterTable";

type Tab = "meals" | "conveyance";

export function LocalCityTravelRulesSection({
  meals,
  conveyance,
  onSaveMeals,
  onSaveConveyance,
  activeTab,
  onTabChange,
  hideTabs = false,
  hideHeader = false,
}: {
  meals: MealsAllowanceRule[];
  conveyance: LocalConveyanceRule[];
  onSaveMeals: (list: MealsAllowanceRule[]) => void;
  onSaveConveyance: (list: LocalConveyanceRule[]) => void;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  hideTabs?: boolean;
  hideHeader?: boolean;
}) {
  const [internalTab, setInternalTab] = useState<Tab>("meals");
  const tab = activeTab ?? internalTab;
  const setTab = (next: Tab) => {
    if (onTabChange) onTabChange(next);
    else setInternalTab(next);
  };
  const sfIds = getSalesForceRoleIds();

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div>
          <h2 className="text-section-title text-navy-900">Local City Travel Rules</h2>
          <p className="text-helper text-muted-foreground mt-0.5">
            Configure within-city daily meals allowance and local conveyance rules separately.
          </p>
        </div>
      )}

      {!hideTabs && (
        <div className="flex gap-1 border-b">
          {[
            { id: "meals" as const, label: "Meals Allowance" },
            { id: "conveyance" as const, label: "Local Conveyance" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 -mb-px",
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "meals" && (
        <PolicyMasterTable<MealsAllowanceRule>
          title={hideHeader ? "Meals Allowance" : ""}
          description={hideHeader ? "Role-wise daily meals allowance within city limits." : ""}
          entityName="Meals Allowance"
          records={meals}
          onSave={onSaveMeals}
          searchKeys={["roleId", "cityCategory"]}
          columns={[
            { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
            { key: "cityCategory", header: "City Category" },
            { key: "mealsAllowancePerDay", header: "Per Day", render: (r) => `₹${r.mealsAllowancePerDay}` },
            { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
            { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
            { key: "effectiveFrom", header: "Effective From" },
          ]}
          defaultForm={{
            roleId: sfIds[0] ?? 0,
            cityCategory: "Other",
            mealsAllowancePerDay: 250,
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
              cityCategory: f.cityCategory as CityCategory,
              mealsAllowancePerDay: Number(f.mealsAllowancePerDay) || 0,
              billRequired: !!f.billRequired,
              autoApprovalAllowed: !!f.autoApprovalAllowed,
              effectiveFrom: f.effectiveFrom ?? policyToday(),
              effectiveTo: f.effectiveTo ?? "",
              remarks: f.remarks ?? "",
            };
            return ex ? stampUpdate({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew(b, id);
          }}
          validate={(f) => (Number(f.mealsAllowancePerDay) <= 0 ? "Meals allowance is required" : null)}
          renderFormFields={({ form, setForm }) => (
            <div className="space-y-3">
              <PolicyField label="Role">
                <Select value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}>
                  <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                  <SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent>
                </Select>
              </PolicyField>
              <PolicyField label="City Category">
                <Select value={form.cityCategory ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))}>
                  <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                  <SelectContent>{CITY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </PolicyField>
              <PolicyField label="Meals Allowance Per Day"><Input type="number" className="h-8 text-xs" value={form.mealsAllowancePerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, mealsAllowancePerDay: Number(e.target.value) }))} /></PolicyField>
              <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Bill Required</span><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
              <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Auto Approval Allowed</span><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
              <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
              <PolicyField label="Effective To"><Input type="date" className="h-8 text-xs" value={form.effectiveTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></PolicyField>
              <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
            </div>
          )}
        />
      )}

      {tab === "conveyance" && (
        <PolicyMasterTable<LocalConveyanceRule>
          title={hideHeader ? "Local Conveyance" : ""}
          description={hideHeader ? "Within-city conveyance modes and daily limits by role." : ""}
          entityName="Local Conveyance"
          records={conveyance}
          onSave={onSaveConveyance}
          searchKeys={["roleId", "cityCategory"]}
          columns={[
            { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
            { key: "cityCategory", header: "City Category" },
            { key: "allowedModes", header: "Allowed Modes", render: (r) => r.allowedModes.join(", ") },
            { key: "conveyanceLimitPerDay", header: "Limit/Day", render: (r) => `₹${r.conveyanceLimitPerDay}` },
            { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
            { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
          ]}
          defaultForm={{
            roleId: sfIds[0] ?? 0,
            cityCategory: "Other",
            allowedModes: ["Auto", "Bus"],
            conveyanceLimitPerDay: 500,
            billRequired: false,
            autoApprovalAllowed: true,
            effectiveFrom: policyToday(),
            effectiveTo: "",
            remarks: "",
            status: "active",
          }}
          getFormFromRecord={(r) => ({ ...r, allowedModes: [...r.allowedModes] })}
          recordFromForm={(f, id, ex) => {
            const b = {
              roleId: Number(f.roleId),
              cityCategory: f.cityCategory as CityCategory,
              allowedModes: f.allowedModes ?? [],
              conveyanceLimitPerDay: Number(f.conveyanceLimitPerDay) || 0,
              billRequired: !!f.billRequired,
              autoApprovalAllowed: !!f.autoApprovalAllowed,
              effectiveFrom: f.effectiveFrom ?? policyToday(),
              effectiveTo: f.effectiveTo ?? "",
              remarks: f.remarks ?? "",
            };
            return ex ? stampUpdate({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew(b, id);
          }}
          validate={(f) => (Number(f.conveyanceLimitPerDay) <= 0 ? "Conveyance limit is required" : null)}
          renderFormFields={({ form, setForm }) => (
            <div className="space-y-3">
              <PolicyField label="Role">
                <Select value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}>
                  <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                  <SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent>
                </Select>
              </PolicyField>
              <PolicyField label="City Category">
                <Select value={form.cityCategory ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))}>
                  <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                  <SelectContent>{CITY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </PolicyField>
              <div className="space-y-1">
                <p className="text-xs font-medium">Allowed Local Travel Modes</p>
                <div className="border rounded-lg p-2 space-y-1 max-h-36 overflow-y-auto">
                  {LOCAL_TRAVEL_MODES.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={(form.allowedModes ?? []).includes(m)}
                        onCheckedChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            allowedModes: v
                              ? [...(f.allowedModes ?? []), m]
                              : (f.allowedModes ?? []).filter((x) => x !== m),
                          }))
                        }
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <PolicyField label="Conveyance Limit Per Day"><Input type="number" className="h-8 text-xs" value={form.conveyanceLimitPerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, conveyanceLimitPerDay: Number(e.target.value) }))} /></PolicyField>
              <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Bill Required</span><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
              <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Auto Approval Allowed</span><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
              <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
              <PolicyField label="Effective To"><Input type="date" className="h-8 text-xs" value={form.effectiveTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></PolicyField>
              <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
            </div>
          )}
        />
      )}
    </div>
  );
}
