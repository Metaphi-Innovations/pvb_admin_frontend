"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
import { Pagination } from "@/components/listing/Pagination";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { Eye, ExternalLink, History, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { policyToday } from "@/lib/hr/policy-common";
import {
  appendPolicyAudit,
  getRoleDisplayName,
  getSalesForceUmRoles,
  getUnmappedSalesForceUmRoles,
  loadPolicyAuditLog,
  SF_ROLE_NAMES,
  stampNew,
  stampUpdate,
  type RolePolicyMapping,
} from "../tada-policy-data";
import { PolicyField, compactSelect, SHEET_SELECT_CONTENT_PROPS } from "./PolicyMasterTable";

export function RolePolicyMappingSection({
  mappings,
  onSave,
  onNavigate,
}: {
  mappings: RolePolicyMapping[];
  onSave: (list: RolePolicyMapping[]) => void;
  onNavigate?: (tab: string, roleId?: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mode, setMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<RolePolicyMapping | null>(null);
  const [form, setForm] = useState<Partial<RolePolicyMapping>>({});
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const enriched = useMemo(
    () =>
      mappings.map((m) => ({
        ...m,
        roleName: getRoleDisplayName(m.roleId),
        reportingRole: m.reportingRoleId ? getRoleDisplayName(m.reportingRoleId) : "—",
      })),
    [mappings],
  );

  const filtered = enriched.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.roleName.toLowerCase().includes(q) || m.reportingRole.toLowerCase().includes(q);
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const mappedRoleIds = useMemo(() => mappings.map((m) => m.roleId), [mappings]);
  const umSfRoles = useMemo(() => getSalesForceUmRoles(), [mappings]);
  const unmappedRoles = useMemo(
    () => getUnmappedSalesForceUmRoles(mappedRoleIds),
    [mappedRoleIds, umSfRoles],
  );
  const reportingRoleOptions = useMemo(() => {
    if (form.roleId) return umSfRoles.filter((r) => r.id !== form.roleId);
    return umSfRoles;
  }, [form.roleId, umSfRoles]);

  const openAdd = () => {
    const firstUnmapped = getUnmappedSalesForceUmRoles(mappings.map((m) => m.roleId))[0];
    setForm({
      roleId: firstUnmapped?.id,
      isSalesForceRole: true,
      tadaApplicable: true,
      attendanceLinkApplicable: true,
      reportingRoleId: null,
      effectiveFrom: policyToday(),
      effectiveTo: "",
      remarks: "",
      status: "active",
    });
    setActive(null);
    setError(null);
    setMode("add");
  };

  const remove = (row: RolePolicyMapping) => {
    const name = getRoleDisplayName(row.roleId);
    if (!window.confirm(`Remove TA/DA policy mapping for ${name}?`)) return;
    onSave(mappings.filter((m) => m.id !== row.id));
    appendPolicyAudit({ user: "Admin", action: "Deleted", entity: "Role Policy Mapping", details: name });
  };

  const persist = () => {
    if (!form.roleId) { setError("Select a role from User Management."); return; }
    if (mode === "add" && mappings.some((m) => m.roleId === form.roleId)) {
      setError("This role is already mapped. Edit the existing row or delete it first.");
      return;
    }
    const id = mode === "add" ? Math.max(0, ...mappings.map((m) => m.id)) + 1 : active!.id;
    const next =
      mode === "add"
        ? stampNew<RolePolicyMapping>(
            {
              roleId: form.roleId,
              isSalesForceRole: !!form.isSalesForceRole,
              tadaApplicable: !!form.tadaApplicable,
              attendanceLinkApplicable: !!form.attendanceLinkApplicable,
              reportingRoleId: form.reportingRoleId ?? null,
              effectiveFrom: form.effectiveFrom ?? policyToday(),
              effectiveTo: form.effectiveTo ?? "",
              remarks: form.remarks ?? "",
            },
            id,
          )
        : stampUpdate<RolePolicyMapping>({
            ...active!,
            isSalesForceRole: !!form.isSalesForceRole,
            tadaApplicable: !!form.tadaApplicable,
            attendanceLinkApplicable: !!form.attendanceLinkApplicable,
            reportingRoleId: form.reportingRoleId ?? null,
            effectiveFrom: form.effectiveFrom ?? active!.effectiveFrom,
            effectiveTo: form.effectiveTo ?? "",
            remarks: form.remarks ?? "",
            status: form.status ?? active!.status,
          });
    onSave(mode === "add" ? [...mappings, next] : mappings.map((m) => (m.id === id ? next : m)));
    appendPolicyAudit({ user: "Admin", action: mode === "add" ? "Created" : "Updated", entity: "Role Policy Mapping", details: getRoleDisplayName(next.roleId) });
    setMode(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-section-title text-navy-900">Role Policy Mapping</h2>
          <p className="text-helper text-muted-foreground mt-0.5">
            Map existing User Management roles to Sales Force TA/DA policy. Roles: {SF_ROLE_NAMES.join(", ")}.
          </p>
          <Link href="/user-management/roles" className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline mt-1">
            <ExternalLink className="w-3 h-3" /> User Management → Role Master
          </Link>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}><History className="w-3.5 h-3.5" /> Audit</Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add Mapping
          </Button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-8 pl-7 text-xs" />
      </div>

      <div className="page-shell overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-semibold uppercase text-[10px] text-muted-foreground">Role</th>
              <th className="px-3 py-2 text-center font-semibold uppercase text-[10px] text-muted-foreground">Sales Force</th>
              <th className="px-3 py-2 text-center font-semibold uppercase text-[10px] text-muted-foreground">TA/DA</th>
              <th className="px-3 py-2 text-center font-semibold uppercase text-[10px] text-muted-foreground">Attendance</th>
              <th className="px-3 py-2 text-left font-semibold uppercase text-[10px] text-muted-foreground">Reporting Role</th>
              <th className="px-3 py-2 text-left font-semibold uppercase text-[10px] text-muted-foreground">Effective From</th>
              <th className="px-3 py-2 text-left font-semibold uppercase text-[10px] text-muted-foreground">Policy</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id} className="border-b hover:bg-brand-50/20">
                <td className="px-3 py-2 font-medium">{row.roleName}</td>
                <td className="px-3 py-2 text-center">{row.isSalesForceRole ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-center">{row.tadaApplicable ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-center">{row.attendanceLinkApplicable ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{row.reportingRole}</td>
                <td className="px-3 py-2">{row.effectiveFrom || "—"}</td>
                <td className="px-3 py-2">
                  <button type="button" className="text-[10px] text-brand-600 hover:underline" onClick={() => onNavigate?.("entitlements", row.roleId)}>Entitlements →</button>
                </td>
                <td className="px-3 py-2"><HrStatusBadge status={row.status} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => { setActive(mappings.find((m) => m.id === row.id) ?? row); setMode("view"); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => { setForm({ ...row }); setActive(row); setError(null); setMode("edit"); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" title="Delete" onClick={() => remove(row)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} totalRecords={filtered.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>

      <Sheet open={mode === "view"} onOpenChange={(o) => !o && setMode(null)}>
        {mode === "view" && active && (
          <SheetContent className="sm:max-w-md">
            <SheetHeader><SheetTitle>View Role Policy Mapping</SheetTitle></SheetHeader>
            <SheetBody className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Role</span><span className="font-medium">{getRoleDisplayName(active.roleId)}</span></div>
              <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Reporting Role</span><span>{active.reportingRoleId ? getRoleDisplayName(active.reportingRoleId) : "—"}</span></div>
              <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">TA/DA Applicable</span><span>{active.tadaApplicable ? "Yes" : "No"}</span></div>
              <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Effective From</span><span>{active.effectiveFrom}</span></div>
              <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Effective To</span><span>{active.effectiveTo || "—"}</span></div>
              <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">Status</span><HrStatusBadge status={active.status} /></div>
              {active.remarks && <div className="py-1"><span className="text-muted-foreground">Remarks:</span> {active.remarks}</div>}
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" size="sm" onClick={() => setMode(null)}>Close</Button>
              <Button size="sm" onClick={() => { setForm({ ...active }); setMode("edit"); }}>Edit</Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={mode === "add" || mode === "edit"} onOpenChange={(o) => !o && setMode(null)}>
        {(mode === "add" || mode === "edit") && (
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle>{mode === "add" ? "Add Mapping" : "Edit Mapping"}</SheetTitle></SheetHeader>
          <SheetBody className="space-y-3">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <PolicyField label="Role (User Management)" required>
              {mode === "edit" ? (
                <Input disabled className="h-8 text-xs bg-muted/20" value={getRoleDisplayName(form.roleId ?? 0)} />
              ) : (
                <div className="space-y-1">
                  <Select
                    value={form.roleId ? String(form.roleId) : undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v), reportingRoleId: f.reportingRoleId === Number(v) ? null : f.reportingRoleId }))}
                  >
                    <SelectTrigger className={compactSelect()}><SelectValue placeholder="Select role from Role Master" /></SelectTrigger>
                    <SelectContent {...SHEET_SELECT_CONTENT_PROPS}>
                      {umSfRoles.map((r) => {
                        const isMapped = mappedRoleIds.includes(r.id);
                        return (
                          <SelectItem
                            key={r.id}
                            value={String(r.id)}
                            disabled={isMapped}
                            className="text-xs"
                          >
                            {r.roleName}{isMapped ? " — already mapped" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {umSfRoles.length === 0
                      ? "No Sales Force roles found in User Management → Role Master. Add RSM, ZSM, ASM, TM, FMO, KAM, DO, or Intern there first."
                      : <>Loaded from User Management → Role Master. {unmappedRoles.length === 0 ? "All roles are mapped — delete a row or use Edit." : "Select an unmapped role."}</>}
                  </p>
                </div>
              )}
            </PolicyField>
            <PolicyField label="Reporting Role">
              <Select
                value={form.reportingRoleId ? String(form.reportingRoleId) : "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, reportingRoleId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger className={compactSelect()}><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent {...SHEET_SELECT_CONTENT_PROPS}>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {reportingRoleOptions.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">{r.roleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PolicyField>
            {[
              { k: "isSalesForceRole" as const, l: "Is Sales Force Role" },
              { k: "tadaApplicable" as const, l: "TA/DA Applicable" },
              { k: "attendanceLinkApplicable" as const, l: "Attendance Link Applicable" },
            ].map(({ k, l }) => (
              <div key={k} className="flex items-center justify-between p-2 rounded border">
                <Label className="text-xs">{l}</Label>
                <Switch checked={!!form[k]} onCheckedChange={(v) => setForm((f) => ({ ...f, [k]: v }))} />
              </div>
            ))}
            <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
            <PolicyField label="Effective To"><Input type="date" className="h-8 text-xs" value={form.effectiveTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></PolicyField>
            <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
            {mode === "edit" && (
              <div className="flex items-center justify-between p-2 rounded border">
                <Label className="text-xs">Active</Label>
                <Switch
                  checked={(form.status ?? "active") === "active"}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
                />
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => setMode(null)}>Cancel</Button>
            <Button size="sm" onClick={persist} disabled={mode === "add" && !form.roleId}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
        )}
      </Sheet>

      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent><SheetHeader><SheetTitle>Audit History</SheetTitle></SheetHeader>
          <SheetBody>{loadPolicyAuditLog().filter((e) => e.entity.includes("Role")).map((e) => <div key={e.id} className="text-xs p-2 border rounded mb-1">{e.timestamp} — {e.details}</div>)}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
