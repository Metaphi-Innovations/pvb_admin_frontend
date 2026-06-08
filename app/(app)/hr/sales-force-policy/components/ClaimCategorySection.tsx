"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LIMIT_TYPES,
  stampNew,
  stampUpdate,
  type ClaimCategoryMaster,
  type LimitType,
} from "../tada-policy-data";
import { PolicyMasterTable, PolicyField, compactSelect } from "./PolicyMasterTable";

const SEED_NAMES = [
  "Travel Fare",
  "Lodging",
  "Boarding / Meals",
  "Flat Stay Allowance",
  "Local Conveyance",
  "Personal Vehicle KM",
  "Incidental Allowance",
];

export function ClaimCategorySection({
  records,
  onSave,
}: {
  records: ClaimCategoryMaster[];
  onSave: (list: ClaimCategoryMaster[]) => void;
}) {
  return (
    <PolicyMasterTable<ClaimCategoryMaster>
      title="Claim Category Master"
      description="Seven claim categories for Sales Force TA/DA. No overnight journey category."
      entityName="Claim Category"
      records={records}
      onSave={onSave}
      searchKeys={["claimCategoryName", "description"]}
      columns={[
        { key: "claimCategoryName", header: "Category", sortable: true },
        { key: "description", header: "Description" },
        { key: "limitType", header: "Limit Type" },
        { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
      ]}
      defaultForm={{
        claimCategoryName: SEED_NAMES[0],
        description: "",
        billRequired: true,
        limitType: "Per Day",
        remarks: "",
        status: "active",
      }}
      getFormFromRecord={(r) => ({ ...r })}
      recordFromForm={(f, id, ex) => {
        const b = {
          claimCategoryName: f.claimCategoryName ?? "",
          description: f.description ?? "",
          billRequired: !!f.billRequired,
          limitType: f.limitType as LimitType,
          remarks: f.remarks ?? "",
        };
        return ex ? stampUpdate({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew(b, id);
      }}
      validate={(f) => (!f.claimCategoryName ? "Name required" : null)}
      renderFormFields={({ form, setForm }) => (
        <div className="space-y-3">
          <PolicyField label="Claim Category Name" required>
            <Select value={form.claimCategoryName ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, claimCategoryName: v }))}>
              <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
              <SelectContent>{SEED_NAMES.map((n) => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}</SelectContent>
            </Select>
          </PolicyField>
          <PolicyField label="Description"><Input className="h-8 text-xs" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></PolicyField>
          <PolicyField label="Limit Type">
            <Select value={form.limitType ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, limitType: v }))}>
              <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
              <SelectContent>{LIMIT_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select>
          </PolicyField>
          <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Bill Required</span><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
          <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
        </div>
      )}
    />
  );
}
