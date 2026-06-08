"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Eye, History, Pencil, Plus, Search } from "lucide-react";
import { policyToday } from "@/lib/hr/policy-common";
import {
  appendPolicyAudit,
  getRoleDisplayName,
  getSalesForceUmRoles,
  loadPolicyAuditLog,
  stampNew,
  stampUpdate,
  TRAVEL_CLASSES,
  TRAVEL_MODES,
  validateTravelModeRuleForm,
  type TravelMode,
  type TravelModeRule,
} from "../tada-policy-data";
import { PolicyField, compactSelect, SHEET_SELECT_CONTENT_PROPS } from "./PolicyMasterTable";

const TABS: { id: TravelMode; label: string }[] = [
  { id: "Air", label: "Air Travel" },
  { id: "Rail", label: "Rail Travel" },
  { id: "Bus", label: "Bus Travel" },
];

function fmtClasses(list: string[]) {
  return list.length ? list.join(", ") : "—";
}

function ViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/40 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function ClassMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (c: string, checked: boolean) => {
    onChange(checked ? [...selected, c] : selected.filter((x) => x !== c));
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
        {options.map((c) => (
          <label key={c} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/30 p-1 rounded">
            <Checkbox checked={selected.includes(c)} onCheckedChange={(v) => toggle(c, !!v)} />
            <span>{c}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function TravelRulesSection({
  records,
  onSave,
  activeTab,
  onTabChange,
  hideTabs = false,
}: {
  records: TravelModeRule[];
  onSave: (list: TravelModeRule[]) => void;
  activeTab?: TravelMode;
  onTabChange?: (tab: TravelMode) => void;
  /** Hide internal mode tabs when parent provides level-2 navigation */
  hideTabs?: boolean;
}) {
  const sfRoles = getSalesForceUmRoles();
  const [internalTab, setInternalTab] = useState<TravelMode>("Air");
  const tab = activeTab ?? internalTab;
  const setTab = (next: TravelMode) => {
    if (onTabChange) onTabChange(next);
    else setInternalTab(next);
    setPage(1);
  };
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mode, setMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<TravelModeRule | null>(null);
  const [form, setForm] = useState<Partial<TravelModeRule>>({});
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const modeClasses = TRAVEL_CLASSES[tab];

  const filtered = useMemo(() => {
    let rows = records.filter((r) => r.travelMode === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => getRoleDisplayName(r.roleId).toLowerCase().includes(q));
    }
    return rows;
  }, [records, tab, search]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setForm({
      roleId: sfRoles[0]?.id ?? 0,
      travelMode: tab,
      allowedClasses: [],
      approvalRequiredClasses: [],
      notAllowedClasses: [],
      billRequired: true,
      autoApprovalAllowed: true,
      effectiveFrom: policyToday(),
      effectiveTo: "",
      remarks: "",
      status: "active",
    });
    setActive(null);
    setError(null);
    setMode("add");
  };

  const openEdit = (row: TravelModeRule) => {
    setForm({ ...row });
    setActive(row);
    setError(null);
    setMode("edit");
  };

  const openView = (row: TravelModeRule) => {
    setActive(row);
    setMode("view");
  };

  const persist = () => {
    const err = validateTravelModeRuleForm(form, records, mode === "edit" ? active?.id : undefined);
    if (err) {
      setError(err);
      return;
    }
    const base = {
      roleId: Number(form.roleId),
      travelMode: (form.travelMode ?? tab) as TravelMode,
      allowedClasses: form.allowedClasses ?? [],
      approvalRequiredClasses: form.approvalRequiredClasses ?? [],
      notAllowedClasses: form.notAllowedClasses ?? [],
      billRequired: !!form.billRequired,
      autoApprovalAllowed: !!form.autoApprovalAllowed,
      effectiveFrom: form.effectiveFrom ?? policyToday(),
      effectiveTo: form.effectiveTo ?? "",
      remarks: form.remarks ?? "",
    };
    const id = mode === "add" ? Math.max(0, ...records.map((r) => r.id)) + 1 : active!.id;
    const next =
      mode === "add"
        ? stampNew(base, id)
        : stampUpdate({ ...active!, ...base, status: form.status ?? active!.status });
    onSave(mode === "add" ? [...records, next] : records.map((r) => (r.id === id ? next : r)));
    appendPolicyAudit({
      user: "Admin",
      action: mode === "add" ? "Created" : "Updated",
      entity: "Travel Rules",
      details: `${getRoleDisplayName(next.roleId)} · ${next.travelMode}`,
    });
    setMode(null);
  };

  const toggleStatus = (row: TravelModeRule) => {
    onSave(records.map((r) => (r.id === row.id ? stampUpdate({ ...r, status: r.status === "active" ? "inactive" : "active" }) : r)));
  };

  const auditLog = loadPolicyAuditLog().filter((e) => e.entity.includes("Travel"));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-section-title text-navy-900">Travel Rules</h2>
          <p className="text-helper text-muted-foreground mt-0.5">
            Role-wise allowed, approval-required, and not-allowed travel classes by Air / Rail / Bus.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}><History className="w-3.5 h-3.5" /> Audit</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Rule</Button>
        </div>
      </div>

      {!hideTabs && (
        <div className="flex gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search role…" className="h-8 pl-7 text-xs" />
      </div>

      <div className="page-shell overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Role", "Allowed Classes", "Approval Required", "Not Allowed", "Bill", "Auto Approve", "Effective From", "Effective To", "Status", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id} className="border-b hover:bg-brand-50/30">
                <td className="px-3 py-2 font-medium">{getRoleDisplayName(row.roleId)}</td>
                <td className="px-3 py-2 max-w-[140px] truncate" title={fmtClasses(row.allowedClasses)}>{fmtClasses(row.allowedClasses)}</td>
                <td className="px-3 py-2 max-w-[140px] truncate">{fmtClasses(row.approvalRequiredClasses)}</td>
                <td className="px-3 py-2 max-w-[140px] truncate">{fmtClasses(row.notAllowedClasses)}</td>
                <td className="px-3 py-2">{row.billRequired ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{row.autoApprovalAllowed ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{row.effectiveFrom}</td>
                <td className="px-3 py-2">{row.effectiveTo || "—"}</td>
                <td className="px-3 py-2"><HrStatusBadge status={row.status} /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(row)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => toggleStatus(row)}>
                      <span className="text-[9px] font-bold">{row.status === "active" ? "OFF" : "ON"}</span>
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
            <SheetHeader><SheetTitle>View Travel Rule</SheetTitle></SheetHeader>
            <SheetBody>
              <ViewRow label="Role" value={getRoleDisplayName(active.roleId)} />
              <ViewRow label="Mode" value={active.travelMode} />
              <ViewRow label="Allowed" value={fmtClasses(active.allowedClasses)} />
              <ViewRow label="Approval Required" value={fmtClasses(active.approvalRequiredClasses)} />
              <ViewRow label="Not Allowed" value={fmtClasses(active.notAllowedClasses)} />
              <ViewRow label="Status" value={<HrStatusBadge status={active.status} />} />
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" size="sm" onClick={() => setMode(null)}>Close</Button>
              <Button size="sm" onClick={() => openEdit(active)}>Edit</Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={mode === "add" || mode === "edit"} onOpenChange={(o) => !o && setMode(null)}>
        {(mode === "add" || mode === "edit") && (
          <SheetContent className="sm:max-w-md">
            <SheetHeader><SheetTitle>{mode === "add" ? "Add Travel Rule" : "Edit Travel Rule"}</SheetTitle></SheetHeader>
            <SheetBody className="space-y-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <PolicyField label="Role" required>
                <Select modal={false} value={String(form.roleId ?? "")} onValueChange={(v) => setForm((f) => ({ ...f, roleId: Number(v) }))}>
                  <SelectTrigger className={compactSelect()}><SelectValue /></SelectTrigger>
                  <SelectContent {...SHEET_SELECT_CONTENT_PROPS}>
                    {sfRoles.map((r) => <SelectItem key={r.id} value={String(r.id)} className="text-xs">{r.roleName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </PolicyField>
              <ClassMultiSelect label="Allowed Classes" options={modeClasses} selected={form.allowedClasses ?? []} onChange={(v) => setForm((f) => ({ ...f, allowedClasses: v }))} />
              <ClassMultiSelect label="Approval Required Classes" options={modeClasses} selected={form.approvalRequiredClasses ?? []} onChange={(v) => setForm((f) => ({ ...f, approvalRequiredClasses: v }))} />
              <ClassMultiSelect label="Not Allowed Classes" options={modeClasses} selected={form.notAllowedClasses ?? []} onChange={(v) => setForm((f) => ({ ...f, notAllowedClasses: v }))} />
              <div className="flex items-center justify-between p-2 rounded border"><Label className="text-xs">Bill Required</Label><Switch checked={!!form.billRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, billRequired: v }))} /></div>
              <div className="flex items-center justify-between p-2 rounded border"><Label className="text-xs">Auto Approval Allowed</Label><Switch checked={!!form.autoApprovalAllowed} onCheckedChange={(v) => setForm((f) => ({ ...f, autoApprovalAllowed: v }))} /></div>
              <PolicyField label="Effective From"><Input type="date" className="h-8 text-xs" value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></PolicyField>
              <PolicyField label="Effective To"><Input type="date" className="h-8 text-xs" value={form.effectiveTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></PolicyField>
              <PolicyField label="Remarks"><Input className="h-8 text-xs" value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></PolicyField>
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" size="sm" onClick={() => setMode(null)}>Cancel</Button>
              <Button size="sm" onClick={persist}>Save</Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent><SheetHeader><SheetTitle>Audit — Travel Rules</SheetTitle></SheetHeader>
          <SheetBody>{auditLog.map((e) => <div key={e.id} className="text-xs p-2 border rounded mb-1">{e.action} — {e.details}</div>)}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
