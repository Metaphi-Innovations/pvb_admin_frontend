"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { policyToday } from "@/lib/hr/policy-common";
import {
  CITY_CATEGORIES,
  getRoleDisplayName,
  getSalesForceRoleIds,
  stampNew,
  stampUpdate,
  type CityCategory,
  type LodgingRule,
} from "../tada-policy-data";
import { PolicyMasterTable, PolicyField, compactSelect } from "./PolicyMasterTable";

export function LodgingRulesSection({
  records,
  onSave,
}: {
  records: LodgingRule[];
  onSave: (list: LodgingRule[]) => void;
}) {
  const sfIds = getSalesForceRoleIds();
  return (
    <PolicyMasterTable<LodgingRule>
      title="Lodging Rules"
      description="Hotel stay limits by role and city category. Used when claim Stay Type = Hotel."
      entityName="Lodging Rule"
      records={records}
      onSave={onSave}
      searchKeys={["roleId", "cityCategory"]}
      filterOptions={[
        { key: "roleId", label: "Role", values: sfIds.map((id) => ({ v: String(id), l: getRoleDisplayName(id) })) },
        { key: "cityCategory", label: "Category", values: [...CITY_CATEGORIES] },
      ]}
      columns={[
        { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
        { key: "cityCategory", header: "City Category" },
        { key: "lodgingLimitPerDay", header: "Limit/Day", render: (r) => `₹${r.lodgingLimitPerDay.toLocaleString("en-IN")}` },
        { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
        { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
        { key: "effectiveFrom", header: "Effective From" },
      ]}
      defaultForm={{
        roleId: sfIds[0] ?? 0,
        cityCategory: "Other",
        lodgingLimitPerDay: 1500,
        billRequired: true,
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
          lodgingLimitPerDay: Number(f.lodgingLimitPerDay) || 0,
          billRequired: !!f.billRequired,
          autoApprovalAllowed: !!f.autoApprovalAllowed,
          effectiveFrom: f.effectiveFrom ?? policyToday(),
          effectiveTo: f.effectiveTo ?? "",
          remarks: f.remarks ?? "",
        };
        return ex ? stampUpdate<LodgingRule>({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew<LodgingRule>(b, id);
      }}
      validate={(f) => (Number(f.lodgingLimitPerDay) <= 0 ? "Lodging limit is required" : null)}
      renderFormFields={({ form, setForm }) => (
        <div className="space-y-3">
          <PolicyField label="Role">
            <Select value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}>
              <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
              <SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent>
            </Select>
          </PolicyField>
          <PolicyField label="City Category">
            <Select value={form.cityCategory ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v as any }))}>
              <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
              <SelectContent>{CITY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </PolicyField>
          <PolicyField label="Lodging Limit Per Day"><Input type="number" className="h-8 text-xs" value={form.lodgingLimitPerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, lodgingLimitPerDay: Number(e.target.value) }))} /></PolicyField>
          <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Bill Required</span><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
          <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Auto Approval Allowed</span><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
          <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
          <PolicyField label="Effective To"><Input type="date" className="h-8 text-xs" value={form.effectiveTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></PolicyField>
          <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
        </div>
      )}
    />
  );
}
