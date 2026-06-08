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
  type FlatStayRule,
} from "../tada-policy-data";
import { PolicyMasterTable, PolicyField, compactSelect } from "./PolicyMasterTable";

export function FlatStayAllowanceSection({
  records,
  onSave,
}: {
  records: FlatStayRule[];
  onSave: (list: FlatStayRule[]) => void;
}) {
  const sfIds = getSalesForceRoleIds();
  return (
    <PolicyMasterTable<FlatStayRule>
      title="Flat Stay Allowance"
      description="Stay with friends/family/relative — declaration required, bill not required by default."
      entityName="Flat Stay Allowance"
      records={records}
      onSave={onSave}
      searchKeys={["roleId", "cityCategory"]}
      columns={[
        { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
        { key: "cityCategory", header: "City Category" },
        { key: "allowancePerDay", header: "Per Day", render: (r) => `₹${r.allowancePerDay}` },
        { key: "declarationRequired", header: "Declaration", render: (r) => (r.declarationRequired ? "Yes" : "No") },
        { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
        { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
      ]}
      defaultForm={{
        roleId: sfIds[0] ?? 0,
        cityCategory: "Other",
        allowancePerDay: 400,
        declarationRequired: true,
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
          allowancePerDay: Number(f.allowancePerDay) || 0,
          declarationRequired: !!f.declarationRequired,
          billRequired: !!f.billRequired,
          autoApprovalAllowed: !!f.autoApprovalAllowed,
          effectiveFrom: f.effectiveFrom ?? policyToday(),
          effectiveTo: f.effectiveTo ?? "",
          remarks: f.remarks ?? "",
        };
        return ex ? stampUpdate({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew(b, id);
      }}
      validate={(f) => (Number(f.allowancePerDay) <= 0 ? "Allowance amount is required" : null)}
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
          <PolicyField label="Flat Stay Allowance Per Day"><Input type="number" className="h-8 text-xs" value={form.allowancePerDay ?? ""} onChange={(e) => setForm((f) => ({ ...f, allowancePerDay: Number(e.target.value) }))} /></PolicyField>
          <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Declaration Required</span><Switch checked={form.declarationRequired !== false} onCheckedChange={(v) => setForm((f) => ({ ...f, declarationRequired: v }))} /></div>
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
