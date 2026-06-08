"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExternalLink, Copy } from "lucide-react";
import {
  PolicyMasterTable,
  PolicyField,
  compactSelect,
} from "./PolicyMasterTable";
import {
  appendPolicyAudit,
  copyEntitlementsFromRole,
  getClaimCategoryById,
  getMappableUmRoles,
  getRoleDisplayName,
  getSalesForceRoleIds,
  getUmRoleIdByName,
  type EntitlementMatrix,
  type CityCategory,
  type LimitType,
  CITY_CATEGORIES,
  LIMIT_TYPES,
  SF_ROLE_NAMES,
  stampNew,
  stampUpdate,
} from "../tada-policy-data";

export function EntitlementMatrixSection({
  records,
  onSave,
  claimCategories,
}: {
  records: EntitlementMatrix[];
  onSave: (list: EntitlementMatrix[]) => void;
  claimCategories: { id: number; claimCategoryName: string }[];
}) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [fromRole, setFromRole] = useState("");
  const [toRole, setToRole] = useState("");
  const sfIds = getSalesForceRoleIds();

  const doCopy = () => {
    const from = Number(fromRole);
    const to = Number(toRole);
    if (!from || !to || from === to) return;
    onSave(copyEntitlementsFromRole(from, to));
    setCopyOpen(false);
  };

  return (
    <>
      <PolicyMasterTable<EntitlementMatrix>
        title="Entitlement Matrix"
        description="Core policy: Role + City Category + Claim Category = Eligible Amount. Lodging, boarding, flat stay, and other limits."
        entityName="Entitlement Matrix"
        records={records}
        onSave={onSave}
        showImportExport
        headerActions={
          <Button variant="outline" size="sm" onClick={() => setCopyOpen(true)}>
            <Copy className="w-3.5 h-3.5" /> Copy Policy
          </Button>
        }
        searchKeys={["roleId", "cityCategory", "claimCategoryId"]}
        filterOptions={[
          {
            key: "roleId",
            label: "Role",
            values: sfIds.map((id) => ({ v: String(id), l: getRoleDisplayName(id) })),
          },
          { key: "cityCategory", label: "Category", values: [...CITY_CATEGORIES] },
        ]}
        columns={[
          { key: "roleId", header: "Role", render: (r) => getRoleDisplayName(r.roleId) },
          { key: "cityCategory", header: "City Category" },
          { key: "claimCategoryId", header: "Claim Category", render: (r) => getClaimCategoryById(r.claimCategoryId)?.claimCategoryName ?? "—" },
          { key: "limitAmount", header: "Limit", render: (r) => `₹${r.limitAmount.toLocaleString("en-IN")}` },
          { key: "limitType", header: "Limit Type" },
          { key: "billRequired", header: "Bill", render: (r) => (r.billRequired ? "Yes" : "No") },
          { key: "autoApprovalAllowed", header: "Auto Approve", render: (r) => (r.autoApprovalAllowed ? "Yes" : "No") },
        ]}
        defaultForm={{
          roleId: sfIds[0] ?? 0,
          cityCategory: "Other",
          claimCategoryId: claimCategories[0]?.id ?? 1,
          limitAmount: 0,
          limitType: "Per Day",
          billRequired: true,
          autoApprovalAllowed: true,
          status: "active",
        }}
        getFormFromRecord={(r) => ({ ...r })}
        recordFromForm={(form, id, existing) => {
          const base = {
            roleId: Number(form.roleId),
            cityCategory: form.cityCategory as CityCategory,
            claimCategoryId: Number(form.claimCategoryId),
            limitAmount: Number(form.limitAmount) || 0,
            limitType: form.limitType as LimitType,
            billRequired: !!form.billRequired,
            autoApprovalAllowed: !!form.autoApprovalAllowed,
          };
          return existing ? stampUpdate({ ...existing, ...base, status: form.status ?? existing.status }) : stampNew(base, id);
        }}
        validate={(f) => (Number(f.limitAmount) <= 0 ? "Limit amount required" : null)}
        renderFormFields={({ form, setForm }) => (
          <div className="space-y-3">
            <PolicyField label="Role">
              <Select value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}>
                <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sfIds.map((id) => (
                    <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PolicyField>
            <PolicyField label="City Category">
              <Select value={form.cityCategory ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))}>
                <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                <SelectContent>{CITY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </PolicyField>
            <PolicyField label="Claim Category">
              <Select value={String(form.claimCategoryId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, claimCategoryId: Number(v) }))}>
                <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {claimCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.claimCategoryName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PolicyField>
            <PolicyField label="Limit Amount"><Input type="number" className="h-8 text-xs" value={form.limitAmount ?? ""} onChange={(e) => setForm((f) => ({ ...f, limitAmount: Number(e.target.value) }))} /></PolicyField>
            <PolicyField label="Limit Type">
              <Select value={form.limitType ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, limitType: v }))}>
                <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                <SelectContent>{LIMIT_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
              </Select>
            </PolicyField>
            <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Bill Required</span><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
            <div className="flex items-center justify-between p-2 rounded border"><span className="text-xs">Auto Approval Allowed</span><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
          </div>
        )}
      />

      <Sheet open={copyOpen} onOpenChange={setCopyOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle>Copy Policy Between Roles</SheetTitle></SheetHeader>
          <SheetBody className="space-y-3">
            <PolicyField label="Copy From Role">
              <Select value={fromRole} onValueChange={setFromRole}>
                <SelectTrigger className={compactSelect()}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent>
              </Select>
            </PolicyField>
            <PolicyField label="Copy To Role">
              <Select value={toRole} onValueChange={setToRole}>
                <SelectTrigger className={compactSelect()}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{sfIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent>
              </Select>
            </PolicyField>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={doCopy}>Copy Entitlements</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export { SF_ROLE_NAMES, getUmRoleIdByName };
