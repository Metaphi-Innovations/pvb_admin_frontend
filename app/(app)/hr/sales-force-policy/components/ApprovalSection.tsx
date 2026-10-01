"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  APPROVAL_LEVELS,
  getClaimCategoryById,
  getRoleDisplayName,
  getSalesForceRoleIds,
  loadClaimCategories,
  stampNew,
  stampUpdate,
  type ApprovalThresholdRule,
  type AutoValidationSettings,
} from "../tada-policy-data";
import { PolicyMasterTable, PolicyField, compactSelect } from "./PolicyMasterTable";

export function ApprovalSection({
  thresholds,
  settings,
  onSaveThresholds,
  onSaveSettings,
}: {
  thresholds: ApprovalThresholdRule[];
  settings: AutoValidationSettings;
  onSaveThresholds: (list: ApprovalThresholdRule[]) => void;
  onSaveSettings: (s: AutoValidationSettings) => void;
}) {
  const sfIds = getSalesForceRoleIds();
  const claimCategories = loadClaimCategories();
  const [localSettings, setLocalSettings] = useState(settings);

  const saveSettings = () => onSaveSettings(localSettings);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-section-title text-navy-900">Approval & Auto Validation</h2>
        <p className="text-helper text-muted-foreground mt-0.5">
          Auto-approve when all checks pass; otherwise route through Reporting Manager → Higher Sales Role → HR → Accounts.
        </p>
      </div>

      <div className="page-shell p-4 space-y-3">
        <p className="text-xs font-semibold">Auto Validation Checks</p>
        <p className="text-[11px] text-muted-foreground">
          Auto approve only if: role is TA/DA applicable, claim category configured, city category derived, amount within limit,
          travel class allowed, bill uploaded if required, declaration completed, no leave overlap, no duplicate, and auto approval enabled.
        </p>
        {[
          { k: "autoApprovalEnabled" as const, l: "Auto Approval Enabled" },
          { k: "requireBill" as const, l: "Require Bill When Policy Says So" },
          { k: "requireDeclaration" as const, l: "Require Declaration For Flat Stay" },
          { k: "blockOnLeave" as const, l: "Block On Leave / Absent / Holiday" },
          { k: "blockOnDuplicate" as const, l: "Block Duplicate Claims" },
        ].map(({ k, l }) => (
          <div key={k} className="flex items-center justify-between p-2 rounded border">
            <span className="text-xs">{l}</span>
            <Switch checked={!!localSettings[k]} onCheckedChange={(v) => setLocalSettings((s) => ({ ...s, [k]: v }))} />
          </div>
        ))}
        <PolicyField label="Remarks">
          <Input className="h-8 text-xs" value={localSettings.remarks} onChange={(e) => setLocalSettings((s) => ({ ...s, remarks: e.target.value }))} />
        </PolicyField>
        <Button size="sm" onClick={saveSettings}>Save Auto Validation Settings</Button>
      </div>

      <PolicyMasterTable<ApprovalThresholdRule>
        title="Approval Threshold Rules"
        description="Amount-based approval routing. Example: 0–5000 → Reporting Manager; 5001–20000 → + RSM/ZSM; 20001+ → + HR + Accounts."
        entityName="Approval Threshold"
        records={thresholds}
        onSave={onSaveThresholds}
        searchKeys={["roleId", "amountFrom", "amountTo"]}
        columns={[
          { key: "roleId", header: "Role", render: (r) => (r.roleId == null ? "All" : getRoleDisplayName(r.roleId)) },
          { key: "claimCategoryId", header: "Claim Category", render: (r) => (r.claimCategoryId == null ? "All" : getClaimCategoryById(r.claimCategoryId)?.claimCategoryName ?? "—") },
          { key: "amountFrom", header: "Amount From", render: (r) => `₹${r.amountFrom.toLocaleString("en-IN")}` },
          { key: "amountTo", header: "Amount To", render: (r) => `₹${r.amountTo.toLocaleString("en-IN")}` },
          { key: "approvalLevel1", header: "Level 1" },
          { key: "approvalLevel2", header: "Level 2", render: (r) => r.approvalLevel2 || "—" },
          { key: "approvalLevel3", header: "Level 3", render: (r) => r.approvalLevel3 || "—" },
          { key: "approvalLevel4", header: "Level 4", render: (r) => r.approvalLevel4 || "—" },
        ]}
        defaultForm={{
          roleId: null,
          claimCategoryId: null,
          amountFrom: 0,
          amountTo: 5000,
          approvalLevel1: "Reporting Manager",
          approvalLevel2: "",
          approvalLevel3: "",
          approvalLevel4: "",
          remarks: "",
          status: "active",
        }}
        getFormFromRecord={(r) => ({ ...r })}
        recordFromForm={(f, id, ex) => {
          const b = {
            roleId: f.roleId == null ? null : Number(f.roleId),
            claimCategoryId: f.claimCategoryId == null ? null : Number(f.claimCategoryId),
            amountFrom: Number(f.amountFrom) || 0,
            amountTo: Number(f.amountTo) || 0,
            approvalLevel1: f.approvalLevel1 ?? "",
            approvalLevel2: f.approvalLevel2 ?? "",
            approvalLevel3: f.approvalLevel3 ?? "",
            approvalLevel4: f.approvalLevel4 ?? "",
            remarks: f.remarks ?? "",
          };
          return ex ? stampUpdate<ApprovalThresholdRule>({ ...ex, ...b, status: f.status ?? ex.status }) : stampNew<ApprovalThresholdRule>(b, id);
        }}
        validate={(f) => (Number(f.amountTo) < Number(f.amountFrom) ? "Amount To must be ≥ Amount From" : null)}
        renderFormFields={({ form, setForm }) => (
          <div className="space-y-3">
            <PolicyField label="Role">
              <Select value={form.roleId == null ? "all" : String(form.roleId)} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v === "all" ? null : Number(v) }))}>
                <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                  {sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}
                </SelectContent>
              </Select>
            </PolicyField>
            <PolicyField label="Claim Category">
              <Select value={form.claimCategoryId == null ? "all" : String(form.claimCategoryId)} onValueChange={(v) => setForm((f) => ({ ...f, claimCategoryId: v === "all" ? null : Number(v) }))}>
                <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {claimCategories.map((c) => <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.claimCategoryName}</SelectItem>)}
                </SelectContent>
              </Select>
            </PolicyField>
            <PolicyField label="Amount From"><Input type="number" className="h-8 text-xs" value={form.amountFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, amountFrom: Number(e.target.value) }))} /></PolicyField>
            <PolicyField label="Amount To"><Input type="number" className="h-8 text-xs" value={form.amountTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, amountTo: Number(e.target.value) }))} /></PolicyField>
            {(["approvalLevel1", "approvalLevel2", "approvalLevel3", "approvalLevel4"] as const).map((lvl, i) => (
              <PolicyField key={lvl} label={`Approval Level ${i + 1}`}>
                <Select value={form[lvl] || "none"} onValueChange={(v) => setForm((f) => ({ ...f, [lvl]: v === "none" ? "" : v }))}>
                  <SelectTrigger className={compactSelect()}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    {APPROVAL_LEVELS.map((l) => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </PolicyField>
            ))}
            <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
          </div>
        )}
      />
    </div>
  );
}
